
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Home, Plus, Users } from "lucide-react";
import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [mode, setMode] = useState("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadGroups() {
    const response = await api.get("/groups");
    const data = response.data;
    setGroups(Array.isArray(data.groups) ? data.groups : Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadGroups().catch((err) => {
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
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-700">
          <ArrowLeft size={17} /> Back to dashboard
        </Link>

        <div className="mb-8">
          <p className="text-sm font-medium text-emerald-700">RoomSplit workspace</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Your households</h1>
          <p className="mt-2 text-slate-500">
            Create a shared space or join one with an invite code.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex gap-3">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><Plus /></div>
              <div>
                <h2 className="font-bold">Create household</h2>
                <p className="mt-1 text-sm text-slate-500">Start a group for your roommates.</p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <label htmlFor="groupName" className="block text-sm font-medium">Household name</label>
              <input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                minLength={2}
                maxLength={80}
                placeholder="e.g. Noida Apartment"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600"
              />
              <button disabled={loading} className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {loading ? "Please wait..." : "Create household"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700"><Users /></div>
              <div>
                <h2 className="font-bold">Join household</h2>
                <p className="mt-1 text-sm text-slate-500">Use the code shared by a roommate.</p>
              </div>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <label htmlFor="inviteCode" className="block text-sm font-medium">Invite code</label>
              <input
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                maxLength={30}
                placeholder="Enter invite code"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 uppercase outline-none focus:border-emerald-600"
              />
              <button disabled={loading} className="w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold hover:bg-slate-50 disabled:opacity-60">
                {loading ? "Please wait..." : "Join household"}
              </button>
            </form>
          </section>
        </div>

        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-bold">Your groups ({groups.length})</h2>

          {groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <Home className="mx-auto text-slate-400" size={30} />
              <p className="mt-3 font-semibold">No households yet</p>
              <p className="mt-1 text-sm text-slate-500">Create one or join using an invite code.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map((group) => (
                <article key={group._id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{group.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {group.members?.length ?? 0} members
                      </p>
                    </div>
                    <Home className="text-emerald-700" />
                  </div>

                  <div className="mt-5 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Invite code</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <code className="font-bold tracking-wider">{group.inviteCode || "Not available"}</code>
                      {group.inviteCode && (
                        <button onClick={() => copyInvite(group.inviteCode)} className="rounded-lg p-2 hover:bg-white" aria-label="Copy invite code">
                          <Copy size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    Created by {group.createdBy?.name || (group.createdBy?._id === user?.id ? user?.name : "a group member")}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}