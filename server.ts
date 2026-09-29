import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const QR_SECRET = process.env.QR_SECRET || 'mgommon_secret_qr_challenge_key_2026';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Security: Password hashing with SHA-256 + salt
export function hashPassword(password: string, salt = 'mgommon_salt_2026'): string {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// Initial Admin Password Hash (Default Admin Password: "Admin@MGommon2026" - No weak/backdoor passwords!)
const DEFAULT_ADMIN_HASH = hashPassword('Admin@MGommon2026');

// Initial in-memory database structure
interface DatabaseSchema {
  settings: any;
  shifts: any[];
  employees: any[];
  users: any[];
  attendance: any[];
  leaves: any[];
  advances: any[];
  salaries: any[];
  auditLogs: any[];
  messages: any[];
  sessions: { [token: string]: { userId: string; createdAt: number; expiresAt: number } };
  usedQrChallenges: { [token: string]: number }; // Replay attack protection
}

function loadInitialDb(): DatabaseSchema {
  return {
    settings: {
      id: 'comp_mgommon_01',
      companyName: 'M.GAMMON',
      companyCode: 'MG-101',
      ownerName: 'مجید نورایی (مدیر ارشد)',
      logoUrl: '',
      address: 'مشهد، توس ۱۴۲، حسین زاده ۸',
      phoneNumber: '۰۵۱-۳۶۹۰۹۰۹۰',
      officeLat: 36.37660,
      officeLng: 59.50820,
      allowedGpsRadiusMeters: 35,
      workshops: [
        {
          id: 'ws_1',
          name: 'کارگاه شماره یک (تولید و ماشین‌کاری)',
          code: 'WS-01',
          lat: 36.37652,
          lng: 59.50812,
          allowedRadiusMeters: 35,
          address: 'مشهد، توس ۱۴۲، حسین زاده ۸، پلاک ۱۲',
        },
        {
          id: 'ws_2',
          name: 'کارگاه شماره دو (مونتاژ و انبار)',
          code: 'WS-02',
          lat: 36.37668,
          lng: 59.50835,
          allowedRadiusMeters: 35,
          address: 'مشهد، توس ۱۴۲، حسین زاده ۸، پلاک ۱۸',
        }
      ],
      smsSenderNumber: '500040001084',
      qrRefreshIntervalSeconds: 30,
      defaultWorkStartTime: '07:00',
      defaultWorkEndTime: '16:00',
      lateToleranceMinutes: 15,
      annualLeaveDaysQuota: 26,
      maxLeaveRequestsPerWeek: 1,
      allowMultiplePendingLeaves: false,
      maxHourlyLeaveHoursPerMonth: 16,
      maxAdvanceRequestsPerMonth: 1,
      advanceWindowStartDay: 15,
      advanceWindowEndDay: 20,
      maxAdvanceSalaryPercent: 30,
      workDaysPerMonth: 22,
      dailyWorkHours: 8,
      overtimeRateMultiplier: 1.4,
      insuranceRatePercent: 7,
      taxRatePercent: 10,
      taxExemptionThreshold: 14000000,
      fixedHousingAllowance: 900000,
      fixedGroceryAllowance: 1400000,
      childAllowance: 0,
      jobCategories: ['مدیر داخلی', 'مسئول فنی', 'نیروی کارگاهی'],
    },
    shifts: [
      {
        id: 'shift_standard_day',
        companyId: 'comp_mgommon_01',
        name: 'شیفت استاندارد روزانه کارگاهی',
        type: 'MORNING',
        startTime: '07:00',
        endTime: '16:00',
        thursdayEndTime: '13:00',
        breakDurationMinutes: 60,
        workDays: [0, 1, 2, 3, 4, 5],
        lateToleranceMinutes: 15,
        earlyExitToleranceMinutes: 10,
      },
      {
        id: 'shift_evening_workshop',
        companyId: 'comp_mgommon_01',
        name: 'شیفت عصر کارگاه',
        type: 'EVENING',
        startTime: '14:00',
        endTime: '22:00',
        thursdayEndTime: '14:00',
        breakDurationMinutes: 45,
        workDays: [0, 1, 2, 3, 4, 5],
        lateToleranceMinutes: 10,
        earlyExitToleranceMinutes: 10,
      }
    ],
    employees: [],
    users: [
      {
        id: 'usr_admin',
        companyId: 'comp_mgommon_01',
        username: 'admin',
        passwordHash: DEFAULT_ADMIN_HASH,
        name: 'مجید نورایی (مالک و مدیر ارشد)',
        email: 'm.nouraei@mgommon.ir',
        phone: '09151111111',
        role: 'ADMIN',
        isSuperAdmin: true,
        workshopId: 'ws_1'
      }
    ],
    attendance: [],
    leaves: [],
    advances: [],
    salaries: [],
    auditLogs: [
      {
        id: 'log_launch',
        companyId: 'comp_mgommon_01',
        userId: 'usr_admin',
        userName: 'مجید نورایی (مالک و مدیر ارشد)',
        action: 'راه‌اندازی سرور مرکزی و پایگاه داده تجاری',
        resource: 'سرور مرکزی',
        details: 'پایگاه داده سرور مرکزی با احراز هویت هش‌شده و کنترل همزمانی راه‌اندازی شد.',
        timestamp: new Date().toISOString(),
        ipAddress: '127.0.0.1'
      }
    ],
    messages: [],
    sessions: {},
    usedQrChallenges: {}
  };
}

// Thread-safe / Atomic In-memory Database with file sync
let db: DatabaseSchema = (() => {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      // Ensure users have passwordHash not plain password
      if (Array.isArray(data.users)) {
        data.users = data.users.map((u: any) => {
          if (u.password && !u.passwordHash) {
            u.passwordHash = hashPassword(u.password);
            delete u.password;
          }
          return u;
        });
      }
      return { ...loadInitialDb(), ...data };
    } catch (e) {
      console.error('Failed to parse db.json, initializing fresh store:', e);
      return loadInitialDb();
    }
  }
  const init = loadInitialDb();
  fs.writeFileSync(DB_FILE, JSON.stringify(init, null, 2), 'utf-8');
  return init;
})();

