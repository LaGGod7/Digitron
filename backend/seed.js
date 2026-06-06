const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function seed() {
  console.log('Starting seed...');
  
  const categories = ['Cameras', 'Storage', 'Bundles', 'Accessories', 'Services'];
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.toLowerCase() },
      update: {},
      create: { name: cat, slug: cat.toLowerCase() }
    });
  }
  console.log('Categories seeded.');

  const tempJsonPath = path.join(__dirname, 'temp_products.json');
  if (!fs.existsSync(tempJsonPath)) {
    console.error('temp_products.json not found! Run the export script first.');
    return;
  }
  
  const products = JSON.parse(fs.readFileSync(tempJsonPath, 'utf8'));
  const cats = await prisma.category.findMany();
  
  let count = 0;
  for (const p of products) {
    const category = cats.find(c => c.name === p.category) || cats.find(c => c.name === 'Accessories');
    
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    if (!existing) {
      await prisma.product.create({
        data: {
          name: p.name,
          brand: p.brand || 'Generic',
          categoryId: category.id,
          price: p.price || 0,
          stockStatus: p.stock || 'Call for Availability',
          stockQty: p.stock_qty || 0,
          barcode: p.barcode,
          gst: p.gst,
          indoorOutdoor: p.indoor_outdoor,
          resolution: p.resolution,
          type: p.type,
          specs: p.specs,
          images: p.images || [],
          bestFor: p.best_for || [],
        }
      });
      count++;
    }
  }
  
  console.log(`Successfully seeded ${count} products.`);
  if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
}

seed()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
