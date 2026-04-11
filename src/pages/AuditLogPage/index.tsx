import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ClipboardList, Search, Trash2, 
  User, Info, Building2, CircleDollarSign, Users, Pickaxe, Shield, FileText, CheckCircle2, Clock, XCircle, UserPlus, Edit2, RefreshCw, UserMinus, Building, ShieldPlus, ShieldMinus, KeyRound, Key
} from "lucide-react";
import { useLanguage } from "../../lib/i18n";
import { cn, fmtTs } from "../../lib/utils";
import { ACTION_META } from "../../lib/data";
import { ConfirmDelete } from "../../components/Shared";

interface AuditLogPageProps {
  logs: any[];
  projects: any[];
  isSuperAdmin: boolean;
  onClearLogs: () => void;
}

function LogRow({ log, projects }: any) {
  const { t } = useLanguage();
  const m = ACTION_META[log.action] || { icon: "FileText", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-500/10" };
  const label = t('common.actions.' + log.action) || log.action;
  const prj = projects?.find((p: any) => p.id === log.projectId);
  
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "CircleDollarSign": return <CircleDollarSign size={18} />;
      case "Clock": return <Clock size={18} />;
      case "CheckCircle2": return <CheckCircle2 size={18} />;
      case "XCircle": return <XCircle size={18} />;
      case "Trash2": return <Trash2 size={18} />;
      case "UserPlus": return <UserPlus size={18} />;
      case "Edit2": return <Edit2 size={18} />;
      case "RefreshCw": return <RefreshCw size={18} />;
      case "UserMinus": return <UserMinus size={18} />;
      case "Building2": return <Building2 size={18} />;
      case "ClipboardList": return <ClipboardList size={18} />;
      case "Building": return <Building size={18} />;
      case "ShieldPlus": return <ShieldPlus size={18} />;
      case "ShieldMinus": return <ShieldMinus size={18} />;
      case "KeyRound": return <KeyRound size={18} />;
      case "Key": return <Key size={18} />;
      default: return <FileText size={18} />;
    }
  };

  return (
    <div className="flex items-start gap-3 py-4 border-b border-app-border last:border-0 transition-colors">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", m.bg, m.color)}>
        {getIcon(m.icon)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-app-text-primary">{log.adminName}</span>
            <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider", m.bg, m.color)}>{label}</span>
          </div>
          <span className="text-[10px] font-bold text-app-text-muted whitespace-nowrap">{fmtTs(log.ts)}</span>
        </div>
        <div className="text-xs text-app-text-secondary font-medium leading-relaxed">
          {log.target && <span className="font-bold text-app-text-primary">{log.target}</span>}
          {log.detail && <span className="text-app-text-muted"> • {log.detail}</span>}
        </div>
        {prj && (
          <div className="flex items-center gap-1 mt-2 text-app-tab-active">
            <Building2 size={10} />
            <span className="text-[10px] font-black uppercase tracking-widest">{prj.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditLogPage({ logs, projects, isSuperAdmin, onClearLogs }: AuditLogPageProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filtered = [...logs]
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .filter(l => {
      const matchFilter = filter === "all" || l.action.startsWith(filter);
      const q = search.toLowerCase();
      const matchSearch = !q || 
        l.adminName.toLowerCase().includes(q) || 
        l.target.toLowerCase().includes(q) || 
        (l.detail || "").toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });

  const cats = [
    { id: "all", label: t('common.all'), icon: ClipboardList },
    { id: "payment", label: t('common.payment'), icon: CircleDollarSign },
    { id: "client", label: t('common.client'), icon: Users },
    { id: "expense", label: t('common.expenses'), icon: Pickaxe },
    { id: "admin", label: t('common.admin'), icon: Shield },
    { id: "project", label: t('common.project'), icon: Building }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-app-text-primary tracking-tight">{t('common.activity_log')}</h1>
          <p className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest mt-1">
            {t('common.records_count', { count: filtered.length })}
          </p>
        </div>
        {isSuperAdmin && logs.length > 0 && (
          <button 
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 rounded-xl text-xs font-black hover:bg-rose-200 dark:hover:bg-rose-500/20 transition-all border border-rose-200 dark:border-rose-500/20 shadow-sm active:scale-95"
          >
            <Trash2 size={14} />
            {t('common.clear_logs')}
          </button>
        )}
      </div>

      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-app-text-muted" size={18} />
          <input 
            className="w-full pl-12 pr-4 py-3.5 bg-app-surface border border-app-border rounded-2xl text-sm font-bold focus:outline-none focus:border-app-tab-active focus:ring-4 focus:ring-app-tab-active/10 transition-all text-app-text-primary placeholder:text-app-text-muted/50 shadow-sm"
            placeholder={t('common.search_logs_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {cats.map(c => {
            const Icon = c.icon;
            const isActive = filter === c.id;
            return (
              <button 
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap border transition-all flex items-center gap-2", 
                  isActive 
                    ? "bg-app-tab-active text-app-surface border-app-tab-active shadow-md shadow-app-tab-active/20" 
                    : "bg-app-surface text-app-text-muted border-app-border hover:border-app-text-muted hover:text-app-text-primary"
                )}
              >
                <Icon size={12} />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-app-surface rounded-3xl border border-app-border p-2 shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-app-bg rounded-full flex items-center justify-center mx-auto mb-4 border border-app-border text-app-text-muted">
              <ClipboardList size={32} />
            </div>
            <div className="text-sm font-black text-app-text-primary">{t('common.no_records')}</div>
            <div className="text-[10px] font-bold text-app-text-muted mt-1 uppercase tracking-widest">Try adjusting your filters</div>
          </div>
        ) : (
          <div className="px-4">
            {filtered.map((l, i) => <LogRow key={`${l.id}-${i}`} log={l} projects={projects} />)}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showClearConfirm && (
          <ConfirmDelete 
            message={t('common.clear_logs_confirm')} 
            onConfirm={() => { onClearLogs(); setShowClearConfirm(false); }} 
            onClose={() => setShowClearConfirm(false)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
