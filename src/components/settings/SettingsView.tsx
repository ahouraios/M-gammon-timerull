import React, { useState, useEffect } from 'react';
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
  Check,
  Radio,
  Lock,
  Smartphone,
  CheckCircle2,
  ShieldCheck,
  Server
} from 'lucide-react';
import { CompanySettings, AuditLog, Workshop, User, SmsProvider, SmsConnectionMode, SmsConnectionStatus } from '../../types';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [testPhone, setTestPhone] = useState(currentUser?.phone || '');
  const [testMessage, setTestMessage] = useState('تست اتصال و ارسال پیامک از سامانه کارگاه گامون');
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState<{ success: boolean; message: string; trackingCode?: string; results?: any; statusCode?: string } | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [balanceResult, setBalanceResult] = useState<{ success: boolean; message: string; balance?: string | number; availableLines?: string[]; provider?: string; statusCode?: string; details?: any } | null>(null);
  const [availableLines, setAvailableLines] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<CompanySettings>({
    ...settings,
    companyName: settings.companyName || 'M.GAMMON | سامانه تردد و پرسنل',
    companyCode: settings.companyCode || 'MG-101',
    logoUrl: settings.logoUrl || '',
    allowedGpsRadiusMeters: settings.allowedGpsRadiusMeters || 20,
    smsEnabled: settings.smsEnabled ?? false,
    smsProvider: settings.smsProvider || 'MELIPAYAMAK',
    smsConnectionMode: settings.smsConnectionMode || 'legacy_rest',
    smsApiKey: settings.smsApiKey || '',
    smsSenderNumber: settings.smsSenderNumber || '',
    smsUsername: settings.smsUsername || '',
    smsPassword: settings.smsPassword || '',
    smsNewApiEndpoint: settings.smsNewApiEndpoint || '',
    smsNewApiToken: settings.smsNewApiToken || '',
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

  useEffect(() => {
    StorageService.fetchSettingsAsync().then((remote) => {
      if (remote) {
        setFormData((prev) => ({
          ...prev,
          ...remote,
          smsProvider: remote.smsProvider || prev.smsProvider || 'MELIPAYAMAK',
          smsConnectionMode: remote.smsConnectionMode || prev.smsConnectionMode || 'legacy_rest'
        }));
      }
    });
  }, []);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      ...settings,
      smsProvider: settings.smsProvider || prev.smsProvider || 'MELIPAYAMAK',
      smsConnectionMode: settings.smsConnectionMode || prev.smsConnectionMode || 'legacy_rest'
    }));
  }, [settings]);

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
      const res: any = await StorageService.checkSmsBalanceAsync(formData);
      setBalanceResult(res);
      if (res.availableLines && Array.isArray(res.availableLines) && res.availableLines.length > 0) {
        setAvailableLines(res.availableLines);
      }
      if (res.success) {
        setFormData((prev) => ({
          ...prev,
          smsSenderNumber: (res.availableLines && res.availableLines.length > 0 && (!prev.smsSenderNumber || !res.availableLines.includes(prev.smsSenderNumber)))
            ? res.availableLines[0]
            : prev.smsSenderNumber,
          smsLastConnectionCheck: new Date().toISOString(),
          smsLastConnectionStatus: 'SUCCESS',
          smsLastConnectionMessage: res.message,
          smsLastBalance: res.balance ?? prev.smsLastBalance
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          smsLastConnectionCheck: new Date().toISOString(),
          smsLastConnectionStatus: (res.statusCode as any) || 'FAILED',
          smsLastConnectionMessage: res.message
        }));
      }
    } catch (e: any) {
      setBalanceResult({ success: false, message: e.message || 'خطا در استعلام از درگاه وب‌سرویس پیامک.' });
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const handleTestSms = async () => {
    const cleanPhone = testPhone.trim();
    if (!cleanPhone) {
      setTestSmsResult({ success: false, message: 'لطفاً شماره تلفن همراه گیرنده را برای تست وارد نمایید.' });
      return;
    }
    setIsTestingSms(true);
    setTestSmsResult(null);
    try {
      const res = await StorageService.testSmsAsync(cleanPhone, testMessage, formData);
      setTestSmsResult(res);
      if (res.success) {
        setFormData((prev) => ({
          ...prev,
          smsLastTestAt: new Date().toISOString(),
          smsLastTestStatus: 'SUCCESS',
          smsLastTestTrackingCode: res.trackingCode || null,
          smsLastTestRecipient: cleanPhone
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          smsLastTestAt: new Date().toISOString(),
          smsLastTestStatus: 'FAILED',
          smsLastTestRecipient: cleanPhone
        }));
      }
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

          {/* Section 7: Real SMS Gateway & Live Testing (Melipayamak Upgrade & UI Overhaul) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            {/* Header & Main Toggle */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <span>سامانه اطلاع‌رسانی و ارسال پیامک</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  اتصال امن سامانه به پنل پیامکی برای ارسال اعلان‌های پرسنلی، پیام‌ها و کدهای تایید هویت
                </p>
              </div>

              {/* SMS Enable/Disable Toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <span className="text-xs font-semibold text-slate-700">ارسال خودکار پیامک:</span>
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={formData.smsEnabled || false}
                  onChange={(e) => setFormData({ ...formData, smsEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-600 cursor-pointer accent-indigo-600"
                />
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 transition-all ${
                    formData.smsEnabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {formData.smsEnabled ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>✓ فعال</span>
                    </>
                  ) : (
                    <span>✕ غیرفعال</span>
                  )}
                </span>
              </label>
            </div>

            {/* Provider Selection */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  انتخاب سامانه و درگاه پیامکی طرف قرارداد شما
                </label>
                <span className="text-[11px] text-indigo-600 font-medium">
                  پشتیبانی از درگاه‌های معتبر پیامک کشور
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {[
                  { id: 'MELIPAYAMAK', title: 'ملی‌پیامک', subtitle: 'Melipayamak', desc: 'پشتیبانی از REST قدیمی و API جدید', badge: 'پیش‌فرض کارگاه' },
                  { id: 'KAVENEGAR', title: 'کاوه‌نگار', subtitle: 'Kavenegar', desc: 'ارسال آنی پیامک و تایید هویت', badge: 'رسمی' },
                  { id: 'IPPANEL_FARAZ', title: 'فراز اس‌ام‌اس', subtitle: 'Faraz / IPPanel', desc: 'ارسال با خط خدماتی و پترن', badge: 'محبوب' },
                  { id: 'GHASEDAK', title: 'قاصدک', subtitle: 'Ghasedak', desc: 'ارسال سریع پیامک به پرسنل', badge: 'رسمی' },
                  { id: 'SMS_IR', title: 'SMS.ir', subtitle: 'سامانه SMS.ir', desc: 'ارسال سازمانی با خط خدماتی', badge: 'رسمی' },
                  { id: 'CUSTOM', title: 'سامانه دلخواه', subtitle: 'Custom REST', desc: 'اتصال به وب‌سرویس سفارشی', badge: 'سفارشی' },
                ].map((item) => {
                  const isSelected = (formData.smsProvider || 'MELIPAYAMAK') === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setFormData({ ...formData, smsProvider: item.id as any })}
                      className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between relative ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/90 text-indigo-950 font-bold ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-slate-200/90 bg-slate-50/50 hover:bg-slate-100/80 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold">{item.title}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200/70 text-slate-600'
                        }`}>
                          {isSelected ? '✓ فعال' : item.badge}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-normal font-sans" dir="ltr">{item.subtitle}</span>
                      <span className="text-[10px] text-slate-500 mt-2 block font-normal leading-tight">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Melipayamak Connection Mode Switcher (Active when MELIPAYAMAK is selected) */}
            {formData.smsProvider === 'MELIPAYAMAK' && (
              <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">
                      روش اتصال به سامانه ملی‌پیامک (Connection Mode)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    روش فعال: <strong className="text-indigo-700 font-bold">{formData.smsConnectionMode === 'new_api' ? 'API جدید ملی‌پیامک' : 'REST قدیمی (پیش‌فرض)'}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Mode 1: Legacy REST */}
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setFormData({ ...formData, smsConnectionMode: 'legacy_rest' })}
                    className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                      (formData.smsConnectionMode || 'legacy_rest') === 'legacy_rest'
                        ? 'border-indigo-600 bg-white ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          (formData.smsConnectionMode || 'legacy_rest') === 'legacy_rest' ? 'bg-indigo-600' : 'bg-slate-300'
                        }`}></span>
                        <span>اتصال قدیمی REST</span>
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        (formData.smsConnectionMode || 'legacy_rest') === 'legacy_rest'
                          ? 'bg-indigo-100 text-indigo-800 font-bold'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {(formData.smsConnectionMode || 'legacy_rest') === 'legacy_rest' ? '✓ فعال' : 'پایدار'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono text-left block mt-1" dir="ltr">
                      SendSMS / GetCredit (x-www-form-urlencoded)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-2 font-normal leading-relaxed">
                      ارسال استاندارد فرمی با نام کاربری و کلمه عبور اختصاصی پنل ملی‌پیامک
                    </p>
                  </button>

                  {/* Mode 2: New API */}
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setFormData({ ...formData, smsConnectionMode: 'new_api' })}
                    className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                      formData.smsConnectionMode === 'new_api'
                        ? 'border-indigo-600 bg-white ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          formData.smsConnectionMode === 'new_api' ? 'bg-indigo-600' : 'bg-slate-300'
                        }`}></span>
                        <span>API جدید ملی‌پیامک</span>
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        formData.smsConnectionMode === 'new_api'
                          ? 'bg-indigo-100 text-indigo-800 font-bold'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {formData.smsConnectionMode === 'new_api' ? '✓ فعال' : 'جدید'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono text-left block mt-1" dir="ltr">
                      Console API (Bearer Token / JSON)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-2 font-normal leading-relaxed">
                      اتصال با توکن احراز هویت (Bearer Token / API Key) و آدرس اختصاصی وب‌سرویس جدید
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Dynamic Credentials Card */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-indigo-600" />
                  <span>مشخصات و اطلاعات اتصال به پنل ({formData.smsProvider === 'MELIPAYAMAK' ? (formData.smsConnectionMode === 'new_api' ? 'API جدید ملی‌پیامک' : 'REST قدیمی ملی‌پیامک') : formData.smsProvider})</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  اطلاعات محرمانه به صورت رمزنگاری‌شده و امن در سرور نگهداری می‌شوند
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* 1. Melipayamak Legacy REST Mode */}
                {formData.smsProvider === 'MELIPAYAMAK' && (formData.smsConnectionMode || 'legacy_rest') === 'legacy_rest' && (
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
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        نام کاربری ورود به پرتال پیامکی ملی‌پیامک
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>کلمه عبور پنل ملی‌پیامک (Password)</span>
                        <span className="text-[10px] text-rose-500 font-normal">* الزامی</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          disabled={!canEdit}
                          value={formData.smsPassword || ''}
                          onChange={(e) => setFormData({ ...formData, smsPassword: e.target.value })}
                          placeholder={formData.hasSmsPassword ? '••••••••' : 'رمز عبور ورود به پنل'}
                          className="w-full text-xs p-2.5 pl-9 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <span className="text-[10px] mt-1 block">
                        {formData.hasSmsPassword || (formData.smsPassword && formData.smsPassword.includes('••')) ? (
                          <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>اطلاعات اتصال ذخیره شده است (جهت تغییر رمز جدید را تایپ کنید)</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">کلمه عبور ورود به پرتال ملی‌پیامک</span>
                        )}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>شماره خط فرستنده پیامک (Sender Line)</span>
                        <span className="text-[10px] text-rose-500 font-normal">* الزامی</span>
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={formData.smsSenderNumber || ''}
                        onChange={(e) => setFormData({ ...formData, smsSenderNumber: e.target.value })}
                        placeholder="مثال: 50004000... یا 3000..."
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        شماره خط اختصاصی تأیید شده در پنل ملی‌پیامک (مثال: 50002710074781)
                      </span>
                      {availableLines.length > 0 && (
                        <div className="mt-2 p-2 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-1">
                          <span className="text-[10px] text-indigo-900 font-bold block">
                            خطوط اختصاصی فعال یافت‌شده در پنل شما:
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {availableLines.map((line) => (
                              <button
                                key={line}
                                type="button"
                                onClick={() => setFormData({ ...formData, smsSenderNumber: line })}
                                className={`text-[11px] font-mono px-2 py-0.5 rounded-lg cursor-pointer transition-all ${
                                  formData.smsSenderNumber === line
                                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                    : 'bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-semibold'
                                }`}
                              >
                                {line} {formData.smsSenderNumber === line ? '✓ خط فعال شما' : '← انتخاب این خط'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 2. Melipayamak New API Mode */}
                {formData.smsProvider === 'MELIPAYAMAK' && formData.smsConnectionMode === 'new_api' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>آدرس وب‌سرویس جدید ملی‌پیامک (API Endpoint)</span>
                        <span className="text-[10px] text-slate-400 font-normal">پیش‌فرض: simple send</span>
                      </label>
                      <input
                        type="url"
                        disabled={!canEdit}
                        value={formData.smsNewApiEndpoint || ''}
                        onChange={(e) => setFormData({ ...formData, smsNewApiEndpoint: e.target.value })}
                        placeholder="https://console.melipayamak.com/api/send/simple"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        آدرس وب‌سرویس جدید ارائه‌شده در مستندات پنل کاربری شما
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>کلید دسترسی یا توکن (API Token / Key)</span>
                        <span className="text-[10px] text-rose-500 font-normal">* الزامی</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showToken ? 'text' : 'password'}
                          disabled={!canEdit}
                          value={formData.smsNewApiToken || ''}
                          onChange={(e) => setFormData({ ...formData, smsNewApiToken: e.target.value })}
                          placeholder={formData.hasSmsNewApiToken ? '••••••••' : 'توکن یا کلید دسترسی'}
                          className="w-full text-xs p-2.5 pl-9 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                          {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <span className="text-[10px] mt-1 block">
                        {formData.hasSmsNewApiToken || (formData.smsNewApiToken && formData.smsNewApiToken.includes('••')) ? (
                          <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>اطلاعات اتصال ذخیره شده است</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">توکن ارائه‌شده توسط کنسول جدید ملی‌پیامک</span>
                        )}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>شماره خط فرستنده پیامک (Sender Line)</span>
                        <span className="text-[10px] text-rose-500 font-normal">* الزامی</span>
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={formData.smsSenderNumber || ''}
                        onChange={(e) => setFormData({ ...formData, smsSenderNumber: e.target.value })}
                        placeholder="مثال: 50004000... یا 3000..."
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        شماره خط فرستنده اختصاصی در پنل کاربری
                      </span>
                    </div>
                  </>
                )}

                {/* 3. Other Providers (Kavenegar, Faraz, Ghasedak, SMS.ir, Custom) */}
                {formData.smsProvider !== 'MELIPAYAMAK' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>کلید اختصاصی اتصال سامانه پیامک</span>
                        <span className="text-[10px] text-rose-500 font-normal">* الزامی</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          disabled={!canEdit}
                          value={formData.smsApiKey || ''}
                          onChange={(e) => setFormData({ ...formData, smsApiKey: e.target.value })}
                          placeholder={formData.hasSmsApiKey ? '••••••••' : 'کد کلید وب‌سرویس'}
                          className="w-full text-xs p-2.5 pl-9 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
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
                        کلید امنیتی ارائه‌شده توسط سامانه پیامک جهت احراز هویت
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>شماره خط فرستنده پیامک</span>
                        <span className="text-[10px] text-slate-400 font-normal">خط اختصاصی / خدماتی</span>
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={formData.smsSenderNumber || ''}
                        onChange={(e) => setFormData({ ...formData, smsSenderNumber: e.target.value })}
                        placeholder="مثال: 3000505 یا 50004000..."
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        شماره خط فرستنده پیامک‌های کارگاه به پرسنل
                      </span>
                    </div>

                    {(formData.smsProvider === 'KAVENEGAR' || formData.smsProvider === 'IPPANEL_FARAZ') && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                          <span>کد الگوی پیامک کارگاه</span>
                          <span className="text-[10px] text-slate-400 font-normal">اختیاری</span>
                        </label>
                        <input
                          type="text"
                          disabled={!canEdit}
                          value={formData.smsPatternCode || ''}
                          onChange={(e) => setFormData({ ...formData, smsPatternCode: e.target.value })}
                          placeholder="کد شناسه الگوی تایید شده در پنل پیامک"
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          جهت ارسال پیامک به خطوط مسدودکننده پیامک‌های تبلیغاتی
                        </span>
                      </div>
                    )}

                    {formData.smsProvider === 'CUSTOM' && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                          <span>آدرس اینترنتی سامانه پیامک دلخواه</span>
                          <span className="text-[10px] text-rose-500 font-normal">* الزامی</span>
                        </label>
                        <input
                          type="url"
                          disabled={!canEdit}
                          value={formData.smsCustomEndpoint || ''}
                          onChange={(e) => setFormData({ ...formData, smsCustomEndpoint: e.target.value })}
                          placeholder="https://sms-provider.ir/send"
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Section: Connection Status Card & Action Bar */}
            <div className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-2xl border border-slate-200/90 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-900">اتصال و وضعیت پنل</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-slate-600">
                      {formData.smsProvider === 'MELIPAYAMAK' ? (formData.smsConnectionMode === 'new_api' ? 'API جدید' : 'REST قدیمی') : formData.smsProvider}
                    </span>
                  </div>

                  {/* Status Indicator Badges */}
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    {(() => {
                      const status = isCheckingBalance ? 'CHECKING' : (formData.smsLastConnectionStatus || 'UNKNOWN');
                      switch (status) {
                        case 'CHECKING':
                          return (
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                              <span>در حال بررسی اتصال...</span>
                            </span>
                          );
                        case 'SUCCESS':
                          return (
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>اتصال برقرار است</span>
                            </span>
                          );
                        case 'INVALID_CREDENTIALS':
                          return (
                            <span className="text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>نام کاربری/رمز/کلید اتصال نامعتبر است</span>
                            </span>
                          );
                        case 'INVALID_SENDER':
                          return (
                            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>خط فرستنده نامعتبر یا تأییدنشده است</span>
                            </span>
                          );
                        case 'INSUFFICIENT_CREDIT':
                          return (
                            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>اعتبار کافی نیست</span>
                            </span>
                          );
                        case 'SERVICE_ERROR':
                          return (
                            <span className="text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>خطای سرویس پیامک</span>
                            </span>
                          );
                        case 'NETWORK_ERROR':
                          return (
                            <span className="text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>خطا در ارتباط با سرویس</span>
                            </span>
                          );
                        default:
                          return (
                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5 text-slate-500" />
                              <span>اتصال بررسی نشده</span>
                            </span>
                          );
                      }
                    })()}

                    {/* Balance Display if Available */}
                    {(balanceResult?.balance || formData.smsLastBalance) && (
                      <span className="text-xs font-bold text-indigo-900 bg-indigo-100/70 px-2.5 py-1 rounded-lg border border-indigo-200 font-mono">
                        مانده اعتبار: {balanceResult?.balance || formData.smsLastBalance}
                      </span>
                    )}

                    {/* Last Check Timestamp */}
                    {formData.smsLastConnectionCheck && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>آخرین بررسی: {new Date(formData.smsLastConnectionCheck).toLocaleTimeString('fa-IR')}</span>
                      </span>
                    )}
                  </div>

                  {balanceResult?.message && (
                    <p className="text-[11px] text-slate-600 pt-1 leading-relaxed">
                      {balanceResult.message}
                    </p>
                  )}
                </div>

                {/* Connection Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCheckBalance}
                    disabled={isCheckingBalance}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingBalance ? 'animate-spin' : ''}`} />
                    <span>{isCheckingBalance ? 'در حال استعلام...' : 'استعلام مانده اعتبار'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSaving || !canEdit}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* LIVE SMS TEST SECTION */}
            <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ارسال پیامک آزمایشی و تست صحت اتصال</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  تست واقعی اتصال و ارسال پیامک از همان پنل
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>شماره تست گیرنده:</span>
                    <span className="text-[10px] text-slate-400 font-mono">09xxxxxxxxx</span>
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
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
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
                    <span>{isTestingSms ? 'در حال ارسال...' : 'ارسال پیامک تست'}</span>
                  </button>
                </div>
              </div>

              {/* Test Result Display */}
              {testSmsResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 transition-all ${
                    testSmsResult.success
                      ? 'bg-emerald-50 text-emerald-950 border border-emerald-200'
                      : 'bg-rose-50 text-rose-950 border border-rose-200'
                  }`}
                >
                  {testSmsResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="font-bold text-xs">{testSmsResult.message}</p>
                      {testSmsResult.trackingCode && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                          شناسه پیگیری: {testSmsResult.trackingCode}
                        </span>
                      )}
                    </div>
                    {testSmsResult.success && (
                      <span className="text-[11px] text-emerald-700 block">
                        زمان آخرین تست: {new Date().toLocaleTimeString('fa-IR')} | گیرنده: {testPhone}
                      </span>
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
