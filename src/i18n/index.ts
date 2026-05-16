import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';
import ja from './locales/ja.json';

export const SUPPORTED_LANGS = [
  { code: 'zh-CN', label: '简体中文', shortLabel: '中' },
  { code: 'en', label: 'English', shortLabel: 'EN' },
  { code: 'ja', label: '日本語', shortLabel: '日' },
] as const;

export type SupportedLangCode = (typeof SUPPORTED_LANGS)[number]['code'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { translation: zhCN },
      en: { translation: en },
      ja: { translation: ja },
    },
    fallbackLng: 'zh-CN',
    supportedLngs: ['zh-CN', 'en', 'ja'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'ac_island_planner_lang',
    },
    returnNull: false,
  });

export default i18n;
