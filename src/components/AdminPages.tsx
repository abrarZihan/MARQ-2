import { useState, useRef } from "react";
import { useLanguage } from "../lib/i18n";
import { motion, AnimatePresence } from "motion/react";
import { BDT, BDTshort, ac, initials, uid, todayStr, cn } from "../lib/utils";
import { FG, ConfirmDelete } from "./Shared";
import { Eye, EyeOff, ShieldPlus, KeyRound, Trash2, ShieldMinus, Search, Receipt } from "lucide-react";
import { ReceiptSheet } from "./ProjectModals";

export function AdminPaymentsPage({ payments, clients, instDefs, projects, isSuperAdmin, onDeletePayment }: any) {
  const { t } = useLanguage();
  const [selPay, setSelPay] = useState<any>(null);
  const [search, setSearch] = useState("");

  const filtered = payments
    .filter((p: any) => p.status === "approved")
    .filter((p: any) => {
      const c = clients.find((cl: any) => cl.id === p.clientId);
      const d = instDefs.find((di: any) => di.id === p.instDefId);
      const prj = projects.find((pr: any) => pr.id === c?.projectId);
      const s = search.toLowerCase();
      return (
        c?.name?.toLowerCase().includes(s) ||
        c?.id?.toLowerCase().includes(s) ||
        d?.title?.toLowerCase().includes(s) ||
        prj?.name?.toLowerCase().includes(s)
      );
    })
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      <div className="mb-6">
        <h1 className="text-xl font-black text-app-text-primary">{t('nav.payments')}</h1>
        <p className="text-xs font-medium text-app-text-secondary">{t('project_modals.payment_record')}</p>
      </div>

      <div className="relative mb-6">
        <input 
          className="w-full pl-10 pr-4 py-3 bg-app-surface border border-app-border rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted shadow-sm text-app-text-primary" 
          placeholder={t('client_info.search_ph')}
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-text-muted">
          <Search size={18} />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((p: any) => {
          const c = clients.find((cl: any) => cl.id === p.clientId);
          const d = instDefs.find((di: any) => di.id === p.instDefId);
          const prj = projects.find((pr: any) => pr.id === c?.projectId);
          
          return (
            <div key={p.id} className="bg-app-surface rounded-2xl border border-app-border p-4 shadow-sm flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-extrabold text-app-text-primary">{c?.name || p.clientId}</div>
                <div className="text-xs font-bold text-app-text-muted">{p.date}</div>
              </div>
              <div className="text-right shrink-0">
                <button 
                  className="flex items-center gap-1.5 text-xs font-black text-blue-600 dark:text-blue-400 hover:opacity-80 underline uppercase tracking-wider"
                  onClick={() => setSelPay(p)}
                >
                  <span className="text-sm">🧾</span>
                  {t('modal.receipt') || 'রসিদ'}
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-app-surface rounded-3xl border border-app-border border-dashed">
            <div className="text-app-text-muted mb-2 flex justify-center"><Receipt size={48} /></div>
            <div className="text-sm font-bold text-app-text-muted">{t('project_detail.no_activity')}</div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selPay && (
          <ReceiptSheet 
            payment={selPay} 
            client={clients.find((c: any) => c.id === selPay.clientId)} 
            project={projects.find((pr: any) => pr.id === clients.find((c: any) => c.id === selPay.clientId)?.projectId)}
            instDef={instDefs.find((d: any) => d.id === selPay.instDefId)}
            isSuperAdmin={isSuperAdmin}
            onDelete={onDeletePayment}
            onClose={() => setSelPay(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function AdminManagePage({ admins, onAdd, onDelete, onResetPw, currentAdminId }: any) {
  const { t } = useLanguage();
  const [addModal, setAddModal] = useState(false);
  const [resetTarget, setReset] = useState<any>(null);
  const [delTarget, setDel] = useState<any>(null);
  const [tempPw, setTempPw] = useState("");
  const [newF, setNewF] = useState({ name: "", username: "", password: "" });
  
  const s = (k: string, v: string) => setNewF(p => ({ ...p, [k]: v }));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-app-text-primary">{t('common.admin_management')}</h1>
          <p className="text-xs font-medium text-app-text-secondary">{t('common.admins_count', { count: admins.length })}</p>
        </div>
        <button 
          className="bg-app-tab-active text-app-bg px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-colors shadow-sm flex items-center gap-2" 
          onClick={() => setAddModal(true)}
        >
          <ShieldPlus size={18} />
          {t('common.add_admin')}
        </button>
      </div>

      <div className="space-y-3">
        {admins.map((adm: any) => {
          const isSelf = adm.id === currentAdminId;
          const isSuper = adm.role === "superadmin";
          const color = isSuper ? "#f59e0b" : ac(adm.id);
          
          return (
            <div key={adm.id} className="bg-app-surface rounded-2xl border border-app-border p-4 flex items-center gap-4 shadow-sm">
              <div 
                style={{ backgroundColor: isSuper ? "rgba(245, 158, 11, 0.15)" : color + "20", color: isSuper ? undefined : color }} 
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0",
                  isSuper && "text-amber-600 dark:text-amber-400 bg-amber-500/15"
                )}
              >
                {initials(adm.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-base font-extrabold text-app-text-primary">{adm.name}</span>
                  {isSelf && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">{t('common.you')}</span>}
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold",
                    isSuper ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-app-bg text-app-text-secondary"
                  )}>
                    {isSuper ? t('common.super_admin') : t('common.admin')}
                  </span>
                  {adm.isTemp && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400">{t('common.temp_pw')}</span>}
                </div>
                <div className="text-xs font-bold text-app-text-muted">@{adm.username}</div>
              </div>
              {!isSuper && (
                <div className="flex gap-2">
                  <button 
                    className="w-10 h-10 bg-orange-500/20 text-orange-700 dark:text-orange-400 rounded-xl flex items-center justify-center hover:bg-orange-500/30 transition-colors border border-orange-500/30" 
                    onClick={() => { setReset(adm); setTempPw(""); }}
                  >
                    <KeyRound size={18} />
                  </button>
                  {!isSelf && (
                    <button 
                      className="w-10 h-10 bg-rose-500/20 text-rose-700 dark:text-rose-400 rounded-xl flex items-center justify-center hover:bg-rose-500/30 transition-colors border border-rose-500/30" 
                      onClick={() => setDel(adm)}
                    >
                      <ShieldMinus size={18} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {addModal && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[300] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={() => setAddModal(false)}>
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-app-surface-elevated rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 pb-safe border border-app-border" 
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-app-border rounded-full mx-auto mb-6 sm:hidden" />
              <div className="text-xl font-black text-app-text-primary mb-6">{t('common.new_admin_title')}</div>
              
              <FG label={t('common.full_name')}>
                <input className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all text-app-text-primary" value={newF.name} onChange={e => s("name", e.target.value)} />
              </FG>
              <div className="grid grid-cols-2 gap-4">
                <FG label={t('common.username')}>
                  <input className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all text-app-text-primary" value={newF.username} onChange={e => s("username", e.target.value)} />
                </FG>
                <FG label={t('common.temp_password')}>
                  <input className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all text-app-text-primary" value={newF.password} onChange={e => s("password", e.target.value)} />
                </FG>
              </div>
              
              <div className="flex gap-3 mt-4">
                <button 
                  className="flex-1 bg-app-tab-active text-app-bg font-bold py-3.5 rounded-xl hover:opacity-90 transition-colors" 
                  onClick={() => {
                    if (!newF.name || !newF.username || !newF.password) { alert(t('common.error_fill_all')); return; }
                    onAdd({ id: uid("adm-"), name: newF.name, username: newF.username, password: newF.password, role: "admin", isTemp: true });
                    setAddModal(false); setNewF({ name: "", username: "", password: "" });
                  }}
                >
                  {t('common.add_button')}
                </button>
                <button className="flex-1 bg-app-bg text-app-text-secondary font-bold py-3.5 rounded-xl hover:bg-app-border transition-colors border border-app-border" onClick={() => setAddModal(false)}>{t('common.cancel')}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {resetTarget && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[300] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={() => setReset(null)}>
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-app-surface-elevated rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 pb-safe border border-app-border" 
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-app-border rounded-full mx-auto mb-6 sm:hidden" />
              <div className="text-xl font-black text-app-text-primary mb-6">{t('common.reset_password_title', { name: resetTarget.name })}</div>
              
              <FG label={t('common.new_temp_password')}>
                <input className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all text-app-text-primary" value={tempPw} onChange={e => setTempPw(e.target.value)} />
              </FG>
              
              <div className="flex gap-3 mt-4">
                <button 
                  className="flex-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold py-3.5 rounded-xl hover:bg-orange-500/20 transition-colors border border-orange-500/20" 
                  onClick={() => {
                    if (!tempPw) { alert(t('common.error_enter_pw')); return; }
                    onResetPw(resetTarget.id, tempPw);
                    setReset(null);
                  }}
                >
                  {t('common.reset_button')}
                </button>
                <button className="flex-1 bg-app-bg text-app-text-secondary font-bold py-3.5 rounded-xl hover:bg-app-border transition-colors border border-app-border" onClick={() => setReset(null)}>{t('common.cancel')}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {delTarget && (
          <ConfirmDelete 
            message={<div dangerouslySetInnerHTML={{ __html: t('common.delete_admin_confirm', { name: delTarget.name, username: delTarget.username }) }} />} 
            onConfirm={() => { onDelete(delTarget.id); setDel(null); }} 
            onClose={() => setDel(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
