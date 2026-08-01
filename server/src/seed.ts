import { Company, Shareholder, DividendRound } from './types.js';

export function seedState(): {
  companies: Company[];
  shareholders: Shareholder[];
  dividends: DividendRound[];
} {
  const companies: Company[] = [
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

  const shareholders: Shareholder[] = [
    {
      address: 'bchtest:zr4h9ep0fs86h8w4k23kwwxnsazxs9mywvry758kgk',
      label: 'Alice (CEO)',
      tier: 'founder',
      holdings: [
        { companyId: 'acme', companyName: 'ACME Corp', symbol: 'ACME', shares: 300, ownershipPercent: 30 },
        { companyId: 'globex', companyName: 'Globex Industries', symbol: 'GLBX', shares: 150, ownershipPercent: 30 },
      ],
    },
    {
      address: 'bchtest:zp5j9fq1gt94k8w5l34kxxxotbct0partyva869hmx',
      label: 'Bob (Investor)',
      tier: 'investor',
      holdings: [
        { companyId: 'acme', companyName: 'ACME Corp', symbol: 'ACME', shares: 250, ownershipPercent: 25 },
        { companyId: 'globex', companyName: 'Globex Industries', symbol: 'GLBX', shares: 100, ownershipPercent: 20 },
      ],
    },
    {
      address: 'bchtest:zq6k0gr2hu05l9x6m45lyyyytcdv0qbqzwxb970inx',
      label: 'Charlie (Investor)',
      tier: 'founder',
      holdings: [
        { companyId: 'acme', companyName: 'ACME Corp', symbol: 'ACME', shares: 200, ownershipPercent: 20 },
      ],
    },
    {
      address: 'bchtest:zr7l1hs3iv16m0y7n56lzzzzudev1rcr0xyd087jny',
      label: 'Diana (Investor)',
      tier: 'investor',
      holdings: [
        { companyId: 'acme', companyName: 'ACME Corp', symbol: 'ACME', shares: 150, ownershipPercent: 15 },
        { companyId: 'globex', companyName: 'Globex Industries', symbol: 'GLBX', shares: 75, ownershipPercent: 15 },
      ],
    },
    {
      address: 'bchtest:zs8m2it4jw27n1z8o67maaaavff2sds1yzfe198koz',
      label: 'Eve (Investor)',
      tier: 'public',
      holdings: [
        { companyId: 'acme', companyName: 'ACME Corp', symbol: 'ACME', shares: 100, ownershipPercent: 10 },
        { companyId: 'globex', companyName: 'Globex Industries', symbol: 'GLBX', shares: 50, ownershipPercent: 10 },
      ],
    },
  ];

  const dividends: DividendRound[] = [];

  return { companies, shareholders, dividends };
}
