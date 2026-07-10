'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useHR } from './context';
import { AccrualEngine, getDocumentExpiryStatus, formatDate, calculateTicketEligibility } from './utils';

export default function Dashboard() {
  const {
    employees, notifications, search, setSearch, roleTypeFilter, setRoleTypeFilter,
    statusFilter, setStatusFilter, currentPage, setCurrentPage, pushEnabled,
    darkMode, ready, seedDatabase, exportCSV, importJSON,
    clearNotifications, clearNotification, markAllRead,
    toggleTheme, handleEnablePush, drawerOpen, setDrawerOpen, logout,
    auditLogs, revertAction
  } = useHR();
  const [drawerTab, setDrawerTab] = useState('alerts');
  const PAGE = 10;
  const today = useMemo(() => formatDate(new Date()), []);

  const stats = useMemo(() => {
    let total = employees.length, leave = 0, accrued = 0, expDocs = 0;
    employees.forEach(emp => {
      if (emp.status === 'On Leave') leave++;
      if (emp.status === 'Terminated') return;
      const b = AccrualEngine.calculateVacationBalance(emp, today);
      if (b > 0) accrued += b;
      const q = getDocumentExpiryStatus(emp.qidExpiry, today);
      const p = getDocumentExpiryStatus(emp.passportExpiry, today);
      const l = emp.licenseNo ? getDocumentExpiryStatus(emp.licenseExpiry, today) : { status: 'active' };
      if (q.status === 'expired' || p.status === 'expired' || l.status === 'expired') expDocs++;
    });
    return { total, leave, accrued: Math.round(accrued), expDocs };
  }, [employees, today]);

  const filtered = useMemo(() => {
    return employees.filter(emp => {
      const q = search.toLowerCase();
      if (q && !emp.id.toLowerCase().includes(q) && !emp.name.toLowerCase().includes(q) && !emp.qid.toLowerCase().includes(q)) return false;
      if (roleTypeFilter !== 'all' && emp.roleType !== roleTypeFilter) return false;
      if (statusFilter === 'active' && emp.status !== 'Active') return false;
      if (statusFilter === 'on-leave' && emp.status !== 'On Leave') return false;
      if (statusFilter === 'terminated' && emp.status !== 'Terminated') return false;
      if (statusFilter === 'negative-balance' && AccrualEngine.calculateVacationBalance(emp, today) >= 0) return false;
      if (statusFilter === 'expired-documents') {
        const q = getDocumentExpiryStatus(emp.qidExpiry, today);
        const p = getDocumentExpiryStatus(emp.passportExpiry, today);
        const l = emp.licenseNo ? getDocumentExpiryStatus(emp.licenseExpiry, today) : { status: 'active' };
        if (q.status !== 'expired' && p.status !== 'expired' && l.status !== 'expired') return false;
      }
      return true;
    });
  }, [employees, search, roleTypeFilter, statusFilter, today]);

  const totalPages = Math.ceil(filtered.length / PAGE) || 1;
  const page = Math.min(currentPage, totalPages);
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE);
  const unread = notifications.filter(n => !n.isRead).length;

  const openDrawer = () => { setDrawerOpen(true); markAllRead(); };

  if (!ready) return null;

  return (
    <div className="app-shell">
      {/* ── TOPBAR ── */}
      <div className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">HR</div>
          <div className="topbar-text">
            <h1>HR Portal</h1>
            <span>Qatar — Vacation & End-of-Service Management</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={exportCSV}>Export</button>
          <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
            Import
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) importJSON(e.target.files[0]); }} />
          </label>
          <Link href="/employees/add" className="btn btn-primary">+ Employee</Link>

          <button className="btn-icon" onClick={openDrawer} title="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            {unread > 0 && <span className="badge">{unread}</span>}
          </button>

          <button className="btn-icon" onClick={toggleTheme} title="Toggle theme">
            {darkMode
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a9 9 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>}
          </button>

          <button className="btn-icon" onClick={logout} title="Sign Out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="stats-row">
        {[
          { label: 'Total Employees', value: stats.total, icon: 'blue', d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 0M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
          { label: 'On Vacation', value: stats.leave, icon: 'amber', d: 'M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5ZM15 5l4 4' },
          { label: 'Accrued Days', value: `${stats.accrued}`, icon: 'green', d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 6v6l4 2' },
          { label: 'Doc Warnings', value: stats.expDocs, icon: 'red', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 11v6M9 17h6' },
        ].map(s => (
          <div className="stat" key={s.label}>
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
            <div className={`stat-icon ${s.icon}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={s.d}/></svg>
            </div>
          </div>
        ))}
      </div>

      {/* ── TABLE PANEL ── */}
      <div className="panel">
        <div className="panel-toolbar">
          <div className="search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input placeholder="Search by name, ID, or QID…" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
          </div>
          <div className="filters">
            <select className="sel" value={roleTypeFilter} onChange={e => { setRoleTypeFilter(e.target.value); setCurrentPage(1); }}>
              <option value="all">All Category Types</option>
              <option value="Staff">Staff</option>
              <option value="Worker">Worker</option>
            </select>
            <select className="sel" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="on-leave">On Vacation</option>
              <option value="negative-balance">Negative Balance</option>
              <option value="expired-documents">Expired Documents</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
        </div>

        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr>
              <th>ID</th><th>Employee</th><th>Qatar ID</th><th>Ticket Eligibility</th><th>Joining Date</th><th>Status</th><th>Balance</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="empty-state">No employees match your filters.</td></tr>
              ) : rows.map(emp => {
                const bal = AccrualEngine.calculateVacationBalance(emp, today);
                const bc = bal < 0 ? 'neg' : bal < 5 ? 'warn' : 'pos';
                const ini = emp.name.split(' ').map(w => w[0]).join('').slice(0, 2);
                const qE = getDocumentExpiryStatus(emp.qidExpiry, today);
                const pE = getDocumentExpiryStatus(emp.passportExpiry, today);
                const lE = emp.licenseNo ? getDocumentExpiryStatus(emp.licenseExpiry, today) : { status: 'active' };
                const isExp = [qE, pE, lE].some(s => s.status === 'expired');
                const isWrn = !isExp && [qE, pE, lE].some(s => s.status === 'expiring');
                const ticket = calculateTicketEligibility(emp.roleType, emp.joiningDate, today);
                return (
                  <tr key={emp.id}>
                    <td style={{ fontWeight: 600 }}>{emp.id}</td>
                    <td>
                      <div className="emp-cell">
                        <div className="avatar">{ini}</div>
                        <div>
                          <span className="emp-name">{emp.name}</span>
                          <span className="emp-role">{emp.roleType}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {emp.qid}
                        {isExp && <span className="doc-dot exp" title="Documents expired!">!</span>}
                        {isWrn && <span className="doc-dot wrn" title="Documents expiring soon">!</span>}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: ticket.eligible ? 'var(--green)' : 'var(--text-3)' }}>
                      {ticket.type}
                    </td>
                    <td>{emp.joiningDate}</td>
                    <td><span className={`badge-pill badge-${emp.status.toLowerCase().replace(' ', '-')}`}>{emp.status}</span></td>
                    <td><span className={`bal ${bc}`}>{bal.toFixed(1)}d</span></td>
                    <td><Link href={`/employees/${emp.id}`} className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '.78rem' }}>View →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card-list-wrap mobile-cards">
          {rows.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)' }}>No employees match your filters.</div>
          ) : rows.map(emp => {
            const bal = AccrualEngine.calculateVacationBalance(emp, today);
            const bc = bal < 0 ? 'neg' : bal < 5 ? 'warn' : 'pos';
            const ini = emp.name.split(' ').map(w => w[0]).join('').slice(0, 2);
            const qE = getDocumentExpiryStatus(emp.qidExpiry, today);
            const pE = getDocumentExpiryStatus(emp.passportExpiry, today);
            const lE = emp.licenseNo ? getDocumentExpiryStatus(emp.licenseExpiry, today) : { status: 'active' };
            const isExp = [qE, pE, lE].some(s => s.status === 'expired');
            const isWrn = !isExp && [qE, pE, lE].some(s => s.status === 'expiring');
            const ticket = calculateTicketEligibility(emp.roleType, emp.joiningDate, today);
            return (
              <div key={emp.id} className="employee-card">
                <div className="emp-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="emp-cell">
                    <div className="avatar">{ini}</div>
                    <div>
                      <div className="emp-name" style={{ fontWeight: 600 }}>{emp.name}</div>
                      <div className="emp-role" style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>{emp.roleType} · ID: {emp.id}</div>
                    </div>
                  </div>
                  <span className={`badge-pill badge-${emp.status.toLowerCase().replace(' ', '-')}`}>{emp.status}</span>
                </div>
                <div className="emp-card-metrics" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '.85rem', marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-3)' }}>Qatar ID:</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                      {emp.qid}
                      {isExp && <span className="doc-dot exp" title="Documents expired!">!</span>}
                      {isWrn && <span className="doc-dot wrn" title="Documents expiring soon">!</span>}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-3)' }}>Ticket:</span>
                    <span style={{ fontWeight: 600, color: ticket.eligible ? 'var(--green)' : 'var(--text-3)' }}>{ticket.type}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-3)' }}>Joining:</span>
                    <span style={{ fontWeight: 500 }}>{emp.joiningDate}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-3)' }}>Leave Balance:</span>
                    <span className={`bal ${bc}`} style={{ fontWeight: 600 }}>{bal.toFixed(1)}d</span>
                  </div>
                </div>
                <div>
                  <Link href={`/employees/${emp.id}`} className="btn btn-ghost" style={{ width: '100%', textAlign: 'center', justifyContent: 'center', padding: '10px 0' }}>View Profile →</Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="paging">
          <span>
            {filtered.length > 0
              ? `${(page - 1) * PAGE + 1}–${Math.min(page * PAGE, filtered.length)} of ${filtered.length}`
              : 'No results'}
          </span>
          <div className="paging-btns">
            <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
            <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>

      {/* ── NOTIFICATION DRAWER ── */}
      <div className={`drawer-bg ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <div className={`drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="drawer-top" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Activity Center</h2>
            <button className="close-btn" onClick={() => setDrawerOpen(false)}>&times;</button>
          </div>
          <div className="tabs" style={{ marginBottom: 0 }}>
            <button className={`tab ${drawerTab === 'alerts' ? 'on' : ''}`} onClick={() => setDrawerTab('alerts')} style={{ flex: 1, padding: '10px', textAlign: 'center' }}>Alerts</button>
            <button className={`tab ${drawerTab === 'audit' ? 'on' : ''}`} onClick={() => setDrawerTab('audit')} style={{ flex: 1, padding: '10px', textAlign: 'center' }}>Action Log</button>
          </div>
        </div>
        <div className="drawer-scroll">
          {drawerTab === 'alerts' ? (
            <>
              <div className="push-box">
                <strong>Desktop Alerts</strong>
                <p>Get native browser notifications for document expirations.</p>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleEnablePush} disabled={pushEnabled}>
                  {pushEnabled ? '✓ Enabled' : 'Enable Notifications'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <strong style={{ fontSize: '.85rem' }}>History</strong>
                <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '.72rem' }} onClick={clearNotifications}>Clear All</button>
              </div>

              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="empty-state">All clear — no alerts.</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`notif ${n.isRead ? '' : 'unread'}`}>
                      <div className="notif-top">
                        <span className="notif-title">{n.title}</span>
                        <span className="notif-time">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="notif-body">{n.body}</div>
                      <button className="notif-clear" onClick={() => clearNotification(n.id)}>Dismiss</button>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="notif-list">
              {auditLogs.length === 0 ? (
                <div className="empty-state">No actions logged yet.</div>
              ) : (
                auditLogs.map(l => {
                  const titles = {
                    ADD_EMPLOYEE: 'Employee Created',
                    BOOK_VACATION: 'Vacation Booked',
                    APPLY_HIKE: 'Salary Hike Applied',
                    PROCESS_EOS: 'End of Service Processed'
                  };
                  return (
                    <div key={l.id} className="notif" style={{ borderLeft: l.reverted ? '4px solid var(--text-3)' : '4px solid var(--accent)' }}>
                      <div className="notif-top">
                        <strong className="notif-title">{titles[l.actionType] || l.actionType}</strong>
                        <span className="notif-time">{new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="notif-body" style={{ marginBottom: 10 }}>
                        Target: <code style={{ background: 'var(--bg-inset)', padding: '2px 4px', borderRadius: 4 }}>{l.employeeId}</code>
                        {l.actionType === 'BOOK_VACATION' && ` (${l.details.duration} days)`}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {l.reverted ? (
                          <span style={{ fontSize: '.72rem', color: 'var(--text-3)', fontWeight: 600 }}>Reverted</span>
                        ) : (
                          <button 
                            onClick={() => revertAction(l.id)} 
                            className="btn btn-ghost" 
                            style={{ 
                              padding: '4px 10px', 
                              fontSize: '.7rem', 
                              borderColor: 'var(--red)', 
                              color: 'var(--red)', 
                              background: 'transparent' 
                            }}
                          >
                            Revert Action
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
