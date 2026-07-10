'use client';

import { use, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useHR } from '../../../context';
import { AccrualEngine, formatDate } from '../../../utils';

export default function EOSPage({ params }) {
  const { id } = use(params);
  const { employees, processEOS, ready, toast, confirm } = useHR();
  const router = useRouter();
  const [date, setDate] = useState(() => formatDate(new Date()));
  const [saving, setSaving] = useState(false);
  const emp = useMemo(() => employees.find(e => e.id === id) || null, [employees, id]);

  const eos = useMemo(() => {
    if (!emp || !date) return null;
    return AccrualEngine.calculateEOS(emp, date);
  }, [emp, date]);

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

  const handleTerminate = async () => {
    if (!eos) return;
    const ok = await confirm({
      title: 'Confirm End of Service',
      message: `Process EOS for ${emp.name}? Net payout: ${eos.netPayout.toFixed(2)} QAR. This marks the employee as Terminated.`,
      confirmLabel: 'Terminate',
      danger: true,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await processEOS(emp.id, date, eos);
      toast(`${emp.name} terminated · Net payout ${eos.netPayout.toLocaleString()} QAR`);
      router.push('/');
    } catch (err) {
      setSaving(false);
      toast('Failed to process EOS.', 'error');
    }
  };

  return (
    <div className="app-shell">
      <div className="page-card" style={{ maxWidth: 620 }}>
        <div className="page-head">
          <div>
            <h2 className="page-head-title" style={{ color: 'var(--red)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              End of Service
            </h2>
            <div className="page-head-sub">{emp.name} ({emp.id})</div>
          </div>
          <Link href={`/employees/${emp.id}`} className="btn btn-ghost">← Profile</Link>
        </div>

        <div className="page-body">
          <div className="field" style={{ marginBottom: 28 }}>
            <label>Termination Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>

          {eos && (
            <>
              <h3 className="section-title" style={{ marginTop: 0 }}>Settlement Breakdown</h3>
              <div className="eos-list">
                <div className="eos-row">
                  <span>Service Duration</span>
                  <span style={{ fontWeight: 700 }}>{eos.tenure.years}y {eos.tenure.months}m {eos.tenure.days}d ({eos.tenure.totalDays} days)</span>
                </div>
                <div className="eos-row">
                  <span>Basic Salary</span>
                  <span style={{ fontWeight: 700 }}>{eos.basicSalary.toLocaleString()} QAR</span>
                </div>
              </div>

              <h3 className="section-title">Gratuity — Art. 54 (Basic Salary)</h3>
              <div className="eos-list">
                <div className="eos-row">
                  <span>Daily Basic Wage</span>
                  <span>{eos.basicSalary.toLocaleString()} ÷ 30 = <strong>{eos.dailyBasicWage.toFixed(2)} QAR</strong></span>
                </div>
                <div className="eos-row">
                  <span>Gratuity Days</span>
                  <span>21 days/yr × {eos.tenureYears} yrs = <strong>{eos.gratuityDays.toFixed(2)} days</strong></span>
                </div>
                <div className="eos-row plus">
                  <span>Gratuity Amount</span>
                  <span style={{ fontWeight: 700 }}>{eos.gratuityAmount.toLocaleString()} QAR</span>
                </div>
              </div>

              <h3 className="section-title">Leave Encashment (Basic + Phone + Food + Accom. if self)</h3>
              {(() => {
                const MSDAY = 86400000;
                const lastReturn = emp.vacations.length > 0
                  ? formatDate(new Date(new Date([...emp.vacations].sort((a, b) => new Date(b.endDate) - new Date(a.endDate))[0].endDate).getTime() + MSDAY))
                  : emp.joiningDate;
                const accrualBasisLabel = emp.vacations.length > 0
                  ? `Day after Last Vacation Return (${lastReturn})`
                  : `Joining Date (${emp.joiningDate})`;
                return (
                  <div className="eos-list">
                    <div className="eos-row">
                      <span>Accrual Starts From</span>
                      <span style={{ fontWeight: 700 }}>{accrualBasisLabel}</span>
                    </div>
                    <div className="eos-row">
                      <span>Monthly Leave Basis</span>
                      <span>{eos.leaveSalaryBasis.toLocaleString()} QAR</span>
                    </div>
                    <div className="eos-row">
                      <span>Daily Leave Wage</span>
                      <span>{eos.leaveSalaryBasis.toLocaleString()} ÷ 30 = <strong>{eos.dailyLeaveWage.toFixed(2)} QAR</strong></span>
                    </div>
                    <div className="eos-row">
                      <span>Unused Leave Balance</span>
                      <span style={{ fontWeight: 700, color: eos.vacationBalance < 0 ? 'var(--red)' : 'var(--green)' }}>{eos.vacationBalance.toFixed(2)} days</span>
                    </div>
                    <div className={`eos-row ${eos.vacationBalance < 0 ? 'minus' : 'plus'}`}>
                      <span>Leave Settlement</span>
                      <span style={{ fontWeight: 700 }}>{eos.vacationBalance < 0 ? '−' : '+'}{Math.abs(eos.vacationSettlement).toLocaleString()} QAR</span>
                    </div>
                  </div>
                );
              })()}

              <div className="eos-list">
                <div className="eos-row total">
                  <span>Net Payout</span>
                  <span style={{ color: 'var(--accent)' }}>{eos.netPayout.toLocaleString()} QAR</span>
                </div>
              </div>

              <div className="info-box">
                <p style={{ fontSize: '.8rem' }}>
                  <strong>EOS Calculation Basis:</strong> Gratuity (Art. 54) is based on <em>basic salary only</em>. Leave Encashment is calculated based on <em>Basic Salary + Phone Allowance</em>, plus <em>Accommodation Allowance</em> only if the accommodation is not provided by the company (Accommodation Type: 'self').
                </p>
              </div>
            </>
          )}

          <div className="form-footer">
            <Link href={`/employees/${emp.id}`} className="btn btn-ghost">Cancel</Link>
            <button className="btn btn-danger" onClick={handleTerminate} disabled={!eos || saving}>{saving ? 'Processing…' : 'Confirm & Terminate'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
