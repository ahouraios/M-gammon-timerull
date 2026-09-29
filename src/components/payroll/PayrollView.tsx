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
} from 'lucide-react';
import { SalaryRecord, Employee, User as AppUser } from '../../types';
import { StorageService } from '../../services/storage';
import {
  formatCurrencyTomans,
  getTodayShamsiDetailed
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

  // Bonus or penalty form
  const [bpForm, setBpForm] = useState({
    employeeId: employees[0]?.id || '',
    type: 'BONUS' as 'BONUS' | 'PENALTY',
    amount: 1500000,
    title: '',
    description: '',
    month: currentMonthStr,
  });

  const filteredSalaries = salaries.filter((s) => {
    if (currentUser.role === 'EMPLOYEE' && currentUser.employeeId && s.employeeId !== currentUser.employeeId) {
      return false;
    }
    return s.month === selectedMonth;
  });

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
    if (!bpForm.title) return;
    const settings = StorageService.getSettings();
    const today = getTodayShamsiDetailed().dateString;

    StorageService.addBonusOrPenalty({
      id: `bp_${Date.now()}`,
      companyId: settings.id,
      employeeId: bpForm.employeeId,
      type: bpForm.type,
      amount: bpForm.amount,
      title: bpForm.title,
      description: bpForm.description,
      date: today,
      month: bpForm.month,
    });

    // Auto recalculate that employee's salary
    StorageService.calculateSalaryForEmployee(bpForm.employeeId, bpForm.month);
    setIsBonusPenaltyModalOpen(false);
    onRefresh();
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
            موتور هوشمند محاسبه اضافه‌کاری، حق مسکن، بن خواروبار، بیمه و کسر مساعده
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsBonusPenaltyModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
            >
              <Gift className="w-4 h-4 text-indigo-600" />
              <span>ثبت پاداش / جریمه</span>
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

      {/* Payroll: Cards (Mobile) & Table (Desktop) */}
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
              const deductions = (sal.insuranceDeduction || 0) + (sal.taxDeduction || 0) + (sal.advancesTotal || 0);
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
                      <span className="text-slate-400 block text-[11px]">کسورات (بیمه/مالیات/مساعده):</span>
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
                <th className="py-3.5 px-4">بیمه و مالیات</th>
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
                  const deductions = (sal.insuranceDeduction || 0) + (sal.taxDeduction || 0);
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
                        -{formatCurrencyTomans(deductions)}
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

      {/* OFFICIAL PERSIAN PAYSLIP MODAL */}
      {viewingPayslip && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
                        <span>پاداش عملکرد و تسریع:</span>
                        <span className="font-mono">
                          +{formatCurrencyTomans(viewingPayslip.bonusesTotal)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 font-bold text-slate-900">
                      <span>جمع ناخالص پرداختی:</span>
                      <span className="font-mono">
                        {formatCurrencyTomans(viewingPayslip.grossSalary)}
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
                        <span>کسر مساعده دریافتی:</span>
                        <span className="font-mono">
                          -{formatCurrencyTomans(viewingPayslip.advancesTotal)}
                        </span>
                      </div>
                    )}
                    {viewingPayslip.penaltiesTotal > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-100 text-rose-700">
                        <span>کسورات انضباطی / تاخیر:</span>
                        <span className="font-mono">
                          -{formatCurrencyTomans(viewingPayslip.penaltiesTotal)}
                        </span>
                      </div>
                    )}
                    {viewingPayslip.insuranceDeduction === 0 && viewingPayslip.taxDeduction === 0 && viewingPayslip.advancesTotal === 0 && viewingPayslip.penaltiesTotal === 0 && (
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
                            viewingPayslip.penaltiesTotal
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

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

      {/* BONUS / PENALTY MODAL */}
      {isBonusPenaltyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Gift className="w-4 h-4 text-indigo-600" />
                <span>ثبت پاداش یا جریمه انضباطی پرسنل</span>
              </h3>
              <button
                onClick={() => setIsBonusPenaltyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBonusPenalty} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">پرسنل هدف</label>
                <select
                  value={bpForm.employeeId}
                  onChange={(e) => setBpForm({ ...bpForm, employeeId: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">نوع تعدیل</label>
                  <select
                    value={bpForm.type}
                    onChange={(e) => setBpForm({ ...bpForm, type: e.target.value as any })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-semibold"
                  >
                    <option value="BONUS">پاداش تشویقی (+)</option>
                    <option value="PENALTY">جریمه انضباطی (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">مبلغ (تومان)</label>
                  <input
                    type="number"
                    required
                    value={bpForm.amount}
                    onChange={(e) => setBpForm({ ...bpForm, amount: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">عنوان</label>
                <input
                  type="text"
                  required
                  value={bpForm.title}
                  onChange={(e) => setBpForm({ ...bpForm, title: e.target.value })}
                  placeholder="مثال: تسریع در تکمیل سفارش کارگاه"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">توضیحات و مستندات</label>
                <textarea
                  rows={2}
                  value={bpForm.description}
                  onChange={(e) => setBpForm({ ...bpForm, description: e.target.value })}
                  placeholder="علت تشویق یا تنبیه را شرح دهید..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
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
                  ثبت و اعمال در حقوق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
