import { useLanguage } from "../../../lib/i18n";
import { useAppStore } from "../../../store/appStore";
import { LogRow } from "../../../components/Admin";

export default function LogTab({ projectId }: { projectId: string }) {
  const { t } = useLanguage();
  const { logs, projects } = useAppStore();
  
  const project = projects.find(p => p.id === projectId);
  const prjLogs = [...logs]
    .filter(l => l.projectId === projectId)
    .sort((a, b) => b.ts.localeCompare(a.ts));

  if (!project) return null;

  return (
    <div className="bg-app-surface rounded-2xl border border-app-border p-2 transition-colors">
      {prjLogs.length === 0 ? (
        <div className="text-center py-10 text-app-text-muted font-medium italic">
          {t("project_detail.no_activity") || "No activity logs for this project"}
        </div>
      ) : (
        prjLogs.map((l, i) => (
          <LogRow key={`${l.id}-${i}`} log={l} projects={[project]} />
        ))
      )}
    </div>
  );
}
