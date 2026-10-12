import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import GroupsPage from "./pages/GroupsPage.jsx";
import GroupDetailPage from "./pages/GroupDetailPage.jsx";
import BalancesPage from "./pages/BalancesPage.jsx";

function PublicRoute({ mode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-10 text-center">Checking your session...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthPage mode={mode} />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<PublicRoute mode="login" />} />
      <Route path="/register" element={<PublicRoute mode="register" />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/groups/:groupId" element={<GroupDetailPage />} />
        <Route path="/groups/:groupId/balances" element={<BalancesPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
