import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  ClockAlert,
  PlaneTakeoff,
  Timer,
  AlertTriangle,
  QrCode,
  CalendarCheck,
  Camera,
  ChevronLeft,
  FileText,
  Clock,
  Briefcase,
  Headphones,
  CheckCircle2,
  Sparkles,
  Receipt,
  PlusCircle,
  CreditCard,
  FileSpreadsheet,
  Settings as SettingsIcon,
  DollarSign,
  X,
  Wallet,
  UserPlus,
  Check,
  XCircle,
  AlertCircle,
  ExternalLink,
  Shield,
  Activity,
  FileCheck,
  History,
  MessageSquare,
  ArrowUpRight,
  Database,
  Building2,
  Calendar,
  Coins,
  Gift,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Employee,
  AttendanceRecord,
  LeaveRequest,
  LeaveType,
  AdvanceRequest,
  SalaryRecord,
  User,
  WorkerExpense,
  AuditLog,
  ManagerAdjustmentType,
} from '../../types';
import {
  formatNumberFa,
  getTodayShamsiDetailed,
  formatCurrencyTomans,
  PERSIAN_WEEKDAYS,
  gregorianToJalali,
  toEnglishDigits,
  getTodayShamsi,
} from '../../utils/dateUtils';
import { NavTab } from '../common/Sidebar';
import { StorageService } from '../../services/storage';

interface DashboardViewProps {
  currentUser?: User;
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  advances: AdvanceRequest[];
  salaries: SalaryRecord[];
  auditLogs?: AuditLog[];
  onNavigate: (tab: NavTab) => void;
  onQuickClockIn?: () => void;
  onRefresh?: () => void;
}

