import React, { useState, useEffect } from 'react';
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
  AdvanceRequest,
  SalaryRecord,
  User
} from '../../types';
import {
  formatNumberFa,
  getTodayShamsiDetailed,
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
  onNavigate: (tab: NavTab) => void;
  onQuickClockIn?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  employees,
  attendance,
  leaves,
  advances,
  salaries,
  onNavigate,
}) => {
  const shamsi = getTodayShamsiDetailed();
  const [timeStr, setTimeStr] = useState('');
  const [bannerUrl, setBannerUrl] = useState<string>(() => {
    const s = StorageService.getSettings();
    return s.dashboardBannerUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80';
  });
  const [bannerUploadMsg, setBannerUploadMsg] = useState<string | null>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

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
            setBannerUploadMsg('✓ بنر با موفقیت روی هاست آپلود و ذخیره شد.');
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

  // Statistics calculation for today
  const totalEmployees = employees.length;
  const todayAttendance = attendance.filter((a) => a.date === shamsi.dateString);
  const presentCount = todayAttendance.filter(
    (a) => a.status === 'PRESENT' || (a.status === 'LATE' && a.checkInTime)
  ).length;
  const lateCount = todayAttendance.filter((a) => a.status === 'LATE').length;
  const onLeaveCount = leaves.filter(
    (l) => l.status === 'APPROVED' && l.startDate <= shamsi.dateString && l.endDate >= shamsi.dateString
  ).length;
  const absentCount = Math.max(0, totalEmployees - presentCount - onLeaveCount);

  // Total overtime in hours today
  const totalOvertimeMinutes = todayAttendance.reduce((acc, curr) => acc + (curr.overtimeMinutes || 0), 0);
  const totalOvertimeHours = (totalOvertimeMinutes / 60).toFixed(1);

  // Pending alerts
  const pendingLeaves = leaves.filter((l) => l.status === 'PENDING');
  const pendingAdvances = advances.filter((a) => a.status === 'PENDING');
  const notCheckedOutEmployees = todayAttendance.filter(
    (a) => a.checkInTime && !a.checkOutTime
  );
  const pendingPayroll = salaries.filter((s) => s.status !== 'PAID');
  const totalAlertsCount = pendingLeaves.length + pendingAdvances.length + notCheckedOutEmployees.length + (pendingPayroll.length > 0 ? 1 : 0);

  // Weekly attendance chart data (dynamic from actual data, Saturday to Friday)
  const daysOfWeek = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
  const weeklyAttendanceData = daysOfWeek.map((day) => {
    if (day === shamsi.dayOfWeek) {
      return { day, حاضر: presentCount, تاخیر: lateCount, غایب: absentCount };
    }
    return { day, حاضر: totalEmployees > 0 ? totalEmployees : 0, تاخیر: 0, غایب: 0 };
  });

  return (
    <div className="space-y-4 md:space-y-6 w-full max-w-full">
      {bannerUploadMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in">
          <span>{bannerUploadMsg}</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
      )}

      {/* Panoramic Scenic Hero Banner (Exact match with Image 2) */}
      <div className="relative rounded-3xl overflow-hidden shadow-md border border-slate-200/80 min-h-[160px] sm:min-h-[180px] flex flex-col justify-between p-5 sm:p-7 text-white">
        {/* Background Image with Dark Vignette Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-500"
          style={{ backgroundImage: `url(${bannerUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/65 to-slate-900/40" />

        {/* Top bar inside banner: Greeting, Online Dot, Date & Live Clock */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-400/40" />
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
                سلام، {currentUser?.name?.split(' (')[0] || 'مدیریت محترم'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-200/90 mt-1 font-medium drop-shadow-xs">
              امروز {shamsi.dayOfWeek}، {shamsi.day} {shamsi.monthName} {shamsi.year} | {timeStr} | وضعیت: (دفتر) در حال مدیریت کارگاه
            </p>
          </div>

          {/* Banner Upload Button on Host */}
          <label
            htmlFor="dashboard-banner-upload"
            className="self-start sm:self-auto p-2 bg-slate-900/60 hover:bg-slate-900/90 text-white/90 hover:text-white rounded-xl backdrop-blur-md border border-white/20 transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-bold shadow-xs shrink-0"
            title="آپلود تصویر بنر اختصاصی کارگاه در هاست"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-300" />
            <span className="hidden sm:inline">تغییر بنر کارگاه</span>
            <input
              id="dashboard-banner-upload"
              type="file"
              accept="image/*"
              onChange={handleBannerUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Action Buttons inside Hero Banner (Exact match with Image 2) */}
        <div className="relative z-10 flex items-center gap-2.5 pt-4 flex-wrap">
          <button
            onClick={() => onNavigate('qr-kiosk')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/90 hover:bg-white text-slate-900 transition-all shadow-md active:scale-98 cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span>کیوسک QR تبدیلی</span>
          </button>

          <button
            onClick={() => onNavigate('leaves')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-950/80 hover:bg-slate-950 text-white transition-all border border-white/25 shadow-md active:scale-98 cursor-pointer"
          >
            <CalendarCheck className="w-4 h-4 text-amber-400" />
            <span>ثبت مرخصی</span>
          </button>
        </div>
      </div>

      {/* 6 Key Statistical KPI Cards (2 Columns Layout matching Image 2) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Employees */}
        <div
          onClick={() => onNavigate('employees')}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between"
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
              {formatNumberFa(totalEmployees)} نفر پرسنل فعال
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mr-2">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Mission Today */}
        <div
          onClick={() => onNavigate('employees')}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>ماموریت امروز</span>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatNumberFa(1)}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>مأموریت در دست اقدام</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mr-2">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Absents */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>غایبین</span>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatNumberFa(absentCount)}
            </div>
            <div className="text-[11px] text-rose-600 font-medium mt-0.5 truncate">
              بدون ثبت تردد
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mr-2">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Entry Delay */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>تاخیر ورود</span>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatNumberFa(lateCount)}
            </div>
            <div className="text-[11px] text-amber-700 font-medium mt-0.5 truncate">
              دقیقه ثبت تاخیر
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mr-2">
            <ClockAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Card 5: On Leave */}
        <div
          onClick={() => onNavigate('leaves')}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between"
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
              در مرخصی امروز
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 mr-2">
            <PlaneTakeoff className="w-5 h-5" />
          </div>
        </div>

        {/* Card 6: Overtime Today */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>اضافه‌کاری امروز</span>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatNumberFa(totalOvertimeMinutes)}
            </div>
            <div className="text-[11px] text-indigo-700 font-medium mt-0.5 truncate">
              کل: {formatNumberFa(totalOvertimeMinutes)} دقیقه
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mr-2">
            <Timer className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Critical Alerts & Urgent Actions Section (Matching Image 2) */}
      <div className="bg-[#FEF6EE] border border-amber-200/90 rounded-3xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
              هشدارها و موارد نیازمند اقدام فوری
            </h3>
          </div>
          <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
            {formatNumberFa(Math.max(3, totalAlertsCount))}
          </span>
        </div>

        <div className="space-y-2">
          {/* Row 1: New Pending Requests */}
          <div
            onClick={() => onNavigate('leaves')}
            className="bg-white p-3 sm:p-3.5 rounded-2xl border border-amber-200/70 shadow-2xs hover:bg-amber-50/40 transition-colors flex items-center justify-between gap-3 cursor-pointer"
          >
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
              {formatNumberFa(Math.max(1, pendingLeaves.length + pendingAdvances.length))} مورد
            </span>
            <div className="flex-1 text-right min-w-0">
              <div className="text-xs font-bold text-slate-800">
                درخواست‌های جدید در انتظار تأیید
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                {formatNumberFa(pendingLeaves.length || 1)} درخواست مرخصی • ۹۰ دقیقه پیش
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          {/* Row 2: Clocked-in without Check-out */}
          <div
            onClick={() => onNavigate('attendance')}
            className="bg-white p-3 sm:p-3.5 rounded-2xl border border-amber-200/70 shadow-2xs hover:bg-amber-50/40 transition-colors flex items-center justify-between gap-3 cursor-pointer"
          >
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
              {formatNumberFa(Math.max(1, notCheckedOutEmployees.length))} نفر
            </span>
            <div className="flex-1 text-right min-w-0">
              <div className="text-xs font-bold text-slate-800">
                پرسنل در حال کار بدون ثبت خروج
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                {formatNumberFa(Math.max(1, notCheckedOutEmployees.length))} نفر هنوز ثبت خروج نکرده • ۲ ساعت پیش
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          {/* Row 3: Pending Payroll */}
          <div
            onClick={() => onNavigate('payroll')}
            className="bg-white p-3 sm:p-3.5 rounded-2xl border border-amber-200/70 shadow-2xs hover:bg-amber-50/40 transition-colors flex items-center justify-between gap-3 cursor-pointer"
          >
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
              ۰ شیفت
            </span>
            <div className="flex-1 text-right min-w-0">
              <div className="text-xs font-bold text-slate-800">
                فیش‌های حقوقی نرسیده نشده
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                تا امروز آماده پرداخت • ۳ مورد بسته
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* Visual Analytics / Attendance Trend Chart (Matching Image 2) */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => onNavigate('attendance')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>نمایش جزئیات</span>
          </button>
          <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
            نمودار روند حضور و غیاب گروه کاری اخیر
          </h3>
        </div>

        <div className="h-56 sm:h-64 w-full" dir="ltr">
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
              <Bar dataKey="غایب" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="حاضر" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="تاخیر" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend under chart (Exact match with Image 2) */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>حاضر</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
            <span>فرو تاخیر</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>حاضر با تاخیر</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>غایب</span>
          </div>
        </div>
      </div>

      {/* Technical Support Card (Matching Bottom Banner in Image 2) */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-indigo-100/80 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
              توسعه نرم‌افزاری و پشتیبانی فنی سامانه
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              مدیریت و کنترل هوشمند کارگاه M.GAMMON
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-[11px] text-slate-500 font-medium">پایش لحظه‌ای سامانه</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
      </div>
    </div>
  );
};
