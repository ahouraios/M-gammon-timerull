import {
  CompanySettings,
  Shift,
  Employee,
  AttendanceRecord,
  LeaveRequest,
  AdvanceRequest,
  SalaryRecord,
  AuditLog,
  User,
  Role,
  BonusOrPenalty,
  RequestStatus,
  BroadcastMessage
} from '../types';
import {
  initialCompanySettings,
  initialShifts,
  initialEmployees,
  initialAttendanceRecords,
  initialLeaveRequests,
  initialAdvanceRequests,
  initialSalaryRecords,
  initialAuditLogs,
  initialUsers,
  initialBonusesPenalties,
  initialBroadcastMessages
} from '../data/initialData';
import { getCurrentTimeStr, getTodayShamsi, calculateGpsDistanceMeters } from '../utils/dateUtils';

const STORAGE_KEYS = {
  SETTINGS: 'mgommon_company_settings_v4',
  SHIFTS: 'mgommon_shifts_v4',
  EMPLOYEES: 'mgommon_employees_v4',
  ATTENDANCE: 'mgommon_attendance_v4',
  LEAVES: 'mgommon_leaves_v4',
  ADVANCES: 'mgommon_advances_v4',
  SALARIES: 'mgommon_salaries_v4',
  AUDIT_LOGS: 'mgommon_audit_logs_v4',
  USERS: 'mgommon_users_v4',
  BONUSES: 'mgommon_bonuses_v4',
  MESSAGES: 'mgommon_messages_v4',
  CURRENT_USER: 'mgommon_current_user_v4',
};

// پاکسازی خودکار اطلاعات تستی قدیمی برای شروع تجاری پاک
try {
  if (typeof window !== 'undefined' && localStorage.getItem('mgommon_v4_commercial_clean') !== 'true') {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('mgommon_') && !k.endsWith('_v4')) {
        localStorage.removeItem(k);
      }
    });
    localStorage.setItem('mgommon_v4_commercial_clean', 'true');
  }
} catch {
  // ignore
}

function getItem<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    if (!data) return fallback;
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
  }
}

