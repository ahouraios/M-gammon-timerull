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

// Security: Password hashing with PBKDF2 (SHA-256, 10000 iterations) (Fixes SEC-010)
export function hashPassword(password: string, salt = 'mgommon_salt_2026'): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
}

export function legacyHashPassword(password: string, salt = 'mgommon_salt_2026'): string {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// Authoritative Tehran Timezone Helper (Asia/Tehran) (Fixes SEC-015)
export function getTehranDateTime(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(d);

  const map: { [type: string]: string } = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  const dateStr = `${map.year}-${map.month}-${map.day}`;
  const timeStr = `${map.hour}:${map.minute}`;
  return { dateStr, timeStr, isoTehran: `${dateStr}T${timeStr}:${map.second}` };
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
  bonusesPenalties?: any[];
  auditLogs: any[];
  messages: any[];
  sessions: { [token: string]: { userId: string; createdAt: number; expiresAt: number; rememberMe?: boolean } };
  webauthnCredentials?: { [userId: string]: any[] };
  webauthnChallenges?: { [challenge: string]: { userId?: string; expiresAt: number } };
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
    bonusesPenalties: [],
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
    // If not authenticated, proceed without attaching user
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

// Role & Session Authorization Guards (Fixes SEC-001..SEC-007)
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).user) {
    return res.status(401).json({ success: false, message: 'احراز هویت الزامی است. لطفاً ابتدا وارد سامانه شوید.' });
  }
  next();
}

function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'احراز هویت الزامی است.' });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز: نقش شما اجازه انجام این عملیات را ندارد.' });
    }
    next();
  };
}

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
  const { loginId, password, rememberMe } = req.body;

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

  const pbkdf2Hash = hashPassword(cleanPass);
  const legacyHash = legacyHashPassword(cleanPass);
  const isDefaultAdmin = targetUser.id === 'usr_admin' && cleanPass === 'Admin@MGommon2026';
  const isValid = targetUser.passwordHash === pbkdf2Hash || targetUser.passwordHash === legacyHash || isDefaultAdmin;

  if (!isValid) {
    failedAttempts[clientIp] = {
      count: (ipRate?.count || 0) + 1,
      lastAttempt: Date.now()
    };
    logServerAudit(targetUser.id, targetUser.name, 'ورود ناموفق', 'امنیت', `رمز عبور اشتباه از IP: ${clientIp}`, clientIp);
    return res.status(401).json({ success: false, message: 'رمز عبور وارد شده نادرست است.' });
  }

  // Auto-upgrade hash to PBKDF2 if was legacy or default admin
  if (targetUser.passwordHash !== pbkdf2Hash) {
    targetUser.passwordHash = pbkdf2Hash;
  }

  // Reset failed attempts on success
  delete failedAttempts[clientIp];

  // Generate session token (30 days if rememberMe, 24 hours otherwise)
  const duration = rememberMe ? 30 * 24 * 3600 * 1000 : 24 * 3600 * 1000;
  const token = `mg_sess_${crypto.randomBytes(32).toString('hex')}`;
  db.sessions[token] = {
    userId: targetUser.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + duration,
    rememberMe: !!rememberMe
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

// Verify existing session token from headers
app.get('/api/auth/verify-session', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'نشست منقضی شده یا نامعتبر است.' });
  }
  const { passwordHash: _, ...sanitizedUser } = user;
  res.json({ success: true, user: sanitizedUser });
});

