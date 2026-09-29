import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  PERSIAN_MONTHS,
  PERSIAN_WEEKDAYS,
  getTodayShamsi,
  getDaysInJalaliMonth,
  getJalaliMonthFirstDayOfWeek,
} from '../../utils/dateUtils';

interface ShamsiDatePickerProps {
  value: string; // e.g. "1405/07/15"
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  helperText?: string;
  align?: 'right' | 'left' | 'center';
}

export const ShamsiDatePicker: React.FC<ShamsiDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'انتخاب تاریخ...',
  disabled = false,
  required = false,
  className = '',
  helperText,
  align = 'right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial or current value, fallback to today
  const todayStr = getTodayShamsi();
  const parseDate = (dStr: string) => {
    if (!dStr) return null;
    const parts = dStr.split('/').map((p) => parseInt(p, 10));
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return { y: parts[0], m: parts[1], d: parts[2] };
    }
    return null;
  };

  const parsedCurrent = parseDate(value);
  const parsedToday = parseDate(todayStr)!;

  const [viewYear, setViewYear] = useState<number>(
    parsedCurrent?.y || parsedToday.y
  );
  const [viewMonth, setViewMonth] = useState<number>(
    parsedCurrent?.m || parsedToday.m
  );

  // Keep view in sync when value changes externally
  useEffect(() => {
    if (parsedCurrent) {
      setViewYear(parsedCurrent.y);
      setViewMonth(parsedCurrent.m);
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const daysInMonth = getDaysInJalaliMonth(viewYear, viewMonth);
  const firstDayOfWeek = getJalaliMonthFirstDayOfWeek(viewYear, viewMonth);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const mm = viewMonth < 10 ? `0${viewMonth}` : `${viewMonth}`;
    const dd = day < 10 ? `0${day}` : `${day}`;
    const formatted = `${viewYear}/${mm}/${dd}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(todayStr);
    setViewYear(parsedToday.y);
    setViewMonth(parsedToday.m);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const years = Array.from({ length: 16 }, (_, i) => 1395 + i);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Main Input Display */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-xs p-2.5 rounded-lg border transition-all cursor-pointer select-none bg-white ${
          disabled
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
            : isOpen
            ? 'border-indigo-600 ring-2 ring-indigo-100 text-slate-800'
            : 'border-slate-200 hover:border-slate-300 text-slate-700'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className={`font-mono text-xs ${value ? 'font-bold text-slate-800' : 'text-slate-400 font-normal'}`}>
            {value || placeholder}
          </span>
        </div>
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
            title="پاک کردن"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {helperText && (
        <p className="text-[11px] text-slate-400 mt-1">{helperText}</p>
      )}

      {/* Popup Calendar Dropdown */}
      {isOpen && (
        <div
          className={`absolute z-[999] mt-1.5 w-72 sm:w-76 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 text-right animate-in fade-in zoom-in-95 duration-100 max-w-[calc(100vw-2rem)] ${
            align === 'left'
              ? 'left-0 right-auto max-sm:left-1/2 max-sm:-translate-x-1/2'
              : align === 'center'
              ? 'left-1/2 -translate-x-1/2'
              : 'right-0 left-auto max-sm:right-1/2 max-sm:translate-x-1/2'
          }`}
          dir="rtl"
        >
          {/* Header Controls */}
          <div className="flex items-center justify-between gap-1 mb-3 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="ماه قبل"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
              >
                {PERSIAN_MONTHS.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono focus:outline-none cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="ماه بعد"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((w, idx) => (
              <div
                key={w}
                className={`text-[11px] font-bold py-1 ${
                  idx === 6 ? 'text-rose-500' : 'text-slate-400'
                }`}
                title={PERSIAN_WEEKDAYS[idx]}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-8 w-8" />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const isSelected =
                parsedCurrent &&
                parsedCurrent.y === viewYear &&
                parsedCurrent.m === viewMonth &&
                parsedCurrent.d === day;

              const isToday =
                parsedToday.y === viewYear &&
                parsedToday.m === viewMonth &&
                parsedToday.d === day;

              const dayOfWeekIdx = (firstDayOfWeek + day - 1) % 7;
              const isFriday = dayOfWeekIdx === 6;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 rounded-lg text-xs font-mono font-medium flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-xs scale-105'
                      : isToday
                      ? 'border border-indigo-500 text-indigo-700 bg-indigo-50/60 font-bold'
                      : isFriday
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Action Footer */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>امروز ({todayStr})</span>
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
