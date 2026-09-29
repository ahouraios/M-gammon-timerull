import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ShieldCheck } from 'lucide-react';

interface BeautifulQrCodeProps {
  value: string;
  size?: number;
  logoUrl?: string;
  logoText?: string;
  className?: string;
  colorDark?: string;
  colorLight?: string;
}

export const BeautifulQrCode: React.FC<BeautifulQrCodeProps> = ({
  value,
  size = 240,
  logoUrl,
  logoText = 'M.G',
  className = '',
  colorDark = '#090d16',
  colorLight = '#ffffff',
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'H', // High error correction (30%) guarantees scannability with center logo
      margin: 1.5,
      width: size * 2, // High DPI render
      color: {
        dark: colorDark,
        light: colorLight,
      },
    })
      .then((url) => {
        setDataUrl(url);
        setError(false);
      })
      .catch((err) => {
        console.error('Error generating QR Code:', err);
        setError(true);
      });
  }, [value, size, colorDark, colorLight]);

  const logoDimension = Math.round(size * 0.23); // ~23% of QR size, perfectly within 30% H-level tolerance

  return (
    <div
      className={`relative inline-flex items-center justify-center bg-white rounded-3xl p-3.5 shadow-xl border-4 border-slate-900/10 transition-all select-none ${className}`}
      style={{ width: size + 28, height: size + 28 }}
    >
      {/* 4 Artistic Corner Accents */}
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-600 rounded-tr-lg" />
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-600 rounded-tl-lg" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-600 rounded-br-lg" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-600 rounded-bl-lg" />

      {/* QR Code Image */}
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="QR Code"
          width={size}
          height={size}
          className="rounded-2xl block object-contain"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="flex items-center justify-center bg-slate-100 rounded-2xl animate-pulse text-xs text-slate-400"
          style={{ width: size, height: size }}
        >
          {error ? 'خطا در تولید بارکد' : 'در حال تولید QR...'}
        </div>
      )}

      {/* Centered Logo Plate */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl p-1.5 shadow-lg border-2 border-indigo-500/40 flex items-center justify-center overflow-hidden z-10"
        style={{
          width: logoDimension,
          height: logoDimension,
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            className="w-full h-full object-contain rounded-xl"
          />
        ) : (
          <div className="w-full h-full rounded-xl bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col items-center justify-center shadow-inner">
            <span className="font-extrabold text-[12px] tracking-wider text-amber-300 font-mono leading-none">
              {logoText}
            </span>
            <span className="text-[7px] font-bold text-slate-300 uppercase tracking-tighter mt-0.5">
              GAMMON
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
