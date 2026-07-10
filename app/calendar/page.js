'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useHR } from '../context';
import { formatDate } from '../utils';

export default function CalendarPage() {
  const { employees, ready } = useHR();
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get first day of the month
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Get total days in the month
  const totalDays = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();

  const daysArray = useMemo(() => {
    const temp = [];
    
    // Fill in previous month's trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      temp.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        dateStr: `${month === 0 ? year - 1 : year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(prevMonthDays - i).padStart(2, '0')}`
      });
    }

    // Fill in current month's days
    for (let i = 1; i <= totalDays; i++) {
      temp.push({
        day: i,
        isCurrentMonth: true,
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      });
    }

    // Fill in next month's leading days to complete grid (multiples of 7)
    const extra = 42 - temp.length;
    for (let i = 1; i <= extra; i++) {
      temp.push({
        day: i,
        isCurrentMonth: false,
        dateStr: `${month === 11 ? year + 1 : year}-${String(month === 11 ? 1 : month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      });
    }

    return temp;
  }, [year, month, firstDayIndex, totalDays, prevMonthDays]);

  const events = useMemo(() => {
    if (!employees) return {};
    const map = {};

    employees.forEach(emp => {
      // QID Expiry Event
      if (emp.qidExpiry) {
        if (!map[emp.qidExpiry]) map[emp.qidExpiry] = [];
        map[emp.qidExpiry].push({
          type: 'expiry',
          title: `QID Exp: ${emp.name}`,
          color: 'var(--red)',
          empId: emp.id
        });
      }

      // Passport Expiry Event
      if (emp.passportExpiry) {
        if (!map[emp.passportExpiry]) map[emp.passportExpiry] = [];
        map[emp.passportExpiry].push({
          type: 'expiry',
          title: `Pass Exp: ${emp.name}`,
          color: 'var(--amber)',
          empId: emp.id
        });
      }

      // Vacation events
      if (emp.vacations) {
        emp.vacations.forEach(v => {
          let curr = new Date(v.startDate);
          const end = new Date(v.endDate);
          while (curr <= end) {
            const dateStr = curr.toISOString().split('T')[0];
            if (!map[dateStr]) map[dateStr] = [];
            map[dateStr].push({
              type: 'vacation',
              title: `Leave: ${emp.name}`,
              color: 'var(--accent)',
              empId: emp.id
            });
            curr.setDate(curr.getDate() + 1);
          }

          // Return day event
          const ret = new Date(v.endDate);
          ret.setDate(ret.getDate() + 1);
          const retStr = ret.toISOString().split('T')[0];
          if (!map[retStr]) map[retStr] = [];
          map[retStr].push({
            type: 'return',
            title: `Return: ${emp.name}`,
            color: 'var(--green)',
            empId: emp.id
          });
        });
      }
    });

    return map;
  }, [employees]);

  const handlePrev = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNext = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  if (!ready) return null;

  return (
    <div className="app-shell">
      <div className="page-card">
        <div className="page-head">
          <div>
            <h2 className="page-head-title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              HR Calendar
            </h2>
            <div className="page-head-sub">Schedules, vacation periods, and document expiries</div>
          </div>
          <Link href="/" className="btn btn-ghost">← Dashboard</Link>
        </div>

        <div className="page-body" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ font: '800 1.25rem var(--font-display)' }}>
              {monthNames[month]} {year}
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={handlePrev} style={{ padding: '8px 12px' }}>&larr; Prev</button>
              <button className="btn btn-ghost" onClick={handleNext} style={{ padding: '8px 12px' }}>Next &rarr;</button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} style={{ background: 'var(--bg-inset)', padding: 10, textAlign: 'center', font: '700 .75rem var(--font-body)', color: 'var(--text-3)', textTransform: 'uppercase' }}>
                {d}
              </div>
            ))}

            {daysArray.map((dayObj, index) => {
              const dayEvents = events[dayObj.dateStr] || [];
              return (
                <div 
                  key={index} 
                  style={{ 
                    background: dayObj.isCurrentMonth ? 'var(--bg-card)' : 'var(--bg-inset)', 
                    minHeight: 100, 
                    padding: 8, 
                    opacity: dayObj.isCurrentMonth ? 1 : 0.5,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ font: '700 .85rem var(--font-body)', color: dayObj.isCurrentMonth ? 'var(--text-1)' : 'var(--text-3)', marginBottom: 6 }}>
                    {dayObj.day}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
                    {dayEvents.slice(0, 3).map((ev, eIndex) => (
                      <Link 
                        href={`/employees/${ev.empId}`} 
                        key={eIndex} 
                        style={{ 
                          fontSize: '.65rem', 
                          fontWeight: 700, 
                          padding: '2px 4px', 
                          borderRadius: 4, 
                          background: ev.color, 
                          color: '#fff', 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          display: 'block'
                        }}
                      >
                        {ev.title}
                      </Link>
                    ))}
                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: '.6rem', color: 'var(--text-3)', textAlign: 'center', fontWeight: 700 }}>
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
