export default function DashboardStatCard({
  label,
  value,
  description,
  icon: Icon,
  loading,
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 text-xs font-medium leading-4 text-slate-500 sm:text-sm sm:leading-normal">
          {label}
        </span>
        <div className="hidden shrink-0 rounded-xl bg-emerald-50 p-2.5 text-emerald-700 sm:block">
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900 sm:mt-4 sm:text-3xl">
        {loading ? "—" : value}
      </p>
      <p className="mt-1 truncate text-[11px] text-slate-500 sm:text-xs">
        {description}
      </p>
    </div>
  );
}
