/* app/context.js */
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AccrualEngine,
  dateDiffInDays,
  getDocumentExpiryStatus,
  formatDate
} from './utils';
import { supabase } from './supabase';

const HRContext = createContext(null);

// ==========================================
// MOCK DATA HELPERS
// ==========================================
const MOCK_NAMES = [
  'Jassim Al-Thani', 'Fatima Al-Kuwari', 'Khalid Al-Sulaiti', 'Aisha Al-Marri',
  'Hamad Al-Malki', 'Noora Al-Suwaidi', 'Saad Al-Muhannadi', 'Mariam Al-Khulaifi',
  'Abdulrahman Al-Hajri', 'Reem Al-Mana', 'Fahad Al-Qahtani', 'Muna Al-Khori',
  'Abdullah Al-Jaber', 'Amna Al-Fadala', 'Yousef Al-Baker', 'Sara Al-Obeidli',
  'Mohammed Al-Mannai', 'Hessa Al-Subaey', 'Hassan Al-Harami', 'Dana Al-Ghazal'
];

const ROLE_TYPES = ['Staff', 'Worker'];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomSelect(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateMockQID() {
  const prefix = randomSelect(['29', '30']);
  const year = String(randomInt(70, 99)).padStart(2, '0');
  const serial = String(randomInt(10000, 99999));
  return `${prefix}${year}634${serial}`;
}

function generateMockPassport() {
  return `QA${randomInt(1000000, 9999999)}`;
}

function generateRandomPastDate(yearsAgoMin, yearsAgoMax) {
  const yearsAgo = yearsAgoMin + Math.random() * (yearsAgoMax - yearsAgoMin);
  const date = new Date();
  date.setDate(date.getDate() - Math.round(yearsAgo * 365.25));
  return formatDate(date);
}

function generateFutureDate(monthsMin, monthsMax) {
  const months = monthsMin + Math.random() * (monthsMax - monthsMin);
  const date = new Date();
  date.setDate(date.getDate() + Math.round(months * 30.4));
  return formatDate(date);
}

function generateSingleEmployee(index) {
  const name = index < MOCK_NAMES.length
    ? MOCK_NAMES[index]
    : `${randomSelect(MOCK_NAMES).split(' ')[0]} ${randomSelect(MOCK_NAMES).split(' ')[1]}`;
  const roleType = randomSelect(ROLE_TYPES);
  const joiningDate = generateRandomPastDate(0.5, 7.5);

  const basicSalary = randomInt(8000, 25000);
  const accommodationType = randomSelect(['company', 'self', 'other']);
  const accommodationAllowance = accommodationType === 'self' ? randomInt(2000, 6000) : 0;
  const transportAllowance = randomInt(800, 2000);
  const phoneAllowance = randomInt(200, 500);
  const foodAllowance = randomInt(500, 1500);

  const qidExpiry = Math.random() > 0.15 ? generateFutureDate(1, 24) : generateRandomPastDate(-0.5, 0.5);
  const passportExpiry = Math.random() > 0.1 ? generateFutureDate(2, 48) : generateRandomPastDate(-0.2, 0.2);
  const licenseNo = Math.random() > 0.4 ? `QL${randomInt(100000, 999999)}` : '';
  const licenseExpiry = licenseNo ? (Math.random() > 0.1 ? generateFutureDate(3, 36) : generateRandomPastDate(-0.2, 0.2)) : '';

  const vacations = [];
  const serviceDays = dateDiffInDays(joiningDate, new Date());

  if (serviceDays > 250) {
    const maxLeaves = Math.min(4, Math.floor(serviceDays / 365));
    let leaveStartBase = new Date(joiningDate);

    for (let i = 0; i < maxLeaves; i++) {
      const daysOffset = randomInt(180, 365);
      const start = new Date(leaveStartBase);
      start.setDate(start.getDate() + daysOffset);

      const duration = randomInt(10, 30);
      const end = new Date(start);
      end.setDate(end.getDate() + duration - 1);

      if (end < new Date()) {
        vacations.push({
          id: `leave-${index}-${i}`,
          startDate: formatDate(start),
          endDate: formatDate(end),
          duration,
          status: 'Completed'
        });
        leaveStartBase = new Date(end);
        leaveStartBase.setDate(leaveStartBase.getDate() + 1);
      }
    }
  }

  const salaryHistory = [];
  if (serviceDays / 365.25 > 1.5) {
    const oldBasic = Math.round(basicSalary * 0.85);
    const hikeDate = generateRandomPastDate(0.5, (serviceDays / 365.25) - 0.5);
    salaryHistory.push({
      id: `hike-${index}-1`,
      effectiveDate: hikeDate,
      oldBasicSalary: oldBasic,
      newBasicSalary: basicSalary,
      oldAllowances: { accommodation: accommodationAllowance, transport: Math.round(transportAllowance * 0.9), phone: Math.round(phoneAllowance * 0.9), food: Math.round(foodAllowance * 0.9) },
      newAllowances: { accommodation: accommodationAllowance, transport: transportAllowance, phone: phoneAllowance, food: foodAllowance },
      reason: 'Annual Performance Review'
    });
  }

  return {
    id: `EMP-${String(100 + index).slice(1)}`,
    name,
    qid: generateMockQID(),
    qidExpiry,
    passportNo: generateMockPassport(),
    passportExpiry,
    licenseNo,
    licenseExpiry,
    joiningDate,
    roleType,
    basicSalary,
    accommodationType,
    accommodationAllowance,
    transportAllowance,
    phoneAllowance,
    foodAllowance,
    vacations,
    salaryHistory,
    status: 'Active'
  };
}

// ==========================================
// PROVIDER
// ==========================================
export function HRProvider({ children }) {
  const [employees, setEmployees] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState('');
  const [roleTypeFilter, setRoleTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const dismissToast = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const toast = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
    return id;
  }, []);

  // Promise-based confirm dialog — replaces window.confirm
  const confirm = useCallback((opts) => {
    const o = typeof opts === 'string' ? { message: opts } : (opts || {});
    return new Promise((resolve) => {
      setConfirmState({
        title: o.title || 'Are you sure?',
        message: o.message || '',
        confirmLabel: o.confirmLabel || 'Confirm',
        cancelLabel: o.cancelLabel || 'Cancel',
        danger: !!o.danger,
        resolve,
      });
    });
  }, []);

  const closeConfirm = useCallback((result) => {
    setConfirmState(s => { if (s) s.resolve(result); return null; });
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const { data: emps, error: empErr } = await supabase
        .from('employees')
        .select('*')
        .order('id', { ascending: true });

      if (empErr) throw empErr;

      const { data: vacs, error: vacErr } = await supabase
        .from('vacations')
        .select('*');

      if (vacErr) throw vacErr;

      const { data: hikes, error: hikeErr } = await supabase
        .from('salary_history')
        .select('*');

      if (hikeErr) throw hikeErr;

      const { data: terms, error: termErr } = await supabase
        .from('terminations')
        .select('*');

      if (termErr) throw termErr;

      const { data: notifs, error: notifErr } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (notifErr) throw notifErr;

      const { data: logs, error: logErr } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (logErr) throw logErr;

      const assembledEmployees = emps.map(emp => {
        const empVacs = vacs
          .filter(v => v.employee_id === emp.id)
          .map(v => ({
            id: v.id,
            startDate: v.start_date,
            endDate: v.end_date,
            duration: Number(v.duration),
            status: v.status
          }));

        const empHikes = hikes
          .filter(h => h.employee_id === emp.id)
          .map(h => ({
            id: h.id,
            effectiveDate: h.effective_date,
            oldBasicSalary: Number(h.old_basic_salary),
            newBasicSalary: Number(h.new_basic_salary),
            oldAllowances: h.old_allowances,
            newAllowances: h.new_allowances,
            reason: h.reason
          }));

        const empTerm = terms.find(t => t.employee_id === emp.id);

        return {
          id: emp.id,
          name: emp.name,
          qid: emp.qid,
          qidExpiry: emp.qid_expiry,
          passportNo: emp.passport_no,
          passportExpiry: emp.passport_expiry,
          licenseNo: emp.license_no || '',
          licenseExpiry: emp.license_expiry || '',
          joiningDate: emp.joining_date,
          roleType: emp.role_type,
          basicSalary: Number(emp.basic_salary),
          accommodationType: emp.accommodation_type,
          accommodationAllowance: Number(emp.accommodation_allowance),
          transportAllowance: Number(emp.transport_allowance),
          phoneAllowance: Number(emp.phone_allowance),
          foodAllowance: Number(emp.food_allowance),
          status: emp.status,
          endDate: empTerm ? empTerm.end_date : (emp.end_date || ''),
          eosDetails: empTerm ? empTerm.eos_details : null,
          vacations: empVacs,
          salaryHistory: empHikes
        };
      });

      const mappedNotifs = notifs.map(n => ({
        id: n.id,
        title: n.title,
        body: n.body,
        category: n.category,
        employeeId: n.employee_id,
        isRead: n.is_read,
        createdAt: n.created_at
      }));

      const mappedLogs = logs.map(l => ({
        id: l.id,
        actionType: l.action_type,
        employeeId: l.employee_id,
        details: l.details,
        reverted: l.reverted,
        createdAt: l.created_at
      }));

      setEmployees(assembledEmployees);
      setNotifications(mappedNotifs);
      setAuditLogs(mappedLogs);

      return { assembledEmployees, mappedNotifs };
    } catch (error) {
      console.error('[Supabase] Error refreshing data:', error.message || error);
      return { assembledEmployees: [], mappedNotifs: [] };
    }
  }, []);

  const dbSeed = async (count = 10) => {
    const seededEmps = Array.from({ length: count }, (_, i) => generateSingleEmployee(i + 1));
    
    await supabase.from('audit_logs').delete().neq('id', '');
    await supabase.from('notifications').delete().neq('id', '');
    await supabase.from('salary_history').delete().neq('id', '');
    await supabase.from('vacations').delete().neq('id', '');
    await supabase.from('terminations').delete().neq('id', '');
    await supabase.from('employees').delete().neq('id', '');

    for (const emp of seededEmps) {
      await supabase.from('employees').insert({
        id: emp.id,
        name: emp.name,
        qid: emp.qid,
        qid_expiry: emp.qidExpiry,
        passport_no: emp.passportNo,
        passport_expiry: emp.passportExpiry,
        license_no: emp.licenseNo || null,
        license_expiry: emp.licenseExpiry || null,
        joining_date: emp.joiningDate,
        role_type: emp.roleType,
        basic_salary: emp.basicSalary,
        accommodation_type: emp.accommodationType,
        accommodation_allowance: emp.accommodationAllowance,
        transport_allowance: emp.transportAllowance,
        phone_allowance: emp.phoneAllowance,
        food_allowance: emp.foodAllowance,
        status: emp.status,
        end_date: emp.endDate || null
      });

      if (emp.vacations && emp.vacations.length > 0) {
        for (const v of emp.vacations) {
          await supabase.from('vacations').insert({
            id: v.id,
            employee_id: emp.id,
            start_date: v.startDate,
            end_date: v.endDate,
            duration: v.duration,
            status: v.status
          });
        }
      }

      if (emp.salaryHistory && emp.salaryHistory.length > 0) {
        for (const h of emp.salaryHistory) {
          await supabase.from('salary_history').insert({
            id: h.id,
            employee_id: emp.id,
            effective_date: h.effectiveDate,
            old_basic_salary: h.oldBasicSalary,
            new_basic_salary: h.newBasicSalary,
            old_allowances: h.oldAllowances,
            new_allowances: h.newAllowances,
            reason: h.reason
          });
        }
      }
    }

    await supabase.from('notifications').insert({
      id: Math.random().toString(36).substring(2, 9),
      title: 'Database Reset',
      body: `Seeded database with ${count} employees.`,
      category: 'success',
      employee_id: null,
      is_read: false
    });
  };

  const logAuditAction = async (actionType, employeeId, details) => {
    await supabase.from('audit_logs').insert({
      id: Math.random().toString(36).substring(2, 9),
      action_type: actionType,
      employee_id: employeeId,
      details: details,
      reverted: false
    });
  };

  const triggerNativeNotification = useCallback((title, body) => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => reg.showNotification(title, { body }));
      } else {
        new Notification(title, { body });
      }
    }
  }, []);

  const runExpiryChecks = useCallback(async (empList) => {
    const todayStr = formatDate(new Date());
    const alerts = [];

    empList.forEach(emp => {
      if (emp.status === 'Terminated') return;

      const qid = getDocumentExpiryStatus(emp.qidExpiry, todayStr);
      if (qid.status === 'expired') alerts.push({ emp, title: `QID Expired: ${emp.name}`, body: `QID ${emp.qid} has expired! Renew immediately.`, category: 'danger' });
      else if (qid.status === 'expiring') alerts.push({ emp, title: `QID Expiring: ${emp.name}`, body: `QID ${emp.qid} expires in ${qid.daysRemaining} days.`, category: 'warning' });

      const ppt = getDocumentExpiryStatus(emp.passportExpiry, todayStr);
      if (ppt.status === 'expired') alerts.push({ emp, title: `Passport Expired: ${emp.name}`, body: `Passport ${emp.passportNo} has expired!`, category: 'danger' });
      else if (ppt.status === 'expiring') alerts.push({ emp, title: `Passport Expiring: ${emp.name}`, body: `Passport ${emp.passportNo} expires in ${ppt.daysRemaining} days.`, category: 'warning' });

      if (emp.licenseNo && emp.licenseExpiry) {
        const lic = getDocumentExpiryStatus(emp.licenseExpiry, todayStr);
        if (lic.status === 'expired') alerts.push({ emp, title: `License Expired: ${emp.name}`, body: `Driving License ${emp.licenseNo} has expired!`, category: 'danger' });
        else if (lic.status === 'expiring') alerts.push({ emp, title: `License Expiring: ${emp.name}`, body: `Driving License ${emp.licenseNo} expires in ${lic.daysRemaining} days.`, category: 'warning' });
      }
    });

    if (alerts.length > 0) {
      const { data: current } = await supabase.from('notifications').select('title, employee_id');
      const inserts = [];
      alerts.forEach(a => {
        const exists = current && current.some(n => n.title === a.title && n.employee_id === a.emp.id);
        if (!exists) {
          inserts.push({
            id: Math.random().toString(36).substring(2, 9),
            title: a.title,
            body: a.body,
            category: a.category,
            employee_id: a.emp.id,
            is_read: false
          });
        }
      });
      if (inserts.length > 0) {
        await supabase.from('notifications').insert(inserts);
      }
    }
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark-mode');
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      setPushEnabled(true);
    }

    const initSetup = async () => {
      const { assembledEmployees } = await refreshData();
      await runExpiryChecks(assembledEmployees);
      await refreshData();
      setReady(true);
    };

    initSetup();
    setIsAuthenticated(localStorage.getItem('hr_authenticated') === 'true');
  }, [runExpiryChecks, refreshData]);

  // ==========================================
  // ACTIONS
  // ==========================================
  const seedDatabase = async (count = 10) => {
    setReady(false);
    await dbSeed(count);
    await refreshData();
    setReady(true);
    setCurrentPage(1);
  };

  const addEmployee = async (newEmp) => {
    await supabase.from('employees').insert({
      id: newEmp.id,
      name: newEmp.name,
      qid: newEmp.qid,
      qid_expiry: newEmp.qidExpiry,
      passport_no: newEmp.passportNo,
      passport_expiry: newEmp.passportExpiry,
      license_no: newEmp.licenseNo || null,
      license_expiry: newEmp.licenseExpiry || null,
      joining_date: newEmp.joiningDate,
      role_type: newEmp.roleType,
      basic_salary: newEmp.basicSalary,
      accommodation_type: newEmp.accommodationType,
      accommodation_allowance: newEmp.accommodationAllowance,
      transport_allowance: newEmp.transportAllowance,
      phone_allowance: newEmp.phoneAllowance,
      food_allowance: newEmp.foodAllowance,
      status: newEmp.status,
      end_date: newEmp.endDate || null
    });

    await supabase.from('notifications').insert({
      id: Math.random().toString(36).substring(2, 9),
      title: 'Employee Created',
      body: `${newEmp.name} (${newEmp.id}) added.`,
      category: 'success',
      employee_id: newEmp.id,
      is_read: false
    });

    await logAuditAction('ADD_EMPLOYEE', newEmp.id, { employeeId: newEmp.id });
    await refreshData();
  };

  const bookVacation = async (empId, startStr, endStr, duration, metrics) => {
    const target = employees.find(e => e.id === empId);
    const newVacId = `leave-${empId}-${Date.now()}`;

    await supabase.from('vacations').insert({
      id: newVacId,
      employee_id: empId,
      start_date: startStr,
      end_date: endStr,
      duration: duration,
      status: 'Completed'
    });

    const balance = AccrualEngine.calculateVacationBalance(target, startStr) - duration;
    const isNeg = balance < 0;
    const title = isNeg ? 'Excess Leave Warning' : 'Vacation Booked';
    const body = isNeg
      ? `${target.name} has a negative balance of ${balance.toFixed(2)} days.`
      : `${target.name} booked ${duration} days leave (${startStr} → ${endStr}).`;

    await supabase.from('notifications').insert({
      id: Math.random().toString(36).substring(2, 9),
      title,
      body,
      category: isNeg ? 'danger' : 'success',
      employee_id: empId,
      is_read: false
    });

    await logAuditAction('BOOK_VACATION', empId, { employeeId: empId, vacationId: newVacId, duration });
    await refreshData();
    triggerNativeNotification(title, body);
  };

  const applySalaryHike = async (empId, hikeRecord, newBasicVal, hikeAccomType, accomAllowance, transAllowance, phoneAllowance, foodAllowance) => {
    const target = employees.find(e => e.id === empId);

    // Update employee basic and allowances
    await supabase.from('employees').update({
      basic_salary: newBasicVal,
      accommodation_type: hikeAccomType,
      accommodation_allowance: accomAllowance,
      transport_allowance: transAllowance,
      phone_allowance: phoneAllowance,
      food_allowance: foodAllowance
    }).eq('id', empId);

    // Insert salary history record
    await supabase.from('salary_history').insert({
      id: hikeRecord.id,
      employee_id: empId,
      effective_date: hikeRecord.effectiveDate,
      old_basic_salary: hikeRecord.oldBasicSalary,
      new_basic_salary: hikeRecord.newBasicSalary,
      old_allowances: hikeRecord.oldAllowances,
      new_allowances: hikeRecord.newAllowances,
      reason: hikeRecord.reason
    });

    const oldGross = target.basicSalary + (target.accommodationAllowance || 0) + (target.transportAllowance || 0) + (target.phoneAllowance || 0) + (target.foodAllowance || 0);
    const newGross = newBasicVal + accomAllowance + transAllowance + phoneAllowance + foodAllowance;
    const title = 'Salary Hike Applied';
    const body = `${target.name}: ${oldGross.toFixed(0)} → ${newGross.toFixed(0)} QAR (+${(newGross - oldGross).toFixed(0)}).`;

    await supabase.from('notifications').insert({
      id: Math.random().toString(36).substring(2, 9),
      title,
      body,
      category: 'success',
      employee_id: empId,
      is_read: false
    });

    await logAuditAction('APPLY_HIKE', empId, {
      employeeId: empId,
      hikeId: hikeRecord.id,
      oldBasicSalary: target.basicSalary,
      oldAccommodationType: target.accommodationType,
      oldAccommodationAllowance: target.accommodationAllowance,
      oldTransportAllowance: target.transportAllowance,
      oldPhoneAllowance: target.phoneAllowance,
      oldFoodAllowance: target.foodAllowance
    });

    await refreshData();
    triggerNativeNotification(title, body);
  };

  const processEOS = async (empId, endDateStr, eosDetails) => {
    const target = employees.find(e => e.id === empId);

    await supabase.from('employees').update({
      status: 'Terminated',
      end_date: endDateStr
    }).eq('id', empId);

    const termId = `term-${empId}-${Date.now()}`;
    await supabase.from('terminations').insert({
      id: termId,
      employee_id: empId,
      end_date: endDateStr,
      eos_details: eosDetails
    });

    const title = 'End of Service Processed';
    const body = `${target.name} terminated. Net payout: ${eosDetails.netPayout.toFixed(2)} QAR.`;

    await supabase.from('notifications').insert({
      id: Math.random().toString(36).substring(2, 9),
      title,
      body,
      category: 'danger',
      employee_id: empId,
      is_read: false
    });

    await logAuditAction('PROCESS_EOS', empId, {
      employeeId: empId,
      oldStatus: target.status,
      terminationId: termId
    });

    await refreshData();
    triggerNativeNotification(title, body);
  };

  const exportCSV = () => {
    let csv = "data:text/csv;charset=utf-8,";
    csv += "ID,Name,QID,QID Expiry,Passport,Passport Expiry,License,License Expiry,Joining,Role Type,Basic,Accom Type,Accom Allow,Transport,Phone,Food,Vacation Bal\n";
    employees.forEach(emp => {
      const bal = AccrualEngine.calculateVacationBalance(emp, formatDate(new Date()));
      csv += [emp.id, `"${emp.name}"`, emp.qid, emp.qidExpiry, emp.passportNo, emp.passportExpiry, emp.licenseNo || '', emp.licenseExpiry || '', emp.joiningDate, emp.roleType, emp.basicSalary, emp.accommodationType, emp.accommodationAllowance, emp.transportAllowance, emp.phoneAllowance, emp.foodAllowance || 0, bal].join(",") + "\n";
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `HR_Export_${formatDate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importJSON = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) {
          setReady(false);
          await supabase.from('salary_history').delete().neq('id', '');
          await supabase.from('vacations').delete().neq('id', '');
          await supabase.from('terminations').delete().neq('id', '');
          await supabase.from('employees').delete().neq('id', '');
          
          for (const emp of data) {
            await supabase.from('employees').insert({
              id: emp.id,
              name: emp.name,
              qid: emp.qid,
              qid_expiry: emp.qidExpiry,
              passport_no: emp.passportNo,
              passport_expiry: emp.passportExpiry,
              license_no: emp.licenseNo || null,
              license_expiry: emp.licenseExpiry || null,
              joining_date: emp.joiningDate,
              role_type: emp.roleType,
              basic_salary: emp.basicSalary,
              accommodation_type: emp.accommodationType,
              accommodation_allowance: emp.accommodationAllowance,
              transport_allowance: emp.transportAllowance,
              phone_allowance: emp.phoneAllowance,
              food_allowance: emp.foodAllowance,
              status: emp.status,
              end_date: emp.endDate || null
            });
            if (emp.status === 'Terminated') {
              await supabase.from('terminations').insert({
                id: `term-${emp.id}-${Math.random().toString(36).substring(2, 9)}`,
                employee_id: emp.id,
                end_date: emp.endDate || formatDate(new Date()),
                eos_details: emp.eosDetails || {}
              });
            }
            if (emp.vacations) {
              for (const v of emp.vacations) {
                await supabase.from('vacations').insert({
                  id: v.id || `leave-${emp.id}-${Math.random().toString(36).substring(2, 9)}`,
                  employee_id: emp.id,
                  start_date: v.startDate,
                  end_date: v.endDate,
                  duration: v.duration,
                  status: v.status || 'Completed'
                });
              }
            }
            if (emp.salaryHistory) {
              for (const h of emp.salaryHistory) {
                await supabase.from('salary_history').insert({
                  id: h.id || `hike-${emp.id}-${Math.random().toString(36).substring(2, 9)}`,
                  employee_id: emp.id,
                  effective_date: h.effectiveDate,
                  old_basic_salary: h.oldBasicSalary,
                  new_basic_salary: h.newBasicSalary,
                  old_allowances: h.oldAllowances,
                  new_allowances: h.newAllowances,
                  reason: h.reason
                });
              }
            }
          }
          await refreshData();
          setReady(true);
          toast('Data imported successfully.');
        } else {
          toast('Invalid file format.', 'error');
        }
      } catch (err) {
        toast('JSON parse failed.', 'error');
        setReady(true);
      }
    };
    reader.readAsText(file);
  };

  const clearNotifications = async () => {
    await supabase.from('notifications').delete().neq('id', '');
    await refreshData();
  };

  const clearNotification = async (id) => {
    await supabase.from('notifications').delete().eq('id', id);
    await refreshData();
  };

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).neq('id', '');
    await refreshData();
  };

  const markNotificationRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    await refreshData();
  };

  const revertAction = async (logId) => {
    try {
      const { data: log, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('id', logId)
        .single();

      if (error || !log) throw new Error('Audit log not found');
      if (log.reverted) throw new Error('Action already reverted');

      const details = log.details;
      const empId = log.employee_id;

      if (log.action_type === 'ADD_EMPLOYEE') {
        await supabase.from('employees').delete().eq('id', details.employeeId);
      } else if (log.action_type === 'BOOK_VACATION') {
        await supabase.from('vacations').delete().eq('id', details.vacationId);
      } else if (log.action_type === 'APPLY_HIKE') {
        await supabase.from('employees').update({
          basic_salary: details.oldBasicSalary,
          accommodation_type: details.oldAccommodationType,
          accommodation_allowance: details.oldAccommodationAllowance,
          transport_allowance: details.oldTransportAllowance,
          phone_allowance: details.oldPhoneAllowance,
          food_allowance: details.oldFoodAllowance
        }).eq('id', empId);

        await supabase.from('salary_history').delete().eq('id', details.hikeId);
      } else if (log.action_type === 'PROCESS_EOS') {
        await supabase.from('employees').update({
          status: details.oldStatus || 'Active',
          end_date: null
        }).eq('id', empId);

        if (details.terminationId) {
          await supabase.from('terminations').delete().eq('id', details.terminationId);
        } else {
          await supabase.from('terminations').delete().eq('employee_id', empId);
        }
      }

      await supabase.from('audit_logs').update({ reverted: true }).eq('id', logId);

      await supabase.from('notifications').insert({
        id: Math.random().toString(36).substring(2, 9),
        title: 'Action Reverted',
        body: `Reverted ${log.action_type.replace('_', ' ').toLowerCase()} action.`,
        category: 'info',
        employee_id: empId,
        is_read: false
      });

      await refreshData();
      return true;
    } catch (err) {
      console.error('[Supabase] Revert action failed:', err);
      toast(`Revert failed: ${err.message}`, 'error');
      return false;
    }
  };

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark-mode', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const handleEnablePush = async () => {
    if (!('Notification' in window)) { toast('Notifications not supported.', 'error'); return; }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') { setPushEnabled(true); toast('Desktop notifications enabled.'); }
    else toast('Notification permission denied.', 'error');
  };

  const hashPassword = async (password) => {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const login = async (username, password) => {
    const hashedPassword = await hashPassword(password);
    const { data: user, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .eq('password', hashedPassword)
      .single();

    if (user && !error) {
      setIsAuthenticated(true);
      localStorage.setItem('hr_authenticated', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('hr_authenticated');
  };

  return (
    <HRContext.Provider value={{
      employees, notifications, search, setSearch, roleTypeFilter, setRoleTypeFilter,
      statusFilter, setStatusFilter, currentPage, setCurrentPage, pushEnabled,
      darkMode, ready, seedDatabase, addEmployee, bookVacation, applySalaryHike,
      processEOS, exportCSV, importJSON, clearNotifications, clearNotification,
      markAllRead, markNotificationRead, toggleTheme, handleEnablePush,
      drawerOpen, setDrawerOpen, isAuthenticated, login, logout,
      auditLogs, revertAction,
      toast, confirm
    }}>
      {children}
      <Toaster toasts={toasts} dismiss={dismissToast} />
      <ConfirmDialog state={confirmState} close={closeConfirm} />
    </HRContext.Provider>
  );
}

function Toaster({ toasts, dismiss }) {
  const icon = {
    success: <path d="M20 6 9 17l-5-5" />,
    error: <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>,
    info: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>,
  };
  return (
    <div className="toast-stack" role="region" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} role="status">
          <svg className="toast-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            {icon[t.type] || icon.info}
          </svg>
          <span className="toast-msg">{t.message}</span>
          <button className="toast-x" onClick={() => dismiss(t.id)} aria-label="Dismiss">&times;</button>
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({ state, close }) {
  useEffect(() => {
    if (!state) return;
    const onKey = (e) => { if (e.key === 'Escape') close(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, close]);

  return (
    <div className={`confirm-bg ${state ? 'open' : ''}`} onClick={() => close(false)}>
      {state && (
        <div className="confirm-card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className={`confirm-icon ${state.danger ? 'danger' : ''}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 className="confirm-title">{state.title}</h3>
          {state.message && <p className="confirm-msg">{state.message}</p>}
          <div className="confirm-actions">
            <button className="btn btn-ghost" onClick={() => close(false)}>{state.cancelLabel}</button>
            <button className={`btn ${state.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)} autoFocus>{state.confirmLabel}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function useHR() {
  return useContext(HRContext);
}