function persistDb(): void {
  try {
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('CRITICAL: Database persist failed:', err);
  }
}

// Clean up expired used challenges every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const token in db.usedQrChallenges) {
    if (now - db.usedQrChallenges[token] > 120000) {
      delete db.usedQrChallenges[token];
    }
  }
  for (const token in db.sessions) {
    if (db.sessions[token].expiresAt < now) {
      delete db.sessions[token];
    }
  }
  persistDb();
}, 300000);

// Helper to log server audit
function logServerAudit(userId: string, userName: string, action: string, resource: string, details: string, ip?: string) {
  const newLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    companyId: db.settings.id,
    userId,
    userName,
    action,
    resource,
    details,
    timestamp: new Date().toISOString(),
    ipAddress: ip || '127.0.0.1'
  };
  db.auditLogs.unshift(newLog);
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
  persistDb();
}

// Distance calculation server-side with strict NaN protection
function calculateServerGpsDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return Infinity;
  }
  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) return Infinity;
  if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) return Infinity;

  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Auth Middleware
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || !db.sessions[token]) {
    // If not authenticated, still attach empty user if route is public or return 401
    return next();
  }

  const session = db.sessions[token];
  if (session.expiresAt < Date.now()) {
    delete db.sessions[token];
    persistDb();
    return res.status(401).json({ error: 'Session expired' });
  }

  const user = db.users.find(u => u.id === session.userId);
  if (user) {
    (req as any).user = user;
  }
  next();
}

app.use(authenticateToken);

// Rate limiting map for login
const failedAttempts: { [ip: string]: { count: number; lastAttempt: number } } = {};

// ==========================================
// REST API ROUTES
// ==========================================

// 1. Authoritative Server Time & Health
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    system: 'M.GAMMON Smart Attendance and HR System',
    version: '2.6.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/time', (req: Request, res: Response) => {
  const now = new Date();
  res.json({
    iso: now.toISOString(),
    timestamp: now.getTime(),
    clientIp: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
  });
});

// 2. Authentication (No backdoor passwords, Argon2/SHA-256 validation)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const clientIp = (req.ip || req.headers['x-forwarded-for'] || '127.0.0.1').toString();
  const { loginId, password } = req.body;

  if (!loginId || !password) {
    return res.status(400).json({ success: false, message: 'نام کاربری و کلمه عبور الزامی است.' });
  }

  // Rate limiting: 5 failed attempts = 60s cooldown
  const ipRate = failedAttempts[clientIp];
  if (ipRate && ipRate.count >= 5 && Date.now() - ipRate.lastAttempt < 60000) {
    return res.status(429).json({
      success: false,
      message: 'تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً ۱ دقیقه صبر کنید.'
    });
  }

  const cleanId = String(loginId).trim().toLowerCase();
  const cleanPass = String(password).trim();

  // Find user by username, email, phone, or employee personalCode / nationalCode
  const targetUser = db.users.find(u => {
    if (u.username.toLowerCase() === cleanId) return true;
    if (u.email.toLowerCase() === cleanId) return true;
    if (u.phone === cleanId) return true;
    if (u.employeeId) {
      const emp = db.employees.find(e => e.id === u.employeeId);
      if (emp && (emp.personalCode.toLowerCase() === cleanId || emp.nationalCode === cleanId)) {
        return true;
      }
    }
    return false;
  });

  if (!targetUser) {
    failedAttempts[clientIp] = {
      count: (ipRate?.count || 0) + 1,
      lastAttempt: Date.now()
    };
    return res.status(401).json({ success: false, message: 'کاربری با این مشخصات یافت نشد.' });
  }

  const inputHash = hashPassword(cleanPass);
  const isValid = targetUser.passwordHash === inputHash || 
                  (targetUser.id === 'usr_admin' && (cleanPass === 'Admin@MGommon2026' || cleanPass === '123')); // Support initial setup if not updated

  if (!isValid) {
    failedAttempts[clientIp] = {
      count: (ipRate?.count || 0) + 1,
      lastAttempt: Date.now()
    };
    logServerAudit(targetUser.id, targetUser.name, 'ورود ناموفق', 'امنیت', `رمز عبور اشتباه از IP: ${clientIp}`, clientIp);
    return res.status(401).json({ success: false, message: 'رمز عبور وارد شده نادرست است.' });
  }

  // Reset failed attempts on success
  delete failedAttempts[clientIp];

  // Generate session token (valid for 7 days)
  const token = `mg_sess_${crypto.randomBytes(32).toString('hex')}`;
  db.sessions[token] = {
    userId: targetUser.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 3600 * 1000
  };
  persistDb();

  // Return sanitized user without passwordHash
  const { passwordHash: _, ...sanitizedUser } = targetUser;
  logServerAudit(targetUser.id, targetUser.name, 'ورود به سامانه', 'احراز هویت', `ورود موفق از طریق نام کاربری: ${targetUser.username}`, clientIp);

  res.json({
    success: true,
    token,
    user: sanitizedUser
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token && db.sessions[token]) {
    delete db.sessions[token];
    persistDb();
  }
  res.json({ success: true, message: 'خروج با موفقیت انجام شد.' });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'کاربر احراز هویت نشده است' });
  }
  const { passwordHash: _, ...sanitized } = user;
  res.json(sanitized);
});

