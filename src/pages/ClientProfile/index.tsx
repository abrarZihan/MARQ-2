import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BDT, ac, cn } from "../../lib/utils";
import { ClientAvatar, FG } from "../../components/Shared";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "../../lib/i18n";
import { useAppStore } from "../../store/appStore";
import { AuthUser, InstDef } from "../../types";
import { doc, updateDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../firebase";

export default function ClientProfile() {
  const { t, lang } = useLanguage();
  const { auth, instDefs, clients, setAuth } = useAppStore();
  const client = clients.find(c => c.id === auth?.user.id);
  
  const [old, setOld] = useState("");
  const [nw, setNw] = useState("");
  const [conf, setConf] = useState("");
  const [showO, setShowO] = useState(false);
  const [showN, setShowN] = useState(false);
  const [msg, setMsg] = useState<{ t: "s" | "e"; v: string } | null>(null);
  
  if (!client) return null;

  const color = ac(client.id);
  
  const save = async () => {
    setMsg(null);
    if (!old) return setMsg({ t: "e", v: t('common.error_enter_current_pw') });
    if (old !== client.password) return setMsg({ t: "e", v: t('common.error_wrong_current_pw') });
    if (!nw || nw.length < 4) return setMsg({ t: "e", v: t('common.error_min_chars', { count: 4 }) });
    if (nw !== conf) return setMsg({ t: "e", v: t('common.error_pw_mismatch') });
    
    const updatedClient = { ...client, password: nw };
    try {
      await updateDoc(doc(db, "clients", client.id), { password: nw });
      setAuth({ ...auth!, user: { ...client, ...updatedClient, role: "client", username: client.id } as AuthUser });
      setOld(""); setNw(""); setConf("");
      setMsg({ t: "s", v: t('common.success_pw_changed') });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `clients/${client.id}`);
      setMsg({ t: "e", v: t('common.error_occurred') });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      <div className="bg-app-surface rounded-3xl border border-app-border p-6 mb-6 shadow-sm transition-colors">
        <div className="flex items-center gap-5 mb-8">
          <ClientAvatar client={client} size={80} />
          <div>
            <div className="text-2xl font-black text-app-text-primary">{client.name}</div>
            <div className="text-sm font-medium text-app-text-secondary mt-1">{t('client.plot')}: <span className="font-bold" style={{ color }}>{client.plot}</span></div>
          </div>
        </div>
        
        <div className="space-y-4">
          {[
            [t('common.customer_id'), client.id], [t('common.phone'), client.phone || "—"], 
            [t('client.father_husband'), client.fatherHusband || "—"], [t('client.birth_date'), client.birthDate || "—"], 
            [t('client.email'), client.email || "—"], [t('client.nid'), client.nid || "—"], 
            [t('common.total_price_label'), BDT((() => {
              let total = 0;
              
              // Sum plan installments multiplied by their share counts
              (client.planAssignments || []).forEach(pa => {
                instDefs.filter((d: InstDef) => d.planId === pa.planId).forEach((d: InstDef) => {
                  total += d.targetAmount * (pa.shareCount || 1);
                });
              });
              
              return total;
            })(), lang === 'bn')]
          ].map(([l, v], i) => (
            <div key={`${l}-${i}`} className="flex items-center py-2 border-b border-app-border last:border-0">
              <span className="text-xs font-bold text-app-text-muted w-32 shrink-0">{l}</span>
              <span className="text-sm font-bold text-app-text-primary flex-1">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-app-surface rounded-3xl border border-app-border p-6 shadow-sm transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-app-bg rounded-xl flex items-center justify-center text-app-text-secondary border border-app-border">
            <KeyRound size={20} />
          </div>
          <h2 className="text-lg font-black text-app-text-primary">{t('common.change_password')}</h2>
        </div>
        
        <FG label={t('common.current_password')}>
          <div className="relative">
            <input 
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all pr-12 text-app-text-primary" 
              type={showO ? "text" : "password"} 
              value={old} onChange={e => setOld(e.target.value)} 
            />
            <button onClick={() => setShowO(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text-secondary p-1">
              {showO ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </FG>
        
        <FG label={t('common.new_password')}>
          <div className="relative">
            <input 
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all pr-12 text-app-text-primary" 
              type={showN ? "text" : "password"} 
              value={nw} onChange={e => setNw(e.target.value)} 
            />
            <button onClick={() => setShowN(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text-secondary p-1">
              {showN ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </FG>
        
        <FG label={t('common.confirm_password')}>
          <input 
            className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all text-app-text-primary" 
            type="password" 
            value={conf} onChange={e => setConf(e.target.value)} 
          />
        </FG>
        
        <AnimatePresence>
          {msg && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <div className={cn(
                "p-4 rounded-xl mb-6 text-sm font-bold border",
                msg.t === "s" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
              )}>
                {msg.v}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button className="w-full bg-app-tab-active text-app-bg font-bold py-3.5 rounded-xl hover:opacity-90 transition-colors mt-2" onClick={save}>
          {t('common.change_password')}
        </button>
      </div>
    </motion.div>
  );
}
