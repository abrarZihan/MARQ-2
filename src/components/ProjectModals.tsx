import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BDT, dotJoin, uid, todayStr, numberToWords } from "../lib/utils";
import { FG, ConfirmDelete, PBar } from "./Shared";
import { EXP_CATS, LOGO_URL } from "../lib/data";
import { Trash2, Clock, Printer, FileText } from "lucide-react";
import { useLanguage } from "../lib/i18n";

export function CellPaySheet({ client, instDef, payments, project, isSuperAdmin, onSave, onDelete, onClose }: any) {
  const { t, lang } = useLanguage();
  const assignment = client.planAssignments?.find((pa: any) => pa.planId === instDef.planId);
  const shareCount = instDef.isGlobal ? 1 : (assignment ? assignment.shareCount : (client.shareCount || 1));
  const targetAmount = instDef.targetAmount * shareCount;
  const existPays = payments.filter((p: any) => p.clientId === client.id && p.instDefId === instDef.id);
  const approvedPays = existPays.filter((p: any) => p.status === "approved");
  const pendingPays = existPays.filter((p: any) => p.status === "pending");
  const paid = approvedPays.reduce((s: number, p: any) => s + p.amount, 0);
  const pending = pendingPays.reduce((s: number, p: any) => s + p.amount, 0);
  const rem = Math.max(0, targetAmount - (paid + pending));
  
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [delPay, setDelPay] = useState<any>(null);
  const [viewR, setViewR] = useState<any>(null);

  const submit = () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) { setErr(t("project_modals.enter_valid_amount")); return; }
    if (a > rem) { setErr(t("project_modals.max_amount", { amount: BDT(rem, lang === 'bn') })); return; }
    onSave({ id: uid("PAY-"), clientId: client.id, instDefId: instDef.id, amount: a, date, note, status: isSuperAdmin ? "approved" : "pending", approvedBy: null });
    onClose();
  };

  const hasMultiple = (client.planAssignments || []).length > 1 || (client.planAssignments || []).some((pa: any) => (pa.shareCount || 1) > 1);

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
          {instDef.isGlobal && hasMultiple && (
            <div className="mt-1 text-[10px] font-bold text-blue-500 uppercase tracking-tight">
              {t('common.global_payment_note')}
            </div>
          )}
        </div>
        
        <div className="bg-app-bg border border-app-border rounded-2xl p-4 mb-6 transition-colors">
          <PBar paid={paid} target={targetAmount} />
          {rem > 0 && <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-3">{t("project_modals.remaining", { amount: BDT(rem, lang === 'bn') })}</div>}
        </div>
        
        {approvedPays.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] text-app-text-muted font-bold uppercase tracking-wider mb-2">{t("project_modals.approved")}</div>
            {approvedPays.map((p: any) => (
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
            {pendingPays.map((p: any) => (
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

export function AddDefSheet({ projectId, planId, onSave, onClose }: any) {
  const { t, lang } = useLanguage();
  const [f, setF] = useState({ title: "", dueDate: "", targetAmount: "", isGlobal: false });
  const s = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  
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

        <div className="flex items-center gap-3 mb-6 p-3 bg-app-bg border border-app-border rounded-xl">
          <input 
            type="checkbox" id="isGlobal" className="w-5 h-5 rounded-lg border-app-border text-app-tab-active focus:ring-app-tab-active" 
            checked={f.isGlobal} onChange={e => s("isGlobal", e.target.checked)} 
          />
          <label htmlFor="isGlobal" className="text-sm font-bold text-app-text-primary cursor-pointer select-none">
            {lang === 'bn' ? "সবার জন্য এক (সব প্ল্যান ও শেয়ারে সমান)" : "Same for all (across plans and shares)"}
            <div className="text-[10px] text-app-text-muted font-medium mt-0.5">
              {lang === 'bn' ? "এটি সব প্ল্যানে একই থাকবে এবং শেয়ার সংখ্যা দিয়ে গুণ হবে না।" : "Shows same amount in all plans and doesn't multiply by share count."}
            </div>
          </label>
        </div>
        
        <div className="flex gap-3 mt-4">
          <button 
            className="flex-1 bg-app-tab-active text-app-bg font-bold py-3.5 rounded-xl hover:opacity-90 transition-colors" 
            onClick={() => {
              if (!f.title || !f.targetAmount) { alert(t("project_modals.add_inst_err")); return; }
              onSave({ id: uid("D-"), projectId, planId, title: f.title, dueDate: f.dueDate, targetAmount: parseFloat(f.targetAmount), isGlobal: f.isGlobal });
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

export function EditDefSheet({ def, onSave, onDelete, onClose }: any) {
  const { t, lang } = useLanguage();
  const [f, setF] = useState({ ...def, targetAmount: def.targetAmount.toString() });
  const s = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
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

        <div className="flex items-center gap-3 mb-6 p-3 bg-app-bg border border-app-border rounded-xl">
          <input 
            type="checkbox" id="isGlobalEdit" className="w-5 h-5 rounded-lg border-app-border text-app-tab-active focus:ring-app-tab-active" 
            checked={f.isGlobal} onChange={e => s("isGlobal", e.target.checked)} 
          />
          <label htmlFor="isGlobalEdit" className="text-sm font-bold text-app-text-primary cursor-pointer select-none">
            {lang === 'bn' ? "সবার জন্য এক (সব প্ল্যান ও শেয়ারে সমান)" : "Same for all (across plans and shares)"}
          </label>
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
            onConfirm={() => { onDelete(def.id); onClose(); }}
            onClose={() => setShowConfirm(false)}
          />
        )}
      </motion.div>
    </div>
  );
}

export function AddExpSheet({ projectId, expense, onSave, onClose }: any) {
  const { t, lang } = useLanguage();
  const [f, setF] = useState(expense ? { ...expense } : { category: "", description: "", amount: expense?.amount?.toString() || "", date: todayStr() });
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

export function ReceiptSheet({ payment, instDef, client, project, hideOfficeCopy, isSuperAdmin, onDelete, onClose }: any) {
  const { t, lang } = useLanguage();
  const [showConfirm, setShowConfirm] = useState(false);
  
  const ReceiptContent = ({ type }: { type: string }) => (
    <div className="receipt-paper relative p-10 font-sans border-b border-dashed last:border-0 print:border-b-0 print:h-[50vh] flex flex-col min-w-[850px] print:min-w-0 overflow-hidden">
      {/* Header */}
      {/* Logo in top-left corner */}
      <div className="absolute top-6 left-10">
        <img 
          src={LOGO_URL} 
          alt="Logo" 
          className="h-20 w-auto object-contain"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="flex flex-col items-center mb-6 w-full">
        <h1 className="text-3xl font-black text-[#0f172a] tracking-tight">MARQ BUILDERS</h1>
        <p className="text-[11px] font-bold text-slate-800 mt-2 text-center w-full">
          216/8, Baganbari, North Vasantek Dhaka Cantt, Dhaka- 1206
        </p>
      </div>

      {/* Copy Badge */}
      <div className="absolute top-8 right-8">
        <span className="bg-[#5c5fc8] text-white text-[10px] font-bold px-4 py-1 rounded-md shadow-sm">
          {type} Copy
        </span>
      </div>

      {/* Sl No & Date */}
      <div className="flex justify-between text-[13px] font-bold mb-6 px-2">
        <div className="flex items-baseline gap-1">
          <span>Sl. No.</span>
          <span className="receipt-border-bottom min-w-[120px] px-2 text-center">
            {payment?.id ? (payment.id.split('-')[1] || payment.id) : ""}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span>Date:</span>
          <span className="receipt-border-bottom min-w-[180px] px-2 text-center">
            {payment.date}
          </span>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <span className="bg-[#5c5fc8] text-white px-12 py-2 rounded-lg font-bold text-sm uppercase tracking-wider shadow-sm">
          Money Receipt
        </span>
      </div>

      {/* Fields */}
      <div className="space-y-5 text-[13px] px-2">
        <div className="flex gap-8">
          <div className="flex-1 flex items-baseline gap-2">
            <span className="whitespace-nowrap font-bold">Name:</span>
            <span className="flex-1 receipt-border-bottom px-2 font-bold">{client?.name}</span>
          </div>
          <div className="w-[280px] flex items-baseline gap-2">
            <span className="whitespace-nowrap font-bold">Customer ID:</span>
            <span className="flex-1 receipt-border-bottom px-2 font-bold">{client?.id}</span>
          </div>
        </div>

        <div className="flex gap-8">
          <div className="flex-1 flex items-baseline gap-2">
            <span className="whitespace-nowrap font-bold">Project Name:</span>
            <span className="flex-1 receipt-border-bottom px-2 font-bold">{project?.name || "N/A"}</span>
          </div>
          <div className="w-[280px] flex items-baseline gap-2">
            <span className="whitespace-nowrap font-bold">Instalment No.:</span>
            <span className="flex-1 receipt-border-bottom px-2 font-bold">
              {instDef?.title}
              {instDef?.isGlobal && (
                <span className="ml-2 text-[9px] font-bold text-blue-600 uppercase tracking-tight print:text-black">
                  {t('common.global_payment_note')}
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="whitespace-nowrap font-bold">Amount =</span>
          <span className="flex-1 receipt-border-bottom px-2 font-black text-base">{payment.amount.toLocaleString()}/-</span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="whitespace-nowrap font-bold">Amount in word:</span>
          <span className="flex-1 receipt-border-bottom px-2 font-bold">{numberToWords(payment.amount)} TK</span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="whitespace-nowrap font-bold">Deposit By:</span>
          <span className="flex-1 receipt-border-bottom px-2 font-bold">Cash/Cheque/Bank</span>
        </div>
      </div>

      {/* Footer Signatures */}
      <div className="flex justify-between mt-24 px-4 text-[11px] font-bold text-center">
        <div className="w-48 receipt-border-top pt-1.5">Prepared By</div>
        <div className="w-48 receipt-border-top pt-1.5">Accounts Officer</div>
        <div className="w-48 receipt-border-top pt-1.5">Authorised Signature</div>
      </div>

      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none -z-10">
        <div className="flex flex-col items-center gap-4 rotate-[-15deg]">
          <img 
            src={LOGO_URL} 
            alt="" 
            className="w-[350px] h-auto object-contain grayscale" 
            referrerPolicy="no-referrer"
          />
          <div className="text-[80px] font-black whitespace-nowrap">MARQ BUILDERS</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[400] flex items-center justify-center backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none bg-app-surface border border-app-border" 
        onClick={e => e.stopPropagation()}
      >
        <div className="max-h-[85vh] overflow-auto print:max-h-none print:overflow-visible relative">
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
              message={t("project_modals.confirm_delete_receipt") || "Are you sure you want to delete this payment receipt? This will remove the payment record permanently."}
              onConfirm={() => { onDelete(payment.id); onClose(); }}
              onClose={() => setShowConfirm(false)}
            />
          )}

          <ReceiptContent type="Customer" />
          {!hideOfficeCopy && (
            <>
              <div className="h-px border-b border-dashed border-slate-300 print:my-4" />
              <ReceiptContent type="Office" />
            </>
          )}
        </div>
        
        <div className="receipt-footer-bar p-6 flex gap-3 no-print">
          <button 
            className="flex-1 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-colors flex items-center justify-center gap-2" 
            style={{ backgroundColor: '#5c5fc8', color: 'white' }}
            onClick={() => window.print()}
          >
            <Printer size={18} /> {t("project_modals.print")}
          </button>
          <button className="flex-1 bg-app-bg text-app-text-secondary font-bold py-3.5 rounded-xl hover:bg-app-border transition-colors border border-app-border" onClick={onClose}>
            {t("project_modals.close")}
          </button>
        </div>
      </motion.div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:max-h-none, .print\\:max-h-none * { visibility: visible; }
          .print\\:max-h-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
