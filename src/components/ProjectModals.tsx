import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BDT, dotJoin, uid, todayStr, numberToWords } from "../lib/utils";
import { FG, ConfirmDelete, PBar } from "./Shared";
import { EXP_CATS, LOGO_URL } from "../lib/data";
import { Trash2, Clock, Printer, FileText } from "lucide-react";
import { useLanguage } from "../lib/i18n";
import { Client, InstDef, Payment, Project, Expense } from "../types";

export function CellPaySheet({ client, instDef, payments, project, isSuperAdmin, onSave, onDelete, onClose }: {
  client: Client;
  instDef: InstDef;
  payments: Payment[];
  project: Project;
  isSuperAdmin: boolean;
  onSave: (p: Payment) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const { t, lang } = useLanguage();
  const assignment = client.planAssignments?.find(pa => pa.planId === instDef.planId);
  const shareCount = assignment ? (assignment.shareCount || 1) : (client.shareCount || 1);
  const targetAmount = instDef.targetAmount * shareCount;
  const existPays = payments.filter(p => p.clientId === client.id && p.instDefId === instDef.id);
  const approvedPays = existPays.filter(p => p.status === "approved");
  const pendingPays = existPays.filter(p => p.status === "pending");
  const paid = approvedPays.reduce((s: number, p: Payment) => s + p.amount, 0);
  const pending = pendingPays.reduce((s: number, p: Payment) => s + p.amount, 0);
  const rem = Math.max(0, targetAmount - (paid + pending));
  
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [delPay, setDelPay] = useState<Payment | null>(null);
  const [viewR, setViewR] = useState<Payment | null>(null);

  const submit = () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) { setErr(t("project_modals.enter_valid_amount")); return; }
    if (a > rem) { setErr(t("project_modals.max_amount", { amount: BDT(rem, lang === 'bn') })); return; }
    onSave({ id: uid("PAY-"), clientId: client.id, instDefId: instDef.id, amount: a, date, note, status: isSuperAdmin ? "approved" : "pending", approvedBy: null });
    onClose();
  };

  const hasMultiple = (client.planAssignments || []).length > 1 || (client.planAssignments || []).some(pa => (pa.shareCount || 1) > 1);

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[400] flex items-end sm:items-center justify-center backdrop-blur-sm transition-colors" onClick={onClose}>
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-app-surface-elevated rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 pb-safe max-h-[90vh] overflow-y-auto border border-app-border transition-colors" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-app-border rounded-full mx-auto mb-6 sm:hidden" />
        <div className="text-xl font-black text-app-text-primary">{t("project_modals.payment_record")}</div>
        <div className="text-xs font-bold text-app-text-secondary mt-1 mb-6">
          {dotJoin(client.name, client.plot, instDef.title)} 
          {shareCount > 1 && <span className="text-blue-600 dark:text-blue-400 ml-1">({shareCount} {t("client_info.shares")})</span>}
        </div>
        
        <div className="bg-app-bg border border-app-border rounded-2xl p-4 mb-6 transition-colors">
          <PBar paid={paid} target={targetAmount} />
          {rem > 0 && <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-3">{t("project_modals.remaining", { amount: BDT(rem, lang === 'bn') })}</div>}
        </div>
        
        {approvedPays.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] text-app-text-muted font-bold uppercase tracking-wider mb-2">{t("project_modals.approved")}</div>
            {approvedPays.map((p: Payment) => (
              <div key={p.id} className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-2 transition-colors">
                <span className="text-xs font-medium text-app-text-secondary">{dotJoin(p.date, p.note)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mr-1">{BDT(p.amount, lang === 'bn')}</span>
                  <button className="w-7 h-7 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center hover:bg-blue-500/20 transition-colors border border-blue-500/20" onClick={() => setViewR(p)}><FileText size={14} /></button>
                  {isSuperAdmin && (
                    <button className="w-7 h-7 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center hover:bg-rose-500/20 transition-colors border border-rose-500/20" onClick={() => setDelPay(p)}><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {pendingPays.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] text-app-text-muted font-bold uppercase tracking-wider mb-2">{t("project_modals.pending_approval")}</div>
            {pendingPays.map((p: Payment) => (
              <div key={p.id} className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-2 transition-colors">
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5"><Clock size={12} /> {dotJoin(p.date, p.note)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-amber-600 dark:text-amber-500">{BDT(p.amount, lang === 'bn')}</span>
                  {isSuperAdmin && (
                    <button className="w-7 h-7 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center hover:bg-rose-500/20 transition-colors border border-rose-500/20" onClick={() => setDelPay(p)}><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {rem > 0 ? (
          <>
            <FG label={`${t("project_modals.amount_bdt")}${!isSuperAdmin ? t("project_modals.super_admin_approve") : ""}`}>
              <input 
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all font-bold text-app-text-primary" 
                type="number" inputMode="numeric" placeholder={t("project_modals.max_placeholder", { amount: rem.toString() })} 
                value={amount} onChange={e => { setAmount(e.target.value); setErr(""); }} 
              />
            </FG>
            {!isSuperAdmin && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 -mt-2 mb-4 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 transition-colors">
                <Clock size={14} /> {t("project_modals.pending_msg")}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <FG label={t("project_modals.date")}><input className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all font-bold text-app-text-primary" type="date" value={date} onChange={e => setDate(e.target.value)} /></FG>
              <FG label={t("project_modals.note")}><input className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all font-bold text-app-text-primary" placeholder={t("project_modals.optional")} value={note} onChange={e => setNote(e.target.value)} /></FG>
            </div>
            
            <AnimatePresence>
              {err && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <div className="text-app-error-text text-sm font-bold mb-4 bg-app-error-bg p-3 rounded-xl border border-app-error-text/10">{err}</div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex gap-3 mt-2">
              <button className="flex-1 bg-app-tab-active text-app-bg font-bold py-3.5 rounded-xl hover:opacity-90 transition-colors" onClick={submit}>{isSuperAdmin ? t("project_modals.save_btn") : t("project_modals.submit_for_approval")}</button>
              <button className="flex-1 bg-app-bg text-app-text-secondary font-bold py-3.5 rounded-xl hover:bg-app-border transition-colors border border-app-border" onClick={onClose}>{t("project_modals.cancel")}</button>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-emerald-600 dark:text-emerald-400 font-black bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
            {t("project_modals.fully_paid")}
          </div>
        )}
        
        <AnimatePresence>
          {delPay && (
            <ConfirmDelete 
              message={<><b>{BDT(delPay.amount, lang === 'bn')}</b> ({delPay.date}){t("project_modals.will_be_deleted")}</>} 
              onConfirm={() => { onDelete(delPay.id); setDelPay(null); }} 
              onClose={() => setDelPay(null)} 
            />
          )}
          {viewR && (
            <ReceiptSheet 
              payment={viewR} 
              instDef={instDef} 
              client={client} 
              project={project} 
              isSuperAdmin={isSuperAdmin}
              onDelete={onDelete}
              onClose={() => setViewR(null)} 
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export function AddDefSheet({ projectId, planId, onSave, onClose }: {
  projectId: string;
  planId: string;
  onSave: (d: InstDef) => void;
  onClose: () => void;
}) {
  const { t, lang } = useLanguage();
  const [f, setF] = useState({ title: "", dueDate: "", targetAmount: "" });
  const s = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[400] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-app-surface-elevated rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 pb-safe border border-app-border" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-app-border rounded-full mx-auto mb-6 sm:hidden" />
        <div className="text-xl font-black text-app-text-primary mb-6">{t("project_modals.new_installment_col")}</div>
        
        <FG label={t("project_modals.inst_name")}>
          <input className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all font-bold text-app-text-primary" placeholder={t("project_modals.inst_name_ph")} value={f.title} onChange={e => s("title", e.target.value)} />
        </FG>
        <div className="grid grid-cols-2 gap-4">
          <FG label={t("project_modals.target_bdt")}><input className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all font-bold text-app-text-primary" type="number" value={f.targetAmount} onChange={e => s("targetAmount", e.target.value)} /></FG>
          <FG label={t("project_modals.due_date")}><input className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all font-bold text-app-text-primary" type="date" value={f.dueDate} onChange={e => s("dueDate", e.target.value)} /></FG>
        </div>
        
        <div className="flex gap-3 mt-4">
          <button 
            className="flex-1 bg-app-tab-active text-app-bg font-bold py-3.5 rounded-xl hover:opacity-90 transition-colors" 
            onClick={() => {
              if (!f.title || !f.targetAmount) { alert(t("project_modals.add_inst_err")); return; }
              onSave({ id: uid("D-"), projectId, planId, title: f.title, dueDate: f.dueDate, targetAmount: parseFloat(f.targetAmount) });
              onClose();
            }}
          >
            {t("project_modals.add")}
          </button>
          <button className="flex-1 bg-app-bg text-app-text-secondary font-bold py-3.5 rounded-xl hover:bg-app-border transition-colors border border-app-border" onClick={onClose}>{t("project_modals.cancel")}</button>
        </div>
      </motion.div>
    </div>
  );
}

export function EditDefSheet({ def, onSave, onDelete, onClose }: {
  def: InstDef;
  onSave: (d: InstDef) => void;
  onDelete: (id: string, planId: string) => void;
  onClose: () => void;
}) {
  const { t, lang } = useLanguage();
  const [f, setF] = useState({ ...def, targetAmount: def.targetAmount.toString() });
  const s = (k: string, v: string | boolean) => setF(p => ({ ...p, [k]: v }));
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[400] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-app-surface-elevated rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 pb-safe border border-app-border" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-app-border rounded-full mx-auto mb-6 sm:hidden" />
        <div className="text-xl font-black text-app-text-primary mb-6">{lang === 'bn' ? "কিস্তি এডিট" : "Edit Installment"}</div>
        
        <FG label={t("project_modals.inst_name")}>
          <input className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all font-bold text-app-text-primary" placeholder={t("project_modals.inst_name_ph")} value={f.title} onChange={e => s("title", e.target.value)} />
        </FG>
        <div className="grid grid-cols-2 gap-4">
          <FG label={t("project_modals.target_bdt")}><input className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all font-bold text-app-text-primary" type="number" value={f.targetAmount} onChange={e => s("targetAmount", e.target.value)} /></FG>
          <FG label={t("project_modals.due_date")}><input className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all font-bold text-app-text-primary" type="date" value={f.dueDate} onChange={e => s("dueDate", e.target.value)} /></FG>
        </div>

        <div className="flex flex-col gap-3 mt-4">
          <div className="flex gap-3">
            <button 
              className="flex-1 bg-app-tab-active text-app-bg font-bold py-3.5 rounded-xl hover:opacity-90 transition-colors" 
              onClick={() => {
                if (!f.title || !f.targetAmount) { alert(t("project_modals.add_inst_err")); return; }
                onSave({ ...f, targetAmount: parseFloat(f.targetAmount) });
                onClose();
              }}
            >
              {t("modal.update")}
            </button>
            <button className="flex-1 bg-app-bg text-app-text-secondary font-bold py-3.5 rounded-xl hover:bg-app-border transition-colors border border-app-border" onClick={onClose}>{t("project_modals.cancel")}</button>
          </div>
          <button 
            className="w-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold py-3 rounded-xl hover:bg-rose-500/20 transition-colors border border-rose-500/20 flex items-center justify-center gap-2"
            onClick={() => setShowConfirm(true)}
          >
            <Trash2 size={16} /> {t("project_detail.delete")}
          </button>
        </div>

        {showConfirm && (
          <ConfirmDelete 
            message={lang === 'bn' ? "এই কিস্তি কলামটি মুছে ফেলবেন? এর সব পেমেন্ট রেকর্ডও মুছে যাবে।" : "Delete this installment column? All associated payment records will also be deleted."}
            onConfirm={() => { onDelete(def.id, def.planId); onClose(); }}
            onClose={() => setShowConfirm(false)}
          />
        )}
      </motion.div>
    </div>
  );
}

export function AddExpSheet({ projectId, expense, onSave, onClose }: {
  projectId: string;
  expense?: Expense | null;
  onSave: (e: Expense) => void;
  onClose: () => void;
}) {
  const { t, lang } = useLanguage();
  const [f, setF] = useState(expense ? { ...expense, amount: expense.amount.toString() } : { category: "", description: "", amount: "", date: todayStr() });
  const s = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[400] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-app-surface-elevated rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 pb-safe border border-app-border" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-app-border rounded-full mx-auto mb-6 sm:hidden" />
        <div className="text-xl font-black text-app-text-primary mb-6">{expense ? t("modal.edit_expense") : t("project_modals.expense_add")}</div>
        
        <FG label={t("project_modals.category")}>
          <select className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all font-bold appearance-none text-app-text-primary" value={f.category} onChange={e => s("category", e.target.value)}>
            <option value="">{t("project_modals.select")}</option>
            {EXP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FG>
        <FG label={t("project_modals.description")}><input className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all font-bold text-app-text-primary" value={f.description} onChange={e => s("description", e.target.value)} /></FG>
        <div className="grid grid-cols-2 gap-4">
          <FG label={t("project_modals.amount_bdt_simple")}><input className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all font-bold text-app-text-primary" type="number" value={f.amount} onChange={e => s("amount", e.target.value)} /></FG>
          <FG label={t("project_modals.date")}><input className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all font-bold text-app-text-primary" type="date" value={f.date} onChange={e => s("date", e.target.value)} /></FG>
        </div>
        
        <div className="flex gap-3 mt-4">
          <button 
            className="flex-1 bg-app-tab-active text-app-bg font-bold py-3.5 rounded-xl hover:opacity-90 transition-colors" 
            onClick={() => {
              if (!f.category || !f.amount) { alert(t("project_modals.expense_add_err")); return; }
              onSave({ id: expense?.id || uid("EX-"), projectId, ...f, amount: parseFloat(f.amount) });
              onClose();
            }}
          >
            {expense ? t("modal.update") : t("project_modals.add")}
          </button>
          <button className="flex-1 bg-app-bg text-app-text-secondary font-bold py-3.5 rounded-xl hover:bg-app-border transition-colors border border-app-border" onClick={onClose}>{t("project_modals.cancel")}</button>
        </div>
      </motion.div>
    </div>
  );
}

export function ReceiptSheet({ payment, instDef, client, project, isSuperAdmin, onDelete, onClose }: {
  payment: Payment;
  instDef?: InstDef;
  client?: Client;
  project?: Project;
  isSuperAdmin: boolean;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const { t, lang } = useLanguage();
  const [showConfirm, setShowConfirm] = useState(false);
  
  const ReceiptContent = ({ type }: { type: string }) => (
    <div className="receipt-paper relative p-8 font-sans flex flex-col overflow-hidden bg-white text-slate-900 transition-colors">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-4 items-center">
          <img 
            src={LOGO_URL} 
            alt="Logo" 
            className="h-14 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none uppercase">MARQ BUILDERS</h1>
            <p className="text-[9px] font-bold text-slate-600 mt-1 uppercase">
              216/8, Baganbari, North Vasantek Dhaka Cantt, Dhaka- 1206
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="bg-[#5c5fc8] text-white text-[9px] font-bold px-3 py-1 rounded shadow-sm uppercase tracking-wider">
            {type} Copy
          </span>
          <div className="text-[11px] font-bold text-slate-700 flex gap-2">
            <span>Date:</span>
            <span className="border-b border-slate-300 min-w-[100px] text-center">{payment.date}</span>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-4">
        <span className="bg-[#5c5fc8] text-white px-10 py-1.5 rounded font-black text-xs uppercase tracking-[0.2em] shadow-sm">
          Money Receipt
        </span>
      </div>

      {/* Sl No */}
      <div className="flex justify-between text-[11px] font-bold mb-4 uppercase">
        <div className="flex items-baseline gap-1">
          <span className="text-slate-500">Sl. No.</span>
          <span className="border-b border-slate-300 min-w-[80px] px-2 text-center text-slate-900">
            {payment?.id ? (payment.id.split('-')[1] || payment.id) : ""}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-slate-500">Customer ID:</span>
          <span className="border-b border-slate-300 min-w-[80px] px-2 text-center text-slate-900">{client?.id}</span>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4 text-[12px] flex-1">
        <div className="flex gap-6">
          <div className="flex-1 flex items-baseline gap-2">
            <span className="whitespace-nowrap font-bold text-slate-500 uppercase text-[10px]">Name:</span>
            <span className="flex-1 border-b border-slate-200 px-2 font-black text-slate-900">{client?.name}</span>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex-1 flex items-baseline gap-2">
            <span className="whitespace-nowrap font-bold text-slate-500 uppercase text-[10px]">Project:</span>
            <span className="flex-1 border-b border-slate-200 px-2 font-bold text-slate-900">{project?.name || "N/A"}</span>
          </div>
          <div className="w-[40%] flex items-baseline gap-2">
            <span className="whitespace-nowrap font-bold text-slate-500 uppercase text-[10px]">Plot/Flat:</span>
            <span className="flex-1 border-b border-slate-200 px-2 font-bold text-slate-900">{client?.plot}</span>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex-1 flex items-baseline gap-2">
            <span className="whitespace-nowrap font-bold text-slate-500 uppercase text-[10px]">Instalment:</span>
            <span className="flex-1 border-b border-slate-200 px-2 font-bold text-slate-900">{instDef?.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
          <span className="whitespace-nowrap font-black text-slate-500 uppercase text-[10px]">Amount:</span>
          <span className="flex-1 font-black text-lg text-slate-900">৳ {payment.amount.toLocaleString()}/-</span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="whitespace-nowrap font-bold text-slate-500 uppercase text-[10px]">In Words:</span>
          <span className="flex-1 border-b border-slate-200 px-2 font-bold italic text-slate-700 capitalize">{numberToWords(payment.amount)} Taka Only</span>
        </div>
      </div>

      {/* Footer Signatures */}
      <div className="flex justify-between mt-12 px-2 text-[9px] font-bold text-center text-slate-600 uppercase">
        <div className="w-32 border-t border-slate-400 pt-1">Client Signature</div>
        <div className="w-32 border-t border-slate-400 pt-1">Accounts Officer</div>
        <div className="w-32 border-t border-slate-400 pt-1">Authorized</div>
      </div>

      {/* Watermark Logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none -z-10">
        <img 
          src={LOGO_URL} 
          alt="" 
          className="w-[200px] h-auto object-contain grayscale" 
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[400] flex items-center justify-center backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none bg-white border border-app-border transition-colors no-scrollbar" 
        onClick={e => e.stopPropagation()}
      >
        <div className="receipt-print-container max-h-[85vh] overflow-auto print:max-h-none print:overflow-visible relative bg-white">
          {isSuperAdmin && onDelete && (
            <button 
              className="absolute top-4 right-4 z-50 w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors no-print"
              onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
              title="Delete Receipt"
            >
              <Trash2 size={20} />
            </button>
          )}

          {showConfirm && (
            <ConfirmDelete 
              message={t("project_modals.confirm_delete_receipt") || "Are you sure you want to delete this payment receipt?"}
              onConfirm={() => { onDelete(payment.id); onClose(); }}
              onClose={() => setShowConfirm(false)}
            />
          )}

          <div className="receipt-print-wrapper flex flex-col h-full w-full">
            <ReceiptContent type="Customer" />
            <div className="print:hidden border-b-2 border-dashed border-slate-300 my-2" />
            <div className="hidden print:block border-t-2 border-dashed border-slate-400 my-0 py-0 h-0" />
            <ReceiptContent type="Office" />
          </div>
        </div>
        
        <div className="receipt-footer-bar p-6 flex gap-3 no-print bg-slate-50 border-t border-slate-100">
          <button 
            className="flex-3 text-white font-black py-4 rounded-xl hover:opacity-95 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-[0.98]" 
            style={{ backgroundColor: '#5c5fc8' }}
            onClick={() => window.print()}
          >
            <Printer size={20} /> {t("project_modals.print_receipt") || "Print Receipt"}
          </button>
          <button className="flex-1 bg-white text-slate-600 font-bold py-4 rounded-xl hover:bg-slate-50 transition-colors border border-slate-200" onClick={onClose}>
            {t("project_modals.close")}
          </button>
        </div>
      </motion.div>

      <style>{`
        @media print {
          @page { 
            margin: 0 !important;
            size: portrait; 
          }
          
          /* Hide everything except the receipt container */
          body * { visibility: hidden !important; }
          .no-scrollbar { overflow: hidden !important; }
          
          .receipt-print-container, 
          .receipt-print-container * { 
            visibility: visible !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Force container to occupy exactly one screen height to prevent 2nd page spill */
          .receipt-print-container {
            position: absolute !important;
            left: 0 !important; 
            top: 0 !important;
            width: 100% !important;
            height: 100vh !important;
            padding: 0.8cm !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
            background: white !important;
          }

          .receipt-print-wrapper {
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
            width: 100% !important;
            gap: 0.5cm !important;
          }

          /* Force Background Colors (for "Money Receipt" banner) */
          .receipt-paper [class*="bg-[#5c5fc8]"] {
            background-color: #5c5fc8 !important;
            -webkit-print-color-adjust: exact !important;
            box-shadow: inset 0 0 0 1000px #5c5fc8 !important; 
            color: white !important;
          }

          /* Partitioning */
          .receipt-paper {
            flex: 1 !important;
            max-height: 47% !important;
            page-break-inside: avoid !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
            margin-bottom: 0px !important;
            padding: 0.5cm !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
          }
          
          .receipt-paper:first-of-type {
            border-bottom: 2px dashed #cbd5e1 !important;
            margin-bottom: 0.5cm !important;
          }

          /* Dimension Scaling */
          .receipt-paper h1 { font-size: 1.25rem !important; }
          .receipt-paper .text-lg { font-size: 1.1rem !important; }
          .receipt-paper .text-[12px] { font-size: 11px !important; }
          .receipt-paper .text-[10px] { font-size: 9px !important; }
          .receipt-paper .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.4rem !important; }
          .receipt-paper .mt-12 { margin-top: 1.5rem !important; }
          .receipt-paper .mb-4 { margin-bottom: 0.5rem !important; }

          .no-print { display: none !important; }
        }
        
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
