import React from 'react';
import { ExternalLink, Heart } from 'lucide-react';

interface DeveloperBadgeProps {
  className?: string;
  variant?: 'subtle' | 'card' | 'footer' | 'compact' | 'menu';
}

export const DeveloperBadge: React.FC<DeveloperBadgeProps> = ({
  className = '',
  variant = 'subtle'
}) => {
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center justify-center gap-1 text-[11px] text-slate-400 ${className}`}>
        <span>طراحی و توسعه توسط</span>
        <a
          href="https://ahourai.ir"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-slate-700 hover:text-indigo-600 underline underline-offset-2 decoration-slate-300 hover:decoration-indigo-500 transition-colors inline-flex items-center gap-0.5"
          title="اهورایی - ahourai.ir"
        >
          <span>اهورایی</span>
          <span className="text-rose-500">❤️</span>
        </a>
      </div>
    );
  }

  if (variant === 'menu') {
    return (
      <div className={`w-full text-center py-2 px-3 rounded-xl bg-slate-50/90 border border-slate-200/70 hover:border-indigo-200 transition-all ${className}`}>
        <a
          href="https://ahourai.ir"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center justify-center gap-1.5 text-[11px] text-slate-500 hover:text-indigo-600 transition-colors"
          title="مشاهده وب‌سایت اهورایی (ahourai.ir)"
        >
          <span>طراحی و توسعه توسط</span>
          <span className="font-bold text-slate-800 group-hover:text-indigo-600 group-hover:underline decoration-indigo-400 underline-offset-2">
            اهورایی
          </span>
          <span className="text-rose-500 inline-block group-hover:scale-110 transition-transform">❤️</span>
          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs ${className}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-xs">
            AH
          </div>
          <div>
            <span className="font-bold text-slate-800 block text-xs">توسعه نرم‌افزاری و پشتیبانی فنی سامانه</span>
            <span className="text-[11px] text-slate-500">ارائه‌دهنده راه‌کارهای هوشمند اتوماسیون سازمانی</span>
          </div>
        </div>
        <a
          href="https://ahourai.ir"
          target="_blank"
          rel="noopener noreferrer"
          className="group px-3.5 py-1.5 rounded-xl bg-white hover:bg-indigo-600 text-slate-700 hover:text-white border border-slate-200 hover:border-indigo-600 font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
        >
          <span>طراحی و توسعه توسط اهورایی</span>
          <span className="text-rose-500 group-hover:text-rose-300">❤️</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
        </a>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`flex items-center justify-center gap-1.5 text-xs text-slate-500 ${className}`}>
        <span>طراحی و توسعه توسط</span>
        <a
          href="https://ahourai.ir"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-slate-700 hover:text-indigo-600 transition-colors inline-flex items-center gap-1 underline underline-offset-4 decoration-slate-300 hover:decoration-indigo-500"
          title="ahourai.ir"
        >
          <span>اهورایی</span>
          <span className="text-rose-500">❤️</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
      </div>
    );
  }

  // Default subtle
  return (
    <div className={`text-center text-xs text-slate-400 font-medium ${className}`}>
      <span>طراحی و توسعه توسط </span>
      <a
        href="https://ahourai.ir"
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold text-slate-700 hover:text-indigo-600 underline underline-offset-2 decoration-slate-300 hover:decoration-indigo-500 transition-colors inline-flex items-center gap-1"
        title="اهورایی (ahourai.ir)"
      >
        <span>اهورایی</span>
        <span className="text-rose-500 inline-block">❤️</span>
      </a>
    </div>
  );
};
