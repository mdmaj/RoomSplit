import { Copy, Home } from "lucide-react";

export default function HouseholdCard({ group, user, onCopy }) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="wrap-break-word font-bold">{group.name}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {group.members?.length ?? 0} members
          </p>
        </div>
        <Home className="text-emerald-700" />
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-3">
        <p className="text-xs text-slate-500">Invite code</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <code className="min-w-0 break-all font-bold tracking-wider">
            {group.inviteCode || "Not available"}
          </code>
          {group.inviteCode && (
            <button
              onClick={() => onCopy(group.inviteCode)}
              className="rounded-lg p-2 hover:bg-white"
              aria-label="Copy invite code"
            >
              <Copy size={16} />
            </button>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Created by{" "}
        {group.createdBy?.name ||
          (group.createdBy?._id === user?.id ? user?.name : "a group member")}
      </p>
    </article>
  );
}
