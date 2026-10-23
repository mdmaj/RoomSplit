import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Plus,
  Receipt,
  Users,
  Wallet,
  LoaderCircle,
  FileSpreadsheet,
  BarChart3,
  ChevronDown,
  PieChart,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";
import { loadBalancesPage, loadDashboardPage } from "../routeLoaders.js";
import MonthlySpendingPieChart from "../components/MonthlySpendingPieChart.jsx";

const categories = [
  "Rent",
  "Groceries",
  "Electricity",
  "Internet",
  "Food",
  "Transport",
  "Cleaning",
  "Other",
];

function getMemberId(member) {
  const person = member?.user ?? member;
  if (typeof person === "string") return person;
  return String(person?._id ?? person?.id ?? "");
}

function getMemberName(member) {
  const person = member?.user ?? member;
  return person?.name ?? person?.email ?? "Roommate";
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function getExpenseAmount(expense) {
  if (typeof expense?.amount === "number") return expense.amount;
  if (typeof expense?.amountPaise === "number") {
    return expense.amountPaise / 100;
  }
  return 0;
}

function getExpensePayerId(expense) {
  const payer = expense?.paidBy;

  if (typeof payer === "object" && payer !== null) {
    return String(payer._id ?? payer.id ?? "");
  }

  return String(payer ?? "");
}

function getExpenseMonth(expense) {
  const date = new Date(expense?.date ?? expense?.createdAt);

  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function getCurrentMonthKey() {
  return getExpenseMonth({ date: new Date() });
}

function calculateSuggestedTransfers(members, expenses) {
  const memberBalances = members
    .map((member) => ({
      id: getMemberId(member),
      name: getMemberName(member),
      paidPaise: 0,
      netPaise: 0,
    }))
    .filter((member) => member.id);

  const memberById = new Map(
    memberBalances.map((member) => [member.id, member]),
  );

  const totalPaise = expenses.reduce((sum, expense) => {
    const amountPaise = Math.round(getExpenseAmount(expense) * 100);
    const payer = memberById.get(getExpensePayerId(expense));

    if (payer) {
      payer.paidPaise += amountPaise;
    }

    return sum + amountPaise;
  }, 0);

  if (memberBalances.length === 0 || totalPaise === 0) {
    return {
      totalPaise,
      sharePaise: 0,
      transfers: [],
      members: memberBalances,
    };
  }

  // Divide the total equally in paise.
  // Distribute any leftover paise deterministically.
  const baseShare = Math.floor(totalPaise / memberBalances.length);
  const remainder = totalPaise % memberBalances.length;

  memberBalances.forEach((member, index) => {
    const fairShare = baseShare + (index < remainder ? 1 : 0);
    member.fairSharePaise = fairShare;
    member.netPaise = member.paidPaise - fairShare;
  });

  const debtors = memberBalances
    .filter((member) => member.netPaise < 0)
    .map((member) => ({
      ...member,
      remainingPaise: -member.netPaise,
    }));

  const creditors = memberBalances
    .filter((member) => member.netPaise > 0)
    .map((member) => ({
      ...member,
      remainingPaise: member.netPaise,
    }));

  const transfers = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  // Match people who owe money with people who should receive money.
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    const amountPaise = Math.min(
      debtor.remainingPaise,
      creditor.remainingPaise,
    );

    if (amountPaise > 0) {
      transfers.push({
        from: debtor.name,
        to: creditor.name,
        amountPaise,
      });
    }

    debtor.remainingPaise -= amountPaise;
    creditor.remainingPaise -= amountPaise;

    if (debtor.remainingPaise === 0) debtorIndex += 1;
    if (creditor.remainingPaise === 0) creditorIndex += 1;
  }

  return {
    totalPaise,
    sharePaise: baseShare,
    transfers,
    members: memberBalances,
  };
}

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [paidBy, setPaidBy] = useState("");
  const [notes, setNotes] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey);
  const [splitResult, setSplitResult] = useState(null);

  const members = useMemo(
    () => (Array.isArray(group?.members) ? group.members : []),
    [group],
  );

  const filteredExpenses = useMemo(() => {
    if (selectedMonth === "all") return expenses;

    return expenses.filter(
      (expense) => getExpenseMonth(expense) === selectedMonth,
    );
  }, [expenses, selectedMonth]);

  const totalExpense = filteredExpenses.reduce(
    (total, expense) => total + getExpenseAmount(expense),
    0,
  );

  const formatRupees = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);

  const loadGroupData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const groupFromNavigation =
        location.state?.group?._id === groupId ? location.state.group : null;
      const [groupsResponse, expensesResponse] = await Promise.all([
        groupFromNavigation ? Promise.resolve(null) : api.get("/groups"),
        api.get(`/expenses/groups/${groupId}`),
      ]);

      const groupsData = groupsResponse
        ? groupsResponse.data.groups ?? groupsResponse.data
        : null;

      const foundGroup =
        groupFromNavigation ||
        (Array.isArray(groupsData)
          ? groupsData.find((item) => item._id === groupId)
          : null);

      if (!foundGroup) {
        setGroup(null);
        setError("Group nahi mila. Please dashboard se dobara open karo.");
        return;
      }

      setGroup(foundGroup);

      const expenseData =
        expensesResponse.data.expenses ?? expensesResponse.data;

      setExpenses(Array.isArray(expenseData) ? expenseData : []);

      const memberIds = (foundGroup.members ?? [])
        .map(getMemberId)
        .filter(Boolean);

      const currentUserId = String(user?.id ?? user?._id ?? "");

      setPaidBy((previous) => {
        if (previous && memberIds.includes(previous)) {
          return previous;
        }

        if (memberIds.includes(currentUserId)) {
          return currentUserId;
        }

        return memberIds[0] ?? "";
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Group data load nahi ho saka. Backend check karo.",
      );
    } finally {
      setLoading(false);
    }
  }, [groupId, location.state, user]);

  useEffect(() => {
    // The async request updates local state when the external data arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGroupData();
  }, [loadGroupData]);

  async function handleAddExpense(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSplitResult(null);

    const numericAmount = Number(amount);

    if (!title.trim()) {
      setError("Expense ka title enter karo.");
      return;
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      Math.abs(numericAmount * 100 - Math.round(numericAmount * 100)) > 1e-7
    ) {
      setError(
        "Amount zero se zyada hona chahiye aur maximum 2 decimal places hone chahiye.",
      );
      return;
    }

    if (!paidBy) {
      setError("Please select kisne payment ki.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post(`/expenses/groups/${groupId}`, {
        title: title.trim(),
        amount: numericAmount,
        category,
        paidBy,
        notes: notes.trim(),
      });

      setTitle("");
      setAmount("");
      setCategory("Groceries");
      setNotes("");
      setSuccess("Expense successfully add ho gaya!");

      await loadGroupData();
    } catch (err) {
      setError(err.response?.data?.message || "Expense add nahi ho saka.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSplitExpenses() {
    setError("");
    setSuccess("");
    setSplitResult(null);

    if (selectedMonth === "all") {
      setError("Pehle ek specific month select karo.");
      return;
    }

    if (members.length < 2) {
      setError("Split calculate karne ke liye kam se kam 2 roommates chahiye.");
      return;
    }

    const result = calculateSuggestedTransfers(members, filteredExpenses);

    setSplitResult(result);
  }

  const handleExport = async () => {
    try {
      const response = await api.get(`/export/groups/${groupId}/excel`, {
        responseType: "blob",
      });

      const fileURL = window.URL.createObjectURL(new Blob([response.data]));

      const link = document.createElement("a");
      link.href = fileURL;
      link.download = `RoomSplit-${group?.name || "Expenses"}.xlsx`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(fileURL);
    } catch (err) {
      console.error("Excel export failed:", err);

      alert(
        err.response?.data?.message ||
          "Unable to export expenses. Please try again.",
      );
    }
  };

  const categoryTotals = useMemo(() => {
    return filteredExpenses.reduce((totals, expense) => {
      const expenseCategory = expense.category || "Other";

      totals[expenseCategory] =
        (totals[expenseCategory] || 0) + getExpenseAmount(expense);

      return totals;
    }, {});
  }, [filteredExpenses]);

  const roommateTotals = useMemo(() => {
    return filteredExpenses.reduce((totals, expense) => {
      const payerId = getExpensePayerId(expense);

      const matchedMember = members.find(
        (member) => getMemberId(member) === payerId,
      );

      const payerName =
        (typeof expense.paidBy === "object" &&
          (expense.paidBy?.name || expense.paidBy?.email)) ||
        (matchedMember ? getMemberName(matchedMember) : "Unknown roommate");

      totals[payerName] = (totals[payerName] || 0) + getExpenseAmount(expense);

      return totals;
    }, {});
  }, [filteredExpenses, members]);

  const categoryEntries = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1],
  );

  const roommateEntries = Object.entries(roommateTotals).sort(
    (a, b) => b[1] - a[1],
  );

  const maxCategoryAmount = Math.max(
    1,
    ...categoryEntries.map(([, value]) => value),
  );

  const maxRoommateAmount = Math.max(
    1,
    ...roommateEntries.map(([, value]) => value),
  );

  // Build a rolling six-month spending trend using expense dates.
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months = [];

    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
      )}`;

      months.push({
        key,
        label: new Intl.DateTimeFormat("en-IN", {
          month: "short",
        }).format(date),
        amount: 0,
      });
    }

    const totalsByMonth = new Map(months.map((month) => [month.key, 0]));

    expenses.forEach((expense) => {
      const monthKey = getExpenseMonth(expense);
      if (!totalsByMonth.has(monthKey)) return;

      totalsByMonth.set(
        monthKey,
        totalsByMonth.get(monthKey) + getExpenseAmount(expense),
      );
    });

    return months.map((month) => ({
      ...month,
      amount: totalsByMonth.get(month.key) || 0,
    }));
  }, [expenses]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <LoaderCircle className="mr-2 animate-spin" size={22} />
        Loading group...
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-red-600">{error || "Group nahi mila."}</p>

          <Link
            to="/dashboard"
            onMouseEnter={loadDashboardPage}
            onFocus={loadDashboardPage}
            className="mt-4 inline-flex items-center gap-2 font-semibold text-indigo-600"
          >
            <ArrowLeft size={17} />
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <Link
            to="/dashboard"
            onMouseEnter={loadDashboardPage}
            onFocus={loadDashboardPage}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600"
          >
            <ArrowLeft size={18} />
            Dashboard
          </Link>

          <span className="font-bold tracking-tight text-indigo-600">
            RoomSplit
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-6 sm:py-8">
        <section className="relative mb-6 overflow-hidden rounded-2xl bg-linear-to-br from-emerald-700 via-emerald-600 to-teal-600 p-4 text-white shadow-lg shadow-emerald-900/10 sm:mb-7 sm:rounded-3xl sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-14 h-32 w-32 rounded-full border-16 border-white/10 sm:h-48 sm:w-48 sm:border-24" />
          <div className="pointer-events-none absolute -bottom-20 right-10 h-36 w-36 rounded-full bg-white/5 sm:right-24 sm:h-44 sm:w-44" />
          <div className="relative z-10 flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="shrink-0 rounded-xl bg-white/15 p-2.5 sm:rounded-2xl sm:p-3">
              <Wallet size={27} />
            </div>

            <div className="min-w-0">
              <p className="text-sm text-emerald-50">Your household</p>

              <h1 className="mt-1 wrap-break-word text-2xl font-bold sm:text-3xl">
                {group.name}
              </h1>

              <p className="mt-2 text-sm text-emerald-50">
                Track household expenses with your roommates.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                <Link
                  to={`/groups/${groupId}/balances`}
                  state={{ group }}
                  onMouseEnter={loadBalancesPage}
                  onFocus={loadBalancesPage}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 sm:w-auto sm:text-base"
                >
                  <Wallet size={18} />
                  View balances
                </Link>

                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 sm:w-auto sm:text-base"
                >
                  <FileSpreadsheet size={18} />
                  Export Excel
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm">
                <Users size={17} />
                {members.length} {members.length === 1 ? "member" : "members"}
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {success}
          </div>
        )}

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Add expense form */}
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                <Plus size={21} />
              </div>

              <div>
                <h2 className="text-lg font-bold">Add an expense</h2>
                <p className="text-sm text-slate-500">
                  Record who actually paid for an expense.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Expense title
                </label>

                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Monthly rent"
                  maxLength={100}
                  required
                  className="min-h-12 w-full rounded-xl border border-slate-300 px-3.5 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Amount (₹)
                </label>

                <input
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="e.g. 1200"
                  min="0.01"
                  step="0.01"
                  required
                  className="min-h-12 w-full rounded-xl border border-slate-300 px-3.5 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Category
                </label>

                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Who paid?
                </label>

                <div className="relative min-w-0 w-full">
                  <select
                    value={paidBy}
                    onChange={(event) => setPaidBy(event.target.value)}
                    required
                    className="min-h-12 min-w-0 max-w-full w-full appearance-none truncate rounded-xl border border-slate-300 bg-white px-3.5 py-3 pr-10 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    {members.map((member) => {
                      const id = getMemberId(member);

                      return (
                        <option key={id} value={id}>
                          {getMemberName(member)}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    size={18}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Notes{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>

                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add any details..."
                  rows={2}
                  maxLength={500}
                  className="min-h-12 w-full resize-y rounded-xl border border-slate-300 px-3.5 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || members.length === 0}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="animate-spin" size={18} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Add expense
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Recent expenses and monthly split */}
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                  <Receipt size={21} />
                </div>

                <div>
                  <h2 className="text-lg font-bold">This month's expenses</h2>
                  <p className="text-sm text-slate-500">
                    {expenses.length} recorded
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <label className="sr-only" htmlFor="expense-month-filter">
                Filter expenses by month
              </label>

              <select
                id="expense-month-filter"
                value={selectedMonth}
                onChange={(event) => {
                  setSelectedMonth(event.target.value);
                  setSplitResult(null);
                  setError("");
                }}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:w-auto"
              >
                <option value="all">All months</option>

                {Array.from(
                  new Set([
                    ...Array.from({ length: 12 }, (_, index) => {
                      const date = new Date();
                      date.setDate(1);
                      date.setMonth(date.getMonth() - index);

                      return `${date.getFullYear()}-${String(
                        date.getMonth() + 1,
                      ).padStart(2, "0")}`;
                    }),
                    ...expenses.map(getExpenseMonth).filter(Boolean),
                  ]),
                )
                  .sort((a, b) => b.localeCompare(a))
                  .map((value) => {
                    const [year, month] = value.split("-").map(Number);

                    const date = new Date(year, month - 1, 1);

                    return (
                      <option key={value} value={value}>
                        {date.toLocaleDateString("en-IN", {
                          month: "long",
                          year: "numeric",
                        })}
                      </option>
                    );
                  })}
              </select>

              <div className="min-w-0 rounded-xl bg-emerald-50 px-3 py-3 sm:min-w-52 sm:px-4">
                <p className="text-xs font-medium text-emerald-700">
                  {selectedMonth === "all"
                    ? "Total household expenses"
                    : "Selected month total"}
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatRupees(totalExpense)}
                </p>

                <p className="text-xs text-slate-500">
                  {filteredExpenses.length} expense
                  {filteredExpenses.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {/* Monthly split */}
            <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-bold text-slate-900">
                    Monthly expense split
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Calculate each roommate's fair share and suggested
                    transfers. This does not record a payment.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSplitExpenses}
                  disabled={selectedMonth === "all" || members.length < 2}
                  className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  Split Expenses
                </button>
              </div>

              {selectedMonth === "all" && (
                <p className="mt-3 text-xs text-emerald-700">
                  Select a specific month above to calculate the split.
                </p>
              )}

              {splitResult && (
                <div className="mt-4 border-t border-emerald-200 pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs text-slate-500">Monthly spending</p>
                      <p className="mt-1 font-bold">
                        {formatRupees(splitResult.totalPaise / 100)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs text-slate-500">
                        Base fair share per roommate
                      </p>
                      <p className="mt-1 font-bold">
                        {formatRupees(splitResult.sharePaise / 100)}
                      </p>
                    </div>
                  </div>

                  <h4 className="mb-2 mt-4 font-semibold text-slate-800">
                    Actual spending by roommate
                  </h4>

                  <div className="space-y-2">
                    {splitResult.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex flex-col items-start justify-between gap-2 rounded-lg bg-white p-3 text-sm sm:flex-row sm:items-center"
                      >
                        <span>{member.name}</span>

                        <div className="text-right">
                          <p className="font-semibold">
                            {formatRupees(member.paidPaise / 100)}
                          </p>
                          <p className="text-xs text-slate-500">
                            Fair share:{" "}
                            {formatRupees(member.fairSharePaise / 100)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <h4 className="mb-2 mt-4 font-semibold text-slate-800">
                    Suggested transfers
                  </h4>

                  {splitResult.transfers.length === 0 ? (
                    <p className="rounded-lg bg-white p-3 text-sm text-slate-600">
                      No transfers required for this month.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {splitResult.transfers.map((transfer, index) => (
                        <div
                          key={`${transfer.from}-${transfer.to}-${index}`}
                          className="flex flex-col items-start justify-between gap-2 rounded-lg bg-white p-3 text-sm sm:flex-row sm:items-center"
                        >
                          <span>
                            <strong>{transfer.from}</strong>
                            {" pays "}
                            <strong>{transfer.to}</strong>
                          </span>

                          <strong>
                            {formatRupees(transfer.amountPaise / 100)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mt-3 text-xs text-slate-500">
                    Suggestions only. No payment or settlement has been
                    recorded.
                  </p>
                </div>
              )}
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center">
                <Receipt className="mx-auto mb-3 text-slate-400" size={30} />

                <p className="font-semibold text-slate-700">
                  {expenses.length === 0
                    ? "No expenses yet"
                    : "No expenses for this month"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {expenses.length === 0
                    ? "Add your first expense using the form."
                    : "Choose another month or select All months."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpenses.map((expense) => (
                  <article
                    key={expense._id}
                    className="min-w-0 rounded-xl border border-slate-200 p-3 transition hover:border-emerald-200 sm:p-4"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
                      <div className="min-w-0">
                        <h3 className="wrap-break-word font-semibold text-slate-800">
                          {expense.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {expense.category || "Other"}
                        </p>
                      </div>

                      <p className="max-w-[45%] shrink-0 wrap-break-word text-right text-sm font-bold text-slate-900 sm:max-w-none sm:text-base">
                        {formatMoney(getExpenseAmount(expense))}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <span>
                        Paid by:{" "}
                        {getMemberName(
                          members.find(
                            (member) =>
                              getMemberId(member) ===
                              getExpensePayerId(expense),
                          ) ??
                            (typeof expense.paidBy === "object"
                              ? expense.paidBy
                              : null),
                        )}
                      </span>

                      <span>
                        {expense.date || expense.createdAt
                          ? new Date(
                              expense.date ?? expense.createdAt,
                            ).toLocaleDateString("en-IN")
                          : ""}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Monthly spending trend */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-50 p-2.5 ">
                <BarChart3 size={21} />
              </div>

              <div>
                <h2 className="text-lg font-bold ">
                  Monthly spending trend
                </h2>
                <p className="text-sm ">
                  Total household expenses over the last six months
                </p>
              </div>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium ">
              All expenses
            </span>
          </div>

          {expenses.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm">
              Add expenses to see your monthly spending trend.
            </p>
          ) : (
            <MonthlySpendingPieChart
              months={monthlyTrend}
              formatMoney={formatRupees}
            />
          )}
        </section>

        {/* Category breakdown and roommate spending */}
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                <PieChart size={21} />
              </div>

              <div>
                <h2 className="text-lg font-bold">Category breakdown</h2>
                <p className="text-sm text-slate-500">
                  Where your household money goes
                </p>
              </div>
            </div>

            {categoryEntries.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No category data available for this period.
              </p>
            ) : (
              <div className="space-y-5">
                {categoryEntries.map(([expenseCategory, value]) => (
                  <div key={expenseCategory}>
                    <div className="mb-2 flex items-start justify-between gap-2 text-sm">
                      <span className="min-w-0 wrap-break-word font-medium text-slate-700">
                        {expenseCategory}
                      </span>

                      <span className="shrink-0 wrap-break-word text-right font-semibold text-slate-900">
                        {formatRupees(value)}
                      </span>
                    </div>

                    <div
                      className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                      role="progressbar"
                      aria-label={`${expenseCategory} spending`}
                      aria-valuemin={0}
                      aria-valuemax={maxCategoryAmount}
                      aria-valuenow={value}
                    >
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            (value / maxCategoryAmount) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                <BarChart3 size={21} />
              </div>

              <div>
                <h2 className="text-lg font-bold">Roommate spending</h2>
                <p className="text-sm text-slate-500">
                  Total expenses paid by each roommate
                </p>
              </div>
            </div>

            {roommateEntries.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No roommate spending available for this period.
              </p>
            ) : (
              <div className="space-y-5">
                {roommateEntries.map(([roommateName, value]) => (
                  <div key={roommateName}>
                    <div className="mb-2 flex items-start justify-between gap-2 text-sm">
                      <span className="min-w-0 wrap-break-word font-medium text-slate-700">
                        {roommateName}
                      </span>

                      <span className="shrink-0 wrap-break-word text-right font-semibold text-slate-900">
                        {formatRupees(value)}
                      </span>
                    </div>

                    <div
                      className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                      role="progressbar"
                      aria-label={`${roommateName} spending`}
                      aria-valuemin={0}
                      aria-valuemax={maxRoommateAmount}
                      aria-valuenow={value}
                    >
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            (value / maxRoommateAmount) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