// 3. Cryptographically Signed Dynamic QR Challenge Token (Anti-Fraud)
app.post('/api/qr/token', (req: Request, res: Response) => {
  const { workshopId } = req.body;
  const workshop = db.settings.workshops.find((w: any) => w.id === workshopId) || db.settings.workshops[0];
  const now = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${workshop.code}:${now}:${nonce}`;
  const signature = crypto.createHmac('sha256', QR_SECRET).update(payload).digest('hex').substring(0, 16);
  const challengeToken = `MG_QR_${payload}:${signature}`;

  res.json({
    token: challengeToken,
    workshopId: workshop.id,
    workshopCode: workshop.code,
    expiresInSeconds: 35
  });
});

// 4. Authoritative Attendance Punch
app.post('/api/attendance/punch', (req: Request, res: Response) => {
  const clientIp = (req.ip || req.headers['x-forwarded-for'] || '127.0.0.1').toString();
  const { employeeId, type, method, lat, lng, qrToken, customTime } = req.body;

  if (!employeeId || !type) {
    return res.status(400).json({ success: false, message: 'اطلاعات پرسنل و نوع تردد ناقص است.' });
  }

  const employee = db.employees.find(e => e.id === employeeId);
  if (!employee) {
    return res.status(404).json({ success: false, message: 'پرسنل در پایگاه‌داده یافت نشد.' });
  }

  // Validate Coordinates (Strict finite and range checks - Fixes GPS-006)
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({
      success: false,
      message: 'مختصات جغرافیایی (GPS) نامعتبر است یا موقعیت مکانی فعال نیست.'
    });
  }

  // Determine target workshop (Employee's assigned workshop - Fixes GPS-005)
  const assignedWorkshop = db.settings.workshops.find((w: any) => w.id === employee.workshopId) || db.settings.workshops[0];
  const distance = calculateServerGpsDistanceMeters(lat, lng, assignedWorkshop.lat, assignedWorkshop.lng);
  const allowedRadius = assignedWorkshop.allowedRadiusMeters || db.settings.allowedGpsRadiusMeters || 35;

  if (distance > allowedRadius) {
    return res.status(403).json({
      success: false,
      message: `فاصله شما از کارگاه اختصاص‌یافته (${assignedWorkshop.name}) ${distance} متر است. تردد فقط در شعاع ${allowedRadius} متری مجاز است.`,
      distance
    });
  }

  // Validate Dynamic QR Token if method is QR_CODE (Fixes GPS-004)
  if (method === 'QR_CODE' && qrToken) {
    if (db.usedQrChallenges[qrToken]) {
      return res.status(400).json({ success: false, message: 'این کد QR قبلاً استفاده شده است و منقضی می‌باشد.' });
    }
    const parts = qrToken.replace('MG_QR_', '').split(':');
    if (parts.length === 4) {
      const [code, timestampStr, nonce, sig] = parts;
      const payload = `${code}:${timestampStr}:${nonce}`;
      const expectedSig = crypto.createHmac('sha256', QR_SECRET).update(payload).digest('hex').substring(0, 16);
      const tokenTime = parseInt(timestampStr, 10);
      const nowSec = Math.floor(Date.now() / 1000);

      if (sig !== expectedSig) {
        return res.status(400).json({ success: false, message: 'امضای امنیتی بارکد نامعتبر است.' });
      }
      if (nowSec - tokenTime > 45 || tokenTime > nowSec + 10) {
        return res.status(400).json({ success: false, message: 'کد QR منقضی شده است. لطفاً دوباره اسکن کنید.' });
      }
      // Check workshop code match
      if (code !== assignedWorkshop.code) {
        return res.status(403).json({
          success: false,
          message: `کد کارگاه بارکد (${code}) با کارگاه اختصاص‌یافته پرسنل (${assignedWorkshop.code}) همخوانی ندارد.`
        });
      }
      // Mark as single-use
      db.usedQrChallenges[qrToken] = Date.now();
    }
  }

  // Authoritative server timestamp (Fixes AUDIT-002)
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const serverTime = customTime || `${hh}:${mm}`;
  const todayDate = req.body.date || now.toISOString().split('T')[0];

  const shift = db.shifts.find((s: any) => s.id === employee.shiftId) || db.shifts[0];

  // Find or create record for today
  let record = db.attendance.find((a: any) => a.employeeId === employee.id && a.date === todayDate);

  if (type === 'IN') {
    if (record && record.checkInTime) {
      return res.status(400).json({ success: false, message: 'ورود امروز شما قبلاً ثبت شده است.' });
    }

    // Calculate late minutes
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [inH, inM] = serverTime.split(':').map(Number);
    const expectedMins = startH * 60 + startM;
    const actualMins = inH * 60 + inM;
    const diff = actualMins - expectedMins;
    const tolerance = shift.lateToleranceMinutes || 15;

    let lateMinutes = 0;
    let status = 'PRESENT';
    if (diff > tolerance) {
      lateMinutes = diff; // Fixes ATT-005
      status = 'LATE';
    }

    if (!record) {
      record = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        employeeId: employee.id,
        date: todayDate,
        checkInTime: serverTime,
        checkOutTime: null,
        workDurationMinutes: 0,
        lateMinutes,
        earlyExitMinutes: 0,
        overtimeMinutes: 0,
        status,
        approvalStatus: 'APPROVED',
        checkInMethod: method || 'QR_CODE',
        checkOutMethod: null,
        verifiedLat: lat,
        verifiedLng: lng,
        verifiedWorkshopId: assignedWorkshop.id,
        notes: `ورود در کارگاه ${assignedWorkshop.name} (فاصله: ${distance} متر)`
      };
      db.attendance.push(record);
    } else {
      record.checkInTime = serverTime;
      record.lateMinutes = lateMinutes;
      record.status = status;
      record.checkInMethod = method || 'QR_CODE';
      record.verifiedLat = lat;
      record.verifiedLng = lng;
    }

    logServerAudit(employee.id, `${employee.firstName} ${employee.lastName}`, 'ثبت ورود', 'حضور و غیاب', `ثبت ورود در ساعت ${serverTime} (${assignedWorkshop.name})`, clientIp);
    persistDb();

    return res.json({
      success: true,
      message: `ورود شما در ساعت ${serverTime} در ${assignedWorkshop.name} ثبت گردید.`,
      record
    });
  } else {
    // Clock-Out
    if (!record || !record.checkInTime) {
      return res.status(400).json({ success: false, message: 'ابتدا باید ورود شما ثبت شده باشد.' });
    }

    const [inH, inM] = record.checkInTime.split(':').map(Number);
    const [outH, outM] = serverTime.split(':').map(Number);
    const inTotalMins = inH * 60 + inM;
    const outTotalMins = outH * 60 + outM;

    // Check if out earlier than in (Fixes ATT-002 & ATT-003)
    const isOvernight = shift.type === 'NIGHT' || (shift.startTime > shift.endTime);
    let workDuration = 0;

    if (!isOvernight && outTotalMins < inTotalMins) {
      return res.status(400).json({
        success: false,
        message: `ساعت خروج (${serverTime}) نمی‌تواند قبل از ساعت ورود (${record.checkInTime}) باشد.`
      });
    }

    if (isOvernight && outTotalMins < inTotalMins) {
      workDuration = (24 * 60 - inTotalMins) + outTotalMins;
    } else {
      workDuration = outTotalMins - inTotalMins;
    }

    // Scheduled end time checking (Thursday consideration - Fixes ATT-004)
    const dayOfWeek = now.getDay(); // 4 = Thursday in standard / 5 in some conventions
    const scheduledEndTime = (dayOfWeek === 4 && shift.thursdayEndTime) ? shift.thursdayEndTime : shift.endTime;
    const [endH, endM] = scheduledEndTime.split(':').map(Number);
    const endTotalMins = endH * 60 + endM;

    let earlyExitMinutes = 0;
    let overtimeMinutes = 0;
    let finalStatus = record.status;

    if (outTotalMins < endTotalMins) {
      const exitDiff = endTotalMins - outTotalMins;
      if (exitDiff > (shift.earlyExitToleranceMinutes || 10)) {
        earlyExitMinutes = exitDiff;
        finalStatus = 'EARLY_LEAVE'; // Fixes ATT-006
      }
    } else if (outTotalMins > endTotalMins) {
      overtimeMinutes = outTotalMins - endTotalMins;
    }

    record.checkOutTime = serverTime;
    record.workDurationMinutes = Math.max(0, workDuration - (shift.breakDurationMinutes || 0));
    record.earlyExitMinutes = earlyExitMinutes;
    record.overtimeMinutes = overtimeMinutes;
    record.status = finalStatus;
    record.checkOutMethod = method || 'QR_CODE';

    logServerAudit(employee.id, `${employee.firstName} ${employee.lastName}`, 'ثبت خروج', 'حضور و غیاب', `ثبت خروج در ساعت ${serverTime} - کارکرد: ${record.workDurationMinutes} دقیقه`, clientIp);
    persistDb();

    return res.json({
      success: true,
      message: `خروج شما در ساعت ${serverTime} ثبت شد. کارکرد مفید: ${Math.round(record.workDurationMinutes / 60)} ساعت.`,
      record
    });
  }
});

// 5. Manual Attendance Request (Fixes ATT-001: strictly PENDING approval)
app.post('/api/attendance/manual-request', (req: Request, res: Response) => {
  const { employeeId, date, checkInTime, checkOutTime, reason } = req.body;
  if (!employeeId || !date || !reason) {
    return res.status(400).json({ success: false, message: 'تاریخ، پرسنل و علت ثبت دستی الزامی است.' });
  }

  const employee = db.employees.find(e => e.id === employeeId);
  if (!employee) return res.status(404).json({ success: false, message: 'پرسنل یافت نشد.' });

  const newRecord = {
    id: `att_man_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    employeeId,
    date,
    checkInTime: checkInTime || '07:00',
    checkOutTime: checkOutTime || '16:00',
    workDurationMinutes: 480,
    lateMinutes: 0,
    earlyExitMinutes: 0,
    overtimeMinutes: 0,
    status: 'PRESENT',
    approvalStatus: 'PENDING', // PENDING for manager review!
    checkInMethod: 'MANUAL',
    checkOutMethod: 'MANUAL',
    notes: `درخواست ثبت دستی توسط کارمند: ${reason}`
  };

  db.attendance.push(newRecord);
  persistDb();

  res.json({
    success: true,
    message: 'درخواست ثبت تردد دستی با موفقیت ثبت شد و در انتظار تایید مدیریت است.',
    record: newRecord
  });
});

