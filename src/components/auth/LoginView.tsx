import React, { useState, useEffect } from 'react';
import {
  LogIn,
  Eye,
  EyeOff,
  Fingerprint,
  MapPin,
  AlertCircle,
  CheckCircle2,
  User as UserIcon,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { User } from '../../types';
import { StorageService, RememberedUser } from '../../services/storage';
import { DeveloperBadge } from '../common/DeveloperBadge';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const settings = StorageService.getSettings();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  // Biometrics & Daily Quick-Login State
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [rememberedUser, setRememberedUser] = useState<RememberedUser | null>(null);
  const [isQuickLoginMode, setIsQuickLoginMode] = useState(false);

  useEffect(() => {
    // Check real platform authenticator support
    StorageService.isBiometricAvailable().then((supported) => {
      setIsBiometricSupported(supported);
    });

    // Check if a user previously logged in on this device
    const cached = StorageService.getRememberedUser();
    if (cached) {
      setRememberedUser(cached);
      setLoginId(cached.personalCode || cached.username || cached.phone || '');
      setIsQuickLoginMode(true);
    }
  }, []);

  // Standard Password Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanId = loginId.trim();
    if (!cleanId) {
      setErrorMsg('لطفاً کد پرسنلی یا شماره موبایل را وارد نمایید.');
      return;
    }
    if (!password) {
      setErrorMsg('لطفاً رمز عبور را وارد نمایید.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await StorageService.authenticateAsync(cleanId, password, rememberMe);
      if (res.success && res.user) {
        setSuccessMsg(`خوش آمدید، ${res.user.name}`);
        setTimeout(() => {
          onLogin(res.user!);
        }, 400);
      } else {
        setErrorMsg(res.message || 'کد پرسنلی یا رمز عبور اشتباه است.');
      }
    } catch {
      setErrorMsg('خطا در برقراری ارتباط با سرور.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real WebAuthn Biometric Login
  const handleBiometricLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const targetId = isQuickLoginMode && rememberedUser
        ? rememberedUser.username || rememberedUser.phone || loginId
        : loginId.trim() || undefined;

      const res = await StorageService.authenticateBiometricAsync(targetId, rememberMe);
      if (res.success && res.user) {
        setSuccessMsg(`خوش آمدید، ${res.user.name}`);
        setTimeout(() => {
          onLogin(res.user!);
        }, 400);
      } else {
        setErrorMsg(res.message || 'احراز هویت با اثر انگشت انجام نشد.');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'خطا در خواندن حسگر اثر انگشت.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center p-3.5 sm:p-6 overflow-hidden selection:bg-amber-600 selection:text-white"
      dir="rtl"
    >
      {/* 
        Layer 1: Background - Artisan Handcrafted Walnut Backgammon Aesthetic 
        Rich dark walnut wood tones with warm amber marquetry geometric accents
      */}
      <div className="absolute inset-0 bg-[#0d0907] overflow-hidden pointer-events-none">
        {/* Subtle woodgrain & backgammon points geometric SVG overlay */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.14] mix-blend-color-dodge"
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="wood-backgammon-marquetry" width="120" height="120" patternUnits="userSpaceOnUse">
              {/* Backgammon triangular points marquetry */}
              <polygon points="0,0 60,120 120,0" fill="#a46830" opacity="0.15" />
              <polygon points="0,120 60,0 120,120" fill="#583115" opacity="0.2" />
              <line x1="0" y1="0" x2="120" y2="120" stroke="#f1a953" strokeWidth="0.5" opacity="0.1" />
              <line x1="120" y1="0" x2="0" y2="120" stroke="#d28238" strokeWidth="0.5" opacity="0.1" />
            </pattern>
            <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#452414" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#1a0d07" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#080402" stopOpacity="0.98" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#wood-backgammon-marquetry)" />
          <rect width="100%" height="100%" fill="url(#vignette)" />
        </svg>

        {/* Ambient warm lighting glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-amber-800/20 via-orange-950/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-amber-900/15 to-transparent rounded-full blur-2xl" />
      </div>

      {/* Layer 2: Dark / Gradient Soft Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/70 backdrop-blur-[2px] pointer-events-none" />

      {/* Layer 3: Login Card */}
      <div className="relative z-10 w-[92%] sm:w-full max-w-sm sm:max-w-md mx-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white rounded-3xl shadow-xl shadow-black/25 border border-slate-200/90 overflow-hidden">
          
          {/* Card Top: Logo, Titles and Workshop Location */}
          <div className="pt-7 pb-4 px-6 sm:px-8 text-center flex flex-col items-center">
            
            {/* 1. App Logo (Configurable via Settings, with elegant fallback) */}
            <div className="mb-3.5 flex items-center justify-center">
              {settings.logoUrl && !logoLoadFailed ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.companyName || 'M.GAMMON'}
                  onError={() => setLogoLoadFailed(true)}
                  className="h-14 sm:h-16 w-auto max-w-[140px] object-contain transition-transform"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-900 via-amber-950 to-stone-900 text-amber-300 border border-amber-700/40 flex items-center justify-center shadow-md shadow-amber-950/20"
                  title="M.GAMMON"
                >
                  {/* Stylized Backgammon Woodcraft Monogram */}
                  <div className="flex flex-col items-center justify-center font-serif leading-none select-none">
                    <span className="text-xl sm:text-2xl font-black tracking-tight text-amber-200">
                      M<span className="text-amber-500">.</span>G
                    </span>
                    <span className="text-[8px] font-sans tracking-widest text-amber-400/80 font-bold mt-0.5 uppercase">
                      Gammon
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Title & Owner */}
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wide">
              {settings.companyName || 'M.GAMMON'}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              مجید نورایی
            </p>

            {/* 11. Workshop Location Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[11px] font-medium text-slate-600 border border-slate-200/70 mt-2.5">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span>مشهد • توس ۱۴۲</span>
            </div>
          </div>

          {/* Messages Alert */}
          <div className="px-6 sm:px-8">
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-center gap-2 mb-4 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2 mb-4 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>

          {/* Form Content */}
          <div className="px-6 sm:px-8 pb-7">
            {/* 14. Quick-Login Mode for Remembered Daily User */}
            {isQuickLoginMode && rememberedUser ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-amber-900 text-amber-200 flex items-center justify-center font-bold text-base shrink-0 overflow-hidden shadow-xs">
                      {rememberedUser.avatarUrl ? (
                        <img
                          src={rememberedUser.avatarUrl}
                          alt={rememberedUser.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span>{rememberedUser.name?.charAt(0) || '؟'}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate">
                        {rememberedUser.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                        {rememberedUser.personalCode || rememberedUser.phone || rememberedUser.username}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickLoginMode(false);
                      setPassword('');
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                    title="تغییر حساب کاربری"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px]">حساب دیگر</span>
                  </button>
                </div>

                {/* Quick Biometric Fingerprint Button */}
                {isBiometricSupported ? (
                  <button
                    type="button"
                    onClick={handleBiometricLogin}
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                  >
                    <Fingerprint className="w-4 h-4 text-amber-400" />
                    <span>{isSubmitting ? 'در حال ورود...' : '🔐 ورود با اثر انگشت'}</span>
                  </button>
                ) : null}

                {/* Password input for quick-login user */}
                <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      رمز عبور
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="رمز عبور حساب کاربری"
                        className="w-full text-xs p-3 pl-10 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 font-mono transition-all bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-400" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-900 cursor-pointer accent-slate-900"
                      />
                      <span>مرا به خاطر بسپار</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setIsQuickLoginMode(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      ورود با حساب دیگر
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all disabled:bg-slate-400 disabled:cursor-not-allowed"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isSubmitting ? 'در حال ورود...' : 'ورود به سامانه'}</span>
                  </button>
                </form>
              </div>
            ) : (
              /* Standard Login Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 4. Username / Personal Code / Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    کد پرسنلی یا شماره موبایل
                  </label>
                  <input
                    type="text"
                    required
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="کد پرسنلی یا شماره موبایل"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 font-mono transition-all bg-white"
                  />
                </div>

                {/* 5. Password with Eye Icon */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    رمز عبور
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="رمز عبور"
                      className="w-full text-xs p-3 pl-10 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 font-mono transition-all bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                </div>

                {/* 6. Remember Me & 7. Biometrics Toggle */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-900 cursor-pointer accent-slate-900"
                    />
                    <span>مرا به خاطر بسپار</span>
                  </label>

                  {isBiometricSupported && (
                    <button
                      type="button"
                      onClick={handleBiometricLogin}
                      disabled={isSubmitting}
                      className="text-xs font-semibold text-slate-800 hover:text-slate-950 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Fingerprint className="w-3.5 h-3.5 text-amber-700" />
                      <span>🔐 ورود با اثر انگشت</span>
                    </button>
                  )}
                </div>

                {/* 8. Main Login Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all active:scale-[0.99] disabled:bg-slate-400 disabled:cursor-not-allowed mt-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isSubmitting ? 'در حال ورود...' : 'ورود به سامانه'}</span>
                </button>

                {rememberedUser && !isQuickLoginMode && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setIsQuickLoginMode(true)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      ورود سریع با حساب {rememberedUser.name}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* 12. Minimal Footer */}
          <div className="bg-slate-50/80 px-6 py-3.5 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">
              © M.GAMMON • مجید نورایی
            </p>
            <DeveloperBadge variant="footer" className="mt-1" />
          </div>

        </div>
      </div>
    </div>
  );
};
