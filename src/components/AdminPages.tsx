import { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "../lib/i18n";
import { motion, AnimatePresence } from "motion/react";
import { BDT, BDTshort, ac, initials, uid, todayStr, cn } from "../lib/utils";
import { FG, ConfirmDelete } from "./Shared";
import { Eye, EyeOff, ShieldPlus, KeyRound, Trash2, ShieldMinus, Search, Receipt, Loader2, ChevronDown } from "lucide-react";
import { ReceiptSheet } from "./ProjectModals";

import { useAppStore } from "../store/appStore";
import { useActions } from "../hooks/useActions";
import { Payment, Client, InstDef, Project } from "../types";
import { collection, query, where, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "../firebase";

export function AdminPaymentsPage() {
  const { t } = useLanguage();
  const { clients, instDefs, projects, auth } = useAppStore();
  const actions = useActions();
  
  const [selPay, setSelPay] = useState<Payment | null>(null);
  const [search, setSearch] = useState("");
  
  const [pagePayments, setPagePayments] = useState<Payment[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const isSuperAdmin = auth?.role === "superadmin";

  const fetchPayments = useCallback(async (isNext = false) => {
    if (loading || (isNext && !hasMore)) return;
    
    if (isNext) setLoadingMore(true);
    else {
      setLoading(true);
      setPagePayments([]);
      setLastDoc(null);
    }

    try {
      let q = query(
        collection(db, "payments"),
        where("status", "==", "approved"),
        orderBy("date", "desc"),
        limit(20)
      );

      if (isNext && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snap = await getDocs(q);
      const newPayments = snap.docs.map(d => ({ ...d.data(), id: d.id } as Payment));
      
      setPagePayments(prev => isNext ? [...prev, ...newPayments] : newPayments);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === 20);
    } catch (e) {
      console.error("Fetch payments error:", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [loading, hasMore, lastDoc]);

  useEffect(() => {
    fetchPayments();
  }, []);

  // For the search, since Firestore can't do substr search across fields, 
  // we filter the ALREADY FETCHED paginated results. 
  // If the user wants a full search, they usually search by ID or specific field.
  const filtered = pagePayments.filter((p: Payment) => {
    const c = clients.find((cl: Client) => cl.id === p.clientId);
    const d = instDefs.find((di: InstDef) => di.id === p.instDefId);
    const prj = projects.find((pr: Project) => pr.id === c?.projectId);
    const s = search.toLowerCase();
    if (!s) return true;
    return (
      (c?.name || "").toLowerCase().includes(s) ||
      (c?.id || "").toLowerCase().includes(s) ||
      (d?.title || "").toLowerCase().includes(s) ||
      (prj?.name || "").toLowerCase().includes(s)
    );
  });

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
        {loading && pagePayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-app-tab-active animate-spin" />
            <div className="text-xs font-bold text-app-text-muted uppercase tracking-widest">{t('common.loading')}</div>
          </div>
        ) : (
          <>
            {filtered.map((p: Payment) => {
              const c = clients.find((cl: Client) => cl.id === p.clientId);
              const d = instDefs.find((di: InstDef) => di.id === p.instDefId);
              const prj = projects.find((pr: Project) => pr.id === c?.projectId);
              
              return (
                <div key={p.id} className="bg-app-surface rounded-2xl border border-app-border p-4 shadow-sm flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-extrabold text-app-text-primary">{c?.name || p.clientId}</div>
                    <div className="text-[10px] font-bold text-app-text-muted uppercase tracking-wider mb-1 line-clamp-1">
                      {prj?.name} • {d?.title}
                    </div>
                    <div className="text-xs font-bold text-app-text-muted">{p.date}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mb-2">{BDT(p.amount)}</div>
                    <button 
                      className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 dark:text-blue-400 hover:opacity-80 underline uppercase tracking-wider ml-auto"
                      onClick={() => setSelPay(p)}
                    >
                      <Receipt size={12} />
                      {t('modal.receipt') || 'রসিদ'}
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && !loading && (
              <div className="text-center py-12 bg-app-surface rounded-3xl border border-app-border border-dashed">
                <div className="text-app-text-muted mb-2 flex justify-center"><Receipt size={48} /></div>
                <div className="text-sm font-bold text-app-text-muted">{t('project_detail.no_activity')}</div>
              </div>
            )}
            
            {hasMore && (
              <div className="pt-4 flex justify-center">
                <button 
                  disabled={loadingMore}
                  onClick={() => fetchPayments(true)}
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
        {selPay && (
          <ReceiptSheet 
            payment={selPay} 
            client={clients.find((c: Client) => c.id === selPay.clientId)} 
            project={projects.find((pr: Project) => pr.id === clients.find((c: Client) => c.id === selPay.clientId)?.projectId)}
            instDef={instDefs.find((d: InstDef) => d.id === selPay.instDefId)}
            isSuperAdmin={isSuperAdmin}
            onDelete={actions.deletePayment}
            onClose={() => setSelPay(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
