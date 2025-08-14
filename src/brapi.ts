import axios from "axios";
import { BRAPI_TOKEN, BRAPI_MODULES } from "./config.js";

type AnyRec = Record<string, any>;
const BASE = "https://brapi.dev/api/quote/";

function val(v: any) {
  return (v && typeof v === "object" && "raw" in v) ? v.raw : v;
}
function first(...xs: any[]) {
  for (const x of xs) if (x !== undefined && x !== null && x !== "") return x;
  return "";
}
function pct(x: any) {
  if (x === "" || x == null) return "";
  const n = Number(val(x));
  if (!isFinite(n)) return "";
  return Math.abs(n) <= 1 ? n * 100 : n; // fração -> %
}
function num(x: any) {
  if (x === "" || x == null) return "";
  const n = Number(val(x));
  return isFinite(n) ? n : "";
}

// mapeia chaves possíveis vindas de r / fundamental / defaultKeyStatistics / financialData / summaryProfile
const MAP: Record<string, string[]> = {
  symbol:      ["symbol","ticker","code"],
  companyName: ["longName","shortName","companyName","name"],
  sector:      ["sector","industry","summaryProfile.sector"],
  price:       ["regularMarketPrice","price","close"],

  pl:   ["priceEarnings","trailingPE","forwardPE","defaultKeyStatistics.trailingPE"],
  pvp:  ["priceToBook","pbr","defaultKeyStatistics.priceToBook"],

  dy:   ["dividendYield","trailingAnnualDividendYield","defaultKeyStatistics.trailingAnnualDividendYield","fiveYearAvgDividendYield"],

  ev:        ["enterpriseValue","defaultKeyStatistics.enterpriseValue","financialData.enterpriseValue"],
  ebitda:    ["ebitda","financialData.ebitda"],
  totalDebt: ["totalDebt","financialData.totalDebt"],
  totalCash: ["totalCash","financialData.totalCash"],

  roe:     ["returnOnEquity","defaultKeyStatistics.returnOnEquity","financialData.returnOnEquity"],
  roic:    ["returnOnInvestedCapital","financialData.returnOnInvestedCapital"],
  mrgEbit: ["operatingMargins","financialData.operatingMargins"],
  mrgLiq:  ["profitMargins","financialData.profitMargins"],

  liqCorr:   ["currentRatio","financialData.currentRatio"],
  marketCap: ["marketCap","marketCapitalization","defaultKeyStatistics.marketCap"],
  volume:    ["averageDailyVolume3Month","volume"],

  vpa: ["bookValue","bookValuePerShare","defaultKeyStatistics.bookValue"],
  lpa: ["earningsPerShare","trailingEps","eps"]
};

function pathGet(obj: AnyRec, path: string) {
  const parts = path.split(".");
  let cur: AnyRec | undefined = obj;
  for (const p of parts) {
    if (!cur) return undefined;
    cur = (p in cur) ? cur[p] : undefined;
  }
  return cur;
}
function pick(objs: AnyRec[], keys: string[]) {
  for (const k of keys) {
    for (const o of objs) {
      const v = k.includes(".") ? pathGet(o, k) : o?.[k];
      if (v !== undefined && v !== null && v !== "") return v;
    }
  }
  return "";
}

export async function fetchBrapiBatch(tickers: string[]) {
  // brapi limita quantidade por request conforme plano (Startup: 10; Pro: 20). :contentReference[oaicite:2]{index=2}
  const url = `${BASE}${encodeURIComponent(tickers.join(","))}` +
    `?range=1d&interval=1d&fundamental=true&dividends=true&modules=${BRAPI_MODULES}&token=${encodeURIComponent(BRAPI_TOKEN)}`;

  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${BRAPI_TOKEN}` },
    timeout: 30000
  });

  const results: AnyRec[] = data?.results ?? [];
  const out = results.map((r: AnyRec) => {
    const F  = r.fundamental ?? r.fundamentals ?? {};
    const DK = r.defaultKeyStatistics ?? {};
    const FD = r.financialData ?? {};
    const SP = r.summaryProfile ?? {};
    const sources = [r, F, DK, FD, SP];

    const row: AnyRec = {};
    for (const [std, keys] of Object.entries(MAP)) row[std] = pick(sources, keys);

    // ajustes numéricos
    const totalDebt = num(first(row.totalDebt));
    const totalCash = num(first(row.totalCash));
    const netDebt   = (totalDebt !== "" && totalCash !== "") ? (Number(totalDebt) - Number(totalCash)) : "";

    const ev      = num(first(row.ev));
    const ebitda  = num(first(row.ebitda));
    const evEbit  = (ev !== "" && ebitda !== "") ? (Number(ev) / Number(ebitda)) : "";

    return {
      ticker: first(row.symbol, r.symbol),
      companyName: first(row.companyName, r.longName, r.shortName),
      sector: first(row.sector, SP.sector, r.sector),
      price: num(first(row.price, r.regularMarketPrice)),
      pl: num(first(row.pl)),
      pvp: num(first(row.pvp)),
      dy: pct(first(row.dy)),
      ev: ev,
      ebitda: ebitda,
      evEbitda: evEbit,
      netDebt: netDebt,
      roe: pct(first(row.roe)),
      roic: pct(first(row.roic)),
      mrgEbit: pct(first(row.mrgEbit)),
      mrgLiq: pct(first(row.mrgLiq)),
      liqCorr: num(first(row.liqCorr)),
      marketCap: num(first(row.marketCap)),
      volume: num(first(row.volume)),
      vpa: num(first(row.vpa)),
      lpa: num(first(row.lpa))
    };
  });

  // também podemos calcular DY12M somando dividendos do payload da própria resposta (se presente)
  // (mantive só o campo DY em %, que já vem dos módulos)
  return out;
}
