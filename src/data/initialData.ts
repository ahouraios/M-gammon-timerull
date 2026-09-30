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
  BonusOrPenalty,
  BroadcastMessage
} from '../types';
import { getTodayShamsi } from '../utils/dateUtils';

const today = getTodayShamsi();

export const initialCompanySettings: CompanySettings = {
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
  smsEnabled: false,
  smsProvider: 'KAVENEGAR',
  smsSenderNumber: '',
  smsApiKey: '',
  smsUsername: '',
  smsPassword: '',
  smsPatternCode: '',
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
};

export const initialShifts: Shift[] = [
  {
    id: 'shift_standard_day',
    companyId: 'comp_mgommon_01',
    name: 'شیفت استاندارد روزانه کارگاهی',
    type: 'MORNING',
    startTime: '07:00',
    endTime: '16:00',
    thursdayEndTime: '13:00',
    breakDurationMinutes: 60,
    workDays: [0, 1, 2, 3, 4, 5], // Sat to Thu
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
    breakDurationMinutes: 45,
    workDays: [0, 1, 2, 3, 4, 5],
    lateToleranceMinutes: 10,
    earlyExitToleranceMinutes: 10,
  }
];

// نیروهای فرضی حذف شدند؛ آماده استفاده تجاری واقعی و ثبت نیروهای واقعی توسط مدیر
export const initialEmployees: Employee[] = [];

// فقط مجید نورایی به عنوان مدیر ارشد در سامانه حساب کاربری دارد
export const initialUsers: User[] = [
  {
    id: 'usr_admin',
    companyId: 'comp_mgommon_01',
    username: 'admin',
    password: '123',
    name: 'مجید نورایی',
    email: 'm.nouraei@mgommon.ir',
    phone: '09151111111',
    role: 'ADMIN',
    isSuperAdmin: true,
    workshopId: 'ws_1'
  }
];

export const initialAttendanceRecords: AttendanceRecord[] = [];
export const initialLeaveRequests: LeaveRequest[] = [];
export const initialAdvanceRequests: AdvanceRequest[] = [];
export const initialBonusesPenalties: BonusOrPenalty[] = [];
export const initialSalaryRecords: SalaryRecord[] = [];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'log_launch',
    companyId: 'comp_mgommon_01',
    userId: 'usr_admin',
    userName: 'مجید نورایی',
    action: 'آماده‌سازی سامانه تجاری',
    resource: 'سیستم',
    details: 'سامانه مدیریت کارگاهی M.GAMMON برای بهره‌برداری تجاری آماده‌سازی شد.',
    timestamp: `${today} - ۰۸:۰۰`,
    ipAddress: '127.0.0.1'
  }
];

export const initialBroadcastMessages: BroadcastMessage[] = [];
