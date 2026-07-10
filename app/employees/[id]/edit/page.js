'use client';

import { use, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useHR } from '../../../context';

export default function EditEmployeePage({ params }) {
  const { id } = use(params);
  const { employees, updateEmployee, ready, toast } = useHR();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const emp = useMemo(() => employees.find(e => e.id === id) || null, [employees, id]);

  const [f, setF] = useState(null);

  // Initialise the form once the employee is available
  useMemo(() => {
    if (emp && !f) {
      setF({
        name: emp.name || '',
        qid: emp.qid || '',
        qidExpiry: emp.qidExpiry || '',
        passport: emp.passportNo || '',
        passportExpiry: emp.passportExpiry || '',
        license: emp.licenseNo || '',
        licenseExpiry: emp.licenseExpiry || '',
        joining: emp.joiningDate || '',
        roleType: emp.roleType || 'Staff',
        basic: String(emp.basicSalary ?? ''),
        accomType: emp.accommodationType || 'company',
        accomAllow: String(emp.accommodationAllowance ?? '0'),
        trans: String(emp.transportAllowance ?? '0'),
        phone: String(emp.phoneAllowance ?? '0'),
        food: String(emp.foodAllowance ?? '0'),
        otherAllowance: String(emp.otherAllowance ?? '0'),
      });
    }
  }, [emp]);

  if (!ready) return null;

  if (!emp) {
    return (
      <div className="app-shell">
        <div className="page-card" style={{ maxWidth: 520, margin: '40px auto 0' }}>
          <div className="empty-rich">
            <div className="empty-rich-ico">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <h3>Employee not found</h3>
            <p>No employee exists with ID <strong>{id}</strong>.</p>
            <Link href="/" className="btn btn-primary">← Back to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!f) return null;

  const set = (key) => (e) => setF(p => ({ ...p, [key]: e.target.value }));

  const gross =
    (parseFloat(f.basic) || 0) +
    (f.accomType === 'self' ? (parseFloat(f.accomAllow) || 0) : 0) +
    (parseFloat(f.trans) || 0) +
    (parseFloat(f.phone) || 0) +
    (parseFloat(f.food) || 0) +
    (parseFloat(f.otherAllowance) || 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name || !f.qid || !f.joining || !f.basic) { toast('Please fill all required fields.', 'error'); return; }

    setSaving(true);
    const data = {
      name: f.name,
      qid: f.qid,
      qidExpiry: f.qidExpiry,
      passportNo: f.passport,
      passportExpiry: f.passportExpiry,
      licenseNo: f.license,
      licenseExpiry: f.licenseExpiry,
      joiningDate: f.joining,
      roleType: f.roleType,
      basicSalary: parseFloat(f.basic) || 0,
      accommodationType: f.accomType,
      accommodationAllowance: f.accomType === 'self' ? (parseFloat(f.accomAllow) || 0) : 0,
      transportAllowance: parseFloat(f.trans) || 0,
      phoneAllowance: parseFloat(f.phone) || 0,
      foodAllowance: parseFloat(f.food) || 0,
      otherAllowance: parseFloat(f.otherAllowance) || 0,
    };

    try {
      await updateEmployee(emp.id, data);
      toast(`${f.name} updated successfully.`);
      router.push(`/employees/${emp.id}`);
    } catch (err) {
      setSaving(false);
      toast('Failed to update employee.', 'error');
    }
  };

  return (
    <div className="app-shell">
      <div className="page-card" style={{ maxWidth: 780 }}>
        <div className="page-head">
          <div>
            <h2 className="page-head-title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>
              Edit Employee
            </h2>
            <div className="page-head-sub">{emp.name} ({emp.id})</div>
          </div>
          <Link href={`/employees/${emp.id}`} className="btn btn-ghost">← Profile</Link>
        </div>

        <form onSubmit={submit} className="page-body">
          <h3 className="form-section"><span className="num">1</span> Personal Details</h3>
          <p className="form-hint">Identity and document details. Fields marked <span className="req">*</span> are required.</p>
          <div className="form-grid">
            <div className="field"><label>Full Name <span className="req">*</span></label><input value={f.name} onChange={set('name')} placeholder="Enter full name" required /></div>
            <div className="field"><label>QID (Qatar ID) <span className="req">*</span></label><input value={f.qid} onChange={set('qid')} placeholder="11 digits" inputMode="numeric" maxLength={11} required /></div>
            <div className="field"><label>QID Expiry <span className="req">*</span></label><input type="date" value={f.qidExpiry} onChange={set('qidExpiry')} required /></div>
            <div className="field"><label>Passport No <span className="req">*</span></label><input value={f.passport} onChange={set('passport')} placeholder="Passport number" required /></div>
            <div className="field"><label>Passport Expiry <span className="req">*</span></label><input type="date" value={f.passportExpiry} onChange={set('passportExpiry')} required /></div>
            <div className="field"><label>Driving License</label><input value={f.license} onChange={set('license')} placeholder="Optional" /></div>
            <div className="field"><label>License Expiry</label><input type="date" value={f.licenseExpiry} onChange={set('licenseExpiry')} /></div>
            <div className="field"><label>Joining Date <span className="req">*</span></label><input type="date" value={f.joining} onChange={set('joining')} required /></div>
          </div>

          <h3 className="form-section"><span className="num">2</span> Employment Category</h3>
          <p className="form-hint">Determines vacation accrual rate and annual ticket eligibility.</p>
          <div className="form-grid">
            <div className="field">
              <label>Category Type <span className="req">*</span></label>
              <select value={f.roleType} onChange={set('roleType')}>
                <option value="Staff">Staff</option>
                <option value="Worker">Worker</option>
              </select>
            </div>
          </div>

          <h3 className="form-section"><span className="num">3</span> Compensation</h3>
          <p className="form-hint">Monthly basic salary and allowances in QAR.</p>
          <div className="form-grid">
            <div className="field"><label>Basic Salary <span className="req">*</span></label><div className="input-suffix"><input type="number" min="1" value={f.basic} onChange={set('basic')} placeholder="0" inputMode="numeric" required /><span className="suffix">QAR</span></div></div>
            <div className="field">
              <label>Accommodation</label>
              <select value={f.accomType} onChange={set('accomType')}>
                <option value="company">Company Provided</option>
                <option value="self">Self (Allowance)</option>
                <option value="other">Other</option>
              </select>
            </div>
            {f.accomType === 'self' && (
              <div className="field"><label>Accom. Allowance</label><div className="input-suffix"><input type="number" min="0" value={f.accomAllow} onChange={set('accomAllow')} placeholder="0" inputMode="numeric" /><span className="suffix">QAR</span></div></div>
            )}
            <div className="field"><label>Transport</label><div className="input-suffix"><input type="number" min="0" value={f.trans} onChange={set('trans')} placeholder="0" inputMode="numeric" /><span className="suffix">QAR</span></div></div>
            <div className="field"><label>Phone</label><div className="input-suffix"><input type="number" min="0" value={f.phone} onChange={set('phone')} placeholder="0" inputMode="numeric" /><span className="suffix">QAR</span></div></div>
            <div className="field"><label>Food Allowance</label><div className="input-suffix"><input type="number" min="0" value={f.food} onChange={set('food')} placeholder="0" inputMode="numeric" /><span className="suffix">QAR</span></div></div>
            <div className="field"><label>Other Allowance</label><div className="input-suffix"><input type="number" min="0" value={f.otherAllowance} onChange={set('otherAllowance')} placeholder="0" inputMode="numeric" /><span className="suffix">QAR</span></div></div>
          </div>

          <div className="gross-preview">
            <span className="k">Estimated Monthly Gross</span>
            <span className="v">{gross.toLocaleString()} QAR</span>
          </div>

          <p className="form-note">
            Editing here updates the employee&apos;s current details only. It does not create a salary-hike history record — use <strong>Apply Hike</strong> for tracked pay changes.
          </p>

          <div className="form-footer">
            <Link href={`/employees/${emp.id}`} className="btn btn-ghost">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
