import { useState } from 'react';
import React from 'react';
import type { Shareholder, Company, DividendRound } from '../types';
import { getDividendPaymentsForHolder, getAllDividendPaymentsForHolder } from '../utils';

interface Props {
  holder: Shareholder; companies: Company[]; allDividends: DividendRound[];
  tab: string;
}

export default function ShareholderView({ holder, companies, allDividends, tab }: Props) {
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const allPayments = getAllDividendPaymentsForHolder(holder, allDividends);
  const totalDividends = allPayments.reduce((s, p) => s + p.tokensReceived, 0);
  const companyCount = holder.holdings.length;

  const totalSharesPerCompany: Record<string, number> = {};
  for (const h of holder.holdings) {
    totalSharesPerCompany[h.companyId] = h.shares + getDividendPaymentsForHolder(holder, h.companyId, allDividends).reduce((s, p) => s + p.tokensReceived, 0);
  }
  const maxShares = holder.holdings.length > 0 ? Math.max(...Object.values(totalSharesPerCompany)) : 0;

  const StatsRow = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-[#2E4B2F]/10 rounded-xl border border-[#2E4B2F]/20 p-5"><p className="text-xs font-semibold text-[#2E4B2F] uppercase tracking-wide">Companies</p><p className="mt-1 text-3xl font-bold text-[#2E4B2F]">{companyCount}</p><p className="text-sm text-[#2E4B2F]/60">in your portfolio</p></div>
      <div className="bg-[#2E4B2F]/10 rounded-xl border border-[#2E4B2F]/20 p-5"><p className="text-xs font-semibold text-[#2E4B2F] uppercase tracking-wide">Total Shares</p><p className="mt-1 text-3xl font-bold text-[#2E4B2F]">{Object.values(totalSharesPerCompany).reduce((s, v) => s + v, 0).toLocaleString()}</p><p className="text-sm text-[#2E4B2F]/60">across all companies</p></div>
      <div className="bg-[#2E4B2F]/10 rounded-xl border border-[#2E4B2F]/20 p-5"><p className="text-xs font-semibold text-[#2E4B2F] uppercase tracking-wide">Total Dividends Received</p><p className="mt-1 text-3xl font-bold text-[#2E4B2F]">+{totalDividends.toLocaleString()}</p><p className="text-sm text-[#2E4B2F]/60">from {allPayments.length} distributions</p></div>
    </div>
  );

  if (tab === 'portfolio') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-[#2E4B2F]">Your Portfolio</h2></div>
        {holder.holdings.length === 0 ? (<p className="px-5 py-8 text-center text-gray-400 text-sm">No holdings in any company.</p>) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-brand-50/30 bg-[#2E4B2F]/10 text-left">
              <th className="px-5 py-3 font-semibold text-gray-800">Company</th><th className="px-5 py-3 font-semibold text-gray-800 text-right">Shares</th><th className="px-5 py-3 font-semibold text-gray-800 text-right">Ownership</th><th className="px-5 py-3 font-semibold text-gray-800 text-right">Dividends</th><th className="px-5 py-3 w-10"></th>
            </tr></thead>
            <tbody>{holder.holdings.map((h) => {
              const payments = getDividendPaymentsForHolder(holder, h.companyId, allDividends);
              const company = companies.find((c) => c.id === h.companyId);
              const cs = h.shares + payments.reduce((s, p) => s + p.tokensReceived, 0);
              const divTotal = payments.reduce((s, p) => s + p.tokensReceived, 0);
              const own = company ? ((cs / company.currentSupply) * 100).toFixed(2) : '0';
              const isHighest = cs === maxShares && maxShares > 0;
              const isOpen = expandedCompanyId === h.companyId;
              return (<React.Fragment key={h.companyId}>
                <tr className={`border-b border-gray-50 hover:bg-[#2E4B2F]/5 ${isHighest ? 'bg-[#2E4B2F]/10 border-l-4 border-l-brand-500' : ''}`}>
                  <td className="px-5 py-3 font-medium text-[#2E4B2F]"><span className="mr-2 px-1.5 py-0.5 rounded text-xs font-bold bg-[#2E4B2F] text-white">{h.symbol}</span>{h.companyName}{isHighest && <span className="ml-1 text-brand-500" title="Highest holding">✦</span>}</td>
                  <td className="px-5 py-3 text-right font-mono text-[#2E4B2F]">{cs.toLocaleString()}</td><td className="px-5 py-3 text-right text-gray-600">{own}%</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-brand-600">+{divTotal}</td>
                  <td className="px-5 py-3 text-right"><button onClick={() => setExpandedCompanyId(isOpen ? null : h.companyId)} className="p-1 rounded hover:bg-gray-100"><svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button></td>
                </tr>
                {isOpen && (<tr><td colSpan={5} className="px-5 py-3 bg-[#2E4B2F]/10">
                  <p className="text-sm font-semibold text-[#2E4B2F] mb-2">{company?.name ?? h.companyId} — Dividend History</p>
                  {payments.length === 0 ? <p className="text-sm text-gray-400">No dividends received yet.</p> : (
                    <table className="w-full text-sm"><thead><tr className="border-b border-gray-200 bg-white text-left"><th className="px-3 py-2 font-semibold text-gray-800">Status</th><th className="px-3 py-2 font-semibold text-gray-800">Date</th><th className="px-3 py-2 font-semibold text-gray-800 text-right">Rate</th><th className="px-3 py-2 font-semibold text-gray-800 text-right">Tokens</th></tr></thead>
                      <tbody>{payments.map((p) => { const round = allDividends.find((d) => d.id === p.roundId); const sc = round?.status ?? 'distributed'; const cc: Record<string,string>={announced:'bg-amber-50 text-amber-700',recorded:'bg-blue-50 text-blue-700',distributed:'bg-emerald-50 text-emerald-700'};
                        return (<tr key={p.roundId} className="border-b border-gray-100 bg-white"><td className="px-3 py-2"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cc[sc]??''}`}>{sc}</span></td><td className="px-3 py-2 font-medium">{p.date}</td><td className="px-3 py-2 text-right"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">{p.rate}%</span></td><td className="px-3 py-2 text-right font-mono text-brand-600">+{p.tokensReceived}</td></tr>); })}</tbody></table>)}
                </td></tr>)}
              </React.Fragment>);
            })}</tbody>
          </table>
        )}
      </div>
    );
  }

  if (tab === 'activity') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-[#2E4B2F]">Dividend Activity</h2></div>
        {allPayments.length === 0 ? (<p className="px-5 py-8 text-center text-gray-400 text-sm">No dividend payments received yet.</p>) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-brand-50/30 bg-[#2E4B2F]/10 text-left"><th className="px-5 py-3 font-semibold text-gray-800">Date</th><th className="px-5 py-3 font-semibold text-gray-800">Company</th><th className="px-5 py-3 font-semibold text-gray-800 text-right">Rate</th><th className="px-5 py-3 font-semibold text-gray-800 text-right">Tokens</th><th className="px-5 py-3 font-semibold text-gray-800 text-right">New Total</th></tr></thead>
            <tbody>{[...allPayments].sort((a, b) => b.date.localeCompare(a.date)).map((p) => (<tr key={`${p.roundId}-${p.companyId}`} className="border-b border-gray-50"><td className="px-5 py-3 font-medium text-[#2E4B2F]">{p.date}</td><td className="px-5 py-3"><span className="px-1.5 py-0.5 rounded text-xs font-bold bg-[#2E4B2F] text-white">{p.symbol}</span> {p.companyName}</td><td className="px-5 py-3 text-right"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">{p.rate}%</span></td><td className="px-5 py-3 text-right font-mono font-semibold text-brand-600">+{p.tokensReceived}</td><td className="px-5 py-3 text-right font-mono text-[#2E4B2F]">{p.sharesAfter}</td></tr>))}</tbody>
          </table>
        )}
      </div>
    );
  }

  if (tab === 'settings') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-[#2E4B2F] text-lg mb-6">Account Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#2E4B2F]/10 rounded-lg"><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Holder</p><p className="text-lg font-bold text-[#2E4B2F]">{holder.label}</p><p className="text-sm text-gray-800 mt-1">Tier: {holder.tier}</p></div>
          <div className="p-4 bg-[#2E4B2F]/10 rounded-lg"><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Address</p><p className="text-sm font-mono text-gray-700 break-all">{holder.address}</p></div>
          <div className="p-4 bg-[#2E4B2F]/10 rounded-lg"><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Companies</p><p className="text-lg font-bold text-[#2E4B2F]">{companyCount}</p><p className="text-sm text-gray-800 mt-1">{holder.holdings.map(h => h.symbol).join(', ')}</p></div>
          <div className="p-4 bg-[#2E4B2F]/10 rounded-lg"><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Total Shares</p><p className="text-lg font-bold text-[#2E4B2F]">{Object.values(totalSharesPerCompany).reduce((s, v) => s + v, 0).toLocaleString()}</p></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <StatsRow />
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-[#2E4B2F]">Your Portfolio</h2></div>
        {holder.holdings.length === 0 ? (<p className="px-5 py-8 text-center text-gray-400 text-sm">No holdings in any company.</p>) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-brand-50/30 bg-[#2E4B2F]/10 text-left"><th className="px-5 py-3 font-semibold text-gray-800">Company</th><th className="px-5 py-3 font-semibold text-gray-800 text-right">Shares</th><th className="px-5 py-3 font-semibold text-gray-800 text-right">Ownership</th><th className="px-5 py-3 font-semibold text-gray-800 text-right">Dividends</th></tr></thead>
            <tbody>{holder.holdings.map((h) => {
              const payments = getDividendPaymentsForHolder(holder, h.companyId, allDividends);
              const company = companies.find((c) => c.id === h.companyId);
              const cs = h.shares + payments.reduce((s, p) => s + p.tokensReceived, 0);
              const divTotal = payments.reduce((s, p) => s + p.tokensReceived, 0);
              const own = company ? ((cs / company.currentSupply) * 100).toFixed(2) : '0';
              const isHighest = cs === maxShares && maxShares > 0;
              return (<tr key={h.companyId} className={`border-b border-gray-50 hover:bg-[#2E4B2F]/5 ${isHighest ? 'bg-[#2E4B2F]/10 border-l-4 border-l-brand-500' : ''}`}><td className="px-5 py-3 font-medium text-[#2E4B2F]"><span className="mr-2 px-1.5 py-0.5 rounded text-xs font-bold bg-[#2E4B2F] text-white">{h.symbol}</span>{h.companyName}{isHighest && <span className="ml-1 text-brand-500" title="Highest holding">✦</span>}</td><td className="px-5 py-3 text-right font-mono text-[#2E4B2F]">{cs.toLocaleString()}</td><td className="px-5 py-3 text-right text-gray-600">{own}%</td><td className="px-5 py-3 text-right font-mono font-semibold text-brand-600">+{divTotal}</td></tr>);
            })}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
