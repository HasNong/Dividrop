import { DividendRound, DividendPayment, Shareholder, Company } from './types.js';

export function computeDividend(
  company: Company,
  shareholders: Shareholder[],
  rate: number,
  snapshot?: Record<string, number>,
): { updatedCompany: Company; newRound: DividendRound; payments: DividendPayment[] } {
  const T_MULT = { founder: 2.0, investor: 1.0, public: 0.5 };
  const shares = snapshot ?? {};
  const companyShareholders = shareholders.filter((s) =>
    s.holdings.some((h) => h.companyId === company.id),
  );

  let totalNew = 0;
  for (const holder of companyShareholders) {
    const frozen = shares[holder.label] ?? 0;
    const mult = T_MULT[holder.tier] ?? 1.0;
    totalNew += Math.floor(frozen * (rate / 100) * mult);
  }
  const newSupply = company.currentSupply + totalNew;

  const today = new Date().toISOString().slice(0, 10);
  const txid = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');

  const newRound: DividendRound = {
    id: 0,
    companyId: company.id,
    date: today,
    rate,
    newTokensMinted: totalNew,
    totalSupplyAfter: newSupply,
    txid,
    announcementDate: today,
    recordDate: today,
    distributionDate: today,
    status: 'distributed' as const,
  };

  const allPayments: DividendPayment[] = [];
  for (const holder of companyShareholders) {
    const frozen = shares[holder.label] ?? 0;
    const mult = T_MULT[holder.tier] ?? 1.0;
    const tokensReceived = Math.floor(frozen * (rate / 100) * mult);
    if (tokensReceived > 0) {
      allPayments.push({
        roundId: 0,
        companyId: company.id,
        companyName: company.name,
        symbol: company.symbol,
        date: today,
        rate,
        sharesBefore: frozen,
        tokensReceived,
        sharesAfter: frozen + tokensReceived,
      });
    }
  }

  const updatedCompany: Company = {
    ...company,
    currentSupply: newSupply,
  };

  return { updatedCompany, newRound, payments: allPayments };
}

export function getPastPayments(
  shareholder: Shareholder,
  companyId: string,
  dividends: DividendRound[],
): DividendPayment[] {
  const holding = shareholder.holdings.find((h) => h.companyId === companyId);
  if (!holding) return [];

  let currentShares = holding.shares;
  const companyDividends = dividends
    .filter((d) => d.companyId === companyId)
    .sort((a, b) => a.id - b.id);

  const payments: DividendPayment[] = [];
  for (const round of companyDividends) {
    const received = Math.floor(currentShares * (round.rate / 100));
    if (received === 0) continue;
    payments.push({
      roundId: round.id,
      companyId,
      companyName: holding.companyName,
      symbol: holding.symbol,
      date: round.date,
      rate: round.rate,
      sharesBefore: currentShares,
      tokensReceived: received,
      sharesAfter: currentShares + received,
    });
    currentShares += received;
  }
  return payments;
}
