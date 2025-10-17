import en from './en';
import zh from './zh-CN';

export type Dict = typeof en;

const dicts: Record<string, Dict> = {
  en: en,
  'en-US': en,
  'zh-CN': zh,
  zh: zh,
};

const STORAGE_KEY = 'steam-log-locale';

function getStoredLocale(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.warn('read locale failed', err);
    return null;
  }
}

function persistLocale(locale: string) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch (err) {
    console.warn('save locale failed', err);
  }
}

export function createI18n(defaultLocale = 'en') {
  const stored = getStoredLocale();
  let locale = stored && dicts[stored] ? stored : defaultLocale;
  const t = (key: keyof Dict, ...args: any[]): any => {
    const d = dicts[locale] || en;
    const val: any = (d as any)[key];
    if (typeof val === 'function') return (val as Function)(...(args as any));
    return val ?? key;
  };
  return {
    get locale() {
      return locale;
    },
    setLocale(l: string) {
      locale = dicts[l] ? l : defaultLocale;
      persistLocale(locale);
    },
    t,
  };
}
