import React, { useState } from 'react';
import {
  LogIn,
  KeyRound,
  Shield,
  Fingerprint,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { User } from '../../types';
import { StorageService } from '../../services/storage';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'PASSWORD' | 'BIOMETRIC'>('PASSWORD');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!loginId.trim()) {
      setErrorMsg('لطفاً نام کاربری، کد پرسنلی یا شماره موبایل را وارد نمایید.');
      return;
    }

    const res = StorageService.authenticate(loginId, password);
    if (res.success && res.user) {
      setSuccessMsg(`خوش آمدید، ${res.user.name}`);
      setTimeout(() => {
        onLogin(res.user!);
      }, 500);
    } else {
      setErrorMsg(res.message || 'نام کاربری یا رمز عبور اشتباه است.');
    }
  };

  const handleQuickLogin = (username: string, pass = '123') => {
    setLoginId(username);
    setPassword(pass);
    setErrorMsg(null);
    const res = StorageService.authenticate(username, pass);
    if (res.success && res.user) {
      setSuccessMsg(`ورود موفق: ${res.user.name}`);
      setTimeout(() => {
        onLogin(res.user!);
      }, 400);
    }
  };

  const handleBiometric = () => {
    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setTimeout(() => {
      setIsProcessing(false);
      // Log in as sample employee
      const users = StorageService.getAllEmployeesRaw();
      const empUser = StorageService.getUsers().find(u => u.role === 'EMPLOYEE');
      if (empUser) {
        setSuccessMsg(`اثر انگشت تایید شد: ${empUser.name}`);
        setTimeout(() => {
          onLogin(empUser);
        }, 500);
      }
    }, 1200);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 sm:p-6"
      dir="rtl"
    >
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 p-6 text-white text-center relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-3 shadow-inner">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-wider">
            M.GAMMON
          </h1>
          <p className="text-indigo-100 text-xs mt-1 font-medium">
            سامانه مدیریت تردد و پرسنل کارگاه‌ها
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] text-white/90 border border-white/20">
            <span>مشهد، توس ۱۴۲، حسین زاده ۸</span>
          </div>
        </div>

        {/* Security Notice Banner */}
        <div className="bg-amber-50/80 border-b border-amber-200/60 p-3.5 px-5 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
            <strong>حریم خصوصی تضمین‌شده:</strong> هر کارمند تنها به پرتال و کارکرد شخصی خود دسترسی دارد و دسترسی به اطلاعات مالی یا تردد دیگران کاملاً مسدود است.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Method Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('PASSWORD')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'PASSWORD'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>نام کاربری و رمز</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('BIOMETRIC')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'BIOMETRIC'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>ورود اثر انگشت</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'PASSWORD' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نام کاربری / کد پرسنلی / شماره موبایل
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="مثال: admin یا a.karimi یا کد پرسنلی"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    رمز عبور
                  </label>
                  <span className="text-[10px] text-slate-400">پیش‌فرض: 123</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="رمز عبور حساب"
                    className="w-full text-xs p-3 pl-10 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.99]"
              >
                <LogIn className="w-4 h-4" />
                <span>ورود به سامانه</span>
              </button>
            </form>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center">
                <Fingerprint
                  className={`w-12 h-12 ${
                    isProcessing ? 'text-indigo-600 animate-pulse' : 'text-indigo-500'
                  }`}
                />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  سنسور اثر انگشت بیومتریک
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  انگشت خود را روی حسگر دستگاه قرار داده یا دکمه زیر را لمس کنید
                </p>
              </div>
              <button
                type="button"
                onClick={handleBiometric}
                disabled={isProcessing}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                {isProcessing ? 'در حال اسکن اثر انگشت...' : 'تایید و ورود بیومتریک'}
              </button>
            </div>
          )}

          {/* Quick Login for Majid Nouraei */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', '123')}
              className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-xs text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-slate-800">ورود مدیر: مجید نورایی</span>
                <span className="text-[11px] text-slate-400 font-mono">(admin)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold shrink-0">
                مدیر ارشد
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>سامانه کارگاهی M.GAMMON</span>
          <a
            href="https://ahourai.ir"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1 font-medium"
          >
            <span>طراحی و توسعه توسط اهورایی</span>
            <span className="text-rose-500 text-xs">❤️</span>
          </a>
        </div>
      </div>
    </div>
  );
};
