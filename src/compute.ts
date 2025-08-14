export type TickerRow = {
  ticker: string;
  price: number | "";
  lpa: number | "";
  vpa: number | "";
  dy?: number | "";
  ev?: number | "";
  ebitda?: number | "";
  // ...demais campos
};

/** Preço Justo (Graham) */
export function priceGraham(r: TickerRow) {
  if (r.lpa === "" || r.vpa === "") return "";
  const n = Math.sqrt(22.5 * Number(r.lpa) * Number(r.vpa));
  return isFinite(n) ? Number(n.toFixed(2)) : "";
}

/** Bazin “simples”: usa DY% atual como proxy (melhor: DY12m real) */
export function priceBazin(r: TickerRow) {
  if (r.dy === "" || r.dy === 0 || r.price === "") return "";
  const dyFrac = Number(r.dy) / 100;
  if (dyFrac <= 0) return "";
  // preço justo ~ dividendos/0,06  ≈ (preço * dy)/0,06
  const pj = Number(r.price) * dyFrac / 0.06;
  return Number(pj.toFixed(2));
}
