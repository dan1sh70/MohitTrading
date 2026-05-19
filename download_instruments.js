const https = require('https');
const zlib = require('zlib');
const fs = require('fs');

const url = 'https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz';

https.get(url, (res) => {
  const gunzip = zlib.createGunzip();
  const chunks = [];

  res.pipe(gunzip);

  gunzip.on('data', (chunk) => {
    chunks.push(chunk);
  });

  gunzip.on('end', () => {
    const data = Buffer.concat(chunks);
    const json = JSON.parse(data.toString());
    
    // Find INFY
    const infyInstrument = json.find(item => 
      item.trading_symbol === 'INFY' || 
      item.symbol === 'INFY' ||
      item.name?.toLowerCase().includes('infosys')
    );
    
    if (infyInstrument) {
      console.log('INFY Instrument Key:', infyInstrument.instrument_key);
      console.log('Full object:', JSON.stringify(infyInstrument, null, 2));
    } else {
      console.log('INFY not found');
    }
    
    // Also find other popular stocks
    const popularStocks = ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'SBIN'];
    console.log('\n--- Popular Stocks ---');
    popularStocks.forEach(symbol => {
      const stock = json.find(item => 
        item.trading_symbol === symbol || 
        item.symbol === symbol
      );
      if (stock) {
        console.log(`${symbol}: ${stock.instrument_key}`);
      }
    });
  });

  gunzip.on('error', (err) => {
    console.error('Gunzip error:', err);
  });
}).on('error', (err) => {
  console.error('Download error:', err);
});
