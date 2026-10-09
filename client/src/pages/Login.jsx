import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function onSubmit(ev) {
    ev.preventDefault();
    setError('');
    if (!form.email.trim() || !form.password) {
      setError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await login(form);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit} noValidate>
        <h1>Welcome back</h1>
        <p className="muted">Log in to manage your applications.</p>
        {location.state?.registered && !error && <div className="alert alert-success">Registration successful. Please log in.</div>}
        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" value={form.email} onChange={onChange} autoComplete="email" />

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" value={form.password} onChange={onChange} autoComplete="current-password" />

        <button className="btn btn-primary" disabled={submitting}>{submitting ? 'Logging in...' : 'Login'}</button>
        <p className="auth-switch">New here? <Link to="/register">Create an account</Link></p>
      </form>
    </div>
  );
}
