import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  Filter,
  User as UserIcon,
  Users,
  Download,
  Database,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  Search,
  ArrowDownToLine,
  ShieldCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  AttendanceRecord,
  Employee,
  SalaryRecord,
  LeaveRequest,
  AdvanceRequest,
  CompanySettings
} from '../../types';
import {
  formatCurrencyTomans,
  formatNumberFa,
  getTodayShamsi,
} from '../../utils/dateUtils';
import { StorageService } from '../../services/storage';

interface ReportsViewProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  salaries: SalaryRecord[];
  leaves?: LeaveRequest[];
  advances?: AdvanceRequest[];
  settings?: CompanySettings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  employees,
  attendance,
  salaries,
  leaves = [],
  advances = [],
  settings,
}) => {
  const [reportType, setReportType] = useState<'ALL' | 'DAILY' | 'MONTHLY'>('MONTHLY');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('ALL');
  const [activeReportTab, setActiveReportTab] = useState<'SUMMARY' | 'ATTENDANCE_LOGS' | 'LEAVES_ADVANCES'>('SUMMARY');
  const [searchTerm, setSearchTerm] = useState('');
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);

  const departments = useMemo(() => {
    return ['ALL', ...Array.from(new Set(employees.map((e) => e.department).filter(Boolean)))];
  }, [employees]);

  // Filtered employees list based on department and search
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchDept = selectedDept === 'ALL' || e.department === selectedDept;
      const fullName = `${e.firstName} ${e.lastName} ${e.personalCode} ${e.nationalCode}`;
      const matchSearch = searchTerm.trim() === '' || fullName.includes(searchTerm.trim());
      const matchSingleEmp = selectedEmployeeId === 'ALL' || e.id === selectedEmployeeId;
      return matchDept && matchSearch && matchSingleEmp;
    });
  }, [employees, selectedDept, searchTerm, selectedEmployeeId]);

  const selectedEmployeeObj = useMemo(() => {
    if (selectedEmployeeId === 'ALL') return null;
    return employees.find((e) => e.id === selectedEmployeeId) || null;
  }, [employees, selectedEmployeeId]);

  // Relevant attendance records
  const relevantAttendance = useMemo(() => {
    const validEmpIds = new Set(filteredEmployees.map((e) => e.id));
    return attendance.filter((a) => validEmpIds.has(a.employeeId));
  }, [filteredEmployees, attendance]);

  // Summary Metrics calculated dynamically
  const totalEmployeesCount = filteredEmployees.length;
  const totalLates = relevantAttendance.reduce((sum, a) => sum + (a.lateMinutes > 0 ? 1 : 0), 0);
  const totalLateMinutes = relevantAttendance.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
  const totalOvertimeMinutes = relevantAttendance.reduce((sum, a) => sum + (a.overtimeMinutes || 0), 0);
  const totalPresentCount = relevantAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'EARLY_LEAVE').length;

  // Chart data grouped by department
  const deptSummaryData = useMemo(() => {
    const depts = departments.filter((d) => d !== 'ALL');
    if (depts.length === 0) {
      return [{ name: 'تولید و کارگاه', حاضر: 100, تاخیر: 0, اضافه‌کار: 0 }];
    }
    return depts.map((deptName) => {
      const empsInDept = employees.filter((e) => e.department === deptName);
      const empIds = new Set(empsInDept.map((e) => e.id));
      const attInDept = attendance.filter((a) => empIds.has(a.employeeId));
      const latesCount = attInDept.filter((a) => (a.lateMinutes || 0) > 0).length;
      const totalAtt = attInDept.length || 1;
      const presentRate = Math.min(100, Math.round(((totalAtt - latesCount) / totalAtt) * 100));
      const lateRate = Math.min(100, Math.round((latesCount / totalAtt) * 100));
      const overtimeHours = Math.round(attInDept.reduce((s, a) => s + (a.overtimeMinutes || 0), 0) / 60);

      return {
        name: deptName,
        حاضر: presentRate || 100,
        تاخیر: lateRate || 0,
        'اضافه‌کار': overtimeHours || 0,
      };
    });
  }, [departments, employees, attendance]);

  // Export 1: All Employees Summary CSV (Excel UTF-8 BOM)
  const exportAllEmployeesToCsv = () => {
    const headers = [
      'کد پرسنلی',
      'نام و نام خانوادگی',
      'کد ملی',
      'شماره تماس',
      'واحد سازمانی',
      'سمت شغلی',
      'کارگاه',
      'حقوق پایه (تومان)',
      'تعداد روزهای ثبت تردد',
      'مجموع تاخیر (دقیقه)',
      'مجموع اضافه‌کاری (ساعت)',
      'مرخصی تایید شده (روز)',
      'مجموع مساعده‌ها (تومان)',
      'وضعیت'
    ];

    const rows = filteredEmployees.map((e) => {
      const empAtt = attendance.filter((a) => a.employeeId === e.id);
      const empLeaves = leaves.filter((l) => l.employeeId === e.id && l.status === 'APPROVED');
      const empAdvances = advances.filter((adv) => adv.employeeId === e.id && adv.status === 'APPROVED');

      const lateMins = empAtt.reduce((s, a) => s + (a.lateMinutes || 0), 0);
      const otHours = (empAtt.reduce((s, a) => s + (a.overtimeMinutes || 0), 0) / 60).toFixed(1);
      const leaveDays = empLeaves.reduce((s, l) => s + (l.durationDays || 1), 0);
      const advTotal = empAdvances.reduce((s, a) => s + (a.amount || 0), 0);

      return [
        `"${e.personalCode}"`,
        `"${e.firstName} ${e.lastName}"`,
        `"${e.nationalCode || ''}"`,
        `"${e.phone || ''}"`,
        `"${e.department}"`,
        `"${e.position}"`,
        `"${e.workshopId === 'ws_2' ? 'کارگاه ۲' : 'کارگاه ۱ (مشهد)'}"`,
        e.baseSalary,
        empAtt.length,
        lateMins,
        otHours,
        leaveDays,
        advTotal,
        e.status === 'ACTIVE' ? 'فعال' : 'غیرفعال'
      ];
    });

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MGAMMON_All_Employees_Report_${getTodayShamsi().replace(/\//g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export 2: Individual Employee Detailed Logs CSV
  const exportIndividualEmployeeCsv = (emp: Employee) => {
    const empAtt = attendance.filter((a) => a.employeeId === emp.id);
    const headers = [
      'تاریخ',
      'کد پرسنلی',
      'نام پرسنل',
      'ساعت ورود',
      'ساعت خروج',
      'مدت کارکرد (دقیقه)',
      'تاخیر ورود (دقیقه)',
      'تعجیل خروج (دقیقه)',
      'اضافه‌کاری (دقیقه)',
      'وضعیت حضور',
      'روش ثبت',
      'ملاحظات / توضیحات'
    ];

    const rows = empAtt.map((a) => [
      `"${a.date}"`,
      `"${emp.personalCode}"`,
      `"${emp.firstName} ${emp.lastName}"`,
      `"${a.checkInTime || '-'}"`,
      `"${a.checkOutTime || '-'}"`,
      a.workDurationMinutes || 0,
      a.lateMinutes || 0,
      a.earlyExitMinutes || 0,
      a.overtimeMinutes || 0,
      `"${a.status === 'PRESENT' ? 'حاضر' : a.status === 'LATE' ? 'با تاخیر' : a.status === 'ABSENT' ? 'غایب' : a.status}"`,
      `"${a.checkInMethod || 'سیستمی'}"`,
      `"${(a.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `MGAMMON_Log_${emp.personalCode}_${emp.lastName}_${getTodayShamsi().replace(/\//g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export 3: Complete Database JSON Backup
  const handleExportFullBackup = () => {
    const jsonStr = StorageService.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `MGAMMON_Database_Backup_${getTodayShamsi().replace(/\//g, '_')}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setBackupSuccessMsg('پشتیبان کامل کلیه اطلاعات دیتابیس (پرسنل، ترددها، مرخصی‌ها و فیش‌ها) با موفقیت دانلود و ذخیره شد.');
    setTimeout(() => setBackupSuccessMsg(null), 6000);
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                گزارشات آماری، خروجی داده‌ها و نسخه پشتیبان
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                شرکت مهندسی پزشکی ام گامون • خروجی اکسل تکی و تجمیعی • پشتیبان‌گیری کامل از داده‌ها
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Export CSV for Selected Scope */}
          {selectedEmployeeObj ? (
            <button
              onClick={() => exportIndividualEmployeeCsv(selectedEmployeeObj)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold transition-all shadow-xs cursor-pointer"
              title="خروجی ریز سوابق تردد این پرسنل در قالب فایل اکسل"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>اکسل تکی ({selectedEmployeeObj.lastName})</span>
            </button>
          ) : (
            <button
              onClick={exportAllEmployeesToCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold transition-all shadow-xs cursor-pointer"
              title="دانلود فایل اکسل حاوی گزارش جامع کلیه پرسنل"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>خروجی اکسل تجمیعی (کل پرسنل)</span>
            </button>
          )}

          {/* Full Database Backup JSON */}
          <button
            onClick={handleExportFullBackup}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-semibold transition-colors cursor-pointer"
            title="دانلود فایل پشتیبان کامل و امن از تمامی رکوردهای سیستم"
          >
            <Database className="w-4 h-4 text-indigo-600" />
            <span>پشتیبان کامل دیتابیس (JSON)</span>
          </button>

          {/* Print / PDF */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>چاپ رسمی / PDF</span>
          </button>
        </div>
      </div>

      {/* Success Notification for Backup */}
      {backupSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{backupSuccessMsg}</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-mono">امنیت داده‌ها تضمین شد</span>
        </div>
      )}

      {/* Filter and Scope Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Employee Selector (Single or All) */}
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>دامنه گزارش:</span>
          </div>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 py-2 px-3 bg-slate-50/60 text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
          >
            <option value="ALL">تمامی پرسنل (گزارش تجمیعی کل کارگاه)</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} ({emp.personalCode}) - {emp.department}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold mr-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>واحد:</span>
          </div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 py-2 px-3 bg-slate-50/60 text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === 'ALL' ? 'تمامی واحدها' : d}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Search Box */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجوی نام یا کد پرسنلی..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-200 py-2 pr-9 pl-3 bg-slate-50/60 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Selected Employee Quick Card (When 1 employee is chosen) */}
      {selectedEmployeeObj && (
        <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-base shadow-xs">
              {selectedEmployeeObj.firstName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  {selectedEmployeeObj.firstName} {selectedEmployeeObj.lastName}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-800 text-[11px] font-mono font-semibold">
                  {selectedEmployeeObj.personalCode}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                  {selectedEmployeeObj.status === 'ACTIVE' ? 'پرسنل فعال' : 'غیرفعال'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                واحد: <span className="font-medium text-slate-800">{selectedEmployeeObj.department}</span> | سمت: <span className="font-medium text-slate-800">{selectedEmployeeObj.position}</span> | حقوق پایه: <span className="font-medium text-slate-800">{formatCurrencyTomans(selectedEmployeeObj.baseSalary)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportIndividualEmployeeCsv(selectedEmployeeObj)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>دانلود سوابق اکسل این پرسنل</span>
            </button>
            <button
              onClick={() => setSelectedEmployeeId('ALL')}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              نمایش همه پرسنل
            </button>
          </div>
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-slate-400 text-xs mb-1">پرسنل مورد گزارش</div>
          <div className="text-2xl font-bold text-slate-800">
            {formatNumberFa(totalEmployeesCount)}{' '}
            <span className="text-xs font-normal text-slate-400">نفر</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-slate-400 text-xs mb-1">مجموع تاخیرات ثبت شده</div>
          <div className="text-2xl font-bold text-amber-600">
            {formatNumberFa(totalLateMinutes)}{' '}
            <span className="text-xs font-normal text-slate-400">دقیقه ({formatNumberFa(totalLates)} نوبت)</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-slate-400 text-xs mb-1">مجموع اضافه کاری مجاز</div>
          <div className="text-2xl font-bold text-indigo-600">
            {formatNumberFa(Math.round(totalOvertimeMinutes / 60))}{' '}
            <span className="text-xs font-normal text-slate-400">ساعت</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-slate-400 text-xs mb-1">تعداد رکوردهای ثبت تردد</div>
          <div className="text-2xl font-bold text-emerald-600">
            {formatNumberFa(relevantAttendance.length)}{' '}
            <span className="text-xs font-normal text-slate-400">ثبت کارگاهی</span>
          </div>
        </div>
      </div>

      {/* Tabs for Different Report Views */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveReportTab('SUMMARY')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeReportTab === 'SUMMARY'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>خلاصه کارکرد و حقوق تجمیعی ({filteredEmployees.length} نفر)</span>
        </button>

        <button
          onClick={() => setActiveReportTab('ATTENDANCE_LOGS')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeReportTab === 'ATTENDANCE_LOGS'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>دفتر وقایع و ریز تردد روزانه ({relevantAttendance.length} رکورد)</span>
        </button>

        <button
          onClick={() => setActiveReportTab('LEAVES_ADVANCES')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeReportTab === 'LEAVES_ADVANCES'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>مرخصی‌ها و مساعده‌ها</span>
        </button>
      </div>

      {/* TAB 1: SUMMARY TABLE */}
      {activeReportTab === 'SUMMARY' && (
        <div className="space-y-6">
          {/* Department Comparison Chart (Only when viewing all) */}
          {selectedEmployeeId === 'ALL' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    مقایسه شاخص‌های انضباط و کارکرد به تفکیک واحدها
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    درصد حضور به موقع، درصد تاخیر و ساعات اضافه‌کاری پرسنل
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptSummaryData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
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
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="حاضر" fill="#10b981" radius={[4, 4, 0, 0]} name="درصد حضور" />
                    <Bar dataKey="تاخیر" fill="#f59e0b" radius={[4, 4, 0, 0]} name="درصد تاخیر" />
                    <Bar dataKey="اضافه‌کار" fill="#6366f1" radius={[4, 4, 0, 0]} name="ساعت اضافه‌کاری" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Individual Summary Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h4 className="font-bold text-slate-800 text-xs">
                خلاصه پرونده، کارکرد و دریافتی پرسنل ({filteredEmployees.length} نفر)
              </h4>
              <div className="text-[11px] text-slate-500">
                جهت استخراج داده‌های تفکیکی روی دکمه «خروجی اکسل» کلیک فرمایید
              </div>
            </div>

            {filteredEmployees.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                پرسنلی با معیارهای انتخابی یافت نشد.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200/80 font-semibold">
                    <tr>
                      <th className="py-3 px-4">کد پرسنلی</th>
                      <th className="py-3 px-4">نام و نام خانوادگی</th>
                      <th className="py-3 px-4">واحد</th>
                      <th className="py-3 px-4 text-center">روزهای تردد</th>
                      <th className="py-3 px-4 text-center">تاخیر (دقیقه)</th>
                      <th className="py-3 px-4 text-center">اضافه‌کار (ساعت)</th>
                      <th className="py-3 px-4 text-center">مرخصی</th>
                      <th className="py-3 px-4 text-center">مساعده</th>
                      <th className="py-3 px-4">حقوق ناخالص</th>
                      <th className="py-3 px-4 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredEmployees.map((emp) => {
                      const empAtt = attendance.filter((a) => a.employeeId === emp.id);
                      const empSalary = salaries.find((s) => s.employeeId === emp.id);
                      const empLeaves = leaves.filter((l) => l.employeeId === emp.id && l.status === 'APPROVED');
                      const empAdvances = advances.filter((adv) => adv.employeeId === emp.id && adv.status === 'APPROVED');

                      const lateMins = empAtt.reduce((s, a) => s + (a.lateMinutes || 0), 0);
                      const otHours = Math.round(empAtt.reduce((s, a) => s + (a.overtimeMinutes || 0), 0) / 60);
                      const leaveDays = empLeaves.reduce((s, l) => s + (l.durationDays || 1), 0);
                      const advTotal = empAdvances.reduce((s, a) => s + (a.amount || 0), 0);

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-slate-600">
                            {emp.personalCode}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {emp.firstName} {emp.lastName}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{emp.department}</td>
                          <td className="py-3 px-4 text-center font-mono font-medium">
                            {empAtt.length > 0 ? `${formatNumberFa(empAtt.length)} روز` : 'بدون تردد'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold">
                            {lateMins > 0 ? (
                              <span className="text-amber-600">{formatNumberFa(lateMins)} دقیقه</span>
                            ) : (
                              <span className="text-slate-400">۰</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold">
                            {otHours > 0 ? (
                              <span className="text-indigo-600">{formatNumberFa(otHours)} ساعت</span>
                            ) : (
                              <span className="text-slate-400">۰</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-600">
                            {leaveDays > 0 ? `${formatNumberFa(leaveDays)} روز` : '۰'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-600">
                            {advTotal > 0 ? formatCurrencyTomans(advTotal) : '۰'}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                            {formatCurrencyTomans(empSalary?.grossSalary || emp.baseSalary)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedEmployeeId(emp.id)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-semibold transition-colors"
                                title="مشاهده کارکرد تکی"
                              >
                                ریز کارکرد
                              </button>
                              <button
                                type="button"
                                onClick={() => exportIndividualEmployeeCsv(emp)}
                                className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] transition-colors"
                                title="دانلود اکسل تکی این پرسنل"
                              >
                                <ArrowDownToLine className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED ATTENDANCE LOGS */}
      {activeReportTab === 'ATTENDANCE_LOGS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h4 className="font-bold text-slate-800 text-xs">
              دفتر سوابق تردد و وقایع ثبت شده ({relevantAttendance.length} رکورد)
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">
                مرتب‌سازی بر اساس تازه‌ترین ترددها
              </span>
            </div>
          </div>

          {relevantAttendance.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              هنوز تردد فعالی برای این دامنه ثبت نشده است.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200/80 font-semibold">
                  <tr>
                    <th className="py-3 px-4">تاریخ</th>
                    <th className="py-3 px-4">پرسنل</th>
                    <th className="py-3 px-4">ورود</th>
                    <th className="py-3 px-4">خروج</th>
                    <th className="py-3 px-4">مدت کارکرد</th>
                    <th className="py-3 px-4">تاخیر</th>
                    <th className="py-3 px-4">اضافه‌کار</th>
                    <th className="py-3 px-4">وضعیت</th>
                    <th className="py-3 px-4">روش ثبت</th>
                    <th className="py-3 px-4">توضیحات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {relevantAttendance.map((rec) => {
                    const emp = employees.find((e) => e.id === rec.employeeId);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-800">
                          {rec.date}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {emp ? `${emp.firstName} ${emp.lastName}` : rec.employeeId}
                          {emp && (
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {emp.personalCode}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-emerald-700 font-semibold">
                          {rec.checkInTime || '-'}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-700">
                          {rec.checkOutTime || '-'}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          {rec.workDurationMinutes ? `${Math.floor(rec.workDurationMinutes / 60)}س ${rec.workDurationMinutes % 60}د` : '-'}
                        </td>
                        <td className="py-2.5 px-4 font-mono">
                          {rec.lateMinutes > 0 ? (
                            <span className="text-amber-600 font-semibold">{rec.lateMinutes} دقیقه</span>
                          ) : (
                            <span className="text-slate-400">۰</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-mono">
                          {rec.overtimeMinutes > 0 ? (
                            <span className="text-indigo-600 font-semibold">{rec.overtimeMinutes} دقیقه</span>
                          ) : (
                            <span className="text-slate-400">۰</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            rec.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.status === 'LATE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {rec.status === 'PRESENT' ? 'حاضر به موقع' : rec.status === 'LATE' ? 'با تاخیر' : rec.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                          {rec.checkInMethod === 'QR_CODE'
                            ? 'کد QR کیوسک'
                            : rec.checkInMethod === 'QR_CAMERA_GPS'
                            ? 'دوربین + GPS کارگاه'
                            : rec.checkInMethod === 'GPS'
                            ? 'موقعیت GPS'
                            : 'سیستمی'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                          {rec.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LEAVES & ADVANCES */}
      {activeReportTab === 'LEAVES_ADVANCES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Leaves List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
            <h4 className="font-bold text-slate-800 text-xs mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>سوابق مرخصی‌ها ({leaves.length} مورد)</span>
            </h4>
            {leaves.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">درخواست مرخصی ثبت نشده است.</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {leaves.map((l) => {
                  const emp = employees.find((e) => e.id === l.employeeId);
                  return (
                    <div key={l.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">
                          {emp ? `${emp.firstName} ${emp.lastName}` : l.employeeId}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {l.startDate} تا {l.endDate} ({l.durationDays || 1} روز) - {l.type === 'EARNED' ? 'استحقاقی' : l.type}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        l.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : l.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {l.status === 'APPROVED' ? 'تایید شده' : l.status === 'PENDING' ? 'در انتظار بررسی' : 'رد شده'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Advances List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
            <h4 className="font-bold text-slate-800 text-xs mb-3 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>سوابق مساعده‌ها ({advances.length} مورد)</span>
            </h4>
            {advances.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">درخواست مساعده ثبت نشده است.</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {advances.map((a) => {
                  const emp = employees.find((e) => e.id === a.employeeId);
                  return (
                    <div key={a.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">
                          {emp ? `${emp.firstName} ${emp.lastName}` : a.employeeId}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          تاریخ درخواست: {a.requestDate} - مبلغ: <span className="font-bold text-emerald-700 font-mono">{formatCurrencyTomans(a.amount)}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        a.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : a.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {a.status === 'APPROVED' ? 'پرداخت شده' : a.status === 'PENDING' ? 'در انتظار بررسی' : 'رد شده'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Official Printable Footer Section (Visible only when printed or previewed) */}
      <div className="hidden print:block pt-8 mt-8 border-t-2 border-slate-300 text-xs text-slate-700">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="font-bold text-sm text-slate-900">شرکت مهندسی پزشکی ام گامون (M.GAMMON)</div>
            <div className="text-[11px] text-slate-500">کارگاه مرکزی: مشهد، بلوار توس، توس ۱۴۲، خیابان حسین‌زاده ۸</div>
          </div>
          <div className="text-left font-mono text-[11px]">
            تاریخ گزارش: {getTodayShamsi()}<br />
            تاییدیه سیستم اتوماسیون حضور و غیاب
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 pt-10 text-center font-bold">
          <div>
            <div className="mb-8">کارشناس امور اداری و پرسنلی</div>
            <div className="border-b border-slate-400 w-32 mx-auto"></div>
          </div>
          <div>
            <div className="mb-8">مسئول کارگاه و سرپرست شیفت</div>
            <div className="border-b border-slate-400 w-32 mx-auto"></div>
          </div>
          <div>
            <div className="mb-8">مدیر ارشد و کارفرما (مجید نورائی)</div>
            <div className="border-b border-slate-400 w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