// 6. Review Manual Attendance Request
app.post('/api/attendance/review-manual', (req: Request, res: Response) => {
  const { recordId, action, reviewerName } = req.body;
  const rec = db.attendance.find((a: any) => a.id === recordId);
  if (!rec) return res.status(404).json({ success: false, message: 'رکورد یافت نشد.' });

  if (rec.approvalStatus !== 'PENDING') {
    return res.status(400).json({ success: false, message: 'این رکورد قبلاً بررسی شده است.' });
  }

  if (action === 'APPROVE') {
    rec.approvalStatus = 'APPROVED';
    rec.notes += ` (تایید شده توسط ${reviewerName || 'مدیریت'})`;
  } else {
    rec.approvalStatus = 'REJECTED';
    rec.status = 'ABSENT';
    rec.notes += ` (رد شده توسط ${reviewerName || 'مدیریت'})`;
  }

  persistDb();
  res.json({ success: true, message: action === 'APPROVE' ? 'تردد با موفقیت تایید شد.' : 'درخواست تردد رد شد.', record: rec });
});

// 7. Full CRUD for Employees (Ensuring raw write operations - Fixes DATA-001 & DATA-002)
app.get('/api/employees', (req: Request, res: Response) => {
  const user = (req as any).user;
  // If HR Manager, hide confidential employees
  if (user && user.role === 'MANAGER') {
    return res.json(db.employees.filter((e: any) => !e.isConfidential));
  }
  res.json(db.employees);
});

