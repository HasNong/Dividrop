import { Company, Shareholder, DividendRound, DividendPayment } from '../types';

export const mockCompanies: Company[] = [
  {
    id: 'acme',
    name: 'ACME Corp',
    symbol: 'ACME',
    tokenId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    contractAddress: 'bchtest:pp8f7r2jpx8evu7kqgqpe29p3s3h0susngvqhf03rv',
      initialSupply: 1000,
      currentSupply: 1000,
    },
    {
      id: 'globex',
      name: 'Globex Industries',
      symbol: 'GLBX',
      tokenId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      contractAddress: 'bchtest:qq9g8s3kqy1fv9w8l5m45zyyyucdv2rbr0ycd178kp',
      initialSupply: 500,
      currentSupply: 500,
  },
];

export const mockShareholders: Shareholder[] = [
  {
    address: 'bchtest:zr4h9ep0fs86h8w4k23kwwxnsazxs9mywvry758kgk',
    label: 'Alice (CEO)',
    holdings: [
      { companyId: 'acme', companyName: 'ACME Corp', symbol: 'ACME', shares: 300, ownershipPercent: 30 },
      { companyId: 'globex', companyName: 'Globex Industries', symbol: 'GLBX', shares: 150, ownershipPercent: 30 },
    ],
    tier: 'founder' as const,
  },
  {
    address: 'bchtest:zp5j9fq1gt94k8w5l34kxxxotbct0partyva869hmx',
    label: 'Bob (Investor)',
    tier: 'investor' as const,
    holdings: [
      { companyId: 'acme', companyName: 'ACME Corp', symbol: 'ACME', shares: 250, ownershipPercent: 25 },
      { companyId: 'globex', companyName: 'Globex Industries', symbol: 'GLBX', shares: 100, ownershipPercent: 20 },
    ],
  },
  {
    address: 'bchtest:zq6k0gr2hu05l9x6m45lyyyytcdv0qbqzwxb970inx',
    label: 'Charlie (Investor)',
    tier: 'founder' as const,
    holdings: [
      { companyId: 'acme', companyName: 'ACME Corp', symbol: 'ACME', shares: 200, ownershipPercent: 20 },
    ],
  },
  {
    address: 'bchtest:zr7l1hs3iv16m0y7n56lzzzzudev1rcr0xyd087jny',
    label: 'Diana (Investor)',
    tier: 'investor' as const,
    holdings: [
      { companyId: 'acme', companyName: 'ACME Corp', symbol: 'ACME', shares: 150, ownershipPercent: 15 },
      { companyId: 'globex', companyName: 'Globex Industries', symbol: 'GLBX', shares: 75, ownershipPercent: 15 },
    ],
  },
  {
    address: 'bchtest:zs8m2it4jw27n1z8o67maaaavff2sds1yzfe198koz',
    label: 'Eve (Investor)',
    tier: 'public' as const,
    holdings: [
      { companyId: 'acme', companyName: 'ACME Corp', symbol: 'ACME', shares: 100, ownershipPercent: 10 },
      { companyId: 'globex', companyName: 'Globex Industries', symbol: 'GLBX', shares: 50, ownershipPercent: 10 },
    ],
  },
];

export const mockDividends: DividendRound[] = [];

export function getCompanyDividends(companyId: string): DividendRound[] {
  return mockDividends.filter((d) => d.companyId === companyId);
}

export function getShareholdersOfCompany(companyId: string): Shareholder[] {
  return mockShareholders.filter((s) => s.holdings.some((h) => h.companyId === companyId));
}

export function getDividendPayments(shareholder: Shareholder, companyId: string): DividendPayment[] {
  const holding = shareholder.holdings.find((h) => h.companyId === companyId);
  if (!holding) return [];

  const company = mockCompanies.find((c) => c.id === companyId);
  if (!company) return [];

  let currentShares = holding.shares;
  const companyDividends = getCompanyDividends(companyId);
  const payments: DividendPayment[] = [];

  for (const round of companyDividends) {
    const tokensReceived = Math.floor(currentShares * (round.rate / 100));
    if (tokensReceived === 0) continue;

    payments.push({
      roundId: round.id,
      companyId: companyId,
      companyName: company.name,
      symbol: company.symbol,
      date: round.date,
      rate: round.rate,
      sharesBefore: currentShares,
      tokensReceived,
      sharesAfter: currentShares + tokensReceived,
    });
    currentShares += tokensReceived;
  }

  return payments;
}

export function getAllDividendPayments(shareholder: Shareholder): DividendPayment[] {
  const payments: DividendPayment[] = [];
  for (const holding of shareholder.holdings) {
    payments.push(...getDividendPayments(shareholder, holding.companyId));
  }
  payments.sort((a, b) => b.date.localeCompare(a.date));
  return payments;
}
