export interface Company {
  id: string;
  name: string;
  symbol: string;
  tokenId: string;
  contractAddress: string;
  initialSupply: number;
  currentSupply: number;
}

export interface Holding {
  companyId: string;
  companyName: string;
  symbol: string;
  shares: number;
  ownershipPercent: number;
}

export interface Shareholder {
  address: string;
  label: string;
  tier: 'founder' | 'investor' | 'public';
  holdings: Holding[];
}

export interface DividendRound {
  id: number;
  companyId: string;
  date: string;
  rate: number;
  newTokensMinted: number;
  totalSupplyAfter: number;
  txid: string;
  announcementDate: string;
  recordDate: string;
  distributionDate: string;
  status: 'announced' | 'recorded' | 'distributed';
  snapshot?: Record<string, number>;
  merkleRoot?: string;
  distributionTime?: string;
}

export interface DividendPayment {
  roundId: number;
  companyId: string;
  companyName: string;
  symbol: string;
  date: string;
  rate: number;
  sharesBefore: number;
  tokensReceived: number;
  sharesAfter: number;
}

export interface AppState {
  mode: 'demo' | 'chipnet';
  role: 'company' | 'shareholder';
  selectedCompanyId: string;
  selectedHolderIndex: number;
}
