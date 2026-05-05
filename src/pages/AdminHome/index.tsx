import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, Wallet, Clock, ChevronRight, MoreVertical, 
  Edit2, Trash2, CheckCircle2, XCircle, Loader2
} from "lucide-react";
import { useLanguage } from "../../lib/i18n";
import { useAppStore } from "../../store/appStore";
import { BDT, BDTshort, ac, uid, cn } from "../../lib/utils";
import { FG, ConfirmDelete } from "../../components/Shared";
import { useActions } from "../../hooks/useActions";
import { useNavigate } from "react-router-dom";
import { Project, Client, Payment, InstDef, Plan, Expense } from "../../types";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

function PendingApprovals({ payments, clients, instDefs, projects, onApprove, onReject }: {
  payments: Payment[];
  clients: Client[];
  instDefs: InstDef[];
  projects: Project[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const { t } = useLanguage();
  const pending = payments.filter((p: Payment) => p.status === "pending");
  
  if (pending.length === 0) return (
    <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-4 mb-4 flex items-center gap-3 transition-colors">
      <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400" />
      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{t("dashboard.no_pending")}</span>
    </div>
  );

  return (
    <div className="mb-6">
      <div className="text-sm font-extrabold text-rose-600 dark:text-rose-400 mb-3 flex items-center gap-2 px-1">
        <span className="bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full px-2.5 py-0.5 text-xs">{pending.length}</span>
        {t("dashboard.pending_approval")}
      </div>
      <div className="space-y-3">
        {pending.map((p: Payment) => {
          const client = clients.find((c: Client) => c.id === p.clientId);
          const def = instDefs.find((d: InstDef) => d.id === p.instDefId);
          const prj = projects.find((pr: Project) => pr.id === client?.projectId);
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              key={p.id} 
              className="bg-app-surface border border-app-border rounded-2xl p-4 shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-sm font-black text-app-text-primary">{client?.name || p.clientId}</div>
                  <div className="text-[10px] font-bold text-app-text-muted mt-1 uppercase tracking-wider">
                    {prj?.name} • {def?.title}
                  </div>
                  <div className="text-[10px] font-medium text-app-text-muted mt-0.5">{p.date} {p.note ? `• ${p.note}` : ""}</div>
                </div>
                <div className="text-lg font-black text-amber-600 dark:text-amber-400">{BDT(p.amount)}</div>
              </div>
              <div className="flex gap-2">
                <button 
                  className="flex-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold py-2.5 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-colors text-xs flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-500/20" 
                  onClick={() => onApprove(p.id)}
                >
                  <CheckCircle2 size={14} /> {t("dashboard.approve")}
                </button>
                <button 
                  className="flex-1 bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 font-bold py-2.5 rounded-xl hover:bg-rose-200 dark:hover:bg-rose-500/20 transition-colors text-xs flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-500/20" 
                  onClick={() => onReject(p.id)}
                >
                  <XCircle size={14} /> {t("dashboard.reject")}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function FinancialSummary({ projects, clients, allApprovedPayments, validPayments, expenses }: {
  projects: Project[];
  clients: Client[];
  allApprovedPayments: Payment[];
  validPayments: Payment[];
  expenses: Expense[];
}) {
  const { t } = useLanguage();
  const { plans, instDefs, payments } = useAppStore();
  
  // Filter payments to only include those belonging to active clients and valid installments
  const approvedPays = allApprovedPayments;
  const validPaymentIds = new Set(validPayments.map(p => p.id));
  const pendingPays = payments.filter(p => p.status === "pending" && validPaymentIds.has(p.id));
  
  // Also ensure target only counts for active plans and projects
  const activePlanIds = new Set(plans.map(p => p.id));
  // Global defs for current projects
  const prjIds = new Set(projects.map(p => p.id));

  const totalExpected = clients.reduce((s: number, c: Client) => {
    const assignments = c.planAssignments || [];
    
    if (assignments.length > 0) {
      const plansTarget = assignments.reduce((as: number, pa) => {
        if (!activePlanIds.has(pa.planId)) return as;
        const pDefs = instDefs.filter((d: InstDef) => d.planId === pa.planId);
        return as + (pDefs.reduce((ds: number, d: InstDef) => ds + d.targetAmount, 0) * (pa.shareCount || 1));
      }, 0);
      return s + plansTarget;
    }
    
    const prjPlans = plans.filter((p: Plan) => p.projectId === c.projectId);
    const firstPlan = prjPlans[0];
    if (!firstPlan) return s;
    const pDefs = instDefs.filter((d: InstDef) => d.planId === firstPlan.id);
    return s + (pDefs.reduce((ds: number, d: InstDef) => ds + d.targetAmount, 0) * (c.shareCount || 1));
  }, 0);
  
  const totalCollected = approvedPays.reduce((s: number, p: Payment) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s: number, e: Expense) => s + e.amount, 0);
  const totalPending = pendingPays.reduce((s: number, p: Payment) => s + p.amount, 0);
  const netProfit = totalCollected - totalExpenses;
  
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="bg-app-surface-elevated rounded-3xl p-6 text-app-text-primary shadow-xl border border-app-border relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="relative z-10">
          <div className="text-[10px] text-app-text-muted font-black mb-1 tracking-widest uppercase">{t("dashboard.net_profit_loss")}</div>
          <div className={cn("text-4xl font-black tracking-tighter", netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
            {netProfit >= 0 ? "+" : ""}{BDT(netProfit)}
          </div>
          <div className="text-[10px] text-app-text-muted mt-2 font-bold uppercase tracking-wider">{t("dashboard.collection_minus_expense")}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t("dashboard.total_expected"), val: totalExpected, color: "blue" },
          { label: t("dashboard.total_collected"), val: totalCollected, color: "emerald" },
          { label: t("dashboard.total_expenses"), val: totalExpenses, color: "rose" },
          { label: t("dashboard.pending_approval"), val: totalPending, color: "amber" }
        ].map((item, i) => (
          <div key={i} className="bg-app-surface rounded-2xl border border-app-border p-4">
            <div className="text-[10px] text-app-text-muted font-black uppercase tracking-widest mb-1">{item.label}</div>
            <div className={cn("text-lg font-black", 
              item.color === "blue" ? "text-blue-600 dark:text-blue-400" :
              item.color === "emerald" ? "text-emerald-600 dark:text-emerald-400" :
              item.color === "rose" ? "text-rose-600 dark:text-rose-400" :
              "text-amber-600 dark:text-amber-400"
            )}>
              {BDTshort(item.val)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-black text-app-text-primary mb-4">
          {t("dashboard.project_analysis")}
        </h2>
        {projects.map((prj: Project) => {
          const prjClients = clients.filter((c: Client) => c.projectId === prj.id);
          const prjPlanIds = plans.filter(pl => pl.projectId === prj.id).map(pl => pl.id);
          const prjAllDefs = instDefs.filter((d: InstDef) => prjPlanIds.includes(d.planId));
          const prjApprovedPays = approvedPays.filter((p: Payment) => 
            p.status === "approved" && 
            prjClients.some((c: Client) => c.id === p.clientId) &&
            prjAllDefs.some((d: InstDef) => d.id === p.instDefId)
          );
          const prjCollected = prjApprovedPays.reduce((s: number, p: Payment) => s + p.amount, 0);
          const prjExpenses = expenses.filter((e: Expense) => e.projectId === prj.id);
          const prjSpent = prjExpenses.reduce((s: number, e: Expense) => s + e.amount, 0);
          const prjNet = prjCollected - prjSpent;
          const prjTarget = prjClients.reduce((s: number, c: Client) => {
            const assignments = c.planAssignments || [];

            if (assignments.length > 0) {
              const plansTarget = assignments.reduce((as: number, pa) => {
                const pDefs = instDefs.filter((d: InstDef) => d.planId === pa.planId);
                return as + (pDefs.reduce((ds: number, d: InstDef) => ds + d.targetAmount, 0) * pa.shareCount);
              }, 0);
              return s + plansTarget;
            }
            const prjPlansVisible = plans.filter((p: Plan) => p.projectId === prj.id);
            const firstPlan = prjPlansVisible[0];
            if (!firstPlan) return s;
            const pDefs = instDefs.filter((d: InstDef) => d.planId === firstPlan.id);
            return s + (pDefs.reduce((ds: number, d: InstDef) => ds + d.targetAmount, 0) * (c.shareCount || 1));
          }, 0);
          const prjDue = Math.max(0, prjTarget - prjCollected);
          const prjPct = prjTarget > 0 ? Math.round((prjCollected / prjTarget) * 100) : 0;
          const prjInstCount = prjAllDefs.length;

          return (
            <div key={prj.id} className="bg-app-surface rounded-2xl border border-app-border p-5 mb-4 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 rounded-l-2xl" />
              <div className="flex justify-between items-start mb-1 pl-2">
                <div className="text-base font-black text-app-text-primary">{prj.name}</div>
                <div className={cn("text-base font-black", prjNet >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {prjNet >= 0 ? "+" : ""}{BDTshort(prjNet)}
                </div>
              </div>
              <div className="text-xs text-app-text-muted font-medium mb-4 pl-2">
                {prjClients.length} {t("dashboard.clients")} · {prjInstCount} {t("dashboard.installments")}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "COLLECTED", value: BDTshort(prjCollected), color: "text-app-text-primary" },
                  { label: "DUE", value: BDTshort(prjDue), color: "text-app-text-primary" },
                  { label: "EXPENSE", value: BDTshort(prjSpent), color: "text-app-text-primary" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-app-bg rounded-xl p-3 border border-app-border">
                    <div className="text-[9px] font-bold text-app-text-muted uppercase tracking-widest mb-1">{label}</div>
                    <div className={cn("text-sm font-black", color)}>{value}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs font-bold text-app-text-muted mb-1">
                <span>Collection Progress</span>
                <span className="text-emerald-500">{prjPct}%</span>
              </div>
              <div className="h-2 bg-app-border rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${prjPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function AdminHome() {
  const { t } = useLanguage();
  const { projects, instDefs, expenses, plans, auth, payments, clients } = useAppStore();
  const actions = useActions();
  const navigate = useNavigate();

  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState<Project | null>(null);
  const [delProject, setDelProject] = useState<Project | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [view, setView] = useState("projects");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const isSuperAdmin = auth?.role === "superadmin";
  const activePlanIds = new Set(plans.map(p => p.id));
  const validPayments = payments.filter((p: Payment) => {
    const client = clients.find(c => c.id === p.clientId);
    if (!client) return false;
    const def = instDefs.find(d => d.id === p.instDefId);
    if (!def) return false;
    
    // Only count if it belongs to an existing Plan
    if (!def.planId || !activePlanIds.has(def.planId)) return false;
    
    // Also check if the client is assigned to that plan
    const assignments = client.planAssignments || [];
    return assignments.some(pa => pa.planId === def.planId);
  });
  const allCollected = validPayments.filter((p: Payment) => p.status === "approved").reduce((s: number, p: Payment) => s + p.amount, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-app-text-primary tracking-tight">MARQ Builders</h1>
          <p className="text-xs font-bold text-app-text-muted uppercase tracking-widest mt-1">
            {t("admin_home.projects_count", { count: projects.length })}
          </p>
        </div>
        <button 
          className="bg-app-tab-active text-app-surface px-5 py-3 rounded-2xl text-xs font-black hover:opacity-90 transition-all shadow-lg shadow-app-tab-active/20 active:scale-95" 
          onClick={() => setAddModal(true)}
        >
          {t("admin_home.add_project")}
        </button>
      </div>
      
      <div className="flex bg-app-surface p-1.5 rounded-2xl mb-6 border border-app-border shadow-sm">
        <button 
          className={cn("flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 uppercase tracking-wider whitespace-nowrap", view === "projects" ? "bg-app-tab-active text-app-surface shadow-md" : "text-app-text-muted hover:text-app-text-primary")} 
          onClick={() => setView("projects")}
        >
          <Building2 size={14} /> {t("admin_home.projects_tab")}
        </button>
        <button 
          className={cn("flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 uppercase tracking-wider whitespace-nowrap", view === "financial" ? "bg-app-tab-active text-app-surface shadow-md" : "text-app-text-muted hover:text-app-text-primary")} 
          onClick={() => setView("financial")}
        >
          <Wallet size={14} /> {t("admin_home.financial_tab")}
        </button>
      </div>
      
      {view === "financial" ? (
        <FinancialSummary 
          projects={projects} 
          clients={clients} 
          allApprovedPayments={validPayments.filter(p => p.status === "approved")} 
          validPayments={validPayments}
          expenses={expenses} 
        />
      ) : (
        <div className="space-y-6">
          {isSuperAdmin && <PendingApprovals payments={payments} clients={clients} instDefs={instDefs} projects={projects} onApprove={actions.approvePayment} onReject={actions.rejectPayment} />}
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-app-surface rounded-2xl border border-app-border p-5 flex flex-col justify-center shadow-sm">
              <div className="w-10 h-10 bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4 border border-blue-200 dark:border-blue-500/20">
                <Building2 size={20} />
              </div>
              <div className="text-[10px] text-app-text-muted font-black mb-1 uppercase tracking-widest">{t("admin_home.total_projects")}</div>
              <div className="text-xl font-black text-app-text-primary">{projects.length}</div>
            </div>
            <div className="bg-app-surface rounded-2xl border border-app-border p-5 flex flex-col justify-center shadow-sm">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4 border border-emerald-200 dark:border-emerald-500/20">
                <Wallet size={20} />
              </div>
              <div className="text-[10px] text-app-text-muted font-black mb-1 uppercase tracking-widest">{t("admin_home.total_collected")}</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{BDTshort(allCollected)}</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="text-[10px] text-app-text-muted font-black uppercase tracking-widest px-1">{t("admin_home.projects_tab")}</div>
            {projects.map((prj: Project) => {
              const prjClients = clients.filter((c: Client) => c.projectId === prj.id);
              const prjPaid = validPayments.filter((p: Payment) => {
                if (p.status !== "approved") return false;
                const client = prjClients.find((c: Client) => c.id === p.clientId);
                return !!client;
              }).reduce((s: number, p: Payment) => s + p.amount, 0);
              const color = ac(prj.id);
              
              return (
                <motion.div 
                  whileHover={{ scale: 0.99, y: -2 }} whileTap={{ scale: 0.98 }}
                  key={prj.id} 
                  className="bg-app-surface rounded-2xl border border-app-border p-5 cursor-pointer shadow-sm hover:shadow-md transition-all group" 
                  onClick={() => navigate(`/project/${prj.id}`)}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-colors" style={{ backgroundColor: color + "15", color, borderColor: color + "30" }}>
                      <Building2 size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-black text-app-text-primary truncate group-hover:text-app-tab-active transition-colors">{prj.name}</div>
                      <div className="text-[10px] text-app-text-muted font-bold mt-1 line-clamp-1 uppercase tracking-wider">{prj.description || "No description"}</div>
                    </div>
                    <div className="text-app-text-muted group-hover:text-app-tab-active transition-colors">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider" style={{ backgroundColor: color + "15", color }}>{prjClients.length} Clients</span>
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">{BDTshort(prjPaid)}</span>
                    </div>
                    
                    <div className="relative">
                      <button 
                        className="p-2 hover:bg-app-bg rounded-xl transition-colors text-app-text-muted hover:text-app-text-primary"
                        onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === prj.id ? null : prj.id); }}
                      >
                        <MoreVertical size={18} />
                      </button>
                      
                      <AnimatePresence>
                        {menuOpen === prj.id && (
                          <>
                            <div className="fixed inset-0 z-[100]" onClick={e => { e.stopPropagation(); setMenuOpen(null); }} />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 bottom-full mb-2 w-36 bg-app-surface rounded-2xl shadow-2xl border border-app-border py-2 z-[110] overflow-hidden"
                              onClick={e => e.stopPropagation()}
                            >
                              <button 
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-app-text-primary hover:bg-app-bg transition-colors"
                                onClick={() => {
                                  setEditModal(prj);
                                  setEditName(prj.name);
                                  setEditDesc(prj.description || "");
                                  setMenuOpen(null);
                                }}
                              >
                                <Edit2 size={14} className="text-blue-500" /> {t("common.edit")}
                              </button>
                              <button 
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                onClick={() => {
                                  setDelProject(prj);
                                  setMenuOpen(null);
                                }}
                              >
                                <Trash2 size={14} /> {t("project_detail.delete")}
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
      
      <AnimatePresence>
        {addModal && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[300] flex items-end sm:items-center justify-center backdrop-blur-sm p-4" onClick={() => setAddModal(false)}>
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
              className="bg-app-surface rounded-3xl w-full max-w-md p-6 border border-app-border shadow-2xl" 
              onClick={e => e.stopPropagation()}
            >
              <div className="text-xl font-black text-app-text-primary mb-6 tracking-tight">{t("admin_home.new_project")}</div>
              <div className="space-y-4 mb-8">
                <FG label={t("admin_home.project_name")}>
                  <input 
                    className="w-full px-4 py-3.5 bg-app-input-bg border border-app-input-border rounded-2xl text-sm font-bold focus:outline-none focus:border-app-tab-active focus:ring-4 focus:ring-app-tab-active/10 transition-all text-app-text-primary placeholder:text-app-text-muted/50" 
                    placeholder={t("admin_home.project_name_ph")} 
                    value={newName} onChange={e => setNewName(e.target.value)} 
                  />
                </FG>
                <FG label={t("admin_home.project_desc")}>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-3.5 bg-app-input-bg border border-app-input-border rounded-2xl text-sm font-bold focus:outline-none focus:border-app-tab-active focus:ring-4 focus:ring-app-tab-active/10 transition-all text-app-text-primary placeholder:text-app-text-muted/50" 
                    value={newDesc} onChange={e => setNewDesc(e.target.value)} 
                  />
                </FG>
              </div>
              <div className="flex gap-3">
                <button className="flex-1 py-4 rounded-2xl text-sm font-black text-app-text-muted hover:bg-app-bg transition-colors" onClick={() => setAddModal(false)}>{t("common.cancel")}</button>
                <button 
                  className="flex-2 bg-app-tab-active text-app-surface font-black py-4 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-app-tab-active/20 active:scale-95 text-sm" 
                  onClick={() => {
                    if (newName.trim()) {
                      actions.addProject({ id: uid("PRJ"), name: newName.trim(), description: newDesc.trim() });
                      setAddModal(false); setNewName(""); setNewDesc("");
                    }
                  }}
                >
                  {t("admin_home.add_btn")}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {editModal && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[300] flex items-end sm:items-center justify-center backdrop-blur-sm p-4" onClick={() => setEditModal(null)}>
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
              className="bg-app-surface rounded-3xl w-full max-w-md p-6 border border-app-border shadow-2xl" 
              onClick={e => e.stopPropagation()}
            >
              <div className="text-xl font-black text-app-text-primary mb-6 tracking-tight">{t("common.edit")} {t("admin_home.projects_tab")}</div>
              <div className="space-y-4 mb-8">
                <FG label={t("admin_home.project_name")}>
                  <input 
                    className="w-full px-4 py-3.5 bg-app-input-bg border border-app-input-border rounded-2xl text-sm font-bold focus:outline-none focus:border-app-tab-active focus:ring-4 focus:ring-app-tab-active/10 transition-all text-app-text-primary" 
                    value={editName} onChange={e => setEditName(e.target.value)} 
                  />
                </FG>
                <FG label={t("admin_home.project_desc")}>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-3.5 bg-app-input-bg border border-app-input-border rounded-2xl text-sm font-bold focus:outline-none focus:border-app-tab-active focus:ring-4 focus:ring-app-tab-active/10 transition-all text-app-text-primary" 
                    value={editDesc} onChange={e => setEditDesc(e.target.value)} 
                  />
                </FG>
              </div>
              <div className="flex gap-3">
                <button className="flex-1 py-4 rounded-2xl text-sm font-black text-app-text-muted hover:bg-app-bg transition-colors" onClick={() => setEditModal(null)}>{t("common.cancel")}</button>
                <button 
                  className="flex-2 bg-app-tab-active text-app-surface font-black py-4 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-app-tab-active/20 active:scale-95 text-sm" 
                  onClick={() => {
                    if (editName.trim()) {
                      actions.updateProject({ ...editModal, name: editName.trim(), description: editDesc.trim() });
                      setEditModal(null);
                    }
                  }}
                >
                  {t("common.save")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        
        {delProject && (
          <ConfirmDelete 
            message={<><b>{delProject.name}</b> {t("admin_home.delete_warning")}</>} 
            onConfirm={() => { actions.deleteProject(delProject.id); setDelProject(null); }} 
            onClose={() => setDelProject(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
