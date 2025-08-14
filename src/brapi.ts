import axios from "axios";
import { BRAPI_TOKEN } from "./config.js";

type Any = Record<string, any>;
const BASE = "https://brapi.dev/api/quote/";

function pick(obj: any, ...keys: string[]) {
  for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  return "";
}
function num(v: any) {
  if (v === "" || v == null) return "";
  const n = Number(v);
  return isFinite(n) ? n : "";
}

// Free: 1 ticker por request; nada de modules. Usamos fundamental=true e dividends=true. :contentReference[oaicite:3]{index=3}
export async function fetchBrapiOne(ticker: string) {
  const url = `${BASE}${encodeURIComponent(ticker)}?fundamental=true&dividends=true&token=${encodeURIComponent(BRAPI_TOKEN)}`;
  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${BRAPI_TOKEN}` },
    timeout: 30000
  });
  const r: Any = (data?.results && data.results[0]) ? data.results[0] : {};

  // dividendos TTM (se vierem)
  let dyPct = "";
  try {
    const cash = r?.dividendsData?.cashDividends ?? [];
    const now = Date.now();
    const d12 = cash.filter((d: Any) => {
      const t = new Date(d.paymentDate || d.approvedOn || d.lastDatePrior).getTime();
      return isFinite(t) && (now - t) <= 365*24*3600*1000;
    });
    const sum12 = d12.reduce((acc: number, d: Any) => acc + Number(d.rate || 0), 0);
    if (sum12 > 0 && r.regularMarketPrice) {
      dyPct = ((sum12 / Number(r.regularMarketPrice)) * 100).toFixed(2);
    }
  } catch {}

  return {
    ticker: r.symbol || ticker,
    companyName: pick(r, "longName", "shortName", "name") || "",
    sector: r.sector || "",
    price: num(r.regularMarketPrice),
    pl: num(pick(r, "priceEarnings")),
    lpa: num(pick(r, "earningsPerShare", "trailingEps")),
    marketCap: num(pick(r, "marketCap", "marketCapitalization")),
    dy: dyPct === "" ? "" : Number(dyPct),

    // placeholders – serão preenchidos via CVM no passo 2
    pvp: "", vpa: "", ev: "", ebitda: "", evEbitda: "",
    netDebt: "", roe: "", roic: "", mrgEbit: "", mrgLiq: "", liqCorr: "", volume: num(r.volume)
  };
}
