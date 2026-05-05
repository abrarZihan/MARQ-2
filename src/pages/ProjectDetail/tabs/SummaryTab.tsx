import { useState } from "react";
import { BDT, BDTshort, cn } from "../../../lib/utils";
import { ClientAvatar, PBar } from "../../../components/Shared";
import { useLanguage } from "../../../lib/i18n";
import { useAppStore } from "../../../store/appStore";
import { Plan, Client, InstDef, Payment } from "../../../types";
import { ArrowUpDown } from "lucide-react";

export default function SummaryTab({ projectId }: { projectId: string }) {
  const { t, lang } = useLanguage();
  const { clients, instDefs, plans, payments } = useAppStore();
  const [dueSortOrder, setDueSortOrder] = useState<"asc" | "desc">("desc");

  const prjPlans = plans.filter((pl: Plan) => pl.projectId === projectId);
  const prjClients = clients.filter((c: Client) => c.projectId === projectId);
  
  const prjPlanIds = new Set(prjPlans.map(pl => pl.id));
  const allPrjDefs = instDefs.filter((d: InstDef) => prjPlanIds.has(d.planId));

  const clientsWithDue = prjClients.map((c: Client) => {
    const cPaid = payments
      .filter((p: Payment) => p.clientId === c.id && p.status === "approved" && allPrjDefs.some(d => d.id === p.instDefId))
      .reduce((s: number, p: Payment) => s + p.amount, 0);

    const assignments = c.planAssignments || [];
    let cTarget = 0;

    if (assignments.length > 0) {
      cTarget = assignments.reduce((as: number, pa) => {
        const pDefs = instDefs.filter((d: InstDef) => d.planId === pa.planId);
        return as + (pDefs.reduce((ds: number, d: InstDef) => ds + d.targetAmount, 0) * (pa.shareCount || 1));
      }, 0);
    } else {
      const firstPlan = prjPlans[0];
      if (firstPlan) {
        const pDefs = instDefs.filter((d: InstDef) => d.planId === firstPlan.id);
        cTarget = (pDefs.reduce((ds: number, d: InstDef) => ds + d.targetAmount, 0) * (c.shareCount || 1));
      }
    }

    const due = Math.max(0, cTarget - cPaid);
    const displayShareCount = assignments.length > 0 ? assignments[0].shareCount : (c.shareCount || 1);

    return { ...c, cPaid, cTarget, due, displayShareCount };
  });

  const sortedClients = [...clientsWithDue].sort((a, b) => {
    if (dueSortOrder === "asc") return a.due - b.due;
    return b.due - a.due;
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-3">
      <div className="flex justify-between items-center px-1 mb-2">
        <div className="text-xs font-bold text-app-text-muted flex items-center gap-2">
          {t("project_detail.clients_summary") || "Client Summary"}
        </div>
        <button 
          onClick={() => setDueSortOrder(prev => prev === "asc" ? "desc" : "asc")}
          className="flex items-center gap-2 bg-app-surface border border-app-border rounded-lg px-3 py-1.5 text-[10px] font-bold text-app-text-muted hover:text-app-text-primary transition-all active:scale-95 shadow-sm"
        >
          <ArrowUpDown size={12} className={cn("transition-transform duration-300", dueSortOrder === "asc" ? "rotate-180" : "")} />
          {lang === 'bn' ? (dueSortOrder === "asc" ? "কম বাকি আগে" : "বেশি বাকি আগে") : (dueSortOrder === "asc" ? "Lowest Due First" : "Highest Due First")}
        </button>
      </div>

      {sortedClients.length === 0 ? (
        <div className="text-center py-12 bg-app-surface rounded-3xl border border-app-border text-app-text-muted font-bold text-sm">
          {t("project_detail.no_clients") || "No clients found in this project"}
        </div>
      ) : (
        sortedClients.map((c) => (
          <div key={c.id} className="bg-app-surface rounded-2xl border border-app-border p-5 shadow-sm transition-colors">
            <div className="flex items-center gap-4 mb-4">
              <ClientAvatar client={c} size={48} />
              <div className="flex-1 min-w-0">
                <div className="text-base font-black text-app-text-primary">{c.name}</div>
                <div className="text-xs text-app-text-secondary font-medium mt-1">
                  {c.phone}
                  {c.plot && (
                    <>
                      {" · "}
                      <span className="bg-app-bg text-app-text-secondary px-2 py-0.5 rounded font-bold border border-app-border">
                        {c.plot}
                      </span>
                    </>
                  )}
                  {(c.displayShareCount || 1) > 1 && (
                    <>
                      {" · "}
                      <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-bold border border-blue-500/20">
                        {c.displayShareCount} {t("client_info.shares")}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-black text-app-text-primary">{BDTshort(c.cPaid)}</div>
                <div className="text-[10px] text-app-text-muted font-bold uppercase">{t("project_detail.collected")}</div>
              </div>
            </div>
            <PBar 
              paid={c.cPaid} 
              target={c.cTarget} 
              rightLabel={<>{t("project_detail.due")}: {BDTshort(c.due)}</>}
            />
          </div>
        ))
      )}
    </div>
  );
}
