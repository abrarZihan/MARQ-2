import { useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { BDT, uid, cn, tsNow } from "../../../lib/utils";
import { ReceiptSheet } from "../../../components/ProjectModals";
import { CreditCard, CheckCircle2, Clock, FileText, Loader2, ChevronDown } from "lucide-react";
import { useLanguage } from "../../../lib/i18n";
import { useAppStore } from "../../../store/appStore";
import { db, handleFirestoreError, OperationType } from "../../../firebase";
import { doc, setDoc, deleteDoc, collection, query, where, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { Payment, Client, InstDef } from "../../../types";

import { useActions } from "../../../hooks/useActions";

export default function PaymentsTab({ projectId }: { projectId: string }) {
  const { t } = useLanguage();
  const { projects, clients, instDefs, auth, setToast } = useAppStore();
  const actions = useActions();
  
  const project = projects.find(p => p.id === projectId);
  const isSuperAdmin = auth?.role === "superadmin";

  const [viewR, setViewR] = useState<{payment: Payment, client: Client, instDef: InstDef} | null>(null);
  const [totalApproved, setTotalApproved] = useState(0);

  const [pagePayments, setPagePayments] = useState<Payment[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchPayments = useCallback(async (isNext = false) => {
    if (loading || (isNext && !hasMore)) return;
    
    if (isNext) setLoadingMore(true);
    else {
      setLoading(true);
      setPagePayments([]);
      setLastDoc(null);
    }

    try {
      // Note: We're using the new projectId field. For old data without it,
      // they might not show up here unless a migration is run.
      let q = query(
        collection(db, "payments"),
        where("projectId", "==", projectId),
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
      console.error("Fetch project payments error:", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [projectId, hasMore, lastDoc, loading]);

  useEffect(() => {
    fetchPayments();
    const fetchTotal = async () => {
      const q = query(collection(db, "payments"), where("projectId", "==", projectId), where("status", "==", "approved"));
      const snap = await getDocs(q);
      setTotalApproved(snap.docs.reduce((s, d) => s + (d.data().amount || 0), 0));
    };
    fetchTotal();
  }, [projectId]);

  if (!project) return null;

  const allPrjClients = clients.filter((c: Client) => c.projectId === projectId);
  const allPrjDefs = instDefs.filter((d: InstDef) => d.projectId === projectId);
  
  // Since we fetch only approved/all payments for this project from server, 
  // we can just use pagePayments. 
  const prjPayments = pagePayments;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-app-surface rounded-3xl border border-app-border p-6 flex items-center gap-5 mb-6 shadow-sm">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/30">
          <CreditCard size={32} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-app-text-secondary uppercase tracking-wider mb-1 truncate">{t("project_detail.total_collected")}</div>
          <div className="text-3xl font-black text-app-text-primary tracking-tight">{BDT(totalApproved)}</div>
        </div>
      </div>

      <div className="space-y-3">
        {loading && pagePayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-app-tab-active animate-spin" />
            <div className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest">{t('common.loading')}</div>
          </div>
        ) : (
          <>
            {prjPayments.length === 0 ? (
              <div className="text-center py-12 bg-app-surface rounded-3xl border border-app-border text-app-text-muted font-bold text-sm">
                {t("project_detail.no_activity") || "No payments found"}
              </div>
            ) : (
              prjPayments.map((p: Payment, i: number) => {
                const client = allPrjClients.find((c: Client) => c.id === p.clientId);
                const def = allPrjDefs.find((d: InstDef) => d.id === p.instDefId);
                return (
                  <div key={`${p.id}-${i}`} className="bg-app-surface rounded-2xl border border-app-border p-4 shadow-sm flex items-center gap-4 transition-all hover:bg-app-surface-elevated">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", p.status === "approved" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : p.status === "rejected" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20")}>
                      {p.status === "approved" ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-app-text-primary truncate">{client?.name || p.clientId}</div>
                      <div className="text-[10px] text-app-text-secondary font-medium mt-0.5 truncate">{def?.title || "Unknown Installment"} · {p.date}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-sm font-black text-app-text-primary">{BDT(p.amount)}</div>
                      {p.status === "approved" && (
                        <button 
                          onClick={() => setViewR({ payment: p, client: client!, instDef: def! })}
                          className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1"
                        >
                          <FileText size={12} /> {t("modal.receipt")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
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
        {viewR && (
          <ReceiptSheet 
            payment={viewR.payment} 
            instDef={viewR.instDef} 
            client={viewR.client} 
            project={project} 
            isSuperAdmin={isSuperAdmin}
            onDelete={(id) => {
              actions.deletePayment(id);
              setPagePayments(prev => prev.filter(p => p.id !== id));
            }}
            onClose={() => setViewR(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
