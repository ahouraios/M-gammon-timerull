import React, { useState } from 'react';
import {
  LogIn,
  KeyRound,
  Shield,
  Building2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { User } from '../../types';
import { StorageService } from '../../services/storage';
import { DeveloperBadge } from '../common/DeveloperBadge';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!loginId.trim()) {
      setErrorMsg('لطفاً نام کاربری، کد پرسنلی یا شماره موبایل را وارد نمایید.');
      return;
    }
    if (!password) {
      setErrorMsg('لطفاً رمز عبور را وارد نمایید.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await StorageService.authenticateAsync(loginId, password);
      if (res.success && res.user) {
        setSuccessMsg(`خوش آمدید، ${res.user.name}`);
        setTimeout(() => {
          onLogin(res.user!);
        }, 500);
      } else {
        setErrorMsg(res.message || 'نام کاربری یا رمز عبور اشتباه است.');
      }
    } catch {
      setErrorMsg('خطا در برقراری ارتباط با سامانه احراز هویت مرکزی.');
    } finally {
      setIsSubmitting(false);
    }
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
            <strong>سامانه متمرکز و امن:</strong> احراز هویت با رمزنگاری پیشرفته، تفکیک سطوح دسترسی کارمندان، سرپرستان و مدیریت ارشد.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-5">
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
                  placeholder="مثال: admin یا کد پرسنلی"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  رمز عبور
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="رمز عبور حساب کاربری"
                  className="w-full text-xs p-3 pl-10 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.99] ${
                isSubmitting
                  ? 'bg-slate-400 text-white cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'در حال بررسی مشخصات...' : 'ورود به سامانه'}</span>
            </button>
          </form>
        </div>

        {/* Security & Developer Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center space-y-2">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>ارتباط امن با پروتکل رمزنگاری و حفاظت از حریم خصوصی پرسنل</span>
          </p>
          <DeveloperBadge variant="footer" />
        </div>
      </div>
    </div>
  );
};
