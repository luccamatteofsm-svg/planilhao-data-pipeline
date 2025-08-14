import fs from "fs";
import path from "path";
import { TICKERS } from "./config.js";
import { fetchBrapiBatch } from "./brapi.js";
import { priceGraham, priceBazin } from "./compute.js";

async function run() {
  const batchSize = 10; // Startup: 10 por request; ajuste se for Pro (20). :contentReference[oaicite:3]{index=3}
  const chunks: string[][] = [];
  for (let i = 0; i < TICKERS.length; i += batchSize)
    chunks.push(TICKERS.slice(i, i + batchSize));

  const results: any[] = [];
  for (const chunk of chunks) {
    const part = await fetchBrapiBatch(chunk);
    results.push(...part);
    await new Promise(r => setTimeout(r, 900)); // polidez
  }

  // acrescenta cálculos básicos; o resto você calcula no Sheets
  const enriched = results.map(r => ({
    ...r,
    priceGraham: priceGraham(r),
    priceBazin: priceBazin(r),
    updatedAt: new Date().toISOString()
  }));

  // grava em docs/all.json (para GitHub Pages)
  const outDir = path.join(process.cwd(), "docs");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "all.json"), JSON.stringify(enriched, null, 2), "utf8");
  console.log(`OK: ${enriched.length} tickers → docs/all.json`);
}

run().catch(err => {
  console.error(err?.response?.data || err);
  process.exit(1);
});
