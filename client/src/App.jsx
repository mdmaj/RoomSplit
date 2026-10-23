import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import {
  loadAuthPage,
  loadBalancesPage,
  loadDashboardPage,
  loadGroupDetailPage,
  loadGroupsPage,
} from "./routeLoaders.js";

const AuthPage = lazy(loadAuthPage);
const DashboardPage = lazy(loadDashboardPage);
const GroupsPage = lazy(loadGroupsPage);
const GroupDetailPage = lazy(loadGroupDetailPage);
const BalancesPage = lazy(loadBalancesPage);

function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center text-slate-500">
      Loading RoomSplit...
    </div>
  );
}

function PublicRoute({ mode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-10 text-center">Checking your session...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Suspense fallback={<PageLoading />}>
      <AuthPage mode={mode} />
    </Suspense>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<PublicRoute mode="login" />} />
        <Route path="/register" element={<PublicRoute mode="register" />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:groupId" element={<GroupDetailPage />} />
          <Route path="/groups/:groupId/balances" element={<BalancesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
