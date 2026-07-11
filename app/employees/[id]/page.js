'use client';

import { use, useState, useMemo } from 'react';
import Link from 'next/link';
import { useHR } from '../../context';
import { AccrualEngine, getDocumentExpiryStatus, formatDate, calculateTenure, dateDiffInDays, calculateTicketEligibility } from '../../utils';

const MSDAY = 86400000;

export default function ProfilePage({ params }) {
  const { id } = use(params);
  const { employees, processEOS, ready, toast, confirm, revertAction, auditLogs } = useHR();
  const [tab, setTab] = useState('general');
  const [eosDate, setEosDate] = useState(() => formatDate(new Date()));
  const today = useMemo(() => formatDate(new Date()), []);
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
            <p>No employee exists with ID <strong>{id}</strong>. It may have been removed.</p>
            <Link href="/" className="btn btn-primary">← Back to Dashboard</Link>
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
  const other = parseFloat(emp.otherAllowance) || 0;
  const gross = basic + accom + trans + phone + food + other;

  const balance = AccrualEngine.calculateVacationBalance(emp, today);
  const tenure = calculateTenure(emp.joiningDate, today);

  const lastReturn = emp.vacations.length > 0
    ? formatDate(new Date(new Date([...emp.vacations].sort((a, b) => new Date(b.endDate) - new Date(a.endDate))[0].endDate).getTime() + MSDAY))
    : emp.joiningDate;
  const elapsed = Math.max(0, dateDiffInDays(lastReturn, today));
  const rate = tenure.years >= 5 ? 28 : 21;

  const isOverstay = emp.status === 'On Leave' && emp.vacations.some(v => {
    const end = new Date(v.endDate);
    return new Date(today) > end;
  });

  const timelineEvents = useMemo(() => {
    if (!emp) return [];

    const events = [];

    // 1. Initial State (Joining)
    const initialHike = emp.salaryHistory && emp.salaryHistory.length > 0
      ? [...emp.salaryHistory].sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate))[0]
      : null;

    const initialBasic = initialHike ? initialHike.oldBasicSalary : emp.basicSalary;
    const initialAllowances = initialHike ? initialHike.oldAllowances : {
      accommodation: emp.accommodationType === 'self' ? emp.accommodationAllowance : 0,
      transport: emp.transportAllowance,
      phone: emp.phoneAllowance,
      food: emp.foodAllowance,
      other: emp.otherAllowance
    };
    const initialGross = initialBasic + (initialAllowances?.accommodation || 0) + (initialAllowances?.transport || 0) + (initialAllowances?.phone || 0) + (initialAllowances?.food || 0) + (initialAllowances?.other || 0);

    events.push({
      date: emp.joiningDate,
      type: 'join',
      title: 'Employment Commenced',
      sub: 'Employee joined the company with initial contract packages.',
      basic: initialBasic,
      allowances: initialAllowances,
      gross: initialGross
    });

    // 2. Hikes
    if (emp.salaryHistory && emp.salaryHistory.length > 0) {
      emp.salaryHistory.forEach(h => {
        const oldG = h.oldBasicSalary + (h.oldAllowances?.accommodation || 0) + (h.oldAllowances?.transport || 0) + (h.oldAllowances?.phone || 0) + (h.oldAllowances?.food || 0) + (h.oldAllowances?.other || 0);
        const newG = h.newBasicSalary + (h.newAllowances?.accommodation || 0) + (h.newAllowances?.transport || 0) + (h.newAllowances?.phone || 0) + (h.newAllowances?.food || 0) + (h.newAllowances?.other || 0);
        const pct = oldG > 0 ? ((newG - oldG) / oldG * 100) : 0;
        const diff = newG - oldG;

        // Try to find matching audit log for revert
        const matchingLog = auditLogs && auditLogs.find(l => 
          l.actionType === 'APPLY_HIKE' && 
          l.employeeId === emp.id && 
          l.details?.hikeId === h.id && 
          !l.reverted
        );

        events.push({
          date: h.effectiveDate,
          type: 'hike',
          id: h.id,
          title: `Salary Hike: ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
          sub: h.reason || 'Salary Adjustment',
          oldBasic: h.oldBasicSalary,
          newBasic: h.newBasicSalary,
          oldAllowances: h.oldAllowances,
          newAllowances: h.newAllowances,
          oldGross: oldG,
          newGross: newG,
          pct,
          diff,
          auditLogId: matchingLog ? matchingLog.id : null
        });
      });
    }

    // 3. Termination
    if (emp.status === 'Terminated' && emp.endDate) {
      events.push({
        date: emp.endDate,
        type: 'eos',
        title: 'Employment Terminated',
        sub: 'Processed End-of-Service and calculated settlement payout.',
        payout: emp.eosDetails ? emp.eosDetails.netPayout : null,
        tenure: emp.eosDetails ? emp.eosDetails.tenure : null
      });
    }

    // Sort chronologically
    return events.sort((a, b) => {
      const diff = new Date(a.date) - new Date(b.date);
      if (diff !== 0) return diff;
      // Secondary sorting: join, then hike, then eos
      const order = { join: 1, hike: 2, eos: 3 };
      return order[a.type] - order[b.type];
    });
  }, [emp, auditLogs]);

  const renewalLogs = useMemo(() => {
    if (!auditLogs) return [];
    return auditLogs
      .filter(l => l.actionType === 'RENEW_DOCUMENT' && l.employeeId === emp.id)
      .sort((a, b) => {
        const timeA = new Date(a.details?.updatedAt || a.created_at || 0).getTime();
        const timeB = new Date(b.details?.updatedAt || b.created_at || 0).getTime();
        return timeB - timeA;
      });
  }, [auditLogs, emp.id]);

  const triggerRevert = async (logId) => {
    const ok = await confirm({
      title: 'Revert Salary Hike',
      message: 'Are you sure you want to revert this salary hike? The employee\'s basic salary and allowances will be restored to their previous values, and this history record will be deleted.',
      confirmLabel: 'Revert Hike',
      danger: true
    });
    if (!ok) return;

    const success = await revertAction(logId);
    if (success) {
      toast('Salary hike reverted.');
    } else {
      toast('Failed to revert hike.', 'error');
    }
  };

  const triggerRevertDoc = async (logId, docType) => {
    const ok = await confirm({
      title: `Revert ${docType} Renewal`,
      message: `Are you sure you want to revert this ${docType} renewal? The expiration date will be restored to its previous value.`,
      confirmLabel: 'Revert Renewal',
      danger: true
    });
    if (!ok) return;

    const success = await revertAction(logId);
    if (success) {
      toast(`${docType} renewal reverted.`);
    } else {
      toast('Failed to revert renewal.', 'error');
    }
  };

  return (
    <div className="app-shell">
      {isOverstay && (
        <div className="alert danger" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>Overstay Alert (Salary Calculations Paused)</span>
          </div>
          <div style={{ fontSize: '.85rem' }}>
            This employee has not returned from vacation on schedule. Salary calculations and basic projections are flagged and paused.
          </div>
        </div>
      )}

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
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {emp.status !== 'Terminated' && (
                <Link href={`/employees/${emp.id}/edit`} className="btn btn-ghost">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>
                  Edit
                </Link>
              )}
              <Link href="/" className="btn btn-ghost">← Dashboard</Link>
            </div>
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
                <DocCell label="QID Expiry" date={emp.qidExpiry} status={qS.status} empId={emp.id} docType="QID" />
                <Cell label="Passport" value={emp.passportNo} />
                <DocCell label="Passport Expiry" date={emp.passportExpiry} status={pS.status} empId={emp.id} docType="Passport" />
                <Cell label="Driving License" value={emp.licenseNo || '—'} />
                {emp.licenseNo
                  ? <DocCell label="License Expiry" date={emp.licenseExpiry} status={lS.status} empId={emp.id} docType="License" />
                  : <Cell label="License Expiry" value="—" />}
                <Cell label="Joining Date" value={emp.joiningDate} />
                <Cell label="Employment Category" value={emp.roleType} />
                {(() => {
                  const ticket = calculateTicketEligibility(emp.roleType, emp.joiningDate, today);
                  return (
                    <div className="detail-cell">
                      <div className="detail-cell-label">Annual Ticket Eligibility</div>
                      <div className="detail-cell-value doc-val">
                        {ticket.type}
                        <span className={`tag ${ticket.eligible ? 'ok' : 'muted'}`}>{ticket.eligible ? 'Eligible' : 'Not yet'}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <h3 className="section-title">Salary &amp; Allowances</h3>
              <div className="detail-grid">
                <Cell label="Basic Salary" value={`${basic.toLocaleString()} QAR`} />
                <Cell label="Accommodation" value={emp.accommodationType === 'company' ? 'Company Provided' : emp.accommodationType === 'self' ? 'Self (Allowance)' : 'Other'} />
                <Cell label="Accom. Allowance" value={`${accom.toLocaleString()} QAR`} />
                <Cell label="Transport" value={`${trans.toLocaleString()} QAR`} />
                <Cell label="Phone" value={`${phone.toLocaleString()} QAR`} />
                <Cell label="Food Allowance" value={`${food.toLocaleString()} QAR`} />
                <Cell label="Other Allowance" value={`${other.toLocaleString()} QAR`} />
                <div className="detail-cell accent">
                  <div className="detail-cell-label">Total Gross</div>
                  <div className="detail-cell-value">{gross.toLocaleString()} QAR</div>
                </div>
              </div>

              {/* Document Renewal Logs */}
              <h3 className="section-title" style={{ marginTop: 24 }}>Document Renewal History</h3>
              {renewalLogs.length === 0 ? (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px', textAlign: 'center', fontSize: '.86rem', color: 'var(--text-3)' }}>
                  No document renewals have been processed for this employee yet.
                </div>
              ) : (
                <div className="ledger-wrap" style={{ marginTop: 12 }}>
                  <table className="tbl" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th>Renewed On</th>
                        <th>Old Expiry</th>
                        <th>New Expiry</th>
                        <th style={{ textAlign: 'right' }}>Status / Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renewalLogs.map((log) => {
                        const dateStr = log.details?.updatedAt 
                          ? new Date(log.details.updatedAt).toLocaleString()
                          : new Date(log.created_at).toLocaleString();
                        return (
                          <tr key={log.id}>
                            <td><strong>{log.details?.docType}</strong></td>
                            <td style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>{dateStr}</td>
                            <td style={{ color: 'var(--text-3)' }}>{log.details?.oldExpiryDate || '—'}</td>
                            <td><strong style={{ color: 'var(--green)' }}>{log.details?.newExpiryDate}</strong></td>
                            <td style={{ textAlign: 'right' }}>
                              {log.reverted ? (
                                <span className="tag muted" style={{ fontSize: '.7rem' }}>Reverted</span>
                              ) : (
                                <button
                                  onClick={() => triggerRevertDoc(log.id, log.details?.docType)}
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: 'var(--red)', fontSize: '.72rem', padding: '3px 8px', cursor: 'pointer' }}
                                >
                                  Revert
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
                  <Link href={`/employees/${emp.id}/vacation`} className="btn btn-primary btn-sm">+ Book Leave</Link>
                )}
              </div>

              {emp.vacations.length === 0 ? (
                <div className="empty-rich">
                  <div className="empty-rich-ico">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  </div>
                  <h3>No vacations logged</h3>
                  <p>This employee hasn&apos;t taken any leave yet. Book their first vacation to start the record.</p>
                  {emp.status !== 'Terminated' && <Link href={`/employees/${emp.id}/vacation`} className="btn btn-primary">+ Book Leave</Link>}
                </div>
              ) : (() => {
                const sorted = [...emp.vacations].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
                const totalDays = emp.vacations.reduce((s, v) => s + v.duration, 0);
                const totalUnpaid = emp.vacations.reduce((s, v) => s + (v.unpaidDays ?? v.excessDays ?? 0), 0);
                const totalPaid = emp.vacations.reduce((s, v) => s + Math.max(0, typeof v.netSalary === 'number' ? v.netSalary : 0), 0);
                const ticketsTaken = emp.vacations.filter(v => v.ticketTaken).length;
                return (
                  <>
                    {(() => {
                      const now = new Date(today);
                      const activeVacation = sorted.find(v => {
                        const start = new Date(v.startDate);
                        const end = new Date(v.endDate);
                        return now >= start && now <= end;
                      });

                      if (activeVacation) {
                        const end = new Date(activeVacation.endDate);
                        const diffTime = end - now;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        // Arrive back date is the day after the vacation end date
                        const returnDate = new Date(end);
                        returnDate.setDate(returnDate.getDate() + 1);
                        const returnStr = returnDate.toISOString().split('T')[0];

                        return (
                          <div className="alert warning" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              <span>Ongoing Leave Alert</span>
                            </div>
                            <div style={{ fontSize: '.85rem' }}>
                              This employee is currently on leave. <strong>{diffDays} days</strong> left. Expected return date: <strong>{returnStr}</strong>.
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="ledger-summary">
                      <div className="ledger-stat"><span className="k">Trips</span><span className="v">{emp.vacations.length}</span></div>
                      <div className="ledger-stat"><span className="k">Total Days</span><span className="v">{totalDays}<small>d</small></span></div>
                      <div className="ledger-stat"><span className="k">Unpaid Days</span><span className={`v ${totalUnpaid > 0 ? 'warn' : ''}`}>{totalUnpaid}<small>d</small></span></div>
                      <div className="ledger-stat"><span className="k">Tickets Taken</span><span className="v">{ticketsTaken}</span></div>
                      <div className="ledger-stat"><span className="k">Total Leave Salary</span><span className="v pos">{totalPaid.toLocaleString(undefined, {maximumFractionDigits: 0})}<small>QAR</small></span></div>
                    </div>

                    <div className="ledger-wrap mobile-hide">
                      <table className="tbl">
                        <thead>
                          <tr><th>Start</th><th>End</th><th>Days</th><th>Daily Rate</th><th>Paid / Unpaid</th><th>Leave Salary</th><th>Ticket</th><th>Extension</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                          {sorted.map(v => {
                            const hasMetrics = typeof v.netSalary === 'number';
                            const fallbackBasis = basic + phone + food + (emp.accommodationType === 'self' ? accom : 0);
                            const fallbackDaily = fallbackBasis / 30;
                            const daily = hasMetrics ? v.dailyRate : fallbackDaily;
                            const paid = hasMetrics ? v.paidDays : v.duration;
                            const unpaid = v.unpaidDays ?? v.excessDays ?? 0;
                            const net = Math.max(0, hasMetrics ? v.netSalary : (v.duration * daily));
                            return (
                              <tr key={v.id}>
                                <td>{v.startDate}</td>
                                <td>{v.endDate}</td>
                                <td>{v.duration} days</td>
                                <td>{daily.toFixed(2)} QAR</td>
                                <td>
                                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>{paid.toFixed(1)}d</span>
                                  {unpaid > 0 && <span style={{ color: 'var(--amber)', fontWeight: 600 }}> / {unpaid.toFixed(1)}d unpaid</span>}
                                </td>
                                <td style={{ fontWeight: 700, color: 'var(--green)' }}>
                                  {net.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} QAR
                                </td>
                                <td>{v.ticketTaken
                                  ? <span className="tag ok">{(v.ticketType || 'Ticket').replace(' Ticket', '')}</span>
                                  : <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                                <td>
                                  <ExtendControl vacationId={v.id} currentExt={v.extensionDays || 0} />
                                </td>
                                <td><span className="badge-pill badge-active">Done</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="mobile-card-list mobile-show">
                      {sorted.map(v => {
                        const hasMetrics = typeof v.netSalary === 'number';
                        const fallbackBasis = basic + phone + food + (emp.accommodationType === 'self' ? accom : 0);
                        const fallbackDaily = fallbackBasis / 30;
                        const daily = hasMetrics ? v.dailyRate : fallbackDaily;
                        const paid = hasMetrics ? v.paidDays : v.duration;
                        const unpaid = v.unpaidDays ?? v.excessDays ?? 0;
                        const net = Math.max(0, hasMetrics ? v.netSalary : (v.duration * daily));
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
                              <span className="detail-mini-label">Paid / Unpaid</span>
                              <span className="detail-mini-value">
                                <span style={{ color: 'var(--green)', fontWeight: 600 }}>{paid.toFixed(1)}d</span>
                                {unpaid > 0 && <span style={{ color: 'var(--amber)', fontWeight: 600 }}> / {unpaid.toFixed(1)}d unpaid</span>}
                              </span>
                            </div>
                            <div className="detail-mini-row">
                              <span className="detail-mini-label">Leave Salary</span>
                              <span className="detail-mini-value" style={{ fontWeight: 700, color: 'var(--green)' }}>
                                {net.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} QAR
                              </span>
                            </div>
                            <div className="detail-mini-row">
                              <span className="detail-mini-label">Air Ticket</span>
                              <span className="detail-mini-value">{v.ticketTaken
                                ? <span className="tag ok">{v.ticketType || 'Ticket'}</span>
                                : 'Not taken'}</span>
                            </div>
                            <div className="detail-mini-row" style={{ marginTop: 4 }}>
                              <span className="detail-mini-label">Extension</span>
                              <div className="detail-mini-value">
                                <ExtendControl vacationId={v.id} currentExt={v.extensionDays || 0} />
                              </div>
                            </div>
                            <div style={{ marginTop: 8 }}><span className="badge-pill badge-active">Done</span></div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </>
          )}

          {/* ── SALARY ── */}
          {tab === 'salary' && (
            <>
              <div className="ledger-head" style={{ marginBottom: 20 }}>
                <h3>Compensation Timeline</h3>
                {emp.status !== 'Terminated' && (
                  <Link href={`/employees/${emp.id}/hike`} className="btn btn-primary btn-sm">+ Apply Hike</Link>
                )}
              </div>

              <div className="timeline-container">
                {timelineEvents.map((e, idx) => {
                  return (
                    <div key={idx} className="timeline-item">
                      <div className={`timeline-dot ${e.type}`} />
                      <div className="timeline-meta">
                        <span className="timeline-date">{e.date}</span>
                        <span className={`timeline-type ${e.type}`}>
                          {e.type === 'join' ? 'Joining' : e.type === 'hike' ? 'Salary Hike' : 'Termination'}
                        </span>
                      </div>
                      
                      <div className="timeline-card">
                        <h4 className="timeline-card-title">{e.title}</h4>
                        <p className="timeline-card-sub">{e.sub}</p>

                        {/* Event details based on type */}
                        {e.type === 'join' && (
                          <div className="timeline-grid">
                            <div className="timeline-grid-item"><span>Basic Salary</span><strong>{e.basic.toLocaleString()} QAR</strong></div>
                            <div className="timeline-grid-item"><span>Transport</span><strong>{(e.allowances?.transport || 0).toLocaleString()} QAR</strong></div>
                            <div className="timeline-grid-item"><span>Phone</span><strong>{(e.allowances?.phone || 0).toLocaleString()} QAR</strong></div>
                            <div className="timeline-grid-item"><span>Food</span><strong>{(e.allowances?.food || 0).toLocaleString()} QAR</strong></div>
                            <div className="timeline-grid-item"><span>Other</span><strong>{(e.allowances?.other || 0).toLocaleString()} QAR</strong></div>
                            <div className="timeline-grid-item"><span>Initial Gross</span><strong style={{ color: 'var(--accent)' }}>{e.gross.toLocaleString()} QAR</strong></div>
                          </div>
                        )}

                        {e.type === 'hike' && (
                          <div>
                            <div className="timeline-compare" style={{ marginBottom: 12 }}>
                              <span className="old">{e.oldGross.toLocaleString()} QAR</span>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-3)' }}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                              <span className="new">{e.newGross.toLocaleString()} QAR</span>
                              <span className={`diff ${e.diff >= 0 ? 'up' : 'down'}`}>
                                {e.diff >= 0 ? '+' : ''}{e.diff.toLocaleString()} QAR
                              </span>
                            </div>

                            <div className="timeline-grid">
                              <div className="timeline-grid-item">
                                <span>Basic Salary</span>
                                <strong>{e.oldBasic.toLocaleString()} → {e.newBasic.toLocaleString()} QAR</strong>
                              </div>
                              <div className="timeline-grid-item">
                                <span>Transport</span>
                                <strong>{(e.oldAllowances?.transport || 0).toLocaleString()} → {(e.newAllowances?.transport || 0).toLocaleString()} QAR</strong>
                              </div>
                              <div className="timeline-grid-item">
                                <span>Phone</span>
                                <strong>{(e.oldAllowances?.phone || 0).toLocaleString()} → {(e.newAllowances?.phone || 0).toLocaleString()} QAR</strong>
                              </div>
                              <div className="timeline-grid-item">
                                <span>Food</span>
                                <strong>{(e.oldAllowances?.food || 0).toLocaleString()} → {(e.newAllowances?.food || 0).toLocaleString()} QAR</strong>
                              </div>
                              <div className="timeline-grid-item">
                                <span>Other</span>
                                <strong>{(e.oldAllowances?.other || 0).toLocaleString()} → {(e.newAllowances?.other || 0).toLocaleString()} QAR</strong>
                              </div>
                            </div>

                            {e.auditLogId && (
                              <div className="timeline-revert">
                                <button 
                                  onClick={() => triggerRevert(e.auditLogId)}
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: 'var(--red)', borderColor: 'var(--red)', cursor: 'pointer' }}
                                >
                                  Revert Hike
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {e.type === 'eos' && (
                          <div className="timeline-grid">
                            <div className="timeline-grid-item"><span>EOS Payout</span><strong style={{ color: 'var(--red)' }}>{e.payout ? `${e.payout.toLocaleString()} QAR` : '—'}</strong></div>
                            <div className="timeline-grid-item"><span>Tenure</span><strong>{e.tenure ? `${e.tenure.years}y ${e.tenure.months}m ${e.tenure.days}d` : '—'}</strong></div>
                          </div>
                        )}
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
              <div className="info-box brand">
                <p><strong>How it works:</strong></p>
                <ul>
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
                      <div className="detail-cell hl">
                        <div className="detail-cell-label">Current Unused Value</div>
                        <div className={`detail-cell-value ${netBalance < 0 ? 'neg' : 'pos'}`}>
                          {netBalance < 0 ? '−' : ''}{Math.abs(unusedValue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} QAR
                        </div>
                      </div>
                    </div>
                    
                    <div className="info-box">
                      <strong style={{ display: 'block', marginBottom: 10, fontSize: '.9rem' }}>Leave Balance Breakdown &amp; Value Formula</strong>
                      <div className="calc">
                        <div className="calc-row"><span className="lbl">Total Earned (Accrued since joining)</span><strong>{totalAccrued.toFixed(2)} days</strong></div>
                        <div className="calc-row neg"><span className="lbl">Total Taken (Vacations booked)</span><span className="val">− {totalTaken} days</span></div>
                        <div className={`calc-row div ${netBalance < 0 ? 'neg' : 'pos'}`} style={{ fontWeight: 700 }}><span>Net Balance (Unused days)</span><span className="val">{netBalance.toFixed(2)} days</span></div>
                      </div>
                      <div className="formula">
                        <div>Monthly Basis = {basic.toLocaleString()} (Basic) + {phone.toLocaleString()} (Phone) + {food.toLocaleString()} (Food) {emp.accommodationType === 'self' ? `+ ${accom.toLocaleString()} (Accommodation)` : '+ 0 (Accommodation by Company)'} = {basis.toLocaleString()} QAR</div>
                        <div>Daily Rate = {basis.toLocaleString()} ÷ 30 days = {dailyRate.toFixed(2)} QAR/day</div>
                        <div>Unused Value = {netBalance.toFixed(2)} days × {dailyRate.toFixed(2)} QAR/day = {unusedValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} QAR</div>
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
                <div className="detail-cell hl">
                  <div className="detail-cell-label">Net Balance</div>
                  <div className={`detail-cell-value ${balance < 0 ? 'neg' : 'pos'}`}>
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
                <div className="empty-rich">
                  <div className="empty-rich-ico" style={{ background: 'var(--red-subtle)', color: 'var(--red)' }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                  </div>
                  <h3>Employee is Terminated</h3>
                  <p>This profile was deactivated on <strong>{emp.endDate}</strong>. End-of-service was already processed.</p>
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
                        {/* Net payout hero */}
                        <div className="payout-hero">
                          <span className="k">Net End-of-Service Payout</span>
                          <span className="v">{eos.netPayout.toLocaleString()} QAR</span>
                          <span className="sub">
                            {eos.tenure.years}y {eos.tenure.months}m {eos.tenure.days}d of service
                            <span className="dot" />
                            as of {eosDate}
                          </span>
                        </div>

                        {/* Gratuity */}
                        <div className="stmt">
                          <div className="stmt-head">
                            <span className="ico stat-icon green">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                            </span>
                            <div>Gratuity — Art. 54<small>Based on basic salary only</small></div>
                          </div>
                          <div className="stmt-body calc">
                            <div className="calc-row"><span className="lbl">Daily Basic Wage</span><span className="val">{eos.basicSalary.toLocaleString()} ÷ 30 = {eos.dailyBasicWage.toFixed(2)} QAR</span></div>
                            <div className="calc-row"><span className="lbl">Gratuity Days</span><span className="val">21 × {eos.tenureYears} yrs = {eos.gratuityDays.toFixed(2)} days</span></div>
                          </div>
                          <div className="stmt-total"><span>Gratuity Amount</span><span className="amt pos">+{eos.gratuityAmount.toLocaleString()} QAR</span></div>
                        </div>

                        {/* Leave encashment */}
                        <div className="stmt">
                          <div className="stmt-head">
                            <span className="ico stat-icon blue">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                            </span>
                            <div>Leave Encashment<small>Basic + Phone + Food (+ Accom. if self)</small></div>
                          </div>
                          <div className="stmt-body calc">
                            <div className="calc-row"><span className="lbl">Accrual Starts From</span><span className="val">{accrualBasisLabel}</span></div>
                            <div className="calc-row"><span className="lbl">Monthly Leave Basis</span><span className="val">{eos.leaveSalaryBasis.toLocaleString()} QAR</span></div>
                            <div className="calc-row"><span className="lbl">Daily Leave Wage</span><span className="val">{eos.leaveSalaryBasis.toLocaleString()} ÷ 30 = {eos.dailyLeaveWage.toFixed(2)} QAR</span></div>
                            <div className={`calc-row ${eos.vacationBalance < 0 ? 'neg' : 'pos'}`}><span className="lbl">Unused Leave Balance</span><span className="val">{eos.vacationBalance.toFixed(2)} days</span></div>
                          </div>
                          <div className="stmt-total">
                            <span>Leave Settlement</span>
                            <span className={`amt ${eos.vacationBalance < 0 ? 'neg' : 'pos'}`}>{eos.vacationBalance < 0 ? '−' : '+'}{Math.abs(eos.vacationSettlement).toLocaleString()} QAR</span>
                          </div>
                        </div>

                        {/* Net total */}
                        <div className="eos-list">
                          <div className="eos-row total">
                            <span>Net Payout</span>
                            <span style={{ color: 'var(--accent)' }}>{eos.netPayout.toLocaleString()} QAR</span>
                          </div>
                        </div>

                        <div className="info-box">
                          <p style={{ fontSize: '.8rem' }}>
                            <strong>EOS Calculation Basis:</strong> Gratuity (Art. 54) is based on <em>basic salary only</em>. Leave Encashment is calculated based on <em>Basic Salary + Phone Allowance + Food Allowance</em>, plus <em>Accommodation Allowance</em> only if Accommodation Type is 'self'.
                          </p>
                        </div>

                        <div className="danger-zone">
                          <div className="danger-zone-text">
                            <strong>Terminate employment</strong>
                            <span>Marks this profile as Terminated and records the settlement. You can revert this from the Activity Center.</span>
                          </div>
                          <button className="btn btn-danger" onClick={confirmTermination}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64A9 9 0 1 1 5.64 6.64" /><line x1="12" y1="2" x2="12" y2="12" /></svg>
                            Confirm &amp; Terminate
                          </button>
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

function DocCell({ label, date, status, empId, docType }) {
  const { renewDocument } = useHR();
  const [editing, setEditing] = useState(false);
  const [newDate, setNewDate] = useState(date || '');

  const map = {
    expired:  { cls: 'bad',  txt: 'Expired' },
    urgent:   { cls: 'bad',  txt: 'Expires <30d' },
    critical: { cls: 'warn', txt: 'Expires <60d' },
    warning:  { cls: 'warn', txt: 'Expires <90d' },
    active:   { cls: 'ok',   txt: 'Valid' },
  };
  const s = map[status] || map.active;

  const handleRenew = async () => {
    if (!newDate) return;
    await renewDocument(empId, docType, newDate);
    setEditing(false);
  };

  return (
    <div className="detail-cell">
      <div className="detail-cell-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{label}</span>
        {status !== 'active' && !editing && (
          <button 
            type="button" 
            onClick={() => setEditing(true)} 
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '.7rem', fontWeight: 700 }}
          >
            Quick Renew
          </button>
        )}
      </div>
      <div className="detail-cell-value doc-val" style={{ marginTop: 4 }}>
        {editing ? (
          <div style={{ display: 'flex', gap: 6, width: '100%' }}>
            <input 
              type="date" 
              value={newDate} 
              onChange={e => setNewDate(e.target.value)} 
              style={{ padding: '4px 8px', fontSize: '.8rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-app)', color: 'var(--text-1)' }} 
            />
            <button 
              type="button" 
              onClick={handleRenew} 
              className="btn btn-primary" 
              style={{ padding: '4px 8px', fontSize: '.75rem', borderRadius: '6px' }}
            >
              Save
            </button>
            <button 
              type="button" 
              onClick={() => setEditing(false)} 
              className="btn btn-ghost" 
              style={{ padding: '4px 8px', fontSize: '.75rem', borderRadius: '6px' }}
            >
              &times;
            </button>
          </div>
        ) : (
          <>
            {date || '—'}
            {date && <span className={`tag ${s.cls}`}>{s.txt}</span>}
          </>
        )}
      </div>
    </div>
  );
}

function ExtendControl({ vacationId, currentExt }) {
  const { extendVacation } = useHR();
  const [editing, setEditing] = useState(false);
  const [extraDays, setExtraDays] = useState(String(currentExt || 0));

  const handleSave = async () => {
    const val = parseInt(extraDays) || 0;
    await extendVacation(vacationId, val);
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
        <input 
          type="number" 
          min="0" 
          value={extraDays} 
          onChange={e => setExtraDays(e.target.value)} 
          style={{ width: 60, padding: '3px 6px', fontSize: '.75rem', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg-app)', color: 'var(--text-1)' }} 
        />
        <button 
          onClick={handleSave} 
          className="btn btn-primary" 
          style={{ padding: '3px 6px', fontSize: '.7rem', borderRadius: 4 }}
        >
          Save
        </button>
        <button 
          onClick={() => setEditing(false)} 
          className="btn btn-ghost" 
          style={{ padding: '3px 6px', fontSize: '.7rem', borderRadius: 4 }}
        >
          &times;
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {currentExt > 0 ? (
        <span style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--amber)' }}>
          +{currentExt}d extended
        </span>
      ) : (
        <span style={{ color: 'var(--text-3)', fontSize: '.75rem' }}>—</span>
      )}
      <button 
        type="button" 
        onClick={() => setEditing(true)} 
        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '.7rem', fontWeight: 700 }}
      >
        {currentExt > 0 ? 'Edit' : 'Extend'}
      </button>
    </div>
  );
}
