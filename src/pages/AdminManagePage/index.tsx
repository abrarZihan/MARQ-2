import { useState } from "react";
import { useLanguage } from "../../lib/i18n";
import { motion, AnimatePresence } from "motion/react";
import { ac, initials, uid, tsNow, cn } from "../../lib/utils";
import { FG, ConfirmDelete } from "../../components/Shared";
import { ShieldPlus, KeyRound, ShieldMinus } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { db, handleFirestoreError, OperationType } from "../../firebase";
import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const ADMIN_FIELDS = ['id', 'name', 'username', 'password', 'role', 'isTemp'];

const sanitize = (data: Record<string, unknown>, allowedFields: string[]) => {
  const clean: Record<string, unknown> = {};
  allowedFields.forEach(f => {
    if (data[f] !== undefined) clean[f] = data[f];
  });
  return clean;
};

import { useActions } from "../../hooks/useActions";

import { Admin } from "../../types";

export default function AdminManagePage() {
  const { t } = useLanguage();
  const { admins, auth, setToast } = useAppStore();
  const actions = useActions();
  
  const [addModal, setAddModal] = useState(false);
  const [resetTarget, setReset] = useState<Admin | null>(null);
  const [delTarget, setDel] = useState<Admin | null>(null);
  const [tempPw, setTempPw] = useState("");
  const [newF, setNewF] = useState({ name: "", username: "", password: "" });

  const currentAdminId = auth?.user?.id;
  const isSuperAdmin = auth?.role === "superadmin";
  
  const s = (k: keyof typeof newF, v: string) => setNewF(p => ({ ...p, [k]: v }));

  if (!isSuperAdmin) return null;

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
        {admins.map((adm: Admin) => {
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
                    actions.addAdmin({ id: uid("adm-"), name: newF.name, username: newF.username, password: newF.password, role: "admin", isTemp: true });
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
                    actions.resetAdminPw(resetTarget.id, tempPw);
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
            message={<div>{delTarget.name} (@{delTarget.username}) কে মুছে ফেলবেন?</div>} 
            onConfirm={() => { actions.removeAdmin(delTarget.id); setDel(null); }} 
            onClose={() => setDel(null)} 
          />
        )}
      </AnimatePresence>

      <div className="mt-12 pt-8 border-t border-app-border">
        <h2 className="text-sm font-black text-app-text-muted uppercase tracking-widest mb-4">Database Maintenance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-app-surface border border-app-border p-5 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-app-text-primary mb-1">Migrate Payment Data</h3>
            <p className="text-[11px] text-app-text-secondary leading-relaxed mb-4">
              Add missing project relationships to old payments. Required for project-level pagination.
            </p>
            <button 
              onClick={() => {
                if (confirm("This will scan all payments and associate them with their correct Projects. Proceed?")) {
                  actions.migratePayments();
                }
              }}
              className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-500/20 border border-blue-500/20 transition-all inline-flex items-center gap-2"
            >
              Run Migration
            </button>
          </div>

          <div className="bg-app-surface border border-app-border p-5 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-app-text-primary mb-1">Clear Audit Logs</h3>
            <p className="text-[11px] text-app-text-secondary leading-relaxed mb-4">
              Delete all historical audit logs to save local/cloud storage space. This action is permanent.
            </p>
            <button 
              onClick={() => {
                if (confirm("Are you sure you want to PERMANENTLY delete ALL audit logs?")) {
                  actions.clearLogs();
                }
              }}
              className="bg-rose-500/10 text-rose-600 dark:text-rose-400 px-4 py-2 rounded-xl text-xs font-black hover:bg-rose-500/20 border border-rose-500/20 transition-all inline-flex items-center gap-2"
            >
              Clear Logs
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
