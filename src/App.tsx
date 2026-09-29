import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { Header } from './components/common/Header';
import { Sidebar, NavTab } from './components/common/Sidebar';
import { MobileNav } from './components/common/MobileNav';
import { LoginView } from './components/auth/LoginView';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { EmployeesView } from './components/employees/EmployeesView';
import { AttendanceView } from './components/attendance/AttendanceView';
import { SchedulesView } from './components/schedules/SchedulesView';
import { WorkshopPrintableQrView } from './components/qr-kiosk/WorkshopPrintableQrView';
import { LeavesView } from './components/leaves/LeavesView';
import { AdvancesView } from './components/advances/AdvancesView';
import { PayrollView } from './components/payroll/PayrollView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { EmployeePortalView } from './components/employee-portal/EmployeePortalView';
import { MessagesView } from './components/messages/MessagesView';

// Service & Types
import { StorageService } from './services/storage';
import {
  Employee,
  AttendanceRecord,
  Shift,
  LeaveRequest,
  AdvanceRequest,
  SalaryRecord,
  CompanySettings,
  AuditLog,
  User,
  BroadcastMessage
} from './types';

export default function App() {
  // State
  const [currentUser, setCurrentUser] = useState<User | null>(() => StorageService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Core Data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [advances, setAdvances] = useState<AdvanceRequest[]>([]);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(() => StorageService.getSettings());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);

  // Load / refresh data from StorageService
  const loadData = (userOverride?: User) => {
    const activeU = userOverride || currentUser || undefined;
    setEmployees(StorageService.getEmployees(activeU));
    setAttendance(StorageService.getAttendance(activeU));
    setShifts(StorageService.getShifts());
    setLeaves(StorageService.getLeaves(activeU));
    setAdvances(StorageService.getAdvances(activeU));
    setSalaries(StorageService.getSalaries(activeU));
    setSettings(StorageService.getSettings());
    setAuditLogs(StorageService.getAuditLogs(activeU));
    setMessages(StorageService.getMessages(activeU));
  };

  useEffect(() => {
    if (currentUser) {
      loadData(currentUser);
    }
    const handleOpenDrawer = () => setIsMobileMenuOpen(true);
    window.addEventListener('open-mobile-drawer', handleOpenDrawer);
    return () => window.removeEventListener('open-mobile-drawer', handleOpenDrawer);
  }, [currentUser]);

  // Strict Role-Based Tab Guard: Employees can NEVER see Admin / HR tabs!
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'EMPLOYEE') {
      const allowedTabs: NavTab[] = ['employee-portal', 'attendance', 'qr-kiosk', 'leaves', 'advances', 'payroll'];
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab('employee-portal');
      }
    }
  }, [currentUser, activeTab]);

  // Handle switching user role
  const handleUserChange = (user: User) => {
    setCurrentUser(user);
    StorageService.setCurrentUser(user);
    loadData(user);
    if (user.role === 'EMPLOYEE') {
      setActiveTab('employee-portal');
    } else if (activeTab === 'employee-portal') {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    StorageService.logout();
    setCurrentUser(null);
  };

  const handleResetData = () => {
    setIsResetModalOpen(true);
  };

  const handleConfirmReset = () => {
    StorageService.resetToDefaults();
    loadData();
    setCurrentUser(StorageService.getCurrentUser());
    setIsResetModalOpen(false);
  };

  // If not logged in, show dedicated LoginView
  if (!currentUser) {
    return (
      <LoginView
        onLogin={(user) => {
          setCurrentUser(user);
          StorageService.setCurrentUser(user);
          loadData(user);
          if (user.role === 'EMPLOYEE') {
            setActiveTab('employee-portal');
          } else {
            setActiveTab('dashboard');
          }
        }}
      />
    );
  }

  // Pending counts for badges
  const pendingLeaves = leaves.filter((l) => l.status === 'PENDING').length;
  const pendingAdvances = advances.filter((a) => a.status === 'PENDING').length;

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white overflow-x-hidden w-full max-w-full"
      dir="rtl"
    >
      {/* Header */}
      <Header
        currentUser={currentUser}
        onUserChange={handleUserChange}
        onLogout={handleLogout}
        onResetData={handleResetData}
        onNavigateToRequests={() => setActiveTab('leaves')}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        pendingRequestsCount={pendingLeaves + pendingAdvances}
      />

      {/* Return to Admin Banner if inspecting employee/manager account */}
      {currentUser.role !== 'ADMIN' && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-700 text-white px-4 py-2.5 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shrink-0" />
            <span>
              شما هم‌اکنون در پرتال پرسنلی <strong>{currentUser.name}</strong> ({currentUser.role === 'MANAGER' ? 'مدیر منابع انسانی' : 'پرسنل'}) هستید.
            </span>
          </div>
          <button
            onClick={() => {
              const admin = StorageService.getUsers().find((u) => u.role === 'ADMIN');
              if (admin) handleUserChange(admin);
            }}
            className="bg-white text-slate-900 hover:bg-amber-50 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0 border border-white/60 active:scale-98"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
            <span>بازگشت فوری به حساب مدیریت ارشد (مجید نورائی)</span>
          </button>
        </div>
      )}

      {/* Main Layout Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 gap-6 pb-24 md:pb-8">
        {/* Desktop Sidebar Navigation */}
        <Sidebar
          currentRole={currentUser.role}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          pendingLeavesCount={pendingLeaves}
          pendingAdvancesCount={pendingAdvances}
          onLogout={handleLogout}
        />

        {/* Mobile Navigation Drawer & Bottom Bar */}
        <MobileNav
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          currentRole={currentUser.role}
          currentUser={currentUser}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          pendingLeavesCount={pendingLeaves}
          pendingAdvancesCount={pendingAdvances}
          onLogout={handleLogout}
        />

        {/* Dynamic Content View Area */}
        <main className="flex-1 min-w-0 transition-all duration-200">
          {activeTab === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              employees={employees}
              attendance={attendance}
              leaves={leaves}
              advances={advances}
              salaries={salaries}
              onNavigate={setActiveTab}
              onQuickClockIn={() => {
                if (currentUser.employeeId) {
                  StorageService.clockIn(currentUser.employeeId, 'MANUAL');
                  loadData();
                }
              }}
            />
          )}

          {activeTab === 'employees' && (
            <EmployeesView
              employees={employees}
              shifts={shifts}
              currentUser={currentUser}
              onRefresh={loadData}
              canEdit={currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER'}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceView
              attendance={attendance}
              employees={employees}
              shifts={shifts}
              currentUser={currentUser}
              onRefresh={loadData}
              canManage={currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER'}
            />
          )}

          {activeTab === 'schedules' && (
            <SchedulesView
              shifts={shifts}
              onRefresh={loadData}
              canEdit={currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER'}
            />
          )}

          {activeTab === 'qr-kiosk' && (
            <WorkshopPrintableQrView
              employees={employees}
              attendance={attendance}
              onRefresh={loadData}
              currentUserEmployee={
                employees.find((e) => e.id === currentUser?.employeeId) ||
                employees.find((e) => e.email === currentUser?.email) ||
                employees[0]
              }
            />
          )}

          {activeTab === 'messages' && (
            <MessagesView
              currentUser={currentUser}
              employees={employees}
              messages={messages}
              onRefresh={loadData}
              canSend={currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER'}
            />
          )}

          {activeTab === 'leaves' && (
            <LeavesView
              leaves={leaves}
              employees={employees}
              currentUser={currentUser}
              onRefresh={loadData}
              canApprove={currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER'}
            />
          )}

          {activeTab === 'advances' && (
            <AdvancesView
              advances={advances}
              employees={employees}
              currentUser={currentUser}
              onRefresh={loadData}
              canApprove={currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER'}
            />
          )}

          {activeTab === 'payroll' && (
            <PayrollView
              salaries={salaries}
              employees={employees}
              currentUser={currentUser}
              onRefresh={loadData}
              canManage={currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER'}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              employees={employees}
              attendance={attendance}
              salaries={salaries}
              leaves={leaves}
              advances={advances}
              settings={settings}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              auditLogs={auditLogs}
              currentUser={currentUser}
              onRefresh={loadData}
              canEdit={currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER'}
            />
          )}

          {activeTab === 'employee-portal' && (
            <EmployeePortalView
              currentUser={currentUser}
              employees={employees}
              attendance={attendance}
              leaves={leaves}
              advances={advances}
              salaries={salaries}
              onRefresh={loadData}
              onNavigate={setActiveTab}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="w-full py-4 text-xs text-slate-500 border-t border-slate-200/80 bg-white/70 backdrop-blur-xs mt-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-semibold text-slate-800">سامانه مدیریت و تردد پرسنل M.GAMMON</span>
            <span>•</span>
            <span className="text-slate-500">کارگاه تولید تخته‌نرد مشهد (توس ۱۴۲)</span>
          </div>

          <div className="flex items-center gap-1 text-slate-500 text-xs">
            <span>طراحی و توسعه توسط</span>
            <a
              href="https://ahourai.ir"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1"
            >
              <span>اهورایی</span>
              <span className="text-rose-500">❤️</span>
            </a>
          </div>
        </div>
      </footer>

      {/* In-app Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 p-5 space-y-4 shadow-2xl animate-in fade-in duration-150">
            <h3 className="text-sm font-bold text-slate-800">بازنشانی اطلاعات پیش‌فرض</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              آیا از بازنشانی داده‌های نمونه سامانه M.GAMMON به مقادیر اولیه اطمینان دارید؟ کلیه تغییرات ثبت شده به حالت اولیه بازخواهند گشت.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs"
              >
                تایید بازنشانی
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
