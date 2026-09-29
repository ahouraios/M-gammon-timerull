import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  X,
  Coffee
} from 'lucide-react';
import { Shift } from '../../types';
import { StorageService } from '../../services/storage';

interface SchedulesViewProps {
  shifts: Shift[];
  onRefresh: () => void;
  canEdit: boolean;
}

const WEEK_DAYS = [
  { id: 0, name: 'شنبه' },
  { id: 1, name: 'یکشنبه' },
  { id: 2, name: 'دوشنبه' },
  { id: 3, name: 'سه‌شنبه' },
  { id: 4, name: 'چهارشنبه' },
  { id: 5, name: 'پنج‌شنبه' },
  { id: 6, name: 'جمعه' },
];

export const SchedulesView: React.FC<SchedulesViewProps> = ({
  shifts,
  onRefresh,
  canEdit,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [deletingShift, setDeletingShift] = useState<{ id: string; name: string } | null>(null);

  const defaultFormData: Omit<Shift, 'id' | 'companyId'> = {
    name: '',
    type: 'MORNING',
    startTime: '07:00',
    endTime: '16:00',
    thursdayEndTime: '13:00',
    breakDurationMinutes: 60,
    workDays: [0, 1, 2, 3, 4, 5],
    lateToleranceMinutes: 15,
    earlyExitToleranceMinutes: 10,
  };

  const [formData, setFormData] = useState<Omit<Shift, 'id' | 'companyId'>>(defaultFormData);

  const handleOpenAdd = () => {
    setEditingShift(null);
    setFormData(defaultFormData);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      type: shift.type,
      startTime: shift.startTime,
      endTime: shift.endTime,
      thursdayEndTime: shift.thursdayEndTime || '13:00',
      breakDurationMinutes: shift.breakDurationMinutes,
      workDays: [...shift.workDays],
      lateToleranceMinutes: shift.lateToleranceMinutes,
      earlyExitToleranceMinutes: shift.earlyExitToleranceMinutes,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    setDeletingShift({ id, name });
  };

  const handleConfirmDeleteShift = () => {
    if (!deletingShift) return;
    StorageService.deleteShift(deletingShift.id);
    setDeletingShift(null);
    onRefresh();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const settings = StorageService.getSettings();

    if (editingShift) {
      StorageService.updateShift({
        ...formData,
        id: editingShift.id,
        companyId: editingShift.companyId,
      });
    } else {
      StorageService.addShift({
        ...formData,
        id: `shift_${Date.now()}`,
        companyId: settings.id,
      });
    }
    setIsModalOpen(false);
    onRefresh();
  };

  const toggleDay = (dayId: number) => {
    if (formData.workDays.includes(dayId)) {
      setFormData({
        ...formData,
        workDays: formData.workDays.filter((d) => d !== dayId),
      });
    } else {
      setFormData({
        ...formData,
        workDays: [...formData.workDays, dayId].sort(),
      });
    }
  };

  const getShiftIcon = (type: Shift['type']) => {
    switch (type) {
      case 'MORNING':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'EVENING':
        return <Sunset className="w-4 h-4 text-orange-500" />;
      case 'NIGHT':
        return <Moon className="w-4 h-4 text-indigo-400" />;
      case 'FLEXIBLE':
        return <Sparkles className="w-4 h-4 text-teal-500" />;
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            <span>شیفت‌ها و الگوهای کاری</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تعریف ساعات کاری، شناوری ورود، پنج‌شنبه‌ها و روزهای مجاز تردد کارگاه
          </p>
        </div>
        {canEdit && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>تعریف شیفت جدید</span>
          </button>
        )}
      </div>

      {/* Standard Work Schedule Example Preview Card */}
      <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 lg:p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800">
              الگوی پایه شیفت کارگاهی M.GAMMON
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
            شنبه تا چهارشنبه: ۰۷:۰۰ الی ۱۶:۰۰ | پنج‌شنبه‌ها: ۰۷:۰۰ الی ۱۳:۰۰
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          مهلت شناوری ورود ۱۵ دقیقه بدون کسر کار است. ترددهای بعد از مهلت به صورت تاخیر غیرمجاز و کسری در پایان ماه محاسبه می‌گردد.
        </p>
      </div>

      {/* Shifts Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {shifts.map((shift) => (
          <div
            key={shift.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                    {getShiftIcon(shift.type)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{shift.name}</h4>
                    <span className="text-[11px] text-slate-400">
                      {shift.type === 'MORNING'
                        ? 'شیفت صبح / روزانه'
                        : shift.type === 'EVENING'
                        ? 'شیفت عصرگاهی'
                        : shift.type === 'NIGHT'
                        ? 'شیفت شب'
                        : 'شیفت شناور'}
                    </span>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(shift)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {shifts.length > 1 && (
                      <button
                        onClick={() => handleDelete(shift.id, shift.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Timing Details */}
              <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">ساعت کاری عادی:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {shift.startTime} الی {shift.endTime}
                  </span>
                </div>
                {shift.thursdayEndTime && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">پایان کار پنج‌شنبه:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {shift.thursdayEndTime}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Coffee className="w-3.5 h-3.5 text-slate-400" />
                    استراحت و ناهار:
                  </span>
                  <span className="font-semibold text-slate-700">
                    {shift.breakDurationMinutes} دقیقه
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">مهلت تاخیر مجاز:</span>
                  <span className="font-semibold text-emerald-600">
                    {shift.lateToleranceMinutes} دقیقه
                  </span>
                </div>
              </div>

              {/* Working Days */}
              <div className="mt-4">
                <span className="text-[11px] text-slate-400 block mb-2 font-medium">
                  روزهای فعال در هفته:
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {WEEK_DAYS.map((d) => {
                    const isWorking = shift.workDays.includes(d.id);
                    return (
                      <span
                        key={d.id}
                        className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          isWorking
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-slate-100 text-slate-300'
                        }`}
                      >
                        {d.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SHIFT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                <span>{editingShift ? 'ویرایش مشخصات شیفت' : 'تعریف شیفت کاری جدید'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  عنوان شیفت <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: شیفت روزانه کارگاه مرکزی"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">نوع شیفت</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="MORNING">صبح / روزانه (عادی)</option>
                    <option value="EVENING">عصرگاهی</option>
                    <option value="NIGHT">شب‌کاری</option>
                    <option value="FLEXIBLE">شناور</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    زمان استراحت (دقیقه)
                  </label>
                  <input
                    type="number"
                    value={formData.breakDurationMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, breakDurationMinutes: Number(e.target.value) })
                    }
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ساعت شروع</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ساعت پایان</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">پایان پنج‌شنبه</label>
                  <input
                    type="time"
                    value={formData.thursdayEndTime}
                    onChange={(e) => setFormData({ ...formData, thursdayEndTime: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    مهلت تاخیر مجاز (دقیقه)
                  </label>
                  <input
                    type="number"
                    value={formData.lateToleranceMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, lateToleranceMinutes: Number(e.target.value) })
                    }
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    مهلت تعجیل خروج (دقیقه)
                  </label>
                  <input
                    type="number"
                    value={formData.earlyExitToleranceMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, earlyExitToleranceMinutes: Number(e.target.value) })
                    }
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Work days picker */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  روزهای کاری مجاز این شیفت:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {WEEK_DAYS.map((d) => {
                    const isSelected = formData.workDays.includes(d.id);
                    return (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => toggleDay(d.id)}
                        className={`py-2 text-xs rounded-lg font-medium transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {d.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  ذخیره شیفت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingShift && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 p-5 space-y-4 shadow-2xl text-right">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">حذف شیفت کاری</h3>
                <p className="text-[11px] text-slate-400">شیفت {deletingShift.name}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              آیا از حذف این شیفت اطمینان دارید؟ پرسنل دارای این شیفت به شیفت پیش‌فرض منتقل خواهند شد.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingShift(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteShift}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs"
              >
                تایید و حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
