import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Trash2, Home, ClipboardList, User, Shield, Receipt, Building2, LogOut, KeyRound, Droplets, Zap, Users, Package, Truck, FileText, Globe } from "lucide-react";
import { cn, BDT, ac, initials } from "../lib/utils";
import { STATUS, LOGO_URL } from "../lib/data";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../lib/i18n";
import { Client, Plan, AuthUser } from "../types";

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
    case "পানি সরবরাহ": return "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30";
    case "বৈদ্যুতিক কাজ":
    case "বিদ্যুৎ বিল": return "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30";
    case "শ্রমিক মজুরি": return "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30";
    case "নির্মাণ সামগ্রী": return "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30";
    case "যাতায়াত": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30";
    default: return "bg-app-bg text-app-text-secondary border border-app-border";
  }
};

export function Badge({ status }: { status: string }) {
  const { t, lang } = useLanguage();
  const m = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold", m.bg, m.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", m.dot)} />
      {t(`common.${status}`)}
    </span>
  );
}

export function PBar({ paid, target, rightLabel }: { paid: number; target: number; rightLabel?: React.ReactNode }) {
  const { t, lang } = useLanguage();
  const pct = target > 0 ? Math.min(100, Math.round((paid / target) * 100)) : 0;
  const st = paid === 0 ? "unpaid" : paid >= target ? "paid" : "partial";
  const m = STATUS[st];
  
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-sm font-extrabold text-app-text-primary">{BDT(paid, lang === 'bn')}</span>
        <span className="text-xs font-medium text-app-text-secondary">/ {BDT(target, lang === 'bn')}</span>
      </div>
      <div className="h-1.5 bg-app-border rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn("h-full rounded-full", m.bar)} 
          layout
        />
      </div>
      <div className="flex justify-between items-center mt-1 text-[10px] font-bold uppercase tracking-wider">
        <div className="text-app-text-secondary">{pct}% {t("common.paid_pct")}</div>
        {rightLabel && <div className="text-app-text-muted">{rightLabel}</div>}
      </div>
    </div>
  );
}

