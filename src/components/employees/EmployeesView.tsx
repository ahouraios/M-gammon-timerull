import React, { useState, useRef } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Phone,
  CreditCard,
  Clock,
  X,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  Camera,
  Upload,
  Lock,
  Unlock,
  ShieldCheck,
  Sliders,
  CheckSquare,
  Square,
  Shield,
  Plus,
  Copy,
  Check,
  Key,
  Sparkles
} from 'lucide-react';
import { Employee, Shift, User as AppUser, PERMISSION_LEVELS, MANAGEMENT_ROLES, ManagementRole } from '../../types';
import {
  formatCurrencyTomans,
  getTodayShamsi,
  isValidIranianNationalCode,
  isValidIranianPhone,
  isValidSheba,
  isValidCardNumber,
  toEnglishDigits,
  formatCardNumber,
  numberToPersianWords,
  detectIranianBank
} from '../../utils/dateUtils';
import { StorageService } from '../../services/storage';
import { ShamsiDatePicker } from '../common/ShamsiDatePicker';
import { CopyButton } from '../common/CopyButton';

interface EmployeesViewProps {
  employees: Employee[];
  shifts: Shift[];
  onRefresh: () => void;
  canEdit: boolean;
  currentUser?: AppUser;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  shifts,
  onRefresh,
  canEdit,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [confidentialTab, setConfidentialTab] = useState<'ALL' | 'CONFIDENTIAL'>('ALL');

  // Permissions: Only Senior Admin (ADMIN) can delete employees and see confidential staff
  const isSuperAdmin = currentUser?.role === 'ADMIN';
  const isManagerOnly = currentUser?.role === 'MANAGER';

