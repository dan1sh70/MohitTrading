import { z } from "zod";

/**
 * News query schema for validation
 */
export const newsQuerySchema = z
  .object({
    query: z.string().min(1).max(200).optional(),
    symbols: z.string().max(500).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    language: z.string().length(2).optional()
  })
  .strict();

/**
 * Search news schema
 */
export const searchNewsSchema = z
  .object({
    query: z.string().min(1).max(200),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional()
  })
  .strict();

/**
 * News by symbols schema
 */
export const newsSymbolsSchema = z
  .object({
    symbols: z.string().min(1).max(500),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional()
  })
  .strict();

/**
 * Date range schema
 */
export const dateRangeSchema = z
  .object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional()
  })
  .strict();
