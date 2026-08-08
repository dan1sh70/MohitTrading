import { getPrice } from '../crypto/crypto.controller.js';
// Using the same import structure as others
import { getCryptoPrice } from '../crypto/crypto.service.js';

// Fallback mock prices until AlphaVantage etc are fully wired
export async function getUnifiedPrice(symbol, assetClass) {
  if (assetClass === 'CRYPTO') {
    return await getCryptoPrice(symbol);
  } else if (assetClass === 'INDIAN_STOCK') {
    return { symbol, price: 1000.00 }; // Mock
  } else if (assetClass === 'FOREX') {
    return { symbol, price: 1.25 }; // Mock
  } else if (assetClass === 'US_STOCK') {
    return { symbol, price: 150.00 }; // Mock
  } else if (assetClass === 'COMMODITY') {
    return { symbol, price: 85.00 }; // Mock
  }
  
  throw new Error(`Unsupported asset class: ${assetClass}`);
}
