import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Check,
  X,
  HelpCircle,
  Trash2
} from 'lucide-react';
import { AdvanceRequest, Employee, User } from '../../types';
import { StorageService } from '../../services/storage';
import {
  formatCurrencyTomans,
  getTodayShamsi,
  getTodayShamsiDetailed,
} from '../../utils/dateUtils';

interface AdvancesViewProps {
  advances: AdvanceRequest[];
  employees: Employee[];
  currentUser: User;
  onRefresh: () => void;
  canApprove: boolean;
}

export const AdvancesView: React.FC<AdvancesViewProps> = ({
  advances,
  employees,
  currentUser,
  onRefresh,
  canApprove,
}) => {
  const shamsiDetail = getTodayShamsiDetailed();
  const currentMonthStr = shamsiDetail.dateString.substring(0, 7);

  // Dynamic month options
  const persianMonthNames = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];
  const repayMonthOptions = Array.from({ length: 12 }, (_, i) => {
    const m = (i + 1).toString().padStart(2, '0');
    return {
      value: `${shamsiDetail.year}/${m}`,
      label: `${persianMonthNames[i]} ${shamsiDetail.year}${`${shamsiDetail.year}/${m}` === currentMonthStr ? ' (دوره جاری)' : ''}`
    };
  });

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deletingAdvanceId, setDeletingAdvanceId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    employeeId: currentUser.employeeId || employees[0]?.id || '',
    amount: 5000000,
    repayMonth: currentMonthStr,
    reason: '',
  });

  const handleOpenSubmitModal = () => {
    setFormError(null);
    setFormData({
      employeeId: currentUser.employeeId || employees[0]?.id || '',
      amount: 5000000,
      repayMonth: currentMonthStr,
      reason: '',
    });
    setIsSubmitModalOpen(true);
  };

  const filteredAdvances = advances.filter((adv) => {
    if (currentUser.role === 'EMPLOYEE') {
      if (!currentUser.employeeId || adv.employeeId !== currentUser.employeeId) {
        return false;
      }
    }
    return true;
  });

  const handleApprove = (id: string) => {
    StorageService.reviewAdvanceRequest(id, true, currentUser.name);
    onRefresh();
  };

  const handleReject = () => {
    if (!rejectingId) return;
    StorageService.reviewAdvanceRequest(
      rejectingId,
      false,
      currentUser.name,
      rejectionReason || 'عدم تایید بر اساس بودجه جاری ماه'
    );
    setRejectingId(null);
    setRejectionReason('');
    onRefresh();
  };

  const handleDeleteConfirm = () => {
    if (!deletingAdvanceId) return;
    StorageService.deleteAdvanceRequest(deletingAdvanceId);
    setDeletingAdvanceId(null);
    onRefresh();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const emp = employees.find((e) => e.id === formData.employeeId);
    if (!emp) return;

    if (!formData.reason.trim()) {
      setFormError('لطفاً دلیل درخواست مساعده را قید نمایید.');
      return;
    }

    const result = StorageService.submitAdvanceRequest({
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      amount: formData.amount,
      requestDate: getTodayShamsi(),
      repayMonth: formData.repayMonth,
      reason: formData.reason.trim(),
    });

    if (!result.success) {
      setFormError(result.message);
      return;
    }

    setIsSubmitModalOpen(false);
    onRefresh();
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-600" />
            <span>مدیریت درخواست‌های مساعده حقوقی</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            فرآیند درخواست، اعتبارسنجی سقف ۳۰٪ و تایید کسر از حقوق پایان ماه
          </p>
        </div>
        <button
          onClick={handleOpenSubmitModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 text-indigo-400" />
          <span>درخواست مساعده جدید</span>
        </button>
      </div>

      {/* Policy Notice Box */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
        <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800 block mb-0.5">ضوابط اعطای مساعده:</span>
          ثبت مساعده صرفاً در بازه روزهای ۱۵ الی ۲۰ هر ماه، حداکثر تا سقف ۳۰ درصد حقوق پایه ماهیانه پرسنل و یک نوبت در هر ماه کاری امکان‌پذیر است.
        </div>
      </div>

      {/* Advances: Cards (Mobile) & Table (Desktop) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Mobile View: Cards */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredAdvances.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              هیچ درخواست مساعده‌ای ثبت نشده است.
            </div>
          ) : (
            filteredAdvances.map((adv) => (
              <div key={adv.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{adv.employeeName}</div>
                    <div className="text-xs text-emerald-600 font-bold font-mono mt-0.5">
                      {formatCurrencyTomans(adv.amount)}
                    </div>
                  </div>
                  <div>
                    {adv.status === 'APPROVED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-3 h-3" /> تایید شده
                      </span>
                    ) : adv.status === 'REJECTED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3 h-3" /> رد شده
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                        <AlertCircle className="w-3 h-3" /> در انتظار تایید
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">تاریخ درخواست:</span>
                    <span className="font-mono text-slate-700">{adv.requestDate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">دوره کسر از حقوق:</span>
                    <span className="font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {adv.repayMonth}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/60">
                    <span className="text-slate-400 shrink-0">علت نیاز:</span>
                    <span className="text-slate-700 text-right">{adv.reason}</span>
                  </div>
                  {adv.reviewedBy && (
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 text-slate-500">
                      <span>بررسی کننده: <strong>{adv.reviewedBy}</strong></span>
                      <span className="text-[10px] text-slate-400">{adv.reviewedAt}</span>
                    </div>
                  )}
                </div>

                {/* Manager Action Buttons on Mobile Card */}
                {canApprove && adv.status === 'PENDING' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(adv.id)}
                      className="py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>تایید و پرداخت</span>
                    </button>
                    <button
                      onClick={() => setRejectingId(adv.id)}
                      className="py-2 px-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>رد درخواست</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200/80 font-semibold">
              <tr>
                <th className="py-3.5 px-4">پرسنل متقاضی</th>
                <th className="py-3.5 px-4">مبلغ مساعده</th>
                <th className="py-3.5 px-4">تاریخ ثبت</th>
                <th className="py-3.5 px-4">ماه تسویه</th>
                <th className="py-3.5 px-4">دلیل درخواست</th>
                <th className="py-3.5 px-4">وضعیت</th>
                <th className="py-3.5 px-4">بررسی کننده</th>
                {canApprove && <th className="py-3.5 px-4 text-center">اقدامات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAdvances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    هیچ موردی ثبت نشده است.
                  </td>
                </tr>
              ) : (
                filteredAdvances.map((adv) => (
                  <tr key={adv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{adv.employeeName}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600 font-mono">
                      {formatCurrencyTomans(adv.amount)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">{adv.requestDate}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono font-medium text-[11px]">
                        {adv.repayMonth}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600">{adv.reason}</td>
                    <td className="py-3 px-4">
                      {adv.status === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3" /> تایید شده
                        </span>
                      ) : adv.status === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" /> رد شده
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                          <AlertCircle className="w-3 h-3" /> در انتظار
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {adv.reviewedBy ? (
                        <div>
                          <div className="font-semibold text-slate-700">{adv.reviewedBy}</div>
                          <div className="text-[10px] text-slate-400">{adv.reviewedAt}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {canApprove && adv.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(adv.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 cursor-pointer shadow-xs"
                              title="تایید"
                            >
                              <Check className="w-3 h-3" />
                              <span>تایید</span>
                            </button>
                            <button
                              onClick={() => setRejectingId(adv.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center gap-1 cursor-pointer"
                              title="رد درخواست"
                            >
                              <X className="w-3 h-3" />
                              <span>رد</span>
                            </button>
                          </>
                        )}
                        {(canApprove || (currentUser.employeeId === adv.employeeId && adv.status === 'PENDING')) && (
                          <button
                            onClick={() => setDeletingAdvanceId(adv.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REJECT MODAL */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-800">علت رد درخواست مساعده:</h3>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="توضیحات دلیل رد درخواست..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-100 text-slate-600 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
              >
                ثبت رد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingAdvanceId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">حذف درخواست مساعده</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              آیا از حذف این درخواست مساعده اطمینان دارید؟
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingAdvanceId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs"
              >
                تایید و حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT ADVANCE MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-visible animate-in fade-in zoom-in-95 duration-150 relative">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4 text-indigo-600" />
                <span>ثبت درخواست مساعده حقوقی</span>
              </h3>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">پرسنل متقاضی</label>
                {currentUser.role === 'EMPLOYEE' ? (
                  <div className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-800 flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {employees.find((e) => e.id === formData.employeeId)?.firstName || ''}{' '}
                      {employees.find((e) => e.id === formData.employeeId)?.lastName || currentUser.name}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      حقوق پایه: {formatCurrencyTomans(employees.find((e) => e.id === formData.employeeId)?.baseSalary || 0)}
                    </span>
                  </div>
                ) : (
                  <select
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({formatCurrencyTomans(emp.baseSalary)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    مبلغ مساعده (تومان) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block font-mono font-medium">
                    معادل: {formatCurrencyTomans(formData.amount)}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    دوره تسویه <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.repayMonth}
                    onChange={(e) => setFormData({ ...formData, repayMonth: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono bg-white"
                  >
                    {repayMonthOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">علت و ضرورت دریافت مساعده</label>
                <textarea
                  rows={3}
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="دلیل درخواست مساعده را شرح دهید..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  ثبت نهایی درخواست
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
