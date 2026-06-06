const fs = require('fs');
const content = fs.readFileSync('src/data/products.js', 'utf8');
const lines = content.split('\n');
const names = lines.filter(l => l.includes('"name":')).map(l => l.trim().replace(/"name":\s*/, '').replace(/,?$/, ''));
fs.writeFileSync('product_names.txt', names.join('\n'));
