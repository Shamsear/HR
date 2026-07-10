'use client';

import { use, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useHR } from '../../../context';

export default function HikePage({ params }) {
  const { id } = use(params);
  const { employees, applySalaryHike, ready, toast } = useHR();
  const router = useRouter();
  const emp = useMemo(() => employees.find(e => e.id === id) || null, [employees, id]);

  const [date, setDate] = useState('');
  const [basic, setBasic] = useState('');
  const [accomType, setAccomType] = useState('company');
  const [accomAllow, setAccomAllow] = useState('0');
  const [trans, setTrans] = useState('0');
  const [phone, setPhone] = useState('0');
  const [food, setFood] = useState('0');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Prefill with current values once employee loads
  useMemo(() => {
    if (emp) {
      setBasic(String(emp.basicSalary));
      setAccomType(emp.accommodationType);
      setAccomAllow(String(emp.accommodationAllowance));
      setTrans(String(emp.transportAllowance));
      setPhone(String(emp.phoneAllowance));
      setFood(String(emp.foodAllowance || 0));
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

  const oldGross = emp.basicSalary + (emp.accommodationType === 'self' ? emp.accommodationAllowance : 0) + emp.transportAllowance + emp.phoneAllowance + (emp.foodAllowance || 0);
  const newGross =
    (parseFloat(basic) || 0) +
    (accomType === 'self' ? (parseFloat(accomAllow) || 0) : 0) +
    (parseFloat(trans) || 0) +
    (parseFloat(phone) || 0) +
    (parseFloat(food) || 0);
  const delta = newGross - oldGross;
  const pct = oldGross > 0 ? (delta / oldGross * 100) : 0;
  const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

  const submit = async (e) => {
    e.preventDefault();
    const newBasic = parseFloat(basic);
    if (!date || isNaN(newBasic)) { toast('Fill effective date and new basic salary.', 'error'); return; }

    const aa = accomType === 'self' ? (parseFloat(accomAllow) || 0) : 0;
    const ta = parseFloat(trans) || 0;
    const pa = parseFloat(phone) || 0;
    const fa = parseFloat(food) || 0;

    const record = {
      id: `hike-${emp.id}-${Date.now()}`,
      effectiveDate: date,
      oldBasicSalary: emp.basicSalary,
      newBasicSalary: newBasic,
      oldAllowances: { accommodation: emp.accommodationAllowance, transport: emp.transportAllowance, phone: emp.phoneAllowance, food: emp.foodAllowance || 0 },
      newAllowances: { accommodation: aa, transport: ta, phone: pa, food: fa },
      reason: reason || 'Salary Adjustment'
    };

    setSaving(true);
    try {
      await applySalaryHike(emp.id, record, newBasic, accomType, aa, ta, pa, fa);
      toast(`Salary hike applied for ${emp.name}.`);
      router.push(`/employees/${emp.id}`);
    } catch (err) {
      setSaving(false);
      toast('Failed to apply hike.', 'error');
    }
  };

  return (
    <div className="app-shell">
      <div className="page-card" style={{ maxWidth: 680 }}>
        <div className="page-head">
          <div>
            <h2 className="page-head-title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Apply Salary Hike
            </h2>
            <div className="page-head-sub">{emp.name} ({emp.id})</div>
          </div>
          <Link href={`/employees/${emp.id}`} className="btn btn-ghost">← Profile</Link>
        </div>

        <form onSubmit={submit} className="page-body">
          <div className="hike-compare">
            <div className="hike-col">
              <div className="k">Current Gross</div>
              <div className="v">{oldGross.toLocaleString()}<small>QAR</small></div>
            </div>
            <div className="hike-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </div>
            <div className="hike-col after">
              <div className="k">New Gross</div>
              <div className="v">{newGross.toLocaleString()}<small>QAR</small></div>
            </div>
          </div>
          <div className="hike-delta">
            <span className={`chip ${dir}`}>
              {dir === 'up' && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>}
              {dir === 'down' && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>}
              {delta >= 0 ? '+' : '−'}{Math.abs(delta).toLocaleString()} QAR ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
            </span>
          </div>

          <h3 className="form-section"><span className="num">1</span> Effective Date &amp; Reason</h3>
          <div className="form-grid">
            <div className="field"><label>Effective Date <span className="req">*</span></label><input type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
            <div className="field"><label>Reason <span className="req">*</span></label><input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Annual Promotion, Market Correction" required /></div>
          </div>

          <h3 className="form-section"><span className="num">2</span> New Compensation</h3>
          <p className="form-hint">Adjust the figures below. The comparison above updates as you type.</p>
          <div className="form-grid">
            <div className="field"><label>New Basic Salary <span className="req">*</span></label><div className="input-suffix"><input type="number" min="1" value={basic} onChange={e => setBasic(e.target.value)} placeholder="0" inputMode="numeric" required /><span className="suffix">QAR</span></div></div>
            <div className="field">
              <label>Accommodation</label>
              <select value={accomType} onChange={e => { setAccomType(e.target.value); if (e.target.value === 'company' || e.target.value === 'other') setAccomAllow('0'); }}>
                <option value="company">Company Provided</option>
                <option value="self">Self (Allowance)</option>
                <option value="other">Other</option>
              </select>
            </div>
            {accomType === 'self' && (
              <div className="field"><label>Accom. Allowance</label><div className="input-suffix"><input type="number" min="0" value={accomAllow} onChange={e => setAccomAllow(e.target.value)} placeholder="0" inputMode="numeric" /><span className="suffix">QAR</span></div></div>
            )}
            <div className="field"><label>Transport</label><div className="input-suffix"><input type="number" min="0" value={trans} onChange={e => setTrans(e.target.value)} placeholder="0" inputMode="numeric" /><span className="suffix">QAR</span></div></div>
            <div className="field"><label>Phone</label><div className="input-suffix"><input type="number" min="0" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0" inputMode="numeric" /><span className="suffix">QAR</span></div></div>
            <div className="field"><label>Food Allowance</label><div className="input-suffix"><input type="number" min="0" value={food} onChange={e => setFood(e.target.value)} placeholder="0" inputMode="numeric" /><span className="suffix">QAR</span></div></div>
          </div>

          <div className="form-footer">
            <Link href={`/employees/${emp.id}`} className="btn btn-ghost">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Applying…' : 'Apply Hike'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
