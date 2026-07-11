'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useHR } from '../context';
import { getDocumentExpiryStatus, formatDate } from '../utils';

export default function ExpiriesPage() {
  const { employees, renewDocument, ready, toast } = useHR();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, expired, urgent, critical, warning
  const [renewingDoc, setRenewingDoc] = useState(null); // { empId, docType, tempDate }
  const todayStr = useMemo(() => formatDate(new Date()), []);

  // Aggregate all warnings
  const allWarnings = useMemo(() => {
    const list = [];
    employees.forEach(emp => {
      if (emp.status === 'Terminated') return;

      const qStatus = getDocumentExpiryStatus(emp.qidExpiry, todayStr);
      if (qStatus.status !== 'active' && qStatus.status !== 'none') {
        list.push({
          employee: emp,
          docType: 'QID',
          docNo: emp.qid,
          expiryDate: emp.qidExpiry,
          info: qStatus
        });
      }

      const pStatus = getDocumentExpiryStatus(emp.passportExpiry, todayStr);
      if (pStatus.status !== 'active' && pStatus.status !== 'none') {
        list.push({
          employee: emp,
          docType: 'Passport',
          docNo: emp.passportNo,
          expiryDate: emp.passportExpiry,
          info: pStatus
        });
      }

      if (emp.licenseNo && emp.licenseExpiry) {
        const lStatus = getDocumentExpiryStatus(emp.licenseExpiry, todayStr);
        if (lStatus.status !== 'active' && lStatus.status !== 'none') {
          list.push({
            employee: emp,
            docType: 'License',
            docNo: emp.licenseNo,
            expiryDate: emp.licenseExpiry,
            info: lStatus
          });
        }
      }
    });
    return list;
  }, [employees, todayStr]);

  // Stats computation
  const stats = useMemo(() => {
    const expired = allWarnings.filter(w => w.info.status === 'expired').length;
    const urgent = allWarnings.filter(w => w.info.status === 'urgent').length;
    const critical = allWarnings.filter(w => w.info.status === 'critical').length;
    const warning = allWarnings.filter(w => w.info.status === 'warning').length;
    return { expired, urgent, critical, warning, total: allWarnings.length };
  }, [allWarnings]);

  // Filtered warnings
  const filteredWarnings = useMemo(() => {
    return allWarnings.filter(w => {
      // 1. Search filter
      const term = search.toLowerCase();
      const matchSearch =
        w.employee.name.toLowerCase().includes(term) ||
        w.employee.id.toLowerCase().includes(term) ||
        w.docNo.toLowerCase().includes(term);

      if (!matchSearch) return false;

      // 2. Filter Type tabs
      if (filterType === 'all') return true;
      return w.info.status === filterType;
    });
  }, [allWarnings, search, filterType]);

  const handleRenew = async (empId, docType) => {
    if (!renewingDoc || !renewingDoc.tempDate) {
      toast('Please pick a valid date.', 'error');
      return;
    }
    try {
      await renewDocument(empId, docType, renewingDoc.tempDate);
      toast(`${docType} renewed successfully!`);
      setRenewingDoc(null);
    } catch (err) {
      toast('Failed to renew document.', 'error');
    }
  };

  if (!ready) return null;

  return (
    <div className="app-shell">
      {/* ── HEADER ── */}
      <div className="topbar">
        <div className="topbar-brand">
          <div className="topbar-text">
            <span className="topbar-eyebrow"><span className="dot" /> Verification Alert Center</span>
            <h1>Document Expiries</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <Link href="/" className="btn btn-ghost">← Dashboard</Link>
        </div>
      </div>

      {/* ── ALERTS SUMMARY ── */}
      <div className="stats-row" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Warnings', value: stats.total, icon: 'blue', type: 'all' },
          { label: 'Expired', value: stats.expired, icon: 'red', type: 'expired' },
          { label: 'Urgent (< 30 days)', value: stats.urgent, icon: 'red', type: 'urgent' },
          { label: 'Critical (< 60 days)', value: stats.critical, icon: 'amber', type: 'critical' },
          { label: 'Warning (< 90 days)', value: stats.warning, icon: 'green', type: 'warning' },
        ].map(s => (
          <button
            key={s.label}
            className={`stat clickable ${filterType === s.type ? 'active' : ''}`}
            onClick={() => setFilterType(s.type)}
            style={{ padding: '14px 18px', gap: '8px' }}
          >
            <div className="stat-top" style={{ gap: '10px' }}>
              <div className={`stat-icon ${s.icon}`} style={{ width: 32, height: 32 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <span className="stat-label" style={{ fontSize: '.76rem' }}>{s.label}</span>
            </div>
            <div className="stat-value" style={{ fontSize: '1.7rem', marginTop: 4 }}>{s.value}</div>
          </button>
        ))}
      </div>

      {/* ── PANEL / WARNINGS LIST ── */}
      <div className="panel">
        <div className="panel-toolbar" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="search-wrap" style={{ flex: 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input 
              placeholder="Search by name, ID, QID, or passport number…" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="filters">
            {['all', 'expired', 'urgent', 'critical', 'warning'].map(t => (
              <button 
                key={t} 
                className={`btn btn-sm ${filterType === t ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilterType(t)}
                style={{ textTransform: 'capitalize' }}
              >
                {t === 'all' ? 'All Warnings' : t}
              </button>
            ))}
          </div>
        </div>

        {/* ── WARNING CARDS GRID ── */}
        <div style={{ padding: '20px 24px' }}>
          {filteredWarnings.length === 0 ? (
            <div className="empty-rich">
              <div className="empty-rich-ico" style={{ background: 'var(--green-subtle)', color: 'var(--green)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h3>All clear!</h3>
              <p>No document alerts match your current view. All documents are fully valid.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {filteredWarnings.map((w, idx) => {
                const isExpired = w.info.status === 'expired';
                const isUrgent = w.info.status === 'urgent';
                const badgeColor = isExpired ? 'red' : isUrgent ? 'red' : w.info.status === 'critical' ? 'amber' : 'green';
                const pillLabel = isExpired ? 'Expired' : isUrgent ? 'Urgent' : w.info.status === 'critical' ? 'Critical' : 'Warning';
                const badgeClass = isExpired ? 'bad' : isUrgent ? 'bad' : w.info.status === 'critical' ? 'warn' : 'ok';
                const isEditing = renewingDoc && renewingDoc.empId === w.employee.id && renewingDoc.docType === w.docType;

                return (
                  <div key={`${w.employee.id}-${w.docType}-${idx}`} className="detail-cell" style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
                    {/* Employee Ident */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="avatar" style={{ width: 34, height: 34, fontSize: '.76rem' }}>
                        {w.employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Link href={`/employees/${w.employee.id}`} className="emp-name" style={{ fontSize: '.9rem', textDecoration: 'none' }}>
                          {w.employee.name}
                        </Link>
                        <span style={{ fontSize: '.74rem', color: 'var(--text-3)' }}>
                          ID: <strong className="emp-id-mono">{w.employee.id}</strong> · {w.employee.roleType}
                        </span>
                      </div>
                      <span className={`tag ${badgeClass}`} style={{ fontSize: '.68rem', padding: '3px 8px' }}>
                        {pillLabel}
                      </span>
                    </div>

                    {/* Alert Info */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', fontSize: '.84rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-3)' }}>Document</span>
                        <strong>{w.docType}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-3)' }}>Number</span>
                        <strong className="emp-id-mono">{w.docNo}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-3)' }}>Expiry Date</span>
                        <strong>{w.expiryDate}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 6, marginTop: 6 }}>
                        <span style={{ color: 'var(--text-3)' }}>Remaining Time</span>
                        <strong style={{ color: `var(--${badgeColor})` }}>
                          {isExpired ? `${Math.abs(w.info.daysRemaining)} days ago` : `${w.info.daysRemaining} days left`}
                        </strong>
                      </div>
                    </div>

                    {/* Quick Renew Control */}
                    <div style={{ marginTop: 'auto' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                          <input 
                            type="date"
                            value={renewingDoc.tempDate || ''}
                            onChange={e => setRenewingDoc({ ...renewingDoc, tempDate: e.target.value })}
                            style={{ 
                              flex: 1,
                              padding: '8px 10px', 
                              fontSize: '.82rem', 
                              border: '1px solid var(--border)', 
                              borderRadius: '6px', 
                              background: 'var(--bg-app)', 
                              color: 'var(--text-1)' 
                            }}
                          />
                          <button 
                            onClick={() => handleRenew(w.employee.id, w.docType)}
                            className="btn btn-primary"
                            style={{ padding: '8px 12px', fontSize: '.78rem', borderRadius: '6px' }}
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setRenewingDoc(null)}
                            className="btn btn-ghost"
                            style={{ padding: '8px 12px', fontSize: '.78rem', borderRadius: '6px' }}
                          >
                            &times;
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setRenewingDoc({ empId: w.employee.id, docType: w.docType, tempDate: w.expiryDate })}
                          className="btn btn-ghost"
                          style={{ width: '100%', fontSize: '.8rem', padding: '8px 12px' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                          </svg>
                          Quick Renew
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
