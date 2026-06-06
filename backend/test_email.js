const http = require('http');
const data = JSON.stringify({
  customerName: "Test User",
  customerPhone: "1234567890",
  items: [{ name: "Test Product", qty: 1 }]
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/quotes',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  res.on('data', (d) => { process.stdout.write(d); });
});

req.on('error', (e) => { console.error(e); });
req.write(data);
req.end();
