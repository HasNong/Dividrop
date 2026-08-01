import { mockCompanies } from '../data/mockData';

interface Props {
  role: 'company' | 'shareholder';
  companyId: string;
  serverAvailable: boolean;
  onChangeCompany: (companyId: string) => void;
  onLogout: () => void;
}

export default function Header({ role, companyId, serverAvailable, onChangeCompany, onLogout }: Props) {
  const company = mockCompanies.find((c) => c.id === companyId) ?? mockCompanies[0];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            S
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Stock Dividends</h1>
            <p className="text-xs text-gray-500">
              {role === 'company' ? `${company.name} (${company.symbol})` : 'Shareholder Portal'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <span className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              role === 'company' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}>
              {role === 'company' ? 'Company' : 'Shareholder'}
            </span>
          </div>

          {role === 'company' && (
            <select
              value={companyId}
              onChange={(e) => onChangeCompany(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            >
              {mockCompanies.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>
              ))}
            </select>
          )}

          <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
            serverAvailable ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${serverAvailable ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
            {serverAvailable ? 'Live Server' : 'Standalone'}
          </span>

          <button
            onClick={onLogout}
            className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
