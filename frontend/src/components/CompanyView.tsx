import { useState } from 'react';
import type { Company, Shareholder, DividendRound } from '../types';
import { getDividendPaymentsForHolder } from '../utils';
import { verifyDividend } from '../api';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface CompanyViewProps {
  company: Company;
  shareholders: Shareholder[];
  dividends: DividendRound[];
  onAnnounce: (rate: number, announcementDate: string, recordDate: string, distributionDate: string, distributionTime: string) => Promise<void>;
  onExecute: (roundId: number) => Promise<void>;
  onInit: (companyId: string) => Promise<void>;
  loading: boolean;
  tab: string;
}

export default function CompanyView({
  company, shareholders, dividends,
  onAnnounce, onExecute, onInit, loading, tab,
}: CompanyViewProps) {
  const [rate, setRate] = useState(5);
  const [announcementDate, setAnnouncementDate] = useState(todayStr());
  const [recordDate, setRecordDate] = useState(addDays(todayStr(), 14));
  const [distributionDate, setDistributionDate] = useState(addDays(todayStr(), 30));
  const [distributionTime, setDistributionTime] = useState('09:00');
  const [showConfirm, setShowConfirm] = useState(false);
  const [verifyRound, setVerifyRound] = useState<DividendRound | null>(null);
  const [verifyHolder, setVerifyHolder] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [shareholderSearch, setShareholderSearch] = useState('');
  const [shareholderSort, setShareholderSort] = useState<'name' | 'shares' | 'tier'>('name');
  const [activityFilter, setActivityFilter] = useState('all');
  const [activitySearch, setActivitySearch] = useState('');
  const [tierTab, setTierTab] = useState<'founder' | 'investor' | 'public'>('founder');

  const companyShareholders = shareholders.filter((s) => s.holdings.some((h) => h.companyId === company.id));
  const estimatedNewTokens = Math.floor(company.currentSupply * (rate / 100));

  const handleDeclare = async () => { setShowConfirm(false); await onAnnounce(rate, announcementDate, recordDate, distributionDate, distributionTime); };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { announced: 'bg-amber-50 text-amber-700', recorded: 'bg-blue-50 text-blue-700', distributed: 'bg-emerald-50 text-emerald-700' };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] ?? 'bg-[#2E4B2F]/10 text-gray-600'}`}>{status}</span>;
  };

  const TierColors: Record<string, string> = { founder: 'bg-purple-50 text-purple-700', investor: 'bg-blue-50 text-blue-700', public: 'bg-[#2E4B2F]/10 text-gray-600' };
  const TierLabels: Record<string, string> = { founder: 'Founder · 2x', investor: 'Investor · 1x', public: 'Public · 0.5x' };

  if (tab === 'shareholders') {
    const filtered = companyShareholders
      .filter((s) => !shareholderSearch || s.label.toLowerCase().includes(shareholderSearch.toLowerCase()))
      .sort((a, b) => {
        if (shareholderSort === 'name') return a.label.localeCompare(b.label);
        if (shareholderSort === 'tier') return a.tier.localeCompare(b.tier);
        const aH = a.holdings.find((h) => h.companyId === company.id);
        const bH = b.holdings.find((h) => h.companyId === company.id);
        return (bH?.shares ?? 0) - (aH?.shares ?? 0);
      });
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={shareholderSearch} onChange={(e) => setShareholderSearch(e.target.value)} placeholder="Search holders..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
          </div>
          <span className="text-xs text-gray-400">{filtered.length} of {companyShareholders.length} holders</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Shareholder Registry</h2></div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-[#2E4B2F]/10 text-left">
              <th className="px-5 py-3 font-semibold text-gray-500 cursor-pointer hover:text-gray-900 select-none" onClick={() => setShareholderSort('name')}>Holder {shareholderSort === 'name' ? '↑' : ''}</th>
              <th className="px-5 py-3 font-semibold text-gray-500">Address</th>
              <th className="px-5 py-3 font-semibold text-gray-500 cursor-pointer hover:text-gray-900 select-none" onClick={() => setShareholderSort('tier')}>Tier {shareholderSort === 'tier' ? '↑' : ''}</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-right cursor-pointer hover:text-gray-900 select-none" onClick={() => setShareholderSort('shares')}>Shares {shareholderSort === 'shares' ? '↑' : ''}</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-right">Ownership</th>
            </tr></thead>
            <tbody>
              {filtered.map((s) => {
                const holding = s.holdings.find((h) => h.companyId === company.id);
                if (!holding) return null;
                const payments = getDividendPaymentsForHolder(s, company.id, dividends);
                const currentShares = holding.shares + payments.reduce((sum, p) => sum + p.tokensReceived, 0);
                const ownership = ((currentShares / company.currentSupply) * 100).toFixed(2);
                return (
                  <tr key={s.address} className="border-b border-gray-50 hover:bg-[#2E4B2F]/10 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{s.label}</td>
                    <td className="px-5 py-3 font-mono text-xs">
                      <a href={`https://chipnet.bchexplorer.info/address/${s.address}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{s.address.substring(0, 20)}...</a>
                    </td>
                    <td className="px-5 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${TierColors[s.tier] ?? ''}`}>{TierLabels[s.tier] ?? s.tier}</span></td>
                    <td className="px-5 py-3 text-right font-mono text-gray-900">{currentShares.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{ownership}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (tab === 'distributions') {
    return (
      <div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Dividend History</h2>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {['all', 'announced', 'recorded', 'distributed'].map((f) => (
                <button key={f} className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-all ${f === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{f}</button>
              ))}
            </div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-[#2E4B2F]/10 text-left">
              <th className="px-5 py-3 font-semibold text-gray-500">Timeline</th>
              <th className="px-5 py-3 font-semibold text-gray-500">Status</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-right">Rate</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-right">Tokens</th>
              <th className="px-5 py-3 font-semibold text-gray-500">TXID</th>
              <th className="px-5 py-3 font-semibold text-gray-500 w-10"></th>
            </tr></thead>
            <tbody>
              {dividends.map((d) => {
                const dotColors = {
                  a: d.status === 'announced' ? 'bg-amber-500' : d.status === 'recorded' || d.status === 'distributed' ? 'bg-gray-400' : 'bg-gray-400',
                  r: d.status === 'recorded' ? 'bg-blue-500' : d.status === 'distributed' ? 'bg-gray-400' : 'bg-gray-300',
                  g: d.status === 'distributed' ? 'bg-emerald-500' : 'bg-gray-300',
                };
                const lineColors = {
                  l1: d.status === 'announced' ? 'bg-amber-300' : d.status === 'recorded' || d.status === 'distributed' ? 'bg-gray-400' : 'bg-gray-200',
                  l2: d.status === 'distributed' ? 'bg-emerald-300' : 'bg-gray-200',
                };
                return (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-[#2E4B2F]/10 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-0.5">
                      <div className={`w-2 h-2 rounded-full ${dotColors.a}`}></div>
                      <div className={`w-4 h-0.5 ${lineColors.l1}`}></div>
                      <div className={`w-2 h-2 rounded-full ${dotColors.r}`}></div>
                      <div className={`w-4 h-0.5 ${lineColors.l2}`}></div>
                      <div className={`w-2 h-2 rounded-full ${dotColors.g}`}></div>
                    </div>
                  </td>
                  <td className="px-5 py-3">{statusBadge(d.status)}</td>
                  <td className="px-5 py-3 text-right"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">{d.rate}%</span></td>
                  <td className="px-5 py-3 text-right font-mono text-brand-700">+{d.newTokensMinted}</td>
                  <td className="px-5 py-3 font-mono text-xs">
                    {d.txid ? <a href={`https://chipnet.bchexplorer.info/tx/${d.txid}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{d.txid.substring(0, 16)}...</a> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-3 flex gap-2">
                    {d.status !== 'distributed' && (
                      <button onClick={() => onExecute(d.id)} disabled={loading || d.distributionDate > todayStr()}
                        title={d.distributionDate > todayStr() ? `Available on ${d.distributionDate}` : 'Execute distribution'}
                        className="px-3 py-1 text-xs font-semibold bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-40 transition-colors">
                        {d.distributionDate > todayStr() ? 'Pending' : 'Execute'}
                      </button>
                    )}
                    {d.status === 'distributed' && d.merkleRoot && (
                      <button onClick={() => { setVerifyRound(d); setVerifyHolder(''); setVerifyResult(null); }}
                        className="px-3 py-1 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors">Verify</button>
                    )}
                  </td>
                </tr>
              )})}
              {dividends.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No dividends declared yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (tab === 'tiers') {
    const tierCounts: Record<string, number> = {};
    for (const s of companyShareholders) { tierCounts[s.tier] = (tierCounts[s.tier] || 0) + 1; }
    const tiers = [
      { id: 'founder', label: 'Founder', multiplier: 2.0, desc: 'Early contributors and company founders' },
      { id: 'investor', label: 'Investor', multiplier: 1.0, desc: 'Standard equity investors' },
      { id: 'public', label: 'Public', multiplier: 0.5, desc: 'Public market participants' },
    ];
    return (
      <div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Tier Governance</h2></div>
          <div className="p-5">
            <p className="text-sm text-gray-500 mb-4">Tier multipliers determine how dividends are distributed according to predefined rules. Each holder class receives a different rate multiplier.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {tiers.map((t) => (
                <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4"><div className="p-3 bg-[#2E4B2F]/10 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${TierColors[t.id] ?? ''}`}>{TierLabels[t.id] ?? t.label}</span>
                    <span className="text-xs text-gray-400">{tierCounts[t.id] || 0} holders</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{t.multiplier}x</p>
                  <p className="text-xs text-gray-400">{t.desc}</p>
                  <div className="mt-3 pt-3 border-t border-gray-200/50">
                    <p className="text-xs text-gray-400">5% dividend example:</p>
                    <p className="text-sm font-mono text-gray-700">5% × {t.multiplier}x = {5 * t.multiplier}% effective</p>
                  </div>
                </div></div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              Tier assignments are defined during genesis and enforced by the smart contract. Each shareholder's tier multiplier is applied automatically when dividends are distributed — no manual intervention required.
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-4">
            {tiers.map((t) => (
              <button key={t.id} onClick={() => setTierTab(t.id as 'founder' | 'investor' | 'public')} className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${tierTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {t.id} · {t.multiplier}x
              </button>
            ))}
          </div>
          {(() => {
            const t = tiers.find((x) => x.id === tierTab)!;
            const tierHolders = companyShareholders.filter((s) => s.tier === tierTab);
            return (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${TierColors[t.id] ?? ''}`}>{TierLabels[t.id] ?? t.label}</span>
                  <span className="text-xs text-gray-400">{tierHolders.length} holder{tierHolders.length !== 1 ? 's' : ''} · {t.multiplier}x multiplier</span>
                </div>
                {tierHolders.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-gray-400">No holders in this tier.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-[#2E4B2F]/10 bg-[#2E4B2F]/10 text-left">
                      <th className="px-5 py-2 font-semibold text-gray-500">Holder</th>
                      <th className="px-5 py-2 font-semibold text-gray-500 text-right">Shares</th>
                      <th className="px-5 py-2 font-semibold text-gray-500 text-right">Effective Rate (5% base)</th>
                    </tr></thead>
                    <tbody>
                      {tierHolders.map((s) => {
                        const holding = s.holdings.find((h) => h.companyId === company.id);
                        if (!holding) return null;
                        const mult = s.tier === 'founder' ? 2 : s.tier === 'investor' ? 1 : 0.5;
                        return (
                          <tr key={s.address} className="border-b border-gray-50">
                            <td className="px-5 py-2.5 font-medium text-gray-900">{s.label}</td>
                            <td className="px-5 py-2.5 text-right font-mono text-gray-900">{holding.shares.toLocaleString()}</td>
                            <td className="px-5 py-2.5 text-right font-mono text-gray-700">{5 * mult}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  if (tab === 'settings') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 text-lg mb-6">Account Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#2E4B2F]/10 rounded-lg">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Company</p>
            <p className="text-lg font-bold text-gray-900">{company.name}</p>
            <p className="text-sm text-gray-500 mt-1">{company.symbol}</p>
          </div>
          <div className="p-4 bg-[#2E4B2F]/10 rounded-lg">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Token ID</p>
            <p className="text-sm font-mono text-gray-700 break-all">{company.tokenId}</p>
          </div>
          <div className="p-4 bg-[#2E4B2F]/10 rounded-lg">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Vault Address</p>
            <p className="text-sm font-mono text-gray-700 break-all">{company.contractAddress}</p>
          </div>
          <div className="p-4 bg-[#2E4B2F]/10 rounded-lg">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Total Supply</p>
            <p className="text-lg font-bold text-gray-900">{company.currentSupply.toLocaleString()} {company.symbol}</p>
          </div>
        </div>
      </div>
    );
  }

  if (tab === 'activity') {
    const entries: { date: string; type: string; amount: string; txid: string; label: string }[] = [];
    entries.push({ date: '2026-08-02', type: 'Genesis', amount: `+${company.initialSupply.toLocaleString()}`, txid: company.tokenId, label: `Created ${company.symbol} tokens` });
    dividends.sort((a, b) => a.id - b.id).forEach((d) => {
      if (d.txid) entries.push({ date: d.distributionDate, type: 'Dividend', amount: `+${d.newTokensMinted}`, txid: d.txid, label: `${d.rate}% dividend` });
    });
    const typeColors: Record<string, string> = { Genesis: 'bg-green-50 text-green-700', Dividend: 'bg-purple-50 text-purple-700', Init: 'bg-blue-50 text-blue-700' };
    const filteredEntries = entries.filter((e) => {
      if (activityFilter !== 'all' && e.type.toLowerCase() !== activityFilter) return false;
      if (activitySearch && !e.label.toLowerCase().includes(activitySearch.toLowerCase())) return false;
      return true;
    });
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-gray-900">Activity Log</h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
              {['all', 'genesis', 'dividend', 'init'].map((f) => (
                <button key={f} onClick={() => setActivityFilter(f)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-all ${activityFilter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{f}</button>
              ))}
            </div>
            <div className="relative">
              <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" value={activitySearch} onChange={(e) => setActivitySearch(e.target.value)} placeholder="Search..."
                className="pl-7 pr-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none w-36" />
            </div>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-[#2E4B2F]/10 text-left">
            <th className="px-5 py-3 font-semibold text-gray-500">#</th>
            <th className="px-5 py-3 font-semibold text-gray-500">Date</th>
            <th className="px-5 py-3 font-semibold text-gray-500">Type</th>
            <th className="px-5 py-3 font-semibold text-gray-500">Description</th>
            <th className="px-5 py-3 font-semibold text-gray-500 text-right">Amount</th>
            <th className="px-5 py-3 font-semibold text-gray-500">TXID</th>
          </tr></thead>
          <tbody>
            {filteredEntries.map((e, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-[#2E4B2F]/10 transition-colors">
                <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{e.date}</td>
                <td className="px-5 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${typeColors[e.type] ?? ''}`}>{e.type}</span></td>
                <td className="px-5 py-3 text-sm text-gray-700">{e.label}</td>
                <td className="px-5 py-3 text-right font-mono text-gray-900">{e.amount}</td>
                <td className="px-5 py-3 font-mono text-xs">
                  {e.txid ? <a href={`https://chipnet.bchexplorer.info/tx/${e.txid}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{e.txid.substring(0, 12)}...</a> : '—'}
                </td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No activity recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Contract Address</p>
          <p className="mt-1 text-sm font-mono text-gray-600 break-all">
            <a href={`https://chipnet.bchexplorer.info/address/${company.contractAddress}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{company.contractAddress}</a>
          </p>
          <p className="mt-3 text-xs font-semibold text-gray-900 uppercase tracking-wide">Token ID</p>
          <p className="mt-1 text-sm font-mono text-gray-600 break-all">
            <a href={`https://chipnet.bchexplorer.info/tx/${company.tokenId}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{company.tokenId.substring(0, 24)}...</a>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Total Supply</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{company.currentSupply.toLocaleString()}</p>
          <p className="text-sm text-gray-500">{company.symbol} tokens</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Shareholders</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{companyShareholders.length}</p>
          <p className="text-sm text-gray-500">wallet holders</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Declare Stock Dividend</h2></div>
        <div className="p-5 space-y-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Dividend Rate (%)</label>
              <input type="number" value={rate} onChange={(e) => setRate(Math.max(0, Math.min(100, Number(e.target.value))))}
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" min={1} max={100} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Announcement Date</label>
              <input type="date" value={announcementDate} onChange={(e) => setAnnouncementDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Record Date</label>
              <input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Distribution Date</label>
              <div className="flex gap-2"><input type="date" value={distributionDate} onChange={(e) => setDistributionDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              <input type="time" value={distributionTime} onChange={(e) => setDistributionTime(e.target.value)} className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" /></div></div>
            <button onClick={() => setShowConfirm(true)} disabled={rate <= 0 || loading}
              className="px-6 py-2.5 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  Processing...
                </span>
              ) : 'Publish Announcement'}
            </button>
          </div>
          <div className="p-4 bg-[#2E4B2F]/10 rounded-lg">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dividend Timeline (Preview)</p>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div className="w-3 h-3 rounded-full bg-gray-400 mb-2"></div>
                  <p className="text-sm font-medium text-gray-600 text-center">Announcement</p>
                  <p className="text-xs text-gray-500 text-center">{announcementDate}</p>
                </div>
                <div className="flex-1 h-0.5 bg-gray-300 -mt-4"></div>
                <div className="flex flex-col items-center flex-1">
                  <div className="w-3 h-3 rounded-full bg-gray-400 mb-2"></div>
                  <p className="text-sm font-medium text-gray-600 text-center">Record Date</p>
                  <p className="text-xs text-gray-500 text-center">{recordDate}</p>
                </div>
                <div className="flex-1 h-0.5 bg-gray-300 -mt-4"></div>
                <div className="flex flex-col items-center flex-1">
                  <div className="w-3 h-3 rounded-full bg-gray-400 mb-2"></div>
                  <p className="text-sm font-medium text-gray-600 text-center">Distribution</p>
                  <p className="text-xs text-gray-500 text-center">{distributionDate} {distributionTime}</p>
                </div>
              </div>
            </div>
          </div>
          {rate > 0 && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-[#2E4B2F]/10 rounded-lg">
              <div><p className="text-xs text-gray-500">Estimated New Tokens</p><p className="text-xl font-bold text-brand-700">+{estimatedNewTokens.toLocaleString()}</p></div>
              <div><p className="text-xs text-gray-500">New Total Supply</p><p className="text-xl font-bold text-gray-900">{(company.currentSupply + estimatedNewTokens).toLocaleString()}</p></div>
              <div><p className="text-xs text-gray-500">Per Holder Example</p><p className="text-xl font-bold text-gray-900">+{Math.floor(300 * (rate / 100))} <span className="text-sm font-normal text-gray-500">({company.symbol})</span></p></div>
            </div>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Publish Dividend Announcement</h3>
            <p className="text-sm text-gray-500 mt-0.5">{company.name} ({company.symbol})</p>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <div className="flex justify-between"><span>Rate:</span><span className="font-bold text-brand-700">{rate}%</span></div>
              <div className="flex justify-between"><span>Announcement:</span><span className="font-mono">{announcementDate}</span></div>
              <div className="flex justify-between"><span>Record Date:</span><span className="font-mono">{recordDate}</span></div>
              <div className="flex justify-between"><span>Distribution:</span><span className="font-mono">{distributionDate} {distributionTime}</span></div>
              <div className="flex justify-between pt-2 border-t border-gray-100"><span>New tokens to issue:</span><span className="font-mono font-bold">{estimatedNewTokens}</span></div>
            </div>
            <div className="mt-4 flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleDeclare} className="px-6 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">Confirm & Execute</button>
            </div>
          </div>
        </div>
      )}

      {verifyRound && MerkleModal(verifyRound, verifyHolder, setVerifyHolder, verifyResult, setVerifyResult, verifyLoading, setVerifyLoading, setVerifyRound, company)}
    </div>
  );
}

function MerkleModal(
  verifyRound: DividendRound, verifyHolder: string, setVerifyHolder: (v: string) => void,
  verifyResult: any, setVerifyResult: (v: any) => void, verifyLoading: boolean, setVerifyLoading: (v: boolean) => void,
  setVerifyRound: (v: DividendRound | null) => void, company: Company,
) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setVerifyRound(null)}>
      <div className="bg-white rounded-2xl p-6 max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">Merkle Proof Verification</h3>
        <p className="text-sm text-gray-500 mt-0.5">Round #{verifyRound.id} — {verifyRound.rate}% dividend</p>
        <div className="mt-4 p-3 bg-[#2E4B2F]/10 rounded-lg"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Merkle Root (on-chain)</p><p className="text-xs font-mono text-gray-700 break-all">{verifyRound.merkleRoot}</p></div>
        <div className="mt-3"><label className="block text-sm font-medium text-gray-700 mb-1">Verify Holder</label>
          <div className="flex gap-2">
            <select value={verifyHolder} onChange={(e) => setVerifyHolder(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
              <option value="">Select holder...</option>
              {verifyRound.snapshot ? Object.keys(verifyRound.snapshot).map((label) => (<option key={label} value={label}>{label}</option>)) : null}
            </select>
            <button onClick={async () => { setVerifyLoading(true); try { setVerifyResult(await verifyDividend(verifyRound.id, verifyHolder)); } catch { setVerifyResult(null); } setVerifyLoading(false); }}
              disabled={!verifyHolder || verifyLoading} className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 transition-colors">
              {verifyLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  Verifying...
                </span>
              ) : 'Verify'}
            </button>
          </div>
        </div>
        {verifyResult?.proof && (
          <div className="mt-4 space-y-3">
            <div className={`p-3 rounded-lg text-sm font-semibold ${verifyResult.proof.verified ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {verifyResult.proof.verified ? 'VERIFIED: This holder was correctly included in the dividend.' : 'FAILED: Verification did not match the Merkle root.'}
            </div>
            <div className="p-3 bg-[#2E4B2F]/10 rounded-lg"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Holder Details</p>
              <div className="text-sm text-gray-700 space-y-1"><p><span className="font-medium">Name:</span> {verifyResult.proof.leaf.label}</p><p><span className="font-medium">Shares:</span> {verifyResult.proof.leaf.shares}</p></div>
            </div>
            <div className="p-3 bg-[#2E4B2F]/10 rounded-lg"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Merkle Proof Siblings</p>
              {verifyResult.proof.siblings.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1">
                  <span className={`px-1.5 py-0.5 rounded font-mono ${s.direction === 'left' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{s.direction}</span>
                  <span className="font-mono text-gray-600">{s.hash.substring(0, 16)}...</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4 flex gap-3 justify-end">
          {verifyResult?.proof?.verified && (
            <button onClick={() => {
              const receipt = { dividendProof: { company: company.name, symbol: company.symbol, rate: verifyRound.rate, announcementDate: verifyRound.announcementDate, recordDate: verifyRound.recordDate, distributionDate: verifyRound.distributionDate, distributionTime: verifyRound.distributionTime, holder: verifyResult.proof.leaf, tokensReceived: Math.floor(verifyResult.proof.leaf.shares * (verifyRound.rate / 100)), merkleRoot: verifyRound.merkleRoot, txid: verifyRound.txid, verified: verifyResult.proof.verified, proofPath: verifyResult.proof.siblings, generatedAt: new Date().toISOString(), onChainRecord: `https://chipnet.bchexplorer.info/tx/${verifyRound.txid}`, verificationService: `${window.location.origin}/#registry?company=${verifyRound.companyId}&verify=${verifyRound.id}&holder=${encodeURIComponent(verifyHolder)}` } };
              const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
              a.download = `dividend-proof-${verifyRound.companyId}-round${verifyRound.id}-${verifyHolder.replace(/\s+/g, '-').toLowerCase()}.json`; a.click(); URL.revokeObjectURL(url);
            }} className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">Download Proof</button>
          )}
          <button onClick={() => setVerifyRound(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}
