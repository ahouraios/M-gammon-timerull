import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
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
  Check
} from 'lucide-react';
import { Employee, Shift, User as AppUser, PERMISSION_LEVELS } from '../../types';
import {
  formatCurrencyTomans,
  getTodayShamsi,
  isValidIranianNationalCode,
  isValidIranianPhone,
  isValidSheba,
  isValidCardNumber
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
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingProfile, setViewingProfile] = useState<Employee | null>(null);

  // Permissions Management Modal
  const [managingPermissionsEmp, setManagingPermissionsEmp] = useState<Employee | null>(null);
  const [tempPermissions, setTempPermissions] = useState<number[]>([1, 2, 3, 4, 5, 6]);

  // Delete Confirmation State
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

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
    permissions: [1], // سطح پیش‌فرض انتخابی: فقط سطح ۱ جهت امنیت و پیشگیری از اعطای ناخواسته دسترسی
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
    setFormData({
      ...defaultFormData,
      personalCode: getNextPersonalCode(),
      department: categories[2] || 'نیروی کارگاهی',
      position: 'نیروی کارگاهی',
      shiftId: shifts[0]?.id || '',
      isConfidential: false,
      permissions: [1], // فقط سطح ۱
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormError(null);
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
      password: emp.password || '123',
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
      permissions: emp.permissions && emp.permissions.length > 0 ? emp.permissions : [1],
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
    setTempPermissions(emp.permissions && emp.permissions.length > 0 ? [...emp.permissions] : [1, 2, 3, 4, 5, 6]);
  };

  const handleTogglePermission = (lvl: number) => {
    if (tempPermissions.includes(lvl)) {
      setTempPermissions(tempPermissions.filter(p => p !== lvl));
    } else {
      setTempPermissions([...tempPermissions, lvl].sort((a,b)=>a-b));
    }
  };

  const handleSetPresetPermissions = (levels: number[]) => {
    setTempPermissions(levels);
  };

  const handleSavePermissions = () => {
    if (!managingPermissionsEmp) return;
    StorageService.updateEmployeePermissions(managingPermissionsEmp.id, tempPermissions);
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

    // 1. Basic required fields
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
      setFormError('لطفاً نام، نام خانوادگی و شماره موبایل را وارد نمایید.');
      return;
    }

    // 2. Validate Iranian National Code (Fixes SET-002)
    if (!isValidIranianNationalCode(formData.nationalCode)) {
      setFormError('کد ملی وارد شده نامعتبر است (باید ۱۰ رقم معتبر باشد).');
      return;
    }

    // 3. National code uniqueness
    const duplicateNational = employees.some(
      (e) => e.nationalCode === formData.nationalCode.trim() && e.id !== editingEmployee?.id
    );
    if (duplicateNational) {
      setFormError('این کد ملی قبلاً برای پرسنل دیگری ثبت شده است.');
      return;
    }

    // 4. Validate Iranian Mobile Phone (Fixes SET-002)
    if (!isValidIranianPhone(formData.phone)) {
      setFormError('شماره موبایل وارد شده نامعتبر است (فرمت مجاز: 09151234567).');
      return;
    }

    // 5. Validate Card number if entered
    if (formData.cardNumber && !isValidCardNumber(formData.cardNumber)) {
      setFormError('شماره کارت بانکی باید ۱۶ رقم باشد.');
      return;
    }

    // 6. Validate Sheba number if entered
    if (formData.shebaNumber && !isValidSheba(formData.shebaNumber)) {
      setFormError('شماره شبا نامعتبر است (باید ۲۴ رقم با پیشوند IR باشد).');
      return;
    }

    // 7. Validate non-negative financial rates
    if (Number(formData.baseSalary) < 0 || Number(formData.hourlyRate) < 0) {
      setFormError('حقوق پایه و نرخ ساعتی نمی‌توانند منفی باشند.');
      return;
    }

    // 8. Username uniqueness check against raw users (Fixes EMP-001)
    if (formData.username?.trim()) {
      const cleanUsername = formData.username.trim().toLowerCase();
      const rawUsers = StorageService.getAllUsersRaw();
      const duplicateUser = rawUsers.some(
        (u) => u.username.toLowerCase() === cleanUsername && u.employeeId !== editingEmployee?.id
      );
      if (duplicateUser) {
        setFormError('نام کاربری وارد شده قبلاً برای حساب کاربری دیگری استفاده شده است.');
        return;
      }
    }

    const settings = StorageService.getSettings();

    // Secure initial password (Fixes AUTH-007: no hardcoded 123)
    const initialPass = formData.password?.trim()
      ? formData.password.trim()
      : `M@${formData.nationalCode.slice(-4)}`;

    if (editingEmployee) {
      const updated: Employee = {
        ...formData,
        id: editingEmployee.id,
        companyId: editingEmployee.companyId,
        password: initialPass,
        baseSalary: Number(formData.baseSalary) || 0,
        hourlyRate: Number(formData.hourlyRate) || 0,
      };
      StorageService.updateEmployee(updated);
    } else {
      const newEmp: Employee = {
        ...formData,
        id: `emp_${Date.now()}`,
        companyId: settings.id,
        password: initialPass,
        baseSalary: Number(formData.baseSalary) || 0,
        hourlyRate: Number(formData.hourlyRate) || 0,
      };
      StorageService.addEmployee(newEmp);
    }
    setIsFormModalOpen(false);
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
                      <span className="text-slate-400 block text-[11px]">کد پرسنلی:</span>
                      <span className="font-mono font-medium text-slate-700">{emp.personalCode}</span>
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
                      <span className="text-slate-400 block text-[11px]">سطح دسترسی:</span>
                      {(() => {
                        const isStd = !emp.permissions || (emp.permissions.length === 6 && [1, 2, 3, 4, 5, 6].every(l => emp.permissions!.includes(l)));
                        const isFull = emp.permissions?.length === 10;
                        if (isStd) {
                          return (
                            <span className="text-[11px] font-medium text-slate-600">
                              عادی (استاندارد)
                            </span>
                          );
                        }
                        return (
                          <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-indigo-600" />
                            <span>{isFull ? 'دسترسی ویژه (کامل)' : 'دسترسی سفارشی'}</span>
                          </span>
                        );
                      })()}
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
                <th className="py-3.5 px-4">سطوح دسترسی</th>
                <th className="py-3.5 px-4">حقوق پایه</th>
                <th className="py-3.5 px-4">شیفت کاری</th>
                <th className="py-3.5 px-4">وضعیت</th>
                <th className="py-3.5 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    هیچ پرسنلی با مشخصات جستجو شده یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const shift = shifts.find((s) => s.id === emp.shiftId) || shifts[0];
                  const permCount = (emp.permissions || [1, 2, 3, 4, 5, 6]).length;
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
                        {(() => {
                          const isStd = !emp.permissions || (emp.permissions.length === 6 && [1, 2, 3, 4, 5, 6].every(l => emp.permissions!.includes(l)));
                          const isFull = emp.permissions?.length === 10;
                          if (isStd) {
                            return (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                                عادی (استاندارد)
                              </span>
                            );
                          }
                          return (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-indigo-600" />
                              <span>{isFull ? 'دسترسی کامل' : 'دسترسی سفارشی'}</span>
                            </span>
                          );
                        })()}
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

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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
                    onChange={(e) => setFormData({ ...formData, personalCode: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    شماره موبایل <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                    placeholder="0912XXXXXXX"
                  />
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
                    <option value="ws_1">کارگاه شماره یک (تولید و ماشین‌کاری - مشهد، توس ۱۴۲)</option>
                    <option value="ws_2">کارگاه شماره دو (مونتاژ و انبار - مشهد، توس ۱۴۲)</option>
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
                    کد ملی <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nationalCode}
                    onChange={(e) => setFormData({ ...formData, nationalCode: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                    placeholder="00XXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    شماره کارت بانکی (۱۶ رقمی)
                  </label>
                  <input
                    type="text"
                    maxLength={19}
                    value={formData.cardNumber || ''}
                    onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                    placeholder="۶۰۳۷-۹۹۷۵-..."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
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
                    onChange={(e) => setFormData({ ...formData, shebaNumber: e.target.value })}
                    placeholder="IR..."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    شماره حساب بانکی (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccount || ''}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    placeholder="شماره حساب..."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Portal Login Credentials Section */}
              <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200/80 space-y-3">
                <div className="text-xs font-bold text-indigo-950 flex items-center justify-between">
                  <span>اطلاعات ورود به پرتال اختصاصی پرسنل</span>
                  <span className="text-[10px] text-indigo-700 font-normal">ایجاد خودکار حساب کاربری با حروف کوچک</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      نام کاربری پرتال (Username)
                    </label>
                    <input
                      type="text"
                      value={formData.username || ''}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="text"
                      className="w-full text-xs p-2 rounded-lg border border-indigo-200 bg-white font-mono focus:outline-none focus:border-indigo-600"
                      placeholder="مثال: ali.karimi"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">کیبورد خودکار با حروف کوچک تایپ می‌کند</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      رمز عبور پرتال (Password)
                    </label>
                    <input
                      type="text"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full text-xs p-2 rounded-lg border border-indigo-200 bg-white font-mono focus:outline-none focus:border-indigo-600"
                      placeholder="پیش‌فرض: 123"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">قابل تغییر در هر زمان توسط مدیر</span>
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
                    className="w-full text-xs p-2 rounded-lg border border-indigo-200 bg-white font-mono focus:outline-none focus:border-indigo-600"
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

                  {/* Permissions Selection (Levels 1 to 10 with Full Descriptions) */}
                  <div className="pt-2 border-t border-amber-200/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-indigo-600" />
                          <span>اختیارات و سطوح دسترسی پرسنل:</span>
                        </span>
                        <span className="text-[11px] text-amber-900 block mt-0.5">
                          سطح پیش‌فرض: <strong className="text-emerald-700">سطح ۱ (ثبت تردد پایه)</strong> جهت جلوگیری از دسترسی ناخواسته
                        </span>
                      </div>
                      <span className="text-[11px] text-indigo-700 font-semibold font-mono bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                        {(formData.permissions || []).length} سطح فعال
                      </span>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, permissions: [1] })}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          (formData.permissions || []).length === 1 && (formData.permissions || [])[0] === 1
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        فقط سطح ۱ (پیش‌فرض امن کارگاه)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, permissions: [1, 2, 3] })}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer"
                      >
                        سطوح ۱ تا ۳ (تردد + مرخصی)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, permissions: [1, 2, 3, 4, 5, 6] })}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer"
                      >
                        سطوح ۱ تا ۶ (استاندارد کارگری)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, permissions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
                      >
                        دسترسی کامل (۱ تا ۱۰)
                      </button>
                    </div>

                    {/* Detailed Permission Level Cards with Titles and Descriptions */}
                    <div className="space-y-1.5 pt-2 max-h-60 overflow-y-auto pr-1">
                      {PERMISSION_LEVELS.map((perm) => {
                        const isChecked = (formData.permissions || []).includes(perm.level);
                        return (
                          <div
                            key={perm.level}
                            onClick={() => {
                              const cur = formData.permissions || [];
                              const updated = cur.includes(perm.level)
                                ? cur.filter(p => p !== perm.level)
                                : [...cur, perm.level].sort((a,b)=>a-b);
                              setFormData({ ...formData, permissions: updated });
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
                              onChange={() => {}} // handled by parent onClick
                              className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded ${
                                  isChecked ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  سطح {perm.level}
                                </span>
                                <span className="text-xs font-bold text-slate-800">
                                  {perm.title}
                                </span>
                                {perm.level === 1 && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                    پیش‌فرض امن
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                {perm.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    حقوق پایه ماهیانه (تومان)
                  </label>
                  <input
                    type="number"
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
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
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  {editingEmployee ? 'بروزرسانی پرسنل' : 'ثبت قطعی'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERMISSIONS MANAGEMENT MODAL (LEVELS 1 TO 10) */}
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
                    <span>مدیریت سطوح دسترسی پرسنل (منحصراً مدیر اصلی: مجید نورایی)</span>
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
              
              {/* Presets Row */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
                  <span>انتخاب سریع الگوهای دسترسی سازمانی:</span>
                  <span className="text-indigo-600 font-mono text-[11px]">{tempPermissions.length} از ۱۰ سطح</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetPresetPermissions([1, 2, 3])}
                    className="p-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-700 cursor-pointer transition-all text-center"
                  >
                    سطوح ۱ تا ۳ (پایه)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPresetPermissions([1, 2, 3, 4, 5, 6])}
                    className="p-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-700 cursor-pointer transition-all text-center"
                  >
                    سطوح ۱ تا ۶ (استاندارد)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPresetPermissions([1, 2, 3, 4, 5, 6, 7, 8])}
                    className="p-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-700 cursor-pointer transition-all text-center"
                  >
                    سطوح ۱ تا ۸ (سرپرست)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPresetPermissions([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])}
                    className="p-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer transition-all text-center shadow-xs"
                  >
                    سطوح ۱ تا ۱۰ (کامل)
                  </button>
                </div>
              </div>

              {/* 10 Permissions List with Toggles */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800">تفکیک ۱۰ سطح دسترسی در سامانه:</h4>
                <div className="space-y-2">
                  {PERMISSION_LEVELS.map((perm) => {
                    const isGranted = tempPermissions.includes(perm.level);
                    return (
                      <div
                        key={perm.level}
                        onClick={() => handleTogglePermission(perm.level)}
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
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                              {perm.level}
                            </span>
                            <span className="font-bold text-xs text-slate-900">{perm.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {perm.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                تنظیمات فوراً در پرتال پرسنلی اعمال خواهد شد.
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
                  <span>ذخیره سطوح دسترسی</span>
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
