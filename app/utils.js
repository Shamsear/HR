/* app/utils.js */

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
const DAYS_IN_YEAR = 365.25;

export function parseDate(dateStr) {
  return new Date(dateStr);
}

export function formatDate(date) {
  if (!date || isNaN(new Date(date).getTime())) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateDiffInDays(startDate, endDate) {
  const sDate = new Date(startDate);
  const eDate = new Date(endDate);
  sDate.setHours(0, 0, 0, 0);
  eDate.setHours(0, 0, 0, 0);
  return Math.round((eDate - sDate) / MILLISECONDS_IN_DAY);
}

export function calculateTenure(joiningDateStr, targetDateStr) {
  const joinDate = parseDate(joiningDateStr);
  const targetDate = parseDate(targetDateStr);
  
  let years = targetDate.getFullYear() - joinDate.getFullYear();
  let months = targetDate.getMonth() - joinDate.getMonth();
  let days = targetDate.getDate() - joinDate.getDate();
  
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0);
    days += prevMonth.getDate();
  }
  
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  
  return { years, months, days, totalDays: dateDiffInDays(joinDate, targetDate) };
}

export function getDocumentExpiryStatus(expiryDateStr, checkDateStr = formatDate(new Date())) {
  if (!expiryDateStr) return { status: 'none', label: 'N/A', daysRemaining: 9999 };
  const expiry = parseDate(expiryDateStr);
  const checkDate = parseDate(checkDateStr);
  const diffDays = dateDiffInDays(checkDate, expiry);
  
  if (diffDays < 0) {
    return { status: 'expired', label: 'Expired', daysRemaining: diffDays };
  } else if (diffDays <= 30) {
    return { status: 'expiring', label: `Expiring in ${diffDays} days`, daysRemaining: diffDays };
  } else {
    return { status: 'active', label: 'Valid', daysRemaining: diffDays };
  }
}

export function calculateTicketEligibility(roleType, joiningDateStr, targetDateStr = formatDate(new Date())) {
  const tenure = calculateTenure(joiningDateStr, targetDateStr);
  const years = tenure.totalDays / 365.25;
  
  if (roleType === 'Staff') {
    if (years >= 1) return { eligible: true, type: 'Two-Way Ticket' };
  } else if (roleType === 'Worker') {
    if (years >= 2) return { eligible: true, type: 'Two-Way Ticket' };
    if (years >= 1) return { eligible: true, type: 'One-Way Ticket' };
  }
  return { eligible: false, type: 'None' };
}

export class AccrualEngine {
  /**
   * Computes vacation balance dynamically.
   * First 5 years: 21 days/year.
   * After 5 years: 28 days/year.
   * Splits period dynamically at the 5-year anniversary.
   */
  static calculateVacationBalance(employee, targetDateStr) {
    const targetDate = parseDate(targetDateStr);
    const joinDate = parseDate(employee.joiningDate);
    
    let accrualStart = joinDate;
    let carryover = 0;
    
    if (employee.vacations && employee.vacations.length > 0) {
      // Sort vacations by end date descending
      const sortedVacations = [...employee.vacations].sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
      const lastVacation = sortedVacations[0];
      
      const returnDate = new Date(lastVacation.endDate);
      returnDate.setDate(returnDate.getDate() + 1);
      
      accrualStart = returnDate;
      carryover = this.calculateHistoricalBalanceAtReturn(employee, sortedVacations);
    }
    
    if (targetDate < accrualStart) {
      return carryover;
    }
    
    const accrual = this.calculateAccruedBetween(joinDate, accrualStart, targetDate);
    
    return parseFloat((carryover + accrual).toFixed(2));
  }
  
  static calculateAccruedBetween(joinDate, startDate, endDate) {
    const anniversary5 = new Date(joinDate);
    anniversary5.setFullYear(anniversary5.getFullYear() + 5);
    
    let totalAccrued = 0;
    
    if (endDate <= anniversary5) {
      const days = dateDiffInDays(startDate, endDate);
      totalAccrued = days * (21 / DAYS_IN_YEAR);
    } else if (startDate >= anniversary5) {
      const days = dateDiffInDays(startDate, endDate);
      totalAccrued = days * (28 / DAYS_IN_YEAR);
    } else {
      const preAnniversaryDays = dateDiffInDays(startDate, anniversary5);
      const postAnniversaryDays = dateDiffInDays(anniversary5, endDate);
      
      const preAccrual = preAnniversaryDays * (21 / DAYS_IN_YEAR);
      const postAccrual = postAnniversaryDays * (28 / DAYS_IN_YEAR);
      totalAccrued = preAccrual + postAccrual;
    }
    
    return totalAccrued;
  }
  
