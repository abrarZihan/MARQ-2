import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "../../lib/i18n";
import { ac, initials, cn, uid, tsNow } from "../../lib/utils";
import { FG } from "../../components/Shared";
import { useAppStore } from "../../store/appStore";
import { Admin } from "../../types";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "../../firebase";

export default function AdminProfile() {
  const { t } = useLanguage();
  const { auth, setAuth, setToast } = useAppStore();
  
  const admin = auth?.role !== "client" ? (auth?.user as Admin) : null;
  
  if (!admin) return null;

  const [old, setOld] = useState("");
  const [nw, setNw] = useState("");
  const [conf, setConf] = useState("");
  const [showO, setShowO] = useState(false);
  const [showN, setShowN] = useState(false);
  const [msg, setMsg] = useState<{ t: "s" | "e"; v: string } | null>(null);
  
  const color = admin.role === "superadmin" ? "#f59e0b" : ac(admin.id);
  const isSuper = admin.role === "superadmin";
  
  const save = async () => {
    setMsg(null);
    if (!old) return setMsg({ t: "e", v: t('common.error_enter_current_pw') });
    if (old !== admin.password) return setMsg({ t: "e", v: t('common.error_wrong_current_pw') });
    if (!nw || nw.length < 4) return setMsg({ t: "e", v: t('common.error_min_chars', { count: 4 }) });
    if (nw !== conf) return setMsg({ t: "e", v: t('common.error_pw_mismatch') });

    try {
      await updateDoc(doc(db, "admins", admin.id), { password: nw, isTemp: false });
      const updatedUser = { ...admin, password: nw, isTemp: false };
      setAuth({ ...auth!, user: updatedUser });
      
      // Inline Log creation
      const logId = uid("LOG");
      await setDoc(doc(db, "logs", logId), {
        id: logId,
        adminId: admin.id,
        adminName: admin.name,
        action: "pw_change",
        target: admin.name,
        detail: "পাসওয়ার্ড পরিবর্তন",
        projectId: null,
        ts: tsNow()
      });

      // Inline Toast notification
      setToast({ m: t("common.success_saved"), t: "s" });
      setTimeout(() => setToast(null), 3000);
      
      setOld(""); setNw(""); setConf("");
      setMsg({ t: "s", v: t('common.success_pw_changed') });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `admins/${admin.id}`);
      setMsg({ t: "e", v: "Error updating password" });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-24">
      <div className="bg-app-surface rounded-3xl border border-app-border p-6 mb-6 shadow-sm transition-colors">
        <div className="flex items-center gap-5">
          <div 
            style={{ backgroundColor: isSuper ? "rgba(245, 158, 11, 0.15)" : color + "20", color: isSuper ? undefined : color }} 
            className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black shrink-0",
              isSuper && "text-amber-600 dark:text-amber-400 bg-amber-500/15"
            )}
          >
            {initials(admin.name)}
          </div>
          <div>
            <div className="text-2xl font-black text-app-text-primary">{admin.name}</div>
            <div className="text-sm font-bold text-app-text-secondary mt-1">@{admin.username}</div>
            <span className={cn(
              "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block mt-3",
              admin.role === "superadmin" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-app-bg text-app-text-secondary"
            )}>
              {admin.role === "superadmin" ? t('common.super_admin') : t('common.admin')}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-app-surface rounded-3xl border border-app-border p-6 shadow-sm transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 rounded-xl flex items-center justify-center border border-blue-200 dark:border-blue-500/20">
            <KeyRound size={20} />
          </div>
          <h2 className="text-lg font-black text-app-text-primary">{t('common.change_password')}</h2>
        </div>
        
        <div className="space-y-4">
          <FG label={t('common.current_password')}>
            <div className="relative">
              <input 
                className="w-full px-4 py-3.5 bg-app-bg border border-app-border rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-app-tab-active/10 transition-all pr-12 text-app-text-primary" 
                type={showO ? "text" : "password"} 
                value={old} onChange={e => setOld(e.target.value)} 
              />
              <button onClick={() => setShowO(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text-secondary p-2">
                {showO ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </FG>
          
          <FG label={t('common.new_password')}>
            <div className="relative">
              <input 
                className="w-full px-4 py-3.5 bg-app-bg border border-app-border rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-app-tab-active/10 transition-all pr-12 text-app-text-primary" 
                type={showN ? "text" : "password"} 
                value={nw} onChange={e => setNw(e.target.value)} 
              />
              <button onClick={() => setShowN(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text-secondary p-2">
                {showN ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </FG>
          
          <FG label={t('common.confirm_password')}>
            <input 
              className="w-full px-4 py-3.5 bg-app-bg border border-app-border rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-app-tab-active/10 transition-all text-app-text-primary" 
              type="password" 
              value={conf} onChange={e => setConf(e.target.value)} 
            />
          </FG>
        </div>
        
        <AnimatePresence>
          {msg && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <div className={cn(
                "p-4 rounded-xl mt-6 text-xs font-black uppercase tracking-wider border",
                msg.t === "s" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" : "bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
              )}>
                {msg.v}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button 
          className="w-full bg-app-tab-active text-app-surface font-black py-4 rounded-2xl hover:opacity-90 transition-all mt-8 shadow-lg shadow-app-tab-active/20 active:scale-95 text-sm uppercase tracking-widest" 
          onClick={save}
        >
          {t('common.change_password')}
        </button>
      </div>
    </motion.div>
  );
}
