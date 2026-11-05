import http from "http";
import { app } from "../src/app.js";

const PORT = 9988;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const server = http.createServer(app);

const endpointsToTest = [
  // Module 1: Option Chain
  { method: "GET", url: "/api/v1/discover/option-chain/symbols", name: "Option Chain Symbols" },
  { method: "GET", url: "/api/v1/discover/option-chain/NIFTY", name: "Option Chain for NIFTY" },
  { method: "GET", url: "/api/v1/discover/option-chain/NIFTY/expiries", name: "Option Expiries for NIFTY" },
  { method: "GET", url: "/api/v1/discover/option-chain/NIFTY/contracts", name: "Option Contracts for NIFTY" },
  { method: "GET", url: "/api/v1/discover/option-chain/NIFTY/analytics", name: "Option Analytics for NIFTY" },
  { method: "GET", url: "/api/v1/discover/option-chain/NIFTY/history", name: "Option History for NIFTY" },

  // Module 2: Top Gainers / Losers
  { method: "GET", url: "/api/v1/discover/gainers", name: "Top Gainers" },
  { method: "GET", url: "/api/v1/discover/losers", name: "Top Losers" },
  { method: "GET", url: "/api/v1/discover/gainers/filters", name: "Gainers Filters" },
  { method: "GET", url: "/api/v1/discover/losers/filters", name: "Losers Filters" },
  { method: "GET", url: "/api/v1/discover/market-movers", name: "Market Movers (Combined)" },

  // Module 3: FII / DII
  { method: "GET", url: "/api/v1/discover/fii-dii", name: "FII / DII Summary" },
  { method: "GET", url: "/api/v1/discover/fii-dii/daily", name: "FII / DII Daily" },
  { method: "GET", url: "/api/v1/discover/fii-dii/monthly", name: "FII / DII Monthly" },
  { method: "GET", url: "/api/v1/discover/fii-dii/history", name: "FII / DII History" },
  { method: "GET", url: "/api/v1/discover/fii-dii/analytics", name: "FII / DII Analytics" },

  // Module 4: Global Indices
  { method: "GET", url: "/api/v1/discover/global-indices", name: "All Global Indices" },
  { method: "GET", url: "/api/v1/discover/global-indices/india", name: "India Indices" },
  { method: "GET", url: "/api/v1/discover/global-indices/international", name: "International Indices" },
  { method: "GET", url: "/api/v1/discover/global-indices/NIFTY_50", name: "Single Index (NIFTY 50)" },
  { method: "GET", url: "/api/v1/discover/global-indices/NIFTY_50/history", name: "Index History" },

  // Module 5: Market Heatmap
  { method: "GET", url: "/api/v1/discover/heatmap", name: "Heatmap Overview" },
  { method: "GET", url: "/api/v1/discover/heatmap/nifty-50", name: "NIFTY 50 Heatmap" },
  { method: "GET", url: "/api/v1/discover/heatmap/nifty-100", name: "NIFTY 100 Heatmap" },
  { method: "GET", url: "/api/v1/discover/heatmap/nifty-500", name: "NIFTY 500 Heatmap" },
  { method: "GET", url: "/api/v1/discover/heatmap/bank-nifty", name: "Bank NIFTY Heatmap" },
  { method: "GET", url: "/api/v1/discover/heatmap/sectors", name: "Sectors Heatmap" },
  { method: "GET", url: "/api/v1/discover/heatmap/market-breadth", name: "Market Breadth" }
];

async function runTestSuite() {
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`[Test Runner] Temporary server running on ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  for (const ep of endpointsToTest) {
    const start = Date.now();
    try {
      const res = await fetch(`${BASE_URL}${ep.url}`);
      const duration = Date.now() - start;
      const json = await res.json();

      if (res.status === 200 && json.success === true && json.meta) {
        console.log(`[PASS] ${res.status} | ${ep.name.padEnd(30)} | ${ep.url} (${duration}ms)`);
        passed++;
      } else {
        console.error(`[FAIL] ${res.status} | ${ep.name.padEnd(30)} | ${ep.url} -> Error: ${json.message}`);
        failed++;
      }
    } catch (err) {
      console.error(`[FAIL] Network error | ${ep.name.padEnd(30)} | ${ep.url} -> ${err.message}`);
      failed++;
    }
  }

  console.log(`\n======================================================`);
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${endpointsToTest.length})`);
  console.log(`======================================================`);

  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite().catch(e => {
  console.error("Test runner crash:", e);
  server.close();
  process.exit(1);
});
