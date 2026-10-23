import { ArrowRight, Check, Copy, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { loadGroupDetailPage } from "../routeLoaders.js";

export default function GroupCard({ group, copiedCode, onCopy }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:border-emerald-200 hover:shadow-lg hover:shadow-slate-900/5 sm:hover:-translate-y-1">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 sm:h-12 sm:w-12">
              <Home size={23} />
            </div>

            <div className="min-w-0">
              <h4 className="wrap-break-word font-bold text-slate-900">
                {group.name}
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                {group.members?.length ?? 0}{" "}
                {(group.members?.length ?? 0) === 1 ? "member" : "members"}
              </p>
            </div>
          </div>

          {group.inviteCode && (
            <div className="flex min-w-0 shrink-0 items-start gap-2">
              <div className="min-w-0 text-right">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Invite code
                </p>
                <code className="block max-w-28 break-all text-xs font-bold tracking-wider text-slate-800">
                  {group.inviteCode}
                </code>
              </div>
              <button
                type="button"
                onClick={() => onCopy(group.inviteCode)}
                className="mt-1 shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                aria-label={`Copy invite code for ${group.name}`}
                title="Copy invite code"
              >
                {copiedCode === group.inviteCode ? (
                  <Check size={16} />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
        <Link
          to={`/groups/${group._id}`}
          state={{ group }}
          onMouseEnter={loadGroupDetailPage}
          onFocus={loadGroupDetailPage}
          className="flex min-h-8 items-center justify-between gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          <span>Open household</span>
          <ArrowRight size={17} className="shrink-0" />
        </Link>
      </div>
    </article>
  );
}
