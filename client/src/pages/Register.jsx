import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address.';
    if (!form.password) e.password = 'Password is required.';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password.';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    return e;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    setServerError('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      await authApi.register(form);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit} noValidate>
        <h1>Create your account</h1>
        <p className="muted">Start tracking your job applications.</p>
        {serverError && <div className="alert alert-error" role="alert">{serverError}</div>}

        <label htmlFor="name">Full name</label>
        <input id="name" name="name" value={form.name} onChange={onChange} autoComplete="name" />
        {errors.name && <span className="field-error">{errors.name}</span>}

        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" value={form.email} onChange={onChange} autoComplete="email" />
        {errors.email && <span className="field-error">{errors.email}</span>}

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" value={form.password} onChange={onChange} autoComplete="new-password" />
        {errors.password && <span className="field-error">{errors.password}</span>}

        <label htmlFor="confirmPassword">Confirm password</label>
        <input id="confirmPassword" name="confirmPassword" type="password" value={form.confirmPassword} onChange={onChange} autoComplete="new-password" />
        {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}

        <button className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating account...' : 'Register'}</button>
        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
