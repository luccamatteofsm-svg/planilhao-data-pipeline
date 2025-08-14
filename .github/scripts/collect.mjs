import fs from 'fs';

const TICKERS = JSON.parse(fs.readFileSync('tickers.json', 'utf8'));
const TOKEN = process.env.BRAPI_TOKEN || '';

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function num(x){ const n = Number(x); return Number.isFinite(n) ? n : ""; }

async function fetchOne(t){
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(t)}?fundamental=true&dividends=true${TOKEN?`&token=${encodeURIComponent(TOKEN)}`:''}`;
  const res = await fetch(url);
  const data = await res.json();
  const r = data?.results?.[0] || {};

  // DY12m aproximado a partir dos dividendos do último ano / preço atual
  let dy = "";
  try{
    const cash = r?.dividendsData?.cashDividends || [];
    const now = Date.now();
    const last12 = cash.filter(d=>{
      const s = d.paymentDate || d.approvedOn || d.lastDatePrior;
      const ts = Date.parse(s);
      return Number.isFinite(ts) && (now - ts) <= 365*24*3600*1000;
    });
    const sum12 = last12.reduce((a,d)=> a + Number(d.rate || 0), 0);
    const price = Number(r.regularMarketPrice);
    if (price > 0 && sum12 > 0) dy = Number(((sum12/price)*100).toFixed(2));
  }catch{}

  return {
    ticker: r.symbol || t,
    companyName: r.longName || r.shortName || r.name || "",
    sector: r.sector || "",
    price: num(r.regularMarketPrice),
    pl: num(r.priceEarnings),
    pvp: "",                               // preencheremos via CVM numa próxima etapa
    dy: dy,                                // % baseado em 12m de proventos
    ev: "", ebitda: "", evEbitda: "",
    netDebt: "", roe: "", roic: "",
    mrgEbit: "", mrgLiq: "", liqCorr: "",
    marketCap: num(r.marketCap || r.marketCapitalization),
    volume: num(r.volume || r.averageDailyVolume3Month),
    vpa: "", lpa: num(r.earningsPerShare || r.trailingEps),
    updatedAt: new Date().toISOString()
  };
}

(async () => {
  const out = [];
  for (const t of TICKERS){
    out.push(await fetchOne(t));
    await sleep(900); // gentileza (Free: 1 ticker por requisição)
  }
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync('docs/all.json', JSON.stringify(out, null, 2));
  console.log(`Wrote docs/all.json with ${out.length} tickers`);
})();
