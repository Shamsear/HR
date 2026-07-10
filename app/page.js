'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useHR } from './context';
import { AccrualEngine, getDocumentExpiryStatus, formatDate, calculateTicketEligibility } from './utils';

export default function Dashboard() {
  const router = useRouter();
  const {
    employees, notifications, search, setSearch, roleTypeFilter, setRoleTypeFilter,
    statusFilter, setStatusFilter, currentPage, setCurrentPage, pushEnabled,
    darkMode, ready, seedDatabase, exportCSV, importJSON,
    clearNotifications, clearNotification, markAllRead,
    toggleTheme, handleEnablePush, drawerOpen, setDrawerOpen, logout,
    auditLogs, revertAction, toast, confirm
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

  const hasFilters = search !== '' || roleTypeFilter !== 'all' || statusFilter !== 'all';
  const clearFilters = () => { setSearch(''); setRoleTypeFilter('all'); setStatusFilter('all'); setCurrentPage(1); };

  const openDrawer = () => { setDrawerOpen(true); markAllRead(); };

  if (!ready) return null;

  const emptyBlock = employees.length === 0 ? (
    <div className="empty-rich">
      <div className="empty-rich-ico">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="16" y1="11" x2="22" y2="11" /></svg>
      </div>
      <h3>No employees yet</h3>
      <p>Get started by adding your first employee to the portal.</p>
      <Link href="/employees/add" className="btn btn-primary">+ Add Employee</Link>
    </div>
  ) : (
    <div className="empty-rich">
      <div className="empty-rich-ico">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
      </div>
      <h3>No matches found</h3>
      <p>No employees match your current search or filters.</p>
      <button className="btn btn-ghost" onClick={clearFilters}>Clear filters</button>
    </div>
  );

  return (
    <div className="app-shell">
      {/* ── HEADER ── */}
      <div className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo only-mobile">HR</div>
          <div className="topbar-text">
            <span className="topbar-eyebrow"><span className="dot" /> Live overview</span>
            <h1>Dashboard</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <Link href="/vacations" className="btn btn-ghost">Vacations</Link>
          <Link href="/calendar" className="btn btn-ghost">Calendar</Link>
          <button className="btn btn-ghost" onClick={() => { exportCSV(); toast('Employee data exported.'); }}>Export</button>
          <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
            Import
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) importJSON(e.target.files[0]); }} />
          </label>
          <Link href="/employees/add" className="btn btn-primary">+ Employee</Link>

          <div className="action-cluster">
            <button className="btn-icon" onClick={openDrawer} title="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              {unread > 0 && <span className="badge">{unread}</span>}
            </button>
            <span className="divider only-mobile" />
            <button className="btn-icon only-mobile" onClick={toggleTheme} title="Toggle theme">
              {darkMode
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a9 9 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>}
            </button>
            <button className="btn-icon only-mobile" onClick={logout} title="Sign Out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="stats-row">
        {[
          { label: 'Total Employees', value: stats.total, icon: 'blue', cap: 'View all', filter: 'all', activeWhen: 'all', paths: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'] },
          { label: 'On Vacation', value: stats.leave, icon: 'amber', cap: 'Filter leave', filter: 'on-leave', activeWhen: 'on-leave', paths: ['M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z', 'M15 5l4 4'] },
          { label: 'Accrued Days', value: `${stats.accrued}`, icon: 'green', cap: 'Company-wide', filter: 'all', activeWhen: null, paths: ['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z', 'M12 6v6l4 2'] },
          { label: 'Doc Warnings', value: stats.expDocs, icon: 'red', cap: 'Review docs', filter: 'expired-documents', activeWhen: 'expired-documents', paths: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M12 11v6', 'M9 17h6'] },
        ].map(s => {
          const isAlert = s.filter === 'expired-documents' && stats.expDocs > 0;
          return (
            <button
              className={`stat clickable ${s.activeWhen && statusFilter === s.activeWhen ? 'active' : ''}`}
              key={s.label}
              onClick={() => { setStatusFilter(s.filter); setCurrentPage(1); }}
            >
              <div className="stat-top">
                <div className={`stat-icon ${s.icon}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {s.paths.map((p, idx) => <path key={idx} d={p} />)}
                  </svg>
                </div>
                <div className="stat-label">{s.label}</div>
              </div>
              <div className="stat-value">{s.value}</div>
              <span className={`stat-cap ${isAlert ? 'alert' : ''}`}>
                {isAlert ? 'Needs attention' : s.cap}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </span>
            </button>
          );
        })}
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
          {hasFilters && (
            <div className="toolbar-meta">
              <span>{filtered.length} {filtered.length === 1 ? 'result' : 'results'}</span>
              <button className="clear-filters" onClick={clearFilters}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                Clear filters
              </button>
            </div>
          )}
        </div>

        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr>
              <th>Employee</th><th>Qatar ID</th><th>Ticket</th><th>Joining</th><th>Status</th><th>Balance</th><th aria-label="Open"></th>
            </tr></thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 0 }}>{emptyBlock}</td></tr>
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
                  <tr key={emp.id} className="row-link" onClick={() => router.push(`/employees/${emp.id}`)}>
                    <td>
                      <div className="emp-cell">
                        <div className="avatar">{ini}</div>
                        <div>
                          <span className="emp-name">{emp.name}</span>
                          <span className="emp-sub"><span className="emp-id-mono">{emp.id}</span><span className="sep" />{emp.roleType}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="qid-cell">
                        {emp.qid}
                        {isExp && <span className="doc-dot exp" title="Documents expired!">!</span>}
                        {isWrn && <span className="doc-dot wrn" title="Documents expiring soon">!</span>}
                      </span>
                    </td>
                    <td><span className={`tag ${ticket.eligible ? 'ok' : 'muted'}`}>{ticket.type}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{emp.joiningDate}</td>
                    <td><span className={`badge-pill badge-${emp.status.toLowerCase().replace(' ', '-')}`}>{emp.status}</span></td>
                    <td><span className={`bal-pill ${bc}`}>{bal.toFixed(1)}<small>d</small></span></td>
                    <td className="col-chevron">
                      <svg className="row-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card-list-wrap mobile-cards">
          {rows.length === 0 ? (
            emptyBlock
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
              <Link key={emp.id} href={`/employees/${emp.id}`} className="employee-card">
                <div className="ec-top">
                  <div className="avatar">{ini}</div>
                  <div className="ec-id">
                    <div className="ec-name">{emp.name}</div>
                    <div className="ec-meta"><span className="emp-id-mono">{emp.id}</span><span className="sep" />{emp.roleType}</div>
                  </div>
                  <span className={`badge-pill badge-${emp.status.toLowerCase().replace(' ', '-')}`}>{emp.status}</span>
                </div>

                <div className="ec-balance">
                  <span className="k">Leave Balance</span>
                  <span className={`v ${bc}`}>{bal.toFixed(1)} days</span>
                </div>

                <div className="ec-grid">
                  <div className="ec-cell">
                    <span className="k">Qatar ID</span>
                    <span className="v">
                      {emp.qid}
                      {isExp && <span className="doc-dot exp" title="Documents expired!">!</span>}
                      {isWrn && <span className="doc-dot wrn" title="Documents expiring soon">!</span>}
                    </span>
                  </div>
                  <div className="ec-cell">
                    <span className="k">Ticket</span>
                    <span className="v"><span className={`tag ${ticket.eligible ? 'ok' : 'muted'}`}>{ticket.type}</span></span>
                  </div>
                  <div className="ec-cell">
                    <span className="k">Joining Date</span>
                    <span className="v">{emp.joiningDate}</span>
                  </div>
                  <div className="ec-cell">
                    <span className="k">Category</span>
                    <span className="v">{emp.roleType}</span>
                  </div>
                </div>

                <div className="ec-foot">
                  <span>View profile</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </div>
              </Link>
            );
          })}
        </div>

        {filtered.length > 0 && (
          <div className="paging">
            <span>
              Showing {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, filtered.length)} of {filtered.length}
            </span>
            <div className="paging-btns">
              <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
              <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
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
                    <div key={l.id} className={`notif ${l.reverted ? 'reverted' : 'unread'}`}>
                      <div className="notif-top">
                        <strong className="notif-title">{titles[l.actionType] || l.actionType}</strong>
                        <span className="notif-time">{new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="notif-body" style={{ marginBottom: 10 }}>
                        Target: <span className="notif-code">{l.employeeId}</span>
                        {l.actionType === 'BOOK_VACATION' && ` (${l.details.duration} days)`}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {l.reverted ? (
                          <span className="notif-reverted-tag">Reverted</span>
                        ) : (
                          <button
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Revert this action?',
                                message: 'This will undo the recorded change. It cannot be undone.',
                                confirmLabel: 'Revert',
                                danger: true,
                              });
                              if (!ok) return;
                              const done = await revertAction(l.id);
                              if (done) toast('Action reverted.');
                            }}
                            className="btn btn-ghost btn-revert"
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
