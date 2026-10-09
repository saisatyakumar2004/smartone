import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Spinner from './components/Spinner.jsx';

// Only logged-in users may see the page; everyone else is sent to /login.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Checking session..." />;
  return user ? children : <Navigate to="/login" replace />;
}

// Logged-in users skip the login/register pages.
function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Checking session..." />;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
