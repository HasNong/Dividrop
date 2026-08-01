import { mockCompanies, mockShareholders } from '../data/mockData';

interface Props {
  onLogin: (role: 'company' | 'shareholder' | 'public', companyId?: string, holderIndex?: number) => void;
}

export default function LoginPage({ onLogin }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full animate-fade-in-up">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-brand-600 rounded-3xl flex items-center justify-center text-white font-bold text-4xl mx-auto mb-5 shadow-lg shadow-brand-200">
            D
          </div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Dividrop</h1>
          <p className="text-gray-500 mt-2 text-lg">On-Chain Stock Dividends on Bitcoin Cash</p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Connected to Chipnet
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onLogin('company', mockCompanies[0]?.id)}
            className="bg-white rounded-2xl border border-gray-100 p-6 text-left hover:border-brand-300 hover:shadow-lg hover:shadow-brand-100 transition-all duration-200 group hover:-translate-y-0.5"
          >
            <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-100 transition-colors">
              <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="font-semibold text-gray-900 text-lg">Company</h2>
            <p className="text-sm text-gray-400 mt-1">Manage shares, declare dividends</p>
          </button>

          <button
            onClick={() => onLogin('shareholder', undefined, 0)}
            className="bg-white rounded-2xl border border-gray-100 p-6 text-left hover:border-brand-300 hover:shadow-lg hover:shadow-brand-100 transition-all duration-200 group hover:-translate-y-0.5"
          >
            <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-100 transition-colors">
              <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="font-semibold text-gray-900 text-lg">Shareholder</h2>
            <p className="text-sm text-gray-400 mt-1">View portfolio, verify dividends</p>
          </button>

          <button
            onClick={() => onLogin('public')}
            className="bg-white rounded-2xl border border-gray-100 p-6 text-left hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100 transition-all duration-200 group hover:-translate-y-0.5"
          >
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="font-semibold text-gray-900 text-lg">Public Registry</h2>
            <p className="text-sm text-gray-400 mt-1">Verify dividends, no login</p>
          </button>
        </div>

        <p className="text-center text-xs text-gray-300 mt-8">
          {mockCompanies.length} companies &middot; {mockShareholders.length} shareholders &middot; Bitcoin Cash Chipnet
        </p>
      </div>
    </div>
  );
}
