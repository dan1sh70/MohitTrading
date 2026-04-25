import { z } from "zod";

export const buyTradeSchema = z.object({
  symbol: z.string().min(3).max(20).toUpperCase(),
  quantity: z.number().positive("Quantity must be positive"),
  price: z.number().positive("Price must be positive")
});

export const sellTradeSchema = z.object({
  symbol: z.string().min(3).max(20).toUpperCase(),
  quantity: z.number().positive("Quantity must be positive"),
  price: z.number().positive("Price must be positive")
});

export const priceSchema = z.object({
  symbol: z.string().min(3).max(20).toUpperCase()
});
