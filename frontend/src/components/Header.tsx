interface Props {
  role: 'company' | 'shareholder';
  fullName: string;
  onLogout: () => void;
}

export default function Header({ role, fullName, onLogout }: Props) {
  return (
    <header className="bg-[#2E4B2F] text-white sticky top-0 z-50">
      <div className="max-w-full px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center text-white font-bold text-lg">D</div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Dividrop</h1>
            <p className="text-xs text-white/60">{fullName} · {role === 'company' ? 'Company' : 'Shareholder'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />Chipnet
          </span>
          <button onClick={onLogout} className="px-3 py-1.5 text-sm font-semibold bg-white text-[#2E4B2F] hover:bg-gray-100 rounded-lg transition-all">Logout</button>
        </div>
      </div>
    </header>
  );
}
