import en from './en';
import zh from './zh-CN';

export type Dict = typeof en;

const dicts: Record<string, Dict> = {
  en: en,
  'en-US': en,
  'zh-CN': zh,
  zh: zh,
};

export function createI18n(defaultLocale = 'en') {
  let locale = defaultLocale;
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
      locale = l;
    },
    t,
  };
}
