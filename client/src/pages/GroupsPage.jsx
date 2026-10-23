
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Users } from "lucide-react";
import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { loadDashboardPage } from "../routeLoaders.js";
import HouseholdFormCard from "../components/HouseholdFormCard.jsx";
import HouseholdList from "../components/HouseholdList.jsx";

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadGroups() {
    const response = await api.get("/groups");
    const data = response.data;
    setGroups(Array.isArray(data.groups) ? data.groups : Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    // The async request updates local state when the external data arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGroups().catch((err) => {
      setError(err.response?.data?.message || "Could not load groups.");
    });
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await api.post("/groups", { name: groupName.trim() });
      setGroupName("");
      setMessage("Household created successfully!");
      await loadGroups();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create household.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await api.post("/groups/join", { inviteCode: inviteCode.trim().toUpperCase() });
      setInviteCode("");
      setMessage("You joined the household successfully!");
      await loadGroups();
    } catch (err) {
      setError(err.response?.data?.message || "Could not join household.");
    } finally {
      setLoading(false);
    }
  }

  async function copyInvite(code) {
    try {
      await navigator.clipboard.writeText(code);
      setMessage("Invite code copied!");
    } catch {
      setError("Copy failed. Please select and copy the code manually.");
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-3 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/dashboard"
          onMouseEnter={loadDashboardPage}
          onFocus={loadDashboardPage}
          className="mb-5 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-700 sm:mb-6"
        >
          <ArrowLeft size={17} /> Back to dashboard
        </Link>

        <div className="mb-6 sm:mb-8">
          <p className="text-sm font-medium text-emerald-700">RoomSplit workspace</p>
          <h1 className="mt-2 wrap-break-word text-2xl font-bold tracking-tight sm:text-3xl">Your households</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
            Create a shared space or join one with an invite code.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          <HouseholdFormCard
            icon={Plus}
            iconClassName="bg-emerald-50 text-emerald-700"
            title="Create household"
            description="Start a group for your roommates."
            label="Household name"
            inputId="groupName"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="e.g. Noida Apartment"
            onSubmit={handleCreate}
            submitLabel="Create household"
            loading={loading}
            inputProps={{ required: true, minLength: 2, maxLength: 80 }}
            buttonClassName="bg-emerald-600 text-white hover:bg-emerald-700"
          />
          <HouseholdFormCard
            icon={Users}
            iconClassName="bg-blue-50 text-blue-700"
            title="Join household"
            description="Use the code shared by a roommate."
            label="Invite code"
            inputId="inviteCode"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            placeholder="Enter invite code"
            onSubmit={handleJoin}
            submitLabel="Join household"
            loading={loading}
            inputProps={{ required: true, maxLength: 30 }}
            buttonClassName="border border-slate-200 bg-white hover:bg-slate-50"
          />
        </div>

        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-bold">Your groups ({groups.length})</h2>

          <HouseholdList groups={groups} user={user} onCopy={copyInvite} />
        </section>
      </div>
    </main>
  );
}