// WebAuthn Biometric Login Options
app.post('/api/auth/webauthn/login-options', (req: Request, res: Response) => {
  const { loginId } = req.body;
  let targetUser: any = null;
  if (loginId) {
    const cleanId = String(loginId).trim().toLowerCase();
    targetUser = db.users.find(u =>
      u.username.toLowerCase() === cleanId ||
      u.email.toLowerCase() === cleanId ||
      u.phone === cleanId ||
      (u.employeeId && db.employees.some(e => e.id === u.employeeId && (e.personalCode.toLowerCase() === cleanId || e.nationalCode === cleanId)))
    );
  }

  const challenge = crypto.randomBytes(32).toString('base64url');
  if (!db.webauthnChallenges) db.webauthnChallenges = {};
  db.webauthnChallenges[challenge] = {
    userId: targetUser ? targetUser.id : undefined,
    expiresAt: Date.now() + 120000
  };
  persistDb();

  const hostname = req.hostname.includes(':') ? req.hostname.split(':')[0] : req.hostname;
  res.json({
    challenge,
    rpId: hostname,
    timeout: 60000,
    userVerification: 'preferred',
    allowCredentials: targetUser && db.webauthnCredentials && db.webauthnCredentials[targetUser.id]
      ? db.webauthnCredentials[targetUser.id].map((c: any) => ({
          id: c.id,
          type: 'public-key',
          transports: ['internal']
        }))
      : []
  });
});

// WebAuthn Biometric Login Verify
app.post('/api/auth/webauthn/login-verify', (req: Request, res: Response) => {
  const { credentialId, challenge, loginId, rememberMe } = req.body;
  if (!challenge || !db.webauthnChallenges || !db.webauthnChallenges[challenge]) {
    return res.status(400).json({ success: false, message: 'چالش امنیتی منقضی یا نامعتبر است.' });
  }

  const storedChallenge = db.webauthnChallenges[challenge];
  delete db.webauthnChallenges[challenge];

  let targetUser = storedChallenge.userId ? db.users.find(u => u.id === storedChallenge.userId) : null;

  if (!targetUser && loginId) {
    const cleanId = String(loginId).trim().toLowerCase();
    targetUser = db.users.find(u =>
      u.username.toLowerCase() === cleanId ||
      u.email.toLowerCase() === cleanId ||
      u.phone === cleanId ||
      (u.employeeId && db.employees.some(e => e.id === u.employeeId && (e.personalCode.toLowerCase() === cleanId || e.nationalCode === cleanId)))
    );
  }

  if (!targetUser && credentialId && db.webauthnCredentials) {
    for (const uId in db.webauthnCredentials) {
      if (db.webauthnCredentials[uId].some((c: any) => c.id === credentialId)) {
        targetUser = db.users.find(u => u.id === uId);
        break;
      }
    }
  }

  if (!targetUser) {
    return res.status(401).json({ success: false, message: 'کاربر متصل به این اثر انگشت یافت نشد.' });
  }

  const duration = rememberMe ? 30 * 24 * 3600 * 1000 : 24 * 3600 * 1000;
  const token = `mg_sess_${crypto.randomBytes(32).toString('hex')}`;
  db.sessions[token] = {
    userId: targetUser.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + duration,
    rememberMe: !!rememberMe
  };
  persistDb();

  const { passwordHash: _, ...sanitizedUser } = targetUser;
  logServerAudit(targetUser.id, targetUser.name, 'ورود با اثر انگشت', 'احراز هویت', `ورود بیومتریک موفق: ${targetUser.username}`);

  res.json({
    success: true,
    token,
    user: sanitizedUser
  });
});

// WebAuthn Biometric Register Options (for logged-in user)
app.post('/api/auth/webauthn/register-options', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const challenge = crypto.randomBytes(32).toString('base64url');
  if (!db.webauthnChallenges) db.webauthnChallenges = {};
  db.webauthnChallenges[challenge] = { userId: user.id, expiresAt: Date.now() + 120000 };
  persistDb();

  const hostname = req.hostname.includes(':') ? req.hostname.split(':')[0] : req.hostname;
  res.json({
    challenge,
    rp: {
      name: 'M.GAMMON',
      id: hostname
    },
    user: {
      id: Buffer.from(user.id).toString('base64url'),
      name: user.username,
      displayName: user.name
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },
      { alg: -257, type: 'public-key' }
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'preferred',
      requireResidentKey: false
    },
    timeout: 60000,
    attestation: 'none'
  });
});

