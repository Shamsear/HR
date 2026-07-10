'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useHR } from '../context';
import { formatDate } from '../utils';

export default function VacationsPage() {
  const { employees, ready } = useHR();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'ongoing', 'upcoming', 'completed'
  const today = useMemo(() => new Date(), []);

  const allVacations = useMemo(() => {
    if (!employees) return [];
    const list = [];
    employees.forEach(emp => {
      if (emp.vacations) {
        emp.vacations.forEach(v => {
          const start = new Date(v.startDate);
          const end = new Date(v.endDate);
          let status = 'Completed';
          
          if (today >= start && today <= end) {
            status = 'Ongoing';
          } else if (today < start) {
            status = 'Upcoming';
          }

          list.push({
            ...v,
            employeeName: emp.name,
            employeeId: emp.id,
            roleType: emp.roleType,
            status,
            start,
            end
          });
        });
      }
    });
    // Sort by start date descending
    return list.sort((a, b) => b.start - a.start);
  }, [employees, today]);

  const filtered = useMemo(() => {
    return allVacations.filter(v => {
      const matchesSearch = 
        v.employeeName.toLowerCase().includes(search.toLowerCase()) || 
        v.employeeId.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' || 
        v.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [allVacations, search, statusFilter]);

  if (!ready) return null;

  return (
    <div className="app-shell">
      <div className="page-card">
        <div className="page-head">
          <div>
            <h2 className="page-head-title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              All Vacations
            </h2>
            <div className="page-head-sub">Overview of leave schedules across the organization</div>
          </div>
          <Link href="/" className="btn btn-ghost">← Dashboard</Link>
        </div>

        <div className="page-body" style={{ padding: '20px' }}>
          <div className="panel-toolbar" style={{ padding: 0, borderBottom: 'none', marginBottom: 20 }}>
            <div className="search-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input 
                placeholder="Search by name or ID…" 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>
            <div className="filters">
              <select className="sel" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All Leave Statuses</option>
                <option value="ongoing">Ongoing</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="tbl-wrap mobile-hide">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Category</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Duration</th>
                  <th>Air Ticket</th>
                  <th>Leave Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-state">No vacations found matching criteria.</td>
                  </tr>
                ) : (
                  filtered.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 700 }}>
                        <Link href={`/employees/${v.employeeId}`} style={{ color: 'var(--accent)' }}>
                          {v.employeeName} ({v.employeeId})
                        </Link>
                      </td>
                      <td>{v.roleType}</td>
                      <td>{v.startDate}</td>
                      <td>{v.endDate}</td>
                      <td>{v.duration} days</td>
                      <td>
                        {v.ticketTaken ? (
                          <span className="tag ok">{v.ticketType || 'Ticket'}</span>
                        ) : (
                          <span style={{ color: 'var(--text-3)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge-pill badge-${v.status.toLowerCase()}`}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mobile-card-list mobile-show">
            {filtered.length === 0 ? (
              <div className="empty-state">No vacations found matching criteria.</div>
            ) : (
              filtered.map(v => (
                <div key={v.id} className="detail-mini-card">
                  <div className="detail-mini-row">
                    <span className="detail-mini-label">Employee</span>
                    <span className="detail-mini-value" style={{ fontWeight: 700 }}>
                      <Link href={`/employees/${v.employeeId}`} style={{ color: 'var(--accent)' }}>
                        {v.employeeName} ({v.employeeId})
                      </Link>
                    </span>
                  </div>
                  <div className="detail-mini-row">
                    <span className="detail-mini-label">Period</span>
                    <span className="detail-mini-value">{v.startDate} → {v.endDate}</span>
                  </div>
                  <div className="detail-mini-row">
                    <span className="detail-mini-label">Duration</span>
                    <span className="detail-mini-value">{v.duration} days</span>
                  </div>
                  <div className="detail-mini-row">
                    <span className="detail-mini-label">Air Ticket</span>
                    <span className="detail-mini-value">{v.ticketTaken ? (v.ticketType || 'Yes') : 'No'}</span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span className={`badge-pill badge-${v.status.toLowerCase()}`}>
                      {v.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
