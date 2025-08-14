import fs from "fs";
import path from "path";
import { TICKERS } from "./config.js";
import { fetchBrapiOne } from "./brapi.js";

function sleep(ms: number){ return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const rows: any[] = [];
  for (const t of TICKERS) {
    const row = await fetchBrapiOne(t);
    rows.push({
      ...row,
      // cálculos simples que independem de módulos
      priceGraham: (row.lpa !== "" && row.vpa !== "") ? Number(Math.sqrt(22.5 * Number(row.lpa) * Number(row.vpa)).toFixed(2)) : "",
      priceBazin: (row.dy !== "" && row.price !== "") ? Number((Number(row.price) * (Number(row.dy)/100) / 0.06).toFixed(2)) : "",
      updatedAt: new Date().toISOString()
    });
    await sleep(800); // polidez e rate-limit do Free
  }

  const outDir = path.join(process.cwd(), "docs");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "all.json"), JSON.stringify(rows, null, 2), "utf8");
  console.log(`OK Free: ${rows.length} tickers → docs/all.json`);
}

run().catch(err => { console.error(err?.response?.data || err); process.exit(1); });
