import React from 'react';
import { Heart, ExternalLink } from 'lucide-react';

interface DeveloperBadgeProps {
  className?: string;
  variant?: 'subtle' | 'card' | 'footer' | 'compact' | 'menu';
}

export const DeveloperBadge: React.FC<DeveloperBadgeProps> = ({
  className = '',
  variant = 'subtle'
}) => {
  const targetUrl = 'https://ahourai.ir';

  if (variant === 'compact') {
    return (
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center gap-1.5 text-[11px] text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer group ${className}`}
        title="طراحی و توسعه توسط اهورایی - ahourai.ir"
      >
        <span>طراحی و توسعه با</span>
        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse inline-block" />
        <span className="font-bold underline decoration-dotted underline-offset-2">توسط اهورایی</span>
      </a>
    );
  }

  if (variant === 'menu') {
    return (
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`w-full text-center py-2 px-3 rounded-xl bg-slate-50/80 hover:bg-indigo-50/80 border border-slate-200/60 hover:border-indigo-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer group ${className}`}
        title="طراحی و توسعه توسط اهورایی - ahourai.ir"
      >
        <span className="text-[11px] text-slate-500 group-hover:text-indigo-700 font-medium">
          طراحی و توسعه با
        </span>
        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline-block animate-pulse" />
        <span className="text-[11px] font-bold text-slate-700 group-hover:text-indigo-900 underline decoration-dotted">
          توسط اهورایی
        </span>
        <span className="text-[10px] text-slate-400 font-mono mr-1">(ahourai.ir)</span>
      </a>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600 ${className}`}>
        <span className="font-bold text-slate-700">سامانه مدیریت کارگاهی M.GAMMON</span>
        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
        >
          <span>طراحی و توسعه با</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
          <span className="font-bold underline decoration-dotted">توسط اهورایی</span>
          <span className="text-[11px] font-mono text-slate-400">(ahourai.ir)</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
      </div>
    );
  }

  // Footer & subtle
  return (
    <div className={`text-center text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5 ${className}`}>
      <span>طراحی و توسعه با</span>
      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse inline-block" />
      <span>توسط</span>
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold text-slate-700 hover:text-indigo-600 underline decoration-dotted underline-offset-2 transition-colors inline-flex items-center gap-1"
      >
        <span>اهورایی</span>
        <span className="font-mono text-[11px] text-indigo-500">(ahourai.ir)</span>
        <ExternalLink className="w-3 h-3 text-indigo-400 inline" />
      </a>
    </div>
  );
};
