
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthPage({ mode = "login" }) {
  const isRegister = mode === "register";
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (isRegister) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-emerald-50 via-slate-50 to-teal-50 px-3 py-6 sm:px-4 sm:py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/80 bg-white p-5 shadow-xl shadow-emerald-900/5 sm:p-10">
        <Link to="/" className="mb-7 flex items-center gap-3 sm:mb-8">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white sm:h-12 sm:w-12">
            <Wallet size={25} />
          </div>
          <div>
            <h1 className="text-xl font-bold">RoomSplit</h1>
            <p className="text-sm text-slate-500">Shared living, simplified</p>
          </div>
        </Link>

        <h2 className="text-2xl font-bold tracking-tight">
          {isRegister ? "Create your account" : "Welcome back"}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {isRegister
            ? "Start managing shared expenses with your roommates."
            : "Sign in to manage your household expenses."}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5 sm:mt-8">
          {isRegister && (
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="min-h-12 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-h-12 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              minLength={isRegister ? 8 : undefined}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? "At least 8 characters" : "Enter password"}
              className="min-h-12 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Please wait..."
              : isRegister
                ? "Create account"
                : "Sign in"}
            {!submitting && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {isRegister ? "Already have an account? " : "New to RoomSplit? "}
          <Link
            to={isRegister ? "/login" : "/register"}
            className="font-semibold text-emerald-700 hover:underline"
          >
            {isRegister ? "Sign in" : "Create account"}
          </Link>
        </p>
      </div>
    </main>
  );
}