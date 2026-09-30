export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface PermissionLevel {
  level: number;
  title: string;
  description: string;
  category: 'ATTENDANCE' | 'REQUESTS' | 'FINANCE' | 'SUPERVISION' | 'SYSTEM';
}

export const PERMISSION_LEVELS: PermissionLevel[] = [
  { level: 1, title: 'ثبت تردد هوشمند (اسکن دوربین و GPS)', description: 'اجازه ثبت ورود و خروج با اسکن QR کد چاپ شده کارگاه و استعلام موقعیت مکانی', category: 'ATTENDANCE' },
  { level: 2, title: 'مشاهده کارکرد و سوابق تردد شخصی', description: 'مشاهده گزارش تردد روزانه، ساعات کارکرد خالص، تاخیرها و اضافه‌کاری ثبت شده', category: 'ATTENDANCE' },
  { level: 3, title: 'ثبت و پیگیری درخواست مرخصی', description: 'ارسال درخواست‌های مرخصی استحقاقی، استعلاجی، ساعتی و بدون حقوق', category: 'REQUESTS' },
  { level: 4, title: 'ثبت و پیگیری درخواست مساعده حقوق', description: 'درخواست مساعده مالی در بازه زمانی مجاز ماهانه', category: 'REQUESTS' },
  { level: 5, title: 'مشاهده و دانلود فیش حقوقی شخصی', description: 'دسترسی به فیش‌های رسمی حقوق با مهر دیجیتال و جزئیات کسورات و اضافه‌کار', category: 'FINANCE' },
  { level: 6, title: 'مشاهده اعلانات و پیام‌های سازمانی', description: 'دریافت بخشنامه‌ها، اطلاعیه‌ها و پیام‌های عمومی و کارگاهی', category: 'SYSTEM' },
  { level: 7, title: 'ثبت تردد اضطراری همکاران (سرپرستی)', description: 'امکان ثبت تردد دستی یا اضطراری برای اعضای تیم کارگاهی در صورت خرابی دستگاه', category: 'SUPERVISION' },
  { level: 8, title: 'مشاهده گزارشات تجمیعی کارکرد بخش', description: 'مشاهده گزارشات حضور و غیاب و اضافه‌کاری پرسنل زیرمجموعه', category: 'SUPERVISION' },
  { level: 9, title: 'تایید و بررسی اولیه مرخصی/مساعده', description: 'تایید یا رد مرحله اول درخواست‌های پرسنلی پیش از تایید نهایی مدیر', category: 'SUPERVISION' },
  { level: 10, title: 'مدیریت شیفت‌ها و پیام‌رسانی داخلی', description: 'دسترسی به تقویم شیفت‌های کاری کارگاه و ارسال پیام‌های اضطراری', category: 'SYSTEM' },
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
  permissions?: number[]; // سطوح دسترسی ۱ تا ۱۰
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
  permissions?: number[]; // سطوح دسترسی ۱ تا ۱۰
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

export interface BonusOrPenalty {
  id: string;
  companyId: string;
  employeeId: string;
  type: 'BONUS' | 'PENALTY';
  amount: number; // Tomans
  date: string;
  month: string; // e.g. 1405/07
  title: string;
  description?: string;
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
