import { useState, useEffect } from 'react';
import type { Company, DividendRound } from '../types';
import { verifyDividend } from '../api';

interface Props {
  companies: Company[];
  dividends: DividendRound[];
  serverAvailable: boolean;
  onLogout: () => void;
}

export default function RegistryPage({ companies, dividends, serverAvailable, onLogout }: Props) {
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.id ?? '');
  const company = companies.find((c) => c.id === selectedCompany) ?? companies[0];
  const companyDividends = dividends.filter((d) => d.companyId === selectedCompany);

  const [verifyRound, setVerifyRound] = useState<DividendRound | null>(null);
  const [verifyHolder, setVerifyHolder] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace('#registry', '');
    const params = new URLSearchParams(hash.startsWith('?') ? hash.substring(1) : hash);
    const companyId = params.get('company');
    const verifyId = Number(params.get('verify'));
    const holder = params.get('holder');
    if (companyId) setSelectedCompany(companyId);
    if (verifyId && holder) {
      const round = dividends.find((d) => d.id === verifyId);
      if (round) {
        setVerifyRound(round);
        setVerifyHolder(decodeURIComponent(holder));
        verifyDividend(verifyId, decodeURIComponent(holder)).then(setVerifyResult).catch(() => {});
      }
    }
  }, []);

  const statusBadge = (status: string) => {
    const c: Record<string, string> = { announced: 'bg-amber-50 text-amber-700', recorded: 'bg-blue-50 text-blue-700', distributed: 'bg-emerald-50 text-emerald-700' };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${c[status] ?? ''}`}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Public Dividend Registry</h1>
            <p className="text-sm text-gray-500 mt-1">All dividends are cryptographically verified. Merkle roots stored on Bitcoin Cash.</p>
          </div>
          <button onClick={onLogout} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            Back to Login
          </button>
        </div>

        {companies.length > 1 && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Company:</span>
            <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
              {companies.map((c) => (<option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>))}
            </select>
          </div>
        )}

        {company && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Token</p>
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
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Dividends</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{companyDividends.length}</p>
            </div>
          </div>
        )}

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
                <th className="px-5 py-3 font-semibold text-gray-500">Merkle Root</th>
                <th className="px-5 py-3 font-semibold text-gray-500">TXID</th>
                <th className="px-5 py-3 font-semibold text-gray-500 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {companyDividends.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">{statusBadge(d.status)}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{d.announcementDate}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{d.recordDate}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{d.distributionDate} {d.distributionTime || ''}</td>
                  <td className="px-5 py-3 text-right"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">{d.rate}%</span></td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{d.merkleRoot ? d.merkleRoot.substring(0, 12) + '...' : '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs">
                    {d.txid && serverAvailable ? (
                      <a href={`https://chipnet.bchexplorer.info/tx/${d.txid}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{d.txid.substring(0, 12)}...</a>
                    ) : <span className="text-gray-400">{d.txid ? d.txid.substring(0, 12) + '...' : '—'}</span>}
                  </td>
                  <td className="px-5 py-3">
                    {d.merkleRoot && (
                      <button onClick={() => { setVerifyRound(d); setVerifyHolder(''); setVerifyResult(null); }}
                        className="px-3 py-1 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors">Verify</button>
                    )}
                  </td>
                </tr>
              ))}
              {companyDividends.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-400">No dividends declared yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {verifyRound && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setVerifyRound(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900">Merkle Proof Verification</h3>
              <p className="text-sm text-gray-500 mt-0.5">Round #{verifyRound.id} — {verifyRound.rate}% dividend</p>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Merkle Root</p>
                <p className="text-xs font-mono text-gray-700 break-all">{verifyRound.merkleRoot}</p>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Verify Holder</label>
                <div className="flex gap-2">
                  <select value={verifyHolder} onChange={(e) => setVerifyHolder(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                    <option value="">Select holder...</option>
                    {verifyRound.snapshot ? Object.keys(verifyRound.snapshot).map((label) => (<option key={label} value={label}>{label}</option>)) : null}
                  </select>
                  <button onClick={async () => { setVerifyLoading(true); try { setVerifyResult(await verifyDividend(verifyRound.id, verifyHolder)); } catch { setVerifyResult(null); } setVerifyLoading(false); }}
                    disabled={!verifyHolder || verifyLoading}
                    className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40">Verify</button>
                </div>
              </div>
              {verifyResult?.proof && (
                <div className="mt-4 space-y-3">
                  <div className={`p-3 rounded-lg text-sm font-semibold ${verifyResult.proof.verified ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {verifyResult.proof.verified ? 'VERIFIED' : 'FAILED'}
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    <p>Holder: <span className="font-medium">{verifyResult.proof.leaf.label}</span></p>
                    <p>Shares: <span className="font-medium">{verifyResult.proof.leaf.shares}</span></p>
                  </div>
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <button onClick={() => setVerifyRound(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
