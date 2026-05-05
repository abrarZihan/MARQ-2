import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, limit, writeBatch, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { Log, Client, InstDef, Payment } from "../../types";
import { useLanguage } from "../../lib/i18n";
import { BDT, uid, tsNow } from "../../lib/utils";
import { Loader2, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAppStore } from "../../store/appStore";

export default function RecoveryPanel({ projectId }: { projectId?: string | null }) {
  const { t } = useLanguage();
  const { clients, plans, instDefs, projects } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [deletedCols, setDeletedCols] = useState<{ id: string; title: string; ts: string; planId?: string }[]>([]);
  const [recoveredData, setRecoveredData] = useState<{
    colTitle: string;
    payments: { clientId: string; clientName: string; amount: number; date: string }[];
  }[]>([]);
  const [restored, setRestored] = useState(false);

  const scanLogs = async () => {
    setLoading(true);
    try {
      // 1. Find the deletion logs
      const q = query(
        collection(db, "logs"),
        where("action", "==", "instdef_delete"),
        orderBy("ts", "desc"),
        limit(5)
      );
      const snap = await getDocs(q);
      const logs = snap.docs.map(d => ({ ...d.data(), id: d.id } as Log));
      
      const cols = logs.map(l => ({
        id: l.id,
        title: l.target,
        ts: l.ts,
        // We try to infer project/plan from the log if possible
        projectId: l.projectId
      }));
      setDeletedCols(cols);

      // 2. For each deleted column, find payments and the original target amount
      const results = [];
      for (const col of cols) {
        // Find original addition log to get target amount
        const addLogQuery = query(
          collection(db, "logs"),
          where("action", "==", "instdef_add"),
          where("target", "==", col.title),
          limit(1)
        );
        const addSnap = await getDocs(addLogQuery);
        let targetAmount = 0;
        if (!addSnap.empty) {
          const detail = addSnap.docs[0].data().detail;
          const match = detail.match(/৳(\d+)/);
          if (match) targetAmount = parseInt(match[1]);
        }

        const pLogsQuery = query(
          collection(db, "logs"),
          where("action", "in", ["payment_add", "payment_approved"]),
          orderBy("ts", "desc")
        );
        const pSnap = await getDocs(pLogsQuery);
        const pLogs = pSnap.docs.map(d => ({ ...d.data(), id: d.id } as Log));
        
        // Filter logs that mention this column title in the detail
        const matchingPayments = pLogs.filter(l => l.detail.includes(`— ${col.title}`));
        
        const reconstructed = matchingPayments.map(l => {
          // Parse detail: "৳5000 — Column Title"
          const amountMatch = l.detail.match(/৳(\d+)/);
          const amount = amountMatch ? parseInt(amountMatch[1]) : 0;
          
          // Parse target: "ID - Name"
          const targetParts = l.target.split(" - ");
          const clientId = targetParts[0];
          const clientName = targetParts[1] || "";
          
          return { clientId, clientName, amount, date: l.ts };
        });

        if (reconstructed.length > 0) {
          results.push({
            colTitle: col.title,
            targetAmount,
            payments: reconstructed
          });
        }
      }
      setRecoveredData(results);
    } catch (e) {
      console.error("Recovery scan error:", e);
    } finally {
      setLoading(false);
    }
  };

  const performRestore = async (colTitle: string, targetAmount: number, paymentsToRestore: any[]) => {
    if (!window.confirm(`Are you sure you want to restore the column "${colTitle}" and its ${paymentsToRestore.length} payments?`)) return;
    
    setLoading(true);
    try {
      // Find plans for the specific project if possible
      const targetProject = projects.find(p => projects.some(pr => pr.id === p.id)); // Dummy search
      
      const firstPlan = plans[0]; // Fallback
      if (!firstPlan) throw new Error("No plan found to attach recovered column");

      const newId = uid("DEF-");
      const newDef: InstDef = {
        id: newId,
        projectId: firstPlan.projectId,
        planId: firstPlan.id,
        title: colTitle,
        dueDate: tsNow().split("T")[0],
        targetAmount: targetAmount || paymentsToRestore[0]?.amount || 0,
      };

      const batch = writeBatch(db);
      batch.set(doc(db, "instDefs", newDef.id), newDef);

      // 2. Re-create the payments
      paymentsToRestore.forEach(p => {
        const payId = uid("PAY-");
        const pay: Payment = {
          id: payId,
          clientId: p.clientId,
          instDefId: newDef.id,
          amount: p.amount,
          date: p.date,
          status: "approved",
          approvedBy: "System-Recovered",
          note: `Recovered from logs (Column: ${colTitle})`,
          projectId: firstPlan.projectId
        };
        batch.set(doc(db, "payments", pay.id), pay);
      });

      await batch.commit();
      setRestored(true);
      alert("Restore complete! Please refresh to see the changes.");
    } catch (e: any) {
      alert("Restore failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (restored) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
        <h3 className="text-lg font-black text-green-800">Successfully Restored!</h3>
        <p className="text-sm text-green-600">The data has been injected back into your project.</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-green-600 text-white rounded-xl font-bold">Refresh Page</button>
      </div>
    );
  }

  return (
    <div className="bg-app-surface border border-dashed border-app-tab-active/40 rounded-3xl p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-black text-app-text-primary flex items-center gap-2">
            <RotateCcw className="text-app-tab-active" size={20} />
            Data Recovery Assistant
          </h2>
          <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">
            Scan logs to find and restore deleted columns and payments
          </p>
        </div>
        <button 
          onClick={scanLogs}
          disabled={loading}
          className="px-4 py-2 bg-app-tab-active text-white rounded-xl text-xs font-black shadow-lg shadow-app-tab-active/20 flex items-center gap-2 hover:scale-105 transition-all"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
          Scan for Deleted Data
        </button>
      </div>

      {recoveredData.length > 0 ? (
        <div className="space-y-4">
          <div className="bg-amber-100/50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="text-amber-600 shrink-0" size={20} />
            <div>
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Discovery Successful!</p>
              <p className="text-[11px] text-amber-700 font-medium">Found logs for deleted columns. Review the details below before restoring.</p>
            </div>
          </div>
          
          <div className="grid gap-3">
            {recoveredData.map((res, i) => (
              <div key={i} className="bg-app-bg border border-app-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-app-border">
                  <div>
                    <div className="text-xs font-black text-app-text-primary">{res.colTitle}</div>
                    <div className="text-[10px] font-bold text-app-text-muted">{res.payments.length} Payments Found</div>
                  </div>
                  <button 
                    onClick={() => performRestore(res.colTitle, (res as any).targetAmount, res.payments)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-black hover:bg-green-700"
                  >
                    Restore This Column
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-2 thin-scrollbar">
                  {res.payments.map((p, j) => (
                    <div key={j} className="flex items-center justify-between text-[10px] py-1">
                      <span className="text-app-text-muted font-bold">{p.clientId} - {p.clientName}</span>
                      <span className="text-green-600 font-black">{BDT(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !loading && (
          <div className="py-10 text-center border border-dashed border-app-border rounded-2xl">
            <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">No recovery data loaded yet. Click scan to begin.</p>
          </div>
        )
      )}
    </div>
  );
}
