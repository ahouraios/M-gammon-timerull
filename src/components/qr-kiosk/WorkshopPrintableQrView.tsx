import React, { useState } from 'react';
import {
  Printer,
  QrCode,
  MapPin,
  Building2,
  Download,
  Camera,
  CheckCircle2,
  Info,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Layers
} from 'lucide-react';
import { Workshop, Employee, AttendanceRecord, Shift } from '../../types';
import { StorageService } from '../../services/storage';
import { CameraQrScannerModal } from '../attendance/CameraQrScannerModal';
import { BeautifulQrCode } from '../common/BeautifulQrCode';
import { DeveloperBadge } from '../common/DeveloperBadge';

interface WorkshopPrintableQrViewProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  onRefresh: () => void;
  currentUserEmployee?: Employee;
}

export const WorkshopPrintableQrView: React.FC<WorkshopPrintableQrViewProps> = ({
  employees,
  attendance,
  onRefresh,
  currentUserEmployee,
}) => {
  const settings = StorageService.getSettings();
  const shifts = StorageService.getShifts();
  const workshops: Workshop[] = settings.workshops && settings.workshops.length > 0
    ? settings.workshops
    : [
        {
          id: 'ws_1',
          name: 'کارگاه شماره یک (تولید و ماشین‌کاری)',
          code: 'WS-01',
          lat: 36.37652,
          lng: 59.50812,
          allowedRadiusMeters: 35,
          address: 'مشهد، توس ۱۴۲، حسین زاده ۸، پلاک ۱۲',
        },
        {
          id: 'ws_2',
          name: 'کارگاه شماره دو (مونتاژ و انبار)',
          code: 'WS-02',
          lat: 36.37668,
          lng: 59.50835,
          allowedRadiusMeters: 35,
          address: 'مشهد، توس ۱۴۲، حسین زاده ۸، پلاک ۱۸',
        }
      ];

  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop>(workshops[0]);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Generate standardized static workshop payload for printed boards
  const qrPayload = `MGOMMON_WORKSHOP:${selectedWorkshop.id}:${selectedWorkshop.code}:${encodeURIComponent(selectedWorkshop.name)}:${selectedWorkshop.lat}:${selectedWorkshop.lng}:STATIC_POSTER_V1`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(qrPayload);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Screen-Only Control Toolbar */}
      <div className="print:hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Printer className="w-5 h-5" />
              </span>
              <h1 className="text-base sm:text-lg font-bold text-slate-800">
                تابلو و چاپ بارکد QR کارگاه‌ها
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              بر اساس تصمیم جدید، کد QR روی تابلوی ورودی کارگاه چاپ و نصب می‌گردد. پرسنل با دوربین گوشی این تابلو را اسکن کرده و به همراه استعلام GPS، تردد و اضافه‌کار ثبت می‌شود.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsScannerModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>تست اسکن با دوربین گوشی</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ تابلوی رسمی (Print)</span>
            </button>
          </div>
        </div>

        {/* Workshop Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-slate-500 shrink-0">انتخاب کارگاه:</span>
          {workshops.map((ws) => (
            <button
              key={ws.id}
              type="button"
              onClick={() => setSelectedWorkshop(ws)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedWorkshop.id === ws.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {ws.name} ({ws.code})
            </button>
          ))}
        </div>
      </div>

      {/* PRINTABLE OFFICIAL POSTER CONTAINER */}
      <div className="bg-white rounded-3xl border-2 border-slate-300 p-6 sm:p-10 max-w-2xl mx-auto shadow-xl print:m-0 print:p-8 print:border-none print:shadow-none print:w-full print:max-w-none">
        
        {/* Official Header */}
        <div className="text-center pb-6 border-b-2 border-slate-900 space-y-2">
          <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>{settings.companyName || 'سامانه مدیریت تردد پرسنل M.GAMMON'}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            تابلوی رسمی ثبت ورود و خروج کارگاه
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-600">
            {selectedWorkshop.name} • شناسه اختصاصی کارگاه: {selectedWorkshop.code}
          </p>
        </div>

        {/* Poster Main Body: Large QR & Visual Indicators */}
        <div className="py-8 flex flex-col items-center justify-center space-y-6">
          
          {/* Big QR Code Card */}
          <div className="relative p-4 bg-white rounded-3xl border-4 border-slate-900 shadow-xl flex flex-col items-center justify-center">
            <BeautifulQrCode
              value={qrPayload}
              size={250}
              logoUrl={StorageService.getSettings().logoUrl}
              logoText="M.G"
              className="border-0 shadow-none p-1"
            />

            <div className="mt-3 text-center">
              <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                شناسه تابلو: {selectedWorkshop.code} • کارگاه مشهد (توس ۱۴۲)
              </span>
            </div>
          </div>

          {/* Workshop Details & Geofencing Parameters */}
          <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">نشانی محل کارگاه:</span>
              <span className="font-bold text-slate-800">{selectedWorkshop.address || 'مشهد، توس ۱۴۲، حسین زاده ۸'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">مختصات جغرافیایی تایید شده:</span>
              <span className="font-mono font-bold text-slate-800" dir="ltr">
                {selectedWorkshop.lat.toFixed(5)}, {selectedWorkshop.lng.toFixed(5)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">سقف شعاع مجاز تایید موقعیت (GPS):</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                حداکثر {selectedWorkshop.allowedRadiusMeters || 20} متر
              </span>
            </div>
          </div>

          {/* 3-Step Instruction Guide for Employees */}
          <div className="w-full space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <span>راهنمای ۳ مرحله‌ای ثبت تردد پرسنل با گوشی هوشمند:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-right">
              <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center mb-1.5">
                  ۱
                </div>
                <div className="font-bold text-xs text-slate-800">باز کردن دوربین سامانه</div>
                <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  وارد پرتال پرسنلی خود شده و گزینه «اسکن بارکد کارگاه» را لمس کنید.
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center mb-1.5">
                  ۲
                </div>
                <div className="font-bold text-xs text-slate-800">اسکن تابلو و تایید GPS</div>
                <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  دوربین را روبروی تابلو گرفته و اجازه استعلام موقعیت زنده را تایید کنید.
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100">
                <div className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center mb-1.5">
                  ۳
                </div>
                <div className="font-bold text-xs text-slate-800">تایید ورود یا خروج</div>
                <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  دکمه تایید را فشرده تا ساعات کارکرد، دیرکرد یا اضافه‌کاری دقیقاً محاسبه و ثبت شود.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Official Poster Footer */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div>مدیریت منابع انسانی و پشتیبانی فنی M.GAMMON</div>
          <div className="font-mono text-slate-400">BOARD-CODE: MG-{selectedWorkshop.code}-PRINT</div>
        </div>
      </div>

      {/* Developer Branding */}
      <DeveloperBadge variant="footer" className="mt-4 print:hidden" />

      {/* Camera QR & GPS Scanner Modal for live scanning */}
      <CameraQrScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        allEmployees={employees}
        shifts={shifts}
        onSuccessPunch={(record, msg) => {
          onRefresh();
        }}
      />
    </div>
  );
};
