import React, { useState } from 'react';
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  QrCode,
  MapPin,
  Plus,
  X,
  Camera,
  Zap,
} from 'lucide-react';
import { AttendanceRecord, Employee, Shift, User as AppUser } from '../../types';
import {
  getTodayShamsi,
  minutesToHoursAndMinutes,
  getCurrentTimeStr,
} from '../../utils/dateUtils';
import { StorageService } from '../../services/storage';
import { ShamsiDatePicker } from '../common/ShamsiDatePicker';
import { CameraQrScannerModal } from './CameraQrScannerModal';

interface AttendanceViewProps {
  attendance: AttendanceRecord[];
  employees: Employee[];
  shifts: Shift[];
  onRefresh: () => void;
  canManage: boolean;
  currentUser?: AppUser;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  attendance,
  employees,
  shifts,
  onRefresh,
  canManage,
  currentUser,
}) => {
  const isEmployeeRole = currentUser?.role === 'EMPLOYEE';
  const currentEmp =
    employees.find((e) => e.id === currentUser?.employeeId) ||
    employees.find((e) => e.email === currentUser?.email) ||
    employees[2];

  const todayStr = getTodayShamsi();
  const todayRecord = currentEmp
    ? attendance.find((a) => a.employeeId === currentEmp.id && a.date === todayStr)
    : undefined;

  const [selectedDate, setSelectedDate] = useState(getTodayShamsi());
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [personalActionMsg, setPersonalActionMsg] = useState<{ success: boolean; text: string } | null>(null);

  const handlePersonalClockIn = () => {
    if (!currentEmp) return;
    const settings = StorageService.getSettings();
    const assignedWs = settings.workshops?.find(w => w.id === currentEmp.workshopId) || settings.workshops?.[0];
    const coords = assignedWs ? { lat: assignedWs.lat, lng: assignedWs.lng } : { lat: 36.37652, lng: 59.50812 };
    const res = StorageService.clockIn(currentEmp.id, 'GPS', coords);
    setPersonalActionMsg({ success: res.success, text: res.message });
    onRefresh();
    setTimeout(() => setPersonalActionMsg(null), 5000);
  };

  const handlePersonalClockOut = () => {
    if (!currentEmp) return;
    const settings = StorageService.getSettings();
    const assignedWs = settings.workshops?.find(w => w.id === currentEmp.workshopId) || settings.workshops?.[0];
    const coords = assignedWs ? { lat: assignedWs.lat, lng: assignedWs.lng } : { lat: 36.37652, lng: 59.50812 };
    const res = StorageService.clockOut(currentEmp.id, 'GPS', coords);
    setPersonalActionMsg({ success: res.success, text: res.message });
    onRefresh();
    setTimeout(() => setPersonalActionMsg(null), 5000);
  };

  // Manual Attendance Form
  const [manualForm, setManualForm] = useState({
    employeeId: employees[0]?.id || '',
    date: getTodayShamsi(),
    checkInTime: '07:00',
    checkOutTime: '16:00',
    status: 'PRESENT' as AttendanceRecord['status'],
    notes: '',
  });

  const filteredRecords = attendance.filter((rec) => {
    if (isEmployeeRole && currentEmp && rec.employeeId !== currentEmp.id) {
      return false;
    }
    const matchesDate = !selectedDate || rec.date === selectedDate;
    const matchesStatus = statusFilter === 'ALL' || rec.status === statusFilter;
    return matchesDate && matchesStatus;
  });

  const getStatusBadge = (status: AttendanceRecord['status'], lateMins: number) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> حاضر به موقع
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3" /> تاخیر ({lateMins} دقیقه)
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3" /> غیبت
          </span>
        );
      case 'ON_LEAVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Calendar className="w-3 h-3" /> مرخصی
          </span>
        );
      case 'HOLIDAY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            تعطیل رسمی
          </span>
        );
      default:
        return null;
    }
  };

  const getMethodBadge = (method?: string) => {
    if (!method) return null;
    if (method === 'QR_CAMERA_GPS') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
          <Camera className="w-3 h-3 text-emerald-600" /> دوربین و GPS
        </span>
      );
    }
    if (method === 'QR_CODE') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
          <QrCode className="w-3 h-3" /> کیوسک QR
        </span>
      );
    }
    if (method === 'GPS') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded">
          <MapPin className="w-3 h-3" /> موقعیت GPS
        </span>
      );
    }
    return (
      <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
        ثبت دستی
      </span>
    );
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const settings = StorageService.getSettings();
    const emp = employees.find((e) => e.id === manualForm.employeeId);
    const shifts = StorageService.getShifts();
    const shift = shifts.find((s) => s.id === emp?.shiftId) || shifts[0];

    const existing = attendance.find(
      (a) => a.employeeId === manualForm.employeeId && a.date === manualForm.date
    );

    let durationMins = 0;
    let lateMins = 0;
    let earlyExitMins = 0;
    let overtimeMins = 0;

    if (manualForm.checkInTime && manualForm.checkOutTime) {
      const [inH, inM] = manualForm.checkInTime.split(':').map(Number);
      const [outH, outM] = manualForm.checkOutTime.split(':').map(Number);
      const inTotal = inH * 60 + inM;
      const outTotal = outH * 60 + outM;

      if (outTotal >= inTotal) {
        const rawMins = outTotal - inTotal;
        const breakMins = (rawMins >= 240 && shift?.breakDurationMinutes) ? shift.breakDurationMinutes : 0;
        durationMins = Math.max(0, rawMins - breakMins);

        if (shift) {
          const [startH, startM] = shift.startTime.split(':').map(Number);
          const startTotal = startH * 60 + startM;
          if (inTotal > startTotal + (shift.lateToleranceMinutes || 15)) {
            lateMins = inTotal - startTotal;
          }

          // Check if Thursday
          const isThursday = new Date().getDay() === 4;
          const scheduledEndTime = (isThursday && shift.thursdayEndTime) ? shift.thursdayEndTime : shift.endTime;
          const [endH, endM] = scheduledEndTime.split(':').map(Number);
          const endTotal = endH * 60 + endM;

          if (outTotal > endTotal) {
            overtimeMins = outTotal - endTotal;
          } else if (outTotal < endTotal - (shift.earlyExitToleranceMinutes || 10)) {
            earlyExitMins = endTotal - outTotal;
          }
        }
      }
    }

    const newRecord: AttendanceRecord = {
      id: existing ? existing.id : `att_${Date.now()}`,
      companyId: settings.id,
      employeeId: manualForm.employeeId,
      date: manualForm.date,
      checkInTime: manualForm.checkInTime,
      checkOutTime: manualForm.checkOutTime,
      workDurationMinutes: durationMins,
      lateMinutes: lateMins,
      earlyExitMinutes: earlyExitMins,
      overtimeMinutes: overtimeMins,
      status: manualForm.status,
      checkInMethod: 'MANUAL',
      checkOutMethod: 'MANUAL',
      approvalStatus: 'APPROVED',
      notes: manualForm.notes || 'ثبت دستی تردد توسط مدیریت',
    };

    const updatedList = existing
      ? attendance.map((a) => (a.id === existing.id ? newRecord : a))
      : [newRecord, ...attendance];

    StorageService.saveAttendance(updatedList);
    StorageService.addAuditLog(
      'ثبت تردد دستی',
      'حضور و غیاب',
      `ثبت دستی تردد ${emp ? `${emp.firstName} ${emp.lastName}` : manualForm.employeeId} برای تاریخ ${manualForm.date} (کارکرد: ${durationMins} دقیقه)`
    );
    setIsManualModalOpen(false);
    onRefresh();
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* 1. PERSONAL CLOCK-IN/OUT CARD FOR LOGGED-IN EMPLOYEE */}
      {isEmployeeRole && currentEmp && (
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 lg:p-6 rounded-3xl shadow-lg border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                {currentEmp.avatarUrl ? (
                  <img src={currentEmp.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  currentEmp.firstName.charAt(0)
                )}
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  میز کار شخصی: {currentEmp.firstName} {currentEmp.lastName}
                </h3>
                <p className="text-xs text-indigo-200">
                  {currentEmp.position} | کد پرسنلی: {currentEmp.personalCode}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 w-fit">
              <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>ساعت زنده: {getCurrentTimeStr()}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
                <span>موقعیت مجاز کارگاه (محدوده استاندارد ۲۰ متر)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  وضعیت تردد امروز:{' '}
                  {!todayRecord
                    ? 'هنوز ثبت نشده'
                    : todayRecord.checkOutTime
                    ? `تکمیل شده (ورود: ${todayRecord.checkInTime} | خروج: ${todayRecord.checkOutTime})`
                    : `مشغول به کار (ورود در ${todayRecord.checkInTime})`}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsScannerModalOpen(true)}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4 text-emerald-300" />
                <span>اسکن تابلو کارگاه (دوربین و GPS)</span>
              </button>

              {!todayRecord ? (
                <button
                  type="button"
                  onClick={handlePersonalClockIn}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/25 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>ثبت ورود فوری</span>
                </button>
              ) : !todayRecord.checkOutTime ? (
                <button
                  type="button"
                  onClick={handlePersonalClockOut}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-rose-500/25 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ثبت خروج و محاسبه اضافه‌کار</span>
                </button>
              ) : (
                <div className="px-4 py-2.5 rounded-2xl bg-white/10 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                  تردد امروز تکمیل شد
                </div>
              )}
            </div>
          </div>

          {personalActionMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                personalActionMsg.success
                  ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-200'
                  : 'bg-rose-950/80 border border-rose-500 text-rose-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{personalActionMsg.text}</span>
            </div>
          )}
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <span>{isEmployeeRole ? 'سابقه ترددهای من' : 'گزارش و مدیریت حضور و غیاب پرسنل'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isEmployeeRole
              ? 'مشاهده لاگ ورود، خروج، کسر کار و اضافه‌کاری ثبت شده'
              : 'پایش بلادرنگ ورود و خروج، ژئوفنسینگ کارگاه، اسکن دوربین و ثبت دستی تردد'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsScannerModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>اسکن بارکد کارگاه با دوربین و GPS</span>
          </button>
          {canManage && !isEmployeeRole && (
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>ثبت دستی تردد</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">تاریخ:</span>
            <div className="w-52">
              <ShamsiDatePicker
                value={selectedDate}
                onChange={(val) => setSelectedDate(val)}
                placeholder="انتخاب تاریخ..."
              />
            </div>
          </div>
          <button
            onClick={() => setSelectedDate(getTodayShamsi())}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 cursor-pointer"
          >
            امروز
          </button>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded cursor-pointer"
            >
              نمایش همه تاریخ‌ها
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 py-2 px-3 bg-white text-slate-700 focus:outline-none"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="PRESENT">حاضر به موقع</option>
            <option value="LATE">دارای تاخیر</option>
            <option value="ABSENT">غایب</option>
            <option value="ON_LEAVE">در مرخصی</option>
          </select>
        </div>
      </div>

      {/* Attendance Records: Cards (Mobile) & Table (Desktop) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Mobile View: Cards */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredRecords.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              هیچ رکورد ترددی برای این تاریخ یافت نشد.
            </div>
          ) : (
            filteredRecords.map((rec) => {
              const emp = employees.find((e) => e.id === rec.employeeId);
              return (
                <div key={rec.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {emp?.avatarUrl ? (
                        <img
                          src={emp.avatarUrl}
                          alt={emp ? `${emp.firstName} ${emp.lastName}` : ''}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {emp ? emp.firstName.charAt(0) : '؟'}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {emp ? `${emp.firstName} ${emp.lastName}` : rec.employeeId}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {emp?.position} <span className="font-mono text-slate-500">({emp?.personalCode})</span>
                        </div>
                      </div>
                    </div>
                    <div>{getStatusBadge(rec.status, rec.lateMinutes)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[11px]">زمان ورود:</span>
                      {rec.checkInTime ? (
                        <span className="font-mono font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                          <LogIn className="w-3 h-3 text-emerald-500" />
                          {rec.checkInTime}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">-</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">زمان خروج:</span>
                      {rec.checkOutTime ? (
                        <span className="font-mono font-bold text-rose-700 flex items-center gap-1 mt-0.5">
                          <LogOut className="w-3 h-3 text-rose-500" />
                          {rec.checkOutTime}
                        </span>
                      ) : rec.checkInTime ? (
                        <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          در حال کار در کارگاه
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">-</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">مدت کارکرد خالص:</span>
                      <span className="font-semibold text-slate-800">
                        {minutesToHoursAndMinutes(rec.workDurationMinutes)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">اضافه‌کاری:</span>
                      <span className="font-mono font-semibold text-indigo-600">
                        {rec.overtimeMinutes > 0 ? `+${rec.overtimeMinutes} دقیقه` : '---'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>تاریخ: <strong className="font-mono text-slate-600">{rec.date}</strong></span>
                    <div>{getMethodBadge(rec.checkInMethod)}</div>
                  </div>
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
                <th className="py-3.5 px-4">کد پرسنلی</th>
                <th className="py-3.5 px-4">ورود (Check In)</th>
                <th className="py-3.5 px-4">خروج (Check Out)</th>
                <th className="py-3.5 px-4">کارکرد خالص</th>
                <th className="py-3.5 px-4">تاخیر / تعجیل</th>
                <th className="py-3.5 px-4">اضافه‌کاری</th>
                <th className="py-3.5 px-4">وضعیت</th>
                <th className="py-3.5 px-4">روش ثبت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    هیچ رکورد ترددی برای این تاریخ ثبت نشده است.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const emp = employees.find((e) => e.id === rec.employeeId);
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {emp?.avatarUrl ? (
                            <img
                              src={emp.avatarUrl}
                              alt={emp ? `${emp.firstName} ${emp.lastName}` : ''}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {emp ? emp.firstName.charAt(0) : '؟'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {emp ? `${emp.firstName} ${emp.lastName}` : rec.employeeId}
                            </div>
                            <span className="block text-[11px] font-normal text-slate-400">
                              {emp?.position}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {emp?.personalCode || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {rec.checkInTime ? (
                          <div className="flex items-center gap-1 font-mono font-semibold text-emerald-700">
                            <LogIn className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{rec.checkInTime}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {rec.checkOutTime ? (
                          <div className="flex items-center gap-1 font-mono font-semibold text-rose-700">
                            <LogOut className="w-3.5 h-3.5 text-rose-500" />
                            <span>{rec.checkOutTime}</span>
                          </div>
                        ) : rec.checkInTime ? (
                          <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                            در حال کار
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {minutesToHoursAndMinutes(rec.workDurationMinutes)}
                      </td>
                      <td className="py-3 px-4">
                        {rec.lateMinutes > 0 ? (
                          <span className="text-rose-600 font-semibold">
                            {rec.lateMinutes} دقیقه تاخیر
                          </span>
                        ) : rec.earlyExitMinutes > 0 ? (
                          <span className="text-amber-600 font-semibold">
                            {rec.earlyExitMinutes} دقیقه تعجیل
                          </span>
                        ) : (
                          <span className="text-slate-400">بدون تاخیر</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {rec.overtimeMinutes > 0 ? (
                          <span className="text-indigo-600 font-semibold font-mono">
                            +{rec.overtimeMinutes} دقیقه
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">---</span>
                        )}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(rec.status, rec.lateMinutes)}</td>
                      <td className="py-3 px-4">{getMethodBadge(rec.checkInMethod)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MANUAL ATTENDANCE MODAL */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>ثبت دستی تردد پرسنل</span>
              </h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  انتخاب پرسنل
                </label>
                <select
                  value={manualForm.employeeId}
                  onChange={(e) => setManualForm({ ...manualForm, employeeId: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.personalCode} - {emp.position})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <ShamsiDatePicker
                  label="تاریخ تردد"
                  value={manualForm.date}
                  onChange={(val) => setManualForm({ ...manualForm, date: val })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ساعت ورود
                  </label>
                  <input
                    type="time"
                    value={manualForm.checkInTime}
                    onChange={(e) => setManualForm({ ...manualForm, checkInTime: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ساعت خروج
                  </label>
                  <input
                    type="time"
                    value={manualForm.checkOutTime}
                    onChange={(e) => setManualForm({ ...manualForm, checkOutTime: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  وضعیت تردد
                </label>
                <select
                  value={manualForm.status}
                  onChange={(e) => setManualForm({ ...manualForm, status: e.target.value as any })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  <option value="PRESENT">حاضر به موقع</option>
                  <option value="LATE">دارای تاخیر</option>
                  <option value="ON_LEAVE">در مرخصی</option>
                  <option value="ABSENT">غیبت غیرموجه</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  علت ثبت دستی یا توضیحات
                </label>
                <textarea
                  rows={2}
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  placeholder="مثال: فراموشی اسکن، ماموریت اداری و..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  ثبت رکورد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE CAMERA QR & GPS SCANNER MODAL */}
      <CameraQrScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        currentUserEmployee={currentEmp}
        allEmployees={employees}
        shifts={shifts}
        onSuccessPunch={() => {
          onRefresh();
        }}
      />
    </div>
  );
};
