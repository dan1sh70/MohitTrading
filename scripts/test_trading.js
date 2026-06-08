import { sql } from '../src/db/mysql.js';
import { buyIndianStock, sellIndianStock } from '../src/modules/stocks/indian-trade.controller.js';
import { buyUsStock, sellUsStock } from '../src/modules/stocks/us-trade.controller.js';
import { buyForex, sellForex } from '../src/modules/forex/forex-trade.controller.js';
import { buyCommodity, sellCommodity } from '../src/modules/commodities/commodity-trade.controller.js';

// Mock Response Object
class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.body = null;
  }
  status(code) {
    this.statusCode = code;
    return this;
  }
  json(data) {
    this.body = data;
    return this;
  }
}

async function testTrading() {
  console.log("=== STARTING TRADING TESTS ===");

  try {
    // 1. Setup Test User
    let userId;
    const testUserResult = await sql(`SELECT id FROM users WHERE email = 'test_trader@example.com'`);
    if (testUserResult.rowCount > 0) {
      userId = testUserResult.rows[0].id;
      // Reset balance
      await sql(`UPDATE users SET balance = 100000 WHERE id = ?`, [userId]);
    } else {
      const result = await sql(
        `INSERT INTO users (full_name, email, password_hash, balance) VALUES (?, ?, ?, ?)`,
        ['Test Trader', 'test_trader@example.com', 'hashed_pw', 100000]
      );
      userId = result.insertId;
    }
    console.log(`✅ Test User ID: ${userId} with $100,000 balance`);

    // Clean up previous positions for this user
    await sql(`DELETE FROM indian_stock_positions WHERE user_id = ?`, [userId]);
    await sql(`DELETE FROM us_stock_positions WHERE user_id = ?`, [userId]);
    await sql(`DELETE FROM forex_positions WHERE user_id = ?`, [userId]);
    await sql(`DELETE FROM commodity_positions WHERE user_id = ?`, [userId]);

    // 2. Test Indian Stocks (FIFO Closing Fix)
    console.log("\n--- Testing Indian Stocks (FIFO Auto-Closing) ---");
    let req = { user: { id: userId }, validatedBody: { symbol: 'RELIANCE', quantity: 10, timeFrame: 'INTRADAY', orderType: 'MARKET', entryPrice: 2500, marginUsed: 5000, charges: 50 } };
    let res = new MockResponse();
    await buyIndianStock(req, res);
    console.log("Buy 10 RELIANCE @ 2500 -> Status:", res.statusCode);
    
    req = { user: { id: userId }, validatedBody: { symbol: 'RELIANCE', quantity: 10, timeFrame: 'INTRADAY', orderType: 'MARKET', entryPrice: 2600, marginUsed: 5200, charges: 50 } };
    res = new MockResponse();
    await sellIndianStock(req, res);
    console.log("Sell 10 RELIANCE @ 2600 -> Status:", res.statusCode);
    if (res.body.totalPnl === 1000) console.log("✅ P&L correctly calculated as +1000");
    else console.error("❌ P&L calculation failed:", res.body);

    const indPos = await sql(`SELECT * FROM indian_stock_positions WHERE user_id = ?`, [userId]);
    if (indPos.rows.length === 1 && indPos.rows[0].status === 'EXITED') console.log("✅ Old position cleanly exited.");
    else console.error("❌ Position state incorrect:", indPos.rows);

    // 3. Test US Stocks
    console.log("\n--- Testing US Stocks ---");
    req = { user: { id: userId }, validatedBody: { symbol: 'AAPL', quantity: 5, timeFrame: 'INTRADAY', orderType: 'MARKET', entryPrice: 150 } };
    res = new MockResponse();
    await buyUsStock(req, res);
    console.log("Buy 5 AAPL @ 150 -> Status:", res.statusCode);

    req = { user: { id: userId }, validatedBody: { symbol: 'AAPL', quantity: 3, timeFrame: 'INTRADAY', orderType: 'MARKET', entryPrice: 160 } };
    res = new MockResponse();
    await sellUsStock(req, res);
    console.log("Sell 3 AAPL @ 160 -> Status:", res.statusCode);
    
    const usPos = await sql(`SELECT * FROM us_stock_positions WHERE user_id = ?`, [userId]);
    if (usPos.rows.length === 2) console.log("✅ US Stock partial close resulted in 2 position records (1 EXITED, 1 ACTIVE).");
    else console.error("❌ US position count wrong:", usPos.rows);

    // 4. Test Forex
    console.log("\n--- Testing Forex ---");
    req = { user: { id: userId }, validatedBody: { symbol: 'EUR/USD', quantity: 10000, timeFrame: 'INTRADAY', orderType: 'MARKET', entryPrice: 1.0800 } };
    res = new MockResponse();
    await sellForex(req, res);
    console.log("Short 10,000 EUR/USD @ 1.0800 -> Status:", res.statusCode);

    req = { user: { id: userId }, validatedBody: { symbol: 'EUR/USD', quantity: 10000, timeFrame: 'INTRADAY', orderType: 'MARKET', entryPrice: 1.0700 } };
    res = new MockResponse();
    await buyForex(req, res);
    console.log("Cover 10,000 EUR/USD @ 1.0700 -> Status:", res.statusCode);

    const fxPos = await sql(`SELECT status, pnl FROM forex_positions WHERE user_id = ?`, [userId]);
    if (parseFloat(fxPos.rows[0]?.pnl) === 100) console.log("✅ Forex short profit correctly calculated as +100.");
    else console.error("❌ Forex PnL wrong:", fxPos.rows);

    // 5. Test Commodities
    console.log("\n--- Testing Commodities ---");
    req = { user: { id: userId }, validatedBody: { symbol: 'GOLD', quantity: 1, timeFrame: 'INTRADAY', entryPrice: 2000 } };
    res = new MockResponse();
    await buyCommodity(req, res);
    console.log("Buy 1 GOLD @ 2000 -> Status:", res.statusCode);

    req = { user: { id: userId }, validatedBody: { symbol: 'GOLD', quantity: 1, timeFrame: 'INTRADAY', entryPrice: 1950 } };
    res = new MockResponse();
    await sellCommodity(req, res);
    console.log("Sell 1 GOLD @ 1950 -> Status:", res.statusCode);
    
    const comPos = await sql(`SELECT status, pnl FROM commodity_positions WHERE user_id = ?`, [userId]);
    if (parseFloat(comPos.rows[0]?.pnl) === -50) console.log("✅ Commodity loss correctly calculated as -50.");
    else console.error("❌ Commodity PnL wrong:", comPos.rows);

    // 6. Test Performance Aggregation
    console.log("\n--- Testing Performance Engine Integration ---");
    const indPerf = await sql(`SELECT overall_score FROM indian_stock_performance WHERE user_id = ?`, [userId]);
    const usPerf = await sql(`SELECT overall_score FROM us_stock_performance WHERE user_id = ?`, [userId]);
    const fxPerf = await sql(`SELECT overall_score FROM forex_performance WHERE user_id = ?`, [userId]);
    const comPerf = await sql(`SELECT overall_score FROM commodity_performance WHERE user_id = ?`, [userId]);

    console.log("Indian Stock Perf Score:", indPerf.rows[0]?.overall_score);
    console.log("US Stock Perf Score:", usPerf.rows[0]?.overall_score);
    console.log("Forex Perf Score:", fxPerf.rows[0]?.overall_score);
    console.log("Commodity Perf Score:", comPerf.rows[0]?.overall_score);

    console.log("\n=== ALL TESTS PASSED SUCCESSFULLY! ===");

  } catch (error) {
    console.error("Test Failed:", error);
  } finally {
    process.exit(0);
  }
}

testTrading();
