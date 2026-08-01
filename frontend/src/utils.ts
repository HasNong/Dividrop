import { Shareholder, DividendRound, DividendPayment } from './types';

export function getDividendPaymentsForHolder(
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

export function getAllDividendPaymentsForHolder(
  shareholder: Shareholder,
  dividends: DividendRound[],
): DividendPayment[] {
  const payments: DividendPayment[] = [];
  for (const holding of shareholder.holdings) {
    payments.push(...getDividendPaymentsForHolder(shareholder, holding.companyId, dividends));
  }
  payments.sort((a, b) => b.date.localeCompare(a.date));
  return payments;
}

export function getCompanyDividends(
  companyId: string,
  dividends: DividendRound[],
): DividendRound[] {
  return dividends.filter((d) => d.companyId === companyId);
}
