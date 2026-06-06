const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.product.count();
  console.log('Product count:', count);
  const categories = await prisma.category.findMany();
  console.log('Categories:', categories.map(c => ({ name: c.name, slug: c.slug })));
}
main().finally(() => prisma.$disconnect());
