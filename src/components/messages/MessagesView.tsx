import React, { useState } from 'react';
import {
  Send,
  MessageSquare,
  Smartphone,
  Bell,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Trash2,
  AlertCircle,
  Radio,
  Receipt,
  Eye,
  Check,
  PlusCircle,
  XCircle,
  X
} from 'lucide-react';
import { BroadcastMessage, Employee, User, WorkerExpense } from '../../types';
import { StorageService } from '../../services/storage';
import { getTodayShamsiDetailed, formatNumberFa, formatCurrencyTomans } from '../../utils/dateUtils';

interface MessagesViewProps {
  currentUser: User;
  employees: Employee[];
  messages: BroadcastMessage[];
  onRefresh: () => void;
  canSend: boolean;
  onNavigate?: (tab: string) => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  currentUser,
  employees,
  messages,
  onRefresh,
  canSend,
  onNavigate,
}) => {
  const shamsi = getTodayShamsiDetailed();
  const settings = StorageService.getSettings();

  const [recipientType, setRecipientType] = useState<'ALL' | 'WORKSHOP_1' | 'WORKSHOP_2' | 'SELECTED'>('ALL');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [channel, setChannel] = useState<'SMS' | 'IN_APP' | 'BOTH'>('BOTH');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const allExpenses = StorageService.getWorkerExpenses(currentUser);

  const handleExpenseDecision = (expenseId: string, action: 'SETTLE_NOW' | 'ADD_TO_SALARY' | 'REJECT') => {
    setActionLoadingId(expenseId);
    try {
      const res = StorageService.reviewWorkerExpense(expenseId, action, currentUser.name);
      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message
      });
      onRefresh();
    } catch {
      setFeedback({ type: 'error', message: 'خطا در ثبت تصمیم روی هزینه.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const templates = [
    {
      title: 'یادآوری ثبت تردد با کد QR',
      content: 'همکاران گرامی، لطفاً تردد ورود و خروج خود را صرفاً از طریق اسکن کیوسک بارکد کارگاه ثبت فرمایید.'
    },
    {
      title: 'صدور فیش‌های حقوقی دوره جدید',
      content: 'فیش‌های حقوقی ماه جاری صادر شد. همکاران محترم می‌توانند از پرتال پرسنلی نسبت به مشاهده و دریافت فایل اقدام نمایند.'
    },
    {
      title: 'اطلاعیه تغییر ساعت کاری کارگاه',
      content: 'به اطلاع می‌رساند ساعات کاری کارگاه در هفته آتی بر اساس برنامه ابلاغی جدید خواهد بود.'
    },
    {
      title: 'جلسه هماهنگی ایمنی و HSE',
      content: 'حضور کلیه پرسنل فنی در جلسه بررسی ضوابط ایمنی و تحویل تجهیزات الزامی می‌باشد.'
    },
  ];

  const handleApplyTemplate = (tpl: { title: string; content: string }) => {
    setTitle(tpl.title);
    setContent(tpl.content);
  };

  const handleToggleEmployee = (empId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const getRecipientNames = (): string[] => {
    if (recipientType === 'ALL') {
      return ['کلیه پرسنل (عمومی)'];
    }
    if (recipientType === 'WORKSHOP_1') {
      return ['کارگاه شماره یک (تولید و ماشین‌کاری)'];
    }
    if (recipientType === 'WORKSHOP_2') {
      return ['کارگاه شماره دو (مونتاژ و انبار)'];
    }
    return employees
      .filter((e) => selectedEmployeeIds.includes(e.id))
      .map((e) => `${e.firstName} ${e.lastName}`);
  };

  const getRecipientCount = (): number => {
    if (recipientType === 'ALL') return employees.length;
    if (recipientType === 'WORKSHOP_1') {
      return employees.filter((e) => !e.workshopId || e.workshopId === 'ws_1').length;
    }
    if (recipientType === 'WORKSHOP_2') {
      return employees.filter((e) => e.workshopId === 'ws_2').length;
    }
    return selectedEmployeeIds.length;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setFeedback({ type: 'error', message: 'لطفاً عنوان و متن پیام را وارد نمایید.' });
      return;
    }
    if (recipientType === 'SELECTED' && selectedEmployeeIds.length === 0) {
      setFeedback({ type: 'error', message: 'لطفاً حداقل یک پرسنل را انتخاب نمایید.' });
      return;
    }

    if ((channel === 'SMS' || channel === 'BOTH') && !settings.smsEnabled) {
      setFeedback({
        type: 'error',
        message: 'ارسال پیامک در تنظیمات سیستم غیرفعال است. جهت فعال‌سازی به صفحه تنظیمات مراجعه نمایید.'
      });
      return;
    }

    setIsSending(true);
    setFeedback(null);
    const recipientCount = getRecipientCount();

    try {
      const result = await StorageService.sendMessageAsync({
        title: title.trim(),
        content: content.trim(),
        recipientType,
        recipientIds: recipientType === 'SELECTED' ? selectedEmployeeIds : undefined,
        channel
      });

      if (result.success) {
        setTitle('');
        setContent('');
        setSelectedEmployeeIds([]);
        setFeedback({
          type: 'success',
          message: result.message || `پیام با موفقیت ارسال شد (${channel === 'SMS' ? 'پیامک مستقیم به خط پرسنل' : channel === 'IN_APP' ? 'اعلان درون برنامه‌ای' : 'پیامک مستقیم و پرتال'}).`
        });
      } else {
        setFeedback({
          type: 'error',
          message: result.message || 'خطا در ارسال پیامک یا ارتباط با درگاه.'
        });
      }
      onRefresh();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'خطا در ارتباط با سرور ارسال پیامک.'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = (id: string) => {
    setDeletingMessageId(id);
  };

  const handleConfirmDeleteMessage = () => {
    if (!deletingMessageId) return;
    StorageService.deleteMessage(deletingMessageId);
    setDeletingMessageId(null);
    onRefresh();
  };

  const smsChars = content.length;
  const smsParts = Math.ceil(smsChars / 70) || (smsChars > 0 ? 1 : 0);

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Page Header */}
      <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg lg:text-xl font-bold text-slate-800">
                سامانه اطلاع‌رسانی پیامکی و پیام‌های پرتال
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ارسال پیامک گروهی به پرسنل کارگاه‌ها و اطلاعیه‌های رسمی درون‌برنامه‌ای
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {settings.smsEnabled && (settings.smsApiKey || (settings.smsUsername && settings.smsPassword)) ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>
                درگاه پیامک متصل:{' '}
                {
                  settings.smsProvider === 'IPPANEL_FARAZ' ? 'فراز اس‌ام‌اس / IPPanel' :
                  settings.smsProvider === 'MELIPAYAMAK' ? 'ملی‌پیامک' :
                  settings.smsProvider === 'GHASEDAK' ? 'قاصدک' :
                  settings.smsProvider === 'SMS_IR' ? 'SMS.ir' :
                  settings.smsProvider === 'CUSTOM' ? 'وب‌سرویس سفارشی' : 'کاوه‌نگار'
                } {settings.smsSenderNumber ? `(خط: ${settings.smsSenderNumber})` : ''}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>{settings.smsEnabled ? 'اطلاعات درگاه پیامک هنوز تکمیل نشده است' : 'ارسال پیامک غیرفعال است'}</span>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('settings')}
                  className="font-bold underline text-amber-950 hover:text-amber-800 mr-1 cursor-pointer"
                >
                  (تنظیمات پنل پیامک)
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Compose on Right/Top, History on Left/Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-full">
        {/* Compose Form */}
        <div className="lg:col-span-7 bg-white p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm lg:text-base text-slate-800 flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-600" />
              <span>ارسال پیام جدید</span>
            </h3>
            <span className="text-xs text-slate-400">
              فرستنده: <strong className="text-slate-700">{currentUser.name}</strong>
            </span>
          </div>

          {/* Missing SMS Config Notice */}
          {(!settings.smsEnabled || !settings.smsApiKey) && (channel === 'SMS' || channel === 'BOTH') && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  برای ارسال مستقیم پیامک به تلفن همراه پرسنل، اطلاعات پنل پیامکی خود را در صفحه تنظیمات وارد نمایید.
                </span>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('settings')}
                  className="px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold shrink-0 transition-colors cursor-pointer text-[11px]"
                >
                  ورود به تنظیمات
                </button>
              )}
            </div>
          )}

          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="space-y-4">
            {/* 1. Recipient Scope */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                گیرندگان پیام:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setRecipientType('ALL')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                    recipientType === 'ALL'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  همه پرسنل ({formatNumberFa(employees.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientType('WORKSHOP_1')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                    recipientType === 'WORKSHOP_1'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  کارگاه مرکزی
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientType('WORKSHOP_2')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                    recipientType === 'WORKSHOP_2'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  کارگاه شماره دو
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientType('SELECTED')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                    recipientType === 'SELECTED'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  انتخابی ({formatNumberFa(selectedEmployeeIds.length)})
                </button>
              </div>

              {/* Multi-select employees list if SELECTED */}
              {recipientType === 'SELECTED' && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-40 overflow-y-auto space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">
                    انتخاب پرسنل مورد نظر:
                  </div>
                  {employees.map((emp) => {
                    const isChecked = selectedEmployeeIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                          isChecked ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:bg-white text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleEmployee(emp.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>
                            {emp.firstName} {emp.lastName}
                          </span>
                          <span className="text-[10px] text-slate-400">({emp.position})</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {emp.workshopId === 'ws_2' ? 'کارگاه شماره دو' : 'کارگاه شماره یک'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Channel Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                روش ارسال پیام:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setChannel('BOTH')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    channel === 'BOTH'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span>پیامک + پرتال</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('SMS')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    channel === 'SMS'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>فقط پیامک (SMS)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('IN_APP')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    channel === 'IN_APP'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span>اعلان درون‌برنامه‌ای</span>
                </button>
              </div>
            </div>

            {/* Quick Templates Bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>قالب‌های آماده:</span>
                </label>
                <span className="text-[10px] text-slate-400">کلیک برای درج خودکار</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5">
                {templates.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-[11px] text-slate-600 transition-colors border border-slate-200/80 cursor-pointer shrink-0"
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Title Input */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                موضوع / عنوان پیام
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان پیام را وارد نمایید..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                required
              />
            </div>

            {/* Content Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700">
                  متن پیام
                </label>
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span>{formatNumberFa(smsChars)} کاراکتر</span>
                  <span>|</span>
                  <span>{formatNumberFa(smsParts)} پارت پیامک</span>
                </div>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="متن پیام خود را بنویسید..."
                className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSending || !canSend}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSending
                    ? 'در حال ارسال پیام...'
                    : `ارسال نهایی برای ${formatNumberFa(getRecipientCount())} نفر`}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* History / Sent Messages */}
        <div className="lg:col-span-5 bg-white p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm lg:text-base text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>تاریخچه پیام‌های ارسالی</span>
            </h3>
            <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
              {formatNumberFa(messages.length)} پیام
            </span>
          </div>

          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                تاکنون پیامی ارسال نشده است.
              </div>
            ) : (
              messages.map((msg) => {
                const linkedExpense = msg.expenseId
                  ? allExpenses.find((e) => e.id === msg.expenseId)
                  : (msg.title.includes('درخواست تسویه هزینه') ? allExpenses.find((e) => msg.content.includes(e.title) || msg.content.includes(e.employeeName)) : null);

                return (
                  <div
                    key={msg.id}
                    className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:shadow-xs transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          {linkedExpense && <Receipt className="w-3.5 h-3.5 text-amber-600" />}
                          <span>{msg.title}</span>
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>ارسال توسط: {msg.senderName}</span>
                          <span>•</span>
                          <span>{msg.sentAt}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {msg.status === 'FAILED' ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                            title={msg.smsDeliveryStatus || 'خطای ارسال پیامک'}
                          >
                            <AlertCircle className="w-3 h-3" /> خطای ارسال پیامک
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            title={msg.smsDeliveryStatus || 'ارسال موفق'}
                          >
                            <CheckCircle2 className="w-3 h-3" /> {msg.channel === 'IN_APP' ? 'ثبت در پرتال' : 'ارسال به درگاه'}
                          </span>
                        )}
                        {canSend && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-100 whitespace-pre-line">
                      {msg.content}
                    </p>

                    {/* Linked Expense Direct Actions for Manager */}
                    {linkedExpense && (
                      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 space-y-2 text-right">
                        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-amber-950">
                            <span>خرید: {linkedExpense.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300">
                              {formatCurrencyTomans(linkedExpense.amount)}
                            </span>
                            {linkedExpense.receiptUrl && (
                              <button
                                type="button"
                                onClick={() => setViewingReceiptUrl(linkedExpense.receiptUrl!)}
                                className="px-2 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              >
                                <Eye className="w-3 h-3 text-amber-700" />
                                <span>مشاهده فاکتور</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] text-amber-800 flex items-center justify-between border-t border-amber-200/60 pt-1.5">
                          <span>پرداخت‌کننده: <strong>کارت شخصی کارگر</strong> (بستانکاری بابت هزینه کارگاه)</span>
                          <span>تاریخ: <span className="font-mono">{linkedExpense.date}</span></span>
                        </div>

                        {/* Direct Decision Buttons */}
                        {linkedExpense.status === 'PENDING_SETTLEMENT' ? (
                          <div className="pt-1.5 border-t border-amber-200/80 flex items-center justify-end gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-700 ml-auto">تصمیم مدیر:</span>
                            <button
                              type="button"
                              disabled={actionLoadingId === linkedExpense.id}
                              onClick={() => handleExpenseDecision(linkedExpense.id, 'SETTLE_NOW')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>تسویه الآن</span>
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === linkedExpense.id}
                              onClick={() => handleExpenseDecision(linkedExpense.id, 'ADD_TO_SALARY')}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>افزودن به حقوق</span>
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === linkedExpense.id}
                              onClick={() => handleExpenseDecision(linkedExpense.id, 'REJECT')}
                              className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>رد</span>
                            </button>
                          </div>
                        ) : (
                          <div className="pt-1.5 border-t border-amber-200/80 flex items-center justify-between text-xs">
                            <span className="text-[11px] text-slate-600">وضعیت تسویه هزینه:</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                                linkedExpense.status === 'SETTLED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : linkedExpense.status === 'ADDED_TO_SALARY'
                                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {linkedExpense.status === 'SETTLED'
                                ? '✓ تأیید و تسویه‌شده (مستقیم)'
                                : linkedExpense.status === 'ADDED_TO_SALARY'
                                ? '+ تأیید و افزوده‌شده به حقوق ماه جاری'
                                : '✕ ردشده'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>
                          گیرندگان:{' '}
                          {msg.recipientType === 'ALL'
                            ? 'تمامی پرسنل'
                            : msg.recipientType === 'WORKSHOP_1'
                            ? 'کارگاه مرکزی'
                            : msg.recipientType === 'WORKSHOP_2'
                            ? 'کارگاه شماره دو'
                            : msg.recipientNames?.join('، ') || 'انتخابی'}
                        </span>
                      </div>
                      <span className="font-medium text-indigo-600">
                        {msg.channel === 'BOTH' ? 'پیامک + پرتال' : msg.channel === 'SMS' ? 'پیامک' : 'پرتال'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Delete Message Confirmation Modal */}
      {deletingMessageId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 p-5 space-y-4 shadow-2xl text-right">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">حذف پیام از سابقه</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              آیا از حذف این پیام ارسالی از لیست تاریخچه سامانه اطمینان دارید؟
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingMessageId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMessage}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs"
              >
                تایید و حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Image Viewer Modal */}
      {viewingReceiptUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-right animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-600" />
                <span>تصویر فاکتور / رسید خرید پیوست‌شده</span>
              </h3>
              <button
                type="button"
                onClick={() => setViewingReceiptUrl(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center bg-slate-50 p-2 rounded-2xl border border-slate-100 max-h-[70vh] overflow-auto">
              <img
                src={viewingReceiptUrl}
                alt="فاکتور خرید"
                className="rounded-xl object-contain max-h-[65vh] w-auto shadow-xs"
              />
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setViewingReceiptUrl(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
