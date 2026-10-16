import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Wallet,
} from "lucide-react";
import api from "../services/api.js";

function memberId(member) {
  const person = member?.user ?? member;
  return typeof person === "string"
    ? person
    : (person?._id ?? person?.id ?? "");
}

function memberName(member) {
  const person = member?.user ?? member;
  return person?.name ?? person?.email ?? "Roommate";
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function rupeesFromPaise(value) {
  return Number(value || 0) / 100;
}

function normalizeBalance(raw) {
  const paid = raw.totalPaid ?? rupeesFromPaise(raw.totalPaidPaise);
  const share =
    raw.totalShare ?? raw.totalOwed ?? rupeesFromPaise(raw.totalSharePaise);
  const net =
    raw.netBalance ??
    raw.balance ??
    (raw.balancePaise !== undefined
      ? rupeesFromPaise(raw.balancePaise)
      : Number(paid) - Number(share));

  return {
    id: raw.userId ?? raw._id ?? raw.id ?? raw.user?._id ?? "",
    name: raw.name ?? raw.user?.name ?? raw.email ?? "Roommate",
    paid: Number(paid || 0),
    share: Number(share || 0),
    net: Number(net || 0),
  };
}

export default function BalancesPage() {
  const { groupId } = useParams();

  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [paidTo, setPaidTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const members = useMemo(
    () => (Array.isArray(group?.members) ? group.members : []),
    [group],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [groupsRes, balancesRes, settlementsRes] = await Promise.all([
        api.get("/groups"),
        api.get(`/balances/groups/${groupId}`),
        api.get(`/balances/groups/${groupId}/settlements`),
      ]);

      const groupList = groupsRes.data.groups ?? groupsRes.data;
      const selectedGroup = Array.isArray(groupList)
        ? groupList.find((item) => item._id === groupId)
        : null;

      if (!selectedGroup) {
        setGroup(null);
        setError("Group nahi mila. Dashboard se dobara open karo.");
        return;
      }

      setGroup(selectedGroup);

      const data = balancesRes.data.balances ?? balancesRes.data;
      const balanceRows = Array.isArray(data)
        ? data
        : (data.members ?? data.memberBalances ?? data.balances ?? []);

      setBalances(balanceRows.map(normalizeBalance));

      const suggested = Array.isArray(data)
        ? []
        : (data.suggestedTransfers ?? data.transfers ?? []);
      setTransfers(suggested);

      const settlementData =
        settlementsRes.data.settlements ?? settlementsRes.data;
      setSettlements(Array.isArray(settlementData) ? settlementData : []);

      const creditors = balanceRows
        .map(normalizeBalance)
        .filter((item) => item.net > 0.005);

      setPaidTo((previous) =>
        creditors.some((item) => item.id === previous)
          ? previous
          : (creditors[0]?.id ?? ""),
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Balances load nahi ho sake. API response check karna hoga.",
      );
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    // The async request updates local state when the external data arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  async function handleSettlement(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const numericAmount = Number(amount);

    if (!paidTo) {
      setError("Jis roommate ko payment ki hai, use select karo.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Valid amount enter karo.");
      return;
    }

    setSaving(true);

    try {
      await api.post(`/balances/groups/${groupId}/settlements`, {
        paidTo,
        amount: numericAmount,
        note: note.trim(),
      });

      setAmount("");
      setNote("");
      setMessage("Settlement record successfully add ho gaya.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Settlement save nahi ho saka.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <LoaderCircle className="mr-2 animate-spin" size={22} />
        Loading balances...
      </div>
    );
  }

  if (!group) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-4 sm:p-6">
          <p className="text-red-600">{error || "Group nahi mila."}</p>
          <Link to="/dashboard" className="mt-4 inline-block text-indigo-600">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            to={`/groups/${groupId}`}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600"
          >
            <ArrowLeft size={18} />
            Back to expenses
          </Link>
          <span className="shrink-0 font-bold text-indigo-600">RoomSplit</span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl min-w-0 px-3 py-5 sm:px-6 sm:py-8">
        <div className="mb-6 sm:mb-7">
          <p className="text-sm text-slate-500">{group.name}</p>
          <h1 className="mt-1 wrap-break-word text-2xl font-bold sm:text-3xl">
            Balances & Settlements
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Check who owes money and record payments between roommates.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        {message && (
          <div
            role="status"
            className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"
          >
            {message}
          </div>
        )}

        <section className="mb-6 grid grid-cols-3 gap-2 sm:mb-7 sm:gap-4">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-5">
            <div className="mb-2 flex min-w-0 items-center gap-1.5 text-slate-500 sm:mb-3 sm:gap-2">
              <Wallet size={17} className="hidden shrink-0 sm:block" />
              <span className="truncate text-[11px] sm:text-sm">Roommates</span>
            </div>
            <p className="text-xl font-bold sm:text-2xl">{members.length}</p>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-5">
            <p className="mb-2 truncate text-[11px] text-slate-500 sm:mb-3 sm:text-sm">
              Recorded settlements
            </p>
            <p className="text-xl font-bold sm:text-2xl">{settlements.length}</p>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-5">
            <p className="mb-2 truncate text-[11px] text-slate-500 sm:mb-3 sm:text-sm">
              Suggested payments
            </p>
            <p className="text-xl font-bold sm:text-2xl">{transfers.length}</p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:mb-7 sm:p-6">
          <h2 className="mb-4 text-lg font-bold">Roommate balances</h2>

          {balances.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
              Balance details nahi mile. Backend ke balances API response ko
              verify karna hoga.
            </p>
          ) : (
            <div className="space-y-3">
              {balances.map((item, index) => (
                <article
                  key={item.id || index}
                  className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                >
                  <div>
                    <p className="wrap-break-word font-semibold">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Paid: {money(item.paid)} · Share: {money(item.share)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p
                      className={`font-bold ${
                        item.net > 0.005
                          ? "text-emerald-600"
                          : item.net < -0.005
                            ? "text-red-600"
                            : "text-slate-500"
                      }`}
                    >
                      {Math.abs(item.net) < 0.005
                        ? "Settled"
                        : item.net > 0
                          ? `Gets ${money(item.net)}`
                          : `Owes ${money(Math.abs(item.net))}`}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-2">
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="mb-2 text-lg font-bold">Suggested transfers</h2>
            <p className="mb-5 text-sm text-slate-500">
              Recommended payments based on the backend calculation.
            </p>

            {transfers.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                Koi suggested transfer available nahi hai.
              </p>
            ) : (
              <div className="space-y-3">
                {transfers.map((transfer, index) => {
                  const from =
                    transfer.fromName ??
                    transfer.from?.name ??
                    members.find(
                      (m) =>
                        memberId(m) ===
                        (typeof transfer.from === "object"
                          ? transfer.from?._id
                          : (transfer.from ?? transfer.fromUserId)),
                    );
                  const to =
                    transfer.toName ??
                    transfer.to?.name ??
                    members.find(
                      (m) =>
                        memberId(m) ===
                        (typeof transfer.to === "object"
                          ? transfer.to?._id
                          : (transfer.to ?? transfer.toUserId)),
                    );

                  const transferAmount =
                    transfer.amount ??
                    rupeesFromPaise(
                      transfer.amountPaise ?? transfer.amountInPaise,
                    );

                  return (
                    <div
                      key={transfer._id ?? index}
                      className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-2 wrap-break-word">
                        <span className="truncate font-medium">
                          {typeof from === "string" ? from : memberName(from)}
                        </span>
                        <ArrowRight
                          className="shrink-0 text-slate-400"
                          size={17}
                        />
                        <span className="max-w-full wrap-break-word font-medium sm:max-w-[45%]">
                          {typeof to === "string" ? to : memberName(to)}
                        </span>
                      </div>
                      <span className="shrink-0 font-bold text-emerald-600">
                        {money(transferAmount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-bold">Record a payment</h2>
            <p className="mb-5 mt-1 text-sm text-slate-500">
              Use this after a payment has actually been made.
            </p>

            <form onSubmit={handleSettlement} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Paid to
                </label>
                <select
                  value={paidTo}
                  onChange={(event) => setPaidTo(event.target.value)}
                  required
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Select roommate</option>
                  {members.map((member) => {
                    const id = memberId(member);
                    return (
                      <option key={id} value={id}>
                        {memberName(member)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Amount paid (₹)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="e.g. 500"
                  className="min-h-12 w-full rounded-xl border border-slate-300 px-3.5 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Note (optional)
                </label>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="e.g. October rent share"
                  maxLength={300}
                  className="min-h-12 w-full rounded-xl border border-slate-300 px-3.5 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                {saving ? "Saving..." : "Record payment"}
              </button>
            </form>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:mt-7 sm:p-6">
          <h2 className="mb-4 text-lg font-bold">Settlement history</h2>

          {settlements.length === 0 ? (
            <p className="text-sm text-slate-500">
              Abhi koi settlement record nahi hai.
            </p>
          ) : (
            <div className="space-y-3">
              {settlements.map((settlement, index) => {
                const payerId =
                  typeof settlement.paidBy === "object"
                    ? settlement.paidBy?._id
                    : settlement.paidBy;
                const recipientId =
                  typeof settlement.paidTo === "object"
                    ? settlement.paidTo?._id
                    : settlement.paidTo;

                const payer =
                  settlement.paidBy?.name ??
                  members.find((m) => memberId(m) === payerId);
                const recipient =
                  settlement.paidTo?.name ??
                  members.find((m) => memberId(m) === recipientId);

                const settlementAmount =
                  settlement.amount ??
                  rupeesFromPaise(
                    settlement.amountPaise ?? settlement.amountInPaise,
                  );

                return (
                  <article
                    key={settlement._id ?? index}
                    className="flex min-w-0 flex-col gap-2 border-b border-slate-100 pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                  >
                    <div>
                      <p className="wrap-break-word font-medium">
                        {typeof payer === "string" ? payer : memberName(payer)}
                        {" paid "}
                        {typeof recipient === "string"
                          ? recipient
                          : memberName(recipient)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {settlement.note || "Payment recorded"}
                        {settlement.createdAt
                          ? ` · ${new Date(settlement.createdAt).toLocaleDateString("en-IN")}`
                          : ""}
                      </p>
                    </div>
                    <p className="wrap-break-word font-bold">
                      {money(settlementAmount)}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
