import React from 'react';
import {
  LayoutDashboard,
  Users,
  Clock,
  QrCode,
  PlaneTakeoff,
  Wallet,
  CreditCard,
  BarChart3,
  CalendarDays,
  Settings,
  UserCheck,
  MessageSquare,
  Menu,
  X,
  ChevronLeft,
  Building2,
  Printer,
  Camera,
  LogOut,
} from 'lucide-react';
import { Role, User } from '../../types';
import { NavTab } from './Sidebar';
import { DeveloperBadge } from './DeveloperBadge';

interface MobileNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  role?: Role;
  currentRole?: Role;
  currentUser?: User;
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
  pendingLeavesCount: number;
  pendingAdvancesCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onSelectTab,
  role,
  currentRole,
  currentUser,
  isOpen,
  onClose,
  onLogout,
  pendingLeavesCount,
  pendingAdvancesCount,
}) => {
  const activeRole = currentRole || role || currentUser?.role || 'ADMIN';
  const totalPending = pendingLeavesCount + pendingAdvancesCount;

  // Primary 4-5 tabs for the Bottom Bar
  const getBottomNavItems = () => {
    if (activeRole === 'EMPLOYEE') {
      return [
        { id: 'employee-portal' as NavTab, label: 'پرتال من', icon: UserCheck },
        { id: 'attendance' as NavTab, label: 'تردد و اسکن', icon: Camera },
        { id: 'leaves' as NavTab, label: 'مرخصی', icon: PlaneTakeoff, badge: totalPending },
        { id: 'payroll' as NavTab, label: 'حقوق', icon: CreditCard },
      ];
    }
    if (activeRole === 'MANAGER') {
      return [
        { id: 'dashboard' as NavTab, label: 'داشبورد', icon: LayoutDashboard },
        { id: 'employees' as NavTab, label: 'پرسنل', icon: Users },
        { id: 'attendance' as NavTab, label: 'ترددها', icon: Clock },
        { id: 'qr-kiosk' as NavTab, label: 'پوستر بارکد', icon: Printer },
        { id: 'messages' as NavTab, label: 'پیام‌ها', icon: MessageSquare },
      ];
    }
    // ADMIN
    return [
      { id: 'dashboard' as NavTab, label: 'داشبورد', icon: LayoutDashboard },
      { id: 'employees' as NavTab, label: 'پرسنل', icon: Users },
      { id: 'attendance' as NavTab, label: 'ترددها', icon: Clock },
      { id: 'qr-kiosk' as NavTab, label: 'پوستر بارکد', icon: Printer },
      { id: 'messages' as NavTab, label: 'پیام‌ها', icon: MessageSquare },
    ];
  };

  // Full item list for Drawer
  const getAllNavItems = () => {
    if (activeRole === 'EMPLOYEE') {
      return [
        { id: 'employee-portal' as NavTab, label: 'میز کار پرسنلی', icon: UserCheck },
        { id: 'attendance' as NavTab, label: 'ثبت تردد با دوربین و GPS', icon: Camera },
        { id: 'qr-kiosk' as NavTab, label: 'پوستر بارکدهای کارگاه', icon: Printer },
        { id: 'leaves' as NavTab, label: 'درخواست‌های مرخصی', icon: PlaneTakeoff },
        { id: 'advances' as NavTab, label: 'درخواست مساعده', icon: Wallet },
        { id: 'payroll' as NavTab, label: 'فیش‌های حقوقی', icon: CreditCard },
      ];
    }
    if (activeRole === 'MANAGER') {
      return [
        { id: 'dashboard' as NavTab, label: 'داشبورد مدیریت', icon: LayoutDashboard },
        { id: 'employees' as NavTab, label: 'لیست پرسنل', icon: Users },
        { id: 'attendance' as NavTab, label: 'گزارش تردد پرسنل', icon: Clock },
        { id: 'qr-kiosk' as NavTab, label: 'چاپ پوستر بارکد کارگاه', icon: Printer },
        { id: 'messages' as NavTab, label: 'اطلاع‌رسانی و پیامک', icon: MessageSquare },
        { id: 'leaves' as NavTab, label: 'بررسی مرخصی‌ها', icon: PlaneTakeoff, badge: pendingLeavesCount },
        { id: 'advances' as NavTab, label: 'بررسی مساعده‌ها', icon: Wallet, badge: pendingAdvancesCount },
        { id: 'payroll' as NavTab, label: 'حقوق و دستمزد', icon: CreditCard },
        { id: 'reports' as NavTab, label: 'گزارشات آماری', icon: BarChart3 },
        { id: 'employee-portal' as NavTab, label: 'میز کار پرسنلی من', icon: UserCheck },
        { id: 'settings' as NavTab, label: 'تنظیمات قوانین', icon: Settings },
      ];
    }
    // ADMIN
    return [
      { id: 'dashboard' as NavTab, label: 'داشبورد ارشد', icon: LayoutDashboard },
      { id: 'employees' as NavTab, label: 'مدیریت پرسنل', icon: Users },
      { id: 'attendance' as NavTab, label: 'مدیریت ترددها', icon: Clock },
      { id: 'qr-kiosk' as NavTab, label: 'کیوسک دینامیک QR و GPS', icon: QrCode },
      { id: 'schedules' as NavTab, label: 'شیفت‌ها و ساعات کاری', icon: CalendarDays },
      { id: 'messages' as NavTab, label: 'سامانه پیامک و اطلاع‌رسانی', icon: MessageSquare },
      { id: 'leaves' as NavTab, label: 'مدیریت مرخصی‌ها', icon: PlaneTakeoff, badge: pendingLeavesCount },
      { id: 'advances' as NavTab, label: 'مدیریت مساعده‌ها', icon: Wallet, badge: pendingAdvancesCount },
      { id: 'payroll' as NavTab, label: 'محاسبه حقوق و دستمزد', icon: CreditCard },
      { id: 'reports' as NavTab, label: 'گزارشات و خروجی اکسل', icon: BarChart3 },
      { id: 'employee-portal' as NavTab, label: 'پرتال اختصاصی پرسنل', icon: UserCheck },
      { id: 'settings' as NavTab, label: 'تنظیمات و لاگ وقایع', icon: Settings },
    ];
  };

  const bottomItems = getBottomNavItems();
  const drawerItems = getAllNavItems();

  return (
    <>
      {/* 1. STICKY MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-lg px-2 py-1.5 flex items-center justify-around max-w-full overflow-hidden">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer relative min-w-[56px] ${
                isActive
                  ? 'text-indigo-600 font-bold scale-105'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600 stroke-[2.2]' : 'text-slate-400'}`} />
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 ${isActive ? 'font-bold text-indigo-600' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More Drawer Button */}
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-mobile-drawer'));
          }}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer min-w-[56px]"
          title="سایر بخش‌ها"
        >
          <Menu className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] mt-1 text-slate-500">بیشتر</span>
        </button>
      </nav>

      {/* 2. SLIDE-OVER MOBILE DRAWER */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-800">
                    M.GAMMON
                  </h3>
                  <p className="text-[10px] text-slate-400">نسخه موبایل هوشمند</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current User info in Drawer */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {currentUser?.name || 'کاربر'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {currentUser?.role === 'ADMIN'
                    ? 'مدیریت ارشد'
                    : currentUser?.role === 'MANAGER'
                    ? 'مدیر منابع انسانی'
                    : 'پرسنل'}
                </span>
              </div>
              <span className="text-[10px] text-indigo-600 font-medium font-mono">
                {currentUser?.phone || ''}
              </span>
            </div>

            {/* Navigation Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {drawerItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-right transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white font-semibold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {Boolean(item.badge && item.badge > 0) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                          {item.badge}
                        </span>
                      )}
                      {isActive && <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Logout button if provided */}
            {onLogout && (
              <div className="p-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer border border-rose-200"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>خروج از حساب کاربری</span>
                </button>
              </div>
            )}

            {/* Footer Branding in Drawer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-center space-y-2">
              <span className="text-[11px] text-slate-500 font-medium inline-block">
                M.GAMMON Smart HRM System
              </span>
              <DeveloperBadge variant="menu" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
