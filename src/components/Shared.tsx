import React, { useState } from "react";
import { Eye, EyeOff, Trash2, Home, ClipboardList, User, Shield, Receipt, Building2, LogOut, KeyRound, Droplets, Zap, Users, Package, Truck, FileText, Globe } from "lucide-react";
import { cn, BDT, ac, initials } from "../lib/utils";
import { STATUS, STATUS_LABEL, LOGO_URL } from "../lib/data";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../lib/i18n";

export const CategoryIcon = ({ category, className, size = 24 }: { category: string, className?: string, size?: number }) => {
  switch (category) {
    case "পানি সরবরাহ": return <Droplets className={className} size={size} />;
    case "বৈদ্যুতিক কাজ":
    case "বিদ্যুৎ বিল": return <Zap className={className} size={size} />;
    case "শ্রমিক মজুরি": return <Users className={className} size={size} />;
    case "নির্মাণ সামগ্রী": return <Package className={className} size={size} />;
    case "যাতায়াত": return <Truck className={className} size={size} />;
    default: return <FileText className={className} size={size} />;
  }
};

export const CategoryColor = (category: string) => {
  switch (category) {
    case "পানি সরবরাহ": return "bg-blue-100 text-blue-600";
    case "বৈদ্যুতিক কাজ":
    case "বিদ্যুৎ বিল": return "bg-cyan-100 text-cyan-600";
    case "শ্রমিক মজুরি": return "bg-orange-100 text-orange-600";
    case "নির্মাণ সামগ্রী": return "bg-rose-100 text-rose-600";
    case "যাতায়াত": return "bg-indigo-100 text-indigo-600";
    default: return "bg-slate-100 text-slate-600";
  }
};

export function Badge({ status }: { status: string }) {
  const { t } = useLanguage();
  const m = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold", m.bg, m.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", m.dot)} />
      {t(`common.${status}`)}
    </span>
  );
}

export function PBar({ paid, target }: { paid: number; target: number }) {
  const { t } = useLanguage();
  const pct = target > 0 ? Math.min(100, Math.round((paid / target) * 100)) : 0;
  const st = paid === 0 ? "unpaid" : paid >= target ? "paid" : "partial";
  const m = STATUS[st];
  
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-sm font-extrabold text-slate-900">{BDT(paid)}</span>
        <span className="text-xs font-medium text-slate-500">/ {BDT(target)}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn("h-full rounded-full", m.bar)} 
        />
      </div>
      <div className="text-[11px] text-slate-500 mt-1 font-medium">{pct}% {t("common.paid_pct")}</div>
    </div>
  );
}

