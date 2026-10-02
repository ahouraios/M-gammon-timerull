import React from 'react';
import {
  LayoutDashboard,
  Users,
  Clock,
  QrCode,
  CalendarDays,
  PlaneTakeoff,
  Wallet,
  CreditCard,
  BarChart3,
  Settings,
  UserCheck,
  MessageSquare,
  ChevronLeft,
  Printer,
  Camera,
  LogOut
} from 'lucide-react';
import { Role } from '../../types';
import { DeveloperBadge } from './DeveloperBadge';

export type NavTab =
  | 'dashboard'
  | 'employees'
  | 'attendance'
  | 'qr-kiosk'
  | 'schedules'
  | 'leaves'
  | 'advances'
  | 'messages'
  | 'payroll'
  | 'reports'
  | 'employee-portal'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  role?: Role;
  currentRole?: Role;
  pendingLeavesCount: number;
  pendingAdvancesCount: number;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  role,
  currentRole,
  pendingLeavesCount,
  pendingAdvancesCount,
  onLogout,
}) => {
  const activeRole = currentRole || role || 'ADMIN';

  const getNavItems = () => {
    if (activeRole === 'EMPLOYEE') {
      return [
        { id: 'employee-portal' as NavTab, label: 'میز کار پرسنلی', icon: UserCheck, count: 0 },
        { id: 'attendance' as NavTab, label: 'تردد و اسکن با دوربین', icon: Camera, count: 0 },
        { id: 'qr-kiosk' as NavTab, label: 'پوستر بارکدهای کارگاه', icon: Printer, count: 0 },
        { id: 'leaves' as NavTab, label: 'درخواست‌های مرخصی', icon: PlaneTakeoff, count: 0 },
        { id: 'advances' as NavTab, label: 'درخواست مساعده', icon: Wallet, count: 0 },
        { id: 'payroll' as NavTab, label: 'فیش‌های حقوقی من', icon: CreditCard, count: 0 },
      ];
    }

    if (activeRole === 'MANAGER') {
      return [
        { id: 'dashboard' as NavTab, label: 'داشبورد مدیریتی', icon: LayoutDashboard, count: 0 },
        { id: 'employees' as NavTab, label: 'لیست پرسنل', icon: Users, count: 0 },
        { id: 'attendance' as NavTab, label: 'گزارش ترددها', icon: Clock, count: 0 },
        { id: 'qr-kiosk' as NavTab, label: 'چاپ پوستر بارکد کارگاه', icon: Printer, count: 0 },
        { id: 'messages' as NavTab, label: 'پیام‌ها و پیامک', icon: MessageSquare, count: 0 },
        { id: 'leaves' as NavTab, label: 'بررسی مرخصی‌ها', icon: PlaneTakeoff, count: pendingLeavesCount },
        { id: 'advances' as NavTab, label: 'بررسی مساعده‌ها', icon: Wallet, count: pendingAdvancesCount },
        { id: 'payroll' as NavTab, label: 'حقوق و دستمزد', icon: CreditCard, count: 0 },
        { id: 'reports' as NavTab, label: 'گزارشات آماری', icon: BarChart3, count: 0 },
        { id: 'settings' as NavTab, label: 'تنظیمات قوانین', icon: Settings, count: 0 },
      ];
    }

    // ADMIN
    return [
      { id: 'dashboard' as NavTab, label: 'داشبورد مدیریتی', icon: LayoutDashboard, count: 0 },
      { id: 'employees' as NavTab, label: 'مدیریت پرسنل', icon: Users, count: 0 },
      { id: 'attendance' as NavTab, label: 'مدیریت ترددها', icon: Clock, count: 0 },
      { id: 'qr-kiosk' as NavTab, label: 'چاپ پوستر بارکد کارگاه', icon: Printer, count: 0 },
      { id: 'schedules' as NavTab, label: 'شیفت‌ها و تقویم کاری', icon: CalendarDays, count: 0 },
      { id: 'messages' as NavTab, label: 'اطلاع‌رسانی و پیامک', icon: MessageSquare, count: 0 },
      { id: 'leaves' as NavTab, label: 'مدیریت مرخصی‌ها', icon: PlaneTakeoff, count: pendingLeavesCount },
      { id: 'advances' as NavTab, label: 'مدیریت مساعده‌ها', icon: Wallet, count: pendingAdvancesCount },
      { id: 'payroll' as NavTab, label: 'محاسبه حقوق و دستمزد', icon: CreditCard, count: 0 },
      { id: 'reports' as NavTab, label: 'گزارشات و خروجی اکسل', icon: BarChart3, count: 0 },
      { id: 'settings' as NavTab, label: 'تنظیمات و رهگیری وقایع', icon: Settings, count: 0 },
    ];
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 shrink-0 bg-white border-l border-slate-200/80 min-h-[calc(100vh-65px)] p-4 flex flex-col justify-between hidden md:flex rounded-2xl shadow-xs">
      <div className="space-y-1">
        <div className="px-3 py-2 mb-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            منوی سیستم ({activeRole === 'ADMIN' ? 'مدیریت ارشد' : activeRole === 'MANAGER' ? 'منابع انسانی' : 'پرسنل'})
          </p>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-indigo-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.count > 0 ? (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                    {item.count}
                  </span>
                ) : isActive ? (
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout Action */}
      {onLogout && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/60 transition-colors cursor-pointer text-right"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>خروج از حساب</span>
            </div>
            <ChevronLeft className="w-3.5 h-3.5 text-rose-400" />
          </button>
        </div>
      )}

      {/* Footer Branding in Sidebar */}
      <div className="pt-3 border-t border-slate-100 space-y-2">
        <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/60 text-center">
          <div className="text-xs text-slate-800 font-bold tracking-wider">
            M.GAMMON
          </div>
          <div className="text-[10px] text-slate-500 block mt-0.5 font-medium">
            مشهد، توس ۱۴۲، حسین زاده ۸
          </div>
        </div>
        <DeveloperBadge variant="menu" />
      </div>
    </aside>
  );
};
