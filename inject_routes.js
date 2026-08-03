import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src/modules/crypto/crypto-orders.routes.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes('getHistory')) {
  content = content.replace(
    'getTrades, placeBuyOrder',
    'getTrades, getHistory, placeBuyOrder'
  );
}

// 2. Add route
if (!content.includes("router.get('/history'")) {
  const target = `router.get('/trades', getTrades);`;
  const insertion = `

/**
 * GET /api/crypto/history
 * Get comprehensive history (orders, positions, trades, fills)
 * Query: limit? (default: 100)
 */
router.get('/history', getHistory);`;
  
  content = content.replace(target, target + insertion);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Injected getHistory into routes.");
