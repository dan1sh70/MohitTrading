import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════
// INDIAN STOCK TRADING SCHEMAS (Zod)
// ═══════════════════════════════════════════════════════════════════════════

export const buyIndianStockSchema = z.object({
  symbol: z.string().trim().min(1, "Symbol is required"),
  quantity: z.number().int().min(1, "Quantity must be a positive integer"),
  entryPrice: z.number().min(0.01, "Entry price must be a positive number"),
  timeFrame: z.enum(["Intraday", "Tomorrow", "1 Week", "1 Month", "Expiry"]),
  marginUsed: z.number().min(0, "Margin used must be a non-negative number"),
  charges: z.number().min(0, "Charges must be a non-negative number")
});

export const sellIndianStockSchema = z.object({
  symbol: z.string().trim().min(1, "Symbol is required"),
  quantity: z.number().int().min(1, "Quantity must be a positive integer"),
  entryPrice: z.number().min(0.01, "Entry price must be a positive number"),
  timeFrame: z.enum(["Intraday", "INTRADAY", "Tomorrow", "1 Week", "1 Month", "Expiry"]),
  marginUsed: z.number().min(0, "Margin used must be a non-negative number"),
  charges: z.number().min(0, "Charges must be a non-negative number")
});

export const exitPositionSchema = z.object({
  exitPrice: z.number().min(0.01, "Exit price must be a positive number")
});
