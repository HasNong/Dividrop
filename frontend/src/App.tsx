import { useEffect, useState, useCallback } from 'react';
import Header from './components/Header';
import CompanyView from './components/CompanyView';
import ShareholderView from './components/ShareholderView';
import RegistryPage from './pages/RegistryPage';
import LoginPage from './pages/LoginPage';
import { initServer, onServerStateChange, fetchState, declareDividend as apiAnnounce, executeDividend as apiExecute, initializeHoldings as apiInit } from './api';
import { mockCompanies, mockShareholders, mockDividends } from './data/mockData';
import type { Company, Shareholder, DividendRound } from './types';

interface AuthState {
  role: 'company' | 'shareholder' | 'public';
  companyId: string;
  holderIndex: number;
}

type ServerState = {
  companies: Company[];
  shareholders: Shareholder[];
  dividends: DividendRound[];
};

export default function App() {
  const [serverState, setServerState] = useState<ServerState | null>(null);
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(false);

  const data: ServerState = serverState ?? {
    companies: mockCompanies,
    shareholders: mockShareholders,
    dividends: mockDividends,
  };

  useEffect(() => {
    initServer().then((avail) => {
      if (avail) {
        fetchState().then((s) => setServerState(s));
        onServerStateChange((s) => setServerState(s));
      }
    });
  }, []);

  const handleLogin = useCallback((role: 'company' | 'shareholder' | 'public', companyId?: string, holderIndex?: number) => {
    setAuth({
      role,
      companyId: companyId ?? '',
      holderIndex: holderIndex ?? 0,
    });
  }, []);

  const handleLogout = useCallback(() => {
    setAuth(null);
  }, []);

  const handleAnnounce = useCallback(async (
    companyId: string, rate: number,
    announcementDate: string, recordDate: string, distributionDate: string, distributionTime?: string,
  ) => {
    setLoading(true);
    try {
      const result = await apiAnnounce(companyId, rate, announcementDate, recordDate, distributionDate, distributionTime);
      if (!result.success) alert(`Error: ${result.error}`);
    } catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setLoading(false); }
  }, []);

  const handleExecute = useCallback(async (roundId: number) => {
    setLoading(true);
    try {
      const result = await apiExecute(roundId);
      if (!result.success) alert(`Error: ${result.error}`);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInit = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const result = await apiInit(companyId);
      if (!result.success) alert(`Error: ${result.error}`);
      else alert(`Initial shares distributed!\nTxID: ${result.txid}`);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeCompany = useCallback((companyId: string) => {
    setAuth((prev) => prev ? { ...prev, companyId } : null);
  }, []);

  const handleChangeHolder = useCallback((index: number) => {
    setAuth((prev) => prev ? { ...prev, holderIndex: index } : null);
  }, []);

  if (!auth) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (auth.role === 'public') {
    return <RegistryPage companies={data.companies} dividends={data.dividends} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        role={auth.role}
        companyId={auth.companyId}
        onChangeCompany={handleChangeCompany}
        onLogout={handleLogout}
      />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {auth.role === 'company' ? (
          <CompanyView
            company={data.companies.find((c) => c.id === auth.companyId) ?? data.companies[0]}
            shareholders={data.shareholders}
            dividends={data.dividends.filter((d) => d.companyId === auth.companyId)}
            allCompanies={data.companies}
            onChangeCompany={handleChangeCompany}
            onAnnounce={async (rate, ann, rec, dist, time) => handleAnnounce(auth.companyId, rate, ann, rec, dist, time)}
            onExecute={handleExecute}
            onInit={handleInit}
            loading={loading}
          />
        ) : (
          <ShareholderView
            holder={data.shareholders[auth.holderIndex] ?? data.shareholders[0]}
            holders={data.shareholders}
            companies={data.companies}
            allDividends={data.dividends}
            selectedHolderIndex={auth.holderIndex}
            onChangeHolder={handleChangeHolder}
          />
        )}
      </main>
    </div>
  );
}
