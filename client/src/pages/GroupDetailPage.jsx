import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Plus,
  Receipt,
  Users,
  Wallet,
  LoaderCircle,
  FileSpreadsheet,
  BarChart3,
  PieChart,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";

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
  return person?._id ?? person?.id ?? "";
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
  }).format(amount);
}

function getExpenseAmount(expense) {
  if (typeof expense.amount === "number") return expense.amount;
  if (typeof expense.amountPaise === "number") return expense.amountPaise / 100;
  return 0;
}

export default function GroupDetailPage() {
  const { groupId } = useParams();
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
  const [participants, setParticipants] = useState([]);
  const [notes, setNotes] = useState("");

  const [selectedMonth, setSelectedMonth] = useState("all");

  const filteredExpenses = useMemo(() => {
    if (selectedMonth === "all") return expenses;

    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.createdAt);

      if (Number.isNaN(expenseDate.getTime())) return false;

      const month = `${expenseDate.getFullYear()}-${String(
        expenseDate.getMonth() + 1,
      ).padStart(2, "0")}`;

      return month === selectedMonth;
    });
  }, [expenses, selectedMonth]);

  const totalExpense = filteredExpenses.reduce(
    (total, expense) => total + getExpenseAmount(expense),
    0,
  );

  const members = useMemo(
    () => (Array.isArray(group?.members) ? group.members : []),
    [group],
  );

  const loadGroupData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [groupsResponse, expensesResponse] = await Promise.all([
        api.get("/groups"),
        api.get(`/expenses/groups/${groupId}`),
      ]);

      const groupsData = groupsResponse.data.groups ?? groupsResponse.data;
      const foundGroup = Array.isArray(groupsData)
        ? groupsData.find((item) => item._id === groupId)
        : null;

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

      const currentUserId = user?.id ?? user?._id ?? "";

      setPaidBy((previous) =>
        previous && memberIds.includes(previous)
          ? previous
          : memberIds.includes(currentUserId)
            ? currentUserId
            : (memberIds[0] ?? ""),
      );

      setParticipants((previous) => {
        const validPrevious = previous.filter((id) => memberIds.includes(id));
        return validPrevious.length ? validPrevious : memberIds;
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Group data load nahi ho saka. Backend check karo.",
      );
    } finally {
      setLoading(false);
    }
  }, [groupId, user]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  function toggleParticipant(memberId) {
    setParticipants((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  }

  async function handleAddExpense(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const numericAmount = Number(amount);

    if (!title.trim()) {
      setError("Expense ka title enter karo.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Amount zero se zyada hona chahiye.");
      return;
    }

    if (!paidBy) {
      setError("Please select kisne payment ki.");
      return;
    }

    if (participants.length === 0) {
      setError("Kam se kam ek roommate select karo.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post(`/expenses/groups/${groupId}`, {
        title: title.trim(),
        amount: numericAmount,
        category,
        paidBy,
        participants,
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
    } catch (error) {
      console.error("Excel export failed:", error);
      alert(
        error.response?.data?.message ||
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
      const paidById =
        typeof expense.paidBy === "object"
          ? (expense.paidBy?._id ?? expense.paidBy?.id)
          : expense.paidBy;
      const matchedMember = members.find(
        (member) => getMemberId(member) === String(paidById ?? ""),
      );
      const payerName =
        (typeof expense.paidBy === "object" &&
          (expense.paidBy?.name || expense.paidBy?.email)) ||
        (matchedMember ? getMemberName(matchedMember) : "Unknown roommate");

      totals[payerName] = (totals[payerName] || 0) + getExpenseAmount(expense);
      return totals;
    }, {});
  }, [filteredExpenses, members]);

  const formatRupees = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);

  const categoryEntries = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1],
  );
  const roommateEntries = Object.entries(roommateTotals).sort(
    (a, b) => b[1] - a[1],
  );

  const maxCategoryAmount = Math.max(
    1,
    ...categoryEntries.map(([, amount]) => amount),
  );
  const maxRoommateAmount = Math.max(
    1,
    ...roommateEntries.map(([, amount]) => amount),
  );

  // Build a rolling six-month spending trend from all group expenses.
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months = [];

    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        key,
        label: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(
          date,
        ),
        amount: 0,
      });
    }

    const totalsByMonth = new Map(months.map((month) => [month.key, 0]));

    expenses.forEach((expense) => {
      const date = new Date(expense.createdAt);
      if (Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (totalsByMonth.has(key)) {
        totalsByMonth.set(
          key,
          totalsByMonth.get(key) + getExpenseAmount(expense),
        );
      }
    });

    return months.map((month) => ({
      ...month,
      amount: totalsByMonth.get(month.key) || 0,
    }));
  }, [expenses]);

  const maxMonthlyAmount = Math.max(
    1,
    ...monthlyTrend.map((month) => month.amount),
  );

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
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-red-600">{error || "Group nahi mila."}</p>
          <Link
            to="/dashboard"
            className="mt-4 inline-flex items-center gap-2 font-semibold text-indigo-600"
          >
            <ArrowLeft size={17} /> Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            to="/dashboard"
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

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section className="mb-7 rounded-3xl bg-indigo-600 p-6 text-white sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/15 p-3">
              <Wallet size={27} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-indigo-100">Your household</p>
              <h1 className="mt-1 break-words text-3xl font-bold">
                {group.name}
              </h1>
              <p className="mt-2 text-sm text-indigo-100">
                Track shared expenses with your roommates.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to={`/groups/${groupId}/balances`}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-indigo-700 transition hover:bg-indigo-50"
                >
                  <Wallet size={18} />
                  View balances
                </Link>

                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-indigo-700 transition hover:bg-indigo-50"
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

        <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                <Plus size={21} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Add an expense</h2>
                <p className="text-sm text-slate-500">
                  Record a shared household expense.
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
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                <select
                  value={paidBy}
                  onChange={(event) => setPaidBy(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium">Split between</label>
                  <button
                    type="button"
                    onClick={() =>
                      setParticipants(members.map(getMemberId).filter(Boolean))
                    }
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Select all
                  </button>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  {members.map((member) => {
                    const id = getMemberId(member);
                    return (
                      <label
                        key={id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={participants.includes(id)}
                          onChange={() => toggleParticipant(id)}
                          className="h-4 w-4 accent-indigo-600"
                        />
                        <span className="text-sm">{getMemberName(member)}</span>
                      </label>
                    );
                  })}
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Equal split:{" "}
                  {participants.length > 0
                    ? `${formatMoney(Number(amount || 0) / participants.length)} per person`
                    : "Select at least one roommate"}
                </p>
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
                  className="w-full resize-y rounded-xl border border-slate-300 px-3.5 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || members.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
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

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                  <Receipt size={21} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Recent expenses</h2>
                  <p className="text-sm text-slate-500">
                    {expenses.length} recorded
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <label className="sr-only" htmlFor="expense-month-filter">
                Filter expenses by month
              </label>
              <select
                id="expense-month-filter"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-auto"
              >
                <option value="all">All months</option>
                {Array.from({ length: 12 }, (_, index) => {
                  const date = new Date();
                  date.setDate(1);
                  date.setMonth(date.getMonth() - index);
                  const value = `${date.getFullYear()}-${String(
                    date.getMonth() + 1,
                  ).padStart(2, "0")}`;
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

              <div className="rounded-xl bg-indigo-50 px-4 py-3 sm:min-w-52">
                <p className="text-xs font-medium text-indigo-700">
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
                    className="rounded-xl border border-slate-200 p-4 transition hover:border-indigo-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-semibold text-slate-800">
                          {expense.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {expense.category || "Other"}
                        </p>
                      </div>
                      <p className="shrink-0 font-bold text-slate-900">
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
                              (typeof expense.paidBy === "object"
                                ? expense.paidBy?._id
                                : expense.paidBy),
                          ) ??
                            (typeof expense.paidBy === "object"
                              ? expense.paidBy
                              : null),
                        )}
                      </span>
                      <span>
                        {expense.createdAt
                          ? new Date(expense.createdAt).toLocaleDateString(
                              "en-IN",
                            )
                          : ""}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
                <BarChart3 size={21} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Monthly spending trend
                </h2>
                <p className="text-sm text-slate-500">
                  Total household expenses over the last six months
                </p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              All expenses
            </span>
          </div>

          {expenses.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Add expenses to see your monthly spending trend.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-5">
              {monthlyTrend.map((month) => {
                const barHeight =
                  month.amount > 0
                    ? Math.max(8, (month.amount / maxMonthlyAmount) * 150)
                    : 3;

                return (
                  <div
                    key={month.key}
                    className="flex min-w-0 flex-col items-center"
                  >
                    <p className="mb-2 min-h-8 text-center text-xs font-semibold text-slate-700">
                      {month.amount > 0 ? formatRupees(month.amount) : "—"}
                    </p>
                    <div className="flex h-40 w-full items-end justify-center rounded-xl bg-slate-50 px-2 pb-2">
                      <div
                        className={`w-full max-w-12 rounded-t-lg transition-all ${month.amount > 0 ? "bg-violet-500" : "bg-slate-200"}`}
                        style={{ height: `${barHeight}px` }}
                        role="img"
                        aria-label={`${month.label}: ${formatRupees(month.amount)}`}
                        title={`${month.label}: ${formatRupees(month.amount)}`}
                      />
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      {month.label}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
                {categoryEntries.map(([expenseCategory, amount]) => (
                  <div key={expenseCategory}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-700">
                        {expenseCategory}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatRupees(amount)}
                      </span>
                    </div>
                    <div
                      className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                      role="progressbar"
                      aria-label={`${expenseCategory} spending`}
                      aria-valuemin={0}
                      aria-valuemax={maxCategoryAmount}
                      aria-valuenow={amount}
                    >
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{
                          width: `${Math.min(100, (amount / maxCategoryAmount) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
                {roommateEntries.map(([roommateName, amount]) => (
                  <div key={roommateName}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-700">
                        {roommateName}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatRupees(amount)}
                      </span>
                    </div>
                    <div
                      className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                      role="progressbar"
                      aria-label={`${roommateName} spending`}
                      aria-valuemin={0}
                      aria-valuemax={maxRoommateAmount}
                      aria-valuenow={amount}
                    >
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{
                          width: `${Math.min(100, (amount / maxRoommateAmount) * 100)}%`,
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
