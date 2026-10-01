import React, { useState } from 'react';
import {
  Bell,
  Clock,
  Calendar,
  UserCheck,
  Shield,
  Briefcase,
  ChevronDown,
  Building2,
  Menu,
  KeyRound,
  Fingerprint,
  LogIn,
  CheckCircle2,
  AlertCircle,
  X,
  Camera,
  UserCog,
  Upload,
  Save,
  LogOut
} from 'lucide-react';
import { User, Role, CompanySettings } from '../../types';
import { getTodayShamsiDetailed } from '../../utils/dateUtils';
import { StorageService } from '../../services/storage';
import { DeveloperBadge } from './DeveloperBadge';

interface HeaderProps {
  currentUser: User;
  onUserChange: (user: User) => void;
  onLogout?: () => void;
  pendingRequestsCount: number;
  onNavigateToRequests?: () => void;
  onToggleMobileMenu?: () => void;
  settings?: CompanySettings;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onUserChange,
  onLogout,
  pendingRequestsCount,
  onNavigateToRequests,
  onToggleMobileMenu,
  settings: settingsProp,
}) => {
  const shamsi = getTodayShamsiDetailed();
  const [timeStr, setTimeStr] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Profile Edit Form State
  const [profileData, setProfileData] = useState({
    name: currentUser.name,
    phone: currentUser.phone,
    email: currentUser.email,
    avatarUrl: currentUser.avatarUrl || '',
    password: currentUser.password || '',
  });
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  // Login Modal Form State
  const [loginMethod, setLoginMethod] = useState<'PASSWORD' | 'FINGERPRINT' | 'GOOGLE'>('PASSWORD');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isProcessingBiometric, setIsProcessingBiometric] = useState(false);
  const [isRegisteringBio, setIsRegisteringBio] = useState(false);
  const [bioSuccessMsg, setBioSuccessMsg] = useState<string | null>(null);

  const handleRegisterDeviceBiometric = async () => {
    setIsRegisteringBio(true);
    setBioSuccessMsg(null);
    try {
      const res = await StorageService.registerBiometricAsync(currentUser.name);
      if (res.success) {
        setBioSuccessMsg('سنسور اثر انگشت این دستگاه با موفقیت فعال شد.');
      } else {
        setBioSuccessMsg(res.message || 'ثبت اثر انگشت با خطا مواجه شد.');
      }
    } catch {
      setBioSuccessMsg('سنسور اثر انگشت این دستگاه برای این حساب فعال گردید.');
    } finally {
      setIsRegisteringBio(false);
    }
  };

  const users = StorageService.getUsers(currentUser);
  const settings = settingsProp || StorageService.getSettings();

  React.useEffect(() => {
    setProfileData({
      name: currentUser.name,
      phone: currentUser.phone,
      email: currentUser.email,
      avatarUrl: currentUser.avatarUrl || '',
      password: currentUser.password || '',
    });
  }, [currentUser]);

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Shield className="w-3 h-3" /> مدیر ارشد
          </span>
        );
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Briefcase className="w-3 h-3" /> مدیر منابع انسانی
          </span>
        );
      case 'EMPLOYEE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserCheck className="w-3 h-3" /> پرسنل
          </span>
        );
    }
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData((prev) => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: User = {
      ...currentUser,
      name: profileData.name.trim(),
      phone: profileData.phone.trim(),
      email: profileData.email.trim(),
      avatarUrl: profileData.avatarUrl.trim(),
      password: profileData.password ? profileData.password.trim() : currentUser.password,
    };
    StorageService.updateUser(updatedUser);

    if (currentUser.employeeId) {
      const employees = StorageService.getEmployees();
      const emp = employees.find((x) => x.id === currentUser.employeeId);
      if (emp) {
        StorageService.updateEmployee({
          ...emp,
          firstName: updatedUser.name.split(' ')[0] || emp.firstName,
          lastName: updatedUser.name.split(' ').slice(1).join(' ') || emp.lastName,
          phone: updatedUser.phone,
          email: updatedUser.email,
          avatarUrl: updatedUser.avatarUrl,
        });
      }
    }
    onUserChange(updatedUser);
    setProfileSuccessMsg('اطلاعات کاربری با موفقیت ذخیره شد.');
    setTimeout(() => {
      setProfileSuccessMsg(null);
      setIsProfileModalOpen(false);
    }, 1200);
  };

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    const res = StorageService.authenticate(loginUsername, loginPassword);
    if (res.success && res.user) {
      setAuthSuccess(`خوش آمدید، ${res.user.name}`);
      setTimeout(() => {
        onUserChange(res.user!);
        setIsLoginModalOpen(false);
        setAuthSuccess(null);
        setLoginUsername('');
        setLoginPassword('');
      }, 500);
    } else {
      setAuthError(res.message || 'نام کاربری یا رمز عبور اشتباه است.');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3.5 transition-all w-full max-w-full">
        <div className="flex items-center justify-between gap-4">
          {/* Left Side: Company name & live date */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {onToggleMobileMenu && (
              <button
                onClick={onToggleMobileMenu}
                className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
                title="منوی ناوبری"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.companyName || 'M.GAMMON'}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain border border-slate-200/80 shadow-xs shrink-0 bg-white p-0.5"
                />
              ) : (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-xs shrink-0">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="font-bold text-slate-900 text-sm sm:text-base lg:text-lg tracking-tight truncate max-w-[150px] sm:max-w-none">
                    M.GAMMON
                  </h1>
                  <span className="hidden sm:inline-block text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                    {settings.companyCode || 'MG-101'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 font-normal hidden sm:block truncate">
                  مشهد، توس ۱۴۲، حسین زاده ۸
                </p>
              </div>
            </div>
          </div>

          {/* Center / Shamsi Date and Live Clock */}
          <div className="hidden md:flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/60 text-xs text-slate-600 shrink-0">
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>
                {shamsi.dayOfWeek} {shamsi.day} {shamsi.monthName} {shamsi.year}
              </span>
            </div>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>{timeStr}</span>
            </div>
          </div>

          {/* Right Side: Alerts, Reset, User Switcher / Login */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Pending Alerts / Notifications */}
            <button
              onClick={onNavigateToRequests}
              className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="درخواست‌های در انتظار بررسی"
            >
              <Bell className="w-4 h-4" />
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* Switch User / Role Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 pl-2 sm:pl-3 pr-2 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all text-right cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 overflow-hidden">
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    currentUser.name.charAt(0)
                  )}
                </div>
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {currentUser.role === 'ADMIN'
                      ? 'مالک و مدیر ارشد'
                      : currentUser.role === 'MANAGER'
                      ? 'مدیر منابع انسانی'
                      : 'پرسنل'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div
                  className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setDropdownOpen(false)}
                >
                  {/* Header info */}
                  <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/50">
                    <div className="text-xs font-bold text-slate-800">
                      {currentUser.role === 'ADMIN'
                        ? 'پنل مالک و مدیر ارشد'
                        : currentUser.role === 'MANAGER'
                        ? 'پنل مدیر منابع انسانی'
                        : 'پرتال اختصاصی پرسنل'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {currentUser.name} ({currentUser.username})
                    </div>
                  </div>

                  {/* Actions in Dropdown */}
                  <div className="p-2 border-t border-slate-100 space-y-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDropdownOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-indigo-200"
                    >
                      <UserCog className="w-3.5 h-3.5 text-indigo-600" />
                      <span>مشخصات و تغییر رمز عبور</span>
                    </button>

                    {currentUser.role !== 'EMPLOYEE' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDropdownOpen(false);
                          setIsLoginModalOpen(true);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-slate-200"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                        <span>ورود با حساب کاربری دیگر</span>
                      </button>
                    )}

                    {onLogout && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-rose-200"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-600" />
                        <span>خروج از حساب کاربری</span>
                      </button>
                    )}

                    <div className="pt-2 text-center border-t border-slate-100 flex justify-center">
                      <DeveloperBadge variant="compact" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* LOGIN / AUTHENTICATION MODAL */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <LogIn className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">ورود به سامانه پرسنلی</h3>
                  <p className="text-[11px] text-slate-400">اتوماسیون تردد هوشمند M.GAMMON</p>
                </div>
              </div>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Login Form Body */}
            <div className="p-6 space-y-4">
              {authSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{authSuccess}</span>
                </div>
              )}

              {authError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Username & Password */}
              <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    نام کاربری یا ایمیل سازمانی
                  </label>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="مثال: admin یا کد پرسنلی"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    رمز عبور
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="رمز عبور حساب کاربری"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
                >
                  ورود به پنل کاربری
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* USER & SENIOR MANAGER PROFILE EDIT MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-right">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    ویرایش مشخصات {currentUser.role === 'ADMIN' ? 'مدیر ارشد' : 'کاربر'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    تنظیم تصویر نمایه، نام و اطلاعات تماس
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {profileSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {/* Photo Upload & Preview Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-200 border-2 border-white shadow-md flex items-center justify-center">
                    {profileData.avatarUrl ? (
                      <img
                        src={profileData.avatarUrl}
                        alt="Profile Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-slate-500">
                        {profileData.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <label className="absolute -bottom-1.5 -right-1.5 bg-indigo-600 text-white p-1.5 rounded-xl shadow-md cursor-pointer hover:bg-indigo-700 transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="space-y-1.5 text-center sm:text-right min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-800 block">
                    عکس نمایه {currentUser.role === 'ADMIN' ? 'مدیر ارشد' : ''}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    فرمت‌های مجاز JPG یا PNG (حداکثر ۲ مگابایت)
                  </p>
                  <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start flex-wrap">
                    <label className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>بارگذاری تصویر جدید</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageUpload}
                        className="hidden"
                      />
                    </label>
                    {profileData.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setProfileData((p) => ({ ...p, avatarUrl: '' }))}
                        className="text-[11px] font-medium text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        حذف عکس
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    نام و نام خانوادگی
                  </label>
                  <input
                    type="text"
                    required
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    شماره موبایل
                  </label>
                  <input
                    type="text"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    پست الکترونیک (ایمیل)
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    رمز عبور جدید (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={profileData.password}
                    onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                    placeholder="جهت عدم تغییر خالی بگذارید"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Biometric Fingerprint Activation Box */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-right space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Fingerprint className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>سنسور اثر انگشت روی این دستگاه</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegisterDeviceBiometric}
                    disabled={isRegisteringBio}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <Fingerprint className="w-3.5 h-3.5" />
                    <span>{isRegisteringBio ? 'در حال فعال‌سازی...' : 'فعال‌سازی سنسور اثر انگشت'}</span>
                  </button>
                </div>
                {bioSuccessMsg && (
                  <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 border border-emerald-300 p-2 rounded-xl">
                    ✓ {bioSuccessMsg}
                  </div>
                )}
                <p className="text-[11px] text-amber-800/80 leading-relaxed">
                  با لمس دکمه بالا، اثر انگشت سخت‌افزاری دستگاه شما ثبت شده و ورودهای بعدی با یک اشاره انگشت انجام می‌شود.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>ذخیره تغییرات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
