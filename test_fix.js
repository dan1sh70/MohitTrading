// Test script to verify Indian stock price API fix
const http = require('http');

function testStockPrice(symbol) {
  const options = {
    hostname: 'localhost',
    port: 8808,
    path: `/api/stocks/in/${symbol}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Testing ${symbol}: STATUS ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log(`${symbol} Success:`, {
          price: parsed.price,
          source: parsed.source,
          status: res.statusCode
        });
      } catch (e) {
        console.log(`${symbol} Error parsing response:`, e.message);
        console.log(`Raw response:`, data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`${symbol} Request error:`, e.message);
  });

  req.end();
}

// Test multiple stocks
const testSymbols = ['HDFC', 'ICICIBANK', 'SBIN', 'TCS', 'RELIANCE', 'MARUTI'];
console.log('Testing Indian Stock Price API fixes...\n');

testSymbols.forEach(symbol => {
  testStockPrice(symbol);
});
