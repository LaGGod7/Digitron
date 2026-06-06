import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import products from '../data/products.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outPath = path.resolve(__dirname, '..', '..', 'backend', 'temp_products.json');
fs.writeFileSync(outPath, JSON.stringify(products, null, 2));
console.log('Exported products to JSON');
