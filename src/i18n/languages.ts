export type LanguageOption = {
  code: string;
  country: string;
  rtl: boolean;
  available: boolean;
  genericFlag?: boolean;
};

export const languages = [
  { code: 'ar', country: 'ma', rtl: true, available: true },
  { code: 'en', country: 'us', rtl: false, available: true },
  { code: 'fr', country: 'fr', rtl: false, available: true },
  { code: 'es', country: 'es', rtl: false, available: false },
  { code: 'pt', country: 'br', rtl: false, available: false },
  { code: 'de', country: 'de', rtl: false, available: false },
  { code: 'it', country: 'it', rtl: false, available: false },
  { code: 'tr', country: 'tr', rtl: false, available: false },
  { code: 'ru', country: 'ru', rtl: false, available: false },
  { code: 'zh', country: 'cn', rtl: false, available: false },
  { code: 'ja', country: 'jp', rtl: false, available: false },
  { code: 'ko', country: 'kr', rtl: false, available: false },
  { code: 'hi', country: 'in', rtl: false, available: false },
  { code: 'ur', country: 'pk', rtl: true, available: false },
  { code: 'fa', country: 'ir', rtl: true, available: false },
  { code: 'he', country: 'il', rtl: true, available: false },
  { code: 'nl', country: 'nl', rtl: false, available: false },
  { code: 'pl', country: 'pl', rtl: false, available: false },
  { code: 'uk', country: 'ua', rtl: false, available: false },
  { code: 'sv', country: 'se', rtl: false, available: false },
  { code: 'id', country: 'id', rtl: false, available: false },
  { code: 'ms', country: 'my', rtl: false, available: false },
  { code: 'vi', country: 'vn', rtl: false, available: false },
  { code: 'th', country: 'th', rtl: false, available: false },
  { code: 'zgh', country: 'ma', rtl: false, available: false, genericFlag: true },
  { code: 'bn', country: 'bd', rtl: false, available: false },
  { code: 'pa', country: 'in', rtl: false, available: false },
  { code: 'ta', country: 'in', rtl: false, available: false },
  { code: 'te', country: 'in', rtl: false, available: false },
  { code: 'mr', country: 'in', rtl: false, available: false },
  { code: 'gu', country: 'in', rtl: false, available: false },
  { code: 'kn', country: 'in', rtl: false, available: false },
  { code: 'ml', country: 'in', rtl: false, available: false },
  { code: 'ne', country: 'np', rtl: false, available: false },
  { code: 'my', country: 'mm', rtl: false, available: false },
  { code: 'tl', country: 'ph', rtl: false, available: false },
  { code: 'sw', country: 'ke', rtl: false, available: false },
  { code: 'ha', country: 'ng', rtl: false, available: false },
  { code: 'yo', country: 'ng', rtl: false, available: false },
  { code: 'ig', country: 'ng', rtl: false, available: false },
  { code: 'am', country: 'et', rtl: false, available: false },
  { code: 'so', country: 'so', rtl: false, available: false },
  { code: 'zu', country: 'za', rtl: false, available: false },
  { code: 'af', country: 'za', rtl: false, available: false },
  { code: 'el', country: 'gr', rtl: false, available: false },
  { code: 'cs', country: 'cz', rtl: false, available: false },
  { code: 'ro', country: 'ro', rtl: false, available: false },
  { code: 'hu', country: 'hu', rtl: false, available: false },
  { code: 'da', country: 'dk', rtl: false, available: false },
  { code: 'no', country: 'no', rtl: false, available: false },
  { code: 'fi', country: 'fi', rtl: false, available: false },
  { code: 'sr', country: 'rs', rtl: false, available: false },
  { code: 'hr', country: 'hr', rtl: false, available: false },
  { code: 'bg', country: 'bg', rtl: false, available: false },
  { code: 'sk', country: 'sk', rtl: false, available: false },
  { code: 'az', country: 'az', rtl: false, available: false },
  { code: 'kk', country: 'kz', rtl: false, available: false },
  { code: 'uz', country: 'uz', rtl: false, available: false },
  { code: 'ps', country: 'af', rtl: true, available: false },
  { code: 'yue', country: 'hk', rtl: false, available: false },
] as const satisfies readonly LanguageOption[];

export type AvailableLanguage = Extract<(typeof languages)[number], { available: true }>['code'];

export function isAvailableLanguageCode(code: string | null): code is AvailableLanguage {
  return code !== null && languages.some((option) => option.available && option.code === code);
}

export function getBrowserLanguageCodes(): string[] {
  if (typeof navigator === 'undefined') return [];
  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return browserLanguages.map((locale) => locale.toLowerCase().split('-')[0]);
}

export function getPreferredAvailableLanguage(): AvailableLanguage | undefined {
  return getBrowserLanguageCodes()
    .find(isAvailableLanguageCode);
}
