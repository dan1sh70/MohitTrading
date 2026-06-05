import { calculateTradefinityMetrics } from "./src/services/tradefinity-performance.service.js";

const mockTrades = [
  {
    symbol: "BTCUSDT",
    entry_time: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    exit_time: new Date(Date.now() - 1000 * 60 * 60 * 23), // 1 hour hold
    charges: 5,
    spread: 2,
    slippage: 1,
    pnl: 500, // gross
    margin_used: 1000,
    leverage: 10,
    entry_price: 60000,
    quantity: 0.16,
    stop_loss: 59000, // 1000 price distance, * 0.16 * 10 = 1600 risk
    status: 'CLOSED',
    market_regime: 'bull'
  },
  {
    // Rapid flipping
    symbol: "ETHUSDT",
    entry_time: new Date(Date.now() - 1000 * 60), 
    exit_time: new Date(Date.now() - 1000 * 50), // 10s hold
    charges: 1,
    pnl: -50,
    margin_used: 500,
    leverage: 5,
    entry_price: 3000,
    quantity: 0.5,
    status: 'CLOSED',
    market_regime: 'sideways'
  },
  {
    // Revenge Trade candidate 1
    symbol: "SOLUSDT",
    entry_time: new Date(Date.now() - 1000 * 60 * 60), 
    exit_time: new Date(Date.now() - 1000 * 60 * 55),
    charges: 2,
    pnl: -100,
    margin_used: 200,
    leverage: 5,
    entry_price: 150,
    quantity: 5,
    status: 'CLOSED',
    market_regime: 'bear'
  },
  {
    // Revenge Trade candidate 2
    symbol: "SOLUSDT",
    entry_time: new Date(Date.now() - 1000 * 60 * 54), 
    exit_time: new Date(Date.now() - 1000 * 60 * 50),
    charges: 2,
    pnl: -100,
    margin_used: 200,
    leverage: 5,
    entry_price: 150,
    quantity: 5,
    status: 'CLOSED',
    market_regime: 'bear'
  },
  {
    // Revenge Trade candidate 3
    symbol: "SOLUSDT",
    entry_time: new Date(Date.now() - 1000 * 60 * 49), 
    exit_time: new Date(Date.now() - 1000 * 60 * 45),
    charges: 2,
    pnl: -100,
    margin_used: 200,
    leverage: 5,
    entry_price: 150,
    quantity: 5,
    status: 'CLOSED',
    market_regime: 'bear'
  },
  {
    // Revenge Trade actual trigger (< 5 mins after 3rd loss)
    symbol: "DOGEUSDT",
    entry_time: new Date(Date.now() - 1000 * 60 * 44), 
    exit_time: new Date(Date.now() - 1000 * 60 * 40),
    charges: 1,
    pnl: -50,
    margin_used: 100,
    leverage: 5,
    entry_price: 0.1,
    quantity: 1000,
    status: 'CLOSED',
    market_regime: 'sideways'
  },
  {
    // Leverage Spike
    symbol: "BTCUSDT",
    entry_time: new Date(Date.now() - 1000 * 60 * 20), 
    exit_time: new Date(Date.now() - 1000 * 60 * 15),
    charges: 10,
    pnl: 1000,
    margin_used: 2000,
    leverage: 50, // Spike! Avg so far is 5-10
    entry_price: 60000,
    quantity: 1.5,
    status: 'CLOSED',
    market_regime: 'bull'
  }
];

try {
  console.log("--- RUNNING TRADEFINITY V2.1 AUDIT ---");
  const result = calculateTradefinityMetrics(mockTrades, 10000, 0, 0);
  console.log(JSON.stringify(result, null, 2));
  console.log("--- AUDIT SUCCESSFUL ---");
} catch (e) {
  console.error("--- AUDIT FAILED ---");
  console.error(e);
}
