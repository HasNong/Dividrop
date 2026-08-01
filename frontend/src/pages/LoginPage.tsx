import { mockCompanies, mockShareholders } from '../data/mockData';

interface Props {
  onLogin: (role: 'company' | 'shareholder' | 'public', companyId?: string, holderIndex?: number) => void;
  serverAvailable: boolean;
}

export default function LoginPage({ onLogin, serverAvailable }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4">
            S
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Dividends</h1>
          <p className="text-gray-500 mt-1">Tokenized Ownership on Bitcoin Cash</p>
          {serverAvailable && (
            <p className="text-xs text-emerald-600 mt-2 font-medium">
              Connected to shared server
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              const first = mockCompanies[0];
              onLogin('company', first.id);
            }}
            className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:border-brand-300 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-brand-200 transition-colors">
              <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="font-semibold text-gray-900">I am a Company</h2>
            <p className="text-sm text-gray-500 mt-1">Manage shares and declare dividends</p>
          </button>

          <button
            onClick={() => onLogin('shareholder', undefined, 0)}
            className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:border-brand-300 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-brand-200 transition-colors">
              <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="font-semibold text-gray-900">I am a Shareholder</h2>
            <p className="text-sm text-gray-500 mt-1">View portfolio and dividend history</p>
          </button>

          <button
            onClick={() => onLogin('public')}
            className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:border-emerald-300 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-emerald-200 transition-colors">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="font-semibold text-gray-900">Public Registry</h2>
            <p className="text-sm text-gray-500 mt-1">Verify dividends without logging in</p>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {mockCompanies.length} companies available &middot; {mockShareholders.length} shareholders registered
        </p>
      </div>
    </div>
  );
}
