const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();
const inFile = path.join(__dirname, 'data', 'supabase-export.json');
const hiddenFile = path.join(__dirname, '..', 'hidden_products.json');
const visitsFile = path.join(__dirname, '..', 'product_visits.json');
const settingsFile = path.join(__dirname, '..', 'site_settings.json');

const asDate = (value) => (value ? new Date(value) : undefined);

async function main() {
  if (!fs.existsSync(inFile)) {
    throw new Error(`Missing export file: ${inFile}. Run npm run migrate:supabase:export first.`);
  }

  const payload = JSON.parse(fs.readFileSync(inFile, 'utf8'));
  const categoryIdMap = new Map();
  const productIdMap = new Map();

  console.log('Clearing MongoDB collections...');
  await prisma.review.deleteMany();
  await prisma.quoteRequest.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  console.log('Importing categories...');
  for (const category of payload.categories || []) {
    const created = await prisma.category.create({
      data: {
        legacyId: category.id,
        name: category.name,
        slug: category.slug,
      }
    });
    categoryIdMap.set(category.id, created.id);
  }

  console.log('Importing products...');
  for (const product of payload.products || []) {
    const categoryId = categoryIdMap.get(product.categoryId);
    if (!categoryId) {
      console.warn(`Skipping product ${product.id}; missing category ${product.categoryId}`);
      continue;
    }

    const created = await prisma.product.create({
      data: {
        legacyId: product.id,
        name: product.name,
        brand: product.brand || 'Generic',
        categoryId,
        price: Number(product.price) || 0,
        stockStatus: product.stockStatus || 'In Stock',
        stockQty: Number(product.stockQty) || 0,
        barcode: product.barcode,
        gst: product.gst,
        indoorOutdoor: product.indoorOutdoor,
        resolution: product.resolution,
        type: product.type,
        specs: product.specs,
        images: Array.isArray(product.images) ? product.images : [],
        bestFor: Array.isArray(product.bestFor) ? product.bestFor : [],
        createdAt: asDate(product.createdAt),
        updatedAt: asDate(product.updatedAt),
      }
    });
    productIdMap.set(product.id, created.id);
  }

  console.log('Importing reviews...');
  for (const review of payload.reviews || []) {
    const productId = productIdMap.get(review.productId);
    if (!productId) {
      console.warn(`Skipping review ${review.id}; missing product ${review.productId}`);
      continue;
    }

    await prisma.review.create({
      data: {
        legacyId: review.id,
        productId,
        reviewerName: review.reviewerName,
        rating: Number(review.rating) || 0,
        reviewText: review.reviewText,
        isVerified: Boolean(review.isVerified),
        isApproved: Boolean(review.isApproved),
        helpfulYes: Number(review.helpfulYes) || 0,
        helpfulNo: Number(review.helpfulNo) || 0,
        createdAt: asDate(review.createdAt),
      }
    });
  }

  console.log('Importing quote requests...');
  for (const quote of payload.quoteRequests || []) {
    await prisma.quoteRequest.create({
      data: {
        legacyId: quote.id,
        customerName: quote.customerName,
        customerPhone: quote.customerPhone,
        status: quote.status || 'Pending',
        items: quote.items,
        createdAt: asDate(quote.createdAt),
      }
    });
  }

  const hiddenProductIds = (payload.hiddenProductIds || [])
    .map((id) => productIdMap.get(Number(id)) || productIdMap.get(id) || id)
    .filter(Boolean);
  fs.writeFileSync(hiddenFile, JSON.stringify(hiddenProductIds, null, 2), 'utf8');

  const productVisits = {};
  for (const [oldId, count] of Object.entries(payload.productVisits || {})) {
    const newId = productIdMap.get(Number(oldId)) || productIdMap.get(oldId);
    if (newId) productVisits[newId] = count;
  }
  fs.writeFileSync(visitsFile, JSON.stringify(productVisits, null, 2), 'utf8');

  if (payload.siteSettings) {
    fs.writeFileSync(settingsFile, JSON.stringify(payload.siteSettings, null, 2), 'utf8');
  }

  console.log('MongoDB import complete.');
  console.log(`Categories: ${(payload.categories || []).length}, Products: ${productIdMap.size}, Reviews: ${(payload.reviews || []).length}, Quotes: ${(payload.quoteRequests || []).length}`);
}

main()
  .catch((error) => {
    console.error('MongoDB import failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
