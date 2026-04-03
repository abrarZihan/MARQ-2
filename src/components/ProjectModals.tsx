import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BDT, dotJoin, uid, todayStr, numberToWords } from "../lib/utils";
import { FG, ConfirmDelete, PBar } from "./Shared";
import { EXP_CATS, LOGO_URL } from "../lib/data";
import { Trash2, Clock, Printer, FileText } from "lucide-react";
import { useLanguage } from "../lib/i18n";

export function CellPaySheet({ client, instDef, payments, project, isSuperAdmin, onSave, onDelete, onClose }: any) {
  const { t } = useLanguage();
  const assignment = client.planAssignments?.find((pa: any) => pa.planId === instDef.planId);
  const shareCount = assignment ? assignment.shareCount : (client.shareCount || 1);
  const targetAmount = instDef.targetAmount * shareCount;
  const existPays = payments.filter((p: any) => p.clientId === client.id && p.instDefId === instDef.id);
  const approvedPays = existPays.filter((p: any) => p.status === "approved");
  const pendingPays = existPays.filter((p: any) => p.status === "pending");
  const paid = approvedPays.reduce((s: number, p: any) => s + p.amount, 0);
  const rem = Math.max(0, targetAmount - paid);
  
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [delPay, setDelPay] = useState<any>(null);
  const [viewR, setViewR] = useState<any>(null);

  const submit = () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) { setErr(t("project_modals.enter_valid_amount")); return; }
    if (a > rem) { setErr(t("project_modals.max_amount", { amount: BDT(rem) })); return; }
    onSave({ id: uid("PAY-"), clientId: client.id, instDefId: instDef.id, amount: a, date, note, status: isSuperAdmin ? "approved" : "pending", approvedBy: null });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[400] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={onClose}>
        <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 pb-safe max-h-[90vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6 sm:hidden" />
        <div className="text-xl font-black text-slate-900 dark:text-slate-100">{t("project_modals.payment_record")}</div>
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 mb-6">{dotJoin(client.name, client.plot, instDef.title)} {shareCount > 1 && <span className="text-blue-600 dark:text-blue-400">({shareCount} {t("client_info.shares")})</span>}</div>
        
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 mb-6">
          <PBar paid={paid} target={targetAmount} />
          {rem > 0 && <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-3">{t("project_modals.remaining", { amount: BDT(rem) })}</div>}
        </div>
        
        {approvedPays.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-2">{t("project_modals.approved")}</div>
            {approvedPays.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 rounded-xl p-3 mb-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{dotJoin(p.date, p.note)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 mr-1">{BDT(p.amount)}</span>
                  <button className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors" onClick={() => setViewR(p)}><FileText size={14} /></button>
                  {isSuperAdmin && (
                    <button className="w-7 h-7 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center hover:bg-rose-200 dark:hover:bg-rose-800 transition-colors" onClick={() => setDelPay(p)}><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {pendingPays.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-2">{t("project_modals.pending_approval")}</div>
            {pendingPays.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-2">
                <span className="text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5"><Clock size={12} /> {dotJoin(p.date, p.note)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-amber-700 dark:text-amber-400">{BDT(p.amount)}</span>
                  {isSuperAdmin && (
                    <button className="w-7 h-7 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center hover:bg-rose-200 dark:hover:bg-rose-800 transition-colors" onClick={() => setDelPay(p)}><Trash2 size={14} /></button>
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
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all font-bold text-slate-900 dark:text-slate-100" 
                type="number" inputMode="numeric" placeholder={t("project_modals.max_placeholder", { amount: rem.toString() })} 
                value={amount} onChange={e => { setAmount(e.target.value); setErr(""); }} 
              />
            </FG>
            {!isSuperAdmin && (
              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 -mt-2 mb-4 text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Clock size={14} /> {t("project_modals.pending_msg")}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <FG label={t("project_modals.date")}><input className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all text-slate-900 dark:text-slate-100" type="date" value={date} onChange={e => setDate(e.target.value)} /></FG>
              <FG label={t("project_modals.note")}><input className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all text-slate-900 dark:text-slate-100" placeholder={t("project_modals.optional")} value={note} onChange={e => setNote(e.target.value)} /></FG>
            </div>
            
            <AnimatePresence>
              {err && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <div className="text-rose-600 dark:text-rose-400 text-sm font-bold mb-4 bg-rose-50 dark:bg-rose-900/30 p-3 rounded-xl border border-rose-100 dark:border-rose-800">{err}</div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex gap-3 mt-2">
              <button className="flex-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold py-3.5 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors" onClick={submit}>{isSuperAdmin ? t("project_modals.save_btn") : t("project_modals.submit_for_approval")}</button>
              <button className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" onClick={onClose}>{t("project_modals.cancel")}</button>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-emerald-600 dark:text-emerald-400 font-black bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl border border-emerald-100 dark:border-emerald-800">
            {t("project_modals.fully_paid")}
          </div>
        )}
        
        <AnimatePresence>
          {delPay && (
            <ConfirmDelete 
              message={<><b>{BDT(delPay.amount)}</b> ({delPay.date}){t("project_modals.will_be_deleted")}</>} 
              onConfirm={() => { onDelete(delPay.id); setDelPay(null); }} 
              onClose={() => setDelPay(null)} 
            />
          )}
          {viewR && (
            <ReceiptSheet payment={viewR} instDef={instDef} client={client} project={project} onClose={() => setViewR(null)} />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export function AddDefSheet({ projectId, planId, onSave, onClose }: any) {
  const { t } = useLanguage();
  const [f, setF] = useState({ title: "", dueDate: "", targetAmount: "" });
  const [err, setErr] = useState("");
  const s = (k: string, v: string) => { setF(p => ({ ...p, [k]: v })); setErr(""); };
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[400] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={onClose}>
        <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 pb-safe" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6 sm:hidden" />
        <div className="text-xl font-black text-slate-900 dark:text-slate-100 mb-6">{t("project_modals.new_installment_col")}</div>
        
        <FG label={t("project_modals.inst_name")}>
          <input className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all font-bold text-slate-900 dark:text-slate-100" placeholder={t("project_modals.inst_name_ph")} value={f.title} onChange={e => s("title", e.target.value)} />
        </FG>
        <div className="grid grid-cols-2 gap-4">
          <FG label={t("project_modals.target_bdt")}><input className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all font-bold text-slate-900 dark:text-slate-100" type="number" value={f.targetAmount} onChange={e => s("targetAmount", e.target.value)} /></FG>
          <FG label={t("project_modals.due_date")}><input className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all text-slate-900 dark:text-slate-100" type="date" value={f.dueDate} onChange={e => s("dueDate", e.target.value)} /></FG>
        </div>
        
        <AnimatePresence>
          {err && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <div className="text-rose-600 dark:text-rose-400 text-sm font-bold mb-4 bg-rose-50 dark:bg-rose-900/30 p-3 rounded-xl border border-rose-100 dark:border-rose-800">{err}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3 mt-4">
          <button 
            className="flex-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold py-3.5 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors" 
            onClick={() => {
              if (!f.title || !f.targetAmount) { setErr(t("project_modals.add_inst_err")); return; }
              onSave({ id: uid("D-"), projectId, planId, title: f.title, dueDate: f.dueDate, targetAmount: parseFloat(f.targetAmount) });
              onClose();
            }}
          >
            {t("project_modals.add")}
          </button>
          <button className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" onClick={onClose}>{t("project_modals.cancel")}</button>
        </div>
      </motion.div>
    </div>
  );
}

export function AddExpSheet({ projectId, expense, onSave, onClose }: any) {
  const { t } = useLanguage();
  const [f, setF] = useState(expense ? { ...expense } : { category: "", description: "", amount: expense?.amount?.toString() || "", date: todayStr() });
  const [err, setErr] = useState("");
  const s = (k: string, v: string) => { setF(p => ({ ...p, [k]: v })); setErr(""); };
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[400] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={onClose}>
        <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 pb-safe" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6 sm:hidden" />
        <div className="text-xl font-black text-slate-900 dark:text-slate-100 mb-6">{expense ? t("modal.edit_expense") : t("project_modals.expense_add")}</div>
        
        <FG label={t("project_modals.category")}>
          <select className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all font-bold appearance-none text-slate-900 dark:text-slate-100" value={f.category} onChange={e => s("category", e.target.value)}>
            <option value="">{t("project_modals.select")}</option>
            {EXP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FG>
        <FG label={t("project_modals.description")}><input className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all text-slate-900 dark:text-slate-100" value={f.description} onChange={e => s("description", e.target.value)} /></FG>
        <div className="grid grid-cols-2 gap-4">
          <FG label={t("project_modals.amount_bdt_simple")}><input className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all font-bold text-slate-900 dark:text-slate-100" type="number" value={f.amount} onChange={e => s("amount", e.target.value)} /></FG>
          <FG label={t("project_modals.date")}><input className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all text-slate-900 dark:text-slate-100" type="date" value={f.date} onChange={e => s("date", e.target.value)} /></FG>
        </div>
        
        <AnimatePresence>
          {err && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <div className="text-rose-600 dark:text-rose-400 text-sm font-bold mb-4 bg-rose-50 dark:bg-rose-900/30 p-3 rounded-xl border border-rose-100 dark:border-rose-800">{err}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3 mt-4">
          <button 
            className="flex-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold py-3.5 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors" 
            onClick={() => {
              if (!f.category || !f.amount) { setErr(t("project_modals.expense_add_err")); return; }
              onSave({ id: expense?.id || uid("EX-"), projectId, ...f, amount: parseFloat(f.amount) });
              onClose();
            }}
          >
            {expense ? t("modal.update") : t("project_modals.add")}
          </button>
          <button className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" onClick={onClose}>{t("project_modals.cancel")}</button>
        </div>
      </motion.div>
    </div>
  );
}

export function ReceiptSheet({ payment, instDef, client, project, hideOfficeCopy, onClose }: any) {
  const { t } = useLanguage();
  
  const ReceiptContent = ({ type }: { type: string }) => (
    <div className="relative p-10 bg-white text-slate-900 font-sans border-b border-dashed border-slate-300 last:border-0 print:border-b-0 print:h-[50vh] flex flex-col min-w-[850px] print:min-w-0 overflow-hidden">
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
          <span className="border-b border-dotted border-slate-900 min-w-[120px] px-2 text-center">
            {payment?.id ? (payment.id.split('-')[1] || payment.id) : ""}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span>Date:</span>
          <span className="border-b border-dotted border-slate-900 min-w-[180px] px-2 text-center">
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
            <span className="flex-1 border-b border-dotted border-slate-900 dark:border-slate-100 px-2 font-bold">{client?.name}</span>
          </div>
          <div className="w-[280px] flex items-baseline gap-2">
            <span className="whitespace-nowrap font-bold">Customer ID:</span>
            <span className="flex-1 border-b border-dotted border-slate-900 dark:border-slate-100 px-2 font-bold">{client?.id}</span>
          </div>
        </div>

        <div className="flex gap-8">
          <div className="flex-1 flex items-baseline gap-2">
            <span className="whitespace-nowrap font-bold">Project Name:</span>
            <span className="flex-1 border-b border-dotted border-slate-900 dark:border-slate-100 px-2 font-bold">{project?.name || "N/A"}</span>
          </div>
          <div className="w-[280px] flex items-baseline gap-2">
            <span className="whitespace-nowrap font-bold">Instalment No.:</span>
            <span className="flex-1 border-b border-dotted border-slate-900 dark:border-slate-100 px-2 font-bold">{instDef?.title}</span>
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="whitespace-nowrap font-bold">Amount =</span>
          <span className="flex-1 border-b border-dotted border-slate-900 dark:border-slate-100 px-2 font-black text-base">{payment.amount.toLocaleString()}/-</span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="whitespace-nowrap font-bold">Amount in word:</span>
          <span className="flex-1 border-b border-dotted border-slate-900 dark:border-slate-100 px-2 font-bold">{numberToWords(payment.amount)} TK</span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="whitespace-nowrap font-bold">Deposit By:</span>
          <span className="flex-1 border-b border-dotted border-slate-900 dark:border-slate-100 px-2 font-bold">Cash/Cheque/Bank</span>
        </div>
      </div>

      {/* Footer Signatures */}
      <div className="flex justify-between mt-24 px-4 text-[11px] font-bold text-center">
        <div className="w-48 border-t border-slate-900 dark:border-slate-100 pt-1.5">Prepared By</div>
        <div className="w-48 border-t border-slate-900 dark:border-slate-100 pt-1.5">Accounts Officer</div>
        <div className="w-48 border-t border-slate-900 dark:border-slate-100 pt-1.5">Authorised Signature</div>
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
    <div className="fixed inset-0 bg-slate-900/60 z-[400] flex items-center justify-center backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none border dark:border-slate-800" 
        onClick={e => e.stopPropagation()}
      >
        <div className="max-h-[85vh] overflow-auto print:max-h-none print:overflow-visible">
          <ReceiptContent type="Customer" />
          {!hideOfficeCopy && (
            <>
              <div className="h-px border-b border-dashed border-slate-300 dark:border-slate-700 print:my-4" />
              <ReceiptContent type="Office" />
            </>
          )}
        </div>
        
        <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex gap-3 no-print">
          <button 
            className="flex-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold py-3.5 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors flex items-center justify-center gap-2" 
            onClick={() => window.print()}
          >
            <Printer size={18} /> {t("project_modals.print")}
          </button>
          <button className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" onClick={onClose}>
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
