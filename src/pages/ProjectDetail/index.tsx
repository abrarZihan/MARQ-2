import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Table, Users, CreditCard, ClipboardList, Building2 } from "lucide-react";
import { useLanguage } from "../../lib/i18n";
import { useAppStore } from "../../store/appStore";
import { cn } from "../../lib/utils";
import SheetTab from "./tabs/SheetTab";
import ClientsTab from "./tabs/ClientsTab";
import PaymentsTab from "./tabs/PaymentsTab";
import SummaryTab from "./tabs/SummaryTab";
import ExpensesTab from "./tabs/ExpensesTab";
import LogTab from "./tabs/LogTab";

export default function ProjectDetail() {
  const { t } = useLanguage();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { projects } = useAppStore();
  const [tab, setTab] = useState("sheet");

  const project = projects.find(p => p.id === projectId);
  if (!project) return null;

  const TABS = [
    { id: "sheet", label: t("project_detail.tab_sheet"), icon: <Table size={14} /> },
    { id: "clientinfo", label: t("project_detail.tab_client"), icon: <Users size={14} /> },
    { id: "payments", label: t("nav.payments"), icon: <CreditCard size={14} /> },
    { id: "kistisum", label: t("project_detail.tab_summary"), icon: <ClipboardList size={14} /> },
    { id: "expenses", label: t("project_detail.tab_expense"), icon: <Building2 size={14} /> },
    { id: "log", label: t("project_detail.tab_log"), icon: <ClipboardList size={14} /> },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate("/")} className="w-10 h-10 bg-app-surface border border-app-border rounded-xl flex items-center justify-center text-app-text-secondary hover:bg-app-bg transition-colors shadow-sm shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xl font-black text-app-text-primary truncate">{project.name}</div>
        </div>
      </div>

      <div className="flex bg-app-bg p-1 rounded-xl mb-6 overflow-x-auto scrollbar-hide border border-app-border transition-colors">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5", tab === t.id ? "bg-app-tab-active text-app-bg shadow-sm" : "text-app-tab-inactive hover:text-app-text-primary")}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        {tab === "sheet" && <SheetTab projectId={projectId!} />}
        {tab === "clientinfo" && <ClientsTab projectId={projectId!} />}
        {tab === "payments" && <PaymentsTab projectId={projectId!} />}
        {tab === "kistisum" && <SummaryTab projectId={projectId!} />}
        {tab === "expenses" && <ExpensesTab projectId={projectId!} />}
        {tab === "log" && <LogTab projectId={projectId!} />}
      </div>
    </motion.div>
  );
}