  static calculateHistoricalBalanceAtReturn(employee, sortedVacationsDesc) {
    const chronologicalVacations = [...sortedVacationsDesc].reverse();
    const joinDate = parseDate(employee.joiningDate);
    
    let balance = 0;
    let periodStart = joinDate;
    
    for (const leave of chronologicalVacations) {
      const leaveStart = parseDate(leave.startDate);
      const leaveEnd = parseDate(leave.endDate);
      
      if (leaveStart > periodStart) {
        balance += this.calculateAccruedBetween(joinDate, periodStart, leaveStart);
      }
      
      const leaveDays = dateDiffInDays(leaveStart, leaveEnd) + 1;
      balance -= leaveDays;
      
      const nextStart = new Date(leaveEnd);
      nextStart.setDate(nextStart.getDate() + 1);
      periodStart = nextStart;
    }
    
    return balance;
  }
  
  /**
   * Calculates End of Service settlement per Qatar Labour Law:
   *
   * Gratuity (Art. 54):
   *   - Based on BASIC SALARY only
   *   - 21 days × (basic / 30) × years of service
   *
   * Leave Encashment (Art. 79/80):
   *   - Based on FULL WAGE (basic + all allowances)
   *   - Unused balance × (fullWage / 30)
   *
   * Leave Salary (during vacation):
   *   - Employee receives their FULL WAGE during annual leave
   */
  static calculateEOS(employee, endDateStr) {
    const basicSalary = parseFloat(employee.basicSalary) || 0;

    const allowances = {
      accommodation: employee.accommodationType === 'self' ? (parseFloat(employee.accommodationAllowance) || 0) : 0,
      transport: parseFloat(employee.transportAllowance) || 0,
      phone: parseFloat(employee.phoneAllowance) || 0,
      food: parseFloat(employee.foodAllowance) || 0,
      other: parseFloat(employee.otherAllowance) || 0
    };

    const totalSalary = basicSalary + allowances.accommodation + allowances.transport + allowances.phone + allowances.food + allowances.other;

    // Gratuity: basic salary only (Art. 54)
    const dailyBasicWage = basicSalary / 30;

    // Leave salary wage basis: Basic + Phone + Food + Other + (Accommodation Allowance only if accommodation is self)
    const leaveSalaryBasis = basicSalary + allowances.phone + allowances.food + allowances.other + (employee.accommodationType === 'self' ? allowances.accommodation : 0);
    const dailyLeaveWage = leaveSalaryBasis / 30;

    const tenure = calculateTenure(employee.joiningDate, endDateStr);
    const tenureYears = tenure.totalDays / DAYS_IN_YEAR;

    const gratuityDays = tenureYears * 21;
    const gratuityAmount = gratuityDays * dailyBasicWage;

    const vacationBalance = this.calculateVacationBalance(employee, endDateStr);
    const vacationSettlement = vacationBalance * dailyLeaveWage;

    const netPayout = gratuityAmount + vacationSettlement;

    return {
      tenure,
      tenureYears: parseFloat(tenureYears.toFixed(2)),
      gratuityDays: parseFloat(gratuityDays.toFixed(2)),
      gratuityAmount: parseFloat(gratuityAmount.toFixed(2)),
      vacationBalance,
      vacationSettlement: parseFloat(vacationSettlement.toFixed(2)),
      basicSalary,
      dailyBasicWage: parseFloat(dailyBasicWage.toFixed(2)),
      dailyLeaveWage: parseFloat(dailyLeaveWage.toFixed(2)),
      leaveSalaryBasis,
      allowances,
      totalSalary,
      netPayout: parseFloat(netPayout.toFixed(2))
    };
  }

  /**
   * Calculates the daily leave salary basis:
   * Basic + Phone + Food + Other + (Accommodation Allowance only if accommodationType is 'self')
   */
  static calculateLeaveSalary(employee) {
    const basic = parseFloat(employee.basicSalary) || 0;
    const phone = parseFloat(employee.phoneAllowance) || 0;
    const food = parseFloat(employee.foodAllowance) || 0;
    const other = parseFloat(employee.otherAllowance) || 0;
    const accom = employee.accommodationType === 'self' ? (parseFloat(employee.accommodationAllowance) || 0) : 0;
    const leaveSalaryBasis = basic + phone + food + other + accom;
    return {
      leaveSalaryBasis,
      dailyLeaveSalary: parseFloat((leaveSalaryBasis / 30).toFixed(2)),
      basicSalary: basic,
      phoneAllowance: phone,
      foodAllowance: food,
      otherAllowance: other,
      accommodationAllowance: accom
    };
  }
}

/**
 * Checks if an employee has overstayed their vacation end date without return.
 */
export function isOverstaying(employee, targetDateStr = formatDate(new Date())) {
  if (!employee || !employee.vacations || employee.vacations.length === 0 || employee.status !== 'On Leave') return false;
  const target = new Date(targetDateStr);
  
  // Find ongoing/latest vacation
  const ongoing = employee.vacations.find(v => {
    const start = new Date(v.startDate);
    const end = new Date(v.endDate);
    // Checked if today is past the end date
    return target > end;
  });

  return !!ongoing;
}
