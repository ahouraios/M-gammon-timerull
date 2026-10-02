export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface PermissionLevel {
  level: number;
  title: string;
  description: string;
  category: 'ATTENDANCE' | 'REQUESTS' | 'FINANCE' | 'SUPERVISION' | 'SYSTEM' | 'HR';
}

export interface ManagementRole {
  id: string;
  title: string;
  category: 'SUPERVISION' | 'FINANCE' | 'HR' | 'OPERATIONS';
  description: string;
}

export const MANAGEMENT_ROLES: ManagementRole[] = [
  {
    id: 'WORKSHOP_SUPERVISOR',
    title: 'سرپرست کارگاه (نظارت شیفت و تردد)',
    category: 'SUPERVISION',
    description: 'نظارت بر تردد پرسنل کارگاه، ثبت تردد اضطراری/دستی، بررسی حضور پرسنل'
  },
  {
    id: 'LEAVE_ADVANCE_OFFICER',
    title: 'مسئول بررسی اولیه مرخصی و مساعده',
    category: 'SUPERVISION',
    description: 'بررسی و تایید/رد مرحله اول درخواست‌های مرخصی و مساعده پرسنل کارگاه'
  },
  {
    id: 'FINANCE_OFFICER',
    title: 'امور مالی و حسابداری حقوق',
    category: 'FINANCE',
    description: 'دسترسی به بخش محاسبه کارکرد، صدور فیش‌ها، تسویه فاکتورها و پرداخت‌های متفرقه'
  },
  {
    id: 'HR_ADMIN',
    title: 'کارشناس منابع انسانی و امور اداری',
    category: 'HR',
    description: 'تعریف و ویرایش پرونده پرسنل، تخصیص شیفت‌ها، ثبت مأموریت‌ها و تقویم کاری'
  },
  {
    id: 'WORKSHOP_MESSENGER',
    title: 'اطلاع‌رسانی و پیام‌رسانی کارگاه',
    category: 'OPERATIONS',
    description: 'ارسال اطلاعیه‌ها، پیام‌های داخلی و بخشنامه‌های کارگاهی به پرسنل'
  },
  {
    id: 'REPORTS_ANALYST',
    title: 'تحلیل‌گر گزارشات و آمار کارگاه',
    category: 'OPERATIONS',
    description: 'مشاهده آمار تجمیعی ساعات کاری، اضافه‌کار و تاخیرها با خروجی اکسل'
  }
];

export const PERMISSION_LEVELS: PermissionLevel[] = [
  { level: 1, title: 'ثبت تردد هوشمند (اسکن دوربین و GPS)', description: 'ثبت ورود و خروج با اسکن بارکد QR کارگاه', category: 'ATTENDANCE' },
  { level: 2, title: 'مشاهده کارکرد و سوابق تردد شخصی', description: 'مشاهده گزارش کارکرد، تاخیرها و ساعات کارکرد خالص', category: 'ATTENDANCE' },
  { level: 3, title: 'ثبت و پیگیری درخواست مرخصی', description: 'ارسال درخواست‌های مرخصی استحقاقی، ساعتی، استعلاجی و بدون حقوق', category: 'REQUESTS' },
  { level: 4, title: 'ثبت و پیگیری درخواست مساعده حقوق', description: 'درخواست مساعده مالی در بازه زمانی مجاز ماهانه', category: 'REQUESTS' },
  { level: 5, title: 'مشاهده و دانلود فیش حقوقی شخصی', description: 'دسترسی به فیش‌های رسمی حقوق با مهر دیجیتال', category: 'FINANCE' },
  { level: 6, title: 'مشاهده اعلانات و پیام‌های سازمانی', description: 'دریافت بخشنامه‌ها و پیام‌های عمومی و کارگاهی', category: 'SYSTEM' },
  { level: 7, title: 'سرپرست کارگاه و نظارت تردد', description: 'ثبت تردد دستی اعضای کارگاه در مواقع اضطراری', category: 'SUPERVISION' },
  { level: 8, title: 'بررسی اولیه مرخصی و مساعده', description: 'تایید یا رد مرحله اول درخواست‌های پرسنل کارگاه', category: 'SUPERVISION' },
  { level: 9, title: 'امور مالی و حسابداری حقوق', description: 'محاسبه کارکرد، تسویه فاکتورها و پرداخت‌های متفرقه', category: 'FINANCE' },
  { level: 10, title: 'منابع انسانی و امور پرسنلی', description: 'مدیریت شیفت‌ها، پرونده پرسنل و تقویم کاری', category: 'HR' },
];

export interface User {
  id: string;
  companyId: string;
  employeeId?: string;
  username: string;
  password?: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  isSuperAdmin?: boolean; // مدیر اصلی
  permissions?: number[]; // سطوح دسترسی
  managementRoles?: string[]; // نقش‌های اختیارات مدیریتی
  workshopId?: string;
  avatarUrl?: string;
}

export interface Workshop {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
  allowedRadiusMeters: number; // default 20 meters
  address?: string;
}

