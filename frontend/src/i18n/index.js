import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import tr from './locales/tr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import es from './locales/es.json';
import sv from './locales/sv.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
      de: { translation: de },
      it: { translation: it },
      es: { translation: es },
      sv: { translation: sv },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    detection: {
      // Check localStorage first, then browser language
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;

// Language metadata for the switcher UI
export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
];
