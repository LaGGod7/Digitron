import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths (adjust if necessary)
const productsPath = path.resolve(__dirname, '..', 'data', 'products.js');
const specsPath = path.resolve(__dirname, '..', 'data', 'cameraSpecs.json');

// We will read products.js as text to preserve its exact structure and only replace the array contents.
const productsText = fs.readFileSync(productsPath, 'utf-8');

// Use regex to extract the array, or just parse it if we can.
// Actually, since we need to output valid JS, let's just parse the array.
// But we want to preserve other things.
// Instead, let's just use import.
import productsData from '../data/products.js';

let products = productsData;

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
// Assuming products.js exports as default
const output = `/**\n * Product catalog data generated from Product_List.xlsx.\n * Includes detailed specifications used by the product detail tabs.\n */\nconst products = ${JSON.stringify(products, null, 2)};\n\nexport default products;`;
fs.writeFileSync(productsPath, output, 'utf-8');

console.log(`✅ Updated specs for ${updatedCount} camera products.`);