export interface BroadcastMessage {
  id: string;
  companyId: string;
  senderName: string;
  recipientType: 'ALL' | 'WORKSHOP_1' | 'WORKSHOP_2' | 'SELECTED';
  recipientIds?: string[];
  recipientNames?: string[];
  title: string;
  content: string;
  channel: 'SMS' | 'IN_APP' | 'BOTH';
  sentAt: string;
  status: 'DELIVERED' | 'SENT' | 'FAILED';
  smsDeliveryStatus?: string;
  partsCount?: number;
  expenseId?: string; // ID هزینه ثبت شده جهت تصمیم‌گیری مستقیم مدیر
}

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
export type ContractType = 'PERMANENT' | 'PROBATIONARY' | 'TEMPORARY';

export interface Employee {
  id: string;
  companyId: string;
  personalCode: string;
  firstName: string;
  lastName: string;
  nationalCode: string;
  phone: string;
  email: string;
  department: string;
  position: string;
  workshopId?: string;
  username?: string;
  password?: string;
  hireDate: string; // Shamsi string e.g. 1405/01/15
  status: EmployeeStatus;
  contractType?: ContractType;
  shiftId: string;
  avatarUrl?: string;
  cardNumber?: string; // شماره کارت بانکی (۱۶ رقمی)
  bankAccount?: string;
  shebaNumber?: string;
  baseSalary: number; // in Tomans
  hourlyRate: number; // in Tomans
  overtimeRate: number; // multiplier e.g. 1.4
  remainingLeaveDays: number;
  isConfidential?: boolean; // مدیریت شخصی/اختصاصی توسط مدیر ارشد (مخفی کامل از مدیر منابع انسانی)
  permissions?: number[]; // سطوح دسترسی
  managementRoles?: string[]; // نقش‌های اختیارات مدیریتی
  customWorkHoursEnabled?: boolean; // ساعات کاری اختصاصی برای این پرسنل
  workStartTime?: string; // ساعت شروع به کار (مثال: 07:00)
  workEndTime?: string; // ساعت پایان کار (مثال: 16:00)
  thursdayEndTime?: string; // ساعت خروج پنجشنبه (مثال: 13:00)
}

export interface Shift {
  id: string;
  companyId: string;
  name: string;
  type: 'MORNING' | 'EVENING' | 'NIGHT' | 'FLEXIBLE';
  startTime: string; // "08:00"
  endTime: string; // "17:00"
  breakDurationMinutes: number; // 60
  workDays: number[]; // 0=Sat, 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri
  lateToleranceMinutes: number; // 15 mins
  earlyExitToleranceMinutes: number; // 10 mins
  thursdayEndTime?: string; // "13:00"
}

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'EARLY_LEAVE' | 'ABSENT' | 'ON_LEAVE' | 'HOLIDAY';

export interface AttendanceRecord {
  id: string;
  companyId: string;
  employeeId: string;
  date: string; // Shamsi date string e.g. 1405/07/02
  checkInTime?: string; // "08:05"
  checkOutTime?: string; // "17:15"
  workDurationMinutes: number; // total worked minutes
  lateMinutes: number;
  earlyExitMinutes: number;
  overtimeMinutes: number;
  status: AttendanceStatus;
  checkInMethod?: 'QR_CODE' | 'GPS' | 'MANUAL' | 'BIOMETRIC' | 'QR_CAMERA_GPS';
  checkOutMethod?: 'QR_CODE' | 'GPS' | 'MANUAL' | 'BIOMETRIC' | 'QR_CAMERA_GPS';
  approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  manualReason?: string;
  notes?: string;
  isMissionStart?: boolean; // آیا شروع کار از اول صبح به عنوان مأموریت بوده است؟
  isMission?: boolean; // نشانگر وضعیت مأموریت روزانه
  missionDestination?: string; // مقصد مأموریت اول وقت یا روزانه
  missionDescription?: string; // شرح مأموریت
  verifiedLocation?: {
    lat: number;
    lng: number;
    distanceMeters: number;
  };
}