  // Modal states
  const modalFormRef = useRef<HTMLFormElement>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingProfile, setViewingProfile] = useState<Employee | null>(null);

  // Form custom inputs
  const [salaryInput, setSalaryInput] = useState('28,000,000');
  const [cardInput, setCardInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Permissions Management Modal (Managerial roles)
  const [managingPermissionsEmp, setManagingPermissionsEmp] = useState<Employee | null>(null);
  const [tempManagementRoles, setTempManagementRoles] = useState<string[]>([]);

  // Delete Confirmation State
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Helper for workshop labels
  const getWorkshopLabel = (wsId?: string) => {
    switch (wsId) {
      case 'ws_2':
        return 'کارگاه شماره دو';
      case 'ws_both':
        return 'هر دو کارگاه';
      case 'ws_free':
        return 'آزاد';
      case 'ws_1':
      default:
        return 'کارگاه شماره یک';
    }
  };

  // Job Categories for Backgammon Workshop (تولید تخته نرد)
  const defaultCategories = ['مدیر داخلی', 'مسئول فنی', 'نیروی کارگاهی'];
  const [categories, setCategories] = useState<string[]>(() => {
    const s = StorageService.getSettings();
    return s.jobCategories && s.jobCategories.length > 0 ? s.jobCategories : defaultCategories;
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, department: trimmed, position: prev.position || trimmed }));
      setIsAddingCategory(false);
      setNewCategoryName('');
      return;
    }
    const updated = [...categories, trimmed];
    setCategories(updated);
    const s = StorageService.getSettings();
    StorageService.saveSettings({ ...s, jobCategories: updated });
    setFormData((prev) => ({ ...prev, department: trimmed, position: prev.position || trimmed }));
    setIsAddingCategory(false);
    setNewCategoryName('');
  };

  // Generate collision-resistant unique personal code (Fixes EMP-002)
  const getNextPersonalCode = () => {
    const maxNum = employees.reduce((max, e) => {
      const match = e.personalCode?.match(/\d+/);
      return match ? Math.max(max, parseInt(match[0], 10)) : max;
    }, 1000);
    return `EMP-${maxNum + 1}`;
  };

  // Form State
  const defaultFormData: Omit<Employee, 'id' | 'companyId'> = {
    personalCode: getNextPersonalCode(),
    firstName: '',
    lastName: '',
    nationalCode: '',
    phone: '',
    email: '',
    department: 'نیروی کارگاهی',
    position: 'نیروی کارگاهی',
    workshopId: 'ws_1',
    username: '',
    password: '',
    avatarUrl: '',
    hireDate: getTodayShamsi(),
    status: 'ACTIVE',
    contractType: 'PERMANENT',
    shiftId: shifts[0]?.id || '',
    baseSalary: 28000000,
    hourlyRate: 159000,
    overtimeRate: 1.4,
    remainingLeaveDays: 20,
    cardNumber: '',
    bankAccount: '',
    shebaNumber: '',
    isConfidential: false,
    permissions: [1, 2, 3, 4, 5, 6],
    managementRoles: [],
  };

  const [formData, setFormData] = useState<Omit<Employee, 'id' | 'companyId'>>(defaultFormData);

  const departments = ['ALL', ...Array.from(new Set([...categories, ...employees.map((e) => e.department)]))];

  // Count confidential employees for Super Admin
  const confidentialCount = employees.filter(e => e.isConfidential).length;

  const filteredEmployees = employees.filter((emp) => {
    // If Manager (HR), confidential employees are strictly hidden!
    if (isManagerOnly && emp.isConfidential) return false;
    // If Super Admin has selected confidential-only filter tab
    if (isSuperAdmin && confidentialTab === 'CONFIDENTIAL' && !emp.isConfidential) return false;

    const matchesSearch =
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.personalCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDepartment === 'ALL' || emp.department === selectedDepartment;
    const matchesStatus = selectedStatus === 'ALL' || emp.status === selectedStatus;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    setFormError(null);
    setFormSuccess(null);
    setShowPassword(false);
    const initialBaseSalary = 28000000;
    setSalaryInput(initialBaseSalary.toLocaleString('en-US'));
    setCardInput('');
    setFormData({
      ...defaultFormData,
      personalCode: getNextPersonalCode(),
      department: categories[2] || 'نیروی کارگاهی',
      position: 'نیروی کارگاهی',
      shiftId: shifts[0]?.id || '',
      isConfidential: false,
      cardNumber: '',
      username: '',
      password: `M@${Math.floor(1000 + Math.random() * 9000)}`,
      baseSalary: initialBaseSalary,
      workshopId: 'ws_1',
      managementRoles: [],
      permissions: [1, 2, 3, 4, 5, 6],
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormError(null);
    setFormSuccess(null);
    setShowPassword(false);
    setSalaryInput(emp.baseSalary ? emp.baseSalary.toLocaleString('en-US') : '');
    setCardInput(emp.cardNumber ? formatCardNumber(emp.cardNumber) : '');
    setFormData({
      personalCode: emp.personalCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      nationalCode: emp.nationalCode,
      phone: emp.phone,
      email: emp.email,
      department: emp.department,
      position: emp.position,
      workshopId: emp.workshopId || 'ws_1',
      username: emp.username || '',
      password: emp.password || '',
      avatarUrl: emp.avatarUrl || '',
      hireDate: emp.hireDate,
      status: emp.status,
      contractType: emp.contractType || 'PERMANENT',
      shiftId: emp.shiftId,
      baseSalary: emp.baseSalary,
      hourlyRate: emp.hourlyRate,
      overtimeRate: emp.overtimeRate,
      remainingLeaveDays: emp.remainingLeaveDays,
      cardNumber: emp.cardNumber || '',
      bankAccount: emp.bankAccount || '',
      shebaNumber: emp.shebaNumber || '',
      isConfidential: Boolean(emp.isConfidential),
      permissions: emp.permissions || [1, 2, 3, 4, 5, 6],
      managementRoles: emp.managementRoles || [],
    });
    setIsFormModalOpen(true);
  };

  // Toggle Confidential Status (Admin Only)
  const handleToggleConfidential = (empId: string) => {
    StorageService.toggleConfidential(empId);
    onRefresh();
  };

  // Permissions Modal Controls (Strictly Super Admin / Majid Nouraei only)
  const handleOpenPermissionsModal = (emp: Employee) => {
    if (!isSuperAdmin) return;
    setManagingPermissionsEmp(emp);
    setTempManagementRoles(emp.managementRoles || []);
  };

  const handleToggleManagementRole = (roleId: string) => {
    if (tempManagementRoles.includes(roleId)) {
      setTempManagementRoles(tempManagementRoles.filter(r => r !== roleId));
    } else {
      setTempManagementRoles([...tempManagementRoles, roleId]);
    }
  };

  const handleSavePermissions = () => {
    if (!managingPermissionsEmp) return;
    StorageService.updateEmployee({
      ...managingPermissionsEmp,
      managementRoles: tempManagementRoles,
    });
    setManagingPermissionsEmp(null);
    onRefresh();
  };

  const handleOpenDeleteModal = (emp: Employee) => {
    setEmployeeToDelete(emp);
  };

  const handleConfirmDelete = () => {
    if (!employeeToDelete) return;
    StorageService.deleteEmployee(employeeToDelete.id);
    setEmployeeToDelete(null);
    onRefresh();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const triggerError = (msg: string) => {
      setFormError(msg);
      if (modalFormRef.current) {
        modalFormRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    // 1. Basic required fields
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
      triggerError('لطفاً نام، نام خانوادگی و شماره موبایل را وارد نمایید.');
      return;
    }

    // 2. Validate Iranian National Code (Persian digits supported)
    const cleanNational = toEnglishDigits(formData.nationalCode).trim().replace(/\D/g, '');
    if (!cleanNational || cleanNational.length !== 10) {
      triggerError(`کد ملی باید دقیقاً ۱۰ رقم باشد (در حال حاضر ${cleanNational.length} رقم وارد شده است).`);
      return;
    }

    // 3. National code uniqueness
    const duplicateNational = employees.some(
      (emp) => toEnglishDigits(emp.nationalCode).trim() === cleanNational && emp.id !== editingEmployee?.id
    );
    if (duplicateNational) {
      triggerError('این کد ملی قبلاً برای پرسنل دیگری در سامانه ثبت شده است.');
      return;
    }

    // 4. Validate Iranian Mobile Phone (Persian digits supported)
    const cleanPhone = toEnglishDigits(formData.phone).trim().replace(/[\s-]/g, '');
    if (!isValidIranianPhone(cleanPhone)) {
      triggerError('شماره موبایل وارد شده نامعتبر است (فرمت مجاز: 09151234567).');
      return;
    }

    // 5. Validate Card number (MANDATORY & 16 digits)
    const cleanCard = toEnglishDigits(formData.cardNumber || cardInput || '').trim().replace(/\D/g, '');
    if (!cleanCard) {
      triggerError('ثبت شماره کارت بانکی (۱۶ رقمی) الزامی است.');
      return;
    }
    if (cleanCard.length !== 16) {
      triggerError(`شماره کارت بانکی باید دقیقاً ۱۶ رقم باشد (در حال حاضر ${cleanCard.length} رقم وارد شده است).`);
      return;
    }

    // 6. Validate Username (MANDATORY & unique)
    const cleanUsername = toEnglishDigits(formData.username || '').trim().toLowerCase();
    if (!cleanUsername) {
      triggerError('ساخت نام کاربری (Username) برای ورود پرسنل به پرتال الزامی است.');
      return;
    }
    if (!/^[a-z0-9._-]{3,30}$/.test(cleanUsername)) {
      triggerError('نام کاربری باید حداقل ۳ کاراکتر و شامل حروف انگلیسی، اعداد یا نقطه باشد.');
      return;
    }
    const rawUsers = StorageService.getAllUsersRaw();
    const duplicateUser = rawUsers.some(
      (u) => u.username.toLowerCase() === cleanUsername && u.employeeId !== editingEmployee?.id
    );
    if (duplicateUser) {
      triggerError('این نام کاربری قبلاً برای کاربر دیگری در سامانه ثبت شده است.');
      return;
    }

    // 7. Validate Password (MANDATORY)
    const cleanPassword = toEnglishDigits(formData.password || '').trim();
    if (!cleanPassword) {
      triggerError('تعیین رمز عبور حساب کاربری پرسنل الزامی است.');
      return;
    }
    if (cleanPassword.length < 4) {
      triggerError('رمز عبور باید حداقل ۴ کاراکتر باشد.');
      return;
    }

    // 8. Validate Sheba number if entered
    if (formData.shebaNumber) {
      const cleanSheba = toEnglishDigits(formData.shebaNumber).trim().toUpperCase().replace(/\s/g, '');
      if (!isValidSheba(cleanSheba)) {
        triggerError('شماره شبا نامعتبر است (باید ۲۴ رقم با پیشوند IR باشد).');
        return;
      }
    }

    // 9. Financial non-negative rates
    if (Number(formData.baseSalary) < 0 || Number(formData.hourlyRate) < 0) {
      triggerError('حقوق پایه و نرخ ساعتی نمی‌توانند منفی باشند.');
      return;
    }

    const settings = StorageService.getSettings();
    const cleanPersonalCode = toEnglishDigits(formData.personalCode).trim() || getNextPersonalCode();
    const cleanSheba = formData.shebaNumber ? toEnglishDigits(formData.shebaNumber).trim().toUpperCase().replace(/\s/g, '') : '';
    const cleanAccount = formData.bankAccount ? toEnglishDigits(formData.bankAccount).trim().replace(/\D/g, '') : '';
    const cleanBaseSalary = Number(formData.baseSalary) || 0;
    const cleanHourlyRate = Number(formData.hourlyRate) || 0;

    if (editingEmployee) {
      const updated: Employee = {
        ...formData,
        id: editingEmployee.id,
        companyId: editingEmployee.companyId,
        personalCode: cleanPersonalCode,
        nationalCode: cleanNational,
        phone: cleanPhone,
        cardNumber: cleanCard,
        username: cleanUsername,
        password: cleanPassword,
        shebaNumber: cleanSheba,
        bankAccount: cleanAccount,
        baseSalary: cleanBaseSalary,
        hourlyRate: cleanHourlyRate,
        workshopId: formData.workshopId || 'ws_1',
        managementRoles: formData.managementRoles || [],
        permissions: [1, 2, 3, 4, 5, 6],
      };
      StorageService.updateEmployee(updated);
      setFormSuccess(`اطلاعات پرونده ${updated.firstName} ${updated.lastName} با موفقیت در سیستم بروزرسانی شد.`);
    } else {
      const newEmp: Employee = {
        ...formData,
        id: `emp_${Date.now()}`,
        companyId: settings.id,
        personalCode: cleanPersonalCode,
        nationalCode: cleanNational,
        phone: cleanPhone,
        cardNumber: cleanCard,
        username: cleanUsername,
        password: cleanPassword,
        shebaNumber: cleanSheba,
        bankAccount: cleanAccount,
        baseSalary: cleanBaseSalary,
        hourlyRate: cleanHourlyRate,
        workshopId: formData.workshopId || 'ws_1',
        managementRoles: formData.managementRoles || [],
        permissions: [1, 2, 3, 4, 5, 6],
      };
      StorageService.addEmployee(newEmp);
      setFormSuccess(`پرسنل جدید (${newEmp.firstName} ${newEmp.lastName}) با نام کاربری "${newEmp.username}" با موفقیت ثبت قطعی شد.`);
    }

    setIsFormModalOpen(false);
    setTimeout(() => setFormSuccess(null), 6000);
    onRefresh();
  };

  const getStatusBadge = (status: Employee['status']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3" /> فعال
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="w-3 h-3" /> غیرفعال
          </span>
        );
      case 'ON_LEAVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> در مرخصی
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>مدیریت پرسنل و پرونده‌های استخدامی</span>
            </h2>
            {isSuperAdmin && confidentialCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-700" />
                <span>{confidentialCount} نیروی اختصاصی مدیر</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            مشاهده، ثبت و مدیریت پرونده‌های پرسنل، قراردادها و تنظیمات شیفت
          </p>
        </div>
        {canEdit && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-indigo-400" />
            <span>تعریف پرسنل جدید</span>
          </button>
        )}
      </div>

      {formSuccess && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-xs rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold text-xs">{formSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setFormSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-1 rounded-lg hover:bg-emerald-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Senior Admin Confidential Filter Bar */}
      {isSuperAdmin && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-2.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-100 text-amber-800">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-bold text-amber-950">نمایش و تفکیک پرسنل:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setConfidentialTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                confidentialTab === 'ALL'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-amber-100'
              }`}
            >
              همه پرسنل ({employees.length})
            </button>
            <button
              type="button"
              onClick={() => setConfidentialTab('CONFIDENTIAL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                confidentialTab === 'CONFIDENTIAL'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-white text-amber-900 hover:bg-amber-100 border border-amber-300'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>نیروهای اختصاصی مدیر ارشد ({confidentialCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="جستجوی نام، کد پرسنلی یا سمت..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 py-1.5 px-2 bg-white text-slate-700 focus:outline-none"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === 'ALL' ? 'تمامی واحدها' : d}
                </option>
              ))}
            </select>
          </div>
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 py-1.5 px-2 bg-white text-slate-700 focus:outline-none"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="ACTIVE">فقط فعال</option>
            <option value="INACTIVE">غیرفعال</option>
            <option value="ON_LEAVE">در مرخصی</option>
          </select>
        </div>
      </div>

      {/* Employees Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Mobile View: Cards */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {filteredEmployees.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              هیچ پرسنلی با مشخصات جستجو شده یافت نشد.
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const shift = shifts.find((s) => s.id === emp.shiftId) || shifts[0];
              const permCount = (emp.permissions || [1, 2, 3, 4, 5, 6]).length;
              return (
                <div key={emp.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {emp.avatarUrl ? (
                        <img
                          src={emp.avatarUrl}
                          alt={`${emp.firstName} ${emp.lastName}`}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200/80 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                          {emp.firstName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                          <span>{emp.firstName} {emp.lastName}</span>
                          {emp.isConfidential && isSuperAdmin && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" /> اختصاصی مدیر
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                          {emp.position} <span className="text-slate-300">|</span> {emp.department}
                        </div>
                      </div>
                    </div>
                    <div>{getStatusBadge(emp.status)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[11px]">کارگاه محل خدمت:</span>
                      <span className="font-semibold text-slate-800 text-[11px]">
                        {emp.workshopId === 'ws_2'
                          ? 'کارگاه شماره دو'
                          : emp.workshopId === 'ws_both'
                          ? 'هر دو کارگاه'
                          : emp.workshopId === 'ws_free'
                          ? 'آزاد'
                          : 'کارگاه شماره یک'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">حقوق پایه:</span>
                      <span className="font-semibold text-slate-800">{formatCurrencyTomans(emp.baseSalary)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">شیفت:</span>
                      <span className="text-slate-700">{shift?.name || 'استاندارد'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">اختیارات سازمانی:</span>
                      {(emp.managementRoles || []).length > 0 ? (
                        <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-indigo-600" />
                          <span>{(emp.managementRoles || []).length} مسئولیت سازمانی</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-600">
                          نیروی اجرایی کارگاه
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Contact & Bank Details Strip with Copy Buttons */}
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-slate-400">همراه:</span>
                      <span className="font-mono text-slate-800 font-semibold">{emp.phone}</span>
                      <CopyButton text={emp.phone} />
                    </div>
                    {emp.cardNumber ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-slate-400">کارت:</span>
                        <span className="font-mono text-slate-800 font-semibold">...{emp.cardNumber.slice(-4)}</span>
                        <CopyButton text={emp.cardNumber} />
                      </div>
                    ) : emp.shebaNumber ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-slate-400">شبا:</span>
                        <span className="font-mono text-slate-800 font-semibold">...{emp.shebaNumber.slice(-4)}</span>
                        <CopyButton text={emp.shebaNumber} />
                      </div>
                    ) : null}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setViewingProfile(emp)}
                      className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>مشاهده پرونده</span>
                    </button>
                    {canEdit && (
                      <div className="flex items-center gap-1 mr-2">
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => handleToggleConfidential(emp.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              emp.isConfidential
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                            title={emp.isConfidential ? 'تبدیل به پرسنل عادی' : 'تبدیل به نیروی اختصاصی مدیر ارشد'}
                          >
                            {emp.isConfidential ? <Lock className="w-4 h-4 text-amber-700" /> : <Unlock className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenPermissionsModal(emp)}
                          className="p-1.5 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                          title="تنظیم سطوح دسترسی (۱ تا ۱۰)"
                        >
                          <Sliders className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(emp)}
                          className="p-1.5 rounded-lg text-slate-600 bg-slate-100 hover:bg-amber-100 hover:text-amber-700 transition-colors cursor-pointer"
                          title="ویرایش"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleOpenDeleteModal(emp)}
                            className="p-1.5 rounded-lg text-slate-400 bg-slate-100 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer"
                            title="حذف پرسنل"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200/80 font-semibold">
              <tr>
                <th className="py-3.5 px-4">پرسنل</th>
                <th className="py-3.5 px-4">کد پرسنلی</th>
                <th className="py-3.5 px-4">سمت و واحد</th>
                <th className="py-3.5 px-4">کارگاه محل خدمت</th>
                <th className="py-3.5 px-4">اختیارات سازمانی</th>
                <th className="py-3.5 px-4">حقوق پایه</th>
                <th className="py-3.5 px-4">شیفت کاری</th>
                <th className="py-3.5 px-4">وضعیت</th>
                <th className="py-3.5 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    هیچ پرسنلی با مشخصات جستجو شده یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const shift = shifts.find((s) => s.id === emp.shiftId) || shifts[0];
                  const wsBadge = (() => {
                    switch (emp.workshopId) {
                      case 'ws_2':
                        return { text: 'کارگاه شماره دو', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
                      case 'ws_both':
                        return { text: 'هر دو کارگاه', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
                      case 'ws_free':
                        return { text: 'آزاد', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                      default:
                        return { text: 'کارگاه شماره یک', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
                    }
                  })();

                  const mRoles = emp.managementRoles || [];
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {emp.avatarUrl ? (
                            <img
                              src={emp.avatarUrl}
                              alt={`${emp.firstName} ${emp.lastName}`}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200/80 shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {emp.firstName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{emp.firstName} {emp.lastName}</span>
                              {emp.isConfidential && isSuperAdmin && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5">
                                  <Lock className="w-2.5 h-2.5" /> اختصاصی مدیر
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span className="font-mono">{emp.phone}</span>
                              <CopyButton text={emp.phone} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-600">
                        {emp.personalCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{emp.position}</div>
                        <div className="text-[11px] text-slate-400">{emp.department}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${wsBadge.cls}`}>
                          {wsBadge.text}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {mRoles.length > 0 ? (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{mRoles.length === 1 ? MANAGEMENT_ROLES.find(r => r.id === mRoles[0])?.title.split('(')[0] : `${mRoles.length} مسئولیت سازمانی`}</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                            نیروی اجرایی کارگاه
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {formatCurrencyTomans(emp.baseSalary)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                          {shift?.name || 'شیفت استاندارد'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(emp.status)}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleToggleConfidential(emp.id)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                emp.isConfidential
                                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                  : 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                              }`}
                              title={emp.isConfidential ? 'نیروی اختصاصی مدیر ارشد (کلیک برای تبدیل به عادی)' : 'تبدیل به نیروی اختصاصی مدیر ارشد'}
                            >
                              {emp.isConfidential ? <Lock className="w-4 h-4 text-amber-700" /> : <Unlock className="w-4 h-4" />}
                            </button>
                          )}
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenPermissionsModal(emp)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="تنظیم دسترسی‌های پرسنلی (۱ تا ۱۰) - منحصراً مدیر اصلی"
                            >
                              <Sliders className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setViewingProfile(emp)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="مشاهده پرونده کامل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(emp)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                                title="ویرایش"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {isSuperAdmin && (
                                <button
                                  onClick={() => handleOpenDeleteModal(emp)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="حذف پرسنل"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DEDICATED EMPLOYEE PROFILE MODAL */}
      {viewingProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-6 relative">
              <button
                onClick={() => setViewingProfile(null)}
                className="absolute left-4 top-4 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-md overflow-hidden border-2 border-white/20 shrink-0">
                  {viewingProfile.avatarUrl ? (
                    <img
                      src={viewingProfile.avatarUrl}
                      alt={viewingProfile.firstName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    viewingProfile.firstName.charAt(0)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold">
                      {viewingProfile.firstName} {viewingProfile.lastName}
                    </h3>
                    {getStatusBadge(viewingProfile.status)}
                  </div>
                  <p className="text-slate-300 text-sm mt-0.5">
                    {viewingProfile.position} | {viewingProfile.department}
                  </p>
                  <p className="text-xs text-indigo-300 font-mono mt-1">
                    کد پرسنلی: {viewingProfile.personalCode}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-1">کد ملی:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {viewingProfile.nationalCode || '---'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400">شماره همراه:</span>
                    <CopyButton text={viewingProfile.phone} label="کپی" />
                  </div>
                  <span className="font-semibold text-slate-800 font-mono">
                    {viewingProfile.phone}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-1">پست الکترونیک:</span>
                  <span className="font-semibold text-slate-800 font-mono truncate block">
                    {viewingProfile.email || '---'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-1">تاریخ استخدام:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {viewingProfile.hireDate}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-1">مانده مرخصی:</span>
                  <span className="font-semibold text-emerald-600">
                    {viewingProfile.remainingLeaveDays} روز
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-1">شیفت کاری:</span>
                  <span className="font-semibold text-slate-800">
                    {shifts.find((s) => s.id === viewingProfile.shiftId)?.name || 'پیش‌فرض'}
                  </span>
                </div>
              </div>

              {/* Financial & Contract Details */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>اطلاعات مالی و بانکی</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">حقوق پایه ماهیانه:</span>
                    <span className="font-bold text-slate-800">
                      {formatCurrencyTomans(viewingProfile.baseSalary)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">نرخ پایه هر ساعت:</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrencyTomans(viewingProfile.hourlyRate)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">ضریب اضافه کاری:</span>
                    <span className="font-semibold text-indigo-600 font-mono">
                      {viewingProfile.overtimeRate} برابر
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">شماره کارت بانکی:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">
                        {viewingProfile.cardNumber || 'ثبت نشده'}
                      </span>
                      {viewingProfile.cardNumber && <CopyButton text={viewingProfile.cardNumber} label="کپی کارت" />}
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">شماره حساب بانکی:</span>
                    <span className="font-mono text-slate-700">
                      {viewingProfile.bankAccount || 'ثبت نشده'}
                    </span>
                  </div>
                  <div className="col-span-1 sm:col-span-2 flex items-center justify-between py-1.5">
                    <span className="text-slate-500">شماره شبا (IBAN):</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-700 text-xs">
                        {viewingProfile.shebaNumber || 'ثبت نشده'}
                      </span>
                      {viewingProfile.shebaNumber && <CopyButton text={viewingProfile.shebaNumber} label="کپی شبا" />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setViewingProfile(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>{editingEmployee ? 'ویرایش مشخصات پرسنل' : 'ثبت پرسنل جدید'}</span>
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form ref={modalFormRef} onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {isManagerOnly && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>دسترسی مدیریت منابع انسانی: امکان ویرایش و ثبت اطلاعات پرسنل.</span>
                </div>
              )}

              {/* Employee Photo Upload Card */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center shrink-0 border border-white shadow-xs">
                  {formData.avatarUrl ? (
                    <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <label className="block text-xs font-medium text-slate-700">تصویر پرسنل</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-[11px] font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 transition-colors shrink-0">
                      <Upload className="w-3 h-3" />
                      <span>انتخاب فایل عکس</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData({ ...formData, avatarUrl: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    {formData.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, avatarUrl: '' })}
                        className="text-[11px] text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-md border border-rose-200 cursor-pointer"
                      >
                        حذف عکس
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {formError && (
                <div className="p-3.5 bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs rounded-xl flex items-start gap-2.5 leading-relaxed shadow-xs animate-in fade-in">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                  <div className="flex-1">
                    <span className="font-bold block text-rose-900 mb-0.5">خطای ثبت اطلاعات:</span>
                    <span>{formError}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    نام <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="مثال: علی"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    نام خانوادگی <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="مثال: کریمی"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    کد پرسنلی <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.personalCode}
                    onChange={(e) => setFormData({ ...formData, personalCode: toEnglishDigits(e.target.value).trim() })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">پشتیبانی از اعداد فارسی</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    شماره موبایل <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => {
                      const v = toEnglishDigits(e.target.value).replace(/[^\d+]/g, '');
                      setFormData({ ...formData, phone: v });
                    }}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left"
                    dir="ltr"
                    placeholder="0912XXXXXXX"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">پشتیبانی از کیبورد فارسی</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      دسته‌بندی شغلی (کارگاه تخته‌نرد)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(!isAddingCategory)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isAddingCategory ? 'انصراف' : 'افزودن دسته جدید'}</span>
                    </button>
                  </div>

                  {isAddingCategory ? (
                    <div className="flex items-center gap-1.5 p-1 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="عنوان دسته جدید..."
                        className="flex-1 text-xs p-1.5 rounded border border-indigo-300 bg-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="px-2 py-1.5 rounded bg-indigo-600 text-white text-[11px] font-bold shrink-0 hover:bg-indigo-700 cursor-pointer"
                      >
                        ثبت
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formData.department}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          department: val,
                          position: formData.position || val
                        });
                      }}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-medium"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    سمت یا عنوان شغلی تفصیلی
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="مثال: نیروی کارگاهی - سمباده و نجاری"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    شیفت کاری
                  </label>
                  <select
                    value={formData.shiftId}
                    onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime} الی {s.endTime})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">وضعیت اشتغال</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="ACTIVE">شاغل / فعال</option>
                    <option value="INACTIVE">غیرفعال / قطع همکاری</option>
                    <option value="ON_LEAVE">در مرخصی استعلاجی / بلندمدت</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    کارگاه محل خدمت <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.workshopId}
                    onChange={(e) => setFormData({ ...formData, workshopId: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-medium"
                  >
                    <option value="ws_1">کارگاه شماره یک</option>
                    <option value="ws_2">کارگاه شماره دو</option>
                    <option value="ws_both">هر دو کارگاه</option>
                    <option value="ws_free">آزاد</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    نوع قرارداد <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.contractType || 'PERMANENT'}
                    onChange={(e) => setFormData({ ...formData, contractType: e.target.value as any })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-medium"
                  >
                    <option value="PERMANENT">رسمی قطعی</option>
                    <option value="PROBATIONARY">دوره آزمایشی (۳ ماهه)</option>
                    <option value="TEMPORARY">قراردادی پیمانی</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    کد ملی (۱۰ رقم) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={formData.nationalCode}
                    onChange={(e) => {
                      const val = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, nationalCode: val });
                    }}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left tracking-wider"
                    placeholder="00XXXXXXXX"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">پشتیبانی از اعداد فارسی گوشی</span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      شماره کارت بانکی (۱۶ رقمی) <span className="text-rose-500">*</span>
                    </label>
                    {detectIranianBank(formData.cardNumber || '') && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 truncate max-w-[120px]">
                        {detectIranianBank(formData.cardNumber || '')}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={cardInput}
                    onChange={(e) => {
                      const raw = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 16);
                      const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1-');
                      setCardInput(formatted);
                      setFormData((prev) => ({ ...prev, cardNumber: raw }));
                    }}
                    placeholder="۶۰۳۷-۹۹۷۵-۱۲۳۴-۵۶۷۸"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left tracking-wider"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">جداسازی خودکار ۴ رقم</span>
                </div>
              </div>

              {/* Financial Accounts Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    شماره شبا (IBAN)
                  </label>
                  <input
                    type="text"
                    value={formData.shebaNumber || ''}
                    onChange={(e) => {
                      const val = toEnglishDigits(e.target.value).toUpperCase().replace(/\s/g, '');
                      setFormData({ ...formData, shebaNumber: val });
                    }}
                    placeholder="IR..."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    شماره حساب بانکی (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccount || ''}
                    onChange={(e) => {
                      const val = toEnglishDigits(e.target.value).replace(/\D/g, '');
                      setFormData({ ...formData, bankAccount: val });
                    }}
                    placeholder="شماره حساب..."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Portal Login Credentials Section */}
              <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200/90 space-y-3">
                <div className="text-xs font-bold text-indigo-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-indigo-600" />
                    <span>حساب ورود پرسنل به پرتال (ضروری و دقیق)</span>
                  </span>
                  <span className="text-[10px] text-indigo-700 font-normal">احراز هویت پرتال اختصاصی</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-medium text-slate-700">
                        نام کاربری (Username) <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const cleanPhone = toEnglishDigits(formData.phone).slice(-4);
                          const cleanLast = formData.lastName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                          const suggested = cleanLast ? `${cleanLast}.${cleanPhone || '101'}` : `emp_${cleanPhone || Math.floor(1000 + Math.random() * 9000)}`;
                          setFormData((prev) => ({ ...prev, username: suggested }));
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                      >
                        پیشنهاد خودکار
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.username || ''}
                      onChange={(e) => {
                        const val = toEnglishDigits(e.target.value).toLowerCase().replace(/[^a-z0-9._-]/g, '');
                        setFormData({ ...formData, username: val });
                      }}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full text-xs p-2 rounded-lg border border-indigo-200 bg-white font-mono focus:outline-none focus:border-indigo-600 text-left"
                      dir="ltr"
                      placeholder="مثال: ali.karimi"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">حداقل ۳ کاراکتر انگلیسی یا عدد</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-medium text-slate-700">
                        رمز عبور حساب (Password) <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const gen = `M@${Math.floor(1000 + Math.random() * 9000)}`;
                          setFormData((prev) => ({ ...prev, password: gen }));
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                      >
                        تولید رمز امن
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password || ''}
                        onChange={(e) => {
                          const val = toEnglishDigits(e.target.value);
                          setFormData({ ...formData, password: val });
                        }}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className="w-full text-xs p-2 pl-8 rounded-lg border border-indigo-200 bg-white font-mono focus:outline-none focus:border-indigo-600 text-left"
                        dir="ltr"
                        placeholder="حداقل ۴ کاراکتر یا عدد..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">کارگر بعداً می‌تواند در پرتال خود رمز را تغییر دهد</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    پست الکترونیک (اختیاری)
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full text-xs p-2 rounded-lg border border-indigo-200 bg-white font-mono focus:outline-none focus:border-indigo-600 text-left"
                    dir="ltr"
                    placeholder="user@mgommon.ir"
                  />
                </div>
              </div>

              {/* Super Admin Exclusive: Confidential & Access Levels Configuration */}
              {isSuperAdmin && (
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="isConfidentialCheck"
                      checked={Boolean(formData.isConfidential)}
                      onChange={(e) => setFormData({ ...formData, isConfidential: e.target.checked })}
                      className="mt-1 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="isConfidentialCheck" className="text-xs text-amber-950 font-bold cursor-pointer">
                      <span>مدیریت اختصاصی توسط مدیر اصلی (نیروی محرمانه)</span>
                      <span className="block text-[11px] font-normal text-amber-800 mt-0.5 leading-relaxed">
                        در صورت فعال‌سازی، هیچ‌گونه اطلاعاتی اعم از مشخصات، ترددها، مرخصی‌ها و فیش حقوقی این نیرو برای مدیر منابع انسانی نمایش داده نخواهد شد.
                      </span>
                    </label>
                  </div>

                  {/* Management Responsibilities (Professional Managerial Roles) */}
                  <div className="pt-2 border-t border-amber-200/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-indigo-600" />
                          <span>اختیارات سازمانی و مدیریتی (اختیاری):</span>
                        </span>
                        <span className="text-[11px] text-amber-900 block mt-0.5">
                          تمامی پرسنل به صورت ذاتی به امور کارگری (تردد، مرخصی، مساعده، فیش حقوقی، فاکتور و تغییر رمز) دسترسی دارند.
                        </span>
                      </div>
                      <span className="text-[11px] text-indigo-700 font-semibold font-mono bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                        {(formData.managementRoles || []).length} مسئولیت فعال
                      </span>
                    </div>

                    {/* Managerial Role Cards with No Amateurish Numbers */}
                    <div className="space-y-1.5 pt-1 max-h-60 overflow-y-auto pr-1">
                      {MANAGEMENT_ROLES.map((role) => {
                        const isChecked = (formData.managementRoles || []).includes(role.id);
                        return (
                          <div
                            key={role.id}
                            onClick={() => {
                              const cur = formData.managementRoles || [];
                              const updated = cur.includes(role.id)
                                ? cur.filter((r) => r !== role.id)
                                : [...cur, role.id];
                              setFormData({ ...formData, managementRoles: updated });
                            }}
                            className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-2.5 ${
                              isChecked
                                ? 'bg-indigo-50/90 border-indigo-400 shadow-2xs'
                                : 'bg-white border-slate-200/90 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-800">
                                  {role.title}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                {role.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200">
                      🛡️ <strong>سطح اختیارات امنیتی:</strong> اختیارات این بخش مربوط به امور اجرایی و عملیاتی بوده و دسترسی به تنظیمات کلان کارگاه و ارسال پیامک صرفاً در انحصار مدیریت ارشد کارگاه است.
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    حقوق پایه ماهیانه (تومان) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={salaryInput}
                      onChange={(e) => {
                        const raw = toEnglishDigits(e.target.value).replace(/\D/g, '');
                        if (!raw) {
                          setSalaryInput('');
                          setFormData((prev) => ({ ...prev, baseSalary: 0 }));
                        } else {
                          const num = parseInt(raw, 10);
                          setSalaryInput(num.toLocaleString('en-US'));
                          setFormData((prev) => ({ ...prev, baseSalary: num }));
                        }
                      }}
                      placeholder="مثال: ۲۸,۰۰۰,۰۰۰"
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left tracking-wider"
                      dir="ltr"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">تومان</span>
                  </div>
                  {formData.baseSalary > 0 && (
                    <div className="mt-1.5 text-xs font-bold text-emerald-700 bg-emerald-50/90 px-3 py-1.5 rounded-lg border border-emerald-200/90 flex items-center gap-1.5 animate-in fade-in">
                      <span className="text-[11px] text-emerald-800/80 font-normal">مبلغ به حروف:</span>
                      <span>{numberToPersianWords(formData.baseSalary)}</span>
                    </div>
                  )}
                </div>
                <div>
                  <ShamsiDatePicker
                    label="تاریخ استخدام"
                    value={formData.hireDate}
                    onChange={(val) => setFormData({ ...formData, hireDate: val })}
                    required
                  />
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 leading-relaxed animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs transition-colors"
                >
                  {editingEmployee ? 'بروزرسانی پرسنل' : 'ثبت قطعی'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGEMENT ROLES & PERMISSIONS MODAL */}
      {managingPermissionsEmp && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto text-right">
            
            {/* Modal Header */}
            <div className="bg-indigo-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                    <span>مدیریت اختیارات سازمانی پرسنل (منحصراً مدیر ارشد)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                      {managingPermissionsEmp.personalCode}
                    </span>
                  </h3>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    {managingPermissionsEmp.firstName} {managingPermissionsEmp.lastName} ({managingPermissionsEmp.position})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManagingPermissionsEmp(null)}
                className="p-1.5 rounded-xl text-indigo-300 hover:text-white hover:bg-indigo-900/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {/* Universal Core Rights Notice */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 space-y-1.5 text-xs text-emerald-950">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>حقوق پایه و همگانی تمام کارگران کارگاه:</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  ثبت تردد با بارکد QR، ثبت درخواست مرخصی، درخواست مساعده، مشاهده فیش حقوقی، فاکتور خرید شخصی و تغییر رمز عبور جزو حقوق پایه بوده و نیازی به امتیازدهی ندارد.
                </p>
              </div>

              {/* Management Roles List with Toggles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>تعیین مسئولیت‌ها و دسترسی‌های اداری/نظارتی:</span>
                  <span className="text-indigo-600 font-mono text-[11px]">
                    {tempManagementRoles.length} مسئولیت فعال
                  </span>
                </div>

                <div className="space-y-2">
                  {MANAGEMENT_ROLES.map((role) => {
                    const isGranted = tempManagementRoles.includes(role.id);
                    return (
                      <div
                        key={role.id}
                        onClick={() => handleToggleManagementRole(role.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isGranted
                            ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="pt-0.5">
                          {isGranted ? (
                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-xs text-slate-900">{role.title}</span>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {role.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                  🛡️ <strong>تفکیک دسترسی مدیریت ارشد:</strong> اختیارات این بخش صرفاً ناظر بر امور روزمره کارگاه است. تنظیمات کلان سامانه، اتصال درگاه پیامک و حذف پرونده‌ها صرفاً در انحصار حساب مدیریت ارشد کارگاه است.
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                تغییرات بلافاصله پس از ذخیره اعمال می‌شود.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setManagingPermissionsEmp(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>ذخیره اختیارات سازمانی</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* EMPLOYEE DELETION CONFIRMATION MODAL */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-rose-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-right">
            <div className="bg-rose-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">حذف پرسنل از سیستم</h3>
                  <p className="text-[11px] text-rose-100">دسترسی انحصاری مدیر ارشد</p>
                </div>
              </div>
              <button
                onClick={() => setEmployeeToDelete(null)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-rose-50/70 rounded-2xl border border-rose-200/80 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-base overflow-hidden shrink-0 border border-rose-200">
                  {employeeToDelete.avatarUrl ? (
                    <img src={employeeToDelete.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    employeeToDelete.firstName.charAt(0)
                  )}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {employeeToDelete.firstName} {employeeToDelete.lastName}
                  </div>
                  <div className="text-xs text-rose-700 font-medium">
                    {employeeToDelete.position} | {employeeToDelete.department}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    کد پرسنلی: {employeeToDelete.personalCode}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                آیا از حذف کامل پرونده استخدامی <span className="font-bold text-slate-900">{employeeToDelete.firstName} {employeeToDelete.lastName}</span> و لغو دسترسی به پرتال اطمینان دارید؟
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEmployeeToDelete(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-md flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تایید و حذف دائمی</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