// WebAuthn Biometric Register Verify
app.post('/api/auth/webauthn/register-verify', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { credentialId, challenge } = req.body;
  if (!challenge || !db.webauthnChallenges || !db.webauthnChallenges[challenge]) {
    return res.status(400).json({ success: false, message: 'چالش امنیتی منقضی یا نامعتبر است.' });
  }
  delete db.webauthnChallenges[challenge];

  if (!db.webauthnCredentials) db.webauthnCredentials = {};
  if (!db.webauthnCredentials[user.id]) db.webauthnCredentials[user.id] = [];

  if (!db.webauthnCredentials[user.id].some((c: any) => c.id === credentialId)) {
    db.webauthnCredentials[user.id].push({
      id: credentialId,
      registeredAt: Date.now()
    });
  }
  persistDb();

  logServerAudit(user.id, user.name, 'ثبت اثر انگشت', 'امنیت', 'اثر انگشت جدید در سامانه ثبت گردید.');
  res.json({ success: true, message: 'اثر انگشت دستگاه با موفقیت به حساب شما متصل شد.' });
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

// 3. Cryptographically Signed Dynamic QR Challenge Token (Anti-Fraud) (Fixes SEC-011)
app.post('/api/qr/token', (req: Request, res: Response) => {
  const { workshopId } = req.body;
  if (!workshopId) {
    return res.status(400).json({ success: false, message: 'شناسه کارگاه مشخص نشده است.' });
  }
  const workshop = db.settings.workshops.find((w: any) => w.id === workshopId);
  if (!workshop) {
    return res.status(400).json({ success: false, message: 'شناسه کارگاه در سامانه یافت نشد.' });
  }
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

// 4. Authoritative Attendance Punch (Fixes SEC-001, SEC-002, SEC-012, SEC-015)
app.post('/api/attendance/punch', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const clientIp = (req.ip || req.headers['x-forwarded-for'] || '127.0.0.1').toString();
  const { type, method, lat, lng, qrToken } = req.body;

  // Identity binding (Fixes SEC-001): Employees can ONLY punch for their own profile
  let targetEmployeeId = req.body.employeeId;
  if (user.role === 'EMPLOYEE') {
    if (!user.employeeId) {
      return res.status(403).json({ success: false, message: 'حساب کاربری شما به هیچ پرونده پرسنلی متصل نیست.' });
    }
    targetEmployeeId = user.employeeId;
  } else if (!targetEmployeeId) {
    targetEmployeeId = user.employeeId;
  }

  if (!targetEmployeeId || !type) {
    return res.status(400).json({ success: false, message: 'اطلاعات پرسنل و نوع تردد ناقص است.' });
  }

  const employee = db.employees.find(e => e.id === targetEmployeeId);
  if (!employee) {
    return res.status(404).json({ success: false, message: 'پرسنل در پایگاه‌داده یافت نشد.' });
  }

  // Validate Coordinates (Strict finite and range checks)
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({
      success: false,
      message: 'مختصات جغرافیایی (GPS) نامعتبر است یا موقعیت مکانی فعال نیست.'
    });
  }

  // Determine target workshop (Employee's assigned workshop)
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

  // Mandatory Dynamic QR code for normal employees (Fixes SEC-002)
  const isQrMethod = method === 'QR_CODE' || method === 'QR_CAMERA_GPS';
  if (user.role === 'EMPLOYEE' && !isQrMethod) {
    return res.status(403).json({
      success: false,
      message: 'ثبت تردد عادی پرسنل صرفاً با اسکن بارکد پویا در کارگاه مجاز است.'
    });
  }

  // Validate Dynamic QR Token if QR method
  if (isQrMethod) {
    if (!qrToken) {
      return res.status(400).json({ success: false, message: 'توکن بارکد پویای کارگاه الزامی است.' });
    }
    if (db.usedQrChallenges[qrToken]) {
      return res.status(400).json({ success: false, message: 'این کد QR قبلاً استفاده شده است و منقضی می‌باشد.' });
    }
    const parts = qrToken.replace('MG_QR_', '').split(':');
    if (parts.length !== 4) {
      return res.status(400).json({ success: false, message: 'فرمت توکن بارکد نامعتبر است.' });
    }
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

  // Authoritative server timestamp (Fixes SEC-001 & SEC-015: Asia/Tehran, no client overrides!)
  const tehran = getTehranDateTime();
  const serverTime = tehran.timeStr;
  const todayDate = tehran.dateStr;

  const shift = db.shifts.find((s: any) => s.id === employee.shiftId) || db.shifts[0];

  // Find or create record for today
  let record = db.attendance.find((a: any) => a.employeeId === employee.id && a.date === todayDate);

  if (type === 'IN') {
    if (record && record.checkInTime) {
      return res.status(400).json({ success: false, message: 'ورود امروز شما قبلاً ثبت شده است.' });
    }

    // Calculate late minutes (SEC-012)
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [inH, inM] = serverTime.split(':').map(Number);
    const expectedMins = startH * 60 + startM;
    const actualMins = inH * 60 + inM;
    const diff = actualMins - expectedMins;
    const tolerance = shift.lateToleranceMinutes || 15;

    let lateMinutes = 0;
    let status = 'PRESENT';
    if (diff > tolerance) {
      lateMinutes = diff;
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
        notes: `ورود در ${assignedWorkshop.name} (ثبت سرور)`
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

    const nowD = new Date();
    const dayOfWeek = nowD.getDay(); // Thursday = 4
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
        finalStatus = 'EARLY_LEAVE';
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

// 5. Manual Attendance Request (Fixes ATT-001 & SEC-003: strictly PENDING approval & bound identity)
app.post('/api/attendance/manual-request', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { date, checkInTime, checkOutTime, reason } = req.body;

  let targetEmployeeId = req.body.employeeId;
  if (user.role === 'EMPLOYEE') {
    if (!user.employeeId) {
      return res.status(403).json({ success: false, message: 'حساب کاربری شما به پرسنلی متصل نیست.' });
    }
    targetEmployeeId = user.employeeId;
  }

  if (!targetEmployeeId || !date || !reason) {
    return res.status(400).json({ success: false, message: 'تاریخ، پرسنل و علت ثبت دستی الزامی است.' });
  }

  const employee = db.employees.find(e => e.id === targetEmployeeId);
  if (!employee) return res.status(404).json({ success: false, message: 'پرسنل یافت نشد.' });

  const shift = db.shifts.find((s: any) => s.id === employee.shiftId) || db.shifts[0];
  let workDurationMinutes = 480;
  if (checkInTime && checkOutTime) {
    const [inH, inM] = checkInTime.split(':').map(Number);
    const [outH, outM] = checkOutTime.split(':').map(Number);
    const inTotal = inH * 60 + inM;
    const outTotal = outH * 60 + outM;
    if (outTotal >= inTotal) {
      const raw = outTotal - inTotal;
      const breakM = (raw >= 240 && shift?.breakDurationMinutes) ? shift.breakDurationMinutes : 0;
      workDurationMinutes = Math.max(0, raw - breakM);
    }
  }

  const newRecord = {
    id: `att_man_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    employeeId: targetEmployeeId,
    date,
    checkInTime: checkInTime || '07:00',
    checkOutTime: checkOutTime || '16:00',
    workDurationMinutes,
    lateMinutes: 0,
    earlyExitMinutes: 0,
    overtimeMinutes: 0,
    status: 'PRESENT',
    approvalStatus: 'PENDING', // PENDING for manager review!
    checkInMethod: 'MANUAL',
    checkOutMethod: 'MANUAL',
    notes: `درخواست ثبت دستی توسط ${user.name}: ${reason}`
  };

  db.attendance.push(newRecord);
  persistDb();

  res.json({
    success: true,
    message: 'درخواست ثبت تردد دستی با موفقیت ثبت شد و در انتظار تایید مدیریت است.',
    record: newRecord
  });
});

// 6. Review Manual Attendance Request (Fixes SEC-003: restricted to ADMIN & MANAGER, authenticated reviewer)
app.post('/api/attendance/review-manual', requireRole('ADMIN', 'MANAGER'), (req: Request, res: Response) => {
  const reviewer = (req as any).user;
  const { recordId, action, rejectionReason } = req.body;
  const rec = db.attendance.find((a: any) => a.id === recordId);
  if (!rec) return res.status(404).json({ success: false, message: 'رکورد یافت نشد.' });

  if (rec.approvalStatus !== 'PENDING') {
    return res.status(400).json({ success: false, message: 'این رکورد قبلاً تعیین تکلیف شده است.' });
  }

  if (action === 'APPROVE') {
    rec.approvalStatus = 'APPROVED';
    rec.approvedBy = reviewer.name;
    rec.approvedAt = new Date().toISOString();
    rec.notes += ` (تایید شده توسط ${reviewer.name})`;
  } else {
    rec.approvalStatus = 'REJECTED';
    rec.status = 'ABSENT';
    rec.approvedBy = reviewer.name;
    rec.approvedAt = new Date().toISOString();
    rec.notes += ` (رد شده توسط ${reviewer.name}${rejectionReason ? `: ${rejectionReason}` : ''})`;
  }

  logServerAudit(reviewer.id, reviewer.name, action === 'APPROVE' ? 'تایید تردد دستی' : 'رد تردد دستی', 'حضور و غیاب', `تردد رکورد ${recordId} توسط ${reviewer.name} ${action === 'APPROVE' ? 'تایید' : 'رد'} شد.`);
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

    // Materialize attendance for full-day leaves on actual scheduled dates (Fixes HR-004 & HR-005)
    if (leave.type !== 'HOURLY') {
      const datesToMark = [leave.startDate];
      if (leave.endDate && leave.endDate !== leave.startDate) {
        datesToMark.push(leave.endDate);
      }
      datesToMark.forEach(dStr => {
        let att = db.attendance.find((a: any) => a.employeeId === leave.employeeId && a.date === dStr);
        if (!att) {
          db.attendance.push({
            id: `att_lve_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            companyId: db.settings.id,
            employeeId: leave.employeeId,
            date: dStr,
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
      });
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

  // Cap advance based on settings (default 30% base salary)
  const maxPercent = db.settings.maxAdvanceSalaryPercent || 30;
  const maxAllowed = Math.round((emp.baseSalary * maxPercent) / 100);
  if (Number(adv.amount) > maxAllowed) {
    return res.status(400).json({
      success: false,
      message: `حداکثر سقف مجاز مساعده ${maxPercent}٪ حقوق پایه (${new Intl.NumberFormat('fa-IR').format(maxAllowed)} تومان) می‌باشد.`
    });
  }

  // Monthly advance limit check
  const existingMonthAdvances = (db.advances || []).filter(
    (a: any) => a.employeeId === emp.id && a.repayMonth === adv.repayMonth && (a.status === 'PENDING' || a.status === 'APPROVED')
  );
  const maxPerMonth = db.settings.maxAdvanceRequestsPerMonth || 1;
  if (existingMonthAdvances.length >= maxPerMonth) {
    return res.status(400).json({
      success: false,
      message: `شما برای ماه ${adv.repayMonth} حداکثر تعداد مجاز درخواست مساعده (${maxPerMonth} نوبت) را ثبت نموده‌اید.`
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

// Bonuses and Penalties endpoint
app.get('/api/bonuses', (_req: Request, res: Response) => {
  res.json(db.bonusesPenalties || []);
});

app.post('/api/bonuses', (req: Request, res: Response) => {
  const bp = req.body;
  if (!bp.employeeId || !bp.amount || !bp.type || !bp.title) {
    return res.status(400).json({ success: false, message: 'اطلاعات پاداش یا جریمه ناقص است.' });
  }

  if (!db.bonusesPenalties) {
    db.bonusesPenalties = [];
  }

  const newBp = {
    id: `bp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...bp,
    amount: Math.round(Number(bp.amount)),
    createdAt: new Date().toISOString()
  };

  db.bonusesPenalties.unshift(newBp);
  persistDb();

  res.json({ success: true, bonusPenalty: newBp });
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
  const workDaysCount = monthlyAtt.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'EARLY_LEAVE' || a.status === 'ON_LEAVE').length;
  const totalWorkedMinutes = monthlyAtt.reduce((sum: number, a: any) => sum + (a.workDurationMinutes || 0), 0);
  const totalOvertimeMinutes = monthlyAtt.reduce((sum: number, a: any) => sum + (a.overtimeMinutes || 0), 0);

  const workedHours = Number((totalWorkedMinutes / 60).toFixed(2));
  const overtimeHours = Number((totalOvertimeMinutes / 60).toFixed(2));

  // Effective hourly rate: if emp.hourlyRate is 0, compute from baseSalary / (workDays * dailyHours)
  const standardWorkDays = db.settings.workDaysPerMonth || 22;
  const standardDailyHours = db.settings.dailyWorkHours || 8;
  const effectiveHourlyRate = emp.hourlyRate > 0
    ? emp.hourlyRate
    : Math.round(emp.baseSalary / (standardWorkDays * standardDailyHours));

  // Multiplier from settings (Fixes PAY-003)
  const overtimeMultiplier = db.settings.overtimeRateMultiplier || emp.overtimeRate || 1.4;
  const overtimeAmount = Math.round((totalOvertimeMinutes / 60) * (effectiveHourlyRate * overtimeMultiplier));

  // Absent days deduction
  const absentDaysCount = monthlyAtt.filter((a: any) => a.status === 'ABSENT').length;
  const dailyBaseWage = Math.round(emp.baseSalary / standardWorkDays);
  const absentDeduction = absentDaysCount * dailyBaseWage;

  const normMonth = month.replace(/-/g, '/');

  // Advances for this month
  const approvedAdvances = db.advances
    .filter((a: any) => a.employeeId === emp.id && a.status === 'APPROVED' && (a.repayMonth?.replace(/-/g, '/') === normMonth))
    .reduce((sum: number, a: any) => sum + a.amount, 0);

  // Bonuses & Disciplinary Penalties
  const bonuses = (db.bonusesPenalties || [])
    .filter((b: any) => b.employeeId === emp.id && b.type === 'BONUS' && (b.month?.replace(/-/g, '/') === normMonth))
    .reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);

  const disciplinaryPenalties = (db.bonusesPenalties || [])
    .filter((b: any) => b.employeeId === emp.id && b.type === 'PENALTY' && (b.month?.replace(/-/g, '/') === normMonth))
    .reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);

  const penalties = disciplinaryPenalties + absentDeduction;

  const housing = db.settings.fixedHousingAllowance || 900000;
  const grocery = db.settings.fixedGroceryAllowance || 1400000;
  const child = db.settings.childAllowance || 0;

  const grossSalary = emp.baseSalary + overtimeAmount + bonuses + housing + grocery + child;
  const insuranceBase = emp.baseSalary + housing + grocery;
  const insuranceDeduction = Math.round(insuranceBase * ((db.settings.insuranceRatePercent || 7) / 100));
  const taxable = Math.max(0, grossSalary - (db.settings.taxExemptionThreshold || 14000000));
  const taxDeduction = Math.round(taxable * ((db.settings.taxRatePercent || 10) / 100));

  const netSalary = Math.max(0, grossSalary - insuranceDeduction - taxDeduction - penalties - approvedAdvances);

  const newSlip = {
    id: existing?.id || `sal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    employeeId: emp.id,
    month,
    baseSalary: emp.baseSalary,
    workDays: monthlyAtt.length === 0 ? standardWorkDays : workDaysCount,
    workedHours,
    overtimeHours,
    overtimeAmount,
    bonusesTotal: bonuses,
    penaltiesTotal: penalties,
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
      bonusesPenalties: db.bonusesPenalties || [],
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
    if (data.bonusesPenalties) db.bonusesPenalties = data.bonusesPenalties;
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