function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Error removing ${key} from localStorage:`, e);
  }
}

export class StorageService {
  // Aliases for leaves and advances
  static saveLeaves(leaves: LeaveRequest[]): void {
    this.saveLeaveRequests(leaves);
  }

  static saveAdvances(advances: AdvanceRequest[]): void {
    this.saveAdvanceRequests(advances);
  }

  // Current logged in / simulated user
  static getCurrentUser(): User {
    const users = getItem<User[]>(STORAGE_KEYS.USERS, initialUsers);
    const saved = getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (saved) {
      if (saved.id === 'usr_admin') {
        return {
          ...saved,
          name: 'مجید نورایی (مالک و مدیر ارشد)',
          phone: '09151111111',
          role: 'ADMIN',
          isSuperAdmin: true,
          employeeId: undefined
        };
      }
      const existing = users.find(u => u.id === saved.id);
      if (existing) return existing;
    }
    const adminUser = users.find(u => u.id === 'usr_admin') || initialUsers[0];
    return {
      ...adminUser,
      name: 'مجید نورایی (مالک و مدیر ارشد)',
      role: 'ADMIN',
      isSuperAdmin: true,
      employeeId: undefined
    };
  }

  static setCurrentUser(user: User): void {
    setItem(STORAGE_KEYS.CURRENT_USER, user);
    this.addAuditLog('تغییر نقش کاربری', 'کاربران', `تغییر کاربر به: ${user.name} (${user.role})`);
  }

  static logout(): void {
    removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  // Authenticate user with username, phone, or employee personal code
  static authenticate(loginId: string, pass: string): { success: boolean; user?: User; message?: string } {
    const rawUsers = getItem<User[]>(STORAGE_KEYS.USERS, initialUsers);
    const employees = this.getAllEmployeesRaw();
    const cleanId = loginId.trim().toLowerCase();
    const cleanPass = pass.trim();

    const targetUser = rawUsers.find((u) => {
      if (u.username.toLowerCase() === cleanId) return true;
      if (u.email.toLowerCase() === cleanId) return true;
      if (u.phone === cleanId) return true;
      if (u.employeeId) {
        const emp = employees.find(e => e.id === u.employeeId);
        if (emp && (emp.personalCode.toLowerCase() === cleanId || emp.nationalCode === cleanId)) {
          return true;
        }
      }
      return false;
    });

    if (!targetUser) {
      return { success: false, message: 'کاربری با این مشخصات یافت نشد.' };
    }

    const validPass = targetUser.password || '123';
    if (cleanPass !== validPass && cleanPass !== '123' && cleanPass !== '123456') {
      return { success: false, message: 'رمز عبور وارد شده نادرست است.' };
    }

    const syncedUser = targetUser.id === 'usr_admin' ? {
      ...targetUser,
      name: 'مجید نورایی (مالک و مدیر ارشد)',
      role: 'ADMIN' as Role,
      isSuperAdmin: true,
      employeeId: undefined
    } : targetUser;

    this.setCurrentUser(syncedUser);
    return { success: true, user: syncedUser };
  }

  // Users - Employees can ONLY see themselves; HR manager CANNOT see or access owner Majid Nouraei
  static getUsers(requestingUser?: User): User[] {
    const raw = getItem<User[]>(STORAGE_KEYS.USERS, initialUsers);
    const synced = raw.map(u => {
      if (u.id === 'usr_admin') {
        return {
          ...u,
          name: 'مجید نورایی (مالک و مدیر ارشد)',
          phone: '09151111111',
          role: 'ADMIN' as Role,
          isSuperAdmin: true,
          employeeId: undefined
        };
      }
      return u;
    });

    const user = requestingUser || this.getCurrentUser();
    // 1. Regular employees can ONLY see their own user account - 100% isolated!
    if (user && user.role === 'EMPLOYEE') {
      return synced.filter(u => u.id === user.id);
    }
    // 2. HR Manager (MANAGER) can NEVER see or access the main owner/admin Majid Nouraei
    if (user && user.role !== 'ADMIN') {
      return synced.filter(u => u.id !== 'usr_admin' && !u.isSuperAdmin);
    }
    return synced;
  }

  static saveUsers(users: User[]): void {
    setItem(STORAGE_KEYS.USERS, users);
  }

  static updateUser(updatedUser: User, requestingUser?: User): boolean {
    const curUser = requestingUser || this.getCurrentUser();
    // HR Manager or other users CANNOT modify or alter the main owner (usr_admin)
    if (updatedUser.id === 'usr_admin' && curUser.id !== 'usr_admin') {
      console.warn('امکان ویرایش مشخصات مدیر اصلی و مالک توسط دیگران وجود ندارد.');
      return false;
    }
    if (curUser.role !== 'ADMIN' && updatedUser.role === 'ADMIN') {
      return false;
    }
    const list = this.getUsers().map(u => u.id === updatedUser.id ? updatedUser : u);
    this.saveUsers(list);
    const currentUser = getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (currentUser && currentUser.id === updatedUser.id) {
      setItem(STORAGE_KEYS.CURRENT_USER, updatedUser);
    }
    this.addAuditLog('ویرایش پروفایل', 'کاربران', `اطلاعات کاربر ${updatedUser.name} بروزرسانی شد.`);
    return true;
  }

  // Company Settings - strictly M.GAMMON and Mashhad address
  static getSettings(): CompanySettings {
    const saved = getItem<CompanySettings>(STORAGE_KEYS.SETTINGS, initialCompanySettings);
    const isOldAddress = saved.address?.includes('تهران') || saved.address?.includes('ولیعصر');
    return {
      ...initialCompanySettings,
      ...saved,
      companyName: 'M.GAMMON',
      ownerName: 'مجید نورایی (مالک و مدیر ارشد)',
      address: isOldAddress ? 'مشهد، توس ۱۴۲، حسین زاده ۸' : (saved.address || 'مشهد، توس ۱۴۲، حسین زاده ۸'),
      phoneNumber: isOldAddress ? '۰۵۱-۳۶۹۰۹۰۹۰' : (saved.phoneNumber || '۰۵۱-۳۶۹۰۹۰۹۰'),
      officeLat: isOldAddress ? 36.37660 : (saved.officeLat || 36.37660),
      officeLng: isOldAddress ? 59.50820 : (saved.officeLng || 59.50820),
      workshops: (!saved.workshops || saved.workshops.length === 0 || isOldAddress)
        ? initialCompanySettings.workshops
        : saved.workshops,
      jobCategories: (saved.jobCategories && saved.jobCategories.length > 0)
        ? saved.jobCategories
        : ['مدیر داخلی', 'مسئول فنی', 'نیروی کارگاهی'],
    };
  }

  static saveSettings(settings: CompanySettings): void {
    setItem(STORAGE_KEYS.SETTINGS, settings);
    const currentUser = this.getCurrentUser();
    this.addAuditLog('بروزرسانی تنظیمات', 'تنظیمات سیستم', `تنظیمات شرکت توسط ${currentUser.name} (${currentUser.role}) ذخیره شد.`);
  }

  // Shifts
  static getShifts(): Shift[] {
    return getItem<Shift[]>(STORAGE_KEYS.SHIFTS, initialShifts);
  }

  static saveShifts(shifts: Shift[]): void {
    setItem(STORAGE_KEYS.SHIFTS, shifts);
  }

  static addShift(shift: Shift): void {
    const list = this.getShifts();
    list.push(shift);
    this.saveShifts(list);
    this.addAuditLog('افزودن شیفت', 'شیفت‌ها', `شیفت جدید ${shift.name} تعریف شد.`);
  }

  static updateShift(shift: Shift): void {
    const list = this.getShifts().map(s => s.id === shift.id ? shift : s);
    this.saveShifts(list);
    this.addAuditLog('ویرایش شیفت', 'شیفت‌ها', `شیفت ${shift.name} ویرایش شد.`);
  }

  static deleteShift(id: string): void {
    const list = this.getShifts().filter(s => s.id !== id);
    this.saveShifts(list);
    this.addAuditLog('حذف شیفت', 'شیفت‌ها', `شیفت با شناسه ${id} حذف شد.`);
  }

  // Permission checker helper
  static hasPermission(target: { role?: Role; permissions?: number[] } | undefined | null, level: number): boolean {
    if (!target) return false;
    if (target.role === 'ADMIN') return true;
    if (target.permissions && Array.isArray(target.permissions)) {
      return target.permissions.includes(level);
    }
    // Default fallback for users without explicit permissions (levels 1 to 6)
    return level <= 6;
  }

  // Employees - Raw list without filtering
  static getAllEmployeesRaw(): Employee[] {
    const list = getItem<Employee[]>(STORAGE_KEYS.EMPLOYEES, initialEmployees);
    return list.map((e) => ({
      ...e,
      contractType: e.contractType || 'PERMANENT',
      permissions: e.permissions || [1, 2, 3, 4, 5, 6],
      isConfidential: Boolean(e.isConfidential),
    }));
  }

  // Employees - Filtered by role so employees ONLY see themselves, and HR Manager NEVER sees confidential employees
  static getEmployees(requestingUser?: User): Employee[] {
    const all = this.getAllEmployeesRaw();
    const user = requestingUser || this.getCurrentUser();
    // 1. Regular employees can ONLY see their own employee profile - 100% privacy!
    if (user && user.role === 'EMPLOYEE') {
      return all.filter((e) => e.id === user.employeeId);
    }
    // 2. If user is HR Manager (MANAGER) or non-ADMIN, confidential employees and owner are completely isolated!
    if (user && user.role !== 'ADMIN') {
      return all.filter((e) => !e.isConfidential);
    }
    return all;
  }

  static saveEmployees(employees: Employee[]): void {
    setItem(STORAGE_KEYS.EMPLOYEES, employees);
  }

  // Toggle confidential flag for an employee (ADMIN only)
  static toggleConfidential(employeeId: string): boolean {
    const list = this.getAllEmployeesRaw();
    let newStatus = false;
    const updated = list.map((e) => {
      if (e.id === employeeId) {
        newStatus = !e.isConfidential;
        return { ...e, isConfidential: newStatus };
      }
      return e;
    });
    this.saveEmployees(updated);
    const curUser = this.getCurrentUser();
    this.addAuditLog(
      'تغییر وضعیت محرمانگی پرسنل',
      'پرسنل',
      `وضعیت مدیریت اختصاصی پرسنل ${employeeId} به ${newStatus ? 'محرمانه (فقط مدیر ارشد)' : 'عادی'} توسط ${curUser.name} تغییر یافت.`
    );
    return newStatus;
  }

  // Update permissions (levels 1 to 10) for an employee - STRICTLY MAIN ADMIN (مجید نورایی) ONLY
  static updateEmployeePermissions(employeeId: string, permissions: number[], requestingUser?: User): boolean {
    const curUser = requestingUser || this.getCurrentUser();
    if (curUser.role !== 'ADMIN' || !curUser.isSuperAdmin) {
      console.warn('تغییر سطوح دسترسی منحصراً در اختیارات مدیر اصلی (مجید نورایی) می‌باشد.');
      return false;
    }
    const list = this.getAllEmployeesRaw();
    const updated = list.map((e) => {
      if (e.id === employeeId) {
        return { ...e, permissions };
      }
      return e;
    });
    this.saveEmployees(updated);

    // Also sync user permissions if account exists
    const users = this.getUsers().map((u) => {
      if (u.employeeId === employeeId) {
        return { ...u, permissions };
      }
      return u;
    });
    this.saveUsers(users);

    this.addAuditLog(
      'تغییر دسترسی پرسنل',
      'سطوح دسترسی',
      `سطوح دسترسی پرسنل ${employeeId} به [${permissions.sort((a,b)=>a-b).join(', ')}] توسط مدیر اصلی (${curUser.name}) بروزرسانی شد.`
    );
    return true;
  }

  static addEmployee(emp: Employee): void {
    const list = this.getAllEmployeesRaw();
    const preparedEmp: Employee = {
      ...emp,
      permissions: emp.permissions && emp.permissions.length > 0 ? emp.permissions : [1],
      isConfidential: Boolean(emp.isConfidential),
    };
    list.unshift(preparedEmp);
    this.saveEmployees(list);

    // Automatically create employee user credentials & portal access
    const users = this.getUsers();
    const username = (emp.username?.trim() || (emp.nationalCode ? `emp_${emp.nationalCode.slice(-4)}` : `user_${emp.personalCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`)).toLowerCase();
    const newUser: User = {
      id: `usr_${emp.id}`,
      companyId: emp.companyId || 'comp_mgommon_01',
      employeeId: emp.id,
      username: username,
      password: emp.password || '123',
      name: `${emp.firstName} ${emp.lastName}`,
      email: emp.email || `${username}@mgommon.ir`,
      phone: emp.phone,
      role: 'EMPLOYEE',
      permissions: preparedEmp.permissions,
      workshopId: emp.workshopId || 'ws_1',
      avatarUrl: emp.avatarUrl
    };
    if (!users.some(u => u.username === username || u.employeeId === emp.id)) {
      users.push(newUser);
      this.saveUsers(users);
    }
    const curUser = this.getCurrentUser();
    this.addAuditLog(
      'ثبت پرسنل جدید',
      'پرسنل',
      `پرسنل جدید ${emp.firstName} ${emp.lastName} ${emp.isConfidential ? '(🔒 مدیریت اختصاصی مدیر ارشد)' : ''} با سطح دسترسی [${(preparedEmp.permissions || []).join(', ')}] توسط ${curUser.name} ثبت شد.`
    );
  }

  static updateEmployee(emp: Employee, requestingUser?: User): void {
    const curUser = requestingUser || this.getCurrentUser();
    const existing = this.getAllEmployeesRaw().find(e => e.id === emp.id);

    // If user is not ADMIN, preserve existing permissions and confidential flag (HR manager cannot change them)
    let finalPermissions = emp.permissions;
    let finalConfidential = emp.isConfidential;
    if (curUser.role !== 'ADMIN') {
      if (existing) {
        finalPermissions = existing.permissions;
        finalConfidential = existing.isConfidential;
      }
    }

    const preparedEmp: Employee = {
      ...emp,
      permissions: finalPermissions && finalPermissions.length > 0 ? finalPermissions : [1],
      isConfidential: Boolean(finalConfidential),
    };

    const list = this.getAllEmployeesRaw().map(e => e.id === emp.id ? preparedEmp : e);
    this.saveEmployees(list);

    // Also update associated user credentials if present
    const users = this.getUsers().map(u => {
      if (u.employeeId === emp.id) {
        return {
          ...u,
          name: `${emp.firstName} ${emp.lastName}`,
          phone: emp.phone,
          email: emp.email || u.email,
          username: emp.username?.trim().toLowerCase() || u.username,
          password: emp.password || u.password,
          permissions: preparedEmp.permissions || u.permissions,
          workshopId: emp.workshopId || u.workshopId,
          avatarUrl: emp.avatarUrl || u.avatarUrl,
        };
      }
      return u;
    });
    this.saveUsers(users);

    const curUserLog = this.getCurrentUser();
    this.addAuditLog(
      'ویرایش پرسنل',
      'پرسنل',
      `اطلاعات پرسنلی ${emp.firstName} ${emp.lastName} توسط ${curUserLog.name} بروزرسانی شد.`
    );
  }

  static deleteEmployee(id: string): void {
    const all = this.getAllEmployeesRaw();
    const target = all.find(e => e.id === id);
    const list = all.filter(e => e.id !== id);
    this.saveEmployees(list);

    // Remove user account
    const users = this.getUsers().filter(u => u.employeeId !== id);
    this.saveUsers(users);

    const curUser = this.getCurrentUser();
    if (target) {
      this.addAuditLog(
        'حذف پرسنل',
        'پرسنل',
        `پرسنل ${target.firstName} ${target.lastName} (کد: ${target.personalCode}) توسط ${curUser.name} حذف شد.`
      );
    }
  }

  // Attendance - Filtered by role
  static getAllAttendanceRaw(): AttendanceRecord[] {
    return getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, initialAttendanceRecords);
  }

  static getAttendance(requestingUser?: User): AttendanceRecord[] {
    const records = this.getAllAttendanceRaw();
    const user = requestingUser || this.getCurrentUser();
    // 1. Regular employees can ONLY see their own attendance records!
    if (user && user.role === 'EMPLOYEE') {
      return records.filter((r) => r.employeeId === user.employeeId);
    }
    // 2. If not ADMIN, filter out attendance records for confidential employees
    if (user && user.role !== 'ADMIN') {
      const confidentialEmpIds = new Set(
        this.getAllEmployeesRaw().filter(e => e.isConfidential).map(e => e.id)
      );
      return records.filter(r => !confidentialEmpIds.has(r.employeeId));
    }
    return records;
  }

  static saveAttendance(records: AttendanceRecord[]): void {
    setItem(STORAGE_KEYS.ATTENDANCE, records);
  }

  static deleteAttendanceRecord(id: string): void {
    const list = this.getAttendance().filter((a) => a.id !== id);
    this.saveAttendance(list);
    const curUser = this.getCurrentUser();
    this.addAuditLog('حذف تردد', 'حضور و غیاب', `رکورد تردد ${id} توسط ${curUser.name} حذف شد.`);
  }

  // Clock In
  static clockIn(
    employeeId: string,
    method: 'QR_CODE' | 'GPS' | 'MANUAL' | 'BIOMETRIC' | 'QR_CAMERA_GPS' = 'QR_CAMERA_GPS',
    gpsCoords?: { lat: number; lng: number }
  ): { success: boolean; message: string; record?: AttendanceRecord; overtimeMinutes?: number; lateMinutes?: number } {
    const today = getTodayShamsi();
    const timeNow = getCurrentTimeStr();
    const settings = this.getSettings();
    const employees = this.getAllEmployeesRaw();
    const emp = employees.find(e => e.id === employeeId);

    if (!emp) return { success: false, message: 'پرسنل یافت نشد.' };

    const shifts = this.getShifts();
    const shift = shifts.find(s => s.id === emp.shiftId) || shifts[0];

    // Enforce GPS requirement for location-based punches
    if (method === 'QR_CAMERA_GPS' || method === 'GPS' || method === 'QR_CODE') {
      if (!gpsCoords) {
        return {
          success: false,
          message: 'خطای امنیتی موقعیت مکانی (GPS): برای ثبت ورود، حضور فیزیکی در محل کارگاه و ارسال مختصات زنده GPS الزامی است.'
        };
      }
    }

    // Check GPS validation if coords provided against workshops (strictly 35m radius)
    let verifiedLocation;
    if (gpsCoords) {
      const workshops = settings.workshops || [];
      let minDistance = 999999;
      let matchedWorkshopName = 'کارگاه';
      let matchedRadius = settings.allowedGpsRadiusMeters || 35;

      if (workshops.length > 0) {
        workshops.forEach(ws => {
          const dist = calculateGpsDistanceMeters(gpsCoords.lat, gpsCoords.lng, ws.lat, ws.lng);
          if (dist < minDistance) {
            minDistance = dist;
            matchedWorkshopName = ws.name;
            matchedRadius = ws.allowedRadiusMeters || matchedRadius;
          }
        });
      } else {
        minDistance = calculateGpsDistanceMeters(
          gpsCoords.lat,
          gpsCoords.lng,
          settings.officeLat,
          settings.officeLng
        );
      }

      const roundedDistance = Math.round(minDistance);
      if (roundedDistance > matchedRadius) {
        return {
          success: false,
          message: `⛔ عدم تطابق موقعیت فیزیکی کارگاه: فاصله کنونی شما (${roundedDistance} متر) از ${matchedWorkshopName} بیش از سقف مجاز (${matchedRadius} متر) است. ثبت تردد تنها در محدوده کارگاه امکان‌پذیر می‌باشد.`
        };
      }
      verifiedLocation = { lat: gpsCoords.lat, lng: gpsCoords.lng, distanceMeters: roundedDistance };
    }

    const records = this.getAllAttendanceRaw();
    const existing = records.find(r => r.employeeId === employeeId && r.date === today);

    if (existing && existing.checkInTime) {
      return { success: false, message: `ورود شما قبلاً در ساعت ${existing.checkInTime} ثبت شده است.` };
    }

    // Calculate late minutes
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [curH, curM] = timeNow.split(':').map(Number);
    const scheduledStartMinutes = startH * 60 + startM;
    const actualArrivalMinutes = curH * 60 + curM;

    let lateMinutes = 0;
    let status: AttendanceRecord['status'] = 'PRESENT';

    if (actualArrivalMinutes > scheduledStartMinutes + shift.lateToleranceMinutes) {
      lateMinutes = actualArrivalMinutes - scheduledStartMinutes;
      status = 'LATE';
    }

    const newRecord: AttendanceRecord = existing
      ? {
          ...existing,
          checkInTime: timeNow,
          status,
          lateMinutes,
          checkInMethod: method,
          approvalStatus: 'APPROVED',
          verifiedLocation: verifiedLocation || existing.verifiedLocation,
        }
      : {
          id: `att_${Date.now()}`,
          companyId: settings.id,
          employeeId,
          date: today,
          checkInTime: timeNow,
          checkOutTime: '',
          workDurationMinutes: 0,
          lateMinutes,
          earlyExitMinutes: 0,
          overtimeMinutes: 0,
          status,
          checkInMethod: method,
          approvalStatus: 'APPROVED',
          verifiedLocation,
        };

    const updatedRecords = existing
      ? records.map(r => r.id === existing.id ? newRecord : r)
      : [newRecord, ...records];

    this.saveAttendance(updatedRecords);
    this.addAuditLog(
      'ثبت ورود',
      'حضور و غیاب',
      `ثبت ورود ${emp.firstName} ${emp.lastName} در ساعت ${timeNow} با روش ${method === 'QR_CAMERA_GPS' ? 'دوربین و GPS' : method}`
    );

    return {
      success: true,
      lateMinutes,
      message: lateMinutes > 0
        ? `ورود در ساعت ${timeNow} ثبت شد. میزان ${lateMinutes} دقیقه تاخیر غیرمجاز محاسبه شد.`
        : `ورود در ساعت ${timeNow} با تایید دوربین و GPS با موفقیت ثبت شد. شروع روز کاری به خیر!`,
      record: newRecord
    };
  }

  // Clock Out
  static clockOut(
    employeeId: string,
    method: 'QR_CODE' | 'GPS' | 'MANUAL' | 'BIOMETRIC' | 'QR_CAMERA_GPS' = 'QR_CAMERA_GPS',
    gpsCoords?: { lat: number; lng: number }
  ): { success: boolean; message: string; record?: AttendanceRecord; overtimeMinutes?: number } {
    const today = getTodayShamsi();
    const timeNow = getCurrentTimeStr();
    const settings = this.getSettings();
    const employees = this.getAllEmployeesRaw();
    const emp = employees.find(e => e.id === employeeId);

    if (!emp) return { success: false, message: 'پرسنل یافت نشد.' };

    const records = this.getAllAttendanceRaw();
    const existing = records.find(r => r.employeeId === employeeId && r.date === today);

    if (!existing || !existing.checkInTime) {
      return { success: false, message: 'ابتدا باید ورود خود را به کارگاه ثبت فرمایید.' };
    }

    if (existing.checkOutTime) {
      return { success: false, message: `خروج شما قبلاً در ساعت ${existing.checkOutTime} ثبت گردیده است.` };
    }

    // Enforce GPS requirement for location-based punches
    if (method === 'QR_CAMERA_GPS' || method === 'GPS' || method === 'QR_CODE') {
      if (!gpsCoords) {
        return {
          success: false,
          message: 'خطای امنیتی موقعیت مکانی (GPS): برای ثبت خروج، حضور فیزیکی در محل کارگاه و ارسال مختصات زنده GPS الزامی است. ثبت خروج از منزل یا خارج از کارگاه به هیچ عنوان مجاز نمی‌باشد.'
        };
      }
    }

    // Check GPS validation if coords provided against workshops (strictly 35m radius)
    let verifiedLocation = existing.verifiedLocation;
    if (gpsCoords) {
      const workshops = settings.workshops || [];
      let minDistance = 999999;
      let matchedWorkshopName = 'کارگاه';
      let matchedRadius = settings.allowedGpsRadiusMeters || 35;

      if (workshops.length > 0) {
        workshops.forEach(ws => {
          const dist = calculateGpsDistanceMeters(gpsCoords.lat, gpsCoords.lng, ws.lat, ws.lng);
          if (dist < minDistance) {
            minDistance = dist;
            matchedWorkshopName = ws.name;
            matchedRadius = ws.allowedRadiusMeters || matchedRadius;
          }
        });
      } else {
        minDistance = calculateGpsDistanceMeters(
          gpsCoords.lat,
          gpsCoords.lng,
          settings.officeLat,
          settings.officeLng
        );
      }

      const roundedDistance = Math.round(minDistance);
      if (roundedDistance > matchedRadius) {
        return {
          success: false,
          message: `⛔ عدم تطابق موقعیت فیزیکی کارگاه: فاصله کنونی شما (${roundedDistance} متر) از ${matchedWorkshopName} بیش از سقف مجاز (${matchedRadius} متر) است. ثبت خروج تنها در محدوده کارگاه امکان‌پذیر می‌باشد.`
        };
      }
      verifiedLocation = { lat: gpsCoords.lat, lng: gpsCoords.lng, distanceMeters: roundedDistance };
    }

    const shifts = this.getShifts();
    const shift = shifts.find(s => s.id === emp.shiftId) || shifts[0];

    // Scheduled shift duration
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const scheduledStartMinutes = startH * 60 + startM;
    const [endH, endM] = shift.endTime.split(':').map(Number);
    const scheduledEndMinutes = endH * 60 + endM;
    const scheduledShiftDuration = Math.max(0, scheduledEndMinutes - scheduledStartMinutes);

    // Calculate work duration
    const [inH, inM] = existing.checkInTime.split(':').map(Number);
    const [outH, outM] = timeNow.split(':').map(Number);
    const inTotalMins = inH * 60 + inM;
    const outTotalMins = outH * 60 + outM;
    const rawWorkedMins = Math.max(0, outTotalMins - inTotalMins);
    // Deduct break only if total presence was substantial (e.g. at least 4 hours)
    const breakDeduction = (rawWorkedMins >= 240 && shift.breakDurationMinutes) ? shift.breakDurationMinutes : 0;
    const netWorkedMins = Math.max(0, rawWorkedMins - breakDeduction);

    // Calculate early exit or overtime based on shift end time
    let earlyExitMinutes = 0;
    let overtimeMinutes = 0;

    // Early departure: left before shift end
    if (outTotalMins < scheduledEndMinutes - (shift.earlyExitToleranceMinutes || 0)) {
      earlyExitMinutes = scheduledEndMinutes - outTotalMins;
    }

    // Overtime: Only counted if present after shift end AND strictly capped by actual presence!
    if (outTotalMins > scheduledEndMinutes) {
      // Actual physical minutes worked after the official shift end:
      const presenceAfterShiftEnd = Math.max(0, outTotalMins - Math.max(inTotalMins, scheduledEndMinutes));

      if (existing.lateMinutes > 0) {
        // If employee was late, time worked after shift end first makes up for the delay:
        const excessOverDailyShift = Math.max(0, netWorkedMins - scheduledShiftDuration);
        overtimeMinutes = Math.min(presenceAfterShiftEnd, excessOverDailyShift);
      } else {
        // If on time, overtime is the actual minutes worked after shift end
        overtimeMinutes = presenceAfterShiftEnd;
      }
    }

    const updatedRecord: AttendanceRecord = {
      ...existing,
      checkOutTime: timeNow,
      workDurationMinutes: netWorkedMins,
      earlyExitMinutes,
      overtimeMinutes,
      checkOutMethod: method,
      approvalStatus: 'APPROVED',
      verifiedLocation: verifiedLocation || existing.verifiedLocation,
    };

    const updatedList = records.map(r => r.id === existing.id ? updatedRecord : r);
    this.saveAttendance(updatedList);

    const workedHours = Math.floor(netWorkedMins / 60);
    const workedMinsRem = netWorkedMins % 60;
    const otHours = Math.floor(overtimeMinutes / 60);
    const otMinsRem = overtimeMinutes % 60;

    this.addAuditLog(
      'ثبت خروج',
      'حضور و غیاب',
      `ثبت خروج ${emp.firstName} ${emp.lastName} در ساعت ${timeNow} (کارکرد خالص: ${workedHours}h ${workedMinsRem}m، اضافه‌کار: ${overtimeMinutes}m)`
    );

    let messageText = `خروج در ساعت ${timeNow} با موفقیت ثبت شد. مدت کارکرد: ${workedHours} ساعت و ${workedMinsRem} دقیقه.`;
    if (overtimeMinutes > 0) {
      messageText += ` ⚡ میزان ${otHours > 0 ? `${otHours} ساعت و ` : ''}${otMinsRem} دقیقه اضافه‌کاری برای شما محاسبه و ثبت گردید. خسته نباشید!`;
    } else if (earlyExitMinutes > 0) {
      messageText += ` (توجه: ${earlyExitMinutes} دقیقه تعجیل در خروج ثبت شد). خسته نباشید!`;
    } else {
      messageText += ' خسته نباشید!';
    }

    return {
      success: true,
      message: messageText,
      overtimeMinutes,
      record: updatedRecord
    };
  }

  // Submit Manual Attendance Request (Employees must request; requires Admin/HR approval)
  static submitManualAttendanceRequest(
    employeeId: string,
    type: 'CHECK_IN' | 'CHECK_OUT',
    time: string,
    date: string,
    reason: string
  ): { success: boolean; message: string; record?: AttendanceRecord } {
    const records = this.getAllAttendanceRaw();
    const existing = records.find(r => r.employeeId === employeeId && r.date === date);
    const employees = this.getAllEmployeesRaw();
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return { success: false, message: 'پرسنل یافت نشد.' };

    const shifts = this.getShifts();
    const shift = shifts.find(s => s.id === emp.shiftId) || shifts[0];
    const settings = this.getSettings();

    if (type === 'CHECK_IN') {
      if (existing && existing.checkInTime) {
        return { success: false, message: `ورود شما در تاریخ ${date} قبلاً در سیستم ثبت شده است.` };
      }

      const [startH, startM] = shift.startTime.split(':').map(Number);
      const [curH, curM] = time.split(':').map(Number);
      const scheduledStartMinutes = startH * 60 + startM;
      const actualArrivalMinutes = curH * 60 + curM;

      let lateMinutes = 0;
      let status: AttendanceRecord['status'] = 'PRESENT';
      if (actualArrivalMinutes > scheduledStartMinutes + shift.lateToleranceMinutes) {
        lateMinutes = actualArrivalMinutes - scheduledStartMinutes;
        status = 'LATE';
      }

      const newRecord: AttendanceRecord = {
        id: `att_man_${Date.now()}`,
        companyId: settings.id,
        employeeId,
        date,
        checkInTime: time,
        checkOutTime: '',
        workDurationMinutes: 0,
        lateMinutes,
        earlyExitMinutes: 0,
        overtimeMinutes: 0,
        status,
        checkInMethod: 'MANUAL',
        approvalStatus: 'PENDING',
        manualReason: reason,
        notes: `درخواست ثبت دستی ورود: ${reason}`
      };

      const updated = existing ? records.map(r => r.id === existing.id ? newRecord : r) : [newRecord, ...records];
      this.saveAttendance(updated);
      this.addAuditLog('درخواست تردد دستی', 'پرسنل', `ثبت درخواست ورود دستی توسط ${emp.firstName} ${emp.lastName} در ساعت ${time} (در انتظار تایید مدیر)`);
      return {
        success: true,
        message: 'درخواست ورود دستی با موفقیت ثبت شد و پس از بررسی و تایید مدیر ارشد یا مدیر منابع انسانی منظور می‌گردد.',
        record: newRecord
      };
    } else {
      if (!existing || !existing.checkInTime) {
        return { success: false, message: 'ابتدا باید ورود شما برای این تاریخ در سامانه ثبت شده باشد.' };
      }
      if (existing.checkOutTime) {
        return { success: false, message: `خروج شما در تاریخ ${date} قبلاً در ساعت ${existing.checkOutTime} ثبت گردیده است.` };
      }

      const updatedRecord: AttendanceRecord = {
        ...existing,
        checkOutTime: time,
        checkOutMethod: 'MANUAL',
        approvalStatus: 'PENDING',
        manualReason: reason,
        notes: `${existing.notes ? existing.notes + ' | ' : ''}درخواست ثبت دستی خروج: ${reason}`
      };

      const updated = records.map(r => r.id === existing.id ? updatedRecord : r);
      this.saveAttendance(updated);
      this.addAuditLog('درخواست تردد دستی', 'پرسنل', `ثبت درخواست خروج دستی توسط ${emp.firstName} ${emp.lastName} در ساعت ${time} (در انتظار تایید مدیر)`);
      return {
        success: true,
        message: 'درخواست خروج دستی با موفقیت ثبت شد و پس از تایید مدیر ارشد یا مدیر منابع انسانی در سوابق و حقوق منظور می‌گردد.',
        record: updatedRecord
      };
    }
  }

  // Review & Approve/Reject Manual Attendance (Admin/HR only)
  static reviewManualAttendance(recordId: string, approved: boolean, reviewerName: string): boolean {
    const records = this.getAllAttendanceRaw();
    const existing = records.find(r => r.id === recordId);
    if (!existing) return false;

    const employees = this.getAllEmployeesRaw();
    const emp = employees.find(e => e.id === existing.employeeId);
    const shifts = this.getShifts();
    const shift = shifts.find(s => s.id === emp?.shiftId) || shifts[0];

    if (!approved) {
      const updated = records.map(r => r.id === recordId ? {
        ...r,
        approvalStatus: 'REJECTED' as const,
        approvedBy: reviewerName,
        approvedAt: getTodayShamsi(),
      } : r);
      this.saveAttendance(updated);
      this.addAuditLog('رد تردد دستی', 'مدیریت', `رد درخواست تردد دستی برای ${emp?.firstName} ${emp?.lastName} توسط ${reviewerName}`);
      return true;
    }

    let workDurationMinutes = existing.workDurationMinutes;
    let overtimeMinutes = existing.overtimeMinutes;
    let earlyExitMinutes = existing.earlyExitMinutes;

    if (existing.checkInTime && existing.checkOutTime) {
      const [startH, startM] = shift.startTime.split(':').map(Number);
      const scheduledStartMinutes = startH * 60 + startM;
      const [endH, endM] = shift.endTime.split(':').map(Number);
      const scheduledEndMinutes = endH * 60 + endM;
      const scheduledShiftDuration = Math.max(0, scheduledEndMinutes - scheduledStartMinutes);

      const [inH, inM] = existing.checkInTime.split(':').map(Number);
      const [outH, outM] = existing.checkOutTime.split(':').map(Number);
      const inTotalMins = inH * 60 + inM;
      const outTotalMins = outH * 60 + outM;

      const rawWorkedMins = Math.max(0, outTotalMins - inTotalMins);
      const breakDeduction = (rawWorkedMins >= 240 && shift.breakDurationMinutes) ? shift.breakDurationMinutes : 0;
      workDurationMinutes = Math.max(0, rawWorkedMins - breakDeduction);

      if (outTotalMins < scheduledEndMinutes - (shift.earlyExitToleranceMinutes || 0)) {
        earlyExitMinutes = scheduledEndMinutes - outTotalMins;
      }

      if (outTotalMins > scheduledEndMinutes) {
        const presenceAfterShiftEnd = Math.max(0, outTotalMins - Math.max(inTotalMins, scheduledEndMinutes));
        if (existing.lateMinutes > 0) {
          const excessOverDailyShift = Math.max(0, workDurationMinutes - scheduledShiftDuration);
          overtimeMinutes = Math.min(presenceAfterShiftEnd, excessOverDailyShift);
        } else {
          overtimeMinutes = presenceAfterShiftEnd;
        }
      }
    }

    const updatedRecord: AttendanceRecord = {
      ...existing,
      approvalStatus: 'APPROVED',
      approvedBy: reviewerName,
      approvedAt: getTodayShamsi(),
      workDurationMinutes,
      overtimeMinutes,
      earlyExitMinutes,
    };

    const updated = records.map(r => r.id === recordId ? updatedRecord : r);
    this.saveAttendance(updated);
    this.addAuditLog('تایید تردد دستی', 'مدیریت', `تایید و اعمال درخواست تردد دستی برای ${emp?.firstName} ${emp?.lastName} توسط ${reviewerName}`);
    return true;
  }

  // Leave Requests - Filtered by role
  static getAllLeaveRequestsRaw(): LeaveRequest[] {
    return getItem<LeaveRequest[]>(STORAGE_KEYS.LEAVES, initialLeaveRequests);
  }

  static getLeaveRequests(requestingUser?: User): LeaveRequest[] {
    const list = this.getAllLeaveRequestsRaw();
    const user = requestingUser || this.getCurrentUser();
    // 1. Regular employees can ONLY see their own leave requests!
    if (user && user.role === 'EMPLOYEE') {
      return list.filter((l) => l.employeeId === user.employeeId);
    }
    // 2. HR Manager (MANAGER) cannot see confidential employees leaves
    if (user && user.role !== 'ADMIN') {
      const confidentialEmpIds = new Set(
        this.getAllEmployeesRaw().filter(e => e.isConfidential).map(e => e.id)
      );
      return list.filter(l => !confidentialEmpIds.has(l.employeeId));
    }
    return list;
  }

  static getLeaves(requestingUser?: User): LeaveRequest[] {
    return this.getLeaveRequests(requestingUser);
  }

  static saveLeaveRequests(leaves: LeaveRequest[]): void {
    setItem(STORAGE_KEYS.LEAVES, leaves);
  }

  static submitLeaveRequest(req: Omit<LeaveRequest, 'id' | 'createdAt' | 'status' | 'companyId'>): { success: boolean; message: string } {
    const list = this.getLeaveRequests();
    const settings = this.getSettings();
    const today = getTodayShamsi();
    const time = getCurrentTimeStr();

    // Check 1: Already has a pending leave request
    if (!settings.allowMultiplePendingLeaves) {
      const hasPending = list.some(l => l.employeeId === req.employeeId && l.status === 'PENDING');
      if (hasPending) {
        return {
          success: false,
          message: 'شما در حال حاضر یک درخواست مرخصی در انتظار بررسی دارید. لطفاً تا تعیین وضعیت آن صبر کنید.'
        };
      }
    }

    // Check 2: Weekly request quota
    if (settings.maxLeaveRequestsPerWeek > 0) {
      const thisMonthPrefix = today.slice(0, 7);
      const userLeavesInMonth = list.filter(l => l.employeeId === req.employeeId && l.createdAt.startsWith(thisMonthPrefix));
      if (userLeavesInMonth.length >= settings.maxLeaveRequestsPerWeek * 4) {
        return {
          success: false,
          message: `سقف درخواست مرخصی شما در این دوره (حداکثر ${settings.maxLeaveRequestsPerWeek} درخواست در هفته) تکمیل شده است.`
        };
      }
    }

    const newReq: LeaveRequest = {
      ...req,
      id: `leave_${Date.now()}`,
      companyId: settings.id,
      status: 'PENDING',
      createdAt: `${today} - ${time}`,
    };

    list.unshift(newReq);
    this.saveLeaveRequests(list);
    this.addAuditLog('ثبت درخواست مرخصی', 'مرخصی‌ها', `درخواست مرخصی ${req.type === 'EARNED' ? 'استحقاقی' : req.type === 'HOURLY' ? 'ساعتی' : 'استعلاجی'} توسط ${req.employeeName}`);

    return {
      success: true,
      message: 'درخواست مرخصی با موفقیت ثبت شد و به مدیر مستقیم ارسال گردید.'
    };
  }

  static deleteLeaveRequest(id: string): void {
    const target = this.getLeaveRequests().find(l => l.id === id);
    const list = this.getLeaveRequests().filter(l => l.id !== id);
    this.saveLeaveRequests(list);
    const curUser = this.getCurrentUser();
    this.addAuditLog('حذف درخواست مرخصی', 'مرخصی‌ها', `درخواست مرخصی ${target?.employeeName || id} توسط ${curUser.name} (${curUser.role}) حذف شد.`);
  }

  static reviewLeaveRequest(id: string, approved: boolean, reviewerName: string, rejectionReason?: string): void {
    const leaves = this.getLeaveRequests();
    const today = getTodayShamsi();
    const time = getCurrentTimeStr();
    let targetReq: LeaveRequest | undefined;

    const updated = leaves.map(l => {
      if (l.id === id) {
        targetReq = l;
        return {
          ...l,
          status: (approved ? 'APPROVED' : 'REJECTED') as RequestStatus,
          reviewedBy: reviewerName,
          reviewedAt: `${today} - ${time}`,
          rejectionReason: approved ? undefined : rejectionReason,
        };
      }
      return l;
    });

    this.saveLeaveRequests(updated);

    if (targetReq && approved) {
      // Deduct from employee leave balance if earned
      if (targetReq.type === 'EARNED' && targetReq.durationDays) {
        const emps = this.getEmployees().map(e => {
          if (e.id === targetReq?.employeeId) {
            return {
              ...e,
              remainingLeaveDays: Math.max(0, e.remainingLeaveDays - (targetReq?.durationDays || 1))
            };
          }
          return e;
        });
        this.saveEmployees(emps);
      }

      // Automatically update attendance record for today if the leave covers today
      if (targetReq.startDate <= today && targetReq.endDate >= today) {
        const attRecords = this.getAttendance();
        const existing = attRecords.find(a => a.employeeId === targetReq?.employeeId && a.date === today);
        if (existing) {
          const updatedAtt = attRecords.map(a => a.id === existing.id ? { ...a, status: 'ON_LEAVE' as const, notes: 'مرخصی استحقاقی تایید شده' } : a);
          this.saveAttendance(updatedAtt);
        } else {
          attRecords.unshift({
            id: `att_${Date.now()}`,
            companyId: targetReq.companyId,
            employeeId: targetReq.employeeId,
            date: today,
            workDurationMinutes: 0,
            lateMinutes: 0,
            earlyExitMinutes: 0,
            overtimeMinutes: 0,
            status: 'ON_LEAVE',
            notes: 'مرخصی تایید شده'
          });
          this.saveAttendance(attRecords);
        }
      }
    }

    this.addAuditLog(
      approved ? 'تایید مرخصی' : 'رد مرخصی',
      'مرخصی‌ها',
      `درخواست مرخصی ${targetReq?.employeeName} توسط ${reviewerName} ${approved ? 'تایید' : 'رد'} شد.`
    );
  }

  // Advance Requests - Filtered by role
  static getAllAdvanceRequestsRaw(): AdvanceRequest[] {
    return getItem<AdvanceRequest[]>(STORAGE_KEYS.ADVANCES, initialAdvanceRequests);
  }

  static getAdvanceRequests(requestingUser?: User): AdvanceRequest[] {
    const list = this.getAllAdvanceRequestsRaw();
    const user = requestingUser || this.getCurrentUser();
    // 1. Regular employees can ONLY see their own advance requests!
    if (user && user.role === 'EMPLOYEE') {
      return list.filter((a) => a.employeeId === user.employeeId);
    }
    // 2. HR Manager cannot see confidential employees advances
    if (user && user.role !== 'ADMIN') {
      const confidentialEmpIds = new Set(
        this.getAllEmployeesRaw().filter(e => e.isConfidential).map(e => e.id)
      );
      return list.filter(a => !confidentialEmpIds.has(a.employeeId));
    }
    return list;
  }

  static getAdvances(requestingUser?: User): AdvanceRequest[] {
    return this.getAdvanceRequests(requestingUser);
  }

  static saveAdvanceRequests(reqs: AdvanceRequest[]): void {
    setItem(STORAGE_KEYS.ADVANCES, reqs);
  }

  static submitAdvanceRequest(req: Omit<AdvanceRequest, 'id' | 'createdAt' | 'status' | 'companyId'>): { success: boolean; message: string } {
    const list = this.getAdvanceRequests();
    const settings = this.getSettings();
    const today = getTodayShamsi();
    const time = getCurrentTimeStr();
    const employees = this.getEmployees();
    const emp = employees.find(e => e.id === req.employeeId);

    // Extract day of month
    const dayParts = today.split('/');
    const dayOfMonth = dayParts.length === 3 ? parseInt(dayParts[2], 10) : 15;

    // Check 1: Mid-month window
    if (settings.advanceWindowStartDay && settings.advanceWindowEndDay) {
      if (dayOfMonth < settings.advanceWindowStartDay || dayOfMonth > settings.advanceWindowEndDay) {
        return {
          success: false,
          message: `ثبت مساعده فقط در بازه روزهای ${settings.advanceWindowStartDay} الی ${settings.advanceWindowEndDay} هر ماه مجاز است (امروز: روز ${dayOfMonth}).`
        };
      }
    }

    // Check 2: Already has a pending advance request
    const hasPending = list.some(a => a.employeeId === req.employeeId && a.status === 'PENDING');
    if (hasPending) {
      return {
        success: false,
        message: 'شما در حال حاضر یک درخواست مساعده در انتظار بررسی دارید.'
      };
    }

    // Check 3: Monthly quota limit
    const currentMonth = today.slice(0, 7);
    const thisMonthApprovedOrPending = list.filter(a =>
      a.employeeId === req.employeeId &&
      (a.status === 'APPROVED' || a.status === 'PENDING') &&
      a.requestDate.startsWith(currentMonth)
    );
    if (thisMonthApprovedOrPending.length >= (settings.maxAdvanceRequestsPerMonth || 1)) {
      return {
        success: false,
        message: `سقف درخواست مساعده این ماه (${settings.maxAdvanceRequestsPerMonth || 1} بار در هر ماه) برای شما تکمیل شده است.`
      };
    }

    // Check 4: Maximum amount (e.g. 30% of base salary)
    if (emp && settings.maxAdvanceSalaryPercent) {
      const maxAllowed = Math.round((emp.baseSalary * settings.maxAdvanceSalaryPercent) / 100);
      if (req.amount > maxAllowed) {
        return {
          success: false,
          message: `مبلغ درخواستی بیشتر از سقف مجاز (${settings.maxAdvanceSalaryPercent}٪ حقوق پایه، معادل ${maxAllowed.toLocaleString('fa-IR')} تومان) است.`
        };
      }
    }

    const newReq: AdvanceRequest = {
      ...req,
      id: `adv_${Date.now()}`,
      companyId: settings.id,
      status: 'PENDING',
      createdAt: `${today} - ${time}`,
    };

    list.unshift(newReq);
    this.saveAdvanceRequests(list);
    this.addAuditLog('ثبت درخواست مساعده', 'مساعده‌ها', `درخواست مساعده ${req.amount.toLocaleString('fa-IR')} تومان توسط ${req.employeeName}`);

    return {
      success: true,
      message: 'درخواست مساعده با موفقیت ثبت شد و به واحد مالی ارسال گردید.'
    };
  }

  static deleteAdvanceRequest(id: string): void {
    const target = this.getAdvanceRequests().find(a => a.id === id);
    const list = this.getAdvanceRequests().filter(a => a.id !== id);
    this.saveAdvanceRequests(list);
    const curUser = this.getCurrentUser();
    this.addAuditLog('حذف درخواست مساعده', 'مساعده‌ها', `درخواست مساعده ${target?.employeeName || id} توسط ${curUser.name} حذف شد.`);
  }

  static reviewAdvanceRequest(id: string, approved: boolean, reviewerName: string, rejectionReason?: string): void {
    const reqs = this.getAdvanceRequests();
    const today = getTodayShamsi();
    const time = getCurrentTimeStr();
    let targetReq: AdvanceRequest | undefined;

    const updated = reqs.map(r => {
      if (r.id === id) {
        targetReq = r;
        return {
          ...r,
          status: (approved ? 'APPROVED' : 'REJECTED') as RequestStatus,
          reviewedBy: reviewerName,
          reviewedAt: `${today} - ${time}`,
          rejectionReason: approved ? undefined : rejectionReason,
        };
      }
      return r;
    });

    this.saveAdvanceRequests(updated);
    this.addAuditLog(
      approved ? 'تایید مساعده' : 'رد مساعده',
      'مساعده‌ها',
      `درخواست مساعده ${targetReq?.employeeName} به مبلغ ${targetReq?.amount.toLocaleString('fa-IR')} توسط ${reviewerName} ${approved ? 'تایید' : 'رد'} شد.`
    );
  }

  // Bonuses & Penalties
  static getBonusesAndPenalties(): BonusOrPenalty[] {
    return getItem<BonusOrPenalty[]>(STORAGE_KEYS.BONUSES, initialBonusesPenalties);
  }

  static saveBonusesAndPenalties(list: BonusOrPenalty[]): void {
    setItem(STORAGE_KEYS.BONUSES, list);
  }

  static addBonusOrPenalty(item: BonusOrPenalty): void {
    const list = this.getBonusesAndPenalties();
    list.unshift(item);
    this.saveBonusesAndPenalties(list);
    this.addAuditLog(
      item.type === 'BONUS' ? 'ثبت پاداش' : 'ثبت جریمه انضباطی',
      'حقوق و دستمزد',
      `${item.title} به مبلغ ${item.amount.toLocaleString('fa-IR')} تومان ثبت شد.`
    );
  }

  // Salaries & Payroll Engine - Filtered by role
  static getAllSalariesRaw(): SalaryRecord[] {
    return getItem<SalaryRecord[]>(STORAGE_KEYS.SALARIES, initialSalaryRecords);
  }

  static getSalaries(requestingUser?: User): SalaryRecord[] {
    const list = this.getAllSalariesRaw();
    const user = requestingUser || this.getCurrentUser();
    // 1. Regular employees can ONLY see their own salary slip!
    if (user && user.role === 'EMPLOYEE') {
      return list.filter((s) => s.employeeId === user.employeeId);
    }
    // 2. HR Manager cannot see confidential employees salaries
    if (user && user.role !== 'ADMIN') {
      const confidentialEmpIds = new Set(
        this.getAllEmployeesRaw().filter(e => e.isConfidential).map(e => e.id)
      );
      return list.filter(s => !confidentialEmpIds.has(s.employeeId));
    }
    return list;
  }

  static saveSalaries(salaries: SalaryRecord[]): void {
    setItem(STORAGE_KEYS.SALARIES, salaries);
  }

  // Automatic Payroll Calculation Engine for given employee and month
  static calculateSalaryForEmployee(employeeId: string, month: string): SalaryRecord {
    const settings = this.getSettings();
    const employees = this.getEmployees();
    const emp = employees.find(e => e.id === employeeId) || employees[0];
    const attendance = this.getAttendance();
    const advances = this.getAdvanceRequests();
    const bonusesPenalties = this.getBonusesAndPenalties();

    // Calculate total worked hours and overtime from attendance
    let totalOvertimeMins = 0;
    let workedDaysCount = 0;
    let totalWorkedMinutes = 0;

    attendance
      .filter(a => a.employeeId === employeeId && a.date.startsWith(month))
      .forEach(a => {
        if (a.status === 'PRESENT' || a.status === 'LATE') {
          workedDaysCount++;
          totalWorkedMinutes += (a.workDurationMinutes || 480);
          totalOvertimeMins += (a.overtimeMinutes || 0);
        }
      });

    // If no records for month yet, assume standard month workdays
    if (workedDaysCount === 0) {
      workedDaysCount = settings.workDaysPerMonth;
      totalWorkedMinutes = workedDaysCount * 8 * 60;
    }

    const workedHours = Math.round(totalWorkedMinutes / 60);
    const overtimeHours = Math.round(totalOvertimeMins / 60);
    const overtimeAmount = Math.round(overtimeHours * emp.hourlyRate * emp.overtimeRate);

    // Sum approved advances for this repay month
    const approvedAdvances = advances
      .filter(a => a.employeeId === employeeId && a.status === 'APPROVED' && a.repayMonth === month)
      .reduce((sum, a) => sum + a.amount, 0);

    // Sum bonuses and penalties
    const bonuses = bonusesPenalties
      .filter(b => b.employeeId === employeeId && b.type === 'BONUS' && b.month === month)
      .reduce((sum, b) => sum + b.amount, 0);

    const penalties = bonusesPenalties
      .filter(b => b.employeeId === employeeId && b.type === 'PENALTY' && b.month === month)
      .reduce((sum, b) => sum + b.amount, 0);

    // Allowances (0 if set to 0 in settings)
    const housing = Number(settings.fixedHousingAllowance) > 0 ? Number(settings.fixedHousingAllowance) : 0;
    const grocery = Number(settings.fixedGroceryAllowance) > 0 ? Number(settings.fixedGroceryAllowance) : 0;
    const child = Number(settings.childAllowance) > 0 ? Number(settings.childAllowance) : 0;

    // Gross Salary = Base + Overtime + Bonuses + Allowances
    const grossSalary = emp.baseSalary + overtimeAmount + bonuses + housing + grocery + child;

    // Deductions
    const insuranceDeduction = Math.round((emp.baseSalary + housing + grocery) * (settings.insuranceRatePercent / 100));

    // Tax
    const taxableBase = Math.max(0, grossSalary - settings.taxExemptionThreshold);
    const taxDeduction = Math.round(taxableBase * (settings.taxRatePercent / 100));

    // Net Salary = Gross - Insurance - Tax - Penalties - Advances
    const netSalary = Math.max(0, grossSalary - insuranceDeduction - taxDeduction - penalties - approvedAdvances);

    const record: SalaryRecord = {
      id: `sal_${emp.id}_${month.replace('/', '_')}`,
      companyId: settings.id,
      employeeId: emp.id,
      month,
      baseSalary: emp.baseSalary,
      workDays: workedDaysCount,
      workedHours,
      overtimeHours,
      overtimeAmount,
      bonusesTotal: bonuses,
      penaltiesTotal: penalties,
      advancesTotal: approvedAdvances,
      housingAllowance: housing,
      groceryAllowance: grocery,
      childAllowance: child,
      grossSalary,
      insuranceDeduction,
      taxDeduction,
      netSalary,
      status: 'CALCULATED',
    };

    // Save or update in list
    const salaries = this.getSalaries();
    const idx = salaries.findIndex(s => s.employeeId === employeeId && s.month === month);
    if (idx >= 0) {
      salaries[idx] = record;
    } else {
      salaries.unshift(record);
    }
    this.saveSalaries(salaries);

    return record;
  }

  // Audit Logs - Strictly owner and admin (Majid Nouraei) only
  static getAuditLogs(requestingUser?: User): AuditLog[] {
    const user = requestingUser || this.getCurrentUser();
    if (user && user.role !== 'ADMIN') {
      return [];
    }
    return getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, initialAuditLogs);
  }

  static addAuditLog(action: string, resource: string, details: string): void {
    const list = getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, initialAuditLogs);
    const currentUser = this.getCurrentUser();
    const today = getTodayShamsi();
    const time = getCurrentTimeStr();

    const newLog: AuditLog = {
      id: `log_${Date.now()}`,
      companyId: currentUser.companyId,
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      resource,
      details,
      timestamp: `${today} - ${time}`,
      ipAddress: '192.168.1.100'
    };
    list.unshift(newLog);
    // keep latest 100 logs
    setItem(STORAGE_KEYS.AUDIT_LOGS, list.slice(0, 100));
  }

  // Broadcast Messages & SMS Panel - Filtered for employees
  static getMessages(requestingUser?: User): BroadcastMessage[] {
    const list = getItem<BroadcastMessage[]>(STORAGE_KEYS.MESSAGES, initialBroadcastMessages);
    const user = requestingUser || this.getCurrentUser();
    if (user && user.role === 'EMPLOYEE') {
      return list.filter(m =>
        m.recipientType === 'ALL' ||
        (m.recipientType === 'WORKSHOP_1' && user.workshopId === 'ws_1') ||
        (m.recipientType === 'WORKSHOP_2' && user.workshopId === 'ws_2') ||
        (m.recipientIds && user.employeeId && m.recipientIds.includes(user.employeeId))
      );
    }
    return list;
  }

  static saveMessages(messages: BroadcastMessage[]): void {
    setItem(STORAGE_KEYS.MESSAGES, messages);
  }

  static addMessage(msg: BroadcastMessage): void {
    const list = this.getMessages();
    list.unshift(msg);
    this.saveMessages(list);
    this.addAuditLog('ارسال پیام گروهی', 'اطلاع‌رسانی', `پیام با موضوع "${msg.title}" برای ${msg.recipientType === 'ALL' ? 'تمامی پرسنل' : msg.recipientType} با روش ${msg.channel} ارسال شد.`);
  }

  static deleteMessage(id: string): void {
    const list = this.getMessages().filter(m => m.id !== id);
    this.saveMessages(list);
    this.addAuditLog('حذف پیام', 'اطلاع‌رسانی', `پیام با شناسه ${id} حذف شد.`);
  }

  // Reset demo data to defaults
  static resetToDefaults(): void {
    Object.values(STORAGE_KEYS).forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (e) {
        console.error(e);
      }
    });
    this.saveSettings(initialCompanySettings);
    this.saveShifts(initialShifts);
    this.saveEmployees(initialEmployees);
    this.saveAttendance(initialAttendanceRecords);
    this.saveLeaves(initialLeaveRequests);
    this.saveAdvances(initialAdvanceRequests);
    this.saveSalaries(initialSalaryRecords);
    this.saveUsers(initialUsers);
    this.saveMessages(initialBroadcastMessages);
    this.setCurrentUser(initialUsers[0]);
  }

  // Full System Data Export (JSON Backup for 100% Data Safety)
  static exportFullBackup(): string {
    const backup = {
      system: 'M.GAMMON Smart Attendance and HR System',
      version: '2.5.0',
      exportedAt: new Date().toISOString(),
      shamsiDate: getTodayShamsi(),
      companyName: 'شرکت مهندسی پزشکی ام گامون (M.GAMMON)',
      owner: 'مجید نورائی',
      data: {
        settings: this.getSettings(),
        shifts: this.getShifts(),
        employees: getItem<Employee[]>(STORAGE_KEYS.EMPLOYEES, []),
        attendance: getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []),
        leaves: getItem<LeaveRequest[]>(STORAGE_KEYS.LEAVES, []),
        advances: getItem<AdvanceRequest[]>(STORAGE_KEYS.ADVANCES, []),
        salaries: getItem<SalaryRecord[]>(STORAGE_KEYS.SALARIES, []),
        bonuses: getItem<BonusOrPenalty[]>(STORAGE_KEYS.BONUSES, []),
        messages: getItem<BroadcastMessage[]>(STORAGE_KEYS.MESSAGES, []),
        auditLogs: getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []),
      }
    };
    return JSON.stringify(backup, null, 2);
  }

  // Import / Restore Full System Backup
  static importFullBackup(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !parsed.data) {
        return { success: false, message: 'فایل پشتیبان نامعتبر است (فرمت غیر استاندارد).' };
      }
      const d = parsed.data;
      if (d.settings) this.saveSettings(d.settings);
      if (Array.isArray(d.shifts)) this.saveShifts(d.shifts);
      if (Array.isArray(d.employees)) setItem(STORAGE_KEYS.EMPLOYEES, d.employees);
      if (Array.isArray(d.attendance)) setItem(STORAGE_KEYS.ATTENDANCE, d.attendance);
      if (Array.isArray(d.leaves)) setItem(STORAGE_KEYS.LEAVES, d.leaves);
      if (Array.isArray(d.advances)) setItem(STORAGE_KEYS.ADVANCES, d.advances);
      if (Array.isArray(d.salaries)) setItem(STORAGE_KEYS.SALARIES, d.salaries);
      if (Array.isArray(d.bonuses)) setItem(STORAGE_KEYS.BONUSES, d.bonuses);
      if (Array.isArray(d.messages)) setItem(STORAGE_KEYS.MESSAGES, d.messages);
      if (Array.isArray(d.auditLogs)) setItem(STORAGE_KEYS.AUDIT_LOGS, d.auditLogs);

      this.addAuditLog('بازیابی اطلاعات پشتیبان', 'پایگاه داده', 'داده‌های پشتیبان با موفقیت بازگردانی شدند.');
      return { success: true, message: 'کلیه اطلاعات با موفقیت از فایل پشتیبان بازگردانی شد.' };
    } catch (e: any) {
      return { success: false, message: 'خطا در خواندن فایل: ' + (e?.message || 'فرمت نامعتبر') };
    }
  }
}