export function FG({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4", className)}>
      <label className="block text-xs font-bold text-app-text-secondary mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export function ClientAvatar({ client, size = 34 }: { client: Client | AuthUser | null; size?: number }) {
  const [err, setErr] = React.useState(false);
  if (!client) return <div style={{ width: size, height: size }} className="rounded-full bg-app-border shrink-0" />;
  
  const photo = (client as any).photo;
  const name = client.name || "";
  const id = client.id || "0";

  if (photo && !err) {
    return (
      <img 
        src={photo} 
        alt="" 
        style={{ width: size, height: size }} 
        className="rounded-full object-cover block shrink-0 border border-app-border" 
        referrerPolicy="no-referrer"
        onError={() => setErr(true)}
      />
    );
  }
  
  const color = ac(id);
  return (
    <div 
      style={{ width: size, height: size, backgroundColor: color + "20", color, fontSize: size * 0.35 }} 
      className="rounded-full flex items-center justify-center font-extrabold shrink-0 border border-current/10"
    >
      {initials(name)}
    </div>
  );
}

export function PassCell({ value }: { value: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm font-bold tracking-widest text-app-text-primary">{show ? value : "••••••"}</span>
      <button className="text-app-text-muted hover:text-app-text-secondary transition-colors" onClick={() => setShow(s => !s)}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function ConfirmDelete({ message, onConfirm, onClose }: { message: React.ReactNode; onConfirm: () => void; onClose: () => void }) {
  const { t, lang } = useLanguage();
  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[300] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-app-surface-elevated rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 pb-safe border border-app-border" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-app-border rounded-full mx-auto mb-6 sm:hidden" />
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-app-error-bg text-app-error-text rounded-full flex items-center justify-center mx-auto mb-4 border border-app-error-text/10">
            <Trash2 size={32} />
          </div>
          <div className="text-xl font-extrabold text-app-text-primary mb-2">{t("common.delete_confirm")}</div>
          <div className="text-sm text-app-text-secondary">{message}</div>
        </div>
        <div className="flex gap-3">
          <button className="flex-1 bg-app-error-bg text-app-error-text font-bold py-3 rounded-xl hover:opacity-90 transition-colors border border-app-error-text/10" onClick={onConfirm}>{t("common.yes_delete")}</button>
          <button className="flex-1 bg-app-bg text-app-text-primary font-bold py-3 rounded-xl hover:bg-app-border transition-colors border border-app-border" onClick={onClose}>{t("common.cancel")}</button>
        </div>
      </motion.div>
    </div>
  );
}

export function ConfirmDeletePlan({ plan, amount, onConfirm, onClose }: { plan: Plan; amount: number; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[600] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-app-surface-elevated rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-8 pb-safe border border-app-border" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-app-border rounded-full mx-auto mb-8 sm:hidden" />
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-app-error-bg text-app-error-text rounded-full flex items-center justify-center mx-auto mb-6 border border-app-error-text/20">
            <Trash2 size={40} />
          </div>
          <div className="text-2xl font-black text-app-text-primary mb-3">মুছে ফেলবেন?</div>
          <div className="text-sm font-bold text-app-text-secondary">{plan.name} — ৳ {amount.toLocaleString('bn-BD')} মুছে যাবে।</div>
        </div>
        <div className="flex gap-4">
          <button className="flex-1 bg-app-error-bg text-app-error-text font-black py-4 rounded-2xl hover:opacity-90 transition-colors border border-app-error-text/20" onClick={onConfirm}>হ্যাঁ, মুছুন</button>
          <button className="flex-1 bg-app-bg text-app-text-secondary font-black py-4 rounded-2xl hover:bg-app-border transition-colors border border-app-border" onClick={onClose}>বাতিল</button>
        </div>
      </motion.div>
    </div>
  );
}

export function Drawer({ role, user, onLogout, open, onClose, isSuperAdmin, pendingCount }: {
  role: AuthUser["role"];
  user: AuthUser | null;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
  isSuperAdmin: boolean;
  pendingCount: number;
}) {
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const page = location.pathname.split("/")[1] || "home";

  const adminNav = [
    { id: "home", path: "/", label: t("nav.projects"), icon: Home },
    { id: "payments", path: "/payments", label: t("nav.payments"), icon: Receipt },
    { id: "log", path: "/log", label: t("nav.log"), icon: ClipboardList },
    { id: "profile", path: "/profile", label: t("nav.profile"), icon: User },
    ...(isSuperAdmin ? [{ id: "admins", path: "/admins", label: t("nav.admin_manage"), icon: Shield }] : []),
  ];
  const clientNav = [
    { id: "installments", path: "/installments", label: t("nav.my_installments"), icon: Receipt },
    { id: "receipts", path: "/receipts", label: t("nav.receipts"), icon: Receipt },
    { id: "expenses", path: "/expenses", label: t("nav.expenses"), icon: Building2 },
    { id: "profile", path: "/profile", label: t("nav.profile"), icon: User }
  ];
  const nav = (role === "admin" || role === "superadmin") ? adminNav : clientNav;
  const color = role === "client" ? ac(user?.id || "") : (isSuperAdmin ? "#f59e0b" : "#3b82f6");

  return (
    <AnimatePresence mode="wait">
      {open && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[150] backdrop-blur-sm" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-72 bg-app-nav-bg z-[160] flex flex-col shadow-2xl transition-colors"
          >
            <div className="p-6 border-b border-app-nav-text/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white force-white rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-app-nav-text/10">
                  <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain p-0.5" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <div className="text-app-nav-text font-black text-lg leading-tight">MARQ</div>
                  <div className="text-app-nav-text-muted text-[10px] font-bold tracking-widest">BUILDERS</div>
                </div>
              </div>
              <div className="bg-app-nav-text/10 rounded-xl p-3 flex items-center gap-3 border border-app-nav-text/10">
                <div style={{ backgroundColor: color + "33", color }} className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0">
                  {role === "admin" ? initials(user?.name || "A") : (user?.name?.[0] || "?")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-app-nav-text font-bold text-sm truncate">{user?.name || "Admin"}</div>
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
                    onClick={() => { navigate(n.path); onClose(); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-colors text-sm font-semibold",
                      isActive 
                        ? "bg-app-nav-text text-app-nav-bg" 
                        : "text-app-nav-text-muted hover:bg-app-nav-text/10 hover:text-app-nav-text"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", isActive && "bg-current/10")}>
                      <Icon size={18} />
                    </div>
                    <span className="flex-1 text-left">{n.label}</span>
                    {n.id === "home" && pendingCount > 0 && isSuperAdmin && (
                      <span className="bg-app-error-bg text-app-error-text rounded-full px-2 py-0.5 text-[10px] font-extrabold border border-app-error-text/10">{pendingCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="p-4 border-t border-app-nav-text/10 flex flex-col gap-2">
              <button 
                onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-app-nav-text/10 border border-app-nav-text/10 rounded-xl text-app-nav-text-muted hover:text-app-nav-text hover:bg-app-nav-text/20 transition-colors text-sm font-bold"
              >
                <Globe size={16} />
                {lang === 'bn' ? 'English' : 'বাংলা'}
              </button>
              <button 
                onClick={() => { onLogout(); onClose(); }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-rose-100 border border-rose-200 rounded-xl text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-500/20 transition-colors text-sm font-bold"
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

export function BottomBar({ role }: { role: AuthUser["role"] }) {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const page = location.pathname.split("/")[1] || "home";

  if (role === "admin" || role === "superadmin") return null;
  const tabs = [
    { id: "installments", path: "/installments", label: t("nav.my_installments"), icon: Receipt },
    { id: "receipts", path: "/receipts", label: t("nav.receipts"), icon: Receipt },
    { id: "expenses", path: "/expenses", label: t("nav.expenses"), icon: Building2 },
    { id: "profile", path: "/profile", label: t("nav.profile"), icon: User }
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-app-nav-bg border-t border-app-nav-text/10 flex z-[100] pb-safe no-print transition-colors">
      {tabs.map(t => {
        const Icon = t.icon;
        const isActive = page === t.id;
        return (
          <button 
            key={t.id} 
            className="flex-1 flex flex-col items-center justify-center py-2 gap-1 relative text-app-nav-text-muted hover:text-app-nav-text transition-colors"
            onClick={() => navigate(t.path)}
          >
            <Icon size={20} className={isActive ? "text-app-nav-text font-black" : ""} />
            <span className={cn("text-[10px] font-bold", isActive ? "text-app-nav-text font-black" : "")}>{t.label}</span>
            {isActive && <motion.div layoutId="bottom-dot" className="w-1 h-1 rounded-full bg-app-nav-text absolute bottom-1" />}
          </button>
        );
      })}
    </div>
  );
}

