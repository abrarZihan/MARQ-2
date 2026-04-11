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

const EXPENSE_FIELDS = ['id', 'projectId', 'category', 'amount', 'date', 'description'];

const sanitize = (data: any, allowedFields: string[]) => {
  const clean: any = {};
  allowedFields.forEach(f => {
    if (data[f] !== undefined) clean[f] = data[f];
  });
  return clean;
};

export default function ExpensesTab({ projectId }: { projectId: string }) {
  const { t } = useLanguage();
  const { expenses, auth, setToast } = useAppStore();
  
  const adminUser = auth?.user;
  const prjExpenses = expenses.filter((e: any) => e.projectId === projectId);
  const totalExpense = prjExpenses.reduce((s: number, e: any) => s + e.amount, 0);

  const [addExpModal, setAddExpModal] = useState(false);
  const [editExpModal, setEditExpModal] = useState<any>(null);
  const [delExp, setDelExp] = useState<any>(null);

  const showToast = (m: string, t: 's' | 'e' = 's') => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 3000);
  };

  const addLog = async (action: string, target: any, detail: any) => {
    if (!adminUser) return;
    const sTarget = typeof target === 'object' ? JSON.stringify(target) : String(target || "");
    const sDetail = typeof detail === 'object' ? JSON.stringify(detail) : String(detail || "");
    const newLog = { id: uid("LOG"), adminId: adminUser.id, adminName: adminUser.name, action, target: sTarget, detail: sDetail, projectId, ts: tsNow() };
    try {
      await setDoc(doc(db, "logs", newLog.id), newLog);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `logs/${newLog.id}`);
    }
  };

  const onAddExpense = async (e: any) => {
    try {
      const clean = sanitize(e, EXPENSE_FIELDS);
      await setDoc(doc(db, "expenses", clean.id), clean);
      addLog("expense_add", clean.category, `${BDT(clean.amount)} — ${clean.description}`);
      showToast(t("common.success_saved"));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `expenses/${e.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const onUpdateExpense = async (e: any) => {
    try {
      const clean = sanitize(e, EXPENSE_FIELDS);
      await updateDoc(doc(db, "expenses", clean.id), clean);
      addLog("expense_edit", clean.category, `${BDT(clean.amount)} — ${clean.description}`);
      showToast(t("common.success_saved"));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `expenses/${e.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const onDeleteExpense = async (id: string) => {
    const e = expenses.find(x => x.id === id);
    try {
      await deleteDoc(doc(db, "expenses", id));
      if (e) addLog("expense_delete", e.category, `${BDT(e.amount)} — ${e.description}`);
      showToast(t("common.success_deleted"));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

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
          {[...prjExpenses].sort((a, b) => b.date.localeCompare(a.date)).map((e: any, i: number) => (
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
        {addExpModal && <AddExpSheet projectId={projectId} onSave={(e: any) => { onAddExpense(e); setAddExpModal(false); }} onClose={() => setAddExpModal(false)} />}
        {editExpModal && <AddExpSheet projectId={projectId} expense={editExpModal} onSave={(e: any) => { onUpdateExpense(e); setEditExpModal(null); }} onClose={() => setEditExpModal(null)} />}
        {delExp && <ConfirmDelete message={<><b>{delExp.category}</b> — {BDT(delExp.amount)}{t("project_detail.will_be_deleted")}</>} onConfirm={() => { onDeleteExpense(delExp.id); setDelExp(null); }} onClose={() => setDelExp(null)} />}
      </AnimatePresence>
    </div>
  );
}
