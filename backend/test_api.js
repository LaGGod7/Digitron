const http = require('http');
http.get('http://localhost:5000/api/products?limit=1', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('API Response:', data.substring(0, 100));
    process.exit(0);
  });
}).on('error', (err) => {
  console.error('API Error:', err.message);
  process.exit(1);
});