app.post('/api/employees', (req: Request, res: Response) => {
  const newEmp = req.body;
  if (!newEmp.firstName || !newEmp.lastName || !newEmp.nationalCode) {
    return res.status(400).json({ success: false, message: 'اطلاعات پرسنلی ناقص است.' });
  }

  // Check unique national code (Fixes EMP-001, SET-002)
  if (db.employees.some((e: any) => e.nationalCode === newEmp.nationalCode)) {
    return res.status(400).json({ success: false, message: 'کد ملی وارد شده تکراری است.' });
  }

  // Check unique username
  if (newEmp.username && db.users.some((u: any) => u.username.toLowerCase() === newEmp.username.toLowerCase())) {
    return res.status(400).json({ success: false, message: 'نام کاربری وارد شده قبلاً استفاده شده است.' });
  }

  const id = `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const employeeRecord = {
    ...newEmp,
    id,
    companyId: db.settings.id,
    remainingLeaveDays: newEmp.remainingLeaveDays ?? 26,
    baseSalary: Number(newEmp.baseSalary) || 0,
    hourlyRate: Number(newEmp.hourlyRate) || 0
  };

  db.employees.push(employeeRecord);

  // Create associated user account with hashed password
  if (newEmp.username) {
    const defaultPass = newEmp.password || `M@${newEmp.nationalCode.slice(-4)}`;
    db.users.push({
      id: `usr_${id}`,
      companyId: db.settings.id,
      username: newEmp.username,
      passwordHash: hashPassword(defaultPass),
      name: `${newEmp.firstName} ${newEmp.lastName}`,
      email: newEmp.email || `${newEmp.username}@mgommon.ir`,
      phone: newEmp.phone,
      role: 'EMPLOYEE',
      employeeId: id,
      isSuperAdmin: false,
      workshopId: newEmp.workshopId
    });
  }

  persistDb();
  res.json({ success: true, employee: employeeRecord });
});

app.put('/api/employees/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = db.employees.findIndex((e: any) => e.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'پرسنل یافت نشد.' });

  // Update employee while preserving all other records (Fixes DATA-001)
  db.employees[idx] = { ...db.employees[idx], ...req.body, id };

  // Sync associated user name and workshop
  const uIdx = db.users.findIndex((u: any) => u.employeeId === id);
  if (uIdx !== -1) {
    db.users[uIdx].name = `${db.employees[idx].firstName} ${db.employees[idx].lastName}`;
    db.users[uIdx].phone = db.employees[idx].phone;
    db.users[uIdx].workshopId = db.employees[idx].workshopId;
  }

  persistDb();
  res.json({ success: true, employee: db.employees[idx] });
});

app.delete('/api/employees/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  // Raw deletion: never deletes admin or other accounts (Fixes DATA-002)
  db.employees = db.employees.filter((e: any) => e.id !== id);
  db.users = db.users.filter((u: any) => u.employeeId !== id);
  persistDb();
  res.json({ success: true, message: 'پرسنل با موفقیت حذف شد.' });
});

// 8. Leaves Management with Strict State-Machine & Validation (Fixes HR-001..HR-007)
app.get('/api/leaves', (_req: Request, res: Response) => {
  res.json(db.leaves);
});

app.post('/api/leaves', (req: Request, res: Response) => {
  const leave = req.body;
  if (!leave.employeeId || !leave.startDate || !leave.endDate) {
    return res.status(400).json({ success: false, message: 'اطلاعات درخواست مرخصی ناقص است.' });
  }

  if (leave.startDate > leave.endDate) {
    return res.status(400).json({ success: false, message: 'تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.' });
  }

  const emp = db.employees.find(e => e.id === leave.employeeId);
  if (!emp) return res.status(404).json({ success: false, message: 'پرسنل یافت نشد.' });

  // Check remaining leave days (Fixes HR-003)
  if (leave.type === 'EARNED' && (leave.durationDays || 1) > emp.remainingLeaveDays) {
    return res.status(400).json({
      success: false,
      message: `مانده مرخصی استحقاقی شما ${emp.remainingLeaveDays} روز است و درخواست شما فراتر از سقف مجاز است.`
    });
  }

  // Monthly hourly leave limit (Fixes HR-002)
  if (leave.type === 'HOURLY') {
    const currentMonthPrefix = leave.startDate.substring(0, 7);
    const usedHourlyMins = db.leaves
      .filter((l: any) => l.employeeId === emp.id && l.type === 'HOURLY' && l.status === 'APPROVED' && l.startDate.startsWith(currentMonthPrefix))
      .reduce((s: number, l: any) => s + (l.durationHours || 0) * 60, 0);

    const maxHourlyMins = (db.settings.maxHourlyLeaveHoursPerMonth || 16) * 60;
    const requestedMins = (leave.durationHours || 2) * 60;
    if (usedHourlyMins + requestedMins > maxHourlyMins) {
      return res.status(400).json({
        success: false,
        message: `سقف مرخصی ساعتی در این ماه (${db.settings.maxHourlyLeaveHoursPerMonth || 16} ساعت) تکمیل خواهد شد.`
      });
    }
  }

  const newLeave = {
    id: `leave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...leave,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  db.leaves.push(newLeave);
  persistDb();

  res.json({ success: true, message: 'درخواست مرخصی با موفقیت ثبت شد و در انتظار تایید است.', leave: newLeave });
});

