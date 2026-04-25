import { z } from "zod";

export const createUserSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  role: z.enum(["trader", "admin"]).default("trader"),
  balance: z.coerce.number().min(0).default(100000),
  password: z.string().min(6).max(120)
});
