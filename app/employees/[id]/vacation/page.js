'use client';

import { use, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useHR } from '../../../context';
import { AccrualEngine, dateDiffInDays, parseDate, formatDate, calculateTicketEligibility } from '../../../utils';

export default function VacationPage({ params }) {
  const { id } = use(params);
  const { employees, bookVacation, ready, toast } = useHR();
  const router = useRouter();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [ticketTaken, setTicketTaken] = useState(false);
  const [saving, setSaving] = useState(false);

  const emp = useMemo(() => employees.find(e => e.id === id) || null, [employees, id]);

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

  const calculationDate = start ? start : formatDate(new Date());
  const balance = AccrualEngine.calculateVacationBalance(emp, calculationDate);
  const ticket = calculateTicketEligibility(emp.roleType, emp.joiningDate, calculationDate);

  const submit = async (e) => {
    e.preventDefault();
    if (!start || !end) { toast('Both dates are required.', 'error'); return; }
    const s = parseDate(start), en = parseDate(end);
    if (en < s) { toast('End date must be on or after start date.', 'error'); return; }

    const dur = dateDiffInDays(s, en) + 1;
    const overlap = emp.vacations.some(v => {
      const vs = parseDate(v.startDate), ve = parseDate(v.endDate);
      return s <= ve && en >= vs;
    });
    if (overlap) { toast('This overlaps with existing leave.', 'error'); return; }

    const basic = parseFloat(emp.basicSalary) || 0;
    const phone = parseFloat(emp.phoneAllowance) || 0;
    const food = parseFloat(emp.foodAllowance) || 0;
    const accom = emp.accommodationType === 'self' ? (parseFloat(emp.accommodationAllowance) || 0) : 0;
    const basis = basic + phone + food + accom;
    const dailyRate = basis / 30;

    const availableBalance = Math.max(0, balance);
    const paidDays = Math.min(dur, availableBalance);
    const unpaidDays = Math.max(0, dur - availableBalance);
    const paidAmount = paidDays * dailyRate;
    const netSalary = paidAmount;

    setSaving(true);
    try {
      await bookVacation(emp.id, start, end, dur, {
        leaveSalaryBasis: basis,
        dailyRate,
        paidDays,
        unpaidDays,
        paidAmount,
        netSalary,
        ticketType: ticket.type,
        ticketTaken: ticket.eligible && ticketTaken
      });
      toast(`${dur}-day leave booked${unpaidDays > 0 ? ` (${unpaidDays} unpaid)` : ''} for ${emp.name}.`);
      router.push(`/employees/${emp.id}`);
    } catch (err) {
      setSaving(false);
      toast('Failed to book leave.', 'error');
    }
  };

  return (
    <div className="app-shell">
      <div className="page-card" style={{ maxWidth: 600 }}>
        <div className="page-head">
          <div>
            <h2 className="page-head-title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Book Leave
            </h2>
            <div className="page-head-sub">{emp.name} ({emp.id})</div>
          </div>
          <Link href={`/employees/${emp.id}`} className="btn btn-ghost">← Profile</Link>
        </div>

        <div className="page-body">
          {(() => {
            const basic = parseFloat(emp.basicSalary) || 0;
            const phone = parseFloat(emp.phoneAllowance) || 0;
            const food = parseFloat(emp.foodAllowance) || 0;
            const accom = emp.accommodationType === 'self' ? (parseFloat(emp.accommodationAllowance) || 0) : 0;
            const basis = basic + phone + food + accom;
            const dailyRate = basis / 30;

            let estimatedDuration = 0;
            if (start && end) {
              const s = parseDate(start), en = parseDate(end);
              if (en >= s) {
                estimatedDuration = dateDiffInDays(s, en) + 1;
              }
            }

            return (
              <div className="balance-card">
                <div className="balance-card-head">
                  <span className="lbl">Balance (as of {calculationDate})</span>
                  <span className="val" style={{ color: balance < 0 ? 'var(--red)' : 'var(--green)' }}>{balance.toFixed(2)} days</span>
                </div>
                <div className="balance-card-body calc">
                  <div className="calc-row"><span className="lbl">Monthly Leave Basis</span><span className="val">{basis.toLocaleString()} QAR</span></div>
                  <div className="calc-row"><span className="lbl">Daily Rate (Basis ÷ 30)</span><span className="val">{dailyRate.toFixed(2)} QAR/day</span></div>
                  <div className={`calc-row ${balance < 0 ? 'neg' : 'pos'}`}><span className="lbl">Unused Value</span><span className="val">{(balance * dailyRate).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} QAR</span></div>
                  {estimatedDuration > 0 && (() => {
                    const availableBalance = Math.max(0, balance);
                    const paidDays = Math.min(estimatedDuration, availableBalance);
                    const unpaidDays = Math.max(0, estimatedDuration - availableBalance);
                    const paidAmount = paidDays * dailyRate;

                    return (
                      <>
                        <div className="calc-row rule" style={{ fontWeight: 700, color: 'var(--text-1)' }}>
                          <span>Estimated Leave Salary ({estimatedDuration}d)</span>
                        </div>
                        <div className="calc-row pos"><span className="lbl">Paid Days ({paidDays.toFixed(1)}d × {dailyRate.toFixed(2)})</span><span className="val">+{paidAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} QAR</span></div>
                        {unpaidDays > 0 && (
                          <div className="calc-row"><span className="lbl">Unpaid Leave</span><span className="val" style={{ color: 'var(--amber)' }}>{unpaidDays.toFixed(1)} days</span></div>
                        )}
                        <div className="calc-row div total accent"><span>Net Estimated Salary</span><span className="val">{paidAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} QAR</span></div>
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          })()}

          <div className="ticket-card">
            <div className={`ticket-ico ${ticket.eligible ? '' : 'muted'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2M13 17v2M13 11v2" /></svg>
            </div>
            <div className="ticket-info">
              <div className="k">Annual Air Ticket</div>
              <div className="v">
                {ticket.type}
                <span className={`tag ${ticket.eligible ? 'ok' : 'muted'}`}>{ticket.eligible ? 'Eligible' : 'Not eligible yet'}</span>
              </div>
            </div>
            <label className="switch" title={ticket.eligible ? '' : 'Employee is not eligible for a ticket yet'}>
              <input
                type="checkbox"
                checked={ticket.eligible && ticketTaken}
                disabled={!ticket.eligible}
                onChange={e => setTicketTaken(e.target.checked)}
              />
              <span className="switch-track" />
              <span className="switch-label">Taking this ticket</span>
            </label>
          </div>

          <form onSubmit={submit}>
            <div className="form-grid">
              <div className="field"><label>Start Date <span className="req">*</span></label><input type="date" value={start} onChange={e => setStart(e.target.value)} required /></div>
              <div className="field"><label>End Date <span className="req">*</span></label><input type="date" value={end} min={start || undefined} onChange={e => setEnd(e.target.value)} required /></div>
            </div>

            <p className="form-note">
              Booking leave beyond the accrued balance will result in a negative balance carry-forward.
            </p>

            <div className="form-footer">
              <Link href={`/employees/${emp.id}`} className="btn btn-ghost">Cancel</Link>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Booking…' : 'Book Vacation'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
