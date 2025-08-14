export const TICKERS: string[] = [
  "PETR4","VALE3","ITUB4" // adicione aqui
];

// use Secrets do GitHub para BRAPI_TOKEN
export const BRAPI_TOKEN = process.env.BRAPI_TOKEN || "";
// módulos importantes (trazem perfil, estatísticas e dados financeiros)
export const BRAPI_MODULES = [
  "summaryProfile",
  "defaultKeyStatistics",
  "financialData",
  "balanceSheetHistory",
  "incomeStatementHistory"
].join(",");
