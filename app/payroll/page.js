'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useHR } from '../context';
import { formatDate } from '../utils';

export default function PayrollPage() {
  const { employees, ready } = useHR();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const payrollData = useMemo(() => {
    if (!employees) return [];
    
    return employees.map(emp => {
      const basic = parseFloat(emp.basicSalary) || 0;
      const accommodation = emp.accommodationType === 'self' ? (parseFloat(emp.accommodationAllowance) || 0) : 0;
      const transport = parseFloat(emp.transportAllowance) || 0;
      const phone = parseFloat(emp.phoneAllowance) || 0;
      const food = parseFloat(emp.foodAllowance) || 0;
      const other = parseFloat(emp.otherAllowance) || 0;

      // Check if employee has an active vacation in selected month or is currently overstaying
      const ongoingVacation = emp.vacations && emp.vacations.find(v => {
        const start = new Date(v.startDate);
        const end = new Date(v.endDate);
        const [year, month] = selectedMonth.split('-').map(Number);
        const targetDate = new Date(year, month - 1, 15); // check mid-month
        return targetDate >= start && targetDate <= end;
      });

      const isOverstay = emp.status === 'On Leave' && emp.vacations && emp.vacations.some(v => {
        const end = new Date(v.endDate);
        return new Date() > end;
      });

      let status = emp.status;
      let gross = basic + accommodation + transport + phone + food + other;
      let statusNotes = '';

      if (isOverstay) {
        status = 'Overstaying';
        gross = 0; // Paused salary
        statusNotes = 'Salary Paused: Overstaying Leave';
      } else if (ongoingVacation) {
        status = 'On Leave';
        statusNotes = 'Vacation salary paid upfront';
      }

      return {
        id: emp.id,
        name: emp.name,
        roleType: emp.roleType,
        basic,
        accommodation,
        transport,
        phone,
        food,
        other,
        gross,
        status,
        statusNotes
      };
    });
  }, [employees, selectedMonth]);

  const totals = useMemo(() => {
    return payrollData.reduce((acc, curr) => {
      acc.basic += curr.basic;
      acc.accommodation += curr.accommodation;
      acc.transport += curr.transport;
      acc.phone += curr.phone;
      acc.food += curr.food;
      acc.other += curr.other;
      acc.gross += curr.gross;
      return acc;
    }, { basic: 0, accommodation: 0, transport: 0, phone: 0, food: 0, other: 0, gross: 0 });
  }, [payrollData]);

  const handleExportPayroll = () => {
    let csv = "data:text/csv;charset=utf-8,";
    csv += "ID,Name,Category,Basic Salary,Accommodation,Transport,Phone,Food,Other,Net Gross Payout,Status,Notes\n";
    payrollData.forEach(row => {
      csv += [row.id, `"${row.name}"`, row.roleType, row.basic, row.accommodation, row.transport, row.phone, row.food, row.other, row.gross, row.status, `"${row.statusNotes}"`].join(",") + "\n";
    });
    
    // Append totals row
    csv += [
      "TOTALS",
      "",
      "",
      totals.basic,
      totals.accommodation,
      totals.transport,
      totals.phone,
      totals.food,
      totals.other,
      totals.gross,
      "",
      ""
    ].join(",") + "\n";

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `Payroll_Sheet_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!ready) return null;

  return (
    <div className="app-shell">
      <div className="page-card">
        <div className="page-head">
          <div>
            <h2 className="page-head-title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
              Monthly Payroll Sheet
            </h2>
            <div className="page-head-sub">Gross salary sheet calculations and status validation</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleExportPayroll}>Export CSV</button>
            <Link href="/" className="btn btn-ghost">← Dashboard</Link>
          </div>
        </div>

        <div className="page-body" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontWeight: 700, fontSize: '.9rem' }}>Select Month:</span>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)} 
              style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg-inset)', color: 'var(--text-1)' }} 
            />
          </div>

          <div className="tbl-wrap mobile-hide">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Basic</th>
                  <th>Accom.</th>
                  <th>Transport</th>
                  <th>Phone</th>
                  <th>Food</th>
                  <th>Other</th>
                  <th>Gross Payout</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payrollData.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 700 }}>{row.name} ({row.id})</td>
                    <td>{row.basic.toLocaleString()} QAR</td>
                    <td>{row.accommodation.toLocaleString()} QAR</td>
                    <td>{row.transport.toLocaleString()} QAR</td>
                    <td>{row.phone.toLocaleString()} QAR</td>
                    <td>{row.food.toLocaleString()} QAR</td>
                    <td>{row.other.toLocaleString()} QAR</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{row.gross.toLocaleString()} QAR</td>
                    <td>
                      {row.status === 'Overstaying' ? (
                        <span className="badge-pill badge-terminated" style={{ textTransform: 'none' }}>Paused: Overstaying</span>
                      ) : row.status === 'On Leave' ? (
                        <span className="badge-pill badge-on-leave">On Leave</span>
                      ) : (
                        <span className="badge-pill badge-active">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
                {/* Summary Totals Row */}
                <tr style={{ background: 'var(--bg-inset)', fontWeight: 800 }}>
                  <td>TOTALS</td>
                  <td>{totals.basic.toLocaleString()} QAR</td>
                  <td>{totals.accommodation.toLocaleString()} QAR</td>
                  <td>{totals.transport.toLocaleString()} QAR</td>
                  <td>{totals.phone.toLocaleString()} QAR</td>
                  <td>{totals.food.toLocaleString()} QAR</td>
                  <td>{totals.other.toLocaleString()} QAR</td>
                  <td style={{ color: 'var(--green)' }}>{totals.gross.toLocaleString()} QAR</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mobile-card-list mobile-show">
            {payrollData.map(row => (
              <div key={row.id} className="detail-mini-card">
                <div className="detail-mini-row">
                  <span className="detail-mini-label">Employee</span>
                  <span className="detail-mini-value" style={{ fontWeight: 700 }}>{row.name} ({row.id})</span>
                </div>
                <div className="detail-mini-row">
                  <span className="detail-mini-label">Basic / Accom</span>
                  <span className="detail-mini-value">{row.basic.toLocaleString()} / {row.accommodation.toLocaleString()} QAR</span>
                </div>
                <div className="detail-mini-row">
                  <span className="detail-mini-label">Other Allowances</span>
                  <span className="detail-mini-value">{(row.transport + row.phone + row.food + row.other).toLocaleString()} QAR</span>
                </div>
                <div className="detail-mini-row">
                  <span className="detail-mini-label">Gross Payout</span>
                  <span className="detail-mini-value" style={{ fontWeight: 700, color: 'var(--accent)' }}>{row.gross.toLocaleString()} QAR</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  {row.status === 'Overstaying' ? (
                    <span className="badge-pill badge-terminated" style={{ textTransform: 'none' }}>Paused: Overstaying</span>
                  ) : row.status === 'On Leave' ? (
                    <span className="badge-pill badge-on-leave">On Leave</span>
                  ) : (
                    <span className="badge-pill badge-active">Active</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