type AlertFilterTab = 'ALL' | 'FINANCIAL' | 'LEAVES' | 'ATTENDANCE';

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  employees,
  attendance,
  leaves,
  advances,
  salaries,
  auditLogs = [],
  onNavigate,
  onRefresh,
}) => {
  const shamsi = getTodayShamsiDetailed();
  const settings = StorageService.getSettings();
  const [timeStr, setTimeStr] = useState('');
  const [activeAlertTab, setActiveAlertTab] = useState<AlertFilterTab>('ALL');
  const [actionFeedback, setActionFeedback] = useState<{ text: string; success: boolean } | null>(null);

  // Quick Action Registration Modal State
  const [isQuickRequestModalOpen, setIsQuickRequestModalOpen] = useState(false);
  const [quickModalTab, setQuickModalTab] = useState<'LEAVE' | 'ADVANCE' | 'EXPENSE' | 'MANUAL_ATT' | 'ADJUSTMENT'>('LEAVE');
  
  // Quick forms states
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [quickLeaveType, setQuickLeaveType] = useState<LeaveType>('EARNED');
  const [quickLeaveDays, setQuickLeaveDays] = useState<number>(1);
  const [quickLeaveReason, setQuickLeaveReason] = useState('');
  
  const [quickAdvanceAmount, setQuickAdvanceAmount] = useState<number | ''>('');
  const [quickAdvanceReason, setQuickAdvanceReason] = useState('');
  
  const [quickExpenseAmount, setQuickExpenseAmount] = useState<number | ''>('');
  const [quickExpenseTitle, setQuickExpenseTitle] = useState('');
  
  const [quickAttIn, setQuickAttIn] = useState('07:00');
  const [quickAttOut, setQuickAttOut] = useState('16:00');
  const [quickAttReason, setQuickAttReason] = useState('');

  const [quickAdjType, setQuickAdjType] = useState<ManagerAdjustmentType>('BONUS');
  const [quickAdjAmount, setQuickAdjAmount] = useState<number | ''>('');
  const [quickAdjTitle, setQuickAdjTitle] = useState('');
  const [quickAdjDesc, setQuickAdjDesc] = useState('');

  // Hero Banner State
  const [bannerUrl, setBannerUrl] = useState<string>(() => {
    return settings.dashboardBannerUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80';
  });
  const [bannerUploadMsg, setBannerUploadMsg] = useState<string | null>(null);

  // Real-time clock ticker
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update selected emp default if list changes
  useEffect(() => {
    if (!selectedEmpId && employees.length > 0) {
      setSelectedEmpId(employees[0].id);
    }
  }, [employees, selectedEmpId]);

  // Host Banner Upload Handler
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert('حجم تصویر بنر نباید بیشتر از ۸ مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        setBannerUploadMsg('در حال آپلود و ذخیره فایل بنر در هاست...');
        try {
          const res = await StorageService.uploadBannerAsync(result);
          if (res.success && res.url) {
            setBannerUrl(res.url);
            setBannerUploadMsg('✓ بنر کارگاه با موفقیت در هاست ذخیره و فعال شد.');
          } else {
            setBannerUrl(result);
            setBannerUploadMsg('بنر سربرگ داشبورد ذخیره شد.');
          }
        } catch {
          setBannerUrl(result);
          setBannerUploadMsg('بنر ذخیره شد.');
        }
        setTimeout(() => setBannerUploadMsg(null), 3500);
      };
      reader.readAsDataURL(file);
    }
  };

  // -------------------------------------------------------------
  // DATA QUERIES & SYSTEM INDICATORS
  // -------------------------------------------------------------
  const totalEmployees = employees.length;
  const todayAttendance = attendance.filter((a) => a.date === shamsi.dateString);
  const presentCount = todayAttendance.filter(
    (a) => a.status === 'PRESENT' || (a.status === 'LATE' && a.checkInTime) || a.status === 'EARLY_LEAVE'
  ).length;
  const lateCount = todayAttendance.filter((a) => a.status === 'LATE' || (a.lateMinutes && a.lateMinutes > 0)).length;
  const totalLateMinutes = todayAttendance.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
  
  const onLeaveCount = leaves.filter(
    (l) => l.status === 'APPROVED' && l.startDate <= shamsi.dateString && l.endDate >= shamsi.dateString
  ).length;
  const absentCount = Math.max(0, totalEmployees - presentCount - onLeaveCount);

  // Overtime minutes
  const totalOvertimeMinutes = todayAttendance.reduce((acc, curr) => acc + (curr.overtimeMinutes || 0), 0);

  // 1. Pending Financial: Worker Expenses paid from personal cards
  const allExpenses: WorkerExpense[] = StorageService.getAllExpensesRaw();
  const pendingExpenses = allExpenses.filter((e) => e.status === 'PENDING_SETTLEMENT');
  const totalPendingExpenseAmount = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 2. Pending Financial: Advances
  const pendingAdvances = advances.filter((a) => a.status === 'PENDING');
  const totalPendingAdvanceAmount = pendingAdvances.reduce((sum, a) => sum + a.amount, 0);

  // Total Open Financial Obligations
  const totalPendingFinancialAmount = totalPendingExpenseAmount + totalPendingAdvanceAmount;

  // 3. Pending Leaves
  const pendingLeaves = leaves.filter((l) => l.status === 'PENDING');

  // 4. Pending Manual Attendance Punch Requests
  const pendingManualAttendance = attendance.filter((a) => a.approvalStatus === 'PENDING');

  // 5. Open Shifts (Clocked-in without checkout past standard shift hours)
  const notCheckedOutEmployees = todayAttendance.filter(
    (a) => a.checkInTime && !a.checkOutTime
  );

  // Total Urgent Action Items Count
  const totalUrgentCount =
    pendingExpenses.length +
    pendingAdvances.length +
    pendingLeaves.length +
    pendingManualAttendance.length;

  const totalAlertsWithNotCheckedOut = totalUrgentCount + notCheckedOutEmployees.length;

  // -------------------------------------------------------------
  // INLINE APPROVAL / REJECTION HANDLERS
  // -------------------------------------------------------------
  const showFeedback = (text: string, success: boolean = true) => {
    setActionFeedback({ text, success });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleSettleExpenseNow = (expenseId: string) => {
    StorageService.settleWorkerExpense(
      expenseId,
      currentUser?.name || 'مدیریت کارگاه',
      'تسویه و واریز نقدی از طریق پنل فوری داشبورد'
    );
    showFeedback('✓ فاکتور خرید کارگر با موفقیت تسویه شد و به وضعیت پرداخت نهایی انتقال یافت.');
    onRefresh?.();
  };

  const handleAddExpenseToSalary = (expenseId: string) => {
    StorageService.reviewWorkerExpense(
      expenseId,
      'ADD_TO_SALARY',
      currentUser?.name || 'مدیریت کارگاه',
      'افزودن به حقوق ماه جاری از طریق داشبورد'
    );
    showFeedback('✓ مبلغ فاکتور با موفقیت به سرفصل مطالبات فیش حقوقی ماه جاری پرسنل افزوده شد.');
    onRefresh?.();
  };

  const handleRejectExpense = (expenseId: string) => {
    StorageService.reviewWorkerExpense(
      expenseId,
      'REJECT',
      currentUser?.name || 'مدیریت کارگاه',
      'عدم تایید توسط مدیریت کارگاه'
    );
    showFeedback('درخواست تسویه فاکتور رد شد.', false);
    onRefresh?.();
  };

  const handleApproveAdvance = (advanceId: string) => {
    StorageService.reviewAdvanceRequest(
      advanceId,
      true,
      currentUser?.name || 'مدیریت کارگاه'
    );
    showFeedback('✓ درخواست مساعده تایید شد و سند مالی ثبت گردید.');
    onRefresh?.();
  };

  const handleRejectAdvance = (advanceId: string) => {
    StorageService.reviewAdvanceRequest(
      advanceId,
      false,
      currentUser?.name || 'مدیریت کارگاه',
      'عدم موافقت مدیریت با پرداخت مساعده در این دوره'
    );
    showFeedback('درخواست مساعده رد شد.', false);
    onRefresh?.();
  };

  const handleApproveLeave = (leaveId: string) => {
    StorageService.reviewLeaveRequest(
      leaveId,
      true,
      currentUser?.name || 'مدیریت کارگاه'
    );
    showFeedback('✓ درخواست مرخصی پرسنل تایید شد.');
    onRefresh?.();
  };

  const handleRejectLeave = (leaveId: string) => {
    StorageService.reviewLeaveRequest(
      leaveId,
      false,
      currentUser?.name || 'مدیریت کارگاه',
      'عدم امکان موافقت به دلیل حجم تعهدات تولید کارگاه'
    );
    showFeedback('درخواست مرخصی رد شد.', false);
    onRefresh?.();
  };

  const handleApproveManualAttendance = (recordId: string) => {
    StorageService.reviewManualAttendance(
      recordId,
      true,
      currentUser?.name || 'مدیریت کارگاه'
    );
    showFeedback('✓ درخواست تردد دستی تایید و در کارت تردد ثبت شد.');
    onRefresh?.();
  };

  const handleRejectManualAttendance = (recordId: string) => {
    StorageService.reviewManualAttendance(
      recordId,
      false,
      currentUser?.name || 'مدیریت کارگاه'
    );
    showFeedback('درخواست تردد دستی رد شد.', false);
    onRefresh?.();
  };

  // -------------------------------------------------------------
  // QUICK REGISTRATION MODAL SUBMISSIONS
  // -------------------------------------------------------------
  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      alert('لطفاً پرسنل مورد نظر را انتخاب فرمایید.');
      return;
    }

    const emp = employees.find((x) => x.id === selectedEmpId);
    if (!emp) return;

    if (quickModalTab === 'LEAVE') {
      if (!quickLeaveReason.trim()) {
        alert('لطفاً علت مرخصی را وارد فرمایید.');
        return;
      }
      StorageService.submitLeaveRequest({
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        type: quickLeaveType,
        startDate: getTodayShamsi(),
        endDate: getTodayShamsi(),
        durationDays: quickLeaveDays || 1,
        reason: quickLeaveReason.trim(),
      });
      showFeedback(`درخواست مرخصی برای ${emp.firstName} ${emp.lastName} ثبت شد.`);
    } else if (quickModalTab === 'ADVANCE') {
      if (!quickAdvanceAmount || Number(quickAdvanceAmount) <= 0) {
        alert('لطفاً مبلغ معتبر مساعده را وارد فرمایید.');
        return;
      }
      StorageService.submitAdvanceRequest({
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        amount: Number(quickAdvanceAmount),
        requestDate: getTodayShamsi(),
        reason: quickAdvanceReason.trim() || 'درخواست مساعده پرسنلی',
        repayMonth: shamsi.year + '/' + (shamsi.monthName ? '07' : '07'),
      });
      showFeedback(`مساعده به مبلغ ${formatCurrencyTomans(Number(quickAdvanceAmount))} برای ${emp.firstName} ثبت شد.`);
    } else if (quickModalTab === 'EXPENSE') {
      if (!quickExpenseAmount || Number(quickExpenseAmount) <= 0 || !quickExpenseTitle.trim()) {
        alert('لطفاً مبلغ و عنوان خرید را وارد فرمایید.');
        return;
      }
      StorageService.submitWorkerExpense({
        employeeId: emp.id,
        amount: Number(quickExpenseAmount),
        title: quickExpenseTitle.trim(),
        date: getTodayShamsi(),
      });
      showFeedback(`فاکتور خرید ${quickExpenseTitle} ثبت گردید.`);
    } else if (quickModalTab === 'MANUAL_ATT') {
      StorageService.submitManualAttendanceRequest({
        employeeId: emp.id,
        date: getTodayShamsi(),
        checkInTime: quickAttIn,
        checkOutTime: quickAttOut,
        reason: quickAttReason.trim() || 'ثبت دستی تردد توسط مدیریت در داشبورد',
      });
      showFeedback(`تردد دستی برای ${emp.firstName} ${emp.lastName} با موفقیت ثبت شد.`);
    } else if (quickModalTab === 'ADJUSTMENT') {
      if (!quickAdjAmount || Number(quickAdjAmount) <= 0 || !quickAdjTitle.trim()) {
        alert('لطفاً مبلغ معتبر و عنوان تعدیل را وارد فرمایید.');
        return;
      }
      const currentMonth = getTodayShamsiDetailed().dateString.substring(0, 7);
      StorageService.addBonusOrPenalty({
        id: `bp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        companyId: settings.id,
        employeeId: emp.id,
        type: quickAdjType,
        amount: Number(quickAdjAmount),
        title: quickAdjTitle.trim(),
        description: quickAdjDesc.trim(),
        date: getTodayShamsi(),
        month: currentMonth,
        createdBy: currentUser?.name || currentUser?.username,
        createdAt: new Date().toISOString(),
      });
      StorageService.calculateSalaryForEmployee(emp.id, currentMonth);
      const typeLabel =
        quickAdjType === 'BONUS'
          ? 'پاداش تشویقی'
          : quickAdjType === 'DISCRETIONARY_ADVANCE'
          ? 'مساعده خارج از چارچوب'
          : 'جریمه انضباطی';
      showFeedback(`✓ ${typeLabel} به مبلغ ${formatCurrencyTomans(Number(quickAdjAmount))} برای ${emp.firstName} ${emp.lastName} ثبت و در فیش حقوقی دوره محاسبه گردید.`);
    }

    setIsQuickRequestModalOpen(false);
    onRefresh?.();
  };

  // -------------------------------------------------------------
  // WEEKLY ATTENDANCE TREND (Strict dynamic data Saturday to Friday)
  // -------------------------------------------------------------
  const todayWeekdayIdx = PERSIAN_WEEKDAYS.indexOf(shamsi.dayOfWeek);
  const effectiveTodayIdx = todayWeekdayIdx >= 0 ? todayWeekdayIdx : 0;

  const weeklyAttendanceData = useMemo(() => {
    return PERSIAN_WEEKDAYS.map((day, idx) => {
      const dayOffset = idx - effectiveTodayIdx;
      const d = new Date();
      d.setDate(d.getDate() + dayOffset);
      const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      const dayDateSlash = `${jy}/${jm < 10 ? '0' : ''}${jm}/${jd < 10 ? '0' : ''}${jd}`;
      const dayDateDash = `${jy}-${jm < 10 ? '0' : ''}${jm}-${jd < 10 ? '0' : ''}${jd}`;

      const dayAtt = attendance.filter((a) => a.date === dayDateSlash || a.date === dayDateDash);
      const present = dayAtt.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'EARLY_LEAVE'
      ).length;
      const late = dayAtt.filter(
        (a) => a.status === 'LATE' || (a.lateMinutes && a.lateMinutes > 0)
      ).length;
      const absent = dayAtt.filter((a) => a.status === 'ABSENT').length;

      return {
        day,
        حاضر: present,
        تاخیر: late,
        غایب: absent,
      };
    });
  }, [attendance, effectiveTodayIdx]);

  return (
    <div className="space-y-6 w-full max-w-full" dir="rtl">
      
      {/* Action Notification Toast */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in duration-200 ${
            actionFeedback.success
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Banner Upload Notification */}
      {bannerUploadMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in">
          <span>{bannerUploadMsg}</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. COMMAND HUB SCENIC HERO BANNER                         */}
      {/* ========================================================= */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200/90 min-h-[170px] sm:min-h-[190px] flex flex-col justify-between p-5 sm:p-7 text-white">
        {/* Background Image with Dark Vignette Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-500 scale-100"
          style={{ backgroundImage: `url(${bannerUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/75 to-slate-900/40" />

        {/* Top bar inside banner: Greeting, Online Dot, Date & Live Clock */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-400/40" />
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
                سلام، {currentUser?.name?.split(' (')[0] || 'جناب آقای نورایی'}
              </h2>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/15 text-indigo-100 border border-white/20 font-medium">
                مدیریت ارشد کارگاه
              </span>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-200/90 mt-1 font-medium drop-shadow-xs flex items-center gap-2 flex-wrap">
              <span>امروز {shamsi.dayOfWeek}، {shamsi.day} {shamsi.monthName} {shamsi.year}</span>
              <span className="text-slate-400">|</span>
              <span className="font-mono text-emerald-300 font-bold tracking-wider">{timeStr}</span>
              <span className="text-slate-400">|</span>
              <span className="text-indigo-200">وضعیت کارگاه: شیفت فعال روزانه</span>
            </p>
          </div>

          {/* Banner Upload Button on Host */}
          <label
            htmlFor="dashboard-banner-upload"
            className="self-start sm:self-auto px-3 py-1.5 bg-slate-900/70 hover:bg-slate-900/90 text-white/90 hover:text-white rounded-xl backdrop-blur-md border border-white/20 transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shadow-xs shrink-0"
            title="آپلود تصویر بنر اختصاصی کارگاه در هاست"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-300" />
            <span>تغییر بنر کارگاه</span>
            <input
              id="dashboard-banner-upload"
              type="file"
              accept="image/*"
              onChange={handleBannerUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Hero Footer: Workshop Metadata Strip */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 pt-4 border-t border-white/10">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-200">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{settings.companyName || 'کارگاه صنایع چوب و تخته‌نرد ام.گامان'}</span>
            </span>
            <span className="hidden sm:inline text-slate-400">•</span>
            <span className="text-slate-300 text-[11px]">
              مشهد، بزرگراه آزادی، بلوار توس، توس ۱۴۲، حسین‌زاده ۸
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30">
              {formatNumberFa(presentCount)} حاضر در سالن
            </span>
            {totalUrgentCount > 0 && (
              <span className="text-rose-300 font-bold bg-rose-500/20 px-2 py-0.5 rounded-lg border border-rose-500/30">
                {formatNumberFa(totalUrgentCount)} اقدام فوری
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. PROMINENT SYSTEM-LEVEL STATUS & TELEMETRY INDICATORS   */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Status 1: Pending Approvals */}
        <div className={`p-4 rounded-2xl border transition-all ${
          totalUrgentCount > 0
            ? 'bg-rose-50/80 border-rose-200 text-rose-950'
            : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">درخواست‌های معوق مدیر</span>
            <Shield className={`w-4 h-4 ${totalUrgentCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
          </div>
          <div className="text-2xl font-black tracking-tight mt-1.5">
            {formatNumberFa(totalUrgentCount)}
            <span className="text-xs font-normal text-slate-500 mr-1.5">مورد در انتظار</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate font-medium">
            {totalUrgentCount > 0 ? 'نیاز به تایید فوری مدیریت' : '✓ تمام موارد تعیین تکلیف شدند'}
          </div>
        </div>

        {/* Status 2: Open Financial Obligations */}
        <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl text-amber-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">مطالبات مالی در انتظار</span>
            <Receipt className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black tracking-tight mt-1.5 truncate">
            {formatCurrencyTomans(totalPendingFinancialAmount)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate font-medium">
            {formatNumberFa(pendingExpenses.length)} فاکتور + {formatNumberFa(pendingAdvances.length)} مساعده باز
          </div>
        </div>

        {/* Status 3: Live Workshop Presence */}
        <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-2xl text-blue-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">حضور و غیاب امروز</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black tracking-tight mt-1.5">
            {formatNumberFa(presentCount)}
            <span className="text-xs font-normal text-slate-500 mr-1.5">از {formatNumberFa(totalEmployees)} نفر حاضر</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate font-medium">
            {formatNumberFa(absentCount)} غایب • {formatNumberFa(lateCount)} تاخیر
          </div>
        </div>

        {/* Status 4: Messaging & Gateway Status */}
        <div className="bg-indigo-50/80 border border-indigo-200 p-4 rounded-2xl text-indigo-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">سامانه پیامک و خط</span>
            <MessageSquare className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-base sm:text-lg font-black tracking-tight mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{settings.smsProvider ? 'کاوه‌نگار (فعال)' : 'متصل و پایدار'}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate font-medium">
            ارسال خودکار اعلان تردد و فیش
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. HIGH-PRIORITY 'ALERTS & REQUESTS' PANEL                */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/60 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-slate-900">
                  مرکز هشدارها، مطالبات و درخواست‌های پرسنلی
                </h3>
                {totalUrgentCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تایید، تسویه فوری فاکتورها، مساعده، مرخصی و ترددهای دستی پرسنل
              </p>
            </div>
          </div>

          {/* Segmented Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveAlertTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeAlertTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              همه ({formatNumberFa(totalAlertsWithNotCheckedOut)})
            </button>
            <button
              type="button"
              onClick={() => setActiveAlertTab('FINANCIAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeAlertTab === 'FINANCIAL'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مالی و فاکتورها ({formatNumberFa(pendingExpenses.length + pendingAdvances.length)})
            </button>
            <button
              type="button"
              onClick={() => setActiveAlertTab('LEAVES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeAlertTab === 'LEAVES'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مرخصی‌ها ({formatNumberFa(pendingLeaves.length)})
            </button>
            <button
              type="button"
              onClick={() => setActiveAlertTab('ATTENDANCE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeAlertTab === 'ATTENDANCE'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              تردد و ساعات باز ({formatNumberFa(pendingManualAttendance.length + notCheckedOutEmployees.length)})
            </button>
          </div>
        </div>

        {/* Requests & Alerts List */}
        <div className="space-y-3">
          
          {/* SECTION A: Personal Card Expenses (High Priority Financial) */}
          {(activeAlertTab === 'ALL' || activeAlertTab === 'FINANCIAL') && pendingExpenses.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-rose-950 px-1 pt-1">
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-rose-600" />
                  <span>فاکتورها و خریدهای پرداخت‌شده با کارت شخصی کارگران ({formatNumberFa(pendingExpenses.length)} مورد)</span>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('advances')}
                  className="text-indigo-600 hover:text-indigo-800 text-[11px] font-medium flex items-center gap-0.5 cursor-pointer"
                >
                  <span>مدیریت کامل فاکتورها</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {pendingExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 hover:bg-rose-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-right"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{exp.employeeName}</span>
                        <span className="text-[11px] text-slate-500 font-mono">({exp.date})</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-200">
                          پرداخت از کارت شخصی
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">
                        شرح خرید: <strong className="text-slate-900">{exp.title}</strong>
                      </p>
                      <div className="text-sm font-black text-rose-700 font-mono">
                        مبلغ پرداختی کارگر: {formatCurrencyTomans(exp.amount)}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons for Expense */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleSettleExpenseNow(exp.id)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      title="تسویه نقدی فوری و انتقال وجه به کارگر"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>تسویه نقدی فوری</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddExpenseToSalary(exp.id)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      title="افزودن به حقوق ماه جاری کارگر"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>افزودن به حقوق ماه</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectExpense(exp.id)}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 active:scale-95 text-xs font-bold transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>رد</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SECTION B: Advance Salary Requests */}
          {(activeAlertTab === 'ALL' || activeAlertTab === 'FINANCIAL') && pendingAdvances.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-amber-950 px-1 pt-1">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-amber-600" />
                  <span>درخواست‌های مساعده مالی در انتظار تایید ({formatNumberFa(pendingAdvances.length)} مورد)</span>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('advances')}
                  className="text-indigo-600 hover:text-indigo-800 text-[11px] font-medium flex items-center gap-0.5 cursor-pointer"
                >
                  <span>مدیریت کامل مساعده‌ها</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {pendingAdvances.map((adv) => {
                const emp = employees.find((e) => e.id === adv.employeeId);
                return (
                  <div
                    key={adv.id}
                    className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 hover:bg-amber-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-right"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">
                            {emp ? `${emp.firstName} ${emp.lastName}` : adv.employeeId}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">({adv.requestDate})</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                            مساعده بین‌ماه
                          </span>
                        </div>
                        <p className="text-xs text-slate-700">
                          علت درخواست: <span className="font-semibold text-slate-900">{adv.reason || 'مساعده پرسنلی'}</span>
                          {adv.repayMonth && <span className="text-slate-500 mr-2">• کسر در حقوق: {adv.repayMonth}</span>}
                        </p>
                        <div className="text-sm font-black text-amber-800 font-mono">
                          مبلغ درخواستی: {formatCurrencyTomans(adv.amount)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApproveAdvance(adv.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>تایید و پرداخت مساعده</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectAdvance(adv.id)}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 active:scale-95 text-xs font-bold transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>رد</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SECTION C: Leave Requests */}
          {(activeAlertTab === 'ALL' || activeAlertTab === 'LEAVES') && pendingLeaves.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-teal-950 px-1 pt-1">
                <span className="flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-teal-600" />
                  <span>درخواست‌های مرخصی در انتظار تایید ({formatNumberFa(pendingLeaves.length)} مورد)</span>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('leaves')}
                  className="text-indigo-600 hover:text-indigo-800 text-[11px] font-medium flex items-center gap-0.5 cursor-pointer"
                >
                  <span>مدیریت مرخصی‌ها</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {pendingLeaves.map((l) => {
                const emp = employees.find((e) => e.id === l.employeeId);
                const leaveTypeLabel =
                  l.type === 'EARNED' ? 'استحقاقی' :
                  l.type === 'MEDICAL' ? 'استعلاجی' :
                  l.type === 'HOURLY' ? 'ساعتی' : 'بدون حقوق';

                return (
                  <div
                    key={l.id}
                    className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 hover:bg-teal-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-right"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                        <CalendarCheck className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">
                            {emp ? `${emp.firstName} ${emp.lastName}` : l.employeeName || l.employeeId}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold border border-teal-200">
                            {leaveTypeLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700">
                          بازه زمانی: <strong className="text-slate-900 font-mono">{l.startDate}</strong> الی <strong className="text-slate-900 font-mono">{l.endDate}</strong>
                          {l.durationHours ? ` (${formatNumberFa(l.durationHours)} ساعت)` : ` (${formatNumberFa(l.durationDays || 1)} روز)`}
                        </p>
                        <p className="text-xs text-slate-500">
                          علت مرخصی: <span className="text-slate-800 font-medium">{l.reason || 'امور شخصی'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApproveLeave(l.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>موافقت با مرخصی</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectLeave(l.id)}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-teal-100 text-teal-800 border border-teal-200 active:scale-95 text-xs font-bold transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>عدم موافقت</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SECTION D: Manual Attendance Punch Requests */}
          {(activeAlertTab === 'ALL' || activeAlertTab === 'ATTENDANCE') && pendingManualAttendance.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-950 px-1 pt-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>درخواست‌های ثبت تردد دستی پرسنل ({formatNumberFa(pendingManualAttendance.length)} مورد)</span>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('attendance')}
                  className="text-indigo-600 hover:text-indigo-800 text-[11px] font-medium flex items-center gap-0.5 cursor-pointer"
                >
                  <span>مدیریت حضور و غیاب</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {pendingManualAttendance.map((rec) => {
                const emp = employees.find((e) => e.id === rec.employeeId);
                return (
                  <div
                    key={rec.id}
                    className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 hover:bg-indigo-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-right"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">
                            {emp ? `${emp.firstName} ${emp.lastName}` : rec.employeeId}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">({rec.date})</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                            تردد دستی
                          </span>
                        </div>
                        <p className="text-xs text-slate-700">
                          ساعات درخواستی: ورود <strong className="font-mono text-emerald-700">{rec.checkInTime || '-'}</strong> | خروج <strong className="font-mono text-rose-700">{rec.checkOutTime || '-'}</strong>
                          <span className="text-slate-500 mr-2 font-mono">({formatNumberFa(rec.workDurationMinutes)} دقیقه کارکرد)</span>
                        </p>
                        {rec.notes && <p className="text-xs text-slate-500">{rec.notes}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApproveManualAttendance(rec.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>تایید تردد</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectManualAttendance(rec.id)}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 active:scale-95 text-xs font-bold transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>رد</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SECTION E: Unclosed Shifts (Clocked in without checkout) */}
          {(activeAlertTab === 'ALL' || activeAlertTab === 'ATTENDANCE') && notCheckedOutEmployees.length > 0 && (
            <div
              onClick={() => onNavigate('attendance')}
              className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 hover:bg-amber-100/60 transition-all flex items-center justify-between gap-3 text-right cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  <ClockAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                    پرسنل حاضر در کارگاه بدون ثبت خروج ({formatNumberFa(notCheckedOutEmployees.length)} نفر)
                  </h4>
                  <p className="text-[11px] text-amber-800/90 mt-0.5">
                    پرسنل وارد کارگاه شده‌اند و هنوز شیفت کاری آنها بسته نشده است.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-amber-800 shrink-0 bg-white/80 px-3 py-1.5 rounded-xl border border-amber-200">
                <span>مشاهده در حضور و غیاب</span>
                <ChevronLeft className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Clean Reassuring Empty State */}
          {totalAlertsWithNotCheckedOut === 0 && (
            <div className="p-8 text-center bg-slate-50 border border-slate-200/70 rounded-2xl space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-800">
                تمام درخواست‌ها و مطالبات پرسنلی تعیین تکلیف شده‌اند
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                هیچ فاکتور خرید معوق، درخواست مساعده باز، مرخصی تعیین تکلیف‌نشده یا تردد بلاتکلیفی وجود ندارد.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. 'QUICK ACTIONS' GRID                                  */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-slate-900">
                میز کار و دسترسی سریع عملیاتی (Quick Actions)
              </h3>
              <p className="text-[11px] text-slate-500">
                عملیات پرتکرار مدیریتی با یک کلیک
              </p>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            ۸ میانبر کاربردی فعال
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Quick Action 1: Submit Personnel Request */}
          <button
            type="button"
            onClick={() => setIsQuickRequestModalOpen(true)}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white flex flex-col items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer group text-center"
          >
            <PlusCircle className="w-5 h-5 text-indigo-200 group-hover:scale-110 transition-transform" />
            <div className="min-w-0">
              <span className="text-xs font-black block truncate">ثبت درخواست‌ها</span>
              <span className="text-[9px] text-indigo-200 font-medium block truncate">مرخصی / مساعده</span>
            </div>
          </button>

          {/* Quick Action 2: Smart QR Kiosk */}
          <button
            type="button"
            onClick={() => onNavigate('qr-kiosk')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/90 text-slate-800 border border-slate-200/90 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer group text-center"
          >
            <QrCode className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">کیوسک هوشمند QR</span>
              <span className="text-[9px] text-slate-500 font-medium block truncate">حضور و غیاب کارگاه</span>
            </div>
          </button>

          {/* Quick Action 3: Manual Attendance */}
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/90 text-slate-800 border border-slate-200/90 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer group text-center"
          >
            <Clock className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">ثبت تردد دستی</span>
              <span className="text-[9px] text-slate-500 font-medium block truncate">اصلاح ورود و خروج</span>
            </div>
          </button>

          {/* Quick Action 4: Settle Personal Card Expense */}
          <button
            type="button"
            onClick={() => onNavigate('advances')}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer relative group text-center ${
              pendingExpenses.length > 0
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-950 border-rose-300 ring-2 ring-rose-400/20'
                : 'bg-slate-50 hover:bg-slate-100/90 text-slate-800 border-slate-200/90'
            }`}
          >
            {pendingExpenses.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs animate-bounce">
                {pendingExpenses.length}
              </span>
            )}
            <Receipt className={`w-5 h-5 group-hover:scale-110 transition-transform ${
              pendingExpenses.length > 0 ? 'text-rose-600' : 'text-blue-600'
            }`} />
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">تسویه فاکتورها</span>
              <span className={`text-[9px] font-medium block truncate ${
                pendingExpenses.length > 0 ? 'text-rose-700 font-bold' : 'text-slate-500'
              }`}>
                {pendingExpenses.length > 0 ? `${formatNumberFa(pendingExpenses.length)} فاکتور باز` : 'خرید شخصی کارگر'}
              </span>
            </div>
          </button>

          {/* Quick Action 5: Payroll & Advances */}
          <button
            type="button"
            onClick={() => onNavigate('payroll')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/90 text-slate-800 border border-slate-200/90 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer group text-center"
          >
            <DollarSign className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">محاسبه و فیش حقوق</span>
              <span className="text-[9px] text-slate-500 font-medium block truncate">دستمزد و بیمه</span>
            </div>
          </button>

          {/* Quick Action 5.5: Discretionary Adjustments */}
          <button
            type="button"
            onClick={() => {
              setQuickModalTab('ADJUSTMENT');
              setIsQuickRequestModalOpen(true);
            }}
            className="p-3.5 rounded-2xl bg-indigo-50/70 hover:bg-indigo-100/90 text-indigo-950 border border-indigo-200/90 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer group text-center"
          >
            <Coins className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">پاداش / جریمه / مساعده</span>
              <span className="text-[9px] text-indigo-700 font-medium block truncate">تعدیلات خارج چارچوب</span>
            </div>
          </button>

          {/* Quick Action 6: Excel Reports */}
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/90 text-slate-800 border border-slate-200/90 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer group text-center"
          >
            <FileSpreadsheet className="w-5 h-5 text-teal-600 group-hover:scale-110 transition-transform" />
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">گزارشات و اکسل</span>
              <span className="text-[9px] text-slate-500 font-medium block truncate">خروجی آماری استاندارد</span>
            </div>
          </button>

          {/* Quick Action 7: Employees Management */}
          <button
            type="button"
            onClick={() => onNavigate('employees')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/90 text-slate-800 border border-slate-200/90 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer group text-center"
          >
            <Users className="w-5 h-5 text-sky-600 group-hover:scale-110 transition-transform" />
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">مدیریت پرسنل</span>
              <span className="text-[9px] text-slate-500 font-medium block truncate">پرونده، شیفت و رمز</span>
            </div>
          </button>

          {/* Quick Action 8: Settings */}
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/90 text-slate-800 border border-slate-200/90 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer group text-center"
          >
            <SettingsIcon className="w-5 h-5 text-slate-600 group-hover:scale-110 transition-transform" />
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">تنظیمات کارگاه</span>
              <span className="text-[9px] text-slate-500 font-medium block truncate">مختصات GPS و پیامک</span>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. 6 STATISTICAL KPI CARDS (2 Columns Mobile / 6 Columns) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Active Personnel */}
        <div
          onClick={() => onNavigate('employees')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>کل پرسنل</span>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatNumberFa(totalEmployees)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
              {formatNumberFa(totalEmployees)} پرونده فعال کارگاه
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mr-2">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Mission Today */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>مأموریت روز</span>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatNumberFa(1)}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5 truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>خارج از کارگاه</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mr-2">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Absents */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>غایبین امروز</span>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatNumberFa(absentCount)}
            </div>
            <div className="text-[11px] text-rose-600 font-medium mt-0.5 truncate">
              {absentCount > 0 ? 'بدون ثبت تردد' : 'تمامی پرسنل حاضر'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mr-2">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Entry Delay */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>تاخیر ورود</span>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatNumberFa(totalLateMinutes)}
            </div>
            <div className="text-[11px] text-amber-700 font-medium mt-0.5 truncate">
              {formatNumberFa(lateCount)} نفر دارای تاخیر
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mr-2">
            <ClockAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Card 5: On Leave */}
        <div
          onClick={() => onNavigate('leaves')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>در مرخصی</span>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatNumberFa(onLeaveCount)}
            </div>
            <div className="text-[11px] text-teal-700 font-medium mt-0.5 truncate">
              مرخصی مصوب روز
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 mr-2">
            <PlaneTakeoff className="w-5 h-5" />
          </div>
        </div>

        {/* Card 6: Overtime Today */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>اضافه‌کاری</span>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatNumberFa(totalOvertimeMinutes)}
            </div>
            <div className="text-[11px] text-indigo-700 font-medium mt-0.5 truncate">
              مجموع دقایق مازاد امروز
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mr-2">
            <Timer className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. WEEKLY ATTENDANCE TREND CHART & RECENT ACTIVITY FEED  */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Trend Chart (2 columns on Desktop) */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  نمودار روند حضور و غیاب هفته جاری (شنبه تا جمعه)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  پایش دقیق تعداد حاضرین، تاخیرها و غیبت‌های ثبت‌شده
                </p>
              </div>

              <button
                onClick={() => onNavigate('attendance')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100/70 px-3 py-1.5 rounded-xl transition-colors"
              >
                <span>مشاهده دفتر حضور و غیاب</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="h-60 sm:h-68 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyAttendanceData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '11px',
                      direction: 'rtl',
                      border: 'none',
                    }}
                  />
                  <Bar dataKey="حاضر" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="تاخیر" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="غایب" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center gap-6 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100 flex-wrap">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>حاضر در کارگاه</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>ورود با تاخیر</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>غایب</span>
            </div>
          </div>
        </div>

        {/* Live System Activity Feed / Audit Log (1 column on Desktop) */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  آخرین رویدادهای کارگاه
                </h3>
              </div>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                زنده
              </span>
            </div>

            <div className="space-y-3 mt-3">
              {auditLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-right space-y-1 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{log.action}</span>
                    <span className="text-[10px] font-mono text-slate-400">{log.timestamp?.split(' ')[1] || log.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed truncate">
                    {log.details}
                  </p>
                  <div className="text-[10px] text-slate-400">
                    توسط: <span className="font-medium text-slate-600">{log.userName}</span>
                  </div>
                </div>
              ))}

              {auditLogs.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">
                  هنوز رویدادی ثبت نشده است.
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>مشاهده لاگ‌های امنیتی در تنظیمات</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 7. QUICK ACTION REGISTRATION MODAL                        */}
      {/* ========================================================= */}
      {isQuickRequestModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsQuickRequestModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 text-right cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setIsQuickRequestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <span>ثبت درخواست یا عملیات جدید</span>
                <PlusCircle className="w-5 h-5 text-indigo-600" />
              </h3>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setQuickModalTab('LEAVE')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer truncate ${
                  quickModalTab === 'LEAVE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                مرخصی
              </button>
              <button
                type="button"
                onClick={() => setQuickModalTab('ADVANCE')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer truncate ${
                  quickModalTab === 'ADVANCE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                مساعده
              </button>
              <button
                type="button"
                onClick={() => setQuickModalTab('EXPENSE')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer truncate ${
                  quickModalTab === 'EXPENSE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                خرید کارگاه
              </button>
              <button
                type="button"
                onClick={() => setQuickModalTab('MANUAL_ATT')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer truncate ${
                  quickModalTab === 'MANUAL_ATT' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تردد دستی
              </button>
              <button
                type="button"
                onClick={() => setQuickModalTab('ADJUSTMENT')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer truncate col-span-2 sm:col-span-1 ${
                  quickModalTab === 'ADJUSTMENT' ? 'bg-indigo-600 text-white shadow-xs' : 'text-indigo-800 bg-indigo-50/60 hover:bg-indigo-100'
                }`}
              >
                پاداش / جریمه / مساعده
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleQuickSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  پرسنل مورد نظر:
                </label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none bg-white font-medium"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.personalCode} - {emp.position})
                    </option>
                  ))}
                </select>
              </div>

              {/* TAB 1: LEAVE */}
              {quickModalTab === 'LEAVE' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">نوع مرخصی:</label>
                      <select
                        value={quickLeaveType}
                        onChange={(e) => setQuickLeaveType(e.target.value as LeaveType)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none bg-white font-medium"
                      >
                        <option value="EARNED">استحقاقی</option>
                        <option value="MEDICAL">استعلاجی</option>
                        <option value="HOURLY">ساعتی</option>
                        <option value="UNPAID">بدون حقوق</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">مدت مرخصی (روز):</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={quickLeaveDays}
                        onChange={(e) => setQuickLeaveDays(Number(e.target.value))}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none font-mono text-center"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">علت و توضیحات مرخصی:</label>
                    <input
                      type="text"
                      required
                      value={quickLeaveReason}
                      onChange={(e) => setQuickLeaveReason(e.target.value)}
                      placeholder="مثال: امور شخصی یا استراحت پزشکی"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                    />
                  </div>
                </>
              )}

              {/* TAB 2: ADVANCE */}
              {quickModalTab === 'ADVANCE' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ مساعده (تومان):</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={quickAdvanceAmount}
                      onChange={(e) => {
                        const raw = toEnglishDigits(e.target.value).replace(/\D/g, '');
                        setQuickAdvanceAmount(raw ? Number(raw) : '');
                      }}
                      placeholder="مثال: ۲,۰۰۰,۰۰۰"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">علت درخواست مساعده:</label>
                    <input
                      type="text"
                      value={quickAdvanceReason}
                      onChange={(e) => setQuickAdvanceReason(e.target.value)}
                      placeholder="علت درخواست مساعده پرسنلی"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                    />
                  </div>
                </>
              )}

              {/* TAB 3: EXPENSE */}
              {quickModalTab === 'EXPENSE' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ خرید (تومان):</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={quickExpenseAmount}
                      onChange={(e) => {
                        const raw = toEnglishDigits(e.target.value).replace(/\D/g, '');
                        setQuickExpenseAmount(raw ? Number(raw) : '');
                      }}
                      placeholder="مثال: ۱,۸۵۰,۰۰۰"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">شرح و فاکتور خرید:</label>
                    <input
                      type="text"
                      required
                      value={quickExpenseTitle}
                      onChange={(e) => setQuickExpenseTitle(e.target.value)}
                      placeholder="مثال: خرید چسب و سنباده خط تولید"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                    />
                  </div>
                </>
              )}

              {/* TAB 4: MANUAL ATTENDANCE */}
              {quickModalTab === 'MANUAL_ATT' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ساعت ورود:</label>
                      <input
                        type="time"
                        value={quickAttIn}
                        onChange={(e) => setQuickAttIn(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ساعت خروج:</label>
                      <input
                        type="time"
                        value={quickAttOut}
                        onChange={(e) => setQuickAttOut(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none font-mono text-center"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">علت ثبت دستی:</label>
                    <input
                      type="text"
                      value={quickAttReason}
                      onChange={(e) => setQuickAttReason(e.target.value)}
                      placeholder="ثبت دستی تردد توسط مدیریت"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                    />
                  </div>
                </>
              )}

              {/* TAB 5: ADJUSTMENT (BONUS, PENALTY, EXTRA ADVANCE) */}
              {quickModalTab === 'ADJUSTMENT' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع تعدیل مدیریتی:</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setQuickAdjType('BONUS')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          quickAdjType === 'BONUS'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <TrendingUp className={`w-3.5 h-3.5 ${quickAdjType === 'BONUS' ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="text-[11px] font-bold">پاداش (+)</span>
                        <span className="text-[9px] text-emerald-700 font-normal">افزایش به حقوق</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setQuickAdjType('DISCRETIONARY_ADVANCE')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          quickAdjType === 'DISCRETIONARY_ADVANCE'
                            ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-500/20 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Coins className={`w-3.5 h-3.5 ${quickAdjType === 'DISCRETIONARY_ADVANCE' ? 'text-purple-600' : 'text-slate-400'}`} />
                        <span className="text-[11px] font-bold">مساعده ویژه (-)</span>
                        <span className="text-[9px] text-purple-700 font-normal">خارج از چارچوب</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setQuickAdjType('PENALTY')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          quickAdjType === 'PENALTY'
                            ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <TrendingDown className={`w-3.5 h-3.5 ${quickAdjType === 'PENALTY' ? 'text-rose-600' : 'text-slate-400'}`} />
                        <span className="text-[11px] font-bold">جریمه (-)</span>
                        <span className="text-[9px] text-rose-700 font-normal">کسر از حقوق</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ (تومان):</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={quickAdjAmount}
                      onChange={(e) => {
                        const raw = toEnglishDigits(e.target.value).replace(/\D/g, '');
                        setQuickAdjAmount(raw ? Number(raw) : '');
                      }}
                      placeholder="مثال: ۱,۵۰۰,۰۰۰"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none font-mono text-left font-bold"
                      dir="ltr"
                    />
                    {quickAdjAmount ? (
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        معادل: {formatCurrencyTomans(Number(quickAdjAmount))}
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">عنوان / موضوع:</label>
                    <input
                      type="text"
                      required
                      value={quickAdjTitle}
                      onChange={(e) => setQuickAdjTitle(e.target.value)}
                      placeholder={
                        quickAdjType === 'BONUS'
                          ? 'مثال: تسریع در تکمیل سفارش یا حسن کارکرد'
                          : quickAdjType === 'DISCRETIONARY_ADVANCE'
                          ? 'مثال: مساعده فوری خارج از سقف'
                          : 'مثال: جریمه خسارت یا تاخیر غیرموجه'
                      }
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و مستندات (اختیاری):</label>
                    <input
                      type="text"
                      value={quickAdjDesc}
                      onChange={(e) => setQuickAdjDesc(e.target.value)}
                      placeholder="شرح علت برای ثبت دقیق در فیش دوره جاری"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  ثبت قطعی در پرونده
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
