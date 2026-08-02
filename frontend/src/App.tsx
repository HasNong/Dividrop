import { useEffect, useState, useCallback } from 'react';
import Header from './components/Header';
import CompanyView from './components/CompanyView';
import CompanySidebar from './components/CompanySidebar';
import ShareholderSidebar from './components/ShareholderSidebar';
import ShareholderView from './components/ShareholderView';
import RegistryPage from './pages/RegistryPage';
import LoginPage from './pages/LoginPage';
import { initServer, onServerStateChange, fetchState, declareDividend as apiAnnounce, executeDividend as apiExecute, initializeHoldings as apiInit } from './api';
import { mockCompanies, mockShareholders, mockDividends } from './data/mockData';
import type { Company, Shareholder, DividendRound } from './types';

interface AuthState {
  role: 'company' | 'shareholder' | 'public';
  companyId: string;
  fullName: string;
}

type ServerState = { companies: Company[]; shareholders: Shareholder[]; dividends: DividendRound[] };

export default function App() {
  const [serverAvailable, setServerAvailable] = useState(false);
  const [serverState, setServerState] = useState<ServerState | null>(null);
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(false);
  const [companyTab, setCompanyTab] = useState('dashboard');
  const [shareholderTab, setShareholderTab] = useState('dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const data: ServerState = serverState ?? { companies: mockCompanies, shareholders: mockShareholders, dividends: mockDividends };

  useEffect(() => {
    initServer().then((avail) => { setServerAvailable(avail); if (avail) { fetchState().then((s) => setServerState(s)); onServerStateChange((s) => setServerState(s)); } });
  }, []);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 6000); return () => clearTimeout(t); }
  }, [toast]);

  const handleLogin = useCallback((user: any) => {
    if (!user) { setAuth(null); return; }
    if (user.role === 'public') { setAuth({ role: 'public', companyId: '', fullName: user.fullName }); return; }
    setAuth({ role: user.role, companyId: user.companyId || mockCompanies[0]?.id || '', fullName: user.fullName });
  }, []);

  const handleLogout = useCallback(() => { setAuth(null); }, []);

  const handleAnnounce = useCallback(async (companyId: string, rate: number, ann: string, rec: string, dist: string, time?: string) => {
    setLoading(true);
    try {
      const r = await apiAnnounce(companyId, rate, ann, rec, dist, time);
      console.log('[Announce] result:', r);
      if (!r.success) setToast({ message: r.error, type: 'error' });
      else { setToast({ message: `Dividend announced — ${rate}% on ${dist}`, type: 'success' }); fetchState().then((s) => setServerState(s)); }
    } catch (e: any) { setToast({ message: e.message, type: 'error' }); }
    finally { setLoading(false); }
  }, []);

  const handleExecute = useCallback(async (roundId: number) => {
    setLoading(true); try { const r = await apiExecute(roundId); if (!r.success) setToast({ message: r.error, type: 'error' }); else { setToast({ message: `Distribution executed — tx on chain`, type: 'success' }); fetchState().then((s) => setServerState(s)); } } catch (e: any) { setToast({ message: e.message, type: 'error' }); } finally { setLoading(false); }
  }, []);

  const handleInit = useCallback(async (companyId: string) => {
    setLoading(true); try { const r = await apiInit(companyId); if (!r.success) setToast({ message: r.error, type: 'error' }); else { setToast({ message: `Shares distributed to all holders`, type: 'success' }); fetchState().then((s) => setServerState(s)); } } catch (e: any) { setToast({ message: e.message, type: 'error' }); } finally { setLoading(false); }
  }, []);

  // find holder index by label for shareholder view
  const holderIndex = auth && auth.role === 'shareholder'
    ? data.shareholders.findIndex((s) => s.label === auth.fullName)
    : 0;

  if (!auth) return <LoginPage onLogin={handleLogin} />;
  if (auth.role === 'public') return <RegistryPage companies={data.companies} dividends={data.dividends} serverAvailable={serverAvailable} onLogout={handleLogout} />;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F0E8' }}>
      {toast && (
        <div
          className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold max-w-md flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
          style={{ animation: 'slideDown 0.3s ease-out' }}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-white/70 hover:text-white text-lg leading-none">&times;</button>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <Header role={auth.role} fullName={auth.fullName} onLogout={handleLogout} />
      <main className="flex-1">
        {auth.role === 'company' ? (
          <div className="flex min-h-[calc(100vh-4rem)]">
            <CompanySidebar tab={companyTab} onTabChange={setCompanyTab} companyId={auth.companyId} onInit={handleInit} loading={loading} />
            <div className="flex-1 min-w-0">
              <div className="p-6">
                <CompanyView
                  company={data.companies.find((c) => c.id === auth.companyId) ?? data.companies[0]}
                  shareholders={data.shareholders}
                  dividends={data.dividends.filter((d) => d.companyId === auth.companyId)}
                  onAnnounce={async (rate, ann, rec, dist, time) => handleAnnounce(auth.companyId, rate, ann, rec, dist, time)}
                  onExecute={handleExecute} onInit={handleInit} loading={loading} tab={companyTab}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[calc(100vh-4rem)]">
            <ShareholderSidebar tab={shareholderTab} onTabChange={setShareholderTab} />
            <div className="flex-1 min-w-0">
              <div className="p-6">
                <ShareholderView
                  holder={data.shareholders[holderIndex] ?? data.shareholders[0]}
                  companies={data.companies} allDividends={data.dividends}
                  tab={shareholderTab}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
