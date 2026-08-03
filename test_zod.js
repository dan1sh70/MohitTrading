import { z } from "zod";

const optionalNumber = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
  z.number().positive().optional()
);

const schema = z.object({
  takeProfit: optionalNumber,
  price: optionalNumber
});

console.log(schema.safeParse({ takeProfit: "" }));
console.log(schema.safeParse({ takeProfit: "100" }));
console.log(schema.safeParse({ takeProfit: null }));
console.log(schema.safeParse({ takeProfit: 0 }));
