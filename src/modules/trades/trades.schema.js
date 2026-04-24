import { z } from "zod";

export const createTradeSchema = z.object({
  userId: z.coerce.number().int().positive(),
  symbol: z.string().min(1).max(20).transform((v) => v.toUpperCase()),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.coerce.number().int().positive(),
  price: z.coerce.number().positive()
});

export const closeTradeSchema = z.object({
  pnl: z.coerce.number()
});
