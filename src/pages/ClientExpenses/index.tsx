import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BDT, cn } from "../../lib/utils";
import { CategoryIcon, CategoryColor } from "../../components/Shared";
import { useLanguage } from "../../lib/i18n";
import { useAppStore } from "../../store/appStore";

import { Expense, Client } from "../../types";

export default function ClientExpenses() {
  const { t, lang } = useLanguage();
  const { auth, expenses, clients } = useAppStore();
  const client = clients.find(c => c.id === auth?.user.id) as Client;
  
  const [selExp, setSelExp] = useState<Expense | null>(null);

  if (!client) return null;

  const prjExpenses = expenses.filter((e: Expense) => e.projectId === client.projectId);
  const total = prjExpenses.reduce((s: number, e: Expense) => s + e.amount, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      <div className="mb-6">
        <h1 className="text-xl font-black text-app-text-primary">{t('common.project_expenses')}</h1>
      </div>

      <div className="bg-app-surface rounded-3xl border border-app-border p-6 mb-6 shadow-sm flex items-center gap-5 transition-colors">
        <div className="w-16 h-16 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center shrink-0">
          <CategoryIcon category="মোট ব্যয়" size={32} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-app-text-muted uppercase tracking-wider mb-1">{t('common.total_expenses')}</div>
          <div className="text-3xl font-black text-app-text-primary tracking-tight">{BDT(total, lang === 'bn')}</div>
        </div>
      </div>

      {prjExpenses.length === 0 ? (
        <div className="text-center py-16 bg-app-surface rounded-3xl border border-app-border text-app-text-muted font-bold text-sm">
          {t('common.no_expenses')}
        </div>
      ) : (
        <div className="space-y-3">
          {[...prjExpenses].sort((a, b) => b.date.localeCompare(a.date)).map((e: Expense) => {
            return (
              <motion.div 
                whileTap={{ scale: 0.98 }}
                key={e.id} 
                className="bg-app-surface rounded-2xl border border-app-border p-4 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-app-bg transition-colors"
                onClick={() => setSelExp(e)}
              >
                <div 
                  className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", CategoryColor(e.category))}
                >
                  <CategoryIcon category={e.category} size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-app-text-primary">{e.category}</div>
                  <div className="text-xs text-app-text-secondary font-medium mt-0.5 truncate">{e.description}</div>
                  <div className="text-[10px] text-app-text-muted mt-1">{e.date}</div>
                </div>
                <div className="text-base font-black shrink-0 text-app-text-primary">{BDT(e.amount, lang === 'bn')}</div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selExp && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[500] flex items-end sm:items-center justify-center backdrop-blur-sm p-4" onClick={() => setSelExp(null)}>
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-app-surface-elevated rounded-t-3xl sm:rounded-3xl w-full max-w-md p-8 pb-safe border border-app-border" 
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-app-border rounded-full mx-auto mb-8 sm:hidden" />
              
              <div className="flex items-center gap-5 mb-8">
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", CategoryColor(selExp.category))}>
                  <CategoryIcon category={selExp.category} size={32} />
                </div>
                <div>
                  <div className="text-xs font-bold text-app-text-muted uppercase tracking-widest mb-1">{selExp.category}</div>
                  <div className="text-2xl font-black text-app-text-primary leading-tight">{BDT(selExp.amount, lang === 'bn')}</div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="text-[10px] text-app-text-muted font-bold uppercase tracking-widest mb-2">{t('common.details')}</div>
                  <div className="text-sm font-bold text-app-text-secondary bg-app-bg p-4 rounded-2xl border border-app-border leading-relaxed">
                    {selExp.description || "—"}
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-4 border-t border-app-border">
                  <span className="text-xs font-bold text-app-text-muted uppercase tracking-widest">{t('modal.date')}</span>
                  <span className="text-sm font-black text-app-text-primary">{selExp.date}</span>
                </div>
              </div>

              <button 
                className="w-full bg-app-tab-active text-app-bg font-bold py-4 rounded-2xl hover:opacity-90 transition-colors mt-8 shadow-lg" 
                onClick={() => setSelExp(null)}
              >
                {t('project_modals.close')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
