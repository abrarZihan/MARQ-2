import { BDT, BDTshort } from "../../../lib/utils";
import { ClientAvatar, PBar } from "../../../components/Shared";
import { useLanguage } from "../../../lib/i18n";
import { useAppStore } from "../../../store/appStore";

export default function SummaryTab({ projectId }: { projectId: string }) {
  const { t } = useLanguage();
  const { clients, instDefs, plans, payments } = useAppStore();

  const prjPlans = plans.filter((pl: any) => pl.projectId === projectId);
  const prjClients = clients.filter((c: any) => c.projectId === projectId);
  const allPrjDefs = instDefs.filter((d: any) => d.projectId === projectId);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-3">
      {prjClients.length === 0 ? (
        <div className="text-center py-12 bg-app-surface rounded-3xl border border-app-border text-app-text-muted font-bold text-sm">
          {t("project_detail.no_clients") || "No clients found in this project"}
        </div>
      ) : (
        prjClients.map((c: any) => {
          const cPaid = payments
            .filter((p: any) => p.clientId === c.id && p.status === "approved" && allPrjDefs.some(d => d.id === p.instDefId))
            .reduce((s: number, p: any) => s + p.amount, 0);

          const assignments = c.planAssignments || [];
          let cTarget = 0;

          if (assignments.length > 0) {
            cTarget = assignments.reduce((as: number, pa: any) => {
              const pDefs = instDefs.filter((d: any) => d.planId === pa.planId);
              return as + (pDefs.reduce((ds: number, d: any) => ds + d.targetAmount, 0) * pa.shareCount);
            }, 0);
          } else {
            const firstPlan = prjPlans[0];
            if (firstPlan) {
              const pDefs = instDefs.filter((d: any) => d.planId === firstPlan.id);
              cTarget = (pDefs.reduce((ds: number, d: any) => ds + d.targetAmount, 0) * (c.shareCount || 1));
            }
          }

          const displayShareCount = assignments.length > 0 ? assignments[0].shareCount : (c.shareCount || 1);

          return (
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
                    {displayShareCount > 1 && (
                      <>
                        {" · "}
                        <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-bold border border-blue-500/20">
                          {displayShareCount} {t("client_info.shares")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-app-text-primary">{BDTshort(cPaid)}</div>
                  <div className="text-[10px] text-app-text-muted font-bold uppercase">{t("project_detail.collected")}</div>
                </div>
              </div>
              <PBar paid={cPaid} target={cTarget} />
              <div className="flex justify-between mt-2 text-[10px] font-bold text-app-text-muted uppercase tracking-wider">
                <span>{Math.round((cPaid / (cTarget || 1)) * 100)}% {t("project_detail.completed") || "Completed"}</span>
                <span>{t("project_detail.due")}: {BDTshort(Math.max(0, cTarget - cPaid))}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
