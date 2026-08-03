import { sql } from './src/db/mysql.js';
import { updateCryptoPerformance } from './src/services/pnl-liquidation.service.js';

async function fixHistoricalPnL() {
  console.log('Starting historical PnL fix...');

  try {
    // 1. Fix crypto_trades
    console.log('Fetching all crypto_trades...');
    const trades = await sql(`SELECT * FROM crypto_trades`);
    console.log(`Found ${trades.length} trades.`);

    let tradesFixed = 0;
    for (const trade of trades) {
      const entryPrice = parseFloat(trade.entry_price);
      const exitPrice = parseFloat(trade.exit_price);
      const quantity = parseFloat(trade.entry_quantity);
      const marginUsed = parseFloat(trade.margin_used);
      const leverage = parseFloat(trade.leverage) || 1;
      
      // Determine side. We don't have side explicitly in crypto_trades but we can derive it from the position or infer it.
      // Wait, crypto_trades doesn't have side. We have to look at crypto_positions.
      const positionRes = await sql(`SELECT side FROM crypto_positions WHERE id = $1`, [trade.position_id]);
      if (!positionRes || positionRes.length === 0) continue;
      
      const side = positionRes[0].side;
      
      let correctNetPnL = 0;
      if (side === 'LONG') {
        correctNetPnL = (exitPrice - entryPrice) * quantity;
      } else {
        correctNetPnL = (entryPrice - exitPrice) * quantity;
      }

      // If it was artificially multiplied by leverage, fixing it:
      const pnlPercent = marginUsed > 0 ? (correctNetPnL / marginUsed) * 100 : 0;
      
      await sql(`UPDATE crypto_trades SET net_pnl = $1, pnl_percent = $2 WHERE id = $3`, [correctNetPnL, pnlPercent, trade.id]);
      tradesFixed++;
    }
    console.log(`Fixed ${tradesFixed} trades.`);

    // 2. Fix crypto_positions realised_pnl
    console.log('Fetching closed crypto_positions...');
    const positions = await sql(`SELECT * FROM crypto_positions WHERE status = 'CLOSED'`);
    console.log(`Found ${positions.length} closed positions.`);

    let positionsFixed = 0;
    for (const pos of positions) {
      const entryPrice = parseFloat(pos.entry_price);
      const exitPrice = parseFloat(pos.exit_price);
      const quantity = parseFloat(pos.quantity);
      
      let correctRealisedPnL = 0;
      if (pos.side === 'LONG') {
        correctRealisedPnL = (exitPrice - entryPrice) * quantity;
      } else {
        correctRealisedPnL = (entryPrice - exitPrice) * quantity;
      }
      
      await sql(`UPDATE crypto_positions SET realised_pnl = $1 WHERE id = $2`, [correctRealisedPnL, pos.id]);
      positionsFixed++;
    }
    console.log(`Fixed ${positionsFixed} positions.`);

    // 3. Recalculate crypto_performance for all users
    console.log('Fetching distinct users...');
    const users = await sql(`SELECT DISTINCT user_id FROM crypto_trades`);
    console.log(`Found ${users.length} users with trades.`);

    for (const user of users) {
      console.log(`Recalculating performance for user ${user.user_id}...`);
      await updateCryptoPerformance(user.user_id);
    }
    
    console.log('All historical PnL data successfully fixed!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing historical PnL:', error);
    process.exit(1);
  }
}

fixHistoricalPnL();
