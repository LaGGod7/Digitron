const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('../generated/postgres-client');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();
const outDir = path.join(__dirname, 'data');
const outFile = path.join(outDir, 'supabase-export.json');

const readJson = (fileName, fallback) => {
  const filePath = path.join(__dirname, '..', fileName);
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn(`Could not read ${fileName}:`, error.message);
  }
  return fallback;
};

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const [categories, products, reviews, quoteRequests] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.product.findMany({ orderBy: { id: 'asc' } }),
    prisma.review.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.quoteRequest.findMany({ orderBy: { createdAt: 'asc' } }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    categories,
    products,
    reviews,
    quoteRequests,
    hiddenProductIds: readJson('hidden_products.json', []),
    productVisits: readJson('product_visits.json', {}),
    siteSettings: readJson('site_settings.json', null),
  };

  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Exported Supabase data to ${outFile}`);
  console.log(`Categories: ${categories.length}, Products: ${products.length}, Reviews: ${reviews.length}, Quotes: ${quoteRequests.length}`);
}

main()
  .catch((error) => {
    console.error('Supabase export failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
