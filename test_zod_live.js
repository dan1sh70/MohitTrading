import { placeBuyOrderSchema } from './src/modules/crypto/crypto-orders.controller.js';

console.log(placeBuyOrderSchema.safeParse({
  symbol: "BTCUSDT",
  quantity: "1",
  price: "60000",
  takeProfit: "65000",
  stopLoss: "55000"
}));

console.log(placeBuyOrderSchema.safeParse({
  symbol: "BTCUSDT",
  quantity: "1",
  price: "60000",
  take_profit: "65000",
  stop_loss: "55000"
}));
