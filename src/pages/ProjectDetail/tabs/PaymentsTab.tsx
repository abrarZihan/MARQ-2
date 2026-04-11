import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { BDT, uid, cn, tsNow } from "../../../lib/utils";
import { ReceiptSheet } from "../../../components/ProjectModals";
import { CreditCard, CheckCircle2, Clock, FileText } from "lucide-react";
import { useLanguage } from "../../../lib/i18n";
import { useAppStore } from "../../../store/appStore";
import { db, handleFirestoreError, OperationType } from "../../../firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

export default function PaymentsTab({ projectId }: { projectId: string }) {
  const { t } = useLanguage();
  const { projects, clients, instDefs, payments, auth, setToast } = useAppStore();
  
  const project = projects.find(p => p.id === projectId);
  const isSuperAdmin = auth?.role === "superadmin";
  const adminUser = auth?.user;

  const [viewR, setViewR] = useState<any>(null);

  const showToast = (m: string, t: 's' | 'e' = 's') => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 3000);
  };

  const addLog = async (action: string, target: any, detail: any) => {
    if (!adminUser) return;
    const sTarget = typeof target === 'object' ? JSON.stringify(target) : String(target || "");
    const sDetail = typeof detail === 'object' ? JSON.stringify(detail) : String(detail || "");
    const newLog = { id: uid("LOG"), adminId: adminUser.id, adminName: adminUser.name, action, target: sTarget, detail: sDetail, projectId, ts: tsNow() };
    try {
      await setDoc(doc(db, "logs", newLog.id), newLog);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `logs/${newLog.id}`);
    }
  };

  const onDeletePayment = async (id: string) => {
    const p = payments.find(x => x.id === id);
    try {
      await deleteDoc(doc(db, "payments", id));
      if (p) {
        const c = clients.find(cl => cl.id === p.clientId);
        const d = instDefs.find(di => di.id === p.instDefId);
        addLog("payment_delete", `${c?.name || p.clientId}`, `${BDT(p.amount)} — ${d?.title}`);
      }
      showToast(t("common.success_deleted"));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `payments/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  if (!project) return null;

  const allPrjClients = clients.filter((c: any) => c.projectId === projectId);
  const allPrjDefs = instDefs.filter((d: any) => d.projectId === projectId);
  
  const prjPayments = payments.filter((p: any) => {
    return allPrjClients.some((c: any) => c.id === p.clientId);
  }).sort((a: any, b: any) => b.date.localeCompare(a.date));

  const projectCollected = prjPayments
    .filter((p: any) => p.status === "approved" && allPrjDefs.some(d => d.id === p.instDefId))
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-app-surface rounded-3xl border border-app-border p-6 flex items-center gap-5 mb-6 shadow-sm">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/30">
          <CreditCard size={32} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-app-text-secondary uppercase tracking-wider mb-1 truncate">{t("project_detail.total_collected")}</div>
          <div className="text-3xl font-black text-app-text-primary tracking-tight">{BDT(projectCollected)}</div>
        </div>
      </div>

      <div className="space-y-3">
        {prjPayments.length === 0 ? (
          <div className="text-center py-12 bg-app-surface rounded-3xl border border-app-border text-app-text-muted font-bold text-sm">
            {t("project_detail.no_activity") || "No payments found"}
          </div>
        ) : (
          prjPayments.map((p: any, i: number) => {
            const client = allPrjClients.find((c: any) => c.id === p.clientId);
            const def = allPrjDefs.find((d: any) => d.id === p.instDefId);
            return (
              <div key={`${p.id}-${i}`} className="bg-app-surface rounded-2xl border border-app-border p-4 shadow-sm flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", p.status === "approved" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20")}>
                  {p.status === "approved" ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-app-text-primary truncate">{client?.name || "Unknown Client"}</div>
                  <div className="text-[10px] text-app-text-secondary font-medium mt-0.5 truncate">{def?.title || "Unknown Installment"} · {p.date}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-sm font-black text-app-text-primary">{BDT(p.amount)}</div>
                  {p.status === "approved" && (
                    <button 
                      onClick={() => setViewR({ payment: p, client, instDef: def })}
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
      </div>

      <AnimatePresence>
        {viewR && (
          <ReceiptSheet 
            payment={viewR.payment} 
            instDef={viewR.instDef} 
            client={viewR.client} 
            project={project} 
            isSuperAdmin={isSuperAdmin}
            onDelete={onDeletePayment}
            onClose={() => setViewR(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
