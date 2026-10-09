import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { applicationsApi } from '../services/api.js';
import ApplicationForm, { STATUSES } from '../components/ApplicationForm.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Spinner from '../components/Spinner.jsx';

const formatDate = (iso) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ total: 0, byStatus: {} });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null = closed, {} = add, {...app} = edit

  // Wait 300ms after typing stops before calling the API.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await applicationsApi.list({ search: debouncedSearch, status: statusFilter });
      setApplications(data.applications);
      setStats(data.stats);
    } catch (err) {
      if (err.status === 401) {
        await logout();
        navigate('/login', { replace: true });
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, logout, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(form) {
    if (editing && editing._id) await applicationsApi.update(editing._id, form);
    else await applicationsApi.create(form);
    setEditing(null);
    await load();
  }

  async function handleDelete(app) {
    if (!window.confirm(`Delete your application to ${app.company} (${app.role})? This cannot be undone.`)) return;
    try {
      await applicationsApi.remove(app._id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const filtering = debouncedSearch || statusFilter;

  return (
    <>
      <header className="topbar">
        <strong className="brand">JobTrack</strong>
        <button className="btn" onClick={handleLogout}>Logout</button>
      </header>

      <main className="container">
        <div className="page-head">
          <div>
            <h1>Welcome, {user.name}!</h1>
            <p className="muted">Here is where your job search stands.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setEditing({})}>+ Add Application</button>
        </div>

        <section className="stats">
          <div className="card stat">
            <span className="stat-num">{stats.total}</span>
            <span className="muted">Total</span>
          </div>
          {STATUSES.map((s) => (
            <div className="card stat" key={s}>
              <span className="stat-num">{stats.byStatus[s] ?? 0}</span>
              <StatusBadge status={s} />
            </div>
          ))}
        </section>

        <section className="toolbar">
          <input
            type="search"
            placeholder="Search by company or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search applications"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </section>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        {loading ? (
          <Spinner label="Loading applications..." />
        ) : applications.length === 0 ? (
          <div className="card empty">
            {filtering ? (
              <p>No applications match your search or filter.</p>
            ) : (
              <>
                <h2>No applications yet</h2>
                <p className="muted">Add your first job application to start tracking.</p>
                <button className="btn btn-primary" onClick={() => setEditing({})}>+ Add Application</button>
              </>
            )}
          </div>
        ) : (
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th><th>Role</th><th>Applied</th><th>Status</th><th>Notes</th><th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a._id}>
                    <td data-label="Company">
                      {a.jobUrl ? <a href={a.jobUrl} target="_blank" rel="noopener noreferrer">{a.company}</a> : a.company}
                    </td>
                    <td data-label="Role">{a.role}</td>
                    <td data-label="Applied">{formatDate(a.appliedDate)}</td>
                    <td data-label="Status"><StatusBadge status={a.status} /></td>
                    <td data-label="Notes" className="notes">{a.notes || '—'}</td>
                    <td className="actions">
                      <button className="btn btn-small" onClick={() => setEditing(a)}>Edit</button>
                      <button className="btn btn-small btn-danger" onClick={() => handleDelete(a)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {editing && (
        <ApplicationForm initial={editing._id ? editing : null} onSave={handleSave} onCancel={() => setEditing(null)} />
      )}
    </>
  );
}
