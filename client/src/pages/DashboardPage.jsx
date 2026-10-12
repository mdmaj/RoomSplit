import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Copy,
  Home,
  LogOut,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  const loadGroups = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/groups");

      const groupList = Array.isArray(response.data.groups)
        ? response.data.groups
        : Array.isArray(response.data)
          ? response.data
          : [];

      setGroups(groupList);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load your groups. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  async function handleCreateGroup(event) {
    event.preventDefault();

    const trimmedName = groupName.trim();

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setError("Group name must be between 2 and 80 characters.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      await api.post("/groups", { name: trimmedName });

      setGroupName("");
      setMessage("Group created successfully!");

      await loadGroups();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create the group.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoinGroup(event) {
    event.preventDefault();

    const code = inviteCode.trim().toUpperCase();

    if (!code) {
      setError("Please enter an invite code.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      await api.post("/groups/join", { inviteCode: code });

      setInviteCode("");
      setMessage("You joined the group successfully!");

      await loadGroups();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to join the group.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyCode(code) {
    setError("");
    setMessage("");

    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setMessage("Invite code copied to clipboard!");
    } catch {
      setError(
        `Unable to copy automatically. Please copy this code manually: ${code}`,
      );
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setError("Unable to sign out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
              <Wallet size={22} />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                RoomSplit
              </h1>
              <p className="text-xs text-slate-500">
                Shared living, simplified
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {user?.name || "Roommate"}
              </p>
              <p className="text-xs text-slate-500">{user?.email || ""}</p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
            >
              <LogOut size={17} />
              <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 px-6 py-8 text-white shadow-lg shadow-emerald-900/10 sm:px-9 sm:py-10">
          <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-24 right-28 h-48 w-48 rounded-full bg-white/5" />
          <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-emerald-50">
                <Sparkles size={14} /> YOUR SHARED HOME HUB
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : " back"}!
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50 sm:text-base">
                Keep household expenses organized, bring your roommates
                together, and make shared living a little simpler.
              </p>
            </div>
            <a
              href="#create-group"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-white/30"
            >
              <Plus size={18} /> Create a group
            </a>
          </div>
        </section>

        {(error || message) && (
          <div
            role={error ? "alert" : "status"}
            className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {error ? (
              <span className="font-bold">!</span>
            ) : (
              <Check size={18} className="shrink-0" />
            )}

            <p>{error || message}</p>
          </div>
        )}

        <section
          aria-label="Dashboard overview"
          className="mb-8 grid gap-4 sm:grid-cols-3"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                Your groups
              </span>
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                <Home size={20} />
              </div>
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900">
              {loading ? "—" : groups.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Households you belong to
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                Roommate memberships
              </span>
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                <Users size={20} />
              </div>
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900">
              {loading
                ? "—"
                : groups.reduce(
                    (total, group) =>
                      total +
                      (Array.isArray(group.members) ? group.members.length : 0),
                    0,
                  )}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Total memberships across your households
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                Ready when you are
              </span>
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                <Plus size={20} />
              </div>
            </div>
            <p className="mt-4 text-lg font-bold text-slate-900">
              Share expenses
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {groups.length > 0
                ? "Open a household to add expenses and manage balances."
                : "Create or join a household to get started."}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <form
            id="create-group"
            onSubmit={handleCreateGroup}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md sm:p-7"
          >
            <div className="mb-6 flex items-start gap-4">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                <Plus size={23} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Create a group
                </h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Set up a household and invite everyone sharing expenses.
                </p>
              </div>
            </div>

            <label
              className="mb-2 block text-sm font-semibold text-slate-700"
              htmlFor="group-name"
            >
              Group name
            </label>

            <input
              id="group-name"
              name="groupName"
              type="text"
              autoComplete="off"
              required
              minLength={2}
              maxLength={80}
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="e.g. Noida Apartment"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50"
            />

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={17} />
              {submitting ? "Please wait..." : "Create group"}
            </button>
          </form>

          <form
            onSubmit={handleJoinGroup}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md sm:p-7"
          >
            <div className="mb-6 flex items-start gap-4">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                <Users size={23} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Join a group
                </h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Enter an invite code from a roommate to join their household.
                </p>
              </div>
            </div>

            <label
              className="mb-2 block text-sm font-semibold text-slate-700"
              htmlFor="invite-code"
            >
              Invite code
            </label>

            <input
              id="invite-code"
              name="inviteCode"
              type="text"
              autoComplete="off"
              required
              maxLength={30}
              value={inviteCode}
              onChange={(event) =>
                setInviteCode(event.target.value.toUpperCase())
              }
              placeholder="e.g. A1B2C3D4"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 uppercase tracking-wider outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50"
            />

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Users size={17} />
              {submitting ? "Please wait..." : "Join group"}
            </button>
          </form>
        </section>

        <section className="mt-10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Your households
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Groups where you can manage shared expenses.
              </p>
            </div>

            <button
              type="button"
              onClick={loadGroups}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              {loading ? "Refreshing..." : "Refresh groups"}
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <RefreshCw
                size={22}
                className="mx-auto animate-spin text-emerald-600"
              />
              <p className="mt-3 text-sm text-slate-500">
                Loading your households...
              </p>
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Home size={27} />
              </div>

              <h4 className="mt-4 font-bold text-slate-900">
                No households yet
              </h4>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Create your first group or join an existing household with an
                invite code. Your groups will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {groups.map((group) => (
                <article
                  key={group._id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-slate-900/5"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                          <Home size={23} />
                        </div>

                        <div className="min-w-0">
                          <h4 className="truncate font-bold text-slate-900">
                            {group.name}
                          </h4>
                          <p className="mt-1 text-sm text-slate-500">
                            {group.members?.length ?? 0}{" "}
                            {(group.members?.length ?? 0) === 1
                              ? "member"
                              : "members"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {group.inviteCode && (
                      <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500">
                          Invite code
                        </p>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <code className="break-all text-sm font-bold tracking-wider text-slate-800">
                            {group.inviteCode}
                          </code>

                          <button
                            type="button"
                            onClick={() => handleCopyCode(group.inviteCode)}
                            className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
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
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 px-5 py-3">
                    <Link
                      to={`/groups/${group._id}`}
                      className="flex items-center justify-between text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      Open household
                      <ArrowRight size={17} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-400">
          <span className="font-semibold text-slate-500">RoomSplit</span> ·
          Shared expenses, made simple.
        </footer>
      </div>
    </main>
  );
}
