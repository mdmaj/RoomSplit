import { Home } from "lucide-react";
import HouseholdCard from "./HouseholdCard.jsx";

export default function HouseholdList({ groups, user, onCopy }) {
  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <Home className="mx-auto text-slate-400" size={30} />
        <p className="mt-3 font-semibold">No households yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Create one or join using an invite code.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {groups.map((group) => (
        <HouseholdCard
          key={group._id}
          group={group}
          user={user}
          onCopy={onCopy}
        />
      ))}
    </div>
  );
}
