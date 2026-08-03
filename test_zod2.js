import { z } from "zod";

const optionalNumber = z.preprocess(
  (val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    if (typeof val === 'string') {
      const clean = val.replace(/,/g, '');
      return Number(clean);
    }
    return Number(val);
  },
  z.number().positive("Value must be positive").optional()
);

const schema = z.object({
  takeProfit: optionalNumber
});

console.log(schema.safeParse({ takeProfit: "50,000" }));
console.log(schema.safeParse({ takeProfit: "50000" }));
console.log(schema.safeParse({ takeProfit: "" }));
