import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { BDT, uid, cn, tsNow } from "../../../lib/utils";
import { ConfirmDelete, CategoryIcon, CategoryColor } from "../../../components/Shared";
import { AddExpSheet } from "../../../components/ProjectModals";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useLanguage } from "../../../lib/i18n";
import { useAppStore } from "../../../store/appStore";
import { db, handleFirestoreError, OperationType } from "../../../firebase";
import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { Expense } from "../../../types";

const EXPENSE_FIELDS = ['id', 'projectId', 'category', 'amount', 'date', 'description'];

const sanitize = (data: Record<string, any>, allowedFields: string[]) => {
  const clean: Record<string, any> = {};
  allowedFields.forEach(f => {
    if (data[f] !== undefined) clean[f] = data[f];
  });
  return clean;
};

import { useActions } from "../../../hooks/useActions";

export default function ExpensesTab({ projectId }: { projectId: string }) {
  const { t } = useLanguage();
  const { expenses, auth, setToast } = useAppStore();
  const actions = useActions();
  
  const prjExpenses = expenses.filter((e: Expense) => e.projectId === projectId);
  const totalExpense = prjExpenses.reduce((s: number, e: Expense) => s + e.amount, 0);

  const [addExpModal, setAddExpModal] = useState(false);
  const [editExpModal, setEditExpModal] = useState<Expense | null>(null);
  const [delExp, setDelExp] = useState<Expense | null>(null);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-app-surface rounded-3xl border border-app-border p-6 flex flex-col sm:flex-row sm:items-center gap-5 mb-6 shadow-sm">
        <div className="flex items-center gap-5 flex-1 min-w-0">
          <div className="w-16 h-16 bg-rose-500/20 text-rose-700 dark:text-rose-400 rounded-2xl flex items-center justify-center shrink-0 border border-rose-500/30">
            <CategoryIcon category="মোট ব্যয়" size={32} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-app-text-secondary uppercase tracking-wider mb-1">{t("project_detail.total_expense")}</div>
            <div className="text-2xl sm:text-3xl font-black text-app-text-primary tracking-tight break-words">
              {BDT(totalExpense)}
            </div>
          </div>
        </div>
        <button 
          className="w-full sm:w-auto bg-app-tab-active text-app-bg px-5 py-3.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-sm flex items-center justify-center gap-2 shrink-0" 
          onClick={() => setAddExpModal(true)}
        >
          <Plus size={18} /> {t("project_detail.new_expense")}
        </button>
      </div>
      
      {prjExpenses.length === 0 ? (
        <div className="text-center py-12 bg-app-surface rounded-3xl border border-app-border text-app-text-muted font-bold text-sm">
          {t("project_detail.no_expenses") || "No expenses recorded for this project"}
        </div>
      ) : (
        <div className="space-y-3">
          {[...prjExpenses].sort((a: Expense, b: Expense) => b.date.localeCompare(a.date)).map((e: Expense, i: number) => (
            <div key={`${e.id}-${i}`} className="bg-app-surface rounded-2xl border border-app-border p-4 shadow-sm flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border", CategoryColor(e.category))}>
                <CategoryIcon category={e.category} size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-app-text-primary">{e.category}</div>
                <div className="text-xs text-app-text-secondary font-medium mt-0.5 truncate">{e.description}</div>
                <div className="text-[10px] text-app-text-muted mt-1">{e.date}</div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="text-base font-black text-app-text-primary">{BDT(e.amount)}</div>
                <div className="flex gap-2">
                  <button 
                    className="w-8 h-8 bg-app-bg text-app-text-secondary rounded-lg flex items-center justify-center hover:bg-app-border transition-colors border border-app-border" 
                    onClick={() => setEditExpModal(e)}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    className="w-8 h-8 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center hover:bg-rose-500/20 transition-colors border border-rose-500/20" 
                    onClick={() => setDelExp(e)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {addExpModal && <AddExpSheet projectId={projectId} onSave={(e: Expense) => { actions.addExpense(e); setAddExpModal(false); }} onClose={() => setAddExpModal(false)} />}
        {editExpModal && <AddExpSheet projectId={projectId} expense={editExpModal} onSave={(e: Expense) => { actions.updateExpense(e); setEditExpModal(null); }} onClose={() => setEditExpModal(null)} />}
        {delExp && <ConfirmDelete message={<><b>{delExp.category}</b> — {BDT(delExp.amount)}{t("project_detail.will_be_deleted")}</>} onConfirm={() => { actions.deleteExpense(delExp.id); setDelExp(null); }} onClose={() => setDelExp(null)} />}
      </AnimatePresence>
    </div>
  );
}
