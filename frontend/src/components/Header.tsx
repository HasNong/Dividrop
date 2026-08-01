import { mockCompanies } from '../data/mockData';

interface Props {
  role: 'company' | 'shareholder';
  companyId: string;
  onChangeCompany: (companyId: string) => void;
  onLogout: () => void;
}

export default function Header({ role, companyId, onChangeCompany, onLogout }: Props) {
  const company = mockCompanies.find((c) => c.id === companyId) ?? mockCompanies[0];

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-brand-200">
            D
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Dividrop</h1>
            <p className="text-xs text-gray-400">
              {role === 'company' ? `${company.name} (${company.symbol})` : 'Shareholder Portal'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <span className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              role === 'company' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}>
              Company
            </span>
            <span className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              role === 'shareholder' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}>
              Shareholder
            </span>
          </div>

          {role === 'company' && (
            <select
              value={companyId}
              onChange={(e) => onChangeCompany(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
            >
              {mockCompanies.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>
              ))}
            </select>
          )}

          <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Chipnet
          </span>

          <button
            onClick={onLogout}
            className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
