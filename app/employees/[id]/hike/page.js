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
      <div className="app-shell" style={{ paddingTop: 80 }}>
        <div className="page-card" style={{ maxWidth: 500, textAlign: 'center' }}>
          <div className="page-body">
            <h2 style={{ marginBottom: 12 }}>Not Found</h2>
            <Link href="/" className="btn btn-primary">Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="form-grid">
            <div className="field"><label>Effective Date *</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
            <div className="field"><label>New Basic Salary (QAR) *</label><input type="number" min="1" value={basic} onChange={e => setBasic(e.target.value)} required /></div>
            <div className="field">
              <label>Accommodation</label>
              <select value={accomType} onChange={e => { setAccomType(e.target.value); if (e.target.value === 'company' || e.target.value === 'other') setAccomAllow('0'); }}>
                <option value="company">Company Provided</option>
                <option value="self">Self (Allowance)</option>
                <option value="other">Other</option>
              </select>
            </div>
            {accomType === 'self' && (
              <div className="field"><label>Accom. Allowance (QAR)</label><input type="number" min="0" value={accomAllow} onChange={e => setAccomAllow(e.target.value)} /></div>
            )}
            <div className="field"><label>Transport (QAR)</label><input type="number" min="0" value={trans} onChange={e => setTrans(e.target.value)} /></div>
            <div className="field"><label>Phone (QAR)</label><input type="number" min="0" value={phone} onChange={e => setPhone(e.target.value)} /></div>
            <div className="field"><label>Food Allowance (QAR)</label><input type="number" min="0" value={food} onChange={e => setFood(e.target.value)} /></div>
            <div className="field span"><label>Reason *</label><input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Annual Promotion, Market Correction" required /></div>
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
