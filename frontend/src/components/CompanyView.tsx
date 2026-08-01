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

interface Props {
  company: Company;
  shareholders: Shareholder[];
  dividends: DividendRound[];
  allCompanies: Company[];
  serverAvailable: boolean;
  onChangeCompany: (companyId: string) => void;
  onAnnounce: (rate: number, announcementDate: string, recordDate: string, distributionDate: string, distributionTime: string) => Promise<void>;
  onExecute: (roundId: number) => Promise<void>;
  onInit: (companyId: string) => Promise<void>;
  loading: boolean;
}

export default function CompanyView({
  company,
  shareholders,
  dividends,
  allCompanies,
  serverAvailable,
  onChangeCompany,
  onAnnounce,
  onExecute,
  onInit,
  loading,
}: Props) {
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

  const companyShareholders = shareholders.filter((s) =>
    s.holdings.some((h) => h.companyId === company.id),
  );
  const estimatedNewTokens = Math.floor(company.currentSupply * (rate / 100));

  const handleDeclare = async () => {
    setShowConfirm(false);
    await onAnnounce(rate, announcementDate, recordDate, distributionDate, distributionTime);
  };

  const statusBadge = (status: DividendRound['status']) => {
    const colors: Record<string, string> = {
      announced: 'bg-amber-50 text-amber-700',
      recorded: 'bg-blue-50 text-blue-700',
      distributed: 'bg-emerald-50 text-emerald-700',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] ?? 'bg-gray-50 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contract Address</p>
          <p className="mt-1 text-sm font-mono text-gray-600 break-all">
            {serverAvailable ? (
              <a href={`https://chipnet.bchexplorer.info/address/${company.contractAddress}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                {company.contractAddress}
              </a>
            ) : company.contractAddress}
          </p>
          <p className="mt-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Token ID</p>
          <p className="mt-1 text-sm font-mono text-gray-600 break-all">
            {serverAvailable ? (
              <a href={`https://chipnet.bchexplorer.info/tx/${company.tokenId}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                {company.tokenId.substring(0, 24)}...
              </a>
            ) : company.tokenId.substring(0, 24) + '...'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Supply</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{company.currentSupply.toLocaleString()}</p>
          <p className="text-sm text-gray-500">{company.symbol} tokens</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Shareholders</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{companyShareholders.length}</p>
          <p className="text-sm text-gray-500">wallet holders</p>
        </div>
      </div>

      {allCompanies.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Company:</span>
          <select
            value={company.id}
            onChange={(e) => onChangeCompany(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          >
            {allCompanies.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>
            ))}
          </select>
        </div>
      )}

      {serverAvailable && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => onInit(company.id)}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-all"
          >
            Initialize Holdings
          </button>
          <span className="text-xs text-gray-400">Distribute initial shares from vault to all shareholders</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Declare Stock Dividend</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dividend Rate (%)</label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(Math.max(0, Math.min(100, Number(e.target.value))))}
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                min={1}
                max={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Announcement Date</label>
              <input type="date" value={announcementDate} onChange={(e) => setAnnouncementDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Record Date</label>
              <input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Distribution Date</label>
              <div className="flex gap-2">
                <input type="date" value={distributionDate} onChange={(e) => setDistributionDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
                <input type="time" value={distributionTime} onChange={(e) => setDistributionTime(e.target.value)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={rate <= 0 || loading}
              className="px-6 py-2.5 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Processing...' : 'Publish Announcement'}
            </button>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dividend Timeline</p>
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-0.5 h-6 bg-gray-300"></div>
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                <div className="w-0.5 h-6 bg-gray-300"></div>
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
              </div>
              <div className="space-y-5 py-1">
                <div>
                  <p className="text-sm font-medium text-gray-800">Announcement</p>
                  <p className="text-xs text-gray-500">{announcementDate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Record Date</p>
                  <p className="text-xs text-gray-500">Snapshot holders at {recordDate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Distribution</p>
                  <p className="text-xs text-gray-500">Tokens sent on {distributionDate}</p>
                </div>
              </div>
            </div>
          </div>

          {rate > 0 && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Estimated New Tokens</p>
                <p className="text-xl font-bold text-brand-700">+{estimatedNewTokens.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">New Total Supply</p>
                <p className="text-xl font-bold text-gray-900">{(company.currentSupply + estimatedNewTokens).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Per Holder Example</p>
                <p className="text-xl font-bold text-gray-900">
                  +{Math.floor(300 * (rate / 100))} <span className="text-sm font-normal text-gray-500">({company.symbol})</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Shareholder Registry</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-5 py-3 font-semibold text-gray-500">Holder</th>
              <th className="px-5 py-3 font-semibold text-gray-500">Address</th>
              <th className="px-5 py-3 font-semibold text-gray-500">Tier</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-right">Shares</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-right">Ownership</th>
            </tr>
          </thead>
          <tbody>
            {companyShareholders.map((s) => {
              const holding = s.holdings.find((h) => h.companyId === company.id);
              if (!holding) return null;
              const payments = getDividendPaymentsForHolder(s, company.id, dividends);
              const currentShares = holding.shares + payments.reduce((sum, p) => sum + p.tokensReceived, 0);
              const ownership = ((currentShares / company.currentSupply) * 100).toFixed(2);
              const tierColors: Record<string, string> = { founder: 'bg-purple-50 text-purple-700', investor: 'bg-blue-50 text-blue-700', public: 'bg-gray-50 text-gray-600' };
              const tierLabels: Record<string, string> = { founder: 'Founder · 2x', investor: 'Investor · 1x', public: 'Public · 0.5x' };
              return (
                <tr key={s.address} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{s.label}</td>
                  <td className="px-5 py-3 font-mono text-xs">
                    {serverAvailable ? (
                      <a href={`https://chipnet.bchexplorer.info/address/${s.address}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                        {s.address.substring(0, 20)}...
                      </a>
                    ) : <span className="text-gray-500">{s.address.substring(0, 20)}...</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${tierColors[s.tier] ?? ''}`}>
                      {tierLabels[s.tier] ?? s.tier}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-gray-900">{currentShares.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{ownership}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Dividend History</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-5 py-3 font-semibold text-gray-500">Status</th>
              <th className="px-5 py-3 font-semibold text-gray-500">Announce</th>
              <th className="px-5 py-3 font-semibold text-gray-500">Record</th>
              <th className="px-5 py-3 font-semibold text-gray-500">Distribute</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-right">Rate</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-right">Tokens</th>
              <th className="px-5 py-3 font-semibold text-gray-500">TXID</th>
              <th className="px-5 py-3 font-semibold text-gray-500 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {dividends.map((d) => (
              <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">{statusBadge(d.status)}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{d.announcementDate}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{d.recordDate}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{d.distributionDate}</td>
                <td className="px-5 py-3 text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">
                    {d.rate}%
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-mono text-brand-700">+{d.newTokensMinted}</td>
                <td className="px-5 py-3 font-mono text-xs">
                  {d.txid && serverAvailable ? (
                    <a href={`https://chipnet.bchexplorer.info/tx/${d.txid}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                      {d.txid.substring(0, 16)}...
                    </a>
                  ) : <span className="text-gray-400">{d.txid ? d.txid.substring(0, 16) + '...' : '—'}</span>}
                </td>
                <td className="px-5 py-3 flex gap-2">
                  {d.status !== 'distributed' && (
                    <button
                      onClick={() => onExecute(d.id)}
                      disabled={loading || d.distributionDate > todayStr()}
                      title={d.distributionDate > todayStr() ? `Available on ${d.distributionDate}` : 'Execute distribution'}
                      className="px-3 py-1 text-xs font-semibold bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-40 transition-colors"
                    >
                      {d.distributionDate > todayStr() ? 'Pending' : 'Execute'}
                    </button>
                  )}
                  {d.status === 'distributed' && d.merkleRoot && (
                    <button
                      onClick={() => { setVerifyRound(d); setVerifyHolder(''); setVerifyResult(null); }}
                      className="px-3 py-1 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                    >
                      Verify
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {dividends.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-gray-400">No dividends declared yet.</td>
              </tr>
            )}
          </tbody>
        </table>
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
              <div className="flex justify-between"><span>Distribution:</span><span className="font-mono">{distributionDate}</span></div>
              <div className="flex justify-between pt-2 border-t border-gray-100"><span>New tokens to issue:</span><span className="font-mono font-bold">{estimatedNewTokens}</span></div>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              This publishes the dividend announcement on-chain. The smart contract will distribute {estimatedNewTokens.toLocaleString()} {company.symbol} tokens to {companyShareholders.length} shareholders on {distributionDate}, based on their holdings at the record date ({recordDate}).
            </p>
            <div className="mt-4 flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleDeclare} className="px-6 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                Confirm & Execute
              </button>
            </div>
          </div>
        </div>
      )}

      {verifyRound && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setVerifyRound(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Merkle Proof Verification</h3>
            <p className="text-sm text-gray-500 mt-0.5">Round #{verifyRound.id} — {verifyRound.rate}% dividend</p>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Merkle Root (on-chain)</p>
              <p className="text-xs font-mono text-gray-700 break-all">{verifyRound.merkleRoot}</p>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Verify Holder</label>
              <div className="flex gap-2">
                <select value={verifyHolder} onChange={(e) => setVerifyHolder(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
                  <option value="">Select holder...</option>
                  {verifyRound.snapshot ? Object.keys(verifyRound.snapshot).map((label) => (
                    <option key={label} value={label}>{label}</option>
                  )) : null}
                </select>
                <button
                  onClick={async () => {
                    if (!verifyHolder || !verifyRound) return;
                    setVerifyLoading(true);
                    try {
                      const result = await verifyDividend(verifyRound.id, verifyHolder);
                      setVerifyResult(result);
                    } catch { setVerifyResult(null); }
                    setVerifyLoading(false);
                  }}
                  disabled={!verifyHolder || verifyLoading}
                  className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 transition-colors"
                >
                  {verifyLoading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </div>

            {verifyResult?.proof && (
              <div className="mt-4 space-y-3">
                <div className={`p-3 rounded-lg text-sm font-semibold ${verifyResult.proof.verified ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {verifyResult.proof.verified ? 'VERIFIED: This holder was correctly included in the dividend.' : 'FAILED: Verification did not match the Merkle root.'}
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Holder Details</p>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><span className="font-medium">Name:</span> {verifyResult.proof.leaf.label}</p>
                    <p><span className="font-medium">Shares:</span> {verifyResult.proof.leaf.shares}</p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Merkle Proof Siblings</p>
                  {verifyResult.proof.siblings.length === 0 ? (
                    <p className="text-xs text-gray-500">Single leaf — no siblings needed.</p>
                  ) : (
                    <div className="space-y-1">
                      {verifyResult.proof.siblings.map((s: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className={`px-1.5 py-0.5 rounded font-mono ${s.direction === 'left' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                            {s.direction}
                          </span>
                          <span className="font-mono text-gray-600">{s.hash.substring(0, 16)}...</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {verifyRound.snapshot && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tree Visualization</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(verifyRound.snapshot).map(([label, shares]) => (
                    <div key={label} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs">
                      <span className="font-medium text-gray-700">{label}</span>
                      <span className="text-gray-400 ml-1">({shares})</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-center">
                  <div className="px-3 py-1.5 bg-brand-100 border border-brand-200 rounded-lg text-xs font-mono text-brand-700 text-center">
                    Root: {verifyRound.merkleRoot?.substring(0, 16)}...
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-3 justify-end">
              {verifyResult?.proof?.verified && (
                <button
                  onClick={() => {
                    const receipt = {
                      dividendProof: {
                        company: company.name, symbol: company.symbol,
                        rate: verifyRound.rate,
                        announcementDate: verifyRound.announcementDate,
                        recordDate: verifyRound.recordDate,
                        distributionDate: verifyRound.distributionDate,
                        distributionTime: verifyRound.distributionTime,
                        holder: verifyResult.proof.leaf,
                        tokensReceived: Math.floor(verifyResult.proof.leaf.shares * (verifyRound.rate / 100)),
                        merkleRoot: verifyRound.merkleRoot,
                        txid: verifyRound.txid,
                        verified: verifyResult.proof.verified,
                        proofPath: verifyResult.proof.siblings,
                        generatedAt: new Date().toISOString(),
                        onChainRecord: `https://chipnet.bchexplorer.info/tx/${verifyRound.txid}`,
                        verificationService: `${window.location.origin}/#registry?company=${verifyRound.companyId}&verify=${verifyRound.id}&holder=${encodeURIComponent(verifyHolder)}`,
                      },
                    };
                    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `dividend-proof-${verifyRound.companyId}-round${verifyRound.id}-${verifyHolder.replace(/\s+/g, '-').toLowerCase()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Download Proof
                </button>
              )}
              <button onClick={() => setVerifyRound(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
