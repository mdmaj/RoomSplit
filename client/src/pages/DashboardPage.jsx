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
    // The async request updates local state when the external data arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGroups();
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
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
          <Link
            to="/dashboard"
            className="flex min-w-0 items-center gap-2.5 sm:gap-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm sm:h-11 sm:w-11 sm:rounded-2xl">
              <Wallet size={21} />
            </div>

            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                RoomSplit
              </h1>
              <p className="hidden text-xs text-slate-500 xs:block sm:block">
                Shared living, simplified
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden max-w-48 text-right sm:block">
              <p className="truncate text-sm font-semibold text-slate-800">
                {user?.name || "Roommate"}
              </p>
              <p className="truncate text-xs text-slate-500">
                {user?.email || ""}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60 sm:gap-2 sm:px-3 sm:text-sm"
            >
              <LogOut size={16} />
              <span className="max-w-24 truncate sm:max-w-none">
                {loggingOut ? "Signing out..." : "Sign out"}
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-6 sm:py-8 lg:py-10">
        <section className="relative mb-6 overflow-hidden rounded-2xl bg-linear-to-br from-emerald-700 via-emerald-600 to-teal-600 px-5 py-7 text-white shadow-lg shadow-emerald-900/10 sm:mb-8 sm:rounded-3xl sm:px-9 sm:py-10">
          <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full border-20 border-white/10 sm:h-56 sm:w-56 sm:border-28" />
          <div className="pointer-events-none absolute -bottom-24 right-8 h-40 w-40 rounded-full bg-white/5 sm:right-28 sm:h-48 sm:w-48" />
          <div className="relative z-10 flex flex-col justify-between gap-5 sm:gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-emerald-50 sm:text-xs">
                <Sparkles size={14} className="shrink-0" />
                <span>YOUR SHARED HOME HUB</span>
              </div>
              <h2 className="wrap-break-word text-2xl font-bold tracking-tight sm:text-4xl">
                Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : " back"}!
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50 sm:text-base">
                Keep household expenses organized, bring your roommates
                together, and make shared living a little simpler.
              </p>
            </div>
            <a
              href="#create-group"
              className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-white/30 sm:w-auto"
            >
              <Plus size={18} /> Create a group
            </a>
          </div>
        </section>

        {(error || message) && (
          <div
            role={error ? "alert" : "status"}
            className={`mb-5 flex min-w-0 items-start gap-3 rounded-xl border p-3 text-sm sm:mb-6 sm:p-4 ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {error ? (
              <span className="shrink-0 font-bold">!</span>
            ) : (
              <Check size={18} className="shrink-0" />
            )}
            <p className="min-w-0 wrap-break-word">{error || message}</p>
          </div>
        )}

        <section
          aria-label="Dashboard overview"
          className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 lg:grid-cols-3"
        >
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 text-xs font-medium leading-4 text-slate-500 sm:text-sm sm:leading-normal">
                Your groups
              </span>
              <div className="hidden shrink-0 rounded-xl bg-emerald-50 p-2.5 text-emerald-700 sm:block">
                <Home size={20} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 sm:mt-4 sm:text-3xl">
              {loading ? "—" : groups.length}
            </p>
            <p className="mt-1 truncate text-[11px] text-slate-500 sm:text-xs">
              Households you belong to
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 text-xs font-medium leading-4 text-slate-500 sm:text-sm sm:leading-normal">
                Roommate memberships
              </span>
              <div className="hidden shrink-0 rounded-xl bg-blue-50 p-2.5 text-blue-700 sm:block">
                <Users size={20} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 sm:mt-4 sm:text-3xl">
              {loading
                ? "—"
                : groups.reduce(
                    (total, group) =>
                      total +
                      (Array.isArray(group.members) ? group.members.length : 0),
                    0,
                  )}
            </p>
            <p className="mt-1 truncate text-[11px] text-slate-500 sm:text-xs">
              Total memberships across your households
            </p>
          </div>

        </section>

        <section className="mt-8 sm:mt-10">
          <div className="mb-4 flex flex-col items-stretch justify-between gap-3 sm:mb-5 sm:flex-row sm:items-center">
            <div className="min-w-0">
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
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              {loading ? "Refreshing..." : "Refresh groups"}
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
              <RefreshCw
                size={22}
                className="mx-auto animate-spin text-emerald-600"
              />
              <p className="mt-3 text-sm text-slate-500">
                Loading your households...
              </p>
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center shadow-sm sm:px-6 sm:py-12">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {groups.map((group) => (
                <article
                  key={group._id}
                  className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:border-emerald-200 hover:shadow-lg hover:shadow-slate-900/5 sm:hover:-translate-y-1"
                >
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

                        <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
                          <code className="min-w-0 break-all text-sm font-bold tracking-wider text-slate-800">
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

                  <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
                    <Link
                      to={`/groups/${group._id}`}
                      className="flex min-h-8 items-center justify-between gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      <span>Open household</span>
                      <ArrowRight size={17} className="shrink-0" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>


        <section className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          <form
            id="create-group"
            onSubmit={handleCreateGroup}
            className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-7"
          >
            <div className="mb-5 flex items-start gap-3 sm:mb-6 sm:gap-4">
              <div className="shrink-0 rounded-xl bg-emerald-50 p-2.5 text-emerald-700 sm:rounded-2xl sm:p-3">
                <Plus size={23} />
              </div>

              <div className="min-w-0">
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
              className="min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50"
            />

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Plus size={17} />
              {submitting ? "Please wait..." : "Create group"}
            </button>
          </form>

          <form
            onSubmit={handleJoinGroup}
            className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-7"
          >
            <div className="mb-5 flex items-start gap-3 sm:mb-6 sm:gap-4">
              <div className="shrink-0 rounded-xl bg-blue-50 p-2.5 text-blue-700 sm:rounded-2xl sm:p-3">
                <Users size={23} />
              </div>

              <div className="min-w-0">
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
              className="min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base uppercase tracking-wider outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50"
            />

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Users size={17} />
              {submitting ? "Please wait..." : "Join group"}
            </button>
          </form>
        </section>

        <footer className="mt-8 border-t border-slate-200 py-6 text-center text-xs text-slate-400 sm:mt-10 sm:py-8">
          <span className="font-semibold text-slate-500">RoomSplit</span> ·
          Shared expenses, made simple.
        </footer>
      </div>
    </main>
  );
}
