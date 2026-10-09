import { useState } from 'react';

export const STATUSES = ['Applied', 'Assessment', 'Interview', 'Offer', 'Rejected'];

const today = () => new Date().toISOString().slice(0, 10);

// Used for both "add" (no `initial`) and "edit" (`initial` = existing application).
export default function ApplicationForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    company: initial?.company || '',
    role: initial?.role || '',
    jobUrl: initial?.jobUrl || '',
    appliedDate: initial?.appliedDate ? initial.appliedDate.slice(0, 10) : today(),
    status: initial?.status || 'Applied',
    notes: initial?.notes || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function onSubmit(ev) {
    ev.preventDefault();
    setError('');
    if (!form.company.trim() || !form.role.trim()) return setError('Company name and job role are required.');
    if (!form.appliedDate) return setError('Application date is required.');
    if (form.jobUrl.trim() && !/^https?:\/\/\S+$/i.test(form.jobUrl.trim())) {
      return setError('Job URL must start with http:// or https://');
    }
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit} noValidate>
        <h2>{initial ? 'Edit application' : 'Add application'}</h2>
        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <label htmlFor="company">Company name *</label>
        <input id="company" name="company" value={form.company} onChange={onChange} maxLength={150} />

        <label htmlFor="role">Job role *</label>
        <input id="role" name="role" value={form.role} onChange={onChange} maxLength={150} />

        <label htmlFor="jobUrl">Job posting URL</label>
        <input id="jobUrl" name="jobUrl" type="url" value={form.jobUrl} onChange={onChange} placeholder="https://..." />

        <div className="row">
          <div>
            <label htmlFor="appliedDate">Application date *</label>
            <input id="appliedDate" name="appliedDate" type="date" value={form.appliedDate} onChange={onChange} />
          </div>
          <div>
            <label htmlFor="status">Status</label>
            <select id="status" name="status" value={form.status} onChange={onChange}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={3} value={form.notes} onChange={onChange} maxLength={2000} />

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