export type LeaveType = 'EARNED' | 'HOURLY' | 'UNPAID' | 'MEDICAL';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  type: LeaveType;
  startDate: string; // Shamsi date
  endDate: string; // Shamsi date
  startTime?: string; // for hourly leave e.g. "10:00"
  endTime?: string; // for hourly leave e.g. "12:00"
  durationDays?: number;
  durationHours?: number;
  reason: string;
  status: RequestStatus;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface AdvanceRequest {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  amount: number; // in Tomans
  requestDate: string; // Shamsi date
  repayMonth: string; // e.g. 1405/07
  reason: string;
  status: RequestStatus;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export type ExpenseStatus = 'PENDING_SETTLEMENT' | 'SETTLED' | 'ADDED_TO_SALARY' | 'REJECTED';

export interface WorkerExpense {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  amount: number; // in Tomans
  title: string; // شرح یا عنوان خرید
  date: string; // Shamsi date e.g. 1405/07/02
  receiptUrl?: string; // تصویر اختیاری فاکتور یا رسید
  payer: 'کارت شخصی کارگر';
  status: ExpenseStatus; // 'PENDING_SETTLEMENT' | 'SETTLED' | 'ADDED_TO_SALARY' | 'REJECTED'
  createdAt: string;
  settledAt?: string;
  settledBy?: string;
  settlementNotes?: string;
  settlementType?: 'IMMEDIATE' | 'SALARY' | 'REJECTED';
  rejectionReason?: string;
}

// پرداخت‌های متفرقه مدیر به کارگر (علی‌الحساب، پرداخت متفرقه و سایر پرداخت‌ها)
export interface MiscPayment {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  amount: number; // in Tomans
  title: string; // شرح یا نوع پرداخت (مثال: پرداخت متفرقه، علی‌الحساب، سایر)
  date: string; // تاریخ شمسی
  month: string; // دوره حقوقی مرتبط، مثال: 1405/07
  deductFromSalary: boolean; // آیا از حقوق کسر شود؟ (بله / خیر)
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

// مأموریت کاری (ثبت دقیق مأموریت و تشخیص خودکار داخل/خارج از ساعات کاری)
export interface WorkMission {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  date: string; // تاریخ شمسی مأموریت
  startTime: string; // ساعت شروع، مثال: 10:00
  endTime: string; // ساعت پایان، مثال: 14:00
  destination: string; // مقصد / محل مأموریت
  description?: string; // توضیح اختیاری
  isWithinWorkingHours: boolean; // داخل ساعات کاری یا خارج از ساعات کاری
  createdAt: string;
  createdBy?: string;
}

export type ManagerAdjustmentType = 'BONUS' | 'PENALTY' | 'DISCRETIONARY_ADVANCE';

export interface BonusOrPenalty {
  id: string;
  companyId: string;
  employeeId: string;
  type: ManagerAdjustmentType;
  amount: number; // Tomans
  date: string;
  month: string; // e.g. 1405/07
  title: string;
  description?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface SalaryRecord {
  id: string;
  companyId: string;
  employeeId: string;
  month: string; // e.g. 1405/07
  baseSalary: number;
  workDays: number;
  workedHours: number;
  overtimeHours: number;
  overtimeAmount: number;
  bonusesTotal: number;
  penaltiesTotal: number;
  advancesTotal: number;
  discretionaryAdvancesTotal?: number; // مساعده خارج از چارچوب مدیریتی
  personalCardExpensesTotal?: number; // هزینه پرداخت‌شده از کارت شخصی کارگر (اضافه‌شده به حقوق)
  miscDeductionsTotal?: number; // کسورات پرداخت‌های متفرقه که گزینه کسر از حقوق فعال بوده
  insuranceDeduction: number;
  taxDeduction: number;
  housingAllowance: number;
  groceryAllowance: number;
  childAllowance: number;
  grossSalary: number;
  netSalary: number;
  status: 'DRAFT' | 'CALCULATED' | 'PAID';
  paymentDate?: string;
}

export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  details: string;
  timestamp: string; // Shamsi date & time
  ipAddress?: string;
}

export type SmsProvider = 'KAVENEGAR' | 'IPPANEL_FARAZ' | 'MELIPAYAMAK' | 'GHASEDAK' | 'SMS_IR' | 'CUSTOM';

export interface CompanySettings {
  id: string;
  companyName: string;
  companyCode: string;
  ownerName?: string;
  logoUrl?: string;
  dashboardBannerUrl?: string; // بنر هدر داشبورد (قابل آپلود فایل در هاست یا انتخاب پیش‌فرض)
  address: string;
  phoneNumber: string;
  officeLat: number;
  officeLng: number;
  allowedGpsRadiusMeters: number; // default 20 meters
  workshops: Workshop[];
  // سامانه و پنل ارسال پیامک واقعی
  smsEnabled?: boolean;
  smsProvider?: SmsProvider;
  smsApiKey?: string;
  smsSenderNumber?: string;
  smsUsername?: string;
  smsPassword?: string;
  smsPatternCode?: string;
  smsCustomEndpoint?: string;
  qrRefreshIntervalSeconds: number;
  // 1. تنظیمات شیفت
  defaultWorkStartTime: string;
  defaultWorkEndTime: string;
  lateToleranceMinutes: number;
  // 2. تنظیمات مرخصی
  annualLeaveDaysQuota: number;
  maxLeaveRequestsPerWeek: number;
  allowMultiplePendingLeaves: boolean;
  maxHourlyLeaveHoursPerMonth: number;
  // 3. تنظیمات مساعده
  maxAdvanceRequestsPerMonth: number;
  advanceWindowStartDay: number;
  advanceWindowEndDay: number;
  maxAdvanceSalaryPercent: number;
  // 4. تنظیمات حقوق و دستمزد
  workDaysPerMonth: number;
  dailyWorkHours: number;
  overtimeRateMultiplier: number;
  insuranceRatePercent: number;
  taxRatePercent: number;
  taxExemptionThreshold: number;
  fixedHousingAllowance: number;
  fixedGroceryAllowance: number;
  childAllowance: number;
  jobCategories?: string[]; // دسته‌بندی‌های شغلی کارگاه تخته‌نرد
}