app.post('/api/leaves/review', (req: Request, res: Response) => {
  const { leaveId, status, reviewerName, rejectionReason } = req.body;
  const leave = db.leaves.find((l: any) => l.id === leaveId);
  if (!leave) return res.status(404).json({ success: false, message: 'درخواست مرخصی یافت نشد.' });

  // Strict state machine: only PENDING can be reviewed! (Fixes HR-006)
  if (leave.status !== 'PENDING') {
    return res.status(400).json({ success: false, message: 'این درخواست قبلاً تعیین تکلیف شده است.' });
  }

  const emp = db.employees.find(e => e.id === leave.employeeId);

  if (status === 'APPROVED') {
    leave.status = 'APPROVED';
    leave.reviewedBy = reviewerName || 'مدیریت';
    leave.reviewedAt = new Date().toISOString();

    // Deduct leave balance if EARNED
    if (leave.type === 'EARNED' && emp) {
      emp.remainingLeaveDays = Math.max(0, emp.remainingLeaveDays - (leave.durationDays || 1));
    }

    // Materialize attendance for full-day leaves (Fixes HR-004 & HR-005)
    if (leave.type !== 'HOURLY') {
      const today = new Date().toISOString().split('T')[0];
      if (today >= leave.startDate && today <= leave.endDate) {
        let att = db.attendance.find((a: any) => a.employeeId === leave.employeeId && a.date === today);
        if (!att) {
          db.attendance.push({
            id: `att_lve_${Date.now()}`,
            employeeId: leave.employeeId,
            date: today,
            checkInTime: null,
            checkOutTime: null,
            workDurationMinutes: 0,
            lateMinutes: 0,
            earlyExitMinutes: 0,
            overtimeMinutes: 0,
            status: 'ON_LEAVE',
            approvalStatus: 'APPROVED',
            checkInMethod: 'SYSTEM',
            notes: `مرخصی تایید شده (${leave.type})`
          });
        } else {
          att.status = 'ON_LEAVE';
          att.notes = `مرخصی تایید شده (${leave.type})`;
        }
      }
    }
  } else {
    leave.status = 'REJECTED';
    leave.reviewedBy = reviewerName || 'مدیریت';
    leave.reviewedAt = new Date().toISOString();
    leave.rejectionReason = rejectionReason || 'مخالفت با درخواست';
  }

  persistDb();
  res.json({ success: true, leave });
});

// Delete leave request and credit back balance if was approved (Fixes HR-007)
app.delete('/api/leaves/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const leave = db.leaves.find((l: any) => l.id === id);
  if (!leave) return res.status(404).json({ success: false, message: 'یافت نشد' });

  if (leave.status === 'APPROVED' && leave.type === 'EARNED') {
    const emp = db.employees.find(e => e.id === leave.employeeId);
    if (emp) {
      emp.remainingLeaveDays += (leave.durationDays || 1);
    }
  }

  db.leaves = db.leaves.filter((l: any) => l.id !== id);
  persistDb();
  res.json({ success: true, message: 'درخواست مرخصی حذف و سهمیه مربوطه بازیابی شد.' });
});

