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
  ShieldAlert,
  Fingerprint,
  Receipt,
  Upload,
  Image as ImageIcon,
  FileText,
  X,
  Eye,
  EyeOff,
  Briefcase,
  MapPin,
  Key,
  Check
} from 'lucide-react';
import {
  Employee,
  AttendanceRecord,
  LeaveRequest,
  AdvanceRequest,
  SalaryRecord,
  User,
  WorkerExpense,
  ExpenseStatus
} from '../../types';
import { CopyButton } from '../common/CopyButton';
import { StorageService } from '../../services/storage';
import {
  formatCurrencyTomans,
  formatNumberFa,
  getTodayShamsiDetailed,
  getCurrentTimeStr,
  getTodayShamsi,
  toEnglishDigits
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
  const isEmployeeRole = currentUser.role === 'EMPLOYEE';
  const currentEmployee =
    employees.find((e) => e.id === currentUser.employeeId) ||
    employees.find((e) => e.email === currentUser.email) ||
    (!isEmployeeRole && employees.length > 0 ? employees[0] : undefined);

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
  const [bioRegisterMsg, setBioRegisterMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [isRegisteringBio, setIsRegisteringBio] = useState(false);

  const handleRegisterBiometric = async () => {
    setIsRegisteringBio(true);
    setBioRegisterMsg(null);
    try {
      const res = await StorageService.registerBiometricAsync();
      setBioRegisterMsg({ success: res.success, text: res.message });
      setTimeout(() => setBioRegisterMsg(null), 5000);
    } catch {
      setBioRegisterMsg({ success: false, text: 'خطا در برقراری ارتباط با حسگر اثر انگشت.' });
    } finally {
      setIsRegisteringBio(false);
    }
  };

  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    currentEmployee?.avatarUrl || null
  );

  // Worker Personal Card Expenses State (ثبت خرید با کارت شخصی)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseDate, setExpenseDate] = useState(getTodayShamsi());
  const [expenseReceipt, setExpenseReceipt] = useState<string | null>(null);
  const [expenseMsg, setExpenseMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [isExpenseHistoryModalOpen, setIsExpenseHistoryModalOpen] = useState(false);

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('حجم تصویر فاکتور نباید بیش از ۳ مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setExpenseReceipt(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee) return;
    if (!expenseAmount || Number(expenseAmount) <= 0) {
      setExpenseMsg({ success: false, text: 'لطفاً مبلغ خرید را وارد نمایید.' });
      return;
    }
    if (!expenseTitle.trim()) {
      setExpenseMsg({ success: false, text: 'لطفاً عنوان یا شرح خرید را وارد نمایید.' });
      return;
    }

    setIsSubmittingExpense(true);
    setExpenseMsg(null);
    try {
      const res = StorageService.submitWorkerExpense({
        employeeId: currentEmployee.id,
        amount: Number(expenseAmount),
        title: expenseTitle.trim(),
        date: expenseDate,
        receiptUrl: expenseReceipt || undefined
      });

      if (res.success) {
        setExpenseMsg({ success: true, text: res.message });
        setTimeout(() => {
          setIsExpenseModalOpen(false);
          setExpenseAmount('');
          setExpenseTitle('');
          setExpenseReceipt(null);
          setExpenseMsg(null);
          onRefresh();
        }, 1200);
      } else {
        setExpenseMsg({ success: false, text: res.message });
      }
    } catch {
      setExpenseMsg({ success: false, text: 'خطا در ثبت هزینه.' });
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Worker Password Change State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showCurPass, setShowCurPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordStatusMsg, setPasswordStatusMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatusMsg(null);

    const cleanNew = toEnglishDigits(newPasswordInput).trim();
    const cleanConfirm = toEnglishDigits(confirmPasswordInput).trim();
    const cleanCur = toEnglishDigits(currentPasswordInput).trim();

    if (!cleanNew || cleanNew.length < 4) {
      setPasswordStatusMsg({ success: false, text: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد.' });
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setPasswordStatusMsg({ success: false, text: 'تکرار رمز عبور جدید با رمز عبور مطابقت ندارد.' });
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await StorageService.changePasswordAsync(cleanCur, cleanNew);
      setPasswordStatusMsg({ success: res.success, text: res.message });
      if (res.success) {
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setCurrentPasswordInput('');
          setNewPasswordInput('');
          setConfirmPasswordInput('');
          setPasswordStatusMsg(null);
        }, 1500);
      }
    } catch {
      setPasswordStatusMsg({ success: false, text: 'خطا در ثبت رمز عبور جدید.' });
    } finally {
      setIsChangingPass(false);
    }
  };

  // Workers unconditionally have core worker rights to their portal tasks
  const canClock = true;
  const canViewAttendance = true;
  const canRequestLeave = true;
  const canRequestAdvance = true;
  const canViewSalary = true;
  const canViewMessages = true;

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

  // My requests, salary records, expenses and relevant messages
  const myLeaves = leaves.filter((l) => l.employeeId === currentEmployee?.id);
  const myAdvances = advances.filter((a) => a.employeeId === currentEmployee?.id);
  const mySalaries = salaries.filter((s) => s.employeeId === currentEmployee?.id);
  const myAttendanceHistory = attendance.filter((a) => a.employeeId === currentEmployee?.id);
  const myExpenses = StorageService.getWorkerExpenses(currentUser).filter(
    (e) => e.employeeId === currentEmployee?.id
  );
  const totalPendingExpense = myExpenses
    .filter((e) => e.status === 'PENDING_SETTLEMENT')
    .reduce((sum, e) => sum + e.amount, 0);

  // Workshop messages
  const allMessages = StorageService.getMessages();
  const myMessages = allMessages.filter(
    (m) =>
      m.recipientType === 'ALL' ||
      (m.recipientType === 'WORKSHOP_1' && (!currentEmployee?.workshopId || currentEmployee?.workshopId === 'ws_1')) ||
      (m.recipientType === 'WORKSHOP_2' && currentEmployee?.workshopId === 'ws_2') ||
      (m.recipientIds && currentEmployee && m.recipientIds.includes(currentEmployee.id))
  );

  if (!currentEmployee) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-slate-800 text-base">پرونده پرسنلی مرتبط یافت نشد</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          حساب کاربری فعلی شما ({currentUser.name}) به هیچ پرونده پرسنلی متصل نیست. برای مشاهده پرتال پرسنلی یا ثبت تردد پرسنل، می‌توانید از بخش مدیریت پرسنل یک کارگر ثبت نمایید یا با حساب کاربری پرسنل وارد شوید.
        </p>
        {onNavigate && (
          <button
            onClick={() => onNavigate('employees')}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 cursor-pointer shadow-xs"
          >
            مشاهده مدیریت پرسنل
          </button>
        )}
      </div>
    );
  }

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
                {currentEmployee?.workshopId === 'ws_2'
                  ? 'کارگاه شماره دو'
                  : currentEmployee?.workshopId === 'ws_both'
                  ? 'هر دو کارگاه'
                  : currentEmployee?.workshopId === 'ws_free'
                  ? 'کارگاه آزاد'
                  : 'کارگاه شماره یک'}
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
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setIsPasswordModalOpen(true);
              setPasswordStatusMsg(null);
              setCurrentPasswordInput('');
              setNewPasswordInput('');
              setConfirmPasswordInput('');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
            title="تغییر کلمه عبور حساب کاربری پرتال"
          >
            <Key className="w-4 h-4 text-indigo-600" />
            <span>تغییر کلمه عبور</span>
          </button>

          <button
            type="button"
            onClick={handleRegisterBiometric}
            disabled={isRegisteringBio}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700"
            title="ثبت اثر انگشت دستگاه فعلی جهت ورود سریع بدون کلمه عبور"
          >
            <Fingerprint className="w-4 h-4 text-amber-400" />
            <span>{isRegisteringBio ? 'در حال ثبت...' : 'ثبت اثر انگشت این دستگاه'}</span>
          </button>

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

      {bioRegisterMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-2 border ${
            bioRegisterMsg.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 shrink-0 text-amber-600" />
            <span className="font-medium">{bioRegisterMsg.text}</span>
          </div>
          <button
            onClick={() => setBioRegisterMsg(null)}
            className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

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

      {/* 4 Quick Action Shortcuts (Leaves, Advances, Worker Expenses, Payslips) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Card 2: Advances (مساعده - بدهکاری کارگر) */}
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

        {/* Card 3: Worker Personal Card Expenses (خریدهای کارگر با کارت شخصی - بستانکاری از کارگاه) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-slate-800 text-sm">خریدهای من (کارت شخصی)</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              بستانکاری در انتظار تسویه:{' '}
              <strong className="text-amber-700 font-mono">
                {formatCurrencyTomans(totalPendingExpense)}
              </strong>
            </p>
            <div className="space-y-1.5 text-xs text-slate-600">
              {myExpenses.length === 0 ? (
                <div className="py-2 text-center text-slate-400 text-[11px]">
                  خریدی با کارت شخصی ثبت نشده است.
                </div>
              ) : (
                myExpenses.slice(0, 3).map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="truncate max-w-[110px]" title={exp.title}>{exp.title}</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span>{formatCurrencyTomans(exp.amount)}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          exp.status === 'SETTLED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : exp.status === 'ADDED_TO_SALARY'
                            ? 'bg-indigo-50 text-indigo-700'
                            : exp.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {exp.status === 'SETTLED'
                          ? 'تسویه‌شده'
                          : exp.status === 'ADDED_TO_SALARY'
                          ? 'افزوده به حقوق'
                          : exp.status === 'REJECTED'
                          ? 'ردشده'
                          : 'در انتظار'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(true)}
              className="w-full py-2 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5 text-amber-700" />
              <span>ثبت خرید با کارت شخصی</span>
            </button>
            {myExpenses.length > 0 && (
              <button
                type="button"
                onClick={() => setIsExpenseHistoryModalOpen(true)}
                className="w-full py-1.5 rounded-xl text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <Eye className="w-3 h-3 text-slate-400" />
                <span>مشاهده سوابق و وضعیت تسویه ({myExpenses.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 4: Payslips */}
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

      {/* Worker Personal Card Expense Registration Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-600" />
                <span>ثبت خرید با کارت شخصی برای کارگاه</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsExpenseModalOpen(false);
                  setExpenseMsg(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {expenseMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  expenseMsg.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{expenseMsg.text}</span>
              </div>
            )}

            {/* Payer Clarification Banner */}
            <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-800 font-medium">پرداخت‌کننده در این فرم:</span>
                <span className="font-bold text-amber-950 bg-amber-200/90 px-2 py-0.5 rounded-lg border border-amber-300">
                  «کارت شخصی کارگر»
                </span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed pt-0.5">
                این هزینه به منزله <strong>بستانکاری کارگر بابت هزینه مجموعه</strong> است و پس از ثبت، با وضعیت <strong>«در انتظار تسویه»</strong> ذخیره شده و پیام فوری برای مدیر ارسال می‌گردد.
              </p>
            </div>

            <form onSubmit={handleExpenseSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مبلغ خرید (تومان) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="1000"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="مثال: ۱۸۵۰۰۰۰"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono text-left focus:border-amber-600 outline-none"
                />
                {expenseAmount && Number(expenseAmount) > 0 ? (
                  <p className="text-[11px] text-slate-500 font-mono mt-1 text-left">
                    معادل: {formatCurrencyTomans(Number(expenseAmount))}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان یا شرح خرید <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="مثال: خرید چسب چوب و سنباده برای کارگاه"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-amber-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تاریخ خرید (شمسی) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  placeholder="مثال: 1405/07/02"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono focus:border-amber-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تصویر فاکتور / رسید (اختیاری)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer border border-slate-200 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>انتخاب تصویر فاکتور</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptUpload}
                      className="hidden"
                    />
                  </label>
                  {expenseReceipt && (
                    <div className="flex items-center gap-2">
                      <img
                        src={expenseReceipt}
                        alt="پیش‌نمایش فاکتور"
                        className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setExpenseReceipt(null)}
                        className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                      >
                        حذف عکس
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExpense}
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>{isSubmittingExpense ? 'در حال ثبت...' : 'ثبت خرید و ارسال به مدیر'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Full Receipt Image Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-3 border border-slate-200 shadow-2xl animate-in zoom-in-95 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-xs text-slate-800">تصویر فاکتور / رسید خرید</h4>
              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center p-2">
              <img
                src={viewingReceipt}
                alt="تصویر فاکتور"
                className="max-w-full max-h-[65vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Worker Personal Card Expenses Full History & Status Modal */}
      {isExpenseHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-right">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    سوابق خریدهای ثبت‌شده با کارت شخصی
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    مشاهده وضعیت دقیق تسویه و پیگیری هزینه‌ها توسط مدیریت
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Summary Stats Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">کل خریدها</span>
                  <span className="font-bold font-mono text-slate-800 text-sm">
                    {myExpenses.length} فقره
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-amber-700 block text-[10px]">در انتظار تأیید</span>
                  <span className="font-bold font-mono text-amber-900 text-xs">
                    {formatCurrencyTomans(totalPendingExpense)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-700 block text-[10px]">تسویه‌شده مستقیم</span>
                  <span className="font-bold font-mono text-emerald-900 text-xs">
                    {formatCurrencyTomans(
                      myExpenses
                        .filter((e) => e.status === 'SETTLED')
                        .reduce((sum, e) => sum + e.amount, 0)
                    )}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200">
                  <span className="text-indigo-700 block text-[10px]">افزوده‌شده به حقوق</span>
                  <span className="font-bold font-mono text-indigo-900 text-xs">
                    {formatCurrencyTomans(
                      myExpenses
                        .filter((e) => e.status === 'ADDED_TO_SALARY')
                        .reduce((sum, e) => sum + e.amount, 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Expense List */}
              <div className="space-y-3">
                {myExpenses.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    تاکنون هیچ خریدی با کارت شخصی ثبت نشده است.
                  </div>
                ) : (
                  myExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-amber-300 shadow-2xs space-y-2.5 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-amber-600" />
                            <span>{exp.title}</span>
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                            تاریخ خرید: {exp.date} • ثبت: {exp.createdAt ? new Date(exp.createdAt).toLocaleDateString('fa-IR') : '---'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-slate-900 text-xs bg-slate-100 px-2.5 py-1 rounded-lg">
                            {formatCurrencyTomans(exp.amount)}
                          </span>
                          <span
                            className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                              exp.status === 'SETTLED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : exp.status === 'ADDED_TO_SALARY'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                                : exp.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            {exp.status === 'SETTLED'
                              ? '✓ تأیید و تسویه‌شده'
                              : exp.status === 'ADDED_TO_SALARY'
                              ? '+ تأیید و افزوده‌شده به حقوق'
                              : exp.status === 'REJECTED'
                              ? '✕ ردشده'
                              : '⏳ در انتظار تأیید'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex-wrap gap-2">
                        <span>پرداخت‌کننده: <strong>کارت شخصی کارگر</strong></span>
                        {exp.receiptUrl && (
                          <button
                            type="button"
                            onClick={() => setViewingReceipt(exp.receiptUrl!)}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1 cursor-pointer font-semibold transition-colors"
                          >
                            <Eye className="w-3 h-3 text-amber-700" />
                            <span>مشاهده تصویر فاکتور</span>
                          </button>
                        )}
                      </div>

                      {exp.settlementNotes && (
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                          <strong>یادداشت مدیر:</strong> {exp.settlementNotes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsExpenseHistoryModalOpen(false);
                  setIsExpenseModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>ثبت فاکتور خرید جدید</span>
              </button>
              <button
                type="button"
                onClick={() => setIsExpenseHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600" />
                <span>تغییر کلمه عبور پرتال پرسنلی</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="p-5 space-y-4">
              {passwordStatusMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                    passwordStatusMsg.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {passwordStatusMsg.success ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{passwordStatusMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  کلمه عبور فعلی (اختیاری)
                </label>
                <div className="relative">
                  <input
                    type={showCurPass ? 'text' : 'password'}
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    placeholder="کلمه عبور فعلی خود را وارد نمایید..."
                    className="w-full text-xs p-2.5 pl-9 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurPass(!showCurPass)}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  کلمه عبور جدید <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="حداقل ۴ کاراکتر یا عدد..."
                    className="w-full text-xs p-2.5 pl-9 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">پشتیبانی خودکار از اعداد فارسی و انگلیسی</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  تکرار کلمه عبور جدید <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="تکرار کلمه عبور جدید..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isChangingPass ? 'در حال ذخیره‌سازی...' : 'ثبت رمز عبور جدید'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
