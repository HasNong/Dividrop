interface Crumb { label: string; onClick?: () => void }

interface Props { crumbs: Crumb[] }

export default function Breadcrumbs({ crumbs }: Props) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-400 border-b border-gray-100 bg-white">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {c.onClick ? (
            <button onClick={c.onClick} className="hover:text-brand-600 hover:underline transition-colors">
              {c.label}
            </button>
          ) : (
            <span className={i === crumbs.length - 1 ? 'text-gray-700 font-medium' : ''}>{c.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
