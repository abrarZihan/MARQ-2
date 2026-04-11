import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { BDT, BDTshort, dotJoin, ac, initials, uid, todayStr, cn, clientPaidForDef, cellStatus } from "../lib/utils";
import { FG, ConfirmDelete, ClientAvatar, PassCell, PBar, CategoryIcon, CategoryColor, ConfirmDeletePlan } from "./Shared";
import { STATUS, EXP_CATS } from "../lib/data";
import { LogRow } from "./Admin";
import { ClientInfoPage } from "./ClientInfo";
import { CellPaySheet, AddDefSheet, EditDefSheet, AddExpSheet, ReceiptSheet } from "./ProjectModals";
import { Trash2, Clock, CheckCircle2, Building2, Table, Users, CreditCard, ClipboardList, ArrowLeft, Plus, Printer, FileText, Edit2, Search, Filter, X } from "lucide-react";

import { useLanguage } from "../lib/i18n";
import { useAppStore } from "../store/appStore";

export function ProjectDetail({ onAddPlan, onUpdatePlan, onDeletePlan, onAddDef, onUpdateInstDef, onDeleteInstDef, onAddPayment, onDeletePayment, onAddExpense, onUpdateExpense, onUpdateClient, onAddBulkClients, onAddClient, onDeleteClient, onDeleteExpense }: any) {
  const { t } = useLanguage();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { 
    projects, clients, instDefs, plans, payments, expenses, logs, auth 
  } = useAppStore();

  const project = projects.find(p => p.id === projectId);
  const isSuperAdmin = auth?.role === "superadmin";
  const allClients = clients;

  const [tab, setTab] = useState("sheet");
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [search, setSearch] = useState("");
  const [editPlanModal, setEditPlanModal] = useState<any>(null);
  const [editPlanName, setEditPlanName] = useState("");
  const [longPressTimer, setLongPressTimer] = useState<any>(null);
  const [cellModal, setCellModal] = useState<any>(null);
  const [viewR, setViewR] = useState<any>(null);
  const [addDefModal, setAddDefModal] = useState(false);
  const [addExpModal, setAddExpModal] = useState(false);
  const [editExpModal, setEditExpModal] = useState<any>(null);
  const [delExp, setDelExp] = useState<any>(null);
  const [deletePlanTarget, setDeletePlanTarget] = useState<any>(null);
  const [defTaps, setDefTaps] = useState<any>({});
  
  const [editDefModal, setEditDefModal] = useState<any>(null);
  const [longPressDefTimer, setLongPressDefTimer] = useState<any>(null);
  const [isDefLongPress, setIsDefLongPress] = useState(false);

  const handleDefLongPressStart = (def: any) => {
    setIsDefLongPress(false);
    const timer = setTimeout(() => {
      setIsDefLongPress(true);
      setEditDefModal(def);
    }, 600);
    setLongPressDefTimer(timer);
  };

  const handleDefLongPressEnd = () => {
    if (longPressDefTimer) {
      clearTimeout(longPressDefTimer);
      setLongPressDefTimer(null);
    }
  };

  const prjPlans = plans.filter((pl: any) => pl.projectId === project.id);
  useEffect(() => {
    if (prjPlans.length > 0 && !activePlanId) setActivePlanId(prjPlans[0].id);
  }, [prjPlans, activePlanId]);

  const basePrjClients = clients.filter((c: any) => {
    if (c.projectId !== project.id) return false;
    // If no plan assignments, they belong to the first/default plan
    const assignments = c.planAssignments || [];
    if (assignments.length === 0) {
      return activePlanId === prjPlans[0]?.id;
    }
    // Otherwise, show only if assigned to the active plan
    return assignments.some((pa: any) => pa.planId === activePlanId);
  });

  const prjClients = basePrjClients.filter((c: any) => c.name?.toLowerCase()?.includes(search.toLowerCase()));
  
  const allPrjClients = clients.filter((c: any) => c.projectId === project.id).filter((c: any) => c.name?.toLowerCase()?.includes(search.toLowerCase()));
  const prjDefs = instDefs.filter((d: any) => d.planId === activePlanId || (d.projectId === project.id && d.isGlobal));
  const prjExpenses = expenses.filter((e: any) => e.projectId === project.id);
  const prjLogs = [...logs].filter(l => l.projectId === project.id).sort((a, b) => b.ts.localeCompare(a.ts));
  
  const projectClientsForCalc = clients.filter((c: any) => c.projectId === project.id);
  const allPrjDefs = instDefs.filter((d: any) => d.projectId === project.id);
  
  const projectCollected = payments.filter((p: any) => {
    if (p.status !== "approved") return false;
    const client = allPrjClients.find((c: any) => c.id === p.clientId);
    if (!client) return false;
    const def = allPrjDefs.find(d => d.id === p.instDefId);
    if (!def) return false;
    return true;
  }).reduce((s: number, p: any) => s + p.amount, 0);

  const projectTarget = projectClientsForCalc.reduce((s: number, c: any) => {
    const assignments = c.planAssignments || [];
    if (assignments.length > 0) {
      return s + assignments.reduce((as: number, pa: any) => {
        const pDefs = instDefs.filter((d: any) => d.planId === pa.planId);
        return as + (pDefs.reduce((ds: number, d: any) => ds + d.targetAmount, 0) * pa.shareCount);
      }, 0);
    } else {
      const firstPlan = prjPlans[0];
      if (!firstPlan) return s;
      const pDefs = instDefs.filter((d: any) => d.planId === firstPlan.id);
      return s + (pDefs.reduce((ds: number, d: any) => ds + d.targetAmount, 0) * (c.shareCount || 1));
    }
  }, 0);

  const projectDue = Math.max(0, projectTarget - projectCollected);

  const totalCollected = payments.filter((p: any) => {
    if (p.status !== "approved") return false;
    const def = prjDefs.find(d => d.id === p.instDefId);
    return !!def;
  }).reduce((s: number, p: any) => s + p.amount, 0);
  const totalTarget = prjClients.reduce((s: number, c: any) => {
    const assignment = c.planAssignments?.find((pa: any) => pa.planId === activePlanId);
    const sc = assignment ? assignment.shareCount : (c.shareCount || 1);
    return s + prjDefs.reduce((ss: number, d: any) => ss + (d.isGlobal ? 1 : sc) * d.targetAmount, 0);
  }, 0);
  const totalDue = Math.max(0, totalTarget - totalCollected);
  
  const TABS = [
    ["sheet", <span className="flex items-center gap-1.5"><Table size={14} /> {t("project_detail.tab_sheet")}</span>], 
    ["clientinfo", <span className="flex items-center gap-1.5"><Users size={14} /> {t("project_detail.tab_client")}</span>], 
    ["payments", <span className="flex items-center gap-1.5"><CreditCard size={14} /> {t("nav.payments")}</span>],
    ["kistisum", <span className="flex items-center gap-1.5"><ClipboardList size={14} /> {t("project_detail.tab_summary")}</span>], 
    ["expenses", <span className="flex items-center gap-1.5"><Building2 size={14} /> {t("project_detail.tab_expense")}</span>], 
    ["log", <span className="flex items-center gap-1.5"><ClipboardList size={14} /> {t("project_detail.tab_log")}</span>]
  ];

  const [isLongPress, setIsLongPress] = useState(false);

  const handleLongPressStart = (pl: any) => {
    setIsLongPress(false);
    const timer = setTimeout(() => {
      setIsLongPress(true);
      setEditPlanModal(pl);
      setEditPlanName(pl.name);
    }, 600); // 600ms for long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handlePlanClick = (plId: string) => {
    if (!isLongPress) {
      setActivePlanId(plId);
    }
  };

  if (!project) return (
    <div className="text-center py-20">
      <div className="text-app-text-muted font-bold mb-4">Project not found</div>
      <button onClick={() => navigate("/")} className="text-blue-500 font-bold hover:underline">Go Back</button>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
      <div className="flex items-center gap-4 mb-6">
        <button 
          className="w-10 h-10 bg-app-surface border border-app-border rounded-xl flex items-center justify-center text-app-text-secondary hover:bg-app-bg transition-colors shadow-sm shrink-0" 
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xl font-black text-app-text-primary truncate">{project.name}</div>
          <div className="text-xs font-bold text-app-text-secondary">{t("project_detail.stats", { clients: prjClients.length, insts: prjDefs.length })}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-app-surface rounded-2xl border border-app-border p-3 flex flex-col justify-center items-center text-center transition-colors shadow-sm">
          <div className="w-8 h-8 bg-slate-300/50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-lg flex items-center justify-center mb-2 border border-emerald-300/30 dark:border-emerald-500/30"><CheckCircle2 size={16} /></div>
          <div className="text-[10px] text-app-text-muted font-bold uppercase tracking-wider mb-0.5">{t("project_detail.collected")}</div>
          <div className="text-sm font-black text-app-text-primary">{BDTshort(projectCollected)}</div>
        </div>
        <div className="bg-app-surface rounded-2xl border border-app-border p-3 flex flex-col justify-center items-center text-center transition-colors shadow-sm">
          <div className="w-8 h-8 bg-slate-300/50 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 rounded-lg flex items-center justify-center mb-2 border border-rose-300/30 dark:border-rose-500/30"><Clock size={16} /></div>
          <div className="text-[10px] text-app-text-muted font-bold uppercase tracking-wider mb-0.5">{t("project_detail.due")}</div>
          <div className="text-sm font-black text-app-text-primary">{BDTshort(projectDue)}</div>
        </div>
        <div className="bg-app-surface rounded-2xl border border-app-border p-3 flex flex-col justify-center items-center text-center transition-colors shadow-sm">
          <div className="w-8 h-8 bg-slate-300/50 text-violet-800 dark:bg-violet-500/20 dark:text-violet-400 rounded-lg flex items-center justify-center mb-2 border border-violet-300/30 dark:border-violet-500/30"><Building2 size={16} /></div>
          <div className="text-[10px] text-app-text-muted font-bold uppercase tracking-wider mb-0.5">{t("project_detail.expense")}</div>
          <div className="text-sm font-black text-app-text-primary">{BDTshort(prjExpenses.reduce((s: number, e: any) => s + e.amount, 0))}</div>
        </div>
      </div>

      <div className="flex bg-app-bg p-1 rounded-xl mb-6 overflow-x-auto scrollbar-hide border border-app-border transition-colors">
        {TABS.map(([v, l]) => (
          <button 
            key={v} 
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap", 
              tab === v ? "bg-app-tab-active text-app-bg shadow-sm" : "text-app-tab-inactive hover:text-app-text-primary"
            )} 
            onClick={() => setTab(v)}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "sheet" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 no-print">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 max-w-[calc(100vw-120px)] sm:max-w-[400px]">
                {prjPlans.map((pl: any) => (
                  <button
                    key={pl.id}
                    onClick={() => handlePlanClick(pl.id)}
                    onMouseDown={() => handleLongPressStart(pl)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={() => handleLongPressStart(pl)}
                    onTouchEnd={handleLongPressEnd}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                      activePlanId === pl.id 
                        ? "bg-app-tab-active border-app-tab-active text-app-bg shadow-md shadow-app-border" 
                        : "bg-app-surface border-app-border text-app-text-secondary hover:border-app-text-muted hover:bg-app-bg"
                    )}
                  >
                    {pl.name}
                  </button>
                ))}
              </div>
              <div className="w-px h-6 bg-app-border shrink-0 hidden sm:block" />
              <button 
                className="w-9 h-9 bg-app-surface text-app-text-secondary rounded-xl flex items-center justify-center hover:bg-app-bg transition-colors shrink-0 border border-app-border shadow-sm"
                onClick={() => setShowAddPlan(true)}
                title="Add New Plan"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button 
                className="flex-1 sm:flex-none bg-app-surface border border-app-border text-app-text-primary px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-app-bg transition-colors shadow-sm flex items-center justify-center gap-2" 
                onClick={() => window.print()}
              >
                <Printer size={14} /> {t("project_detail.print_sheet")}
              </button>
              <button 
                className="flex-1 sm:flex-none bg-app-tab-active text-app-bg px-4 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-colors shadow-sm flex items-center justify-center gap-2" 
                onClick={() => setAddDefModal(true)}
              >
                <Plus size={14} /> {t("project_detail.installment_col")}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showAddPlan && (
              <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[500] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowAddPlan(false)}>
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="bg-app-surface-elevated rounded-3xl w-full max-w-sm p-8 shadow-2xl border border-app-border"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="w-16 h-16 bg-app-bg text-app-text-primary rounded-2xl flex items-center justify-center mb-6 mx-auto border border-app-border">
                    <Table size={32} />
                  </div>
                  <h3 className="text-xl font-black text-app-text-primary mb-2 text-center">New Installment Plan</h3>
                  <p className="text-sm text-app-text-secondary font-medium mb-6 text-center">Create a new structure for installments for this project.</p>
                  
                  <FG label="Plan Name">
                    <input 
                      autoFocus
                      className="w-full px-4 py-3.5 bg-app-bg border border-app-border rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all font-bold text-app-text-primary"
                      placeholder="e.g. Revised Plan 2024"
                      value={newPlanName}
                      onChange={e => setNewPlanName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newPlanName.trim()) {
                          const newId = uid("PLN-");
                          setActivePlanId(newId);
                          onAddPlan({ id: newId, projectId: project.id, name: newPlanName.trim() });
                          setNewPlanName("");
                          setShowAddPlan(false);
                        }
                      }}
                    />
                  </FG>
                  
                  <div className="flex gap-3 mt-8">
                    <button 
                      className="flex-1 bg-app-bg text-app-text-secondary font-bold py-3.5 rounded-2xl hover:bg-app-border transition-colors border border-app-border"
                      onClick={() => setShowAddPlan(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      className="flex-1 bg-app-tab-active text-app-bg font-bold py-3.5 rounded-2xl hover:opacity-90 transition-colors shadow-lg shadow-app-border disabled:opacity-50"
                      disabled={!newPlanName.trim()}
                      onClick={() => {
                        if (newPlanName.trim()) {
                          const newId = uid("PLN-");
                          setActivePlanId(newId);
                          onAddPlan({ id: newId, projectId: project.id, name: newPlanName.trim() });
                          setNewPlanName("");
                          setShowAddPlan(false);
                        }
                      }}
                    >
                      Create Plan
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
          
          {basePrjClients.length === 0 ? (
            <div className="text-center py-12 bg-app-surface rounded-3xl border border-app-border text-app-text-muted font-bold text-sm">
              {t("project_detail.add_client_prompt")}
            </div>
          ) : prjDefs.length === 0 ? (
            <div className="text-center py-12 bg-app-surface rounded-3xl border border-app-border text-app-text-muted font-bold text-sm">
              {t("project_detail.add_inst_prompt")}
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh] rounded-2xl border border-app-border bg-app-surface shadow-sm scrollbar-thin scrollbar-thumb-app-border scrollbar-track-transparent transition-colors">
              <table className="w-full text-xs border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="sticky left-0 top-0 z-30 bg-app-nav-bg text-white text-left p-3 min-w-[140px] font-bold border-r border-b border-app-border/30 shadow-[4px_0_8px_rgba(0,0,0,0.3)] transition-colors">
                      {t("project_detail.client_col")}
                      <div className="relative mt-2 flex items-center">
                        <Search size={12} className="absolute left-2 text-white/60" />
                        <input 
                          className="w-full pl-7 pr-7 py-1 !bg-white/10 !border-white/20 rounded-lg text-[10px] focus:outline-none focus:ring-1 focus:ring-white/40 placeholder:text-white/40 !text-white transition-all"
                          placeholder={t("client_info.search_ph")}
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          onClick={e => e.stopPropagation()}
                        />
                        {search && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSearch(""); }}
                            className="absolute right-2 text-app-text-muted hover:text-app-text-secondary p-0.5"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    </th>
                    {prjDefs.map((d: any, i: number) => {
                      return (
                        <th 
                          key={`${d.id}-${i}`} 
                          className="sticky top-0 z-10 bg-app-nav-bg text-white p-3 min-w-[120px] font-bold border-r border-b border-app-border/30 text-center transition-colors cursor-pointer select-none group relative"
                          onMouseDown={() => handleDefLongPressStart(d)}
                          onMouseUp={handleDefLongPressEnd}
                          onMouseLeave={handleDefLongPressEnd}
                          onTouchStart={() => handleDefLongPressStart(d)}
                          onTouchEnd={handleDefLongPressEnd}
                        >
                          <div className="text-[11px] mb-1 flex items-center justify-center gap-1">
                            {d.title}
                            {d.isGlobal && <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded border border-blue-500/30">BASIC</span>}
                          </div>
                          <div className="text-[9px] text-white/70 font-medium">{BDT(d.targetAmount)}</div>
                          {d.dueDate && <div className="text-[8px] text-white/50 mt-0.5">{d.dueDate}</div>}
                          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </th>
                      );
                    })}
                    <th className="sticky top-0 z-10 bg-app-nav-bg text-white p-3 min-w-[100px] font-bold text-center border-r border-b border-app-border/30 transition-colors">{t("project_detail.total_col")}</th>
                  </tr>
                </thead>
                <tbody>
                  {prjClients.length === 0 ? (
                    <tr>
                      <td colSpan={prjDefs.length + 2} className="p-12 text-center text-app-text-muted font-bold bg-app-surface">
                        {t("client_info.no_results") || "No results found"}
                      </td>
                    </tr>
                  ) : (
                    prjClients.map((client: any) => {
                      const assignment = client.planAssignments?.find((pa: any) => pa.planId === activePlanId);
                      const shareCount = assignment ? assignment.shareCount : (client.shareCount || 1);
                      const rowTotal = prjDefs.reduce((s: number, d: any) => s + clientPaidForDef(client.id, d.id, payments), 0);
                      const rowTarget = prjDefs.reduce((s: number, d: any) => s + (d.isGlobal ? 1 : shareCount) * d.targetAmount, 0);
                      
                      return (
                        <tr key={client.id} className="group hover:bg-app-bg transition-colors">
                          <td className="sticky left-0 z-20 bg-app-surface group-hover:bg-app-bg border-r border-b border-app-border p-3 transition-colors shadow-[4px_0_8_rgba(0,0,0,0.03)]">
                            <div className="flex items-center gap-3">
                              <ClientAvatar client={client} size={32} />
                              <div>
                                <div className="text-xs font-bold text-app-text-primary">{client.name}</div>
                                <div className="text-[10px] text-app-text-secondary font-medium">{client.plot} {shareCount > 1 && <span className="text-blue-600 dark:text-blue-400">({shareCount} {t("client_info.shares")})</span>}</div>
                              </div>
                            </div>
                          </td>
                          {prjDefs.map((d: any, i: number) => {
                            const sc = d.isGlobal ? 1 : shareCount;
                            const cellTarget = d.targetAmount * sc;
                            const paid = clientPaidForDef(client.id, d.id, payments);
                            const pendingAmt = payments.filter((p: any) => p.clientId === client.id && p.instDefId === d.id && p.status === "pending").reduce((s: number, p: any) => s + p.amount, 0);
                            const st = cellStatus(paid, cellTarget);
                            const pct = Math.round((paid / cellTarget) * 100);
                            const m = STATUS[st];
                            
                            return (
                              <td key={`${d.id}-${i}`} className="p-2 border-r border-b border-app-border text-center align-middle transition-colors">
                                <button 
                                  className={cn("w-full rounded-xl p-2 cursor-pointer transition-transform active:scale-95", m.bg)} 
                                  onClick={() => setCellModal({ client, instDef: d })}
                                >
                                  <span className={cn("block text-xs font-black whitespace-nowrap", m.text)}>
                                    {paid > 0 ? BDTshort(paid) : "—"}
                                  </span>
                                  <span className="block text-[9px] text-app-text-muted font-medium mt-0.5">
                                    {BDTshort(cellTarget)}
                                  </span>
                                  {pendingAmt > 0 && <span className="block text-[9px] text-amber-600 dark:text-amber-400 font-bold mt-1 flex items-center justify-center gap-0.5"><Clock size={10} /> {BDTshort(pendingAmt)}</span>}
                                  {paid > 0 && (
                                    <div className="h-1 bg-white/50 rounded-full mt-1.5 overflow-hidden">
                                      <div className={cn("h-full rounded-full", m.bar)} style={{ width: `${pct}%` }} />
                                    </div>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                          <td className="p-3 text-center align-middle border-r border-b border-app-border transition-colors">
                            <div className={cn("text-xs font-black", rowTotal >= rowTarget ? "text-emerald-600 dark:text-emerald-400" : rowTotal > 0 ? "text-amber-600 dark:text-amber-400" : "text-app-text-muted")}>
                              {rowTotal > 0 ? BDTshort(rowTotal) : "—"}
                            </div>
                            <div className="text-[10px] text-app-text-muted font-medium mt-0.5">{BDTshort(rowTarget)}</div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                  <tr className="bg-app-nav-bg text-white font-bold transition-colors">
                    <td className="sticky left-0 z-20 bg-app-nav-bg border-r border-white/10 p-3 text-white text-xs shadow-[2px_0_5px_rgba(0,0,0,0.2)]">{t("project_detail.total_col")}</td>
                    {prjDefs.map((d: any, i: number) => {
                      const ct = prjClients.reduce((s: number, c: any) => s + clientPaidForDef(c.id, d.id, payments), 0);
                      const cT = prjClients.reduce((s: number, c: any) => {
                        const assignment = c.planAssignments?.find((pa: any) => pa.planId === activePlanId);
                        const sc = d.isGlobal ? 1 : (assignment ? assignment.shareCount : (c.shareCount || 1));
                        return s + sc * d.targetAmount;
                      }, 0);
                      return (
                        <td key={`${d.id}-${i}`} className="p-3 border-r border-white/10 text-center align-middle">
                          <div className="text-xs font-black text-white">{BDTshort(ct)}</div>
                          <div className="text-[10px] text-white/70 font-medium mt-0.5">{cT > 0 ? Math.round((ct / cT) * 100) : 0}%</div>
                        </td>
                      );
                    })}
                    <td className="p-3 text-center align-middle">
                      <div className="text-sm font-black text-emerald-400">{BDTshort(totalCollected)}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "clientinfo" && (
        <ClientInfoPage 
          clients={allPrjClients} allClients={allClients} onUpdate={onUpdateClient} 
          onAddBulk={onAddBulkClients} onAddSingle={onAddClient} onDelete={onDeleteClient} 
          projectId={project.id} plans={plans}
        />
      )}

      {tab === "kistisum" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-3">
          {prjClients.length === 0 && (
            <div className="text-center py-12 bg-app-surface rounded-3xl border border-app-border text-app-text-muted font-bold text-sm">
              {t("project_detail.no_clients")}
            </div>
          )}
          {prjClients.map((c: any) => {
            const assignment = c.planAssignments?.find((pa: any) => pa.planId === activePlanId);
            const shareCount = assignment ? assignment.shareCount : (c.shareCount || 1);
            
            // Project-wide client stats
            const cPaid = payments.filter((p: any) => p.clientId === c.id && p.status === "approved" && allPrjDefs.some(d => d.id === p.instDefId)).reduce((s: number, p: any) => s + p.amount, 0);
            
            const cTarget = allPrjClients.filter(cl => cl.id === c.id).reduce((s: number, cl: any) => {
              const assignments = cl.planAssignments || [];
              if (assignments.length > 0) {
                return s + assignments.reduce((as: number, pa: any) => {
                  const pDefs = instDefs.filter((d: any) => d.planId === pa.planId);
                  return as + (pDefs.reduce((ds: number, d: any) => ds + d.targetAmount, 0) * pa.shareCount);
                }, 0);
              } else {
                const firstPlan = prjPlans[0];
                if (!firstPlan) return s;
                const pDefs = instDefs.filter((d: any) => d.planId === firstPlan.id);
                return s + (pDefs.reduce((ds: number, d: any) => ds + d.targetAmount, 0) * (cl.shareCount || 1));
              }
            }, 0);

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
                      {shareCount > 1 && (
                        <>
                          {" · "}
                          <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-bold border border-blue-500/20">
                            {shareCount} {t("client_info.shares")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <PBar paid={cPaid} target={cTarget || (c.totalAmount * shareCount)} />
              </div>
            );
          })}
        </div>
      )}

      {tab === "payments" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-app-surface rounded-3xl border border-app-border p-6 flex items-center gap-5 mb-6 shadow-sm transition-colors">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/30">
              <CreditCard size={32} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-app-text-secondary uppercase tracking-wider mb-1 truncate">{t("project_detail.total_collected")}</div>
              <div className="text-3xl font-black text-app-text-primary tracking-tight">{BDT(projectCollected)}</div>
            </div>
          </div>

          <div className="space-y-3">
            {payments && payments.filter((p: any) => {
              return allPrjClients.some((c: any) => c.id === p.clientId);
            }).sort((a: any, b: any) => b.date.localeCompare(a.date)).map((p: any, i: number) => {
              const client = allPrjClients.find((c: any) => c.id === p.clientId);
              const def = allPrjDefs.find((d: any) => d.id === p.instDefId);
              return (
                <div key={`${p.id}-${i}`} className="bg-app-surface rounded-2xl border border-app-border p-4 shadow-sm flex items-center gap-4 transition-colors">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", p.status === "approved" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20")}>
                    {p.status === "approved" ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-app-text-primary truncate">{client?.name}</div>
                    <div className="text-[10px] text-app-text-secondary font-medium mt-0.5 truncate">{def?.title} · {p.date}</div>
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
            })}
          </div>
        </div>
      )}

      {tab === "expenses" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-app-surface rounded-3xl border border-app-border p-6 flex flex-col sm:flex-row sm:items-center gap-5 mb-6 shadow-sm transition-colors">
            <div className="flex items-center gap-5 flex-1 min-w-0">
              <div className="w-16 h-16 bg-rose-500/20 text-rose-700 dark:text-rose-400 rounded-2xl flex items-center justify-center shrink-0 border border-rose-500/30">
                <CategoryIcon category="মোট ব্যয়" size={32} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-app-text-secondary uppercase tracking-wider mb-1">{t("project_detail.total_expense")}</div>
                <div className="text-2xl sm:text-3xl font-black text-app-text-primary tracking-tight break-words">
                  {BDT(prjExpenses.reduce((s: number, e: any) => s + e.amount, 0))}
                </div>
              </div>
            </div>
            <button 
              className="w-full sm:w-auto bg-app-tab-active text-app-bg px-5 py-3.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-sm flex items-center justify-center gap-2 shrink-0" 
              onClick={() => setAddExpModal(true)}
            >
              <Plus size={18} /> {t("project_detail.new_expense")}
            </button>
          </div>
          
          {prjExpenses.length === 0 ? (
            <div className="text-center py-12 bg-app-surface rounded-3xl border border-app-border text-app-text-muted font-bold text-sm transition-colors">
              {t("project_detail.no_expenses")}
            </div>
          ) : (
            <div className="space-y-3">
              {[...prjExpenses].sort((a, b) => b.date.localeCompare(a.date)).map((e: any, i: number) => {
                return (
                  <div key={`${e.id}-${i}`} className="bg-app-surface rounded-2xl border border-app-border p-4 shadow-sm flex items-center gap-4 transition-colors">
                    <div 
                      className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border", CategoryColor(e.category))}
                    >
                      <CategoryIcon category={e.category} size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-app-text-primary">{e.category}</div>
                      <div className="text-xs text-app-text-secondary font-medium mt-0.5 truncate">{e.description}</div>
                      <div className="text-[10px] text-app-text-muted mt-1">{e.date}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-base font-black text-app-text-primary">{BDT(e.amount)}</div>
                      <div className="flex gap-2">
                        <button 
                          className="w-8 h-8 bg-app-bg text-app-text-secondary rounded-lg flex items-center justify-center hover:bg-app-border transition-colors border border-app-border" 
                          onClick={() => setEditExpModal(e)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="w-8 h-8 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center hover:bg-rose-500/20 transition-colors border border-rose-500/20" 
                          onClick={() => setDelExp(e)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "log" && (
        <div className="bg-app-surface rounded-2xl border border-app-border p-2 transition-colors">
          {prjLogs.length === 0 ? (
            <div className="text-center py-10 text-app-text-muted font-medium italic">{t("project_detail.no_activity")}</div>
          ) : (
            prjLogs.map((l, i) => <LogRow key={`${l.id}-${i}`} log={l} projects={[project]} />)
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
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
        {cellModal && <CellPaySheet client={cellModal.client} instDef={cellModal.instDef} payments={payments} project={project} isSuperAdmin={isSuperAdmin} onSave={(p: any) => { onAddPayment(p); setCellModal(null); }} onDelete={(id: string) => onDeletePayment(id)} onClose={() => setCellModal(null)} />}
        {addDefModal && <AddDefSheet projectId={project.id} planId={activePlanId} onSave={(d: any) => { onAddDef(d); setAddDefModal(false); }} onClose={() => setAddDefModal(false)} />}
        {editDefModal && <EditDefSheet def={editDefModal} onSave={(d: any) => { onUpdateInstDef(d); setEditDefModal(null); }} onDelete={(id: string) => { onDeleteInstDef(id, activePlanId); setEditDefModal(null); }} onClose={() => setEditDefModal(null)} />}
        {addExpModal && <AddExpSheet projectId={project.id} onSave={(e: any) => { onAddExpense(e); setAddExpModal(false); }} onClose={() => setAddExpModal(false)} />}
        {editExpModal && <AddExpSheet projectId={project.id} expense={editExpModal} onSave={(e: any) => { onUpdateExpense(e); setEditExpModal(null); }} onClose={() => setEditExpModal(null)} />}
        {delExp && <ConfirmDelete message={<><b>{delExp.category}</b> — {BDT(delExp.amount)}{t("project_detail.will_be_deleted")}</>} onConfirm={() => { onDeleteExpense(delExp.id); setDelExp(null); }} onClose={() => setDelExp(null)} />}
        
        {editPlanModal && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[500] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setEditPlanModal(null)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-app-surface-elevated rounded-3xl w-full max-w-sm p-8 shadow-2xl border border-app-border"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-blue-500/20">
                <Edit2 size={32} />
              </div>
              <h3 className="text-xl font-black text-app-text-primary mb-2 text-center">Edit Plan Name</h3>
              <p className="text-sm text-app-text-secondary font-medium mb-6 text-center">Change the name of this installment plan.</p>
              
              <FG label="Plan Name">
                <input 
                  autoFocus
                  className="w-full px-4 py-3.5 bg-app-bg border border-app-border rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all font-bold text-app-text-primary"
                  value={editPlanName}
                  onChange={e => setEditPlanName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && editPlanName.trim()) {
                      onUpdatePlan({ ...editPlanModal, name: editPlanName.trim() });
                      setEditPlanModal(null);
                    }
                  }}
                />
              </FG>
              
              <div className="flex gap-3 mt-8">
                <button 
                  className="flex-1 bg-app-bg text-app-text-secondary font-bold py-3.5 rounded-2xl hover:bg-app-border transition-colors border border-app-border"
                  onClick={() => setEditPlanModal(null)}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 bg-app-tab-active text-app-bg font-bold py-3.5 rounded-2xl hover:opacity-90 transition-colors shadow-lg shadow-app-border disabled:opacity-50"
                  disabled={!editPlanName.trim()}
                  onClick={() => {
                    if (editPlanName.trim()) {
                      onUpdatePlan({ ...editPlanModal, name: editPlanName.trim() });
                      setEditPlanModal(null);
                    }
                  }}
                >
                  Save Changes
                </button>
              </div>
              
              {isSuperAdmin && (
                <button 
                  className="w-full mt-6 text-rose-600 dark:text-rose-400 font-bold text-xs hover:underline flex items-center justify-center gap-1"
                  onClick={() => setDeletePlanTarget(editPlanModal)}
                >
                  <Trash2 size={12} /> Delete Plan
                </button>
              )}
            </motion.div>
          </div>
        )}
        {deletePlanTarget && (
          <ConfirmDeletePlan 
            plan={deletePlanTarget} 
            amount={instDefs.filter((d: any) => d.planId === deletePlanTarget.id).reduce((s: number, d: any) => s + d.targetAmount, 0)}
            onConfirm={() => {
              onDeletePlan(deletePlanTarget.id);
              setDeletePlanTarget(null);
              setEditPlanModal(null);
            }}
            onClose={() => setDeletePlanTarget(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
