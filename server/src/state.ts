import { ServerState, Company, DividendRound } from './types.js';
import { seedState } from './seed.js';
import { computeDividend, getPastPayments } from './dividend.js';
import { buildMerkleTree } from './merkle.js';

let state: ServerState = seedState();

let onChangeCallbacks: Array<(state: ServerState) => void> = [];

function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function getState(): ServerState {
  autoAdvanceStatus();
  return state;
}

export function resetState(): void {
  state = seedState();
  notify();
}

export function announceDividend(
  companyId: string,
  rate: number,
  announcementDate: string,
  recordDate: string,
  distributionDate: string,
  distributionTime?: string,
): { success: true; round: DividendRound } | { success: false; error: string } {
  const companyIndex = state.companies.findIndex((c) => c.id === companyId);
  if (companyIndex === -1) return { success: false, error: 'Company not found' };
  if (rate <= 0 || rate > 100) return { success: false, error: 'Rate must be between 1 and 100' };

  const nextId = state.dividends.length > 0
    ? Math.max(...state.dividends.map((d) => d.id)) + 1
    : 1;

  const round: DividendRound = {
    id: nextId,
    companyId,
    date: announcementDate,
    rate,
    newTokensMinted: 0,
    totalSupplyAfter: state.companies[companyIndex].currentSupply,
    txid: '',
    announcementDate,
    recordDate,
    distributionDate,
    distributionTime: distributionTime || '09:00',
    status: 'announced',
  };

  state.dividends = [...state.dividends, round];
  notify();
  return { success: true, round };
}

export function executeDividend(
  roundId: number,
  realTxid?: string,
): { success: true; round: DividendRound } | { success: false; error: string } {
  const roundIndex = state.dividends.findIndex((d) => d.id === roundId);
  if (roundIndex === -1) return { success: false, error: 'Dividend round not found' };

  const round = state.dividends[roundIndex];
  if (round.status === 'distributed') return { success: false, error: 'Already distributed' };

  const today = localDate();
  const currentTime = localTime();
  if (
    round.distributionDate > today ||
    (round.distributionDate === today && (round.distributionTime || '09:00') > currentTime)
  ) {
    return { success: false, error: `Cannot execute before distribution (${round.distributionDate} ${round.distributionTime || '09:00'})` };
  }

  const companyIndex = state.companies.findIndex((c) => c.id === round.companyId);
  if (companyIndex === -1) return { success: false, error: 'Company not found' };

  const company = state.companies[companyIndex];

  if (round.status === 'announced') {
    takeSnapshot(roundId);
  }

  const updatedRound = { ...state.dividends[roundIndex] };
  const snapshot = updatedRound.snapshot;

  const { updatedCompany, newRound } = computeDividend(
    company,
    state.shareholders,
    round.rate,
    snapshot,
  );

  updatedRound.newTokensMinted = newRound.newTokensMinted;
  updatedRound.totalSupplyAfter = newRound.totalSupplyAfter;
  updatedRound.status = 'distributed';
  updatedRound.txid = realTxid || newRound.txid;

  if (updatedRound.snapshot) {
    const leaves = Object.entries(updatedRound.snapshot).map(([label, shares]) => ({ label, shares }));
    const { root } = buildMerkleTree(leaves);
    updatedRound.merkleRoot = root;
  }

  state.companies[companyIndex] = updatedCompany;
  state.dividends[roundIndex] = updatedRound;

  notify();
  return { success: true, round: updatedRound };
}

export function declareDividend(
  companyId: string,
  rate: number,
  announcementDate?: string,
  recordDate?: string,
  distributionDate?: string,
  distributionTime?: string,
): { success: true; round: DividendRound } | { success: false; error: string } {
  const today = localDate();
  const ann = announcementDate || today;
  const rec = recordDate || today;
  const dist = distributionDate || today;

  const result = announceDividend(companyId, rate, ann, rec, dist, distributionTime || '09:00');
  if (!result.success) return result;

  const execResult = executeDividend(result.round.id);
  return execResult;
}

export function takeSnapshot(roundId: number): { success: true } | { success: false; error: string } {
  const roundIndex = state.dividends.findIndex((d) => d.id === roundId);
  if (roundIndex === -1) return { success: false, error: 'Dividend round not found' };

  const round = state.dividends[roundIndex];
  const snapshot: Record<string, number> = {};

  for (const shareholder of state.shareholders) {
    const holding = shareholder.holdings.find((h) => h.companyId === round.companyId);
    if (!holding) continue;
    const pastPayments = getPastPayments(shareholder, round.companyId, state.dividends.filter(d => d.id < roundId));
    const currentShares = holding.shares + pastPayments.reduce((s, p) => s + p.tokensReceived, 0);
    snapshot[shareholder.label] = currentShares;
  }

  state.dividends[roundIndex] = { ...round, snapshot, status: 'recorded' };
  notify();
  return { success: true };
}

function autoAdvanceStatus() {
  const today = localDate();
  for (let i = 0; i < state.dividends.length; i++) {
    const d = state.dividends[i];
    if (d.status === 'announced' && d.recordDate <= today) {
      takeSnapshot(d.id);
    }
  }
}

export function getScheduledDividends(): DividendRound[] {
  const today = localDate();
  const time = localTime();
  return state.dividends.filter((d) =>
    d.status !== 'distributed' &&
    (d.distributionDate < today ||
      (d.distributionDate === today && (d.distributionTime || '09:00') <= time))
  );
}

export function getDividendPaymentsForHolder(holderIndex: number, companyId: string): any[] {
  const holder = state.shareholders[holderIndex];
  if (!holder) return [];
  return getPastPayments(holder, companyId, state.dividends);
}

export function onStateChange(cb: (state: ServerState) => void): () => void {
  onChangeCallbacks.push(cb);
  return () => { onChangeCallbacks = onChangeCallbacks.filter((c) => c !== cb); };
}

export function syncChipnetIdentifiers(deployment: Record<string, {
  tokenId: string;
  contractAddress: string;
  holders: Record<string, string>;
}>): void {
  for (const [companyId, config] of Object.entries(deployment)) {
    const company = state.companies.find((c) => c.id === companyId);
    if (company) {
      company.tokenId = config.tokenId;
      company.contractAddress = config.contractAddress;
    }
    for (const [label, addr] of Object.entries(config.holders)) {
      const holder = state.shareholders.find((s) => s.label === label);
      if (holder) {
        holder.address = addr;
      }
    }
  }
  notify();
}

function notify(): void {
  const snapshot = getState();
  for (const cb of onChangeCallbacks) {
    cb(snapshot);
  }
}
