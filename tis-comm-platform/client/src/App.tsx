import { useEffect, useState, ReactNode } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { api, setAuthToken } from './services/api';
import { AuthContext } from './hooks/useAuth';
import type { User } from './types';
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/UI/LoadingSpinner';

import Login from './pages/Login';
import ProgramDashboard from './pages/ProgramDashboard';
import SiteDashboard from './pages/SiteDashboard';
import TemplateCatalogue from './pages/TemplateCatalogue';
import SurveyRespond from './pages/SurveyRespond';
import AdminUsers from './pages/Admin/Users';
import AdminSites from './pages/Admin/Sites';

function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const [state, setState] = useState<'loading' | 'authed' | 'unauthed'>('loading');
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    api
      .get('/auth/me')
      .then((r) => {
        setUser(r.data.user);
        setState('authed');
      })
      .catch(() => setState('unauthed'));
  }, []);
  if (state === 'loading') return <LoadingSpinner />;
  if (state === 'unauthed') return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role))
    return <div className="p-8 text-center text-danger">Access denied</div>;
  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAuthToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    setAuthToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/survey/:id/respond" element={<SurveyRespond />} />
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              loading ? (
                <LoadingSpinner />
              ) : user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['PROGRAM_MANAGER', 'PMO', 'ADMIN']}>
                <ProgramDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sites/:code"
            element={
              <ProtectedRoute>
                <SiteDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sites/:code/:tab"
            element={
              <ProtectedRoute>
                <SiteDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <TemplateCatalogue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/sites"
            element={
              <ProtectedRoute roles={['ADMIN', 'PROGRAM_MANAGER']}>
                <AdminSites />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthContext.Provider>
  );
}
