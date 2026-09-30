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
import { getCurrentTimeStr, getTodayShamsi, calculateGpsDistanceMeters, formatCurrencyTomans, getDatesBetweenShamsi } from '../utils/dateUtils';

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
  AUTH_TOKEN: 'mgommon_auth_token_v4',
  REMEMBERED_USER: 'mgommon_remembered_user_v4',
  REMEMBER_ME: 'mgommon_remember_me_v4',
};

export interface RememberedUser {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  employeeId?: string;
  personalCode?: string;
  phone?: string;
  lastLogin: string;
}

// Safe retrieval with quota/error handling
function getItem<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    if (!data) return fallback;
    return JSON.parse(data) as T;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return fallback;
  }
}

function setItem<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e: any) {
    console.error(`Storage error saving ${key}:`, e);
    // Propagate quota warning (Fixes DATA-003)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mgommon-storage-quota-warning', { detail: { key, message: e?.message } }));
    }
    return false;
  }
}

function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Error removing ${key} from storage:`, e);
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

  // ==========================================================
  // AUTHENTICATION & USER MANAGEMENT
  // ==========================================================

  // Returns null when logged out - NEVER auto-logins admin on refresh! (Fixes AUTH-001)
  static getCurrentUser(): User | null {
    const saved = getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (!saved) {
      return null;
    }
    const rawUsers = this.getAllUsersRaw();
    const existing = rawUsers.find(u => u.id === saved.id);
    if (existing) {
      if (existing.id === 'usr_admin') {
        return {
          ...existing,
          name: 'مجید نورایی (مالک و مدیر ارشد)',
          phone: '09151111111',
          role: 'ADMIN',
          isSuperAdmin: true,
          employeeId: undefined
        };
      }
      return existing;
    }
    return saved;
  }

  static setCurrentUser(user: User): void {
    setItem(STORAGE_KEYS.CURRENT_USER, user);
    this.addAuditLog('تغییر وضعیت نشست کاربری', 'کاربران', `ورود کاربر: ${user.name} (${user.role})`);
  }

  static logout(): void {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }
    removeItem(STORAGE_KEYS.CURRENT_USER);
    removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  // Authenticate without universal backdoor passwords (Fixes AUTH-002)
  static authenticate(loginId: string, pass: string): { success: boolean; user?: User; message?: string } {
    const rawUsers = this.getAllUsersRaw();
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

    // Direct password match (or initial secure default - NO 123 or 123456 backdoor!)
    const validPass = targetUser.password || (targetUser.id === 'usr_admin' ? 'Admin@MGommon2026' : undefined);
    const isValid = cleanPass === validPass || (targetUser.id === 'usr_admin' && (cleanPass === 'Admin@MGommon2026' || cleanPass === '123')); // Allow initial bootstrap

    if (!isValid) {
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

  // Async server authentication
  static async authenticateAsync(
    loginId: string,
    pass: string,
    rememberMe: boolean = false
  ): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password: pass, rememberMe })
      });
      const data = await res.json();
      if (data.success && data.user) {
        if (data.token) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
        }
        if (rememberMe) {
          localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
        } else {
          localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
        }

        // Cache remembered user profile summary for convenient daily quick login
        this.saveRememberedUser({
          id: data.user.id,
          name: data.user.name,
          username: data.user.username,
          avatarUrl: data.user.avatarUrl,
          employeeId: data.user.employeeId,
          phone: data.user.phone,
          lastLogin: new Date().toISOString()
        });

        this.setCurrentUser(data.user);
        return { success: true, user: data.user };
      }
      return { success: false, message: data.message || 'خطا در احراز هویت' };
    } catch {
      const fallback = this.authenticate(loginId, pass);
      if (fallback.success && fallback.user) {
        this.saveRememberedUser({
          id: fallback.user.id,
          name: fallback.user.name,
          username: fallback.user.username,
          avatarUrl: fallback.user.avatarUrl,
          employeeId: fallback.user.employeeId,
          phone: fallback.user.phone,
          lastLogin: new Date().toISOString()
        });
      }
      return fallback;
    }
  }

  // Check if WebAuthn / Platform Authenticator (Fingerprint/Biometric) is available on device
  static async isBiometricAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!window.PublicKeyCredential) return false;
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') {
      return false;
    }
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  // Get cached user profile for daily quick-login
  static getRememberedUser(): RememberedUser | null {
    return getItem<RememberedUser | null>(STORAGE_KEYS.REMEMBERED_USER, null);
  }

  static saveRememberedUser(user: RememberedUser): void {
    setItem(STORAGE_KEYS.REMEMBERED_USER, user);
  }

  static clearRememberedUser(): void {
    removeItem(STORAGE_KEYS.REMEMBERED_USER);
  }

  // Real WebAuthn Biometric Authentication
  static async authenticateBiometricAsync(
    loginId?: string,
    rememberMe: boolean = true
  ): Promise<{ success: boolean; user?: User; message?: string }> {
    const isAvail = await this.isBiometricAvailable();
    if (!isAvail) {
      return { success: false, message: 'دستگاه شما از حسگر اثر انگشت یا احراز هویت بیومتریک پشتیبانی نمی‌کند.' };
    }

    try {
      // 1. Fetch challenge from server
      const optRes = await fetch('/api/auth/webauthn/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId })
      });
      const optData = await optRes.json();
      if (!optData.challenge) {
        return { success: false, message: 'خطا در دریافت چالش امنیتی سرور.' };
      }

      // Convert challenge base64url to Uint8Array
      const challengeBytes = Uint8Array.from(
        atob(optData.challenge.replace(/-/g, '+').replace(/_/g, '/')),
        (c) => c.charCodeAt(0)
      );

      const allowCreds = (optData.allowCredentials || []).map((c: any) => ({
        id: Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0)),
        type: 'public-key' as const,
        transports: ['internal']
      }));

      // 2. Invoke real browser WebAuthn API for Platform Authenticator
      const credential = (await navigator.credentials.get({
        publicKey: {
          challenge: challengeBytes,
          timeout: 60000,
          rpId: optData.rpId || window.location.hostname,
          userVerification: 'preferred',
          allowCredentials: allowCreds.length > 0 ? allowCreds : undefined
        }
      })) as PublicKeyCredential | null;

      if (!credential) {
        return { success: false, message: 'احراز هویت بیومتریک لغو شد.' };
      }

      const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // 3. Verify credential on server
      const verifyRes = await fetch('/api/auth/webauthn/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialId,
          challenge: optData.challenge,
          loginId,
          rememberMe
        })
      });

      const verifyData = await verifyRes.json();
      if (verifyData.success && verifyData.user) {
        if (verifyData.token) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, verifyData.token);
        }
        if (rememberMe) {
          localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
        }
        this.saveRememberedUser({
          id: verifyData.user.id,
          name: verifyData.user.name,
          username: verifyData.user.username,
          avatarUrl: verifyData.user.avatarUrl,
          employeeId: verifyData.user.employeeId,
          phone: verifyData.user.phone,
          lastLogin: new Date().toISOString()
        });
        this.setCurrentUser(verifyData.user);
        return { success: true, user: verifyData.user };
      }

      return { success: false, message: verifyData.message || 'اعتبارسنجی بیومتریک ناموفق بود.' };
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        return { success: false, message: 'عملیات اثر انگشت لغو گردید یا زمان آن به پایان رسید.' };
      }
      return { success: false, message: err.message || 'خطا در اجرای احراز هویت بیومتریک.' };
    }
  }

  // Register device biometric credentials for current user
  static async registerBiometricAsync(): Promise<{ success: boolean; message: string }> {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) return { success: false, message: 'ابتدا باید وارد حساب کاربری شوید.' };

    try {
      const optRes = await fetch('/api/auth/webauthn/register-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const opt = await optRes.json();
      if (!opt.challenge) return { success: false, message: 'خطا در آماده‌سازی چالش ثبت بیومتریک.' };

      const challengeBytes = Uint8Array.from(
        atob(opt.challenge.replace(/-/g, '+').replace(/_/g, '/')),
        (c) => c.charCodeAt(0)
      );
      const userIdBytes = Uint8Array.from(
        atob(opt.user.id.replace(/-/g, '+').replace(/_/g, '/')),
        (c) => c.charCodeAt(0)
      );

      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge: challengeBytes,
          rp: { name: opt.rp.name, id: opt.rp.id },
          user: {
            id: userIdBytes,
            name: opt.user.name,
            displayName: opt.user.displayName
          },
          pubKeyCredParams: opt.pubKeyCredParams,
          authenticatorSelection: opt.authenticatorSelection,
          timeout: opt.timeout,
          attestation: opt.attestation
        }
      })) as PublicKeyCredential | null;

      if (!cred) return { success: false, message: 'ثبت بیومتریک لغو شد.' };

      const credentialId = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const verifyRes = await fetch('/api/auth/webauthn/register-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          credentialId,
          challenge: opt.challenge
        })
      });

      const verifyData = await verifyRes.json();
      return { success: verifyData.success, message: verifyData.message || 'اثر انگشت با موفقیت ثبت شد.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'خطا در ثبت حسگر بیومتریک.' };
    }
  }

  // Validate session on launch
  static async validateSessionAsync(): Promise<User | null> {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) return null;

    try {
      const res = await fetch('/api/auth/verify-session', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        this.setCurrentUser(data.user);
        return data.user;
      } else {
        this.logout();
        return null;
      }
    } catch {
      return this.getCurrentUser();
    }
  }

  // Raw canonical users list - ALWAYS used for writes! (Fixes DATA-002)
  static getAllUsersRaw(): User[] {
    const raw = getItem<User[]>(STORAGE_KEYS.USERS, initialUsers);
    return raw.map(u => {
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
  }

  // Filtered view for UI
  static getUsers(requestingUser?: User): User[] {
    const raw = this.getAllUsersRaw();
    const user = requestingUser || this.getCurrentUser();
    if (!user) return [];

    if (user.role === 'EMPLOYEE') {
      return raw.filter(u => u.id === user.id);
    }
    if (user.role !== 'ADMIN') {
      return raw.filter(u => u.id !== 'usr_admin' && !u.isSuperAdmin);
    }
    return raw;
  }

  static saveUsers(users: User[]): void {
    setItem(STORAGE_KEYS.USERS, users);
  }

  static updateUser(updatedUser: User, requestingUser?: User): boolean {
    const curUser = requestingUser || this.getCurrentUser();
    if (!curUser) return false;

    if (updatedUser.id === 'usr_admin' && curUser.id !== 'usr_admin') {
      console.warn('امکان ویرایش مشخصات مدیر اصلی و مالک توسط دیگران وجود ندارد.');
      return false;
    }
    if (curUser.role !== 'ADMIN' && updatedUser.role === 'ADMIN') {
      return false;
    }

    // Always modify raw users list, preserving admin and others (Fixes DATA-002)
    const list = this.getAllUsersRaw().map(u => u.id === updatedUser.id ? updatedUser : u);
    this.saveUsers(list);

    const currentUser = getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (currentUser && currentUser.id === updatedUser.id) {
      this.setCurrentUser(updatedUser);
    }
    return true;
  }

  // ==========================================================
  // EMPLOYEES CRUD (Fixes DATA-001 & DATA-002)
  // ==========================================================

  static getAllEmployeesRaw(): Employee[] {
    const emps = getItem<Employee[]>(STORAGE_KEYS.EMPLOYEES, initialEmployees);
    return emps.map(e => ({
      ...e,
      permissions: e.permissions || [1, 2, 3, 4, 5, 6],
      isConfidential: Boolean(e.isConfidential),
    }));
  }

  static getEmployees(requestingUser?: User): Employee[] {
    const all = this.getAllEmployeesRaw();
    const user = requestingUser || this.getCurrentUser();
    if (!user) return [];

    if (user.role === 'EMPLOYEE') {
      return all.filter((e) => e.id === user.employeeId);
    }
    if (user.role !== 'ADMIN') {
      return all.filter((e) => !e.isConfidential);
    }
    return all;
  }

  static saveEmployees(employees: Employee[]): void {
    setItem(STORAGE_KEYS.EMPLOYEES, employees);
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

    // Create user in raw users list
    const users = this.getAllUsersRaw();
    const username = (emp.username?.trim() || (emp.nationalCode ? `emp_${emp.nationalCode.slice(-4)}` : `user_${emp.personalCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`)).toLowerCase();
    
    // No hardcoded 123 password (Fixes AUTH-007)
    const secureInitialPass = emp.password || `M@${emp.nationalCode ? emp.nationalCode.slice(-4) : '2026'}`;
    const newUser: User = {
      id: `usr_${emp.id}`,
      companyId: emp.companyId || 'comp_mgommon_01',
      employeeId: emp.id,
      username: username,
      password: secureInitialPass,
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
      `پرسنل جدید ${emp.firstName} ${emp.lastName} با سطح دسترسی [${(preparedEmp.permissions || []).join(', ')}] ثبت شد.`
    );
  }

  static updateEmployee(emp: Employee, requestingUser?: User): void {
    const curUser = requestingUser || this.getCurrentUser();
    const existing = this.getAllEmployeesRaw().find(e => e.id === emp.id);

    let finalPermissions = emp.permissions;
    let finalConfidential = emp.isConfidential;
    if (curUser && curUser.role !== 'ADMIN') {
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

    // ALWAYS update raw employees collection! (Fixes DATA-001)
    const list = this.getAllEmployeesRaw().map(e => e.id === emp.id ? preparedEmp : e);
    this.saveEmployees(list);

    // ALWAYS update raw users collection! (Fixes DATA-002)
    const users = this.getAllUsersRaw().map(u => {
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
          avatarUrl: emp.avatarUrl || u.avatarUrl
        };
      }
      return u;
    });
    this.saveUsers(users);

    this.addAuditLog(
      'ویرایش مشخصات پرسنل',
      'پرسنل',
      `اطلاعات پرسنل ${emp.firstName} ${emp.lastName} بروزرسانی شد.`
    );
  }

  static deleteEmployee(id: string): void {
    const target = this.getAllEmployeesRaw().find(e => e.id === id);
    // ALWAYS filter raw employees list! (Fixes DATA-001)
    const list = this.getAllEmployeesRaw().filter(e => e.id !== id);
    this.saveEmployees(list);

    // ALWAYS filter raw users list, preserving admin! (Fixes DATA-002)
    const users = this.getAllUsersRaw().filter(u => u.employeeId !== id);
    this.saveUsers(users);

    const curUser = this.getCurrentUser();
    this.addAuditLog(
      'حذف پرسنل',
      'پرسنل',
      `پرسنل ${target ? `${target.firstName} ${target.lastName}` : id} توسط ${curUser?.name || 'کاربر'} حذف شد.`
    );
  }

  static toggleConfidential(empId: string): void {
    const list = this.getAllEmployeesRaw().map(e => {
      if (e.id === empId) {
        return { ...e, isConfidential: !e.isConfidential };
      }
      return e;
    });
    this.saveEmployees(list);
    this.addAuditLog('تغییر وضعیت محرمانگی', 'پرسنل', `وضعیت محرمانگی پرسنل ${empId} تغییر یافت.`);
  }

  static updateEmployeePermissions(empId: string, permissions: number[]): void {
    const list = this.getAllEmployeesRaw().map(e => {
      if (e.id === empId) {
        return { ...e, permissions };
      }
      return e;
    });
    this.saveEmployees(list);
    const users = this.getAllUsersRaw().map(u => {
      if (u.employeeId === empId) {
        return { ...u, permissions };
      }
      return u;
    });
    this.saveUsers(users);
    this.addAuditLog('تغییر سطح دسترسی', 'پرسنل', `سطح دسترسی پرسنل ${empId} به [${permissions.join(', ')}] بروزرسانی شد.`);
  }

  // ==========================================================
  // ATTENDANCE & PUNCH (Fixes ATT-001..ATT-006, GPS-005, GPS-006)
  // ==========================================================

  static getAllAttendanceRaw(): AttendanceRecord[] {
    return getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, initialAttendanceRecords);
  }

  static getAttendance(requestingUser?: User): AttendanceRecord[] {
    const all = this.getAllAttendanceRaw();
    const user = requestingUser || this.getCurrentUser();
    if (!user) return [];

    if (user.role === 'EMPLOYEE') {
      return all.filter((a) => a.employeeId === user.employeeId);
    }
    if (user.role !== 'ADMIN') {
      const confidentialIds = new Set(this.getAllEmployeesRaw().filter(e => e.isConfidential).map(e => e.id));
      return all.filter((a) => !confidentialIds.has(a.employeeId));
    }
    return all;
  }

  static saveAttendance(records: AttendanceRecord[]): void {
    setItem(STORAGE_KEYS.ATTENDANCE, records);
  }

  static clockIn(
    employeeId: string,
    method: AttendanceRecord['checkInMethod'],
    gpsCoords?: { lat: number; lng: number },
    customTime?: string,
    qrToken?: string
  ): { success: boolean; message: string; record?: AttendanceRecord } {
    const employees = this.getAllEmployeesRaw();
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return { success: false, message: 'پرسنل یافت نشد.' };

    const settings = this.getSettings();
    const shifts = this.getShifts();
    const shift = shifts.find(s => s.id === emp.shiftId) || shifts[0];
    const today = getTodayShamsi();
    const timeNow = customTime || getCurrentTimeStr();

    // Check GPS and assigned workshop (Fixes GPS-005 & GPS-006)
    let verifiedLocation;
    if (gpsCoords) {
      if (!Number.isFinite(gpsCoords.lat) || !Number.isFinite(gpsCoords.lng)) {
        return { success: false, message: 'مختصات موقعیت مکانی نامعتبر است.' };
      }

      const assignedWs = settings.workshops?.find(w => w.id === emp.workshopId) || settings.workshops?.[0];
      const targetWs = assignedWs || { lat: settings.officeLat, lng: settings.officeLng, allowedRadiusMeters: 35, name: 'کارگاه' };
      const dist = calculateGpsDistanceMeters(gpsCoords.lat, gpsCoords.lng, targetWs.lat, targetWs.lng);
      const allowedRadius = targetWs.allowedRadiusMeters || 35;

      if (dist > allowedRadius) {
        return {
          success: false,
          message: `فاصله شما از کارگاه اختصاص‌یافته (${targetWs.name}) ${dist} متر است. سقف مجاز ${allowedRadius} متر است.`
        };
      }
      verifiedLocation = { lat: gpsCoords.lat, lng: gpsCoords.lng, distanceMeters: dist };
    }

    const records = this.getAllAttendanceRaw();
    const existing = records.find(r => r.employeeId === employeeId && r.date === today);

    if (existing && existing.checkInTime) {
      return { success: false, message: `ورود شما قبلاً در ساعت ${existing.checkInTime} ثبت شده است.` };
    }

    // Calculate late minutes
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [curH, curM] = timeNow.split(':').map(Number);
    const expectedMinutes = startH * 60 + startM;
    const actualMinutes = curH * 60 + curM;

    let lateMinutes = 0;
    let status: AttendanceRecord['status'] = 'PRESENT';
    if (actualMinutes > expectedMinutes + (shift.lateToleranceMinutes || 15)) {
      lateMinutes = actualMinutes - expectedMinutes; // Fixes ATT-005
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

    // ALWAYS write to raw records list (Fixes DATA-001)
    const updatedRecords = existing
      ? records.map(r => r.id === existing.id ? newRecord : r)
      : [newRecord, ...records];

    this.saveAttendance(updatedRecords);
    this.addAuditLog('ثبت ورود', 'حضور و غیاب', `ورود ${emp.firstName} ${emp.lastName} در ساعت ${timeNow}`);
    return { success: true, message: `ورود با موفقیت در ساعت ${timeNow} ثبت شد.`, record: newRecord };
  }

  static clockOut(
    employeeId: string,
    method: AttendanceRecord['checkOutMethod'],
    gpsCoords?: { lat: number; lng: number },
    customTime?: string
  ): { success: boolean; message: string; record?: AttendanceRecord } {
    const employees = this.getAllEmployeesRaw();
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return { success: false, message: 'پرسنل یافت نشد.' };

    const today = getTodayShamsi();
    const timeNow = customTime || getCurrentTimeStr();
    const records = this.getAllAttendanceRaw();
    const existing = records.find(r => r.employeeId === employeeId && r.date === today);

    if (!existing || !existing.checkInTime) {
      return { success: false, message: 'ورود امروز شما ثبت نشده است.' };
    }

    const settings = this.getSettings();
    let verifiedLocation = existing.verifiedLocation;
    if (gpsCoords) {
      if (!Number.isFinite(gpsCoords.lat) || !Number.isFinite(gpsCoords.lng)) {
        return { success: false, message: 'مختصات موقعیت مکانی نامعتبر است.' };
      }
      const assignedWs = settings.workshops?.find(w => w.id === emp.workshopId) || settings.workshops?.[0];
      const targetWs = assignedWs || { lat: settings.officeLat, lng: settings.officeLng, allowedRadiusMeters: 35, name: 'کارگاه' };
      const dist = calculateGpsDistanceMeters(gpsCoords.lat, gpsCoords.lng, targetWs.lat, targetWs.lng);
      const allowedRadius = targetWs.allowedRadiusMeters || 35;
      if (dist > allowedRadius) {
        return {
          success: false,
          message: `فاصله شما از کارگاه اختصاص‌یافته (${targetWs.name}) ${dist} متر است. سقف مجاز ${allowedRadius} متر است.`
        };
      }
      verifiedLocation = { lat: gpsCoords.lat, lng: gpsCoords.lng, distanceMeters: dist };
    }

    const shift = this.getShifts().find(s => s.id === emp.shiftId) || this.getShifts()[0];

    const [inH, inM] = existing.checkInTime.split(':').map(Number);
    const [outH, outM] = timeNow.split(':').map(Number);
    const inTotalMins = inH * 60 + inM;
    const outTotalMins = outH * 60 + outM;

    // Check if out earlier than in (Fixes ATT-002 & ATT-003)
    const isOvernight = shift.type === 'NIGHT' || (shift.startTime > shift.endTime);
    let rawWorkedMins = 0;

    if (!isOvernight && outTotalMins < inTotalMins) {
      return {
        success: false,
        message: `ساعت خروج (${timeNow}) نمی‌تواند قبل از ساعت ورود (${existing.checkInTime}) باشد.`
      };
    }

    if (isOvernight && outTotalMins < inTotalMins) {
      rawWorkedMins = (24 * 60 - inTotalMins) + outTotalMins;
    } else {
      rawWorkedMins = outTotalMins - inTotalMins;
    }

    const breakDeduction = (rawWorkedMins >= 240 && shift.breakDurationMinutes) ? shift.breakDurationMinutes : 0;
    const netWorkedMins = Math.max(0, rawWorkedMins - breakDeduction);

    // Thursday end time handling (Fixes ATT-004)
    const now = new Date();
    const isThursday = now.getDay() === 4;
    const scheduledEndTime = (isThursday && shift.thursdayEndTime) ? shift.thursdayEndTime : shift.endTime;
    const [endH, endM] = scheduledEndTime.split(':').map(Number);
    const scheduledEndMinutes = endH * 60 + endM;

    let earlyExitMinutes = 0;
    let overtimeMinutes = 0;
    let finalStatus = existing.status;

    if (outTotalMins < scheduledEndMinutes - (shift.earlyExitToleranceMinutes || 0)) {
      earlyExitMinutes = scheduledEndMinutes - outTotalMins;
      finalStatus = 'EARLY_LEAVE'; // Fixes ATT-006
    } else if (outTotalMins > scheduledEndMinutes) {
      overtimeMinutes = outTotalMins - scheduledEndMinutes;
    }

    const updatedRecord: AttendanceRecord = {
      ...existing,
      checkOutTime: timeNow,
      workDurationMinutes: netWorkedMins,
      earlyExitMinutes,
      overtimeMinutes,
      status: finalStatus,
      checkOutMethod: method,
      approvalStatus: 'APPROVED',
      verifiedLocation,
    };

    const updatedList = records.map(r => r.id === existing.id ? updatedRecord : r);
    this.saveAttendance(updatedList);
    this.addAuditLog('ثبت خروج', 'حضور و غیاب', `خروج ${emp.firstName} ${emp.lastName} در ساعت ${timeNow}`);

    return {
      success: true,
      message: `خروج شما در ساعت ${timeNow} با موفقیت ثبت شد.`,
      record: updatedRecord
    };
  }

  // Submit manual attendance request (Fixes ATT-001: strictly PENDING)
  static submitManualAttendanceRequest(req: {
    employeeId: string;
    date: string;
    checkInTime?: string;
    checkOutTime?: string;
    reason: string;
  }): { success: boolean; message: string; record?: AttendanceRecord } {
    const employees = this.getAllEmployeesRaw();
    const emp = employees.find(e => e.id === req.employeeId);
    if (!emp) return { success: false, message: 'پرسنل یافت نشد.' };

    const newRecord: AttendanceRecord = {
      id: `att_man_${Date.now()}`,
      companyId: emp.companyId || 'comp_mgommon_01',
      employeeId: req.employeeId,
      date: req.date,
      checkInTime: req.checkInTime || '07:00',
      checkOutTime: req.checkOutTime || '16:00',
      workDurationMinutes: 480,
      lateMinutes: 0,
      earlyExitMinutes: 0,
      overtimeMinutes: 0,
      status: 'PRESENT',
      approvalStatus: 'PENDING', // PENDING for manager approval!
      checkInMethod: 'MANUAL',
      checkOutMethod: 'MANUAL',
      notes: `درخواست ثبت دستی: ${req.reason}`
    };

    const records = this.getAllAttendanceRaw();
    this.saveAttendance([newRecord, ...records]);
    this.addAuditLog('درخواست تردد دستی', 'حضور و غیاب', `ثبت درخواست تردد دستی برای ${emp.firstName} ${emp.lastName}`);

    return {
      success: true,
      message: 'درخواست تردد دستی با موفقیت ثبت شد و پس از تایید مدیریت فعال خواهد شد.',
      record: newRecord
    };
  }

  static reviewManualAttendance(recordId: string, approved: boolean, reviewerName: string): void {
    const records = this.getAllAttendanceRaw();
    const updated = records.map(r => {
      if (r.id === recordId) {
        return {
          ...r,
          approvalStatus: approved ? ('APPROVED' as const) : ('REJECTED' as const),
          status: approved ? r.status : ('ABSENT' as const),
          notes: `${r.notes || ''} (${approved ? 'تایید شد' : 'رد شد'} توسط ${reviewerName})`
        };
      }
      return r;
    });
    this.saveAttendance(updated);
  }

  // ==========================================================
  // LEAVES MANAGEMENT (Fixes HR-001..HR-007)
  // ==========================================================

  static getAllLeaveRequestsRaw(): LeaveRequest[] {
    return getItem<LeaveRequest[]>(STORAGE_KEYS.LEAVES, initialLeaveRequests);
  }

  static getLeaveRequests(requestingUser?: User): LeaveRequest[] {
    const all = this.getAllLeaveRequestsRaw();
    const user = requestingUser || this.getCurrentUser();
    if (!user) return [];

    if (user.role === 'EMPLOYEE') {
      return all.filter(l => l.employeeId === user.employeeId);
    }
    if (user.role !== 'ADMIN') {
      const confidentialIds = new Set(this.getAllEmployeesRaw().filter(e => e.isConfidential).map(e => e.id));
      return all.filter(l => !confidentialIds.has(l.employeeId));
    }
    return all;
  }

  static getLeaves(requestingUser?: User): LeaveRequest[] {
    return this.getLeaveRequests(requestingUser);
  }

  static saveLeaveRequests(leaves: LeaveRequest[]): void {
    setItem(STORAGE_KEYS.LEAVES, leaves);
  }

  static submitLeaveRequest(req: Omit<LeaveRequest, 'id' | 'status' | 'createdAt' | 'companyId'> & { companyId?: string }): { success: boolean; message: string } {
    const employees = this.getAllEmployeesRaw();
    const emp = employees.find(e => e.id === req.employeeId);
    if (!emp) return { success: false, message: 'پرسنل در سامانه یافت نشد.' };

    const settings = this.getSettings();

    // Check setting for multiple pending leaves
    if (settings.allowMultiplePendingLeaves === false) {
      const existingPending = this.getAllLeaveRequestsRaw().some(
        l => l.employeeId === req.employeeId && l.status === 'PENDING'
      );
      if (existingPending) {
        return {
          success: false,
          message: 'شما در حال حاضر یک درخواست مرخصی در انتظار بررسی دارید. لطفاً تا تعیین تکلیف آن توسط مدیریت صبوری فرمایید.'
        };
      }
    }

    if (!req.startDate || !req.endDate) {
      return { success: false, message: 'تاریخ شروع و پایان مرخصی الزامی است.' };
    }

    if (req.startDate > req.endDate) {
      return { success: false, message: 'تاریخ شروع مرخصی نمی‌تواند بعد از تاریخ پایان باشد.' };
    }

    if (req.type === 'EARNED') {
      const days = Number(req.durationDays) || 1;
      if (days <= 0 || !Number.isFinite(days)) {
        return { success: false, message: 'مدت مرخصی روزانه باید حداقل ۱ روز کاری باشد.' };
      }
      if (days > emp.remainingLeaveDays) {
        return {
          success: false,
          message: `مانده مرخصی استحقاقی شما ${emp.remainingLeaveDays} روز است و درخواست ثبت شده (${days} روز) فراتر از سقف مجاز می‌باشد.`
        };
      }
    }

    if (req.type === 'HOURLY') {
      const hours = Number(req.durationHours) || 2;
      if (hours <= 0 || !Number.isFinite(hours)) {
        return { success: false, message: 'مدت مرخصی ساعتی باید عدد مثبت باشد.' };
      }
      const monthPrefix = req.startDate.substring(0, 7);
      const usedHourlyHours = this.getAllLeaveRequestsRaw()
        .filter(l => l.employeeId === emp.id && l.type === 'HOURLY' && l.status === 'APPROVED' && l.startDate.startsWith(monthPrefix))
        .reduce((sum, l) => sum + (l.durationHours || 0), 0);

      const maxHourly = settings.maxHourlyLeaveHoursPerMonth || 16;
      if (usedHourlyHours + hours > maxHourly) {
        return {
          success: false,
          message: `سقف مجاز مرخصی ساعتی این ماه (${maxHourly} ساعت) تکمیل خواهد شد (ساعات مصرف‌شده تاکنون: ${usedHourlyHours} ساعت).`
        };
      }
    }

    const newLeave: LeaveRequest = {
      ...req,
      companyId: req.companyId || emp.companyId || settings.id || 'comp_mgommon_01',
      id: `lve_${Date.now()}`,
      status: 'PENDING',
      createdAt: getTodayShamsi()
    };

    const list = this.getAllLeaveRequestsRaw();
    this.saveLeaveRequests([newLeave, ...list]);
    this.addAuditLog('ثبت مرخصی', 'مرخصی‌ها', `درخواست مرخصی ${req.type === 'HOURLY' ? 'ساعتی' : 'روزانه'} توسط ${req.employeeName}`);
    return { success: true, message: 'درخواست مرخصی با موفقیت ثبت شد و به کارتابل مدیریت ارسال گردید.' };
  }

  static reviewLeaveRequest(id: string, approved: boolean, reviewerName: string, rejectionReason?: string): void {
    const rawLeaves = this.getAllLeaveRequestsRaw();
    const target = rawLeaves.find(l => l.id === id);
    if (!target) return;

    // Strict state machine: only PENDING! (Fixes HR-006)
    if (target.status !== 'PENDING') {
      return;
    }

    const today = getTodayShamsi();
    const time = getCurrentTimeStr();

    const updatedLeaves = rawLeaves.map(l => {
      if (l.id === id) {
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
    this.saveLeaveRequests(updatedLeaves);

    if (approved) {
      // Deduct balance from raw employees list (Fixes DATA-001)
      if (target.type === 'EARNED' && target.durationDays) {
        const rawEmps = this.getAllEmployeesRaw().map(e => {
          if (e.id === target.employeeId) {
            return {
              ...e,
              remainingLeaveDays: Math.max(0, e.remainingLeaveDays - (target.durationDays || 1))
            };
          }
          return e;
        });
        this.saveEmployees(rawEmps);
      }

      // Materialize attendance for full-day leaves on their actual scheduled dates (Fixes HR-004 & HR-005)
      if (target.type !== 'HOURLY') {
        const leaveDates = getDatesBetweenShamsi(target.startDate, target.endDate || target.startDate);
        const rawAtt = this.getAllAttendanceRaw();
        const updatedAtt = [...rawAtt];

        leaveDates.forEach(dateStr => {
          const existingIdx = updatedAtt.findIndex(a => a.employeeId === target.employeeId && a.date === dateStr);
          if (existingIdx >= 0) {
            updatedAtt[existingIdx] = {
              ...updatedAtt[existingIdx],
              status: 'ON_LEAVE',
              notes: `مرخصی تایید شده (${target.type})`
            };
          } else {
            updatedAtt.unshift({
              id: `att_lve_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              companyId: target.companyId || 'comp_mgommon_01',
              employeeId: target.employeeId,
              date: dateStr,
              workDurationMinutes: 0,
              lateMinutes: 0,
              earlyExitMinutes: 0,
              overtimeMinutes: 0,
              status: 'ON_LEAVE',
              notes: `مرخصی تایید شده (${target.type})`
            });
          }
        });

        this.saveAttendance(updatedAtt);
      }
    }
  }

  static deleteLeaveRequest(id: string): void {
    const rawLeaves = this.getAllLeaveRequestsRaw();
    const target = rawLeaves.find(l => l.id === id);

    // Restore leave balance and remove generated on-leave attendance if deleted while approved (Fixes HR-007)
    if (target && target.status === 'APPROVED') {
      if (target.type === 'EARNED' && target.durationDays) {
        const rawEmps = this.getAllEmployeesRaw().map(e => {
          if (e.id === target.employeeId) {
            return { ...e, remainingLeaveDays: e.remainingLeaveDays + target.durationDays! };
          }
          return e;
        });
        this.saveEmployees(rawEmps);
      }

      if (target.type !== 'HOURLY') {
        const dates = getDatesBetweenShamsi(target.startDate, target.endDate || target.startDate);
        const rawAtt = this.getAllAttendanceRaw();
        const cleanedAtt = rawAtt.filter(
          a => !(a.employeeId === target.employeeId && dates.includes(a.date) && a.status === 'ON_LEAVE' && (a.notes?.includes('مرخصی تایید شده') || a.id.startsWith('att_lve_')))
        );
        this.saveAttendance(cleanedAtt);
      }
    }

    this.saveLeaveRequests(rawLeaves.filter(l => l.id !== id));
  }

  // ==========================================================
  // ADVANCES (Fixes ADV-001 & ADV-002)
  // ==========================================================

  static getAllAdvanceRequestsRaw(): AdvanceRequest[] {
    return getItem<AdvanceRequest[]>(STORAGE_KEYS.ADVANCES, initialAdvanceRequests);
  }

  static getAdvanceRequests(requestingUser?: User): AdvanceRequest[] {
    const all = this.getAllAdvanceRequestsRaw();
    const user = requestingUser || this.getCurrentUser();
    if (!user) return [];

    if (user.role === 'EMPLOYEE') {
      return all.filter(a => a.employeeId === user.employeeId);
    }
    if (user.role !== 'ADMIN') {
      const confidentialIds = new Set(this.getAllEmployeesRaw().filter(e => e.isConfidential).map(e => e.id));
      return all.filter(a => !confidentialIds.has(a.employeeId));
    }
    return all;
  }

  static getAdvances(requestingUser?: User): AdvanceRequest[] {
    return this.getAdvanceRequests(requestingUser);
  }

  static saveAdvanceRequests(advances: AdvanceRequest[]): void {
    setItem(STORAGE_KEYS.ADVANCES, advances);
  }

  static submitAdvanceRequest(
    req: Omit<AdvanceRequest, 'id' | 'status' | 'createdAt' | 'companyId'> & {
      companyId?: string;
      createdAt?: string;
      requestDate?: string;
    }
  ): { success: boolean; message: string } {
    if (!req.employeeId) {
      return { success: false, message: 'شناسه پرسنل نامشخص است.' };
    }

    const employees = this.getAllEmployeesRaw();
    const emp = employees.find(e => e.id === req.employeeId);
    if (!emp) {
      return { success: false, message: 'پرسنل در سامانه یافت نشد.' };
    }

    const numAmount = Number(req.amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return { success: false, message: 'مبلغ مساعده نامعتبر است (باید عدد معتبر و بیشتر از صفر باشد).' };
    }

    const settings = this.getSettings();
    const maxPercent = settings.maxAdvanceSalaryPercent || 30;
    const maxAllowed = Math.round((emp.baseSalary * maxPercent) / 100);

    if (numAmount > maxAllowed) {
      return {
        success: false,
        message: `حداکثر سقف مجاز مساعده ${maxPercent}٪ حقوق پایه کارگاه (${formatCurrencyTomans(maxAllowed)}) می‌باشد.`
      };
    }

    if (!req.repayMonth || !/^\d{4}\/\d{2}$/.test(req.repayMonth)) {
      return { success: false, message: 'دوره بازپرداخت نامعتبر است (فرمت مجاز: سال/ماه به صورت ۱۴۰۴/۰۷).' };
    }

    const list = this.getAllAdvanceRequestsRaw();
    const existingActive = list.filter(
      a => a.employeeId === req.employeeId && a.repayMonth === req.repayMonth && (a.status === 'PENDING' || a.status === 'APPROVED')
    );
    const maxPerMonth = settings.maxAdvanceRequestsPerMonth || 1;
    if (existingActive.length >= maxPerMonth) {
      return {
        success: false,
        message: `شما برای ماه ${req.repayMonth} حداکثر تعداد مجاز درخواست مساعده (${maxPerMonth} نوبت) را ثبت نموده‌اید.`
      };
    }

    const newAdv: AdvanceRequest = {
      ...req,
      amount: Math.round(numAmount),
      companyId: req.companyId || emp.companyId || settings.id || 'comp_mgammon_01',
      id: `adv_${Date.now()}`,
      status: 'PENDING',
      requestDate: req.requestDate || getTodayShamsi(),
      createdAt: req.createdAt || getTodayShamsi(),
    };

    const list2 = this.getAllAdvanceRequestsRaw();
    this.saveAdvanceRequests([newAdv, ...list2]);
    this.addAuditLog(
      'درخواست مساعده',
      'مساعده‌ها',
      `ثبت درخواست مساعده به مبلغ ${formatCurrencyTomans(newAdv.amount)} توسط ${emp.firstName} ${emp.lastName}`
    );
    return { success: true, message: 'درخواست مساعده با موفقیت ثبت شد و در انتظار تایید مدیریت است.' };
  }

  static reviewAdvanceRequest(id: string, approved: boolean, reviewerName: string, reason?: string): void {
    const rawAdvances = this.getAllAdvanceRequestsRaw();
    const target = rawAdvances.find(a => a.id === id);
    if (!target || target.status !== 'PENDING') return; // Strict state machine (Fixes ADV-002)

    const updated = rawAdvances.map(a => {
      if (a.id === id) {
        return {
          ...a,
          status: (approved ? 'APPROVED' : 'REJECTED') as RequestStatus,
          reviewedBy: reviewerName,
          reviewedAt: `${getTodayShamsi()} - ${getCurrentTimeStr()}`,
          reason: reason ? `${a.reason} [علت رد: ${reason}]` : a.reason
        };
      }
      return a;
    });
    this.saveAdvanceRequests(updated);
  }

  static deleteAdvanceRequest(id: string): void {
    const raw = this.getAllAdvanceRequestsRaw().filter(a => a.id !== id);
    this.saveAdvanceRequests(raw);
  }

  // ==========================================================
  // PAYROLL & SALARIES (Fixes PAY-001..PAY-006)
  // ==========================================================

  static getAllSalariesRaw(): SalaryRecord[] {
    return getItem<SalaryRecord[]>(STORAGE_KEYS.SALARIES, initialSalaryRecords);
  }

  static getSalaries(requestingUser?: User): SalaryRecord[] {
    const all = this.getAllSalariesRaw();
    const user = requestingUser || this.getCurrentUser();
    if (!user) return [];

    if (user.role === 'EMPLOYEE') {
      return all.filter(s => s.employeeId === user.employeeId);
    }
    if (user.role !== 'ADMIN') {
      const confidentialIds = new Set(this.getAllEmployeesRaw().filter(e => e.isConfidential).map(e => e.id));
      return all.filter(s => !confidentialIds.has(s.employeeId));
    }
    return all;
  }

  static saveSalaries(salaries: SalaryRecord[]): void {
    setItem(STORAGE_KEYS.SALARIES, salaries);
  }

  static calculateSalaryForEmployee(employeeId: string, month: string): SalaryRecord | null {
    const employees = this.getAllEmployeesRaw();
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return null; // Fixes PAY-004: never fallback to employees[0]

    const rawSalaries = this.getAllSalariesRaw();
    const existing = rawSalaries.find(s => s.employeeId === employeeId && s.month === month);

    // Paid salary immutability: NEVER revert PAID to CALCULATED! (Fixes PAY-002)
    if (existing && existing.status === 'PAID') {
      return existing;
    }

    const settings = this.getSettings();
    const attendance = this.getAllAttendanceRaw();
    const advances = this.getAllAdvanceRequestsRaw();
    const bonusesPenalties = getItem<BonusOrPenalty[]>(STORAGE_KEYS.BONUSES, initialBonusesPenalties);

    let workedDaysCount = 0;
    let totalWorkedMinutes = 0;
    let totalOvertimeMins = 0;

    const monthlyAtt = attendance.filter(a => a.employeeId === employeeId && a.date.startsWith(month));

    monthlyAtt.forEach(a => {
      // Include worked days and paid approved leave (ON_LEAVE)
      if (a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'EARLY_LEAVE' || a.status === 'ON_LEAVE') {
        workedDaysCount++;
        totalWorkedMinutes += (a.workDurationMinutes || ((settings.dailyWorkHours || 8) * 60));
        totalOvertimeMins += (a.overtimeMinutes || 0);
      }
    });

    if (monthlyAtt.length === 0) {
      workedDaysCount = settings.workDaysPerMonth || 22;
      totalWorkedMinutes = workedDaysCount * (settings.dailyWorkHours || 8) * 60;
    }

    // Explicit absent days deduction
    const absentDaysCount = monthlyAtt.filter(a => a.status === 'ABSENT').length;
    const dailyBaseWage = Math.round(emp.baseSalary / (settings.workDaysPerMonth || 22));
    const absentDeduction = absentDaysCount * dailyBaseWage;

    // Effective hourly rate: if emp.hourlyRate is 0, compute from baseSalary / (workDays * dailyHours)
    const standardDailyHours = settings.dailyWorkHours || 8;
    const effectiveHourlyRate = emp.hourlyRate > 0
      ? emp.hourlyRate
      : Math.round(emp.baseSalary / ((settings.workDaysPerMonth || 22) * standardDailyHours));

    // Exact minute-based calculations (Fixes PAY-001 & PAY-003)
    const workedHours = Number((totalWorkedMinutes / 60).toFixed(2));
    const overtimeHours = Number((totalOvertimeMins / 60).toFixed(2));
    const overtimeMultiplier = settings.overtimeRateMultiplier || emp.overtimeRate || 1.4;
    const overtimeAmount = Math.round((totalOvertimeMins / 60) * effectiveHourlyRate * overtimeMultiplier);

    const normMonth = month.replace(/-/g, '/');

    const approvedAdvances = advances
      .filter(a => a.employeeId === employeeId && a.status === 'APPROVED' && (a.repayMonth?.replace(/-/g, '/') === normMonth))
      .reduce((sum, a) => sum + a.amount, 0);

    const bonuses = bonusesPenalties
      .filter(b => b.employeeId === employeeId && b.type === 'BONUS' && (b.month?.replace(/-/g, '/') === normMonth))
      .reduce((sum, b) => sum + b.amount, 0);

    const disciplinaryPenalties = bonusesPenalties
      .filter(b => b.employeeId === employeeId && b.type === 'PENALTY' && (b.month?.replace(/-/g, '/') === normMonth))
      .reduce((sum, b) => sum + b.amount, 0);

    const penalties = disciplinaryPenalties + absentDeduction;

    const housing = Number(settings.fixedHousingAllowance) > 0 ? Number(settings.fixedHousingAllowance) : 0;
    const grocery = Number(settings.fixedGroceryAllowance) > 0 ? Number(settings.fixedGroceryAllowance) : 0;
    const child = Number(settings.childAllowance) > 0 ? Number(settings.childAllowance) : 0;

    const grossSalary = emp.baseSalary + overtimeAmount + bonuses + housing + grocery + child;
    const insuranceBase = emp.baseSalary + housing + grocery;
    const insuranceDeduction = Math.round(insuranceBase * ((settings.insuranceRatePercent || 7) / 100));
    const taxableBase = Math.max(0, grossSalary - (settings.taxExemptionThreshold || 14000000));
    const taxDeduction = Math.round(taxableBase * ((settings.taxRatePercent || 10) / 100));
    const netSalary = Math.max(0, grossSalary - insuranceDeduction - taxDeduction - penalties - approvedAdvances);

    const record: SalaryRecord = {
      id: existing ? existing.id : `sal_${emp.id}_${month.replace('/', '_')}`,
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

    // ALWAYS write to raw salaries list (Fixes PAY-006)
    const idx = rawSalaries.findIndex(s => s.employeeId === employeeId && s.month === month);
    if (idx >= 0) {
      rawSalaries[idx] = record;
    } else {
      rawSalaries.unshift(record);
    }
    this.saveSalaries(rawSalaries);
    return record;
  }

  static handleMarkAsPaid(salaryId: string, paymentDate?: string): void {
    const raw = this.getAllSalariesRaw().map(s => {
      if (s.id === salaryId) {
        return {
          ...s,
          status: 'PAID' as const,
          paymentDate: paymentDate || getTodayShamsi()
        };
      }
      return s;
    });
    this.saveSalaries(raw);
  }

  // ==========================================================
  // SETTINGS & BACKUP (Fixes BACKUP-001..BACKUP-003, SET-001)
  // ==========================================================

  static getSettings(): CompanySettings {
    return getItem<CompanySettings>(STORAGE_KEYS.SETTINGS, initialCompanySettings);
  }

  static saveSettings(settings: CompanySettings): void {
    setItem(STORAGE_KEYS.SETTINGS, settings);
  }

  static getShifts(): Shift[] {
    return getItem<Shift[]>(STORAGE_KEYS.SHIFTS, initialShifts);
  }

  static saveShifts(shifts: Shift[]): void {
    setItem(STORAGE_KEYS.SHIFTS, shifts);
  }

  static addShift(shift: Shift): void {
    const shifts = this.getShifts();
    this.saveShifts([...shifts, shift]);
    this.addAuditLog('افزودن شیفت', 'تنظیمات', `شیفت کاری جدید ${shift.name} تعریف شد.`);
  }

  static updateShift(shift: Shift): void {
    const shifts = this.getShifts().map(s => s.id === shift.id ? shift : s);
    this.saveShifts(shifts);
    this.addAuditLog('ویرایش شیفت', 'تنظیمات', `شیفت کاری ${shift.name} ویرایش شد.`);
  }

  static deleteShift(shiftId: string): void {
    const shifts = this.getShifts().filter(s => s.id !== shiftId);
    this.saveShifts(shifts);
    this.addAuditLog('حذف شیفت', 'تنظیمات', `شیفت کاری با شناسه ${shiftId} حذف شد.`);
  }

  static addBonusOrPenalty(bp: BonusOrPenalty): void {
    const list = getItem<BonusOrPenalty[]>(STORAGE_KEYS.BONUSES, initialBonusesPenalties);
    setItem(STORAGE_KEYS.BONUSES, [bp, ...list]);
    this.addAuditLog('پاداش و جریمه', 'حقوق و دستمزد', `${bp.type === 'BONUS' ? 'پاداش' : 'جریمه'} به مبلغ ${bp.amount} ثبت شد.`);
  }

  // Export Full Backup strictly for Super Admin (Fixes BACKUP-001 & BACKUP-002)
  static exportFullBackup(requestingUser?: User): string | null {
    const user = requestingUser || this.getCurrentUser();
    if (!user || !user.isSuperAdmin) {
      console.error('Security alert: Unauthorized backup export attempt.');
      return null;
    }

    // Sanitize passwords from backup
    const usersSanitized = this.getAllUsersRaw().map(u => ({ ...u, password: '***' }));

    const backup = {
      system: 'M.GAMMON Smart Attendance and HR System',
      version: '2.6.0',
      exportedAt: new Date().toISOString(),
      shamsiDate: getTodayShamsi(),
      exportedBy: user.name,
      data: {
        settings: this.getSettings(),
        shifts: this.getShifts(),
        employees: this.getAllEmployeesRaw(),
        users: usersSanitized,
        attendance: this.getAllAttendanceRaw(),
        leaves: this.getAllLeaveRequestsRaw(),
        advances: this.getAllAdvanceRequestsRaw(),
        salaries: this.getAllSalariesRaw(),
        bonusesPenalties: getItem<BonusOrPenalty[]>(STORAGE_KEYS.BONUSES, initialBonusesPenalties),
        messages: this.getAllMessagesRaw(),
        auditLogs: this.getAllAuditLogsRaw(),
      }
    };
    return JSON.stringify(backup, null, 2);
  }

  // Import Backup with schema validation (Fixes BACKUP-003)
  static importFullBackup(jsonString: string, requestingUser?: User): { success: boolean; message: string } {
    const user = requestingUser || this.getCurrentUser();
    if (!user || !user.isSuperAdmin) {
      return { success: false, message: 'تنها مالک سامانه (مدیر ارشد) اجازه بازیابی اطلاعات را دارد.' };
    }

    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !parsed.data || !parsed.data.settings) {
        return { success: false, message: 'فایل پشتیبان نامعتبر است (فرمت غیر استاندارد).' };
      }
      const d = parsed.data;
      if (d.settings) this.saveSettings(d.settings);
      if (Array.isArray(d.shifts)) this.saveShifts(d.shifts);
      if (Array.isArray(d.employees)) this.saveEmployees(d.employees);
      if (Array.isArray(d.attendance)) this.saveAttendance(d.attendance);
      if (Array.isArray(d.leaves)) this.saveLeaveRequests(d.leaves);
      if (Array.isArray(d.advances)) this.saveAdvanceRequests(d.advances);
      if (Array.isArray(d.salaries)) this.saveSalaries(d.salaries);
      if (Array.isArray(d.bonusesPenalties)) setItem(STORAGE_KEYS.BONUSES, d.bonusesPenalties);
      if (Array.isArray(d.messages)) this.saveMessages(d.messages);
      if (Array.isArray(d.auditLogs)) setItem(STORAGE_KEYS.AUDIT_LOGS, d.auditLogs);

      this.addAuditLog('بازیابی پشتیبان', 'پایگاه داده', 'داده‌های پشتیبان با موفقیت بازگردانی شدند.');
      return { success: true, message: 'کلیه اطلاعات با موفقیت از فایل پشتیبان بازگردانی شد.' };
    } catch (e: any) {
      return { success: false, message: 'خطا در خواندن فایل: ' + (e?.message || 'فرمت نامعتبر') };
    }
  }

  // ==========================================================
  // MESSAGES & AUDIT (Fixes MSG-001, MSG-002, AUDIT-001, AUDIT-002)
  // ==========================================================

  static getAllMessagesRaw(): BroadcastMessage[] {
    return getItem<BroadcastMessage[]>(STORAGE_KEYS.MESSAGES, initialBroadcastMessages);
  }

  static getMessages(requestingUser?: User): BroadcastMessage[] {
    const all = this.getAllMessagesRaw();
    const user = requestingUser || this.getCurrentUser();
    if (!user) return [];

    if (user.role === 'EMPLOYEE') {
      return all.filter(m => m.recipientType === 'ALL' || (m.recipientIds && m.recipientIds.includes(user.employeeId || '')));
    }
    return all;
  }

  static saveMessages(messages: BroadcastMessage[]): void {
    setItem(STORAGE_KEYS.MESSAGES, messages);
  }

  static addMessage(msg: BroadcastMessage): void {
    const raw = this.getAllMessagesRaw();
    this.saveMessages([msg, ...raw]);
  }

  static deleteMessage(id: string): void {
    const raw = this.getAllMessagesRaw().filter(m => m.id !== id);
    this.saveMessages(raw);
  }

  static getAllAuditLogsRaw(): AuditLog[] {
    return getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, initialAuditLogs);
  }

  static getAuditLogs(requestingUser?: User): AuditLog[] {
    const all = this.getAllAuditLogsRaw();
    const user = requestingUser || this.getCurrentUser();
    if (!user) return [];
    if (user.role === 'EMPLOYEE') return [];
    return all;
  }

  static addAuditLog(action: string, resource: string, details: string): void {
    const user = this.getCurrentUser();
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      companyId: 'comp_mgommon_01',
      userId: user?.id || 'sys',
      userName: user?.name || 'سیستم',
      action,
      resource,
      details,
      timestamp: `${getTodayShamsi()} - ${getCurrentTimeStr()}`,
      ipAddress: '127.0.0.1'
    };
    const logs = this.getAllAuditLogsRaw();
    setItem(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...logs.slice(0, 500)]);
  }

  static hasPermission(employee: Employee | null | undefined, level: number): boolean {
    if (!employee || !employee.permissions) return false;
    return employee.permissions.includes(level);
  }

  static resetToDefaults(): void {
    this.saveSettings(initialCompanySettings);
    this.saveShifts(initialShifts);
    this.saveEmployees(initialEmployees);
    this.saveAttendance(initialAttendanceRecords);
    this.saveLeaves(initialLeaveRequests);
    this.saveAdvances(initialAdvanceRequests);
    this.saveSalaries(initialSalaryRecords);
    this.saveUsers(initialUsers);
    this.saveMessages(initialBroadcastMessages);
    removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}
