/**
 * Solar Hijri (Shamsi / Jalali) Date & Currency Utilities
 */

export const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const PERSIAN_WEEKDAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
];

// Helper to convert Gregorian date to Jalali
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  jy += Math.floor((days - 1) / 365);
  if (days > 0) days = (days - 1) % 365;
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

// Convert Jalali date to Gregorian
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  jy += 1595;
  let days = -355668 + (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4) + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_b = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13 && gd > sal_b[gm]; gm++) gd -= sal_b[gm];
  return [gy, gm, gd];
}

export function isJalaliLeapYear(jy: number): boolean {
  return ((((((jy - (jy > 0 ? 474 : 473)) % 2820) + 474) + 38) * 682) % 2816) < 682;
}

export function getDaysInJalaliMonth(jy: number, jm: number): number {
  if (jm >= 1 && jm <= 6) return 31;
  if (jm >= 7 && jm <= 11) return 30;
  if (jm === 12) return isJalaliLeapYear(jy) ? 30 : 29;
  return 30;
}

export function getJalaliMonthFirstDayOfWeek(jy: number, jm: number): number {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, 1);
  const date = new Date(gy, gm - 1, gd);
  const jsDay = date.getDay(); // 0 is Sun, 1 is Mon... 6 is Sat
  return (jsDay + 1) % 7; // 0: Sat (شنبه), 1: Sun (یکشنبه), ... 6: Fri (جمعه)
}

export function getTodayShamsi(): string {
  const now = new Date();
  const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const mm = jm < 10 ? `0${jm}` : `${jm}`;
  const dd = jd < 10 ? `0${jd}` : `${jd}`;
  return `${jy}/${mm}/${dd}`;
}

export function getTodayShamsiDetailed(): {
  dateString: string;
  dayOfWeek: string;
  day: number;
  monthName: string;
  year: number;
} {
  const now = new Date();
  const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const jsDay = now.getDay();
  const persianDayIdx = (jsDay + 1) % 7;
  const dayOfWeek = PERSIAN_WEEKDAYS[persianDayIdx];
  const monthName = PERSIAN_MONTHS[jm - 1];
  const mm = jm < 10 ? `0${jm}` : `${jm}`;
  const dd = jd < 10 ? `0${jd}` : `${jd}`;

  return {
    dateString: `${jy}/${mm}/${dd}`,
    dayOfWeek,
    day: jd,
    monthName,
    year: jy,
  };
}

export function formatShamsiDate(shamsiString: string): string {
  if (!shamsiString) return '';
  const parts = shamsiString.split('/');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const monthName = PERSIAN_MONTHS[m - 1] || parts[1];
    return `${d} ${monthName} ${y}`;
  }
  return shamsiString;
}

export function getCurrentTimeStr(): string {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatCurrencyTomans(amount: number): string {
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
}

export function formatNumberFa(num: number): string {
  return new Intl.NumberFormat('fa-IR').format(num);
}

export function minutesToHoursAndMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '۰ دقیقه';
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours > 0 && remainingMins > 0) {
    return `${hours} ساعت و ${remainingMins} دقیقه`;
  }
  if (hours > 0) {
    return `${hours} ساعت`;
  }
  return `${remainingMins} دقیقه`;
}

// Calculate distance between two GPS coordinates in meters (Haversine formula)
export function calculateGpsDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}
