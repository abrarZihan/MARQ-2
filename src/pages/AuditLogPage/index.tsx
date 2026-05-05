import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ClipboardList, Search, Trash2, 
  User, Info, Building2, CircleDollarSign, Users, Pickaxe, Shield, FileText, CheckCircle2, Clock, XCircle, UserPlus, Edit2, RefreshCw, UserMinus, Building, ShieldPlus, ShieldMinus, KeyRound, Key, Loader2, ChevronDown
} from "lucide-react";
import { useLanguage } from "../../lib/i18n";
import { cn, fmtTs } from "../../lib/utils";
import { ACTION_META } from "../../lib/data";
import { ConfirmDelete } from "../../components/Shared";

import { useAppStore } from "../../store/appStore";
import { useActions } from "../../hooks/useActions";
import { Log, Project } from "../../types";
import { collection, query, where, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "../../firebase";

import { LogRow } from "../../components/Admin";
import RecoveryPanel from "../../components/Admin/RecoveryPanel";

export default function AuditLogPage() {
  const { t } = useLanguage();
  const { projects, auth } = useAppStore();
  const actions = useActions();
  
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const [pageLogs, setPageLogs] = useState<Log[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const isSuperAdmin = auth?.role === "superadmin";

  const fetchLogs = useCallback(async (isNext = false) => {
    if (loading || (isNext && !hasMore)) return;
    
    if (isNext) setLoadingMore(true);
    else {
      setLoading(true);
      setPageLogs([]);
      setLastDoc(null);
    }

    try {
      let q = query(
        collection(db, "logs"),
        orderBy("ts", "desc"),
        limit(20)
      );

      if (filter !== "all") {
        q = query(q, where("action", ">=", filter), where("action", "<=", filter + "\uf8ff"));
      }

      if (isNext && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snap = await getDocs(q);
      const newLogs = snap.docs.map(d => ({ ...d.data(), id: d.id } as Log));
      
      setPageLogs(prev => isNext ? [...prev, ...newLogs] : newLogs);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === 20);
    } catch (e) {
      console.error("Fetch logs error:", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter, hasMore, lastDoc, loading]);

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const filtered = pageLogs.filter((l: Log) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (l.adminName || "").toLowerCase().includes(q) || 
      (l.target || "").toLowerCase().includes(q) || 
      (l.detail || "").toLowerCase().includes(q) ||
      (l.action || "").toLowerCase().includes(q)
    );
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
        {isSuperAdmin && pageLogs.length > 0 && (
          <button 
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 rounded-xl text-xs font-black hover:bg-rose-200 dark:hover:bg-rose-500/20 transition-all border border-rose-200 dark:border-rose-500/20 shadow-sm active:scale-95"
          >
            <Trash2 size={14} />
            {t('common.clear_logs')}
          </button>
        )}
      </div>

      {isSuperAdmin && <RecoveryPanel />}

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

      <div className="bg-app-surface rounded-3xl border border-app-border p-2 shadow-sm min-h-[300px]">
        {loading && pageLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-app-tab-active animate-spin" />
            <div className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest">{t('common.loading')}</div>
          </div>
        ) : (
          <>
            {filtered.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-16 h-16 bg-app-bg rounded-full flex items-center justify-center mx-auto mb-4 border border-app-border text-app-text-muted">
                  <ClipboardList size={32} />
                </div>
                <div className="text-sm font-black text-app-text-primary">{t('common.no_records')}</div>
                <div className="text-[10px] font-bold text-app-text-muted mt-1 uppercase tracking-widest">{t('common.try_adjust_filters') || 'Try adjusting filters'}</div>
              </div>
            ) : (
              <div className="px-4">
                {filtered.map((l, i) => <LogRow key={`${l.id}-${i}`} log={l} projects={projects} />)}
              </div>
            )}
            
            {hasMore && (
              <div className="py-6 flex justify-center border-t border-app-border mt-2">
                <button 
                  disabled={loadingMore}
                  onClick={() => fetchLogs(true)}
                  className="bg-app-surface border border-app-border text-app-text-primary px-6 py-3 rounded-2xl text-xs font-black hover:bg-app-bg shadow-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <><Loader2 size={16} className="animate-spin" /> {t('common.loading')}</>
                  ) : (
                    <><ChevronDown size={16} /> {t('common.load_more') || 'Load More'}</>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {showClearConfirm && (
          <ConfirmDelete 
            message={t('common.clear_logs_confirm')} 
            onConfirm={() => { 
                actions.clearLogs(); 
                setPageLogs([]); 
                setLastDoc(null);
                setHasMore(false);
                setShowClearConfirm(false); 
            }} 
            onClose={() => setShowClearConfirm(false)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
