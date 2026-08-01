import { useState } from 'react';
import type { Shareholder, Company, DividendRound } from '../types';
import { getDividendPaymentsForHolder, getAllDividendPaymentsForHolder } from '../utils';
import { verifyDividend } from '../api';

interface Props {
  holder: Shareholder;
  holders: Shareholder[];
  companies: Company[];
  allDividends: DividendRound[];
  selectedHolderIndex: number;
  onChangeHolder: (index: number) => void;
  serverAvailable: boolean;
}

export default function ShareholderView({
  holder,
  holders,
  companies,
  allDividends,
  selectedHolderIndex,
  onChangeHolder,
}: Props) {
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [verifyRound, setVerifyRound] = useState<DividendRound | null>(null);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const allPayments = getAllDividendPaymentsForHolder(holder, allDividends);
  const totalDividends = allPayments.reduce((s, p) => s + p.tokensReceived, 0);
  const companyCount = holder.holdings.length;

  const totalSharesPerCompany: Record<string, number> = {};
  for (const h of holder.holdings) {
    const payments = getDividendPaymentsForHolder(holder, h.companyId, allDividends);
    totalSharesPerCompany[h.companyId] = h.shares + payments.reduce((s, p) => s + p.tokensReceived, 0);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Viewing as:</label>
        <select
          value={selectedHolderIndex}
          onChange={(e) => onChangeHolder(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
        >
          {holders.map((h, i) => (
            <option key={h.address} value={i}>{h.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Companies</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{companyCount}</p>
          <p className="text-sm text-gray-500">in your portfolio</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Shares</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {Object.values(totalSharesPerCompany).reduce((s, v) => s + v, 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">across all companies</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Dividends Received</p>
          <p className="mt-1 text-3xl font-bold text-brand-600">+{totalDividends.toLocaleString()}</p>
          <p className="text-sm text-gray-500">from {allPayments.length} distribution{allPayments.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Your Portfolio</h2>
        </div>
        {holder.holdings.length === 0 ? (
          <p className="px-5 py-8 text-center text-gray-400 text-sm">No holdings in any company.</p>
        ) : (
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-5 py-3 font-semibold text-gray-500">Company</th>
                  <th className="px-5 py-3 font-semibold text-gray-500 text-right">Shares</th>
                  <th className="px-5 py-3 font-semibold text-gray-500 text-right">Ownership</th>
                  <th className="px-5 py-3 font-semibold text-gray-500 text-right">Dividends Received</th>
                  <th className="px-5 py-3 font-semibold text-gray-500 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {holder.holdings.map((h) => {
                  const payments = getDividendPaymentsForHolder(holder, h.companyId, allDividends);
                  const company = companies.find((c) => c.id === h.companyId);
                  const currentShares = h.shares + payments.reduce((s, p) => s + p.tokensReceived, 0);
                  const dividendTotal = payments.reduce((s, p) => s + p.tokensReceived, 0);
                  const ownership = company ? ((currentShares / company.currentSupply) * 100).toFixed(2) : '0';
                  const isExpanded = expandedCompanyId === h.companyId;
                  return (
                    <tr key={h.companyId} className="border-b border-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        <span className="mr-2 px-1.5 py-0.5 rounded text-xs font-bold bg-brand-100 text-brand-700">{h.symbol}</span>
                        {h.companyName}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-gray-900">{currentShares.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right text-gray-600">{ownership}%</td>
                      <td className="px-5 py-3 text-right font-mono font-semibold text-brand-600">+{dividendTotal}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setExpandedCompanyId(isExpanded ? null : h.companyId)}
                          className="p-1 rounded hover:bg-gray-100 transition-colors"
                        >
                          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {expandedCompanyId && (
              <div className="border-t border-gray-100">
                {(() => {
                  const payments = getDividendPaymentsForHolder(holder, expandedCompanyId, allDividends);
                  const company = companies.find((c) => c.id === expandedCompanyId);
                  return (
                    <div className="p-5">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">
                        {company?.name ?? expandedCompanyId} — Dividend History
                      </h3>
                      {payments.length === 0 ? (
                        <p className="text-sm text-gray-400">No dividends received yet for this company.</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50 text-left">
                              <th className="px-4 py-2 font-semibold text-gray-500">Status</th>
                              <th className="px-4 py-2 font-semibold text-gray-500">Date</th>
                              <th className="px-4 py-2 font-semibold text-gray-500 text-right">Rate</th>
                              <th className="px-4 py-2 font-semibold text-gray-500 text-right">Shares Before</th>
                              <th className="px-4 py-2 font-semibold text-gray-500 text-right">Tokens Received</th>
                              <th className="px-4 py-2 font-semibold text-gray-500 text-right">Shares After</th>
                              <th className="px-4 py-2 font-semibold text-gray-500 w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {payments.map((p) => {
                              const round = allDividends.find((d) => d.id === p.roundId);
                              const statusColors: Record<string, string> = {
                                announced: 'bg-amber-50 text-amber-700',
                                recorded: 'bg-blue-50 text-blue-700',
                                distributed: 'bg-emerald-50 text-emerald-700',
                              };
                              const sc = round?.status ?? 'distributed';
                              return (
                                <tr key={p.roundId} className="border-b border-gray-50">
                                  <td className="px-4 py-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[sc] ?? 'bg-gray-50 text-gray-600'}`}>
                                      {sc}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 font-medium text-gray-900">{p.date}</td>
                                  <td className="px-4 py-2 text-right">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">
                                      {p.rate}%
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-right font-mono text-gray-600">{p.sharesBefore}</td>
                                  <td className="px-4 py-2 text-right font-mono font-semibold text-brand-600">+{p.tokensReceived}</td>
                                  <td className="px-4 py-2 text-right font-mono font-semibold text-gray-900">{p.sharesAfter}</td>
                                  <td className="px-4 py-2">
                                    {round?.merkleRoot && (
                                      <button
                                        onClick={() => { setVerifyRound(round); setVerifyResult(null); }}
                                        className="px-2 py-0.5 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                                      >
                                        Verify
                                      </button>
                                    )}
                                  </td>
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
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3">How Stock Dividends Work</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">1</div>
            <div>
              <p className="font-medium text-gray-900">Company Declares</p>
              <p className="text-gray-500 mt-0.5">Board approves a dividend rate (e.g., 5%), entered on-chain via the minting vault.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">2</div>
            <div>
              <p className="font-medium text-gray-900">Smart Contract Mints</p>
              <p className="text-gray-500 mt-0.5">The CashScript vault verifies authorization and mints the exact number of new tokens.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">3</div>
            <div>
              <p className="font-medium text-gray-900">Auto-Distributed</p>
              <p className="text-gray-500 mt-0.5">New tokens appear directly in each shareholder's wallet. No claiming, no fees, instant.</p>
            </div>
          </div>
        </div>
      </div>

      {verifyRound && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setVerifyRound(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Your Dividend Proof</h3>
            <p className="text-sm text-gray-500 mt-0.5">Round #{verifyRound.id} — {verifyRound.rate}% dividend</p>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Merkle Root (on-chain)</p>
              <p className="text-xs font-mono text-gray-700 break-all">{verifyRound.merkleRoot}</p>
            </div>

            <div className="mt-3">
              <button
                onClick={async () => {
                  if (!verifyRound) return;
                  setVerifyLoading(true);
                  try {
                    const result = await verifyDividend(verifyRound.id, holder.label);
                    setVerifyResult(result);
                  } catch { setVerifyResult(null); }
                  setVerifyLoading(false);
                }}
                disabled={verifyLoading}
                className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 transition-colors"
              >
                {verifyLoading ? 'Verifying...' : `Verify My Shares (${holder.label})`}
              </button>
            </div>

            {verifyResult?.proof && (
              <div className="mt-4 space-y-3">
                <div className={`p-3 rounded-lg text-sm font-semibold ${verifyResult.proof.verified ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {verifyResult.proof.verified ? 'VERIFIED: Your shares were correctly counted in this dividend.' : 'FAILED: Verification did not match the Merkle root.'}
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Your Snapshot</p>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><span className="font-medium">Name:</span> {verifyResult.proof.leaf.label}</p>
                    <p><span className="font-medium">Shares at record date:</span> {verifyResult.proof.leaf.shares}</p>
                    <p><span className="font-medium">Your dividend:</span> {Math.floor(verifyResult.proof.leaf.shares * (verifyRound.rate / 100))} tokens</p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Merkle Proof Path</p>
                  {verifyResult.proof.siblings.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1">
                      <span className={`px-1.5 py-0.5 rounded font-mono ${s.direction === 'left' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                        {s.direction}
                      </span>
                      <span className="font-mono text-gray-600">{s.hash.substring(0, 20)}...</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {verifyRound.snapshot && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">All Holders in Snapshot</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(verifyRound.snapshot).map(([label, shares]) => (
                    <div key={label} className={`px-2 py-1 border rounded text-xs ${label === holder.label ? 'bg-brand-100 border-brand-300 font-bold text-brand-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                      {label} ({shares})
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-3 justify-end">
              {verifyResult?.proof?.verified && (
                <button
                  onClick={() => {
                    const company = companies.find((c) => c.id === verifyRound?.companyId);
                    const receipt = {
                      dividendProof: {
                        company: company?.name, symbol: company?.symbol,
                        rate: verifyRound.rate,
                        announcementDate: verifyRound.announcementDate,
                        recordDate: verifyRound.recordDate,
                        distributionDate: verifyRound.distributionDate,
                        holder: verifyResult.proof.leaf,
                        tokensReceived: Math.floor(verifyResult.proof.leaf.shares * (verifyRound.rate / 100)),
                        merkleRoot: verifyRound.merkleRoot,
                        txid: verifyRound.txid,
                        verified: verifyResult.proof.verified,
                        proofPath: verifyResult.proof.siblings,
                        generatedAt: new Date().toISOString(),
                        onChainRecord: `https://chipnet.bchexplorer.info/tx/${verifyRound.txid}`,
                        verificationService: `${window.location.origin}/#registry?company=${verifyRound.companyId}&verify=${verifyRound.id}&holder=${encodeURIComponent(holder.label)}`,
                      },
                    };
                    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `dividend-proof-round${verifyRound.id}-${holder.label.replace(/\s+/g, '-').toLowerCase()}.json`;
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
