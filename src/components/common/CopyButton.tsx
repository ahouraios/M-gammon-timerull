import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  label?: string;
  title?: string;
  className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label,
  title,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  if (!text) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={title || (copied ? 'کپی شد!' : `کپی ${label || ''}`)}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono transition-all cursor-pointer ${
        copied
          ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 shadow-2xs'
          : 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200/80 hover:border-indigo-300'
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
          <span className="text-[9px]">کپی شد</span>
        </>
      ) : (
        <>
          <Copy className="w-2.5 h-2.5 text-slate-400 group-hover:text-indigo-600" />
          {label && <span className="text-[10px]">{label}</span>}
        </>
      )}
    </button>
  );
};
