'use client';

import { use, useState, useMemo } from 'react';
import Link from 'next/link';
import { useHR } from '../../context';
import { AccrualEngine, getDocumentExpiryStatus, formatDate, calculateTenure, dateDiffInDays, calculateTicketEligibility } from '../../utils';

const MSDAY = 86400000;

export default function ProfilePage({ params }) {
  const { id } = use(params);
  const { employees, processEOS, ready, toast, confirm } = useHR();
  const [tab, setTab] = useState('general');
  const [eosDate, setEosDate] = useState(() => formatDate(new Date()));
  const today = useMemo(() => formatDate(new Date()), []);
  const emp = useMemo(() => employees.find(e => e.id === id) || null, [employees, id]);

  if (!ready) return null;

  if (!emp) {
    return (
      <div className="app-shell" style={{ paddingTop: 80 }}>
        <div className="page-card" style={{ maxWidth: 500, textAlign: 'center' }}>
          <div className="page-body">
            <h2 style={{ marginBottom: 12 }}>Employee Not Found</h2>
            <p style={{ color: 'var(--text-3)', marginBottom: 24 }}>No employee with ID <strong>{id}</strong>.</p>
            <Link href="/" className="btn btn-primary">Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  const qS = getDocumentExpiryStatus(emp.qidExpiry, today);
  const pS = getDocumentExpiryStatus(emp.passportExpiry, today);
  const lS = emp.licenseNo ? getDocumentExpiryStatus(emp.licenseExpiry, today) : { status: 'active' };
  const warnings = [];
  if (qS.status !== 'active') warnings.push(`QID: ${qS.label}`);
  if (pS.status !== 'active') warnings.push(`Passport: ${pS.label}`);
  if (lS.status !== 'active' && emp.licenseNo) warnings.push(`License: ${lS.label}`);
  const hasDanger = [qS, pS, lS].some(s => s.status === 'expired');

  const basic = parseFloat(emp.basicSalary) || 0;
  const accom = emp.accommodationType === 'self' ? (parseFloat(emp.accommodationAllowance) || 0) : 0;
  const trans = parseFloat(emp.transportAllowance) || 0;
  const phone = parseFloat(emp.phoneAllowance) || 0;
  const food = parseFloat(emp.foodAllowance) || 0;
  const gross = basic + accom + trans + phone + food;

  const balance = AccrualEngine.calculateVacationBalance(emp, today);
  const tenure = calculateTenure(emp.joiningDate, today);

  const lastReturn = emp.vacations.length > 0
    ? formatDate(new Date(new Date([...emp.vacations].sort((a, b) => new Date(b.endDate) - new Date(a.endDate))[0].endDate).getTime() + MSDAY))
    : emp.joiningDate;
  const elapsed = Math.max(0, dateDiffInDays(lastReturn, today));
  const rate = tenure.years >= 5 ? 28 : 21;

  return (
    <div className="app-shell">
      <div className="page-card">
        {/* Hero */}
        <div className="profile-hero">
          <div className="profile-hero-top">
            <div className="profile-id">
              <div className="profile-avatar">{emp.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
              <div style={{ minWidth: 0 }}>
                <div className="profile-name">{emp.name}</div>
                <div className="profile-meta">
                  <span>{emp.id}</span>
                  <span className="dot" />
                  <span>{emp.roleType} Category</span>
                  <span className="dot" />
                  <span className={`badge-pill badge-${emp.status.toLowerCase().replace(' ', '-')}`}>{emp.status}</span>
                </div>
              </div>
            </div>
            <Link href="/" className="btn btn-ghost">← Dashboard</Link>
          </div>

          <div className="profile-metrics">
            <div className="pmetric">
              <span>Leave Balance</span>
              <strong className={balance < 0 ? 'neg' : balance < 5 ? 'warn' : 'pos'}>{balance.toFixed(1)}d</strong>
            </div>
            <div className="pmetric">
              <span>Tenure</span>
              <strong>{tenure.years}y {tenure.months}m</strong>
            </div>
            <div className="pmetric">
              <span>Gross / mo</span>
              <strong>{(gross / 1000).toFixed(1)}k</strong>
            </div>
            <div className="pmetric">
              <span>Documents</span>
              <strong className={hasDanger ? 'neg' : warnings.length ? 'warn' : 'pos'}>{hasDanger ? 'Expired' : warnings.length ? 'Expiring' : 'Valid'}</strong>
            </div>
          </div>
        </div>

        <div className="page-body">
          {/* Document Warnings */}
          {warnings.length > 0 && (
            <div className={`alert ${hasDanger ? 'danger' : 'warning'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <div>
                <strong>Document Warnings</strong>
                <ul style={{ paddingLeft: 18, marginTop: 6 }}>
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="seg">
            {['general', 'vacations', 'salary', 'accrual', 'eos'].map(t => (
              <button key={t} className={`seg-btn ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
                {t === 'general' ? 'General' : t === 'vacations' ? 'Vacations' : t === 'salary' ? 'Salary' : t === 'accrual' ? 'Accrual' : 'End of Service'}
              </button>
            ))}
          </div>

          {/* ── GENERAL ── */}
          {tab === 'general' && (
            <>
              <div className="detail-grid">
                <Cell label="Full Name" value={emp.name} />
                <Cell label="Qatar ID (QID)" value={emp.qid} />
                <Cell label="QID Expiry" value={emp.qidExpiry} />
                <Cell label="Passport" value={emp.passportNo} />
                <Cell label="Passport Expiry" value={emp.passportExpiry} />
                <Cell label="Driving License" value={emp.licenseNo || '—'} />
                <Cell label="License Expiry" value={emp.licenseExpiry || '—'} />
                <Cell label="Joining Date" value={emp.joiningDate} />
                <Cell label="Employment Category" value={emp.roleType} />
                {(() => {
                  const ticket = calculateTicketEligibility(emp.roleType, emp.joiningDate, today);
                  return (
                    <Cell 
                      label="Annual Ticket Eligibility" 
                      value={`${ticket.type}${ticket.eligible ? ' (Eligible)' : ' (Not Eligible yet)'}`} 
                    />
                  );
                })()}
              </div>

              <h3 className="section-title">Salary & Allowances</h3>
              <div className="detail-grid">
                <Cell label="Basic Salary" value={`${basic.toLocaleString()} QAR`} />
                <Cell label="Accommodation" value={emp.accommodationType === 'company' ? 'Company Provided' : emp.accommodationType === 'self' ? 'Self (Allowance)' : 'Other'} />
                <Cell label="Accom. Allowance" value={`${accom.toLocaleString()} QAR`} />
                <Cell label="Transport" value={`${trans.toLocaleString()} QAR`} />
                <Cell label="Phone" value={`${phone.toLocaleString()} QAR`} />
                <Cell label="Food Allowance" value={`${food.toLocaleString()} QAR`} />
                <div className="detail-cell">
                  <div className="detail-cell-label">Total Gross</div>
                  <div className="detail-cell-value" style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem' }}>
                    {gross.toLocaleString()} QAR
                  </div>
                </div>
              </div>

              {emp.status !== 'Terminated' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
                  <Link href={`/employees/${emp.id}/vacation`} className="btn btn-primary">Book Vacation</Link>
                  <Link href={`/employees/${emp.id}/hike`} className="btn btn-ghost">Apply Hike</Link>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => setTab('eos')} className="btn btn-ghost" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>End of Service</button>
                </div>
              )}
            </>
          )}

          {/* ── VACATIONS ── */}
          {tab === 'vacations' && (
            <>
              <div className="ledger-head">
                <h3>Vacation History</h3>
                {emp.status !== 'Terminated' && (
                  <Link href={`/employees/${emp.id}/vacation`} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '.8rem' }}>+ Book Leave</Link>
                )}
              </div>
              <div className="ledger-wrap mobile-hide">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Start</th>
                      <th>End</th>
                      <th>Days</th>
                      <th>Daily Rate</th>
                      <th>Paid / Excess</th>
                      <th>Estimated Payout</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emp.vacations.length === 0
                      ? <tr><td colSpan={7} className="empty-state">No vacations logged.</td></tr>
                      : [...emp.vacations].sort((a, b) => new Date(a.startDate) - new Date(b.startDate)).map(v => {
                          const hasMetrics = typeof v.netSalary === 'number';
                          const fallbackBasis = basic + phone + food + (emp.accommodationType === 'self' ? accom : 0);
                          const fallbackDaily = fallbackBasis / 30;
                          const daily = hasMetrics ? v.dailyRate : fallbackDaily;
                          const paid = hasMetrics ? v.paidDays : v.duration;
                          const excess = hasMetrics ? v.excessDays : 0;
                          const net = hasMetrics ? v.netSalary : (v.duration * daily);
                          return (
                            <tr key={v.id}>
                              <td>{v.startDate}</td>
                              <td>{v.endDate}</td>
                              <td>{v.duration} days</td>
                              <td>{daily.toFixed(2)} QAR</td>
                              <td>
                                <span style={{ color: 'var(--green)', fontWeight: 600 }}>{paid.toFixed(1)}d</span>
                                {excess > 0 && (
                                  <span style={{ color: 'var(--red)', fontWeight: 600 }}> / {excess.toFixed(1)}d</span>
                                )}
                              </td>
                              <td style={{ fontWeight: 700, color: net < 0 ? 'var(--red)' : 'var(--green)' }}>
                                {net < 0 ? '−' : ''}{Math.abs(net).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} QAR
                              </td>
                              <td><span className="badge-pill badge-active">Done</span></td>
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>

              <div className="mobile-card-list mobile-show">
                {emp.vacations.length === 0
                  ? <div className="empty-state">No vacations logged.</div>
                  : [...emp.vacations].sort((a, b) => new Date(a.startDate) - new Date(b.startDate)).map(v => {
                      const hasMetrics = typeof v.netSalary === 'number';
                      const fallbackBasis = basic + phone + food + (emp.accommodationType === 'self' ? accom : 0);
                      const fallbackDaily = fallbackBasis / 30;
                      const daily = hasMetrics ? v.dailyRate : fallbackDaily;
                      const paid = hasMetrics ? v.paidDays : v.duration;
                      const excess = hasMetrics ? v.excessDays : 0;
                      const net = hasMetrics ? v.netSalary : (v.duration * daily);
                      return (
                        <div key={v.id} className="detail-mini-card">
                          <div className="detail-mini-row">
                            <span className="detail-mini-label">Period</span>
                            <span className="detail-mini-value">{v.startDate} → {v.endDate}</span>
                          </div>
                          <div className="detail-mini-row">
                            <span className="detail-mini-label">Duration</span>
                            <span className="detail-mini-value">{v.duration} days</span>
                          </div>
                          <div className="detail-mini-row">
                            <span className="detail-mini-label">Daily Rate</span>
                            <span className="detail-mini-value">{daily.toFixed(2)} QAR</span>
                          </div>
                          <div className="detail-mini-row">
                            <span className="detail-mini-label">Paid / Excess</span>
                            <span className="detail-mini-value">
                              <span style={{ color: 'var(--green)', fontWeight: 600 }}>{paid.toFixed(1)}d</span>
                              {excess > 0 && <span style={{ color: 'var(--red)', fontWeight: 600 }}> / {excess.toFixed(1)}d excess</span>}
                            </span>
                          </div>
                          <div className="detail-mini-row">
                            <span className="detail-mini-label">Payout</span>
                            <span className="detail-mini-value" style={{ fontWeight: 700, color: net < 0 ? 'var(--red)' : 'var(--green)' }}>
                              {net < 0 ? '−' : ''}{Math.abs(net).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} QAR
                            </span>
                          </div>
                          <div style={{ marginTop: 8 }}><span className="badge-pill badge-active">Done</span></div>
                        </div>
                      );
                    })}
              </div>
            </>
          )}

          {/* ── SALARY ── */}
          {tab === 'salary' && (
            <>
              <div className="ledger-head">
                <h3>Salary Hike History</h3>
                {emp.status !== 'Terminated' && (
                  <Link href={`/employees/${emp.id}/hike`} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '.8rem' }}>+ Apply Hike</Link>
                )}
              </div>
              <div className="ledger-wrap mobile-hide">
                <table className="tbl">
                  <thead><tr><th>Effective</th><th>Gross Change</th><th>% Increase</th><th>Reason</th></tr></thead>
                  <tbody>
                    {(!emp.salaryHistory || emp.salaryHistory.length === 0)
                      ? <tr><td colSpan={4} className="empty-state">No hikes recorded.</td></tr>
                      : emp.salaryHistory.map(h => {
                        const oldG = h.oldBasicSalary + (h.oldAllowances?.accommodation || 0) + (h.oldAllowances?.transport || 0) + (h.oldAllowances?.phone || 0) + (h.oldAllowances?.food || 0);
                        const newG = h.newBasicSalary + (h.newAllowances?.accommodation || 0) + (h.newAllowances?.transport || 0) + (h.newAllowances?.phone || 0) + (h.newAllowances?.food || 0);
                        const pct = ((newG - oldG) / oldG * 100).toFixed(1);
                        return (
                          <tr key={h.id}>
                            <td>{h.effectiveDate}</td>
                            <td>{oldG.toLocaleString()} → {newG.toLocaleString()} QAR</td>
                            <td style={{ color: 'var(--green)', fontWeight: 700 }}>+{pct}%</td>
                            <td>{h.reason}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="mobile-card-list mobile-show">
                {(!emp.salaryHistory || emp.salaryHistory.length === 0)
                  ? <div className="empty-state">No hikes recorded.</div>
                  : emp.salaryHistory.map(h => {
                      const oldG = h.oldBasicSalary + (h.oldAllowances?.accommodation || 0) + (h.oldAllowances?.transport || 0) + (h.oldAllowances?.phone || 0) + (h.oldAllowances?.food || 0);
                      const newG = h.newBasicSalary + (h.newAllowances?.accommodation || 0) + (h.newAllowances?.transport || 0) + (h.newAllowances?.phone || 0) + (h.newAllowances?.food || 0);
                      const pct = ((newG - oldG) / oldG * 100).toFixed(1);
                      return (
                        <div key={h.id} className="detail-mini-card">
                          <div className="detail-mini-row">
                            <span className="detail-mini-label">Effective Date</span>
                            <span className="detail-mini-value">{h.effectiveDate}</span>
                          </div>
                          <div className="detail-mini-row">
                            <span className="detail-mini-label">Old Gross</span>
                            <span className="detail-mini-value">{oldG.toLocaleString()} QAR</span>
                          </div>
                          <div className="detail-mini-row">
                            <span className="detail-mini-label">New Gross</span>
                            <span className="detail-mini-value" style={{ color: 'var(--green)', fontWeight: 600 }}>{newG.toLocaleString()} QAR</span>
                          </div>
                          <div className="detail-mini-row">
                            <span className="detail-mini-label">Increase</span>
                            <span className="detail-mini-value" style={{ color: 'var(--green)', fontWeight: 700 }}>+{pct}%</span>
                          </div>
                          <div className="detail-mini-row">
                            <span className="detail-mini-label">Reason</span>
                            <span className="detail-mini-value">{h.reason}</span>
                          </div>
                        </div>
                      );
                    })}
              </div>
            </>
          )}

          {/* ── ACCRUAL ── */}
          {tab === 'accrual' && (
            <>
              <div style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', padding: 22, borderRadius: 'var(--radius)', marginBottom: 28, fontSize: '.88rem', lineHeight: 1.6 }}>
                <p><strong>How it works:</strong></p>
                <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li>Accrual starts from <strong>Joining Date</strong> or day after <strong>Last Vacation Return</strong>.</li>
                  <li><strong>First 5 years:</strong> 21 days/year</li>
                  <li><strong>After 5 years:</strong> 28 days/year</li>
                  <li>Periods crossing the 5-year anniversary are dynamically split.</li>
                  <li>Over-limit bookings create a negative carry-forward balance.</li>
                </ul>
              </div>

              <h3 className="section-title">Leave Salary Basis (Basic + Phone + Food + Accom. if self)</h3>
              {(() => {
                const basis = basic + phone + food + (emp.accommodationType === 'self' ? accom : 0);
                const dailyRate = basis / 30;
                const totalAccrued = AccrualEngine.calculateAccruedBetween(new Date(emp.joiningDate), new Date(emp.joiningDate), new Date(today));
                const totalTaken = emp.vacations.reduce((sum, v) => sum + v.duration, 0);
                const netBalance = totalAccrued - totalTaken;
                const unusedValue = netBalance * dailyRate;
                return (
                  <>
                    <div className="detail-grid" style={{ marginBottom: 16 }}>
                      <Cell label="Monthly Leave Basis" value={`${basis.toLocaleString()} QAR`} />
                      <Cell label="Daily Leave Rate" value={`${dailyRate.toFixed(2)} QAR/day`} />
                      <div className="detail-cell">
                        <div className="detail-cell-label">Current Unused Value</div>
                        <div className="detail-cell-value" style={{ color: netBalance < 0 ? 'var(--red)' : 'var(--green)' }}>
                          {netBalance < 0 ? '−' : ''}{Math.abs(unusedValue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} QAR
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', padding: 18, borderRadius: 'var(--radius)', marginBottom: 28, fontSize: '.88rem', lineHeight: 1.6 }}>
                      <strong style={{ display: 'block', marginBottom: 8, fontSize: '.9rem' }}>Leave Balance Breakdown & Value Formula:</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Total Earned (Accrued since joining):</span>
                          <strong>{totalAccrued.toFixed(2)} days</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--red)' }}>
                          <span>Total Taken (Vacations booked):</span>
                          <strong>- {totalTaken} days</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 6, fontWeight: 700, color: netBalance < 0 ? 'var(--red)' : 'var(--green)' }}>
                          <span>Net Balance (Unused days):</span>
                          <span>{netBalance.toFixed(2)} days</span>
                        </div>
                      </div>
                      
                      <strong>Current Unused Value Calculation:</strong>
                      <div style={{ fontFamily: 'monospace', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4, fontSize: '.8rem' }}>
                        <div>Monthly Basis = {basic.toLocaleString()} (Basic) + {phone.toLocaleString()} (Phone) + {food.toLocaleString()} (Food) {emp.accommodationType === 'self' ? `+ ${accom.toLocaleString()} (Accommodation)` : '+ 0 (Accommodation by Company)'} = {basis.toLocaleString()} QAR</div>
                        <div>Daily Rate = {basis.toLocaleString()} ÷ 30 days = {dailyRate.toFixed(2)} QAR/day</div>
                        <div>Unused Value = {netBalance.toFixed(2)} days (Net Balance) × {dailyRate.toFixed(2)} QAR/day = {unusedValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} QAR</div>
                      </div>
                    </div>
                  </>
                );
              })()}

              <h3 className="section-title">Current Metrics</h3>
              <div className="detail-grid">
                <Cell label="Accrual Start" value={lastReturn} />
                <Cell label="Elapsed Days" value={`${elapsed} days`} />
                <Cell label="Current Rate" value={`${rate} days/year`} />
                <div className="detail-cell">
                  <div className="detail-cell-label">Net Balance</div>
                  <div className="detail-cell-value" style={{ color: balance < 0 ? 'var(--red)' : 'var(--green)', fontWeight: 800, fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
                    {balance.toFixed(2)} days
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── END OF SERVICE (EOS) ── */}
          {tab === 'eos' && (
            <>
              {emp.status === 'Terminated' ? (
                <div style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', padding: 22, borderRadius: 'var(--radius)', textAlign: 'center' }}>
                  <h3 style={{ color: 'var(--red)', marginBottom: 8 }}>Employee is Terminated</h3>
                  <p style={{ color: 'var(--text-3)' }}>This profile was deactivated on <strong>{emp.endDate}</strong>.</p>
                </div>
              ) : (
                <div>
                  <div className="field" style={{ marginBottom: 28 }}>
                    <label>Termination Date *</label>
                    <input type="date" value={eosDate} onChange={e => setEosDate(e.target.value)} required />
                  </div>

                  {(() => {
                    const eos = AccrualEngine.calculateEOS(emp, eosDate);
                    if (!eos) return null;

                    const lastReturnDate = emp.vacations.length > 0
                      ? formatDate(new Date(new Date([...emp.vacations].sort((a, b) => new Date(b.endDate) - new Date(a.endDate))[0].endDate).getTime() + MSDAY))
                      : emp.joiningDate;
                    const accrualBasisLabel = emp.vacations.length > 0
                      ? `Day after Last Vacation Return (${lastReturnDate})`
                      : `Joining Date (${emp.joiningDate})`;

                    const confirmTermination = async () => {
                      const ok = await confirm({
                        title: 'Confirm End of Service',
                        message: `Process EOS for ${emp.name}? Net payout: ${eos.netPayout.toLocaleString()} QAR. This profile will be marked as Terminated.`,
                        confirmLabel: 'Terminate',
                        danger: true,
                      });
                      if (!ok) return;
                      await processEOS(emp.id, eosDate, eos);
                      toast(`${emp.name} terminated · Net payout ${eos.netPayout.toLocaleString()} QAR`);
                      setTab('general');
                    };

                    return (
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

                        <div className="eos-list">
                          <div className="eos-row total">
                            <span>Net Payout</span>
                            <span style={{ color: 'var(--accent)' }}>{eos.netPayout.toLocaleString()} QAR</span>
                          </div>
                        </div>

                        <div style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', padding: 18, borderRadius: 'var(--radius)', marginBottom: 28 }}>
                          <p style={{ fontSize: '.8rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                            <strong>EOS Calculation Basis:</strong> Gratuity (Art. 54) is based on <em>basic salary only</em>. Leave Encashment is calculated based on <em>Basic Salary + Phone Allowance + Food Allowance</em>, plus <em>Accommodation Allowance</em> only if Accommodation Type is 'self'.
                          </p>
                        </div>

                        <div className="form-footer" style={{ marginTop: 0, paddingTop: 16 }}>
                          <button className="btn btn-danger" style={{ width: '100%' }} onClick={confirmTermination}>Confirm & Terminate Employee</button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value }) {
  return (
    <div className="detail-cell">
      <div className="detail-cell-label">{label}</div>
      <div className="detail-cell-value">{value}</div>
    </div>
  );
}
