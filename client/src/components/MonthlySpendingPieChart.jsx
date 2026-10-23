const MONTH_COLORS = [
  "#e50914",
  "#f5c518",
  "#3b82f6",
  "#a855f7",
  "#14b8a6",
  "#f97316",
];

export default function MonthlySpendingPieChart({ months, formatMoney }) {
  const total = months.reduce((sum, month) => sum + month.amount, 0);
  let offset = 0;

  return (
    <div className="grid gap-6 sm:grid-cols-[minmax(0,16rem)_1fr] sm:items-center">
      <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-full bg-slate-50 p-4 sm:h-64 sm:w-64">
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label="Monthly spending distribution for the last six months"
        >
          {total === 0 ? (
            <circle
              cx="50"
              cy="50"
              r="40"
              pathLength="100"
              fill="none"
              stroke="#404040"
              strokeWidth="20"
            />
          ) : (
            months.map((month, index) => {
              const percentage = (month.amount / total) * 100;
              const segment = (
                <circle
                  key={month.key}
                  cx="50"
                  cy="50"
                  r="40"
                  pathLength="100"
                  fill="none"
                  stroke={MONTH_COLORS[index]}
                  strokeDasharray={`${percentage} ${100 - percentage}`}
                  strokeDashoffset={-offset}
                  strokeWidth="20"
                  role="img"
                  aria-label={`${month.label}: ${formatMoney(month.amount)}`}
                >
                  <title>
                    {month.label}: {formatMoney(month.amount)}
                  </title>
                </circle>
              );
              offset += percentage;
              return segment;
            })
          )}
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:gap-2">
        {months.map((month, index) => (
          <div
            key={month.key}
            className="flex min-w-0 items-center gap-2 text-sm"
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: MONTH_COLORS[index] }}
            />
            <span className="min-w-0 truncate text-slate-500">
              {month.label}
            </span>
            <span className="ml-auto shrink-0 font-semibold text-slate-900">
              {formatMoney(month.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
