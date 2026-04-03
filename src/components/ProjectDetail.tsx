import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BDT, BDTshort, dotJoin, ac, initials, uid, todayStr, cn, clientPaidForDef, cellStatus } from "../lib/utils";
import { FG, ConfirmDelete, ClientAvatar, PassCell, PBar, CategoryIcon, CategoryColor } from "./Shared";
import { STATUS, EXP_CATS } from "../lib/data";
import { LogRow } from "./Admin";
import { ClientInfoPage } from "./ClientInfo";
import { CellPaySheet, AddDefSheet, AddExpSheet, ReceiptSheet } from "./ProjectModals";
import { Trash2, Clock, CheckCircle2, Building2, Table, Users, CreditCard, ClipboardList, ArrowLeft, Plus, Printer, FileText, Edit2, Search, Filter } from "lucide-react";

import { useLanguage } from "../lib/i18n";

export function ProjectDetail({ project, clients, allClients, instDefs, plans, payments, expenses, logs, isSuperAdmin, onBack, onAddPlan, onUpdatePlan, onDeletePlan, onAddDef, onDeleteInstDef, onAddPayment, onDeletePayment, onAddExpense, onUpdateExpense, onUpdateClient, onAddBulkClients, onAddClient, onDeleteClient, onDeleteExpense }: any) {
  const { t } = useLanguage();
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
  const [defTaps, setDefTaps] = useState<any>({});
  
  const prjPlans = plans.filter((pl: any) => pl.projectId === project.id);
  useEffect(() => {
    if (prjPlans.length > 0 && !activePlanId) setActivePlanId(prjPlans[0].id);
  }, [prjPlans, activePlanId]);

  const prjClients = clients.filter((c: any) => {
    if (c.projectId !== project.id) return false;
    // If no plan assignments, they belong to the first/default plan
    const assignments = c.planAssignments || [];
    if (assignments.length === 0) {
      return activePlanId === prjPlans[0]?.id;
    }
    // Otherwise, show only if assigned to the active plan
    return assignments.some((pa: any) => pa.planId === activePlanId);
  }).filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()));
  
  const allPrjClients = clients.filter((c: any) => c.projectId === project.id).filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()));
  const prjDefs = instDefs.filter((d: any) => d.planId === activePlanId);
  const prjExpenses = expenses.filter((e: any) => e.projectId === project.id);
  const prjLogs = [...logs].filter(l => l.projectId === project.id).sort((a, b) => b.ts.localeCompare(a.ts));
  
  const totalCollected = payments.filter((p: any) => {
    if (p.status !== "approved") return false;
    const def = prjDefs.find(d => d.id === p.instDefId);
    return !!def;
  }).reduce((s: number, p: any) => s + p.amount, 0);
  const totalTarget = prjClients.reduce((s: number, c: any) => {
    const assignment = c.planAssignments?.find((pa: any) => pa.planId === activePlanId);
    const sc = assignment ? assignment.shareCount : (c.shareCount || 1);
    return s + sc * prjDefs.reduce((ss: number, d: any) => ss + d.targetAmount, 0);
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
      <div className="flex items-center gap-4 mb-6">
        <button 
          className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shadow-sm shrink-0" 
          onClick={onBack}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xl font-black text-slate-900 truncate">{project.name}</div>
          <div className="text-xs font-bold text-slate-500">{t("project_detail.stats", { clients: prjClients.length, insts: prjDefs.length })}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col justify-center items-center text-center">
          <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-2"><CheckCircle2 size={16} /></div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{t("project_detail.collected")}</div>
          <div className="text-sm font-black text-slate-900">{BDTshort(totalCollected)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col justify-center items-center text-center">
          <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center mb-2"><Clock size={16} /></div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{t("project_detail.due")}</div>
          <div className="text-sm font-black text-slate-900">{BDTshort(totalDue)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col justify-center items-center text-center">
          <div className="w-8 h-8 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center mb-2"><Building2 size={16} /></div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{t("project_detail.expense")}</div>
          <div className="text-sm font-black text-slate-900">{BDTshort(prjExpenses.reduce((s: number, e: any) => s + e.amount, 0))}</div>
        </div>
      </div>

      <div className="flex bg-slate-200/50 p-1 rounded-xl mb-6 overflow-x-auto scrollbar-hide">
        {TABS.map(([v, l]) => (
          <button 
            key={v} 
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap", 
              tab === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
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
                        ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-200" 
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    {pl.name}
                  </button>
                ))}
              </div>
              <div className="w-px h-6 bg-slate-200 shrink-0 hidden sm:block" />
              <button 
                className="w-9 h-9 bg-white text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors shrink-0 border border-slate-200 shadow-sm"
                onClick={() => setShowAddPlan(true)}
                title="Add New Plan"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button 
                className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center gap-2" 
                onClick={() => window.print()}
              >
                <Printer size={14} /> {t("project_detail.print_sheet")}
              </button>
              <button 
                className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2" 
                onClick={() => setAddDefModal(true)}
              >
                <Plus size={14} /> {t("project_detail.installment_col")}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showAddPlan && (
              <div className="fixed inset-0 bg-slate-900/60 z-[500] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowAddPlan(false)}>
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl border border-slate-200"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="w-16 h-16 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                    <Table size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2 text-center">New Installment Plan</h3>
                  <p className="text-sm text-slate-500 font-medium mb-6 text-center">Create a new structure for installments for this project.</p>
                  
                  <FG label="Plan Name">
                    <input 
                      autoFocus
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all font-bold"
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
                      className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-2xl hover:bg-slate-200 transition-colors"
                      onClick={() => setShowAddPlan(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      className="flex-1 bg-slate-900 text-white font-bold py-3.5 rounded-2xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 disabled:opacity-50"
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
          
          {prjClients.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-400 font-bold text-sm">
              {t("project_detail.add_client_prompt")}
            </div>
          ) : prjDefs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-400 font-bold text-sm">
              {t("project_detail.add_inst_prompt")}
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh] rounded-2xl border border-slate-200 bg-white shadow-sm scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              <table className="w-full text-xs border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="sticky left-0 top-0 z-30 bg-slate-900 text-white text-left p-3 min-w-[140px] font-bold border-r border-b border-white/10 shadow-[4px_0_8px_rgba(0,0,0,0.15)]">
                      {t("project_detail.client_col")}
                      <div className="relative mt-2 flex items-center">
                        <Search size={12} className="absolute left-2 text-white/50" />
                        <input 
                          className="w-full pl-7 pr-7 py-1 bg-white/10 border border-white/20 rounded-lg text-[10px] focus:outline-none focus:border-white/40 placeholder:text-white/40"
                          placeholder={t("client_info.search_ph")}
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          onClick={e => e.stopPropagation()}
                        />
                        <Filter size={12} className="absolute right-2 text-white/50 cursor-pointer hover:text-white" />
                      </div>
                    </th>
                    {prjDefs.map((d: any) => {
                      const taps = defTaps[d.id] || 0;
                      const tapColor = taps === 0 ? "text-rose-400" : taps === 1 ? "text-amber-500" : "text-emerald-500";
                      const tapBg = taps === 0 ? "bg-rose-500/20" : taps === 1 ? "bg-amber-500/20" : "bg-emerald-500/20";
                      const tapLabel = taps === 0 ? t("project_detail.delete") : taps === 1 ? t("project_detail.confirm_2_3") : t("project_detail.delete_3_3");
                      
                      return (
                        <th key={d.id} className="sticky top-0 z-10 bg-slate-900 text-white p-3 min-w-[120px] font-bold border-r border-b border-white/10 text-center">
                          <div className="text-[11px] mb-1">{d.title}</div>
                          <div className="text-[9px] text-slate-400 font-medium">{BDT(d.targetAmount)}</div>
                          {d.dueDate && <div className="text-[8px] text-slate-500 mt-0.5">{d.dueDate}</div>}
                          {isSuperAdmin && (
                            <button
                              onClick={() => {
                                const cur = defTaps[d.id] || 0;
                                if (cur >= 2) {
                                  onDeleteInstDef(d.id);
                                  setDefTaps((p: any) => { const n = { ...p }; delete n[d.id]; return n; });
                                } else {
                                  setDefTaps((p: any) => ({ ...p, [d.id]: cur + 1 }));
                                  setTimeout(() => setDefTaps((p: any) => { const n = { ...p }; if (n[d.id] === cur + 1) delete n[d.id]; return n; }), 3000);
                                }
                              }}
                              className={cn("mt-2 px-2 py-1 rounded-md text-[9px] font-bold w-full transition-colors flex items-center justify-center gap-1", tapBg, tapColor)}
                            >
                              <Trash2 size={10} /> {tapLabel}
                            </button>
                          )}
                        </th>
                      );
                    })}
                    <th className="sticky top-0 z-10 bg-slate-900 text-white p-3 min-w-[100px] font-bold text-center border-b border-white/10">{t("project_detail.total_col")}</th>
                  </tr>
                </thead>
                <tbody>
                  {prjClients.map((client: any) => {
                    const assignment = client.planAssignments?.find((pa: any) => pa.planId === activePlanId);
                    const shareCount = assignment ? assignment.shareCount : (client.shareCount || 1);
                    const rowTotal = prjDefs.reduce((s: number, d: any) => s + clientPaidForDef(client.id, d.id, payments), 0);
                    const rowTarget = prjDefs.reduce((s: number, d: any) => s + d.targetAmount, 0) * shareCount;
                    
                    return (
                      <tr key={client.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50 border-r border-b border-slate-100 p-3 transition-colors shadow-[4px_0_8_rgba(0,0,0,0.03)]">
                          <div className="flex items-center gap-3">
                            <ClientAvatar client={client} size={32} />
                            <div>
                              <div className="text-xs font-bold text-slate-900">{client.name}</div>
                              <div className="text-[10px] text-slate-500 font-medium">{client.plot} {shareCount > 1 && <span className="text-blue-600">({shareCount} {t("client_info.shares")})</span>}</div>
                            </div>
                          </div>
                        </td>
                        {prjDefs.map((d: any) => {
                          const cellTarget = d.targetAmount * shareCount;
                          const paid = clientPaidForDef(client.id, d.id, payments);
                          const pendingAmt = payments.filter((p: any) => p.clientId === client.id && p.instDefId === d.id && p.status === "pending").reduce((s: number, p: any) => s + p.amount, 0);
                          const st = cellStatus(paid, cellTarget);
                          const pct = Math.round((paid / cellTarget) * 100);
                          const m = STATUS[st];
                          
                          return (
                            <td key={d.id} className="p-2 border-r border-b border-slate-100 text-center align-middle">
                              <button 
                                className={cn("w-full rounded-xl p-2 cursor-pointer transition-transform active:scale-95", m.bg)} 
                                onClick={() => setCellModal({ client, instDef: d })}
                              >
                                <span className={cn("block text-xs font-black whitespace-nowrap", m.text)}>
                                  {paid > 0 ? BDTshort(paid) : "—"}
                                </span>
                                <span className="block text-[9px] text-slate-400 font-medium mt-0.5">
                                  {BDTshort(cellTarget)}
                                </span>
                                {pendingAmt > 0 && <span className="block text-[9px] text-amber-600 font-bold mt-1 flex items-center justify-center gap-0.5"><Clock size={10} /> {BDTshort(pendingAmt)}</span>}
                                {paid > 0 && (
                                  <div className="h-1 bg-white/50 rounded-full mt-1.5 overflow-hidden">
                                    <div className={cn("h-full rounded-full", m.bar)} style={{ width: `${pct}%` }} />
                                  </div>
                                )}
                              </button>
                            </td>
                          );
                        })}
                        <td className="p-3 text-center align-middle border-b border-slate-100">
                          <div className={cn("text-xs font-black", rowTotal >= rowTarget ? "text-emerald-600" : rowTotal > 0 ? "text-amber-600" : "text-slate-400")}>
                            {BDTshort(rowTotal)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">{BDTshort(rowTarget)}</div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-50 font-bold">
                    <td className="sticky left-0 z-20 bg-slate-50 border-r border-slate-200 p-3 text-slate-900 text-xs shadow-[2px_0_5px_rgba(0,0,0,0.05)]">{t("project_detail.total_col")}</td>
                    {prjDefs.map((d: any) => {
                      const ct = prjClients.reduce((s: number, c: any) => s + clientPaidForDef(c.id, d.id, payments), 0);
                      const cT = prjClients.reduce((s: number, c: any) => {
                        const assignment = c.planAssignments?.find((pa: any) => pa.planId === activePlanId);
                        const sc = assignment ? assignment.shareCount : (c.shareCount || 1);
                        return s + sc * d.targetAmount;
                      }, 0);
                      return (
                        <td key={d.id} className="p-3 border-r border-slate-100 text-center align-middle">
                          <div className="text-xs font-black text-slate-900">{BDTshort(ct)}</div>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">{cT > 0 ? Math.round((ct / cT) * 100) : 0}%</div>
                        </td>
                      );
                    })}
                    <td className="p-3 text-center align-middle">
                      <div className="text-sm font-black text-emerald-600">{BDTshort(totalCollected)}</div>
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
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-400 font-bold text-sm">
              {t("project_detail.no_clients")}
            </div>
          )}
          {prjClients.map((c: any) => {
            const assignment = c.planAssignments?.find((pa: any) => pa.planId === activePlanId);
            const shareCount = assignment ? assignment.shareCount : (c.shareCount || 1);
            const cPaid = payments.filter((p: any) => p.clientId === c.id && p.status === "approved" && prjDefs.find(d => d.id === p.instDefId)).reduce((s: number, p: any) => s + p.amount, 0);
            const cTarget = prjDefs.reduce((s: number, d: any) => s + d.targetAmount, 0) * shareCount;
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <ClientAvatar client={c} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-black text-slate-900">{c.name}</div>
                    <div className="text-xs text-slate-500 font-medium mt-1">
                      {c.phone}
                      {c.plot && (
                        <>
                          {" · "}
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                            {c.plot}
                          </span>
                        </>
                      )}
                      {shareCount > 1 && (
                        <>
                          {" · "}
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
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
          <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center gap-5 mb-6 shadow-sm">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <CreditCard size={32} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 truncate">{t("project_detail.total_collected")}</div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">{BDT(totalCollected)}</div>
            </div>
          </div>

          <div className="space-y-3">
            {payments && payments.filter((p: any) => {
              if (!prjClients.find((c: any) => c.id === p.clientId)) return false;
              return !!prjDefs.find(d => d.id === p.instDefId);
            }).sort((a: any, b: any) => b.date.localeCompare(a.date)).map((p: any, i: number) => {
              const client = prjClients.find((c: any) => c.id === p.clientId);
              const def = prjDefs.find((d: any) => d.id === p.instDefId);
              return (
                <div key={`${p.id}-${i}`} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", p.status === "approved" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                    {p.status === "approved" ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{client?.name}</div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">{def?.title} · {p.date}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-sm font-black text-slate-900">{BDT(p.amount)}</div>
                    {p.status === "approved" && (
                      <button 
                        onClick={() => setViewR({ payment: p, client, instDef: def })}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
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
          <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center gap-5 mb-6 shadow-sm">
            <div className="flex items-center gap-5 flex-1 min-w-0">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
                <CategoryIcon category="মোট ব্যয়" size={32} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t("project_detail.total_expense")}</div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight break-words">
                  {BDT(prjExpenses.reduce((s: number, e: any) => s + e.amount, 0))}
                </div>
              </div>
            </div>
            <button 
              className="w-full sm:w-auto bg-slate-900 text-white px-5 py-3.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 shrink-0" 
              onClick={() => setAddExpModal(true)}
            >
              <Plus size={18} /> {t("project_detail.new_expense")}
            </button>
          </div>
          
          {prjExpenses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-400 font-bold text-sm">
              {t("project_detail.no_expenses")}
            </div>
          ) : (
            <div className="space-y-3">
              {[...prjExpenses].sort((a, b) => b.date.localeCompare(a.date)).map((e: any, i: number) => {
                return (
                  <div key={`${e.id}-${i}`} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
                    <div 
                      className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", CategoryColor(e.category))}
                    >
                      <CategoryIcon category={e.category} size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900">{e.category}</div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5 truncate">{e.description}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{e.date}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-base font-black text-slate-900">{BDT(e.amount)}</div>
                      <div className="flex gap-2">
                        <button 
                          className="w-8 h-8 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors" 
                          onClick={() => setEditExpModal(e)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center hover:bg-rose-100 transition-colors" 
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
        <div className="bg-white rounded-2xl border border-slate-200 p-2">
          {prjLogs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 font-medium">{t("project_detail.no_activity")}</div>
          ) : (
            prjLogs.map((l, i) => <LogRow key={`${l.id}-${i}`} log={l} projects={[project]} />)
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {viewR && <ReceiptSheet payment={viewR.payment} instDef={viewR.instDef} client={viewR.client} project={project} onClose={() => setViewR(null)} />}
        {cellModal && <CellPaySheet client={cellModal.client} instDef={cellModal.instDef} payments={payments} project={project} isSuperAdmin={isSuperAdmin} onSave={(p: any) => { onAddPayment(p); setCellModal(null); }} onDelete={(id: string) => onDeletePayment(id)} onClose={() => setCellModal(null)} />}
        {addDefModal && <AddDefSheet projectId={project.id} planId={activePlanId} onSave={(d: any) => { onAddDef(d); setAddDefModal(false); }} onClose={() => setAddDefModal(false)} />}
        {addExpModal && <AddExpSheet projectId={project.id} onSave={(e: any) => { onAddExpense(e); setAddExpModal(false); }} onClose={() => setAddExpModal(false)} />}
        {editExpModal && <AddExpSheet projectId={project.id} expense={editExpModal} onSave={(e: any) => { onUpdateExpense(e); setEditExpModal(null); }} onClose={() => setEditExpModal(null)} />}
        {delExp && <ConfirmDelete message={<><b>{delExp.category}</b> — {BDT(delExp.amount)}{t("project_detail.will_be_deleted")}</>} onConfirm={() => { onDeleteExpense(delExp.id); setDelExp(null); }} onClose={() => setDelExp(null)} />}
        
        {editPlanModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-[500] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setEditPlanModal(null)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl border border-slate-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Edit2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2 text-center">Edit Plan Name</h3>
              <p className="text-sm text-slate-500 font-medium mb-6 text-center">Change the name of this installment plan.</p>
              
              <FG label="Plan Name">
                <input 
                  autoFocus
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all font-bold"
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
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-2xl hover:bg-slate-200 transition-colors"
                  onClick={() => setEditPlanModal(null)}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 bg-slate-900 text-white font-bold py-3.5 rounded-2xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 disabled:opacity-50"
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
                  className="w-full mt-6 text-rose-600 font-bold text-xs hover:underline flex items-center justify-center gap-1"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${editPlanModal.name}"? This will delete all installment definitions in this plan.`)) {
                      onDeletePlan(editPlanModal.id);
                      setEditPlanModal(null);
                    }
                  }}
                >
                  <Trash2 size={12} /> Delete Plan
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