export function FG({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4", className)}>
      <label className="block text-xs font-bold text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export function ClientAvatar({ client, size = 34 }: { client: any; size?: number }) {
  const [err, setErr] = React.useState(false);
  if (!client) return <div style={{ width: size, height: size }} className="rounded-full bg-slate-200 shrink-0" />;
  
  if (client.photo && !err) {
    return (
      <img 
        src={client.photo} 
        alt="" 
        style={{ width: size, height: size }} 
        className="rounded-full object-cover block shrink-0" 
        referrerPolicy="no-referrer"
        onError={() => setErr(true)}
      />
    );
  }
  
  const color = ac(client.id);
  return (
    <div 
      style={{ width: size, height: size, backgroundColor: color + "20", color, fontSize: size * 0.35 }} 
      className="rounded-full flex items-center justify-center font-extrabold shrink-0 border border-current/10"
    >
      {initials(client.name)}
    </div>
  );
}

export function PassCell({ value }: { value: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm font-bold tracking-widest">{show ? value : "••••••"}</span>
      <button className="text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setShow(s => !s)}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function ConfirmDelete({ message, onConfirm, onClose }: { message: React.ReactNode; onConfirm: () => void; onClose: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[300] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 pb-safe" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 size={32} />
          </div>
          <div className="text-xl font-extrabold text-slate-900 mb-2">{t("common.delete_confirm")}</div>
          <div className="text-sm text-slate-500">{message}</div>
        </div>
        <div className="flex gap-3">
          <button className="flex-1 bg-rose-100 text-rose-700 font-bold py-3 rounded-xl hover:bg-rose-200 transition-colors" onClick={onConfirm}>{t("common.yes_delete")}</button>
          <button className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors" onClick={onClose}>{t("common.cancel")}</button>
        </div>
      </motion.div>
    </div>
  );
}

export function Drawer({ role, page, setPage, user, onLogout, open, onClose, isSuperAdmin, pendingCount }: any) {
  const { t, lang, setLang } = useLanguage();
  const adminNav = [
    { id: "home", label: t("nav.projects"), icon: Home },
    { id: "payments", label: t("nav.payments"), icon: Receipt },
    { id: "log", label: t("nav.log"), icon: ClipboardList },
    { id: "profile", label: t("nav.profile"), icon: User },
    ...(isSuperAdmin ? [{ id: "admins", label: t("nav.admin_manage"), icon: Shield }] : []),
  ];
  const clientNav = [
    { id: "installments", label: t("nav.my_installments"), icon: Receipt },
    { id: "receipts", label: t("nav.receipts"), icon: Receipt },
    { id: "expenses", label: t("nav.expenses"), icon: Building2 },
    { id: "profile", label: t("nav.profile"), icon: User }
  ];
  const nav = (role === "admin" || role === "superadmin") ? adminNav : clientNav;
  const color = role === "client" ? ac(user?.id || "") : (isSuperAdmin ? "#f59e0b" : "#3b82f6");

  return (
    <AnimatePresence mode="wait">
      {open && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 z-[150] backdrop-blur-sm" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="fixed top-0 left-0 bottom-0 w-72 bg-slate-900 z-[160] flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain p-0.5" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <div className="text-white font-black text-lg leading-tight">MARQ</div>
                  <div className="text-slate-400 text-[10px] font-bold tracking-widest">BUILDERS</div>
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                <div style={{ backgroundColor: color + "33", color }} className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0">
                  {role === "admin" ? initials(user?.name || "A") : (user?.name?.[0] || "?")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-200 font-bold text-sm truncate">{user?.name || "Admin"}</div>
                  <span style={{ backgroundColor: color + "22", color }} className="text-[10px] px-2 py-0.5 rounded-md font-bold inline-block mt-1">
                    {isSuperAdmin ? t("common.super_admin") : role === "admin" ? t("common.admin") : t("common.client")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1 p-3 overflow-y-auto">
              {nav.map(n => {
                const Icon = n.icon;
                const isActive = page === n.id;
                return (
                  <button 
                    key={n.id} 
                    onClick={() => { setPage(n.id); onClose(); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-colors text-sm font-semibold",
                      isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", isActive && "bg-white/10")}>
                      <Icon size={18} />
                    </div>
                    <span className="flex-1 text-left">{n.label}</span>
                    {n.id === "home" && pendingCount > 0 && isSuperAdmin && (
                      <span className="bg-rose-500 text-white rounded-full px-2 py-0.5 text-[10px] font-extrabold">{pendingCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="p-4 border-t border-white/10 flex flex-col gap-2">
              <button 
                onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-sm font-bold"
              >
                <Globe size={16} />
                {lang === 'bn' ? 'English' : 'বাংলা'}
              </button>
              <button 
                onClick={() => { onLogout(); onClose(); }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors text-sm font-bold"
              >
                <LogOut size={16} />
                {t("nav.logout")}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function BottomBar({ role, page, setPage }: any) {
  const { t } = useLanguage();
  if (role === "admin" || role === "superadmin") return null;
  const tabs = [
    { id: "installments", label: t("nav.my_installments"), icon: Receipt },
    { id: "receipts", label: t("nav.receipts"), icon: Receipt },
    { id: "expenses", label: t("nav.expenses"), icon: Building2 },
    { id: "profile", label: t("nav.profile"), icon: User }
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-[100] pb-safe no-print">
      {tabs.map(t => {
        const Icon = t.icon;
        const isActive = page === t.id;
        return (
          <button 
            key={t.id} 
            className="flex-1 flex flex-col items-center justify-center py-2 gap-1 relative"
            onClick={() => setPage(t.id)}
          >
            <Icon size={20} className={isActive ? "text-slate-900" : "text-slate-400"} />
            <span className={cn("text-[10px] font-bold", isActive ? "text-slate-900" : "text-slate-400")}>{t.label}</span>
            {isActive && <motion.div layoutId="bottom-dot" className="w-1 h-1 rounded-full bg-slate-900 absolute bottom-1" />}
          </button>
        );
      })}
    </div>
  );
}

export function Login({ onLogin }: any) {
  const { t, lang, setLang } = useLanguage();
  const [role, setRole] = useState("admin");
  const [id, setId] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const attempt = async () => {
    if (!id || !pass) return setErr(t("login.err_all_info"));
    setErr("");
    setLoading(true);
    const res = await onLogin(role, id, pass);
    if (res?.error) {
      setErr(res.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4 relative">
      <button 
        onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
        className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition-colors"
      >
        <Globe size={14} />
        {lang === 'bn' ? 'English' : 'বাংলা'}
      </button>
      <div className="text-center mb-8">
        <div className="text-3xl font-black text-white tracking-tighter">MARQ BUILDERS</div>
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
      >
        <div className="w-32 h-32 flex items-center justify-center overflow-hidden mx-auto mb-2">
          <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
        </div>
        <div className="text-center mb-6">
          <div className="text-2xl font-extrabold text-slate-900">{t("login.welcome")}</div>
          <div className="text-sm text-slate-500 mt-1">{t("login.enter_account")}</div>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          {[["admin", t("login.admin")], ["client", t("login.client")]].map(([v, l]) => (
            <button 
              key={v} 
              onClick={() => { setRole(v); setErr(""); }}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all",
                role === v ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {l}
            </button>
          ))}
        </div>

        <FG label={role === "admin" ? t("login.username") : t("login.customer_id")}>
          <input 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" 
            placeholder={role === "admin" ? "admin" : "C001"} 
            value={id} onChange={e => setId(e.target.value)} 
          />
        </FG>
        <FG label={t("login.password")}>
          <div className="relative">
            <input 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all pr-12" 
              type={show ? "text" : "password"} 
              placeholder="••••••••" 
              value={pass} onChange={e => setPass(e.target.value)} 
              onKeyDown={e => e.key === "Enter" && attempt()} 
            />
            <button 
              onClick={() => setShow(s => !s)} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </FG>
        
        <AnimatePresence>
          {err && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <div className="text-rose-600 text-sm font-bold mb-4 bg-rose-50 p-3 rounded-xl border border-rose-100">{err}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          disabled={loading}
          className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors mb-6 disabled:opacity-50" 
          onClick={attempt}
        >
          {loading ? t("login.loading") : t("login.enter")}
        </button>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-500">
          <div className="font-bold text-slate-400 text-[10px] mb-2 uppercase tracking-wider">{t("login.warning")}</div>
          <div className="text-slate-500 leading-relaxed">
            {t("login.warning_text")}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function ForceChangePw({ admin, onDone }: any) {
  const { t } = useLanguage();
  const [newPw, setNewPw] = useState("");
  const [conf, setConf] = useState("");
  const [showN, setShowN] = useState(false);
  const [err, setErr] = useState("");

  const save = () => {
    if (!newPw || newPw.length < 4) return setErr(t("pw.min_4"));
    if (newPw !== conf) return setErr(t("pw.mismatch"));
    onDone(newPw, true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
      >
        <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <KeyRound size={28} />
        </div>
        <div className="text-center mb-8">
          <div className="text-xl font-extrabold text-slate-900">{t("login.welcome")}, {admin.name}!</div>
          <div className="text-sm text-slate-500 mt-2">{t("pw.temp_msg")}</div>
        </div>
        
        <FG label={t("pw.new_pw")}>
          <div className="relative">
            <input 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all pr-12" 
              type={showN ? "text" : "password"} 
              value={newPw} onChange={e => { setNewPw(e.target.value); setErr(""); }} 
            />
            <button onClick={() => setShowN(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
              {showN ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </FG>
        <FG label={t("pw.confirm")}>
          <input 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" 
            type="password" 
            value={conf} onChange={e => { setConf(e.target.value); setErr(""); }} 
          />
        </FG>
        
        <AnimatePresence>
          {err && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <div className="text-rose-600 text-sm font-bold mb-4 bg-rose-50 p-3 rounded-xl border border-rose-100">{err}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <button className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors mb-3" onClick={save}>
          {t("pw.set_new")}
        </button>
        <button className="w-full bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors" onClick={() => onDone(admin.password, false)}>
          {t("pw.skip")}
        </button>
      </motion.div>
    </div>
  );
}