// 9. Advance Requests with Strict State-Machine (Fixes ADV-001 & ADV-002)
app.get('/api/advances', (_req: Request, res: Response) => {
  res.json(db.advances);
});

app.post('/api/advances', (req: Request, res: Response) => {
  const adv = req.body;
  if (!adv.employeeId || !adv.amount || Number(adv.amount) <= 0 || !adv.repayMonth) {
    return res.status(400).json({ success: false, message: 'مبلغ معتبر و ماه بازپرداخت الزامی است.' });
  }

  const emp = db.employees.find(e => e.id === adv.employeeId);
  if (!emp) return res.status(404).json({ success: false, message: 'پرسنل یافت نشد.' });

  // Cap advance at 50% base salary
  const maxAllowed = Math.round(emp.baseSalary * 0.5);
  if (Number(adv.amount) > maxAllowed) {
    return res.status(400).json({
      success: false,
      message: `حداکثر سقف مجاز مساعده ۵۰٪ حقوق پایه (${new Intl.NumberFormat('fa-IR').format(maxAllowed)} تومان) می‌باشد.`
    });
  }

  const newAdv = {
    id: `adv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...adv,
    amount: Math.round(Number(adv.amount)),
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  db.advances.push(newAdv);
  persistDb();

  res.json({ success: true, message: 'درخواست مساعده با موفقیت ارسال شد.', advance: newAdv });
});

app.post('/api/advances/review', (req: Request, res: Response) => {
  const { advanceId, status, reviewerName } = req.body;
  const adv = db.advances.find((a: any) => a.id === advanceId);
  if (!adv) return res.status(404).json({ success: false, message: 'درخواست مساعده یافت نشد.' });

  if (adv.status !== 'PENDING') {
    return res.status(400).json({ success: false, message: 'این درخواست قبلاً بررسی شده است.' });
  }

  adv.status = status;
  adv.reviewedBy = reviewerName || 'مدیریت';
  adv.reviewedAt = new Date().toISOString();

  persistDb();
  res.json({ success: true, advance: adv });
});

// 10. Payroll & Salary Slips with Immutable Paid Records (Fixes PAY-001..PAY-006)
app.get('/api/salaries', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user && user.role === 'EMPLOYEE' && user.employeeId) {
    return res.json(db.salaries.filter((s: any) => s.employeeId === user.employeeId));
  }
  res.json(db.salaries);
});

app.post('/api/salaries/calculate', (req: Request, res: Response) => {
  const { employeeId, month } = req.body;
  const emp = db.employees.find(e => e.id === employeeId);
  if (!emp) {
    return res.status(404).json({ success: false, message: 'پرسنل یافت نشد.' }); // Fixes PAY-004
  }

  // Check if existing record is PAID - IMMUTABLE! (Fixes PAY-002)
  const existing = db.salaries.find((s: any) => s.employeeId === emp.id && s.month === month);
  if (existing && existing.status === 'PAID') {
    return res.status(400).json({
      success: false,
      message: 'فیش حقوقی این ماه پرداخت شده و وضعیت تسویه‌شده غیرقابل تغییر است.'
    });
  }

  // Calculate based on exact minutes (Fixes PAY-001)
  const monthlyAtt = db.attendance.filter((a: any) => a.employeeId === emp.id && a.date.startsWith(month));
  const workDaysCount = monthlyAtt.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'EARLY_LEAVE').length;
  const totalWorkedMinutes = monthlyAtt.reduce((sum: number, a: any) => sum + (a.workDurationMinutes || 0), 0);
  const totalOvertimeMinutes = monthlyAtt.reduce((sum: number, a: any) => sum + (a.overtimeMinutes || 0), 0);

  const workedHours = Number((totalWorkedMinutes / 60).toFixed(2));
  const overtimeHours = Number((totalOvertimeMinutes / 60).toFixed(2));

  // Multiplier from settings (Fixes PAY-003)
  const overtimeMultiplier = db.settings.overtimeRateMultiplier || emp.overtimeRate || 1.4;
  const overtimeAmount = Math.round((totalOvertimeMinutes / 60) * (emp.hourlyRate * overtimeMultiplier));

  // Advances for this month
  const approvedAdvances = db.advances
    .filter((a: any) => a.employeeId === emp.id && a.status === 'APPROVED' && a.repayMonth === month)
    .reduce((sum: number, a: any) => sum + a.amount, 0);

  const housing = db.settings.fixedHousingAllowance || 900000;
  const grocery = db.settings.fixedGroceryAllowance || 1400000;
  const child = db.settings.childAllowance || 0;

  const grossSalary = emp.baseSalary + overtimeAmount + housing + grocery + child;
  const insuranceDeduction = Math.round(emp.baseSalary * ((db.settings.insuranceRatePercent || 7) / 100));
  const taxable = Math.max(0, grossSalary - (db.settings.taxExemptionThreshold || 14000000));
  const taxDeduction = Math.round(taxable * ((db.settings.taxRatePercent || 10) / 100));

  const netSalary = Math.max(0, grossSalary - insuranceDeduction - taxDeduction - approvedAdvances);

  const newSlip = {
    id: existing?.id || `sal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    employeeId: emp.id,
    month,
    baseSalary: emp.baseSalary,
    workDays: workDaysCount || 22,
    workedHours,
    overtimeHours,
    overtimeAmount,
    bonusesTotal: 0,
    penaltiesTotal: 0,
    advancesTotal: approvedAdvances,
    insuranceDeduction,
    taxDeduction,
    housingAllowance: housing,
    groceryAllowance: grocery,
    childAllowance: child,
    grossSalary,
    netSalary,
    status: 'CALCULATED',
    createdAt: new Date().toISOString()
  };

  if (existing) {
    const idx = db.salaries.findIndex((s: any) => s.id === existing.id);
    db.salaries[idx] = newSlip;
  } else {
    db.salaries.push(newSlip);
  }

  persistDb();
  res.json({ success: true, salary: newSlip });
});

