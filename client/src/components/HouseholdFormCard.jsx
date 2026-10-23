export default function HouseholdFormCard({
  icon: Icon,
  iconClassName,
  title,
  description,
  label,
  inputId,
  value,
  onChange,
  placeholder,
  onSubmit,
  submitLabel,
  loading,
  inputProps = {},
  buttonClassName,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex gap-3">
        <div className={`rounded-xl p-3 ${iconClassName}`}>
          <Icon />
        </div>
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label htmlFor={inputId} className="block text-sm font-medium">
          {label}
        </label>
        <input
          id={inputId}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="min-h-12 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600"
          {...inputProps}
        />
        <button
          disabled={loading}
          className={`min-h-12 w-full rounded-xl px-4 py-3 font-semibold disabled:opacity-60 ${buttonClassName}`}
        >
          {loading ? "Please wait..." : submitLabel}
        </button>
      </form>
    </section>
  );
}
