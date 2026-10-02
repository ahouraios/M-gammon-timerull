import React from 'react';

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
      <div className={`inline-flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-mono ${className}`}>
        <span>M.GAMMON</span>
        <span>•</span>
        <span>سامانه مدیریت کارگاهی</span>
      </div>
    );
  }

  if (variant === 'menu') {
    return (
      <div className={`w-full text-center py-2 px-3 rounded-xl bg-slate-50/80 border border-slate-200/60 ${className}`}>
        <span className="text-[11px] text-slate-400 font-medium">
          سامانه یکپارچه مدیریت تردد و پرسنل M.GAMMON
        </span>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between text-xs text-slate-600 ${className}`}>
        <span className="font-bold text-slate-700">سامانه اتوماسیون و حضور و غیاب پرسنلی M.GAMMON</span>
        <span className="text-[11px] text-slate-400 font-mono">نسخه پایدار</span>
      </div>
    );
  }

  // Footer & subtle
  return (
    <div className={`text-center text-xs text-slate-400 font-medium ${className}`}>
      <span>اتوماسیون هوشمند تردد و حضور و غیاب پرسنل • M.GAMMON</span>
    </div>
  );
};
