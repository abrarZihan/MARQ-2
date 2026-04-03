import { useState } from "react";
import { BDT, BDTshort, dotJoin, ac, initials, fmtTs, uid, todayStr, clientPaidForDef, cellStatus, cn } from "../lib/utils";
import { ACTION_META, EXP_CATS, STATUS, STATUS_LABEL } from "../lib/data";
import { Badge, PBar, FG, ClientAvatar, PassCell, ConfirmDelete } from "./Shared";
import { motion } from "motion/react";
import { Building2, CheckCircle2, Clock, Trash2, Edit2, UserPlus, FileText, Pickaxe, HardHat, Package, Users, Zap, Droplets, Paintbrush, Box, CircleDollarSign, XCircle, RefreshCw, UserMinus, Building, ShieldPlus, ShieldMinus, KeyRound, Key, ClipboardList, Shield } from "lucide-react";

import { useLanguage } from "../lib/i18n";

export function LogRow({ log, projects }: any) {
  const { t } = useLanguage();
  const m = ACTION_META[log.action] || { icon: "FileText", color: "text-slate-600", bg: "bg-slate-100" };
  const label = t('common.actions.' + log.action) || log.action;
  const prj = projects?.find((p: any) => p.id === log.projectId);
  
  // Map string icons to Lucide components
  const IconComponent = m.icon === "CircleDollarSign" ? <CircleDollarSign size={20} className="text-emerald-700" /> : 
                        m.icon === "Clock" ? <Clock size={20} className="text-amber-700" /> :
                        m.icon === "CheckCircle2" ? <CheckCircle2 size={20} className="text-emerald-700" /> :
                        m.icon === "XCircle" ? <XCircle size={20} className="text-rose-600" /> :
                        m.icon === "Trash2" ? <Trash2 size={20} className="text-rose-600" /> :
                        m.icon === "UserPlus" ? <UserPlus size={20} className="text-blue-700" /> :
                        m.icon === "Edit2" ? <Edit2 size={20} className="text-amber-700" /> :
                        m.icon === "RefreshCw" ? <RefreshCw size={20} className="text-violet-700" /> :
                        m.icon === "UserMinus" ? <UserMinus size={20} className="text-rose-600" /> :
                        m.icon === "Building2" ? <Building2 size={20} className="text-violet-700" /> :
                        m.icon === "ClipboardList" ? <ClipboardList size={20} className="text-cyan-700" /> :
                        m.icon === "Building" ? <Building size={20} className="text-emerald-700" /> :
                        m.icon === "ShieldPlus" ? <ShieldPlus size={20} className="text-emerald-700" /> :
                        m.icon === "ShieldMinus" ? <ShieldMinus size={20} className="text-rose-600" /> :
                        m.icon === "KeyRound" ? <KeyRound size={20} className="text-orange-600" /> :
                        m.icon === "Key" ? <Key size={20} className="text-cyan-700" /> : <FileText size={20} />;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg", m.bg)}>
        {IconComponent}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-extrabold text-slate-900">{log.adminName}</span>
          <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold", m.bg, m.color)}>{label}</span>
          {prj && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">{prj.name}</span>}
        </div>
        <div className="text-xs text-slate-600 font-medium">
          {dotJoin(
            typeof log.target === 'object' ? JSON.stringify(log.target) : log.target, 
            typeof log.detail === 'object' ? JSON.stringify(log.detail) : log.detail
          )}
        </div>
        <div className="text-[10px] text-slate-400 mt-1 font-medium">{fmtTs(log.ts)}</div>
      </div>
    </div>
  );
}

export function AuditLogPage({ logs, projects, isSuperAdmin, onClearLogs }: any) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const filtered = [...logs].sort((a, b) => b.ts.localeCompare(a.ts)).filter(l => {
    const matchFilter = filter === "all" || l.action.startsWith(filter);
    const q = search.toLowerCase();
    const matchSearch = !q || l.adminName.toLowerCase().includes(q) || l.target.toLowerCase().includes(q) || (l.detail || "").toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });
  
  const cats = [
    ["all", t('common.all')], ["payment", <span className="flex items-center gap-1"><CircleDollarSign size={12} /> {t('common.payment')}</span>], 
    ["client", <span className="flex items-center gap-1"><Users size={12} /> {t('common.client')}</span>], 
    ["expense", <span className="flex items-center gap-1"><Pickaxe size={12} /> {t('common.expenses')}</span>], 
    ["admin", <span className="flex items-center gap-1"><Shield size={12} /> {t('common.admin')}</span>], 
    ["project", <span className="flex items-center gap-1"><Building size={12} /> {t('common.project')}</span>]
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">{t('common.activity_log')}</h1>
          <p className="text-xs font-medium text-slate-500">{t('common.records_count', { count: filtered.length })}</p>
        </div>
        {isSuperAdmin && logs.length > 0 && (
          <button 
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors"
          >
            <Trash2 size={14} />
            {t('common.clear_logs')}
          </button>
        )}
      </div>
      
      <input 
        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all mb-3" 
        placeholder={t('common.search_logs_placeholder')} 
        value={search} onChange={e => setSearch(e.target.value)} 
      />
      
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {cats.map(([v, l]) => (
          <button 
            key={v} 
            onClick={() => setFilter(v)} 
            className={cn(
              "px-4 py-1.5 rounded-full border-2 text-xs font-bold whitespace-nowrap transition-colors",
              filter === v ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            )}
          >
            {l}
          </button>
        ))}
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 p-2">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-400 font-medium">{t('common.no_records')}</div>
        ) : (
          filtered.map((l, i) => <LogRow key={`${l.id}-${i}`} log={l} projects={projects} />)
        )}
      </div>

      {showClearConfirm && (
        <ConfirmDelete 
          message={t('common.clear_logs_confirm')} 
          onConfirm={() => { onClearLogs(); setShowClearConfirm(false); }} 
          onClose={() => setShowClearConfirm(false)} 
        />
      )}
    </motion.div>
  );
}

// Helper for Tailwind classes
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