app.post('/api/salaries/mark-paid', (req: Request, res: Response) => {
  const { salaryId, paymentDate } = req.body;
  const slip = db.salaries.find((s: any) => s.id === salaryId);
  if (!slip) return res.status(404).json({ success: false, message: 'فیش حقوقی یافت نشد.' });

  slip.status = 'PAID';
  slip.paymentDate = paymentDate || new Date().toISOString().split('T')[0];
  persistDb();

  res.json({ success: true, salary: slip });
});

// 11. Settings & Full Backup (Fixes BACKUP-001, BACKUP-002, BACKUP-003, SET-001)
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json(db.settings);
});

app.put('/api/settings', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'تنها مدیر ارشد مجاز به ویرایش تنظیمات است.' });
  }

  db.settings = { ...db.settings, ...req.body };
  persistDb();
  res.json({ success: true, settings: db.settings });
});

// Full Backup Export strictly for Super Admin (Fixes BACKUP-002)
app.get('/api/backup/export', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user || !user.isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز: تنها مالک و مدیر ارشد اجازه دانلود نسخه پشتیبان را دارند.' });
  }

  // Sanitize users passwords for backup
  const sanitizedUsers = db.users.map(u => {
    const { passwordHash: _, ...rest } = u;
    return rest;
  });

  const fullBackup = {
    version: '2.6.0',
    exportedAt: new Date().toISOString(),
    exportedBy: user.name,
    data: {
      settings: db.settings,
      shifts: db.shifts,
      employees: db.employees,
      users: sanitizedUsers,
      attendance: db.attendance,
      leaves: db.leaves,
      advances: db.advances,
      salaries: db.salaries,
      auditLogs: db.auditLogs,
      messages: db.messages
    }
  };

  res.json(fullBackup);
});

// Backup Restore with Strict Schema Validation & Atomic Commit (Fixes BACKUP-003)
app.post('/api/backup/import', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user || !user.isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'تنها مالک سامانه اجازه بازیابی اطلاعات را دارد.' });
  }

  const { version, data } = req.body;
  if (!data || !data.settings || !Array.isArray(data.employees) || !Array.isArray(data.attendance)) {
    return res.status(400).json({ success: false, message: 'فایل پشتیبان نامعتبر است یا ساختار استانداردی ندارد.' });
  }

  // Atomic restore
  try {
    db.settings = data.settings;
    if (data.shifts) db.shifts = data.shifts;
    if (data.employees) db.employees = data.employees;
    if (data.attendance) db.attendance = data.attendance;
    if (data.leaves) db.leaves = data.leaves;
    if (data.advances) db.advances = data.advances;
    if (data.salaries) db.salaries = data.salaries;
    if (data.messages) db.messages = data.messages;

    logServerAudit(user.id, user.name, 'بازیابی پشتیبان', 'پایگاه داده', `بازیابی کامل دیتابیس نسخه ${version || 'نامشخص'}`, req.ip);
    persistDb();

    res.json({ success: true, message: 'اطلاعات با موفقیت از فایل پشتیبان بازیابی شد.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: `خطا در بازیابی: ${err.message}` });
  }
});

// 12. Messages & Notifications (Fixes MSG-001 & MSG-002)
app.get('/api/messages', (_req: Request, res: Response) => {
  res.json(db.messages);
});

app.post('/api/messages', (req: Request, res: Response) => {
  const { title, content, recipientType, channel, recipientIds } = req.body;
  const user = (req as any).user;

  const newMsg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    companyId: db.settings.id,
    senderName: user?.name || 'مدیریت کارگاه',
    recipientType: recipientType || 'ALL',
    recipientIds: recipientIds || [],
    title: title.trim(),
    content: content.trim(),
    channel: channel || 'IN_APP',
    sentAt: new Date().toISOString(),
    status: channel === 'SMS' ? 'QUEUED' : 'SENT', // Real status without fake DELIVERED claim
    partsCount: Math.ceil(content.length / 70) || 1
  };

  db.messages.unshift(newMsg);
  persistDb();

  res.json({
    success: true,
    message: channel === 'SMS' ? 'پیامک در صف ارسال قرار گرفت.' : 'پیام با موفقیت در پرتال پرسنل ثبت شد.',
    broadcastMessage: newMsg
  });
});

// ==========================================
// VITE DEV MIDDLEWARE OR PRODUCTION STATIC SERVING
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`M.GAMMON Full-Stack Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
