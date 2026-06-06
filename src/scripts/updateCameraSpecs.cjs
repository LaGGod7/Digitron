const fs = require('fs');
const path = require('path');

// Paths (adjust if necessary)
const productsPath = path.resolve(__dirname, '..', 'data', 'products.js');
const specsPath = path.resolve(__dirname, '..', 'data', 'cameraSpecs.json');

// Load products (expects default export = array)
let productsModule = require(productsPath);
let products = productsModule.default || productsModule;

// Load specs mapping
const specs = JSON.parse(fs.readFileSync(specsPath, 'utf-8'));

// Helper: normalize strings for matching
function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

let updatedCount = 0;
products = products.map(p => {
  if (p.category !== 'Cameras') return p;
  // Try exact name match
  const exactSpec = specs[p.name];
  if (exactSpec) {
    updatedCount++;
    return { ...p, specs: exactSpec };
  }
  // Fallback: try matching by brand and model keywords
  const normName = normalize(p.name);
  for (const [modelKey, spec] of Object.entries(specs)) {
    const normKey = normalize(modelKey);
    if (normName.includes(normKey) || normKey.includes(normName)) {
      updatedCount++;
      return { ...p, specs: spec };
    }
  }
  return p;
});

// Write back to products.js preserving export format
const output = `export default ${JSON.stringify(products, null, 2)};`;
fs.writeFileSync(productsPath, output, 'utf-8');

console.log(`✅ Updated specs for ${updatedCount} camera products.`);
