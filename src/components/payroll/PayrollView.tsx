import React, { useState } from 'react';
import {
  CreditCard,
  Calculator,
  Printer,
  CheckCircle2,
  Calendar,
  Gift,
  Eye,
  X,
  Coins,
  Trash2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Info,
  DollarSign,
  PlusCircle,
  FileText,
} from 'lucide-react';
import { SalaryRecord, Employee, User as AppUser, ManagerAdjustmentType, BonusOrPenalty } from '../../types';
import { StorageService } from '../../services/storage';
import {
  formatCurrencyTomans,
  getTodayShamsiDetailed,
  toEnglishDigits
} from '../../utils/dateUtils';
import { DeveloperBadge } from '../common/DeveloperBadge';

interface PayrollViewProps {
  salaries: SalaryRecord[];
  employees: Employee[];
  currentUser: AppUser;
  onRefresh: () => void;
  canManage: boolean;
}

export const PayrollView: React.FC<PayrollViewProps> = ({
  salaries,
  employees,
  currentUser,
  onRefresh,
  canManage,
}) => {
  const shamsiDetail = getTodayShamsiDetailed();
  const currentMonthStr = shamsiDetail.dateString.substring(0, 7);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [payrollSubTab, setPayrollSubTab] = useState<'SLIPS' | 'ADJUSTMENTS'>('SLIPS');
  const [viewingPayslip, setViewingPayslip] = useState<SalaryRecord | null>(null);
  const [isBonusPenaltyModalOpen, setIsBonusPenaltyModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Dynamic month list for current year
  const persianMonthNames = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const m = (i + 1).toString().padStart(2, '0');
    return {
      value: `${shamsiDetail.year}/${m}`,
      label: `${persianMonthNames[i]} ${shamsiDetail.year}${`${shamsiDetail.year}/${m}` === currentMonthStr ? ' (دوره جاری)' : ''}`
    };
  }).reverse();

  // Bonus, Penalty or Discretionary Advance form
  const [bpForm, setBpForm] = useState<{
    employeeId: string;
    type: ManagerAdjustmentType;
    amount: number;
    title: string;
    description: string;
    month: string;
  }>({
    employeeId: employees[0]?.id || '',
    type: 'BONUS',
    amount: 1500000,
    title: '',
    description: '',
    month: currentMonthStr,
  });

  const filteredSalaries = salaries.filter((s) => {
    if (currentUser.role === 'EMPLOYEE') {
      if (!currentUser.employeeId || s.employeeId !== currentUser.employeeId) {
        return false;
      }
    }
    return s.month === selectedMonth;
  });

  const allAdjustments = StorageService.getBonusesAndPenalties(currentUser);
  const currentMonthAdjustments = allAdjustments.filter(
    (b) => b.month?.replace(/-/g, '/') === selectedMonth.replace(/-/g, '/')
  );

  const currentMonthBonuses = currentMonthAdjustments
    .filter((b) => b.type === 'BONUS')
    .reduce((sum, b) => sum + b.amount, 0);

  const currentMonthDiscretionaryAdvances = currentMonthAdjustments
    .filter((b) => b.type === 'DISCRETIONARY_ADVANCE' || (b as any).type === 'EXTRA_ADVANCE')
    .reduce((sum, b) => sum + b.amount, 0);

  const currentMonthPenalties = currentMonthAdjustments
    .filter((b) => b.type === 'PENALTY')
    .reduce((sum, b) => sum + b.amount, 0);

  // Calculate salary for all employees for the selected month
  const handleCalculateAll = () => {
    employees.forEach((emp) => {
      StorageService.calculateSalaryForEmployee(emp.id, selectedMonth);
    });
    StorageService.addAuditLog(
      'محاسبه حقوق و دستمزد',
      'حقوق و دستمزد',
      `محاسبه اتوماتیک حقوق کلیه پرسنل برای ماه ${selectedMonth}`
    );
    onRefresh();
    setActionMessage(`محاسبه حقوق دوره ${selectedMonth} با موفقیت انجام شد.`);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleMarkAsPaid = (recordId: string) => {
    const list = StorageService.getSalaries().map((s) =>
      s.id === recordId
        ? { ...s, status: 'PAID' as const, paymentDate: getTodayShamsiDetailed().dateString }
        : s
    );
    StorageService.saveSalaries(list);
    StorageService.addAuditLog('تسویه حقوق', 'حقوق و دستمزد', `پرداخت فیش حقوقی ${recordId} تایید شد.`);
    onRefresh();
    if (viewingPayslip && viewingPayslip.id === recordId) {
      setViewingPayslip({
        ...viewingPayslip,
        status: 'PAID',
        paymentDate: getTodayShamsiDetailed().dateString,
      });
    }
  };

  const handleAddBonusPenalty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bpForm.title.trim() || !bpForm.amount || bpForm.amount <= 0) return;
    const settings = StorageService.getSettings();
    const today = getTodayShamsiDetailed().dateString;

    StorageService.addBonusOrPenalty({
      id: `bp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      companyId: settings.id,
      employeeId: bpForm.employeeId,
      type: bpForm.type,
      amount: Math.round(Number(bpForm.amount)),
      title: bpForm.title.trim(),
      description: bpForm.description?.trim(),
      date: today,
      month: bpForm.month,
      createdBy: currentUser.name || currentUser.username,
      createdAt: new Date().toISOString(),
    });

    // Auto recalculate that employee's salary
    StorageService.calculateSalaryForEmployee(bpForm.employeeId, bpForm.month);
    setIsBonusPenaltyModalOpen(false);
    onRefresh();
    setActionMessage(
      bpForm.type === 'BONUS'
        ? '✓ پاداش تشویقی با موفقیت ثبت شد و به حقوق اضافه گردید.'
        : bpForm.type === 'DISCRETIONARY_ADVANCE'
        ? '✓ مساعده خارج از چارچوب ثبت شد و از خالص حقوق دوره کسر گردید.'
        : '✓ جریمه انضباطی ثبت شد و در کسورات حقوق اعمال گردید.'
    );
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleDeleteBonusPenalty = (id: string, empId: string, month: string) => {
    if (confirm('آیا از حذف این تعدیل مالی اطمینان دارید؟ حقوق پرسنل برای این دوره مجدداً محاسبه و تراز خواهد شد.')) {
      StorageService.deleteBonusOrPenalty(id);
      StorageService.calculateSalaryForEmployee(empId, month);
      onRefresh();
      setActionMessage('✓ مورد انتخابی حذف شد و حقوق پرسنل به‌روزرسانی گردید.');
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const getStatusBadge = (status: SalaryRecord['status']) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> تسویه شده
          </span>
        );
      case 'CALCULATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            محاسبه شده
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            پیش‌نویس
          </span>
        );
    }
  };

  const selectedPayslipEmployee = viewingPayslip
    ? employees.find((e) => e.id === viewingPayslip.employeeId)
    : null;

  const payslipAdjustments = viewingPayslip
    ? StorageService.getAllBonusesPenaltiesRaw().filter(
        (b) =>
          b.employeeId === viewingPayslip.employeeId &&
          b.month?.replace(/-/g, '/') === viewingPayslip.month?.replace(/-/g, '/')
      )
    : [];

  return (
    <div className="space-y-6 w-full max-w-full">
      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <span>محاسبه حقوق و صدور فیش رسمی</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            موتور هوشمند محاسبه اضافه‌کاری، حق مسکن، بن خواروبار، بیمه، کسر مساعده، پاداش‌ها و جرایم مدیریتی
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setBpForm((prev) => ({ ...prev, month: selectedMonth }));
                setIsBonusPenaltyModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer border border-indigo-200 shadow-2xs"
            >
              <Coins className="w-4 h-4 text-indigo-600" />
              <span>ثبت پاداش، جریمه یا مساعده خارج از چارچوب</span>
            </button>
            <button
              onClick={handleCalculateAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-indigo-400" />
              <span>محاسبه اتوماتیک این ماه</span>
            </button>
          </div>
        )}
      </div>

      {/* Month Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="font-semibold">دوره حقوقی:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 py-1.5 px-3 bg-white text-slate-800 font-bold focus:outline-none"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <span className="text-xs font-bold text-slate-700">
          مجموع پرداختی خالص:{' '}
          <span className="text-indigo-600 font-mono">
            {formatCurrencyTomans(filteredSalaries.reduce((sum, s) => sum + s.netSalary, 0))}
          </span>
        </span>
      </div>

      {/* Sub-Tabs: Salary Slips vs Manager Adjustments */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setPayrollSubTab('SLIPS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            payrollSubTab === 'SLIPS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>فیش‌های حقوق و دستمزد ({filteredSalaries.length})</span>
        </button>

        {canManage && (
          <button
            type="button"
            onClick={() => setPayrollSubTab('ADJUSTMENTS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              payrollSubTab === 'ADJUSTMENTS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-500" />
            <span>پاداش، جریمه و مساعده خارج از چارچوب ({currentMonthAdjustments.length})</span>
          </button>
        )}
      </div>

      {/* VIEW 1: DISCRETIONARY ADJUSTMENTS MANAGEMENT */}
      {payrollSubTab === 'ADJUSTMENTS' && canManage && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-xs text-emerald-800 font-bold block mb-1">مجموع پاداش‌های تشویقی دوره:</span>
                <span className="text-lg font-black text-emerald-900 font-mono">
                  +{formatCurrencyTomans(currentMonthBonuses)}
                </span>
                <span className="text-[10px] text-emerald-700 block mt-0.5 font-normal">افزایش به خالص حقوق</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-purple-50/80 border border-purple-200/90 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-xs text-purple-800 font-bold block mb-1">مساعده‌های خارج از چارچوب دوره:</span>
                <span className="text-lg font-black text-purple-900 font-mono">
                  -{formatCurrencyTomans(currentMonthDiscretionaryAdvances)}
                </span>
                <span className="text-[10px] text-purple-700 block mt-0.5 font-normal">منظور در سرفصل کسر مساعده</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-rose-50/80 border border-rose-200/90 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-xs text-rose-800 font-bold block mb-1">مجموع جرایم انضباطی دوره:</span>
                <span className="text-lg font-black text-rose-900 font-mono">
                  -{formatCurrencyTomans(currentMonthPenalties)}
                </span>
                <span className="text-[10px] text-rose-700 block mt-0.5 font-normal">منظور در سرفصل کسورات انضباطی</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Adjustments Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-indigo-600" />
                  <span>لیست پاداش‌ها، جرایم و مساعده‌های خارج از چارچوب دوره {selectedMonth}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  کلیه این اقلام مستقیماً در فیش حقوقی محاسبه شده و بدون ایجاد هیچگونه اختلال یا مغایرت دفتری اعمال می‌شوند.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBpForm((prev) => ({ ...prev, month: selectedMonth }));
                  setIsBonusPenaltyModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>ثبت مورد جدید برای این دوره</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200/80 font-semibold">
                  <tr>
                    <th className="py-3 px-4">پرسنل</th>
                    <th className="py-3 px-4">نوع تعدیل مدیریتی</th>
                    <th className="py-3 px-4">مبلغ (تومان)</th>
                    <th className="py-3 px-4">عنوان و موضوع</th>
                    <th className="py-3 px-4">شرح / مستندات</th>
                    <th className="py-3 px-4">ماه اعمال</th>
                    <th className="py-3 px-4">تاریخ ثبت</th>
                    <th className="py-3 px-4">وضعیت در فیش</th>
                    <th className="py-3 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {currentMonthAdjustments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        هیچ پاداش، جریمه یا مساعده خارج از چارچوبی برای دوره {selectedMonth} ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    currentMonthAdjustments.map((adj) => {
                      const emp = employees.find((e) => e.id === adj.employeeId);
                      return (
                        <tr key={adj.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {emp ? `${emp.firstName} ${emp.lastName}` : adj.employeeId}
                            <span className="block text-[11px] font-normal text-slate-400 font-mono">
                              {emp?.personalCode} - {emp?.department}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                adj.type === 'BONUS'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : adj.type === 'DISCRETIONARY_ADVANCE'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {adj.type === 'BONUS' && <TrendingUp className="w-3 h-3" />}
                              {adj.type === 'DISCRETIONARY_ADVANCE' && <Coins className="w-3 h-3" />}
                              {adj.type === 'PENALTY' && <TrendingDown className="w-3 h-3" />}
                              <span>
                                {adj.type === 'BONUS'
                                  ? 'پاداش تشویقی (+)'
                                  : adj.type === 'DISCRETIONARY_ADVANCE'
                                  ? 'مساعده خارج از چارچوب (-)'
                                  : 'جریمه انضباطی (-)'}
                              </span>
                            </span>
                          </td>
                          <td
                            className={`py-3 px-4 font-mono font-bold text-sm ${
                              adj.type === 'BONUS' ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {adj.type === 'BONUS' ? '+' : '-'}{formatCurrencyTomans(adj.amount)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {adj.title}
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                            {adj.description || '---'}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {adj.month}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                            {adj.date}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>اعمال در محاسبات</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteBonusPenalty(adj.id, adj.employeeId, adj.month)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="حذف و محاسبه مجدد حقوق"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Informative Accounting Box */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>نحوه عملکرد و یکپارچگی محاسبات مالی (تضمین عدم بروز اختلاف):</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-amber-900/90 leading-relaxed pr-2">
              <li>
                <strong>پاداش تشویقی و حق‌الزحمه ویژه:</strong> در ردیف مزایا به حقوق ناخالص و خالص افزوده شده و سقف و کف قانونی را رعایت می‌کند.
              </li>
              <li>
                <strong>مساعده خارج از چارچوب:</strong> با دستور مستقیم مدیر و بدون نیاز به فرم درخواست پرسنل یا محدودیت سقف پرداختی اعمال می‌شود و مستقیماً در سرفصل کسر مساعده قرار می‌گیرد تا دریافتی کارگر و تراز کارگاه کاملاً همخوان باشند.
              </li>
              <li>
                <strong>جریمه انضباطی و کسر کار اختصاصی:</strong> در سرفصل کسورات انضباطی ثبت شده و از خالص پرداختی پرسنل کسر می‌گردد.
              </li>
              <li>
                در صورت حذف هر مورد توسط مدیر، فیش حقوقی پرسنل بلافاصله مجدداً به صورت اتوماتیک محاسبه و تراز می‌شود.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* VIEW 2: SALARY SLIPS (CARDS & TABLE) */}
      {payrollSubTab === 'SLIPS' && (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Mobile View: Cards */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredSalaries.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              فیش حقوقی برای این دوره صادر نشده است.
            </div>
          ) : (
            filteredSalaries.map((sal) => {
              const emp = employees.find((e) => e.id === sal.employeeId);
              const deductions = (sal.insuranceDeduction || 0) + (sal.taxDeduction || 0) + (sal.advancesTotal || 0) + (sal.penaltiesTotal || 0) + (sal.miscDeductionsTotal || 0);
              return (
                <div key={sal.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {emp ? `${emp.firstName} ${emp.lastName}` : sal.employeeId}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {emp?.position} <span className="font-mono text-slate-500">({emp?.personalCode})</span>
                      </div>
                    </div>
                    <div>{getStatusBadge(sal.status)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[11px]">حقوق پایه:</span>
                      <span className="font-mono font-medium text-slate-700">{formatCurrencyTomans(sal.baseSalary)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">اضافه‌کاری ({sal.overtimeHours} ساعت):</span>
                      <span className="font-mono font-semibold text-indigo-600">+{formatCurrencyTomans(sal.overtimeAmount)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">کل کسورات (بیمه/مساعده/غیبت):</span>
                      <span className="font-mono font-medium text-rose-600">-{formatCurrencyTomans(deductions)}</span>
                    </div>
                    <div className="bg-emerald-50/80 p-1.5 rounded-lg border border-emerald-100 col-span-2 flex items-center justify-between">
                      <span className="text-emerald-900 font-bold text-xs">خالص پرداختی:</span>
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        {formatCurrencyTomans(sal.netSalary)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setViewingPayslip(sal)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-indigo-200/80"
                  >
                    <Eye className="w-4 h-4" />
                    <span>مشاهده و چاپ فیش رسمی</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200/80 font-semibold">
              <tr>
                <th className="py-3.5 px-4">پرسنل</th>
                <th className="py-3.5 px-4">حقوق پایه</th>
                <th className="py-3.5 px-4">اضافه‌کاری</th>
                <th className="py-3.5 px-4">مزایا و بن‌ها</th>
                <th className="py-3.5 px-4">کسر مساعده</th>
                <th className="py-3.5 px-4">کسورات قانونی و غیبت</th>
                <th className="py-3.5 px-4">خالص پرداختی</th>
                <th className="py-3.5 px-4">وضعیت</th>
                <th className="py-3.5 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredSalaries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    برای این دوره هنوز فیش حقوقی صادر نشده است. دکمه محاسبه را بزنید.
                  </td>
                </tr>
              ) : (
                filteredSalaries.map((sal) => {
                  const emp = employees.find((e) => e.id === sal.employeeId);
                  const allowances = (sal.housingAllowance || 0) + (sal.groceryAllowance || 0) + (sal.bonusesTotal || 0);
                  const statutoryDeductions = (sal.insuranceDeduction || 0) + (sal.taxDeduction || 0) + (sal.penaltiesTotal || 0);
                  return (
                    <tr key={sal.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {emp ? `${emp.firstName} ${emp.lastName}` : sal.employeeId}
                        <span className="block text-[11px] font-normal text-slate-400 font-mono">
                          {emp?.personalCode} - {emp?.position}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">
                        {formatCurrencyTomans(sal.baseSalary)}
                      </td>
                      <td className="py-3 px-4 text-indigo-600 font-mono font-semibold">
                        +{formatCurrencyTomans(sal.overtimeAmount)}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          ({sal.overtimeHours} ساعت)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-emerald-600 font-mono">
                        +{formatCurrencyTomans(allowances)}
                      </td>
                      <td className="py-3 px-4 text-rose-600 font-mono font-medium">
                        {sal.advancesTotal > 0 ? `-${formatCurrencyTomans(sal.advancesTotal)}` : '---'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        <span className="text-rose-600 font-medium">-{formatCurrencyTomans(statutoryDeductions)}</span>
                        {sal.penaltiesTotal > 0 && (
                          <span className="block text-[10px] text-amber-600">
                            (شامل غیبت: {formatCurrencyTomans(sal.penaltiesTotal)})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono text-sm">
                        {formatCurrencyTomans(sal.netSalary)}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(sal.status)}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setViewingPayslip(sal)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>فیش حقوقی</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* OFFICIAL PERSIAN PAYSLIP MODAL */}
      {viewingPayslip && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setViewingPayslip(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Controls Bar */}
            <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold">فیش رسمی حقوق و مزایا</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ فیش</span>
                </button>
                <button
                  onClick={() => setViewingPayslip(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Payslip Body */}
            <div className="p-6 lg:p-8 space-y-6 text-slate-800" id="official-payslip">
              <div className="border-b-2 border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">
                    {StorageService.getSettings().companyName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    فیش حقوق و دستمزد پرسنل کارگاه
                  </p>
                </div>
                <div className="text-left text-xs space-y-1">
                  <div>
                    <span className="text-slate-400">دوره حقوقی: </span>
                    <span className="font-bold text-slate-800 font-mono">{viewingPayslip.month}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">وضعیت پرداخت: </span>
                    <span className="font-semibold text-emerald-700">
                      {viewingPayslip.status === 'PAID' ? 'تسویه شده' : 'محاسبه شده / آماده پرداخت'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Employee Meta Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl text-xs border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block mb-0.5">نام پرسنل:</span>
                  <span className="font-bold text-slate-900">
                    {selectedPayslipEmployee
                      ? `${selectedPayslipEmployee.firstName} ${selectedPayslipEmployee.lastName}`
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">کد پرسنلی:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {selectedPayslipEmployee?.personalCode}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">واحد و سمت:</span>
                  <span className="font-medium text-slate-800">
                    {selectedPayslipEmployee?.department} - {selectedPayslipEmployee?.position}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">کارکرد ماه:</span>
                  <span className="font-bold text-slate-900">
                    {viewingPayslip.workDays} روز ({viewingPayslip.workedHours} ساعت)
                  </span>
                </div>
              </div>

              {/* Earnings vs Deductions Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Earnings Column */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-emerald-50 px-3.5 py-2 font-bold text-emerald-900 border-b border-emerald-100 flex items-center justify-between">
                    <span>شرح مزایا و پرداختی‌ها</span>
                    <span>مبلغ (تومان)</span>
                  </div>
                  <div className="p-3.5 space-y-2.5">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">حقوق پایه ماهیانه:</span>
                      <span className="font-mono font-semibold">
                        {formatCurrencyTomans(viewingPayslip.baseSalary)}
                      </span>
                    </div>
                    {viewingPayslip.overtimeAmount > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">
                          اضافه‌کاری ({viewingPayslip.overtimeHours} ساعت):
                        </span>
                        <span className="font-mono font-semibold">
                          {formatCurrencyTomans(viewingPayslip.overtimeAmount)}
                        </span>
                      </div>
                    )}
                    {viewingPayslip.housingAllowance > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">حق مسکن:</span>
                        <span className="font-mono">
                          {formatCurrencyTomans(viewingPayslip.housingAllowance)}
                        </span>
                      </div>
                    )}
                    {viewingPayslip.groceryAllowance > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">بن خواروبار:</span>
                        <span className="font-mono">
                          {formatCurrencyTomans(viewingPayslip.groceryAllowance)}
                        </span>
                      </div>
                    )}
                    {viewingPayslip.childAllowance > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">حق اولاد:</span>
                        <span className="font-mono">
                          {formatCurrencyTomans(viewingPayslip.childAllowance)}
                        </span>
                      </div>
                    )}
                    {viewingPayslip.bonusesTotal > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-600 font-semibold">
                        <span>پاداش عملکرد و تشویقی:</span>
                        <span className="font-mono">
                          +{formatCurrencyTomans(viewingPayslip.bonusesTotal)}
                        </span>
                      </div>
                    )}
                    {viewingPayslip.personalCardExpensesTotal && viewingPayslip.personalCardExpensesTotal > 0 ? (
                      <div className="flex justify-between py-1 border-b border-slate-100 text-indigo-700 font-bold bg-indigo-50/60 px-1.5 py-1 rounded-lg">
                        <span>هزینه پرداخت‌شده از کارت شخصی کارگر:</span>
                        <span className="font-mono">
                          +{formatCurrencyTomans(viewingPayslip.personalCardExpensesTotal)}
                        </span>
                      </div>
                    ) : null}
                    <div className="flex justify-between pt-2 font-bold text-slate-900">
                      <span>جمع ناخالص پرداختی:</span>
                      <span className="font-mono">
                        {formatCurrencyTomans(viewingPayslip.grossSalary + (viewingPayslip.personalCardExpensesTotal || 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deductions Column */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-rose-50 px-3.5 py-2 font-bold text-rose-900 border-b border-rose-100 flex items-center justify-between">
                    <span>شرح کسورات قانونی و مالی</span>
                    <span>مبلغ (تومان)</span>
                  </div>
                  <div className="p-3.5 space-y-2.5">
                    {viewingPayslip.insuranceDeduction > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">حق بیمه سهم کارمند (۷٪):</span>
                        <span className="font-mono text-rose-700">
                          {formatCurrencyTomans(viewingPayslip.insuranceDeduction)}
                        </span>
                      </div>
                    )}
                    {viewingPayslip.taxDeduction > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">مالیات بر درآمد:</span>
                        <span className="font-mono text-rose-700">
                          {formatCurrencyTomans(viewingPayslip.taxDeduction)}
                        </span>
                      </div>
                    )}
                    {viewingPayslip.advancesTotal > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-100 text-rose-700 font-semibold">
                        <div>
                          <span>کسر مساعده دریافتی:</span>
                          {viewingPayslip.discretionaryAdvancesTotal && viewingPayslip.discretionaryAdvancesTotal > 0 ? (
                            <span className="block text-[10px] text-purple-700 font-normal">
                              (شامل {formatCurrencyTomans(viewingPayslip.discretionaryAdvancesTotal)} مساعده خارج از چارچوب)
                            </span>
                          ) : null}
                        </div>
                        <span className="font-mono">
                          -{formatCurrencyTomans(viewingPayslip.advancesTotal)}
                        </span>
                      </div>
                    )}
                    {viewingPayslip.miscDeductionsTotal && viewingPayslip.miscDeductionsTotal > 0 ? (
                      <div className="flex justify-between py-1 border-b border-slate-100 text-rose-700 font-bold bg-rose-50/60 px-1.5 py-1 rounded-lg">
                        <span>کسر پرداخت متفرقه / علی‌الحساب:</span>
                        <span className="font-mono">
                          -{formatCurrencyTomans(viewingPayslip.miscDeductionsTotal)}
                        </span>
                      </div>
                    ) : null}
                    {viewingPayslip.penaltiesTotal > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-100 text-rose-700">
                        <span>کسورات انضباطی / تاخیر:</span>
                        <span className="font-mono">
                          -{formatCurrencyTomans(viewingPayslip.penaltiesTotal)}
                        </span>
                      </div>
                    )}
                    {viewingPayslip.insuranceDeduction === 0 && viewingPayslip.taxDeduction === 0 && viewingPayslip.advancesTotal === 0 && viewingPayslip.penaltiesTotal === 0 && (!viewingPayslip.miscDeductionsTotal || viewingPayslip.miscDeductionsTotal === 0) && (
                      <div className="py-2 text-slate-400 text-xs text-center">
                        بدون کسورات در این ماه
                      </div>
                    )}
                    <div className="flex justify-between pt-2 font-bold text-rose-700">
                      <span>مجموع کل کسورات:</span>
                      <span className="font-mono">
                        {formatCurrencyTomans(
                          viewingPayslip.insuranceDeduction +
                            viewingPayslip.taxDeduction +
                            viewingPayslip.advancesTotal +
                            viewingPayslip.penaltiesTotal +
                            (viewingPayslip.miscDeductionsTotal || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Itemized Discretionary Adjustments in Payslip */}
              {payslipAdjustments.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/70 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-indigo-600" />
                      <span>ریز اقلام پاداش، جریمه و مساعده خارج از چارچوب (مدیریتی):</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">منظور شده در سرفصل‌های فوق</span>
                  </div>
                  <div className="space-y-1.5">
                    {payslipAdjustments.map((adj) => (
                      <div key={adj.id} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-white border border-slate-200/80">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            adj.type === 'BONUS'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : adj.type === 'DISCRETIONARY_ADVANCE'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {adj.type === 'BONUS' ? 'پاداش تشویقی (+)' : adj.type === 'DISCRETIONARY_ADVANCE' ? 'مساعده خارج از چارچوب (-)' : 'جریمه انضباطی (-)'}
                          </span>
                          <span className="font-semibold text-slate-800">{adj.title}</span>
                          {adj.description && <span className="text-[11px] text-slate-500">({adj.description})</span>}
                        </div>
                        <span className={`font-mono font-bold ${
                          adj.type === 'BONUS' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {adj.type === 'BONUS' ? '+' : '-'}{formatCurrencyTomans(adj.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Net Salary Highlight Box */}
              <div className="p-5 rounded-2xl bg-indigo-50 border-2 border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-indigo-700 font-semibold block">
                    مبلغ خالص قابل پرداخت (واریز به حساب)
                  </span>
                  <div className="text-2xl font-black text-indigo-950 font-mono mt-0.5">
                    {formatCurrencyTomans(viewingPayslip.netSalary)}
                  </div>
                </div>
                {selectedPayslipEmployee?.shebaNumber && (
                  <div className="text-left text-xs">
                    <span className="text-slate-400 block mb-0.5">شماره شبای واریز:</span>
                    <span className="font-mono font-medium text-slate-700">
                      {selectedPayslipEmployee.shebaNumber}
                    </span>
                  </div>
                )}
              </div>

              {canManage && viewingPayslip.status !== 'PAID' && (
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleMarkAsPaid(viewingPayslip.id)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تایید پرداخت و تسویه حساب</span>
                  </button>
                </div>
              )}

              <DeveloperBadge variant="footer" className="pt-3" />
            </div>
          </div>
        </div>
      )}

      {/* BONUS / PENALTY / DISCRETIONARY ADVANCE MODAL */}
      {isBonusPenaltyModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsBonusPenaltyModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Coins className="w-4 h-4 text-indigo-600" />
                <span>ثبت پاداش، جریمه یا مساعده خارج از چارچوب</span>
              </h3>
              <button
                onClick={() => setIsBonusPenaltyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBonusPenalty} className="p-6 space-y-4">
              {/* Type Selection - 3 Clean Cards */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع تعدیل مدیریتی:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBpForm({ ...bpForm, type: 'BONUS' })}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      bpForm.type === 'BONUS'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <TrendingUp className={`w-4 h-4 ${bpForm.type === 'BONUS' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">پاداش تشویقی</span>
                    <span className="text-[10px] text-emerald-700 font-normal">افزایش به حقوق (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBpForm({ ...bpForm, type: 'DISCRETIONARY_ADVANCE' })}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      bpForm.type === 'DISCRETIONARY_ADVANCE'
                        ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Coins className={`w-4 h-4 ${bpForm.type === 'DISCRETIONARY_ADVANCE' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">مساعده ویژه</span>
                    <span className="text-[10px] text-purple-700 font-normal">خارج از چارچوب (-)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBpForm({ ...bpForm, type: 'PENALTY' })}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      bpForm.type === 'PENALTY'
                        ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <TrendingDown className={`w-4 h-4 ${bpForm.type === 'PENALTY' ? 'text-rose-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">جریمه انضباطی</span>
                    <span className="text-[10px] text-rose-700 font-normal">کسر از حقوق (-)</span>
                  </button>
                </div>
              </div>

              {/* Informative Callout for Selected Type */}
              <div className={`p-2.5 rounded-xl text-[11px] leading-relaxed border ${
                bpForm.type === 'BONUS'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : bpForm.type === 'DISCRETIONARY_ADVANCE'
                  ? 'bg-purple-50/70 border-purple-200 text-purple-900'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}>
                {bpForm.type === 'BONUS' && (
                  <p>
                    <strong>اثر حسابداری:</strong> این مبلغ به عنوان پاداش تشویقی و حق‌الزحمه ویژه به حقوق ناخالص افزوده شده و دریافتی نهایی پرسنل را افزایش می‌دهد.
                  </p>
                )}
                {bpForm.type === 'DISCRETIONARY_ADVANCE' && (
                  <p>
                    <strong>اثر حسابداری:</strong> مساعده با تصمیم مستقیم مدیر و بدون نیاز به فرم درخواست پرسنل یا محدودیت سقف پرداخت شده و در سرفصل کسر مساعده همین دوره منظور می‌گردد تا حساب‌ها تراز بماند.
                  </p>
                )}
                {bpForm.type === 'PENALTY' && (
                  <p>
                    <strong>اثر حسابداری:</strong> این مبلغ مستقیماً در سرفصل کسورات انضباطی فیش حقوقی ثبت شده و از خالص پرداختی پرسنل کسر می‌گردد.
                  </p>
                )}
              </div>

              {/* Employee and Month Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">پرسنل هدف:</label>
                  <select
                    value={bpForm.employeeId}
                    onChange={(e) => setBpForm({ ...bpForm, employeeId: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">دوره اعمال در حقوق:</label>
                  <select
                    value={bpForm.month}
                    onChange={(e) => setBpForm({ ...bpForm, month: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-bold"
                  >
                    {monthOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount Input with Fast Shortcuts */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مبلغ (تومان):
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={bpForm.amount ? bpForm.amount.toString() : ''}
                  onChange={(e) => {
                    const raw = toEnglishDigits(e.target.value).replace(/\D/g, '');
                    setBpForm({ ...bpForm, amount: raw ? Number(raw) : 0 });
                  }}
                  placeholder="مثال: ۲,۵۰۰,۰۰۰"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left font-bold"
                  dir="ltr"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span>معادل: {formatCurrencyTomans(bpForm.amount || 0)}</span>
                  <div className="flex items-center gap-1">
                    {[1000000, 2000000, 5000000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setBpForm({ ...bpForm, amount: preset })}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                      >
                        {preset / 1000000} م
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان و موضوع:</label>
                <input
                  type="text"
                  required
                  value={bpForm.title}
                  onChange={(e) => setBpForm({ ...bpForm, title: e.target.value })}
                  placeholder={
                    bpForm.type === 'BONUS'
                      ? 'مثال: تسریع در تکمیل سفارش یا حسن انجام کار'
                      : bpForm.type === 'DISCRETIONARY_ADVANCE'
                      ? 'مثال: مساعده فوری درمان یا علی‌الحساب خارج از سقف'
                      : 'مثال: جریمه خسارت ابزار یا تاخیر غیرموجه'
                  }
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و مستندات:</label>
                <textarea
                  rows={2}
                  value={bpForm.description}
                  onChange={(e) => setBpForm({ ...bpForm, description: e.target.value })}
                  placeholder="علت، مستندات یا توافق صورت‌گرفته با پرسنل را شرح دهید..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBonusPenaltyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  ثبت و اعمال فوری در حقوق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
