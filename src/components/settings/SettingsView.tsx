import React, { useState } from 'react';
import {
  Settings,
  Building2,
  MapPin,
  Save,
  CheckCircle,
  Clock,
  PlaneTakeoff,
  Wallet,
  Calculator,
  History,
  Upload,
  Trash2,
  Search,
  Image as ImageIcon,
  Database,
  Download,
  AlertCircle,
  Shield,
  MessageSquare,
  Send,
  Eye,
  EyeOff,
  RefreshCw,
  Zap,
  Key,
  ExternalLink,
  Info,
  Check
} from 'lucide-react';
import { CompanySettings, AuditLog, Workshop, User, SmsProvider } from '../../types';
import { StorageService } from '../../services/storage';
import { DeveloperBadge } from '../common/DeveloperBadge';

interface SettingsViewProps {
  settings: CompanySettings;
  auditLogs: AuditLog[];
  onRefresh: () => void;
  canEdit: boolean;
  currentUser?: User;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  auditLogs,
  onRefresh,
  canEdit,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'AUDIT'>('SETTINGS');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilter, setAuditFilter] = useState('ALL');

  // SMS Settings & Live Testing State
  const [showApiKey, setShowApiKey] = useState(false);
  const [testPhone, setTestPhone] = useState(currentUser?.phone || '');
  const [testMessage, setTestMessage] = useState('تست اتصال و ارسال پیامک از سامانه M.GAMMON');
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState<{ success: boolean; message: string; results?: any } | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [balanceResult, setBalanceResult] = useState<{ success: boolean; message: string; balance?: string | number; provider?: string; details?: any } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<CompanySettings>({
    ...settings,
    companyName: settings.companyName || 'M.GAMMON | سامانه تردد و پرسنل',
    companyCode: settings.companyCode || 'MG-101',
    logoUrl: settings.logoUrl || '',
    allowedGpsRadiusMeters: settings.allowedGpsRadiusMeters || 20,
    smsEnabled: settings.smsEnabled ?? false,
    smsProvider: settings.smsProvider || 'KAVENEGAR',
    smsApiKey: settings.smsApiKey || '',
    smsSenderNumber: settings.smsSenderNumber || '',
    smsUsername: settings.smsUsername || '',
    smsPassword: settings.smsPassword || '',
    smsPatternCode: settings.smsPatternCode || '',
    smsCustomEndpoint: settings.smsCustomEndpoint || '',
    defaultWorkStartTime: settings.defaultWorkStartTime || '07:00',
    defaultWorkEndTime: settings.defaultWorkEndTime || '16:00',
    lateToleranceMinutes: settings.lateToleranceMinutes ?? 15,
    annualLeaveDaysQuota: settings.annualLeaveDaysQuota ?? 26,
    maxLeaveRequestsPerWeek: settings.maxLeaveRequestsPerWeek ?? 1,
    allowMultiplePendingLeaves: settings.allowMultiplePendingLeaves ?? false,
    maxHourlyLeaveHoursPerMonth: settings.maxHourlyLeaveHoursPerMonth ?? 16,
    maxAdvanceRequestsPerMonth: settings.maxAdvanceRequestsPerMonth ?? 1,
    advanceWindowStartDay: settings.advanceWindowStartDay ?? 15,
    advanceWindowEndDay: settings.advanceWindowEndDay ?? 20,
    maxAdvanceSalaryPercent: settings.maxAdvanceSalaryPercent ?? 30,
    workDaysPerMonth: settings.workDaysPerMonth ?? 22,
    dailyWorkHours: settings.dailyWorkHours ?? 8,
    overtimeRateMultiplier: settings.overtimeRateMultiplier ?? 1.4,
    insuranceRatePercent: settings.insuranceRatePercent ?? 7,
    taxRatePercent: settings.taxRatePercent ?? 10,
    taxExemptionThreshold: settings.taxExemptionThreshold ?? 14000000,
    fixedHousingAllowance: settings.fixedHousingAllowance ?? 900000,
    fixedGroceryAllowance: settings.fixedGroceryAllowance ?? 1400000,
    workshops: settings.workshops && settings.workshops.length > 0 ? settings.workshops : [
      {
        id: 'ws_1',
        name: 'کارگاه شماره یک (تولید و ماشین‌کاری)',
        code: 'WS-01',
        lat: 36.37652,
        lng: 59.50812,
        allowedRadiusMeters: 35,
        address: 'مشهد، توس ۱۴۲، حسین زاده ۸، پلاک ۱۲',
      },
      {
        id: 'ws_2',
        name: 'کارگاه شماره دو (مونتاژ و انبار)',
        code: 'WS-02',
        lat: 36.37668,
        lng: 59.50835,
        allowedRadiusMeters: 35,
        address: 'مشهد، توس ۱۴۲، حسین زاده ۸، پلاک ۱۸',
      }
    ]
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleExportBackup = () => {
    const jsonStr = StorageService.exportFullBackup();
    if (!jsonStr) {
      setBackupStatus({ type: 'error', message: 'خطا در صدور نسخه پشتیبان یا عدم دسترسی مجاز.' });
      return;
    }
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MGAMMON_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setBackupStatus({ type: 'success', message: 'نسخه پشتیبان کامل پایگاه‌داده با موفقیت دانلود شد.' });
    setTimeout(() => setBackupStatus(null), 5000);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = StorageService.importFullBackup(content);
      if (res.success) {
        setBackupStatus({ type: 'success', message: res.message });
        onRefresh();
      } else {
        setBackupStatus({ type: 'error', message: res.message });
      }
      setTimeout(() => setBackupStatus(null), 6000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
  };

  const handleCheckBalance = async () => {
    setIsCheckingBalance(true);
    setBalanceResult(null);
    try {
      const res = await StorageService.checkSmsBalanceAsync(formData);
      setBalanceResult(res);
    } catch (e: any) {
      setBalanceResult({ success: false, message: e.message || 'خطا در استعلام از درگاه وب‌سرویس پیامک.' });
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const handleTestSms = async () => {
    if (!testPhone.trim()) {
      setTestSmsResult({ success: false, message: 'لطفاً شماره تلفن همراه گیرنده را برای تست وارد نمایید.' });
      return;
    }
    setIsTestingSms(true);
    setTestSmsResult(null);
    try {
      const res = await StorageService.testSmsAsync(testPhone.trim(), testMessage, {
        smsEnabled: formData.smsEnabled,
        smsProvider: formData.smsProvider,
        smsApiKey: formData.smsApiKey,
        smsSenderNumber: formData.smsSenderNumber,
        smsUsername: formData.smsUsername,
        smsPassword: formData.smsPassword,
        smsPatternCode: formData.smsPatternCode,
        smsCustomEndpoint: formData.smsCustomEndpoint
      });
      setTestSmsResult(res);
    } catch (e: any) {
      setTestSmsResult({ success: false, message: e.message || 'خطا در برقراری ارتباط با وب‌سرویس پیامک.' });
    } finally {
      setIsTestingSms(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await StorageService.saveSettingsAsync(formData);
      const actorName = currentUser?.name || 'مدیر سیستم';
      const actorRole = currentUser?.role || 'ADMIN';
      StorageService.addAuditLog(
        'بروزرسانی قوانین و تنظیمات',
        'تنظیمات سیستم',
        `تنظیمات سامانه و پنل پیامک توسط ${actorName} (${actorRole}) ذخیره و پایدار شد.`
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
      onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateWorkshop = (index: number, field: keyof Workshop, value: any) => {
    const updated = [...formData.workshops];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, workshops: updated });
  };

  // Filtered audit logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchSearch =
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.userName.toLowerCase().includes(auditSearch.toLowerCase());
    const matchFilter = auditFilter === 'ALL' || log.resource === auditFilter;
    return matchSearch && matchFilter;
  });

  const uniqueResources = ['ALL', ...Array.from(new Set(auditLogs.map((l) => l.resource)))];

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <span>تنظیمات سامانه و رصد وقایع امنیتی</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            پیکربندی قوانین تردد، ژئوفنسینگ کارگاه‌ها، سقف‌های مرخصی و لاگ تغییرات
          </p>
        </div>

        {/* Tab Switch */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'SETTINGS'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            تنظیمات و قوانین شرکت
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('AUDIT')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'AUDIT'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            لاگ تغییرات ({auditLogs.length})
          </button>
        </div>
      </div>

      {activeTab === 'SETTINGS' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {savedSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تنظیمات سامانه با موفقیت ذخیره و اعمال گردید.</span>
            </div>
          )}

          {/* Section 1: Brand & Logo */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>هویت برند، لوگو و اطلاعات سازمانی</span>
            </h3>

            {/* Commercial Logo Card */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-2 shadow-xs shrink-0 overflow-hidden">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="لوگوی شرکت"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-7 h-7 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    لوگوی رسمی M.GAMMON
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    نمایش در هدر سیستم و فیش‌های حقوقی پرسنل
                  </p>
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>بارگذاری لوگو</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-3.5 py-2 rounded-xl transition-colors cursor-pointer border border-rose-200 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Direct Logo URL from external host */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                آدرس اینترنتی لوگو (URL مستقیم روی هاست شخصی یا سرور)
              </label>
              <input
                type="url"
                dir="ltr"
                disabled={!canEdit}
                value={formData.logoUrl || ''}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://yourdomain.ir/assets/logo.png"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                می‌توانید تصویر لوگو را روی هاست قرار داده و آدرس مستقیم آن را اینجا وارد کنید تا در صفحه لاگین و هدر نمایش داده شود.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  نام کامل شرکت / سازمان
                </label>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  کد شناسایی شرکت (Company Code)
                </label>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  value={formData.companyCode}
                  onChange={(e) => setFormData({ ...formData, companyCode: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">تلفن تماس مرکزی</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">آدرس دفتر مرکزی و کارگاه‌ها</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Work Schedule & Timing Patterns */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>قوانین حضور، غیاب و مهلت شناوری</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ساعت شروع شیفت پیش‌فرض
                </label>
                <input
                  type="time"
                  disabled={!canEdit}
                  value={formData.defaultWorkStartTime || '07:00'}
                  onChange={(e) => setFormData({ ...formData, defaultWorkStartTime: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  شروع شیفت کاری استاندارد
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ساعت پایان شیفت پیش‌فرض
                </label>
                <input
                  type="time"
                  disabled={!canEdit}
                  value={formData.defaultWorkEndTime || '16:00'}
                  onChange={(e) => setFormData({ ...formData, defaultWorkEndTime: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  خروج پیش از این موعد کسر کار ثبت می‌شود
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  مهلت تاخیر مجاز شناوری (دقیقه)
                </label>
                <input
                  type="number"
                  disabled={!canEdit}
                  value={formData.lateToleranceMinutes}
                  onChange={(e) => setFormData({ ...formData, lateToleranceMinutes: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  تاخیر تا این سقف بدون کسر اعمال می‌شود
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Leave Rules */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
              <PlaneTakeoff className="w-4 h-4 text-indigo-600" />
              <span>ضوابط و سقف‌های مرخصی پرسنل</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  سهمیه مرخصی سالانه (روز)
                </label>
                <input
                  type="number"
                  disabled={!canEdit}
                  value={formData.annualLeaveDaysQuota}
                  onChange={(e) => setFormData({ ...formData, annualLeaveDaysQuota: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  حداکثر درخواست مجاز در هر هفته
                </label>
                <input
                  type="number"
                  disabled={!canEdit}
                  value={formData.maxLeaveRequestsPerWeek}
                  onChange={(e) => setFormData({ ...formData, maxLeaveRequestsPerWeek: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  جهت جلوگیری از ثبت درخواست‌های متوالی
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  حداکثر سقف مرخصی ساعتی در ماه (ساعت)
                </label>
                <input
                  type="number"
                  disabled={!canEdit}
                  value={formData.maxHourlyLeaveHoursPerMonth}
                  onChange={(e) => setFormData({ ...formData, maxHourlyLeaveHoursPerMonth: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={!formData.allowMultiplePendingLeaves}
                  onChange={(e) => setFormData({ ...formData, allowMultiplePendingLeaves: !e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-800">
                  ممانعت از ثبت همزمان چند درخواست مرخصی در انتظار بررسی
                </span>
              </label>
              <p className="text-[11px] text-slate-400 mr-6 mt-0.5">
                پرسنل تا تعیین تکلیف درخواست قبلی نمی‌تواند درخواست جدید ارسال کند
              </p>
            </div>
          </div>

          {/* Section 4: Advance Salary Rules */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Wallet className="w-4 h-4 text-indigo-600" />
              <span>قوانین و محدودیت‌های اعطای مساعده</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  روز شروع بازه مجاز مساعده
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  disabled={!canEdit}
                  value={formData.advanceWindowStartDay}
                  onChange={(e) => setFormData({ ...formData, advanceWindowStartDay: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  مثال: روز ۱۵ام هر ماه شمسی
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  روز پایان بازه مجاز مساعده
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  disabled={!canEdit}
                  value={formData.advanceWindowEndDay}
                  onChange={(e) => setFormData({ ...formData, advanceWindowEndDay: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  مثال: روز ۲۰ام هر ماه شمسی
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  سقف درصدی مساعده از حقوق پایه (٪)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  disabled={!canEdit}
                  value={formData.maxAdvanceSalaryPercent}
                  onChange={(e) => setFormData({ ...formData, maxAdvanceSalaryPercent: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  استاندارد قانون کار: حداکثر ۳۰ درصد
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: Payroll & Calculations */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <span>موتور محاسبات حقوق و مزایای قانون کار</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  تعداد روزهای موظفی در ماه
                </label>
                <input
                  type="number"
                  disabled={!canEdit}
                  value={formData.workDaysPerMonth}
                  onChange={(e) => setFormData({ ...formData, workDaysPerMonth: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ساعت کار روزانه موظفی
                </label>
                <input
                  type="number"
                  disabled={!canEdit}
                  value={formData.dailyWorkHours}
                  onChange={(e) => setFormData({ ...formData, dailyWorkHours: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ضریب اضافه‌کاری قانون کار
                </label>
                <input
                  type="number"
                  step="0.1"
                  disabled={!canEdit}
                  value={formData.overtimeRateMultiplier}
                  onChange={(e) => setFormData({ ...formData, overtimeRateMultiplier: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  استاندارد: ۱.۴ برابر نرخ عادی
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  نرخ بیمه سهم کارمند (٪)
                </label>
                <input
                  type="number"
                  disabled={!canEdit}
                  value={formData.insuranceRatePercent}
                  onChange={(e) => setFormData({ ...formData, insuranceRatePercent: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  تامین اجتماعی: ۷ درصد
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  حق مسکن ماهانه مصوب (تومان)
                </label>
                <input
                  type="number"
                  disabled={!canEdit}
                  value={formData.fixedHousingAllowance}
                  onChange={(e) => setFormData({ ...formData, fixedHousingAllowance: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  در صورت درج ۰، در فیش حقوقی نمایش داده نخواهد شد
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  بن خواروبار ماهانه (تومان)
                </label>
                <input
                  type="number"
                  disabled={!canEdit}
                  value={formData.fixedGroceryAllowance}
                  onChange={(e) => setFormData({ ...formData, fixedGroceryAllowance: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  در صورت درج ۰، در فیش حقوقی نمایش داده نخواهد شد
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  حق اولاد ماهانه (تومان)
                </label>
                <input
                  type="number"
                  disabled={!canEdit}
                  value={formData.childAllowance || 0}
                  onChange={(e) => setFormData({ ...formData, childAllowance: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  در صورت درج ۰، در فیش حقوقی نمایش داده نخواهد شد
                </span>
              </div>
            </div>
          </div>

          {/* Section 6: Workshops & Geofencing (20m radius) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>موقعیت مکانی و محدوده مجاز کارگاه‌ها</span>
              </h3>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                شعاع مجاز ثبت تردد: ۲۰ متر دقیق
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.workshops.map((ws, idx) => (
                <div key={ws.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800">{ws.name}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                      {ws.code}
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">نشانی کارگاه</label>
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={ws.address || ''}
                      onChange={(e) => handleUpdateWorkshop(idx, 'address', e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">عرض جغرافیایی کارگاه</label>
                      <input
                        type="number"
                        step="0.00001"
                        disabled={!canEdit}
                        value={ws.lat}
                        onChange={(e) => handleUpdateWorkshop(idx, 'lat', Number(e.target.value))}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">طول جغرافیایی کارگاه</label>
                      <input
                        type="number"
                        step="0.00001"
                        disabled={!canEdit}
                        value={ws.lng}
                        onChange={(e) => handleUpdateWorkshop(idx, 'lng', Number(e.target.value))}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 7: Real SMS Gateway & Live Testing */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>سامانه و پنل پیامک واقعی (Real SMS Gateway)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  تنظیمات وب‌سرویس و پنل پیامکی جهت ارسال واقعی پیامک‌های پرتال، کدهای تایید، اعلان‌های اداری و مالی به پرسنل
                </p>
              </div>

              {/* SMS Enable/Disable Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs font-semibold text-slate-700">وضعیت ارسال پیامک:</span>
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={formData.smsEnabled || false}
                  onChange={(e) => setFormData({ ...formData, smsEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-600 cursor-pointer accent-indigo-600"
                />
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1 ${
                    formData.smsEnabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {formData.smsEnabled ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>✓ فعال برای ارسال واقعی</span>
                    </>
                  ) : (
                    <span>✕ غیرفعال</span>
                  )}
                </span>
              </label>
            </div>

            {/* Provider Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  انتخاب پنل پیامک طرف قرارداد شما (SMS Gateway Provider)
                </label>
                <span className="text-[11px] text-indigo-600 font-medium">
                  پشتیبانی از پروتکل‌های رسمی وب‌سرویس ایران
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {[
                  { id: 'KAVENEGAR', title: 'کاوه‌نگار', subtitle: 'Kavenegar', desc: 'وب‌سرویس REST و Verify', badge: 'رسمی' },
                  { id: 'IPPANEL_FARAZ', title: 'فراز اس‌ام‌اس', subtitle: 'IPPanel / فراز', desc: 'ارسال با خط خدماتی و پترن', badge: 'محبوب' },
                  { id: 'MELIPAYAMAK', title: 'ملی‌پیامک', subtitle: 'Melipayamak', desc: 'وب‌سرویس شرکتی با User/Pass', badge: 'رسمی' },
                  { id: 'GHASEDAK', title: 'قاصدک', subtitle: 'Ghasedak', desc: 'ارسال متنی سریع OTP', badge: 'رسمی' },
                  { id: 'SMS_IR', title: 'SMS.ir', subtitle: 'سامانه اِس‌ام‌اس دات‌آی‌آر', desc: 'وب‌سرویس نسخه جدید v1', badge: 'رسمی' },
                  { id: 'CUSTOM', title: 'وب‌سرویس دلخواه', subtitle: 'Custom REST API', desc: 'آدرس URL و هدر اختصاصی', badge: 'سفارشی' },
                ].map((item) => {
                  const isSelected = (formData.smsProvider || 'KAVENEGAR') === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setFormData({ ...formData, smsProvider: item.id as any })}
                      className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between relative ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold">{item.title}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                          isSelected ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-200/70 text-slate-600'
                        }`}>
                          {item.badge}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-normal font-sans" dir="ltr">{item.subtitle}</span>
                      <span className="text-[10px] text-slate-500 mt-2 block font-normal leading-tight">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Provider Dynamic Guide Note */}
            <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">
                  راهنمای اتصال به پنل{' '}
                  {formData.smsProvider === 'KAVENEGAR' ? 'کاوه‌نگار (Kavenegar)' :
                   formData.smsProvider === 'IPPANEL_FARAZ' ? 'فراز اس‌ام‌اس / آی‌پی‌پنل (FarazSMS / IPPanel)' :
                   formData.smsProvider === 'MELIPAYAMAK' ? 'ملی‌پیامک (Melipayamak)' :
                   formData.smsProvider === 'GHASEDAK' ? 'قاصدک (Ghasedak)' :
                   formData.smsProvider === 'SMS_IR' ? 'سامانه SMS.ir' : 'وب‌سرویس اختصاصی'}
                </span>
                <p className="text-[11px] text-indigo-800 leading-relaxed font-normal">
                  {formData.smsProvider === 'KAVENEGAR' && 'کلید وب‌سرویس (API Key) را از منوی کاربری «حساب کاربری > مشخصات حساب» در پنل کاوه‌نگار کپی نمایید. شماره فرستنده نیز شماره خط اختصاصی شما در کاوه‌نگار (مثلاً ۱۰۰۰... یا ۳۰۰۰...) می‌باشد. در صورت داشتن خط خدماتی، کدهای تایید به صورت آنی به خطوط بلک‌لیست نیز تحویل داده می‌شوند.'}
                  {formData.smsProvider === 'IPPANEL_FARAZ' && 'کلید وب‌سرویس را از منوی «پشتیبانی > دسترسی‌های API / وب‌سرویس» در پنل فراز اس‌ام‌اس دریافت کنید. شماره خط فرستنده اختصاصی کارگاه (مثلاً +983000... یا +985000...) را در فیلد شماره فرستنده وارد نمایید.'}
                  {formData.smsProvider === 'MELIPAYAMAK' && 'نام کاربری و کلمه عبور ورود به پرتال ملی‌پیامک خود را در کادرهای زیر وارد کنید. همچنین شماره خط فرستنده تایید شده در بخش شماره‌های اختصاصی ملی‌پیامک را درج نمایید.'}
                  {formData.smsProvider === 'GHASEDAK' && 'کلید دسترسی (API Key) را از بخش «تنظیمات وب‌سرویس» در پنل کاربری قاصدک کپی نموده و شماره خط اختصاصی ارسال‌کننده خود را ثبت کنید.'}
                  {formData.smsProvider === 'SMS_IR' && 'کلید دسترسی (X-API-KEY) را از داشبورد کاربری سامانه SMS.ir بخش برنامه‌نویسان کپی کرده و شماره خط فرستنده را در فیلد مربوطه قرار دهید.'}
                  {formData.smsProvider === 'CUSTOM' && 'آدرس کامل Endpoint وب‌سرویس پیامکی خود را با پروتکل https وارد کنید. درخواست‌ها با متد POST و هدر توکن امنیتی ارسال خواهند شد.'}
                </p>
              </div>
            </div>

            {/* Provider Configuration Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* API Key (for providers requiring it) */}
              {formData.smsProvider !== 'MELIPAYAMAK' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>کلید دسترسی وب‌سرویس (API Key / Token)</span>
                    <span className="text-[10px] text-rose-500 font-normal">* الزامی</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      disabled={!canEdit}
                      value={formData.smsApiKey || ''}
                      onChange={(e) => setFormData({ ...formData, smsApiKey: e.target.value })}
                      placeholder={
                        formData.smsProvider === 'KAVENEGAR' ? 'مثال: 4A586B744E456B52...' :
                        formData.smsProvider === 'IPPANEL_FARAZ' ? 'مثال: uY-aB9... یا توکن وب‌سرویس فراز' :
                        formData.smsProvider === 'SMS_IR' ? 'مثال: 7e89ab...' : 'کلید توکن وب‌سرویس'
                      }
                      className="w-full text-xs p-2.5 pl-9 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    کلید امنیتی اتصال نرم‌افزار به پنل پیامک شما
                  </span>
                </div>
              )}

              {/* Sender Line Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>شماره خط فرستنده (Sender Line Number)</span>
                  <span className="text-[10px] text-slate-400 font-normal">خط اختصاصی / خدماتی</span>
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.smsSenderNumber || ''}
                  onChange={(e) => setFormData({ ...formData, smsSenderNumber: e.target.value })}
                  placeholder="مثال: 3000505 یا 50004000... یا 1000..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  شماره خط ارسال‌کننده تاییدشده در پنل کاربری پیامک شما
                </span>
              </div>

              {/* Username & Password (for Melipayamak) */}
              {formData.smsProvider === 'MELIPAYAMAK' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>نام کاربری پنل ملی‌پیامک (Username)</span>
                      <span className="text-[10px] text-rose-500 font-normal">* الزامی</span>
                    </label>
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={formData.smsUsername || ''}
                      onChange={(e) => setFormData({ ...formData, smsUsername: e.target.value })}
                      placeholder="نام کاربری ورود به حساب ملی‌پیامک"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>کلمه عبور پنل ملی‌پیامک (Password)</span>
                      <span className="text-[10px] text-rose-500 font-normal">* الزامی</span>
                    </label>
                    <input
                      type="password"
                      disabled={!canEdit}
                      value={formData.smsPassword || ''}
                      onChange={(e) => setFormData({ ...formData, smsPassword: e.target.value })}
                      placeholder="رمز عبور ورود به پنل"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left"
                    />
                  </div>
                </>
              )}

              {/* Pattern / Template Code (Optional for Kavenegar and IPPanel) */}
              {(formData.smsProvider === 'KAVENEGAR' || formData.smsProvider === 'IPPANEL_FARAZ') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>کد الگو / پترن پیامک خدماتی (Pattern / Template Code)</span>
                    <span className="text-[10px] text-slate-400 font-normal">اختیاری</span>
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.smsPatternCode || ''}
                    onChange={(e) => setFormData({ ...formData, smsPatternCode: e.target.value })}
                    placeholder="مثال: mgammon-alert یا کد عددی پترن"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    جهت ارسال پیامک به خطوطی که پیامک‌های تبلیغاتی را مسدود کرده‌اند (بلک‌لیست)
                  </span>
                </div>
              )}

              {/* Custom REST Endpoint */}
              {formData.smsProvider === 'CUSTOM' && (
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>آدرس کامل وب‌سرویس اختصاصی (REST URL Endpoint)</span>
                    <span className="text-[10px] text-rose-500 font-normal">* الزامی</span>
                  </label>
                  <input
                    type="url"
                    disabled={!canEdit}
                    value={formData.smsCustomEndpoint || ''}
                    onChange={(e) => setFormData({ ...formData, smsCustomEndpoint: e.target.value })}
                    placeholder="https://api.your-sms-provider.ir/v1/send"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left"
                  />
                </div>
              )}
            </div>

            {/* LIVE VERIFICATION & BALANCE INQUIRY */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>بررسی وضعیت اتصال و استعلام مانده اعتبار پنل</span>
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ارتباط زنده با وب‌سرویس و دریافت موجودی ریالی یا تعداد پیامک باقیمانده بدون ارسال پیامک
                </p>
              </div>

              <button
                type="button"
                onClick={handleCheckBalance}
                disabled={isCheckingBalance}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingBalance ? 'animate-spin' : ''}`} />
                <span>{isCheckingBalance ? 'در حال استعلام...' : 'استعلام مانده اعتبار و اتصال'}</span>
              </button>
            </div>

            {/* Balance Result Display */}
            {balanceResult && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                  balanceResult.success
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                {balanceResult.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{balanceResult.message}</span>
                    {balanceResult.balance && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-200/60 text-emerald-950 font-bold font-mono text-[11px]">
                        مانده: {balanceResult.balance}
                      </span>
                    )}
                  </div>
                  {balanceResult.details && typeof balanceResult.details === 'object' && (
                    <span className="text-[10px] text-slate-500 font-mono block">
                      پاسخ دریافتی: {JSON.stringify(balanceResult.details)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* LIVE SMS TEST SECTION */}
            <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-indigo-600" />
                  <span>تست ارسال پیامک واقعی به شماره تلفن همراه دلخواه</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  ارسال یک پیامک آزمایشی واقعی از طریق درگاه انتخابی
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    شماره تلفن همراه گیرنده تست:
                  </label>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="مثال: 09151111111"
                    className="w-full text-xs p-2.5 rounded-xl bg-white border border-slate-200 font-mono text-left focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2 flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      متن پیامک آزمایشی:
                    </label>
                    <input
                      type="text"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder="متن پیامک تست..."
                      className="w-full text-xs p-2.5 rounded-xl bg-white border border-slate-200 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleTestSms}
                    disabled={isTestingSms}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isTestingSms ? 'در حال ارسال پیامک...' : 'ارسال پیامک تست'}</span>
                  </button>
                </div>
              </div>

              {testSmsResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                    testSmsResult.success
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  }`}
                >
                  {testSmsResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold">{testSmsResult.message}</p>
                    {testSmsResult.results && (
                      <p className="text-[10px] font-mono opacity-80" dir="ltr">
                        Gateway Response: {typeof testSmsResult.results === 'object' ? JSON.stringify(testSmsResult.results) : testSmsResult.results}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Database Backup & Export Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600" />
                <span>پشتیبان‌گیری پایگاه‌داده و امنیت اطلاعات (Database Safety)</span>
              </h3>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                امنیت ۱۰۰٪ تضمین شده
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              جهت جلوگیری از حذف اطلاعات و اطمینان خاطر، می‌توانید هر زمان که مایل بودید یک نسخه پشتیبان آفلاین از تمامی داده‌ها (پرسنل، ثبت ترددها، مرخصی‌ها، مساعده‌ها و فیش‌های حقوقی) دانلود نمایید یا در صورت تعویض سیستم، آن را با یک کلیک بازگردانی کنید.
            </p>

            {backupStatus && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  backupStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{backupStatus.message}</span>
              </div>
            )}

            {currentUser?.isSuperAdmin ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>دانلود پشتیبان کامل پایگاه‌داده (JSON)</span>
                </button>

                <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors border border-slate-200 cursor-pointer">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>بازیابی اطلاعات از فایل پشتیبان</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportBackup}
                  />
                </label>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 rounded-xl text-amber-800 text-xs flex items-center gap-2 border border-amber-200">
                <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                <span>دسترسی دانلود نسخه پشتیبان کامل و بازیابی پایگاه‌داده منحصراً در اختیارات مالک و مدیر ارشد می‌باشد.</span>
              </div>
            )}
          </div>

          {/* System & Developer Info Card */}
          <DeveloperBadge variant="card" />

          {canEdit && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                {savedSuccess && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>تنظیمات و اطلاعات پنل پیامک با موفقیت در سرور پایدار و ثبت شد.</span>
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال ذخیره‌سازی در سرور...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>ذخیره کلیه تنظیمات و پنل پیامک</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      ) : (
        /* AUDIT LOGS & HR TRACEABILITY TAB */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <span>گزارش وقایع و ردگیری عملیات (Audit Trail)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                ثبت تاریخچه کامل تغییرات و عملیات حساس مدیریتی
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="جستجو در وقایع..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <select
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 py-2 px-3 bg-white text-slate-700 focus:outline-none"
              >
                {uniqueResources.map((r) => (
                  <option key={r} value={r}>
                    {r === 'ALL' ? 'همه بخش‌ها' : r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {filteredAuditLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                موردی یافت نشد.
              </div>
            ) : (
              filteredAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex items-start justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{log.action}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                        {log.resource}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">{log.details}</p>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="font-semibold text-slate-600">کاربر: {log.userName}</span>
                      {log.ipAddress && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{log.ipAddress}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono shrink-0 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                    {log.timestamp}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
