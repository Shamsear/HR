'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useHR } from '../../context';

export default function AddEmployeePage() {
  const { addEmployee, toast } = useHR();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [f, setF] = useState({
    name: '', qid: '', qidExpiry: '', passport: '', passportExpiry: '',
    license: '', licenseExpiry: '', joining: '', roleType: 'Staff',
    basic: '', accomType: 'company', accomAllow: '0', trans: '0', phone: '0', food: '0'
  });

  const set = (key) => (e) => setF(p => ({ ...p, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name || !f.qid || !f.joining || !f.basic) { toast('Please fill all required fields.', 'error'); return; }

    setSaving(true);
    const newEmp = {
      id: `EMP-${Date.now().toString().slice(-4)}`,
      name: f.name, qid: f.qid, qidExpiry: f.qidExpiry,
      passportNo: f.passport, passportExpiry: f.passportExpiry,
      licenseNo: f.license, licenseExpiry: f.licenseExpiry,
      joiningDate: f.joining,
      roleType: f.roleType,
      basicSalary: parseFloat(f.basic) || 0,
      accommodationType: f.accomType,
      accommodationAllowance: f.accomType === 'self' ? (parseFloat(f.accomAllow) || 0) : 0,
      transportAllowance: parseFloat(f.trans) || 0,
      phoneAllowance: parseFloat(f.phone) || 0,
      foodAllowance: parseFloat(f.food) || 0,
      vacations: [], salaryHistory: [], status: 'Active'
    };

    try {
      await addEmployee(newEmp);
      toast(`${f.name} added successfully.`);
      router.push('/');
    } catch (err) {
      setSaving(false);
      toast('Failed to create employee.', 'error');
    }
  };

  return (
    <div className="app-shell">
      <div className="page-card" style={{ maxWidth: 780 }}>
        <div className="page-head">
          <div>
            <h2 className="page-head-title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
              New Employee
            </h2>
            <div className="page-head-sub">Create a new employee profile</div>
          </div>
          <Link href="/" className="btn btn-ghost">← Dashboard</Link>
        </div>

        <form onSubmit={submit} className="page-body">
          <h3 className="section-title" style={{ marginTop: 0 }}>Personal Details</h3>
          <div className="form-grid">
            <div className="field"><label>Full Name *</label><input value={f.name} onChange={set('name')} placeholder="Enter name" required /></div>
            <div className="field"><label>QID (Qatar ID) *</label><input value={f.qid} onChange={set('qid')} placeholder="11 digits" required /></div>
            <div className="field"><label>QID Expiry *</label><input type="date" value={f.qidExpiry} onChange={set('qidExpiry')} required /></div>
            <div className="field"><label>Passport No *</label><input value={f.passport} onChange={set('passport')} placeholder="Passport number" required /></div>
            <div className="field"><label>Passport Expiry *</label><input type="date" value={f.passportExpiry} onChange={set('passportExpiry')} required /></div>
            <div className="field"><label>Driving License</label><input value={f.license} onChange={set('license')} placeholder="Optional" /></div>
            <div className="field"><label>License Expiry</label><input type="date" value={f.licenseExpiry} onChange={set('licenseExpiry')} /></div>
            <div className="field"><label>Joining Date *</label><input type="date" value={f.joining} onChange={set('joining')} required /></div>
          </div>

          <h3 className="section-title">Employment Category</h3>
          <div className="form-grid">
            <div className="field">
              <label>Category Type *</label>
              <select value={f.roleType} onChange={set('roleType')}>
                <option value="Staff">Staff</option>
                <option value="Worker">Worker</option>
              </select>
            </div>
          </div>

          <h3 className="section-title">Compensation</h3>
          <div className="form-grid">
            <div className="field"><label>Basic Salary (QAR) *</label><input type="number" min="1" value={f.basic} onChange={set('basic')} required /></div>
            <div className="field">
              <label>Accommodation</label>
              <select value={f.accomType} onChange={set('accomType')}>
                <option value="company">Company Provided</option>
                <option value="self">Self (Allowance)</option>
                <option value="other">Other</option>
              </select>
            </div>
            {f.accomType === 'self' && (
              <div className="field"><label>Accom. Allowance (QAR)</label><input type="number" min="0" value={f.accomAllow} onChange={set('accomAllow')} /></div>
            )}
            <div className="field"><label>Transport (QAR)</label><input type="number" min="0" value={f.trans} onChange={set('trans')} /></div>
            <div className="field"><label>Phone (QAR)</label><input type="number" min="0" value={f.phone} onChange={set('phone')} /></div>
            <div className="field"><label>Food Allowance (QAR)</label><input type="number" min="0" value={f.food} onChange={set('food')} /></div>
          </div>

          <div className="form-footer">
            <Link href="/" className="btn btn-ghost">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Profile'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
