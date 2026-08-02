import { useState } from 'react';
import { mockCompanies } from '../data/mockData';
import { loginUser, registerUser } from '../api';

interface Props {
  onLogin: (user: any) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [tab, setTab] = useState<'company' | 'shareholder'>('company');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyId, setCompanyId] = useState(mockCompanies[0]?.id ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!username || !password) { setError('Username and password required'); return; }
    if (mode === 'register' && !fullName) { setError('Full name required'); return; }
    setLoading(true);
    try {
      let result;
      if (mode === 'login') {
        result = await loginUser(username, password);
      } else {
        result = await registerUser(tab, username, fullName, password, tab === 'company' ? companyId : undefined);
      }
      if (result.success) { onLogin(result.user); }
      else { setError(result.error); }
    } catch { setError('Connection failed'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4">D</div>
          <h1 className="text-2xl font-bold text-gray-900">Dividrop</h1>
          <p className="text-gray-500 mt-1">On-Chain Stock Dividends</p>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          <button onClick={() => setMode('login')} className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'login' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>Login</button>
          <button onClick={() => setMode('register')} className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'register' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>Register</button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex bg-gray-100 rounded-lg p-0.5 mb-6">
            <button onClick={() => setTab('company')} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === 'company' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Company</button>
            <button onClick={() => setTab('shareholder')} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === 'shareholder' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Shareholder</button>
          </div>

          <div className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={tab === 'company' ? 'e.g., ACME Corp' : 'e.g., Alice CEO'}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={tab === 'company' ? 'acme' : 'alice'}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={tab === 'company' ? 'acme2026' : 'alice2026'}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
            </div>
            {tab === 'company' && mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white">
                  {mockCompanies.map((c) => (<option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>))}
                </select>
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}

            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-40 transition-all">
              {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
            </button>
          </div>

          {mode === 'login' && (
            <p className="text-xs text-gray-400 mt-4 text-center">
              Demo accounts: alice / alice2026 or acme / acme2026
            </p>
          )}
        </div>

        <button onClick={() => onLogin({ role: 'public', fullName: 'Public' })}
          className="w-full mt-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-emerald-300 hover:text-emerald-700 transition-all">
          Public Registry — No login required
        </button>
      </div>
    </div>
  );
}
