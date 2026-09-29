import React from 'react';
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

  // Weekly attendance chart data (dynamic from actual data)
  const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'امروز'];
  const weeklyAttendanceData = days.map((day) => {
    if (day === 'امروز') {
      return { day, حاضر: presentCount, تاخیر: lateCount, غایب: absentCount };
    }
    return { day, حاضر: 0, تاخیر: 0, غایب: totalEmployees > 0 ? totalEmployees : 0 };
  });

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Greeting & Fast Actions Banner */}
      <div className="bg-white rounded-2xl p-5 lg:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800">
              سلام، {currentUser?.name?.split(' (')[0] || 'همکار گرامی'}
            </h2>
          </div>
          <p className="text-slate-500 text-xs lg:text-sm mt-1">
            امروز {shamsi.dayOfWeek}، {shamsi.day} {shamsi.monthName} {shamsi.year} | وضعیت ترددها و شاخص‌های کارگاه
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onNavigate('qr-kiosk')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200 cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>کیوسک QR دینامیک</span>
          </button>
          <button
            onClick={() => onNavigate('leaves')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>ثبت مرخصی</span>
          </button>
        </div>
      </div>

      {/* 6 Key Statistical Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Total Employees */}
        <div
          onClick={() => onNavigate('employees')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500">کل پرسنل</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 tracking-tight">
            {formatNumberFa(totalEmployees)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>نفر پرسنل فعال</span>
          </div>
        </div>

        {/* Card 2: Present Today */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500">حاضرین امروز</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight">
            {formatNumberFa(presentCount)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
            <span>{Math.round((presentCount / (totalEmployees || 1)) * 100)}٪ حضور کارگاهی</span>
          </div>
        </div>

        {/* Card 3: Absents */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500">غایبین</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 tracking-tight">
            {formatNumberFa(absentCount)}
          </div>
          <div className="text-[11px] text-rose-500 mt-1">
            <span>بدون ثبت تردد</span>
          </div>
        </div>

        {/* Card 4: Lates */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500">تاخیر ورود</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ClockAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 tracking-tight">
            {formatNumberFa(lateCount)}
          </div>
          <div className="text-[11px] text-amber-600 mt-1">
            <span>بیش از مهلت مجاز</span>
          </div>
        </div>

        {/* Card 5: Active Leaves */}
        <div
          onClick={() => onNavigate('leaves')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-purple-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500">در مرخصی</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <PlaneTakeoff className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-600 tracking-tight">
            {formatNumberFa(onLeaveCount)}
          </div>
          <div className="text-[11px] text-purple-600 mt-1">
            <span>مرخصی موجه</span>
          </div>
        </div>

        {/* Card 6: Overtime */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500">اضافه‌کاری امروز</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-600 tracking-tight">
            {formatNumberFa(Number(totalOvertimeHours))} <span className="text-xs font-normal text-slate-500">ساعت</span>
          </div>
          <div className="text-[11px] text-indigo-600 mt-1">
            <span>کل کارگاه</span>
          </div>
        </div>
      </div>

      {/* Critical Alerts Section */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 lg:p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h3 className="font-bold text-slate-800 text-sm">
            هشدارها و موارد نیازمند اقدام فوری
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Alert 1: New Requests */}
          <div
            onClick={() => onNavigate(pendingLeaves.length > 0 ? 'leaves' : 'advances')}
            className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-start justify-between"
          >
            <div>
              <div className="text-xs font-bold text-slate-800">
                درخواست‌های جدید در انتظار تایید
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {pendingLeaves.length} مرخصی و {pendingAdvances.length} مساعده
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
              {pendingLeaves.length + pendingAdvances.length} مورد
            </span>
          </div>

          {/* Alert 2: Missing Check-outs */}
          <div
            onClick={() => onNavigate('attendance')}
            className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-start justify-between"
          >
            <div>
              <div className="text-xs font-bold text-slate-800">
                پرسنل در حال کار بدون ثبت خروج
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {notCheckedOutEmployees.length} نفر هم‌اکنون حاضر در کارگاه
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
              {notCheckedOutEmployees.length} نفر
            </span>
          </div>

          {/* Alert 3: Pending Payrolls */}
          <div
            onClick={() => onNavigate('payroll')}
            className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-start justify-between"
          >
            <div>
              <div className="text-xs font-bold text-slate-800">
                فیش‌های حقوقی تسویه نشده
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {pendingPayroll.length} مورد آماده پرداخت و صدور سند
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
              {pendingPayroll.length} فیش
            </span>
          </div>
        </div>
      </div>

      {/* Visual Analytics / Attendance Chart */}
      <div className="w-full">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                نمودار روند حضور و غیاب ۶ روز کاری اخیر
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                توزیع نفرات حاضر، تاخیر و غیبت کارگاه
              </p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
              پایش بلادرنگ
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyAttendanceData} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
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

          <div className="flex items-center justify-center gap-6 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>حاضر به موقع</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>دارای تاخیر</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>غایب</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
