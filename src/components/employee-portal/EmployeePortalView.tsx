import React, { useState } from 'react';
import {
  Clock,
  LogIn,
  LogOut,
  PlaneTakeoff,
  Wallet,
  CreditCard,
  CheckCircle,
  QrCode,
  Camera,
  Bell,
  ShieldCheck,
  Zap,
  Lock,
  ShieldAlert
} from 'lucide-react';
import {
  Employee,
  AttendanceRecord,
  LeaveRequest,
  AdvanceRequest,
  SalaryRecord,
  User,
} from '../../types';
import { CopyButton } from '../common/CopyButton';
import { StorageService } from '../../services/storage';
import {
  formatCurrencyTomans,
  formatNumberFa,
  getTodayShamsiDetailed,
  getCurrentTimeStr,
  getTodayShamsi,
} from '../../utils/dateUtils';
import { NavTab } from '../common/Sidebar';
import { CameraQrScannerModal } from '../attendance/CameraQrScannerModal';
import { DeveloperBadge } from '../common/DeveloperBadge';

interface EmployeePortalViewProps {
  currentUser: User;
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  advances: AdvanceRequest[];
  salaries: SalaryRecord[];
  onRefresh: () => void;
  onNavigate: (tab: NavTab) => void;
}

export const EmployeePortalView: React.FC<EmployeePortalViewProps> = ({
  currentUser,
  employees,
  attendance,
  leaves,
  advances,
  salaries,
  onRefresh,
  onNavigate,
}) => {
  const shamsi = getTodayShamsiDetailed();
  const currentEmployee =
    employees.find((e) => e.id === currentUser.employeeId) ||
    employees.find((e) => e.email === currentUser.email) ||
    employees[2];

  const todayRecord = attendance.find(
    (a) => a.employeeId === currentEmployee?.id && a.date === shamsi.dateString
  );

  const [clockActionMsg, setClockActionMsg] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualType, setManualType] = useState<'IN' | 'OUT'>('IN');
  const [manualTime, setManualTime] = useState(getCurrentTimeStr());
  const [manualReason, setManualReason] = useState('');

  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    currentEmployee?.avatarUrl || null
  );

  // Check granular permissions for this employee
  const canClock = StorageService.hasPermission(currentEmployee, 1);
  const canViewAttendance = StorageService.hasPermission(currentEmployee, 2);
  const canRequestLeave = StorageService.hasPermission(currentEmployee, 3);
  const canRequestAdvance = StorageService.hasPermission(currentEmployee, 4);
  const canViewSalary = StorageService.hasPermission(currentEmployee, 5);
  const canViewMessages = StorageService.hasPermission(currentEmployee, 6);

  const shifts = StorageService.getShifts();

  // Compress avatar image before saving to prevent localStorage quota exhaustion (Fixes PROFILE-001)
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('حجم فایل انتخاب شده نباید بیش از ۳ مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 200;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          setAvatarPreview(compressed);
          if (currentEmployee) {
            const updated = { ...currentEmployee, avatarUrl: compressed };
            StorageService.updateEmployee(updated);
            onRefresh();
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit manual punch as PENDING request requiring manager review (Fixes ATT-001)
  const handleOpenManualRequest = (type: 'IN' | 'OUT') => {
    setManualType(type);
    setManualTime(getCurrentTimeStr());
    setManualReason('');
    setIsManualModalOpen(true);
  };

  const handleManualRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee) return;
    if (!manualReason.trim()) {
      setClockActionMsg({ success: false, text: 'لطفاً علت ثبت دستی را وارد نمایید.' });
      return;
    }

    const res = StorageService.submitManualAttendanceRequest({
      employeeId: currentEmployee.id,
      date: getTodayShamsi(),
      checkInTime: manualType === 'IN' ? manualTime : (todayRecord?.checkInTime || '07:00'),
      checkOutTime: manualType === 'OUT' ? manualTime : undefined,
      reason: manualReason.trim()
    });

    setClockActionMsg({ success: res.success, text: res.message });
    setIsManualModalOpen(false);
    setManualReason('');
    onRefresh();
  };

  // My requests, salary records and relevant messages
  const myLeaves = leaves.filter((l) => l.employeeId === currentEmployee?.id);
  const myAdvances = advances.filter((a) => a.employeeId === currentEmployee?.id);
  const mySalaries = salaries.filter((s) => s.employeeId === currentEmployee?.id);
  const myAttendanceHistory = attendance.filter((a) => a.employeeId === currentEmployee?.id);

  // Workshop messages
  const allMessages = StorageService.getMessages();
  const myMessages = allMessages.filter(
    (m) =>
      m.recipientType === 'ALL' ||
      (m.recipientType === 'WORKSHOP_1' && (!currentEmployee?.workshopId || currentEmployee?.workshopId === 'ws_1')) ||
      (m.recipientType === 'WORKSHOP_2' && currentEmployee?.workshopId === 'ws_2') ||
      (m.recipientIds && currentEmployee && m.recipientIds.includes(currentEmployee.id))
  );

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Employee Clean Profile Banner */}
      <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative group shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md overflow-hidden">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={currentEmployee?.firstName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{currentEmployee?.firstName?.charAt(0) || '؟'}</span>
              )}
            </div>
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -left-1 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-indigo-600 transition-colors"
              title="تغییر عکس پرسنلی"
            >
              <Camera className="w-3.5 h-3.5" />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg lg:text-xl font-bold text-slate-800">
                {currentEmployee?.firstName} {currentEmployee?.lastName}
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                کد پرسنلی: {currentEmployee?.personalCode}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {currentEmployee?.workshopId === 'ws_2' ? 'کارگاه شماره ۲ (مشهد، توس ۱۴۲)' : 'کارگاه شماره ۱ (مشهد، توس ۱۴۲)'}
              </span>
              {currentEmployee?.isConfidential && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-700" /> مدیریت مستقیم مدیر ارشد
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              سمت: <strong>{currentEmployee?.position}</strong> | واحد: <strong>{currentEmployee?.department}</strong> | مانده مرخصی استحقاقی:{' '}
              <span className="font-bold text-emerald-600">{currentEmployee?.remainingLeaveDays} روز</span>
            </p>

            {/* Registered Banking Details */}
            {(currentEmployee?.cardNumber || currentEmployee?.shebaNumber) && (
              <div className="flex items-center gap-3 flex-wrap mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                {currentEmployee.cardNumber && (
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    <span className="text-slate-400">کارت بانکی:</span>
                    <span className="font-mono font-bold text-slate-800">{currentEmployee.cardNumber}</span>
                    <CopyButton text={currentEmployee.cardNumber} label="کپی" />
                  </div>
                )}
                {currentEmployee.shebaNumber && (
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    <span className="text-slate-400">شبا:</span>
                    <span className="font-mono text-slate-700 text-[11px]">{currentEmployee.shebaNumber}</span>
                    <CopyButton text={currentEmployee.shebaNumber} label="کپی" />
                  </div>
                )}
              </div>
            )}

            {/* Special permissions badge only if other than standard */}
            {(() => {
              const perms = currentEmployee?.permissions;
              if (!perms || perms.length === 0) return null;
              const isStandard = perms.length === 6 && [1, 2, 3, 4, 5, 6].every(lvl => perms.includes(lvl));
              if (isStandard) return null; // اگر سطح دسترسی عادی بود نمایش داده نمی‌شود

              const isFull = perms.length === 10;
              return (
                <div className="flex items-center gap-1.5 flex-wrap mt-2.5 pt-2 border-t border-slate-100">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isFull
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isFull ? 'دسترسی ویژه (کامل)' : 'دسترسی سازمانی سفارشی'}</span>
                  </span>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsCameraScannerOpen(true)}
            disabled={!canClock}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              canClock
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>اسکن بارکد کارگاه با دوربین</span>
          </button>
        </div>
      </div>

      {/* Quick Clock-In / Clock-Out Widget */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-lg border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className="text-xs text-indigo-300 font-medium mb-1">
              وضعیت تردد امروز شما ({shamsi.dayOfWeek} {shamsi.dateString})
            </div>
            <h3 className="text-lg sm:text-xl font-bold">
              {todayRecord?.checkInTime && todayRecord?.checkOutTime
                ? 'تردد شیفت امروز شما تکمیل و ثبت نهایی شده است'
                : todayRecord?.checkInTime
                ? `ورود شما در ساعت ${todayRecord.checkInTime} ثبت شده و در حال کار هستید`
                : 'ورود شیفت امروز هنوز ثبت نشده است'}
            </h3>
            {todayRecord?.overtimeMinutes && todayRecord.overtimeMinutes > 0 ? (
              <div className="mt-2 text-xs font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-950/70 py-1 px-3 rounded-xl border border-emerald-500/30 w-fit">
                <Zap className="w-3.5 h-3.5" />
                <span>اضافه‌کاری امروز: {todayRecord.overtimeMinutes} دقیقه محاسبه و ثبت گردید</span>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
              شیفت کاری: استاندارد
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-300 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              موقعیت مکانی مجاز
            </span>
          </div>
        </div>

        {/* Primary Camera QR & GPS Scanner Button */}
        <button
          type="button"
          onClick={() => setIsCameraScannerOpen(true)}
          disabled={!canClock}
          className={`w-full py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg mb-3 ${
            canClock
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-emerald-900/30 active:scale-99'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          <Camera className="w-5 h-5 text-emerald-300" />
          <span>اسکن بارکد چاپ شده کارگاه (دوربین گوشی + استعلام زنده GPS)</span>
        </button>

        {/* Fallback Buttons - Submits PENDING request for manager approval (Fixes ATT-001) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => handleOpenManualRequest('IN')}
            disabled={!canClock || !!todayRecord?.checkInTime}
            className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              !canClock || todayRecord?.checkInTime
                ? 'bg-slate-800/70 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>
              {todayRecord?.checkInTime
                ? `ورود ثبت شده (${todayRecord.checkInTime})`
                : 'درخواست ثبت ورود دستی (تایید مدیر)'}
            </span>
          </button>
          <button
            onClick={() => handleOpenManualRequest('OUT')}
            disabled={!canClock || !todayRecord?.checkInTime || !!todayRecord?.checkOutTime}
            className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              !canClock || todayRecord?.checkOutTime || !todayRecord?.checkInTime
                ? 'bg-slate-800/70 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>
              {todayRecord?.checkOutTime
                ? `خروج ثبت شده (${todayRecord.checkOutTime})`
                : 'درخواست ثبت خروج دستی (تایید مدیر)'}
            </span>
          </button>
        </div>

        {clockActionMsg && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              clockActionMsg.success
                ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-200'
                : 'bg-rose-950/80 border border-rose-500 text-rose-200'
            }`}
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{clockActionMsg.text}</span>
          </div>
        )}
      </div>

      {/* Workshop Announcements / Messages for Employee */}
      {myMessages.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-amber-600" />
              <span>اعلانات و اطلاعیه‌های کارگاه</span>
            </h4>
            <span className="text-[11px] text-amber-700 font-mono">
              {formatNumberFa(myMessages.length)} پیام جدید
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myMessages.slice(0, 2).map((msg) => (
              <div
                key={msg.id}
                className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">{msg.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{msg.sentAt.split(' - ')[0]}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {msg.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3 Quick Action Shortcuts (Leaves, Advances, Payslips) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Leaves */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-slate-800 text-sm">مرخصی‌های من</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <PlaneTakeoff className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              مانده مرخصی استحقاقی: {currentEmployee?.remainingLeaveDays} روز
            </p>
            <div className="space-y-1.5 text-xs text-slate-600">
              {myLeaves.slice(0, 2).map((l) => (
                <div key={l.id} className="flex justify-between py-1 border-b border-slate-100">
                  <span>{l.startDate}</span>
                  <span
                    className={`font-semibold ${
                      l.status === 'APPROVED'
                        ? 'text-emerald-600'
                        : l.status === 'REJECTED'
                        ? 'text-rose-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {l.status === 'APPROVED' ? 'تایید شد' : l.status === 'REJECTED' ? 'رد شد' : 'در انتظار'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => onNavigate('leaves')}
            className="mt-4 w-full py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            مشاهده و ثبت مرخصی
          </button>
        </div>

        {/* Card 2: Advances */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-slate-800 text-sm">مساعده‌های من</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              سقف مجاز ماهانه: ۳۰٪ حقوق پایه
            </p>
            <div className="space-y-1.5 text-xs text-slate-600">
              {myAdvances.slice(0, 2).map((a) => (
                <div key={a.id} className="flex justify-between py-1 border-b border-slate-100">
                  <span className="font-mono">{formatCurrencyTomans(a.amount)}</span>
                  <span
                    className={`font-semibold ${
                      a.status === 'APPROVED'
                        ? 'text-emerald-600'
                        : a.status === 'REJECTED'
                        ? 'text-rose-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {a.status === 'APPROVED' ? 'تایید شد' : a.status === 'REJECTED' ? 'رد شد' : 'در انتظار'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => onNavigate('advances')}
            className="mt-4 w-full py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            درخواست مساعده جدید
          </button>
        </div>

        {/* Card 3: Payslips */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-slate-800 text-sm">فیش‌های حقوقی</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              ریز حقوق، بیمه، مالیات و اضافه‌کاری
            </p>
            <div className="space-y-1.5 text-xs text-slate-600">
              {mySalaries.slice(0, 2).map((s) => (
                <div key={s.id} className="flex justify-between py-1 border-b border-slate-100">
                  <span className="font-mono">{s.month}</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatCurrencyTomans(s.netSalary)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => onNavigate('payroll')}
            className="mt-4 w-full py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            مشاهده آخرین فیش حقوقی
          </button>
        </div>
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>تاریخچه ترددهای ثبت شده من</span>
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">
            {myAttendanceHistory.length} تردد ثبت شده
          </span>
        </div>

        {/* Mobile View: Cards */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {myAttendanceHistory.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              ترددی برای شما ثبت نشده است.
            </div>
          ) : (
            myAttendanceHistory.map((rec) => (
              <div key={rec.id} className="p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-slate-800">{rec.date}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                    {rec.status === 'PRESENT'
                      ? 'حاضر'
                      : rec.status === 'LATE'
                      ? 'تاخیر'
                      : rec.status === 'ON_LEAVE'
                      ? 'مرخصی'
                      : 'غایب'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2 rounded-xl border border-slate-100 font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">ورود:</span>
                    <span className="font-semibold text-emerald-700">{rec.checkInTime || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">خروج:</span>
                    <span className="font-semibold text-rose-700">
                      {rec.checkOutTime || (rec.checkInTime ? 'در حال کار' : '-')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">تاخیر:</span>
                    <span className={rec.lateMinutes > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500'}>
                      {rec.lateMinutes > 0 ? `${rec.lateMinutes} دقیقه` : 'ندارد'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">اضافه‌کاری:</span>
                    <span className="text-indigo-600 font-semibold">
                      {rec.overtimeMinutes > 0 ? `+${rec.overtimeMinutes} دقیقه` : '---'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200/80 font-semibold">
              <tr>
                <th className="py-3 px-4">تاریخ</th>
                <th className="py-3 px-4">ورود</th>
                <th className="py-3 px-4">خروج</th>
                <th className="py-3 px-4">تاخیر</th>
                <th className="py-3 px-4">اضافه‌کاری</th>
                <th className="py-3 px-4">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {myAttendanceHistory.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 font-mono font-medium">{rec.date}</td>
                  <td className="py-2.5 px-4 font-mono text-emerald-700 font-semibold">
                    {rec.checkInTime || '-'}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-rose-700 font-semibold">
                    {rec.checkOutTime || (rec.checkInTime ? 'در حال کار' : '-')}
                  </td>
                  <td className="py-2.5 px-4">
                    {rec.lateMinutes > 0 ? (
                      <span className="text-rose-600 font-semibold">{rec.lateMinutes} دقیقه</span>
                    ) : (
                      <span className="text-slate-400">بدون تاخیر</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-indigo-600">
                    {rec.overtimeMinutes > 0 ? `+${rec.overtimeMinutes} دقیقه` : '---'}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                      {rec.status === 'PRESENT'
                        ? 'حاضر'
                        : rec.status === 'LATE'
                        ? 'تاخیر'
                        : rec.status === 'ON_LEAVE'
                        ? 'مرخصی'
                        : 'غایب'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Signature */}
      <DeveloperBadge variant="footer" className="pt-6 pb-2" />

      {/* Manual Attendance Request Modal (Fixes ATT-001) */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>درخواست ثبت تردد دستی ({manualType === 'IN' ? 'ورود' : 'خروج'})</span>
              </h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ساعت تردد:
                </label>
                <input
                  type="time"
                  required
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono text-center focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  علت ثبت دستی (جهت بررسی مدیر):
                </label>
                <textarea
                  required
                  rows={3}
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="مثال: فراموشی اسکن بارکد در زمان ورود یا اتمام شارژ گوشی..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800">
                توجه: ثبت تردد دستی مستقیماً تایید نمی‌شود و پس از بررسی و موافقت سرپرست کارگاه در سوابق لحاظ خواهد شد.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm"
                >
                  ارسال به سرپرست
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
