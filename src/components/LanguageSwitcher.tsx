import { useLanguage } from '../lib/i18n';
import { Languages } from 'lucide-react';
import { motion } from 'motion/react';

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'bn' : 'en';
    setLang(newLang);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleLanguage}
      className="flex items-center gap-2 bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold hover:text-white transition-colors border border-slate-700"
    >
      <Languages size={14} />
      <span>{lang === 'en' ? 'বাংলা' : 'English'}</span>
    </motion.button>
  );
}
