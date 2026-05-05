import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BDT, BDTshort, uid, cn, clientPaidForDef, cellStatus, tsNow } from "../../../lib/utils";
import { FG, ConfirmDelete, ClientAvatar, ConfirmDeletePlan } from "../../../components/Shared";
import { STATUS } from "../../../lib/data";
import { CellPaySheet, AddDefSheet, EditDefSheet, ReceiptSheet } from "../../../components/ProjectModals";
import { Trash2, Clock, CheckCircle2, Building2, Table, Plus, Printer, FileText, Edit2, Search, X } from "lucide-react";
import { useLanguage } from "../../../lib/i18n";
import { useAppStore } from "../../../store/appStore";
import { db, handleFirestoreError, OperationType } from "../../../firebase";
import { doc, setDoc, updateDoc, deleteDoc, writeBatch, getDocs, query, collection, where } from "firebase/firestore";
import { Project, Plan, Client, InstDef, Payment, Expense } from "../../../types";

const PLAN_FIELDS = ['id', 'projectId', 'name'];
const INST_DEF_FIELDS = ['id', 'projectId', 'planId', 'title', 'dueDate', 'targetAmount'];
const PAYMENT_FIELDS = ['id', 'clientId', 'instDefId', 'amount', 'date', 'status', 'note', 'method', 'trxId', 'approvedBy'];

const sanitize = (data: Record<string, any>, allowedFields: string[]) => {
  const clean: Record<string, any> = {};
  allowedFields.forEach(f => {
    if (data[f] !== undefined) clean[f] = data[f];
  });
  return clean;
};

import { useActions } from "../../../hooks/useActions";

export default function SheetTab({ projectId }: { projectId: string }) {
  const { t } = useLanguage();
  const { projects, clients, instDefs, plans, payments, expenses, auth, setToast } = useAppStore();
  const actions = useActions();
  
  const project = projects.find(p => p.id === projectId);
  const isSuperAdmin = auth?.role === "superadmin";

  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [search, setSearch] = useState("");
  const [editPlanModal, setEditPlanModal] = useState<Plan | null>(null);
  const [editPlanName, setEditPlanName] = useState("");
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [cellModal, setCellModal] = useState<{client: Client, instDef: InstDef} | null>(null);
  const [viewR, setViewR] = useState<{payment: Payment, instDef: InstDef, client: Client} | null>(null);
  const [addDefModal, setAddDefModal] = useState(false);
  const [editDefModal, setEditDefModal] = useState<InstDef | null>(null);
  const [longPressDefTimer, setLongPressDefTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [deletePlanTarget, setDeletePlanTarget] = useState<Plan | null>(null);


  const prjPlans = plans.filter((pl: Plan) => pl.projectId === projectId);
  useEffect(() => {
    if (prjPlans.length > 0 && !activePlanId) setActivePlanId(prjPlans[0].id);
  }, [prjPlans, activePlanId]);

  if (!project) return null;

  const basePrjClients = clients.filter((c: Client) => {
    if (c.projectId !== projectId) return false;
    const assignments = c.planAssignments || [];
    if (assignments.length === 0) return activePlanId === prjPlans[0]?.id;
    return assignments.some((pa) => pa.planId === activePlanId);
  });

  const prjClients = basePrjClients.filter((c: Client) => c.name?.toLowerCase()?.includes(search.toLowerCase()));
  
  const prjDefs = instDefs.filter((d: InstDef) => d.planId === activePlanId);
  const prjExpenses = expenses.filter((e: Expense) => e.projectId === projectId);
  
  // Revised calculations to be plan-specific
  const basePrjClientIds = new Set(basePrjClients.map(c => c.id));
  const prjDefsForPlan = prjDefs;
  const prjDefIds = prjDefsForPlan.map(d => d.id);
  
  const approvedPaymentsForPlan = payments.filter((p: Payment) => 
    p.status === "approved" && 
    prjDefIds.includes(p.instDefId) &&
    basePrjClientIds.has(p.clientId)
  );
  
  const projectCollected = approvedPaymentsForPlan.reduce((s, p) => s + p.amount, 0);
  
  console.log("SheetTab Summary Debug:", {
    activePlanId,
    prjDefIds: prjDefIds.length,
    approvedPaymentsCount: approvedPaymentsForPlan.length,
    collected: projectCollected,
    // Sampling payments to see if they look correct
    samplePayment: approvedPaymentsForPlan[0]
  });

  const projectTarget = prjClients.reduce((s, c) => {
    const assignment = c.planAssignments?.find(pa => pa.planId === activePlanId);
    const sc = assignment ? (assignment.shareCount || 1) : (c.shareCount || 1);
    
    // Sum targets for this specific plan for this client
    const clientPlanTarget = prjDefsForPlan.reduce((ds, d) => {
      return ds + (d.targetAmount * sc);
    }, 0);

    return s + clientPlanTarget;
  }, 0);
  
  console.log("SheetTab Target Debug:", {
    activePlanId,
    clientCount: prjClients.length,
    target: projectTarget
  });

  const projectDue = Math.max(0, projectTarget - projectCollected);
  const totalCollected = projectCollected;

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-app-surface rounded-2xl border border-app-border p-3 flex flex-col justify-center items-center text-center shadow-sm">
          <div className="w-8 h-8 bg-slate-300/50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-lg flex items-center justify-center mb-2 border border-emerald-300/30 dark:border-emerald-500/30"><CheckCircle2 size={16} /></div>
          <div className="text-[10px] text-app-text-muted font-bold uppercase tracking-wider mb-0.5">{t("project_detail.collected")}</div>
          <div className="text-sm font-black text-app-text-primary">{BDTshort(projectCollected)}</div>
        </div>
        <div className="bg-app-surface rounded-2xl border border-app-border p-3 flex flex-col justify-center items-center text-center shadow-sm">
          <div className="w-8 h-8 bg-slate-300/50 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 rounded-lg flex items-center justify-center mb-2 border border-rose-300/30 dark:border-rose-500/30"><Clock size={16} /></div>
          <div className="text-[10px] text-app-text-muted font-bold uppercase tracking-wider mb-0.5">{t("project_detail.due")}</div>
          <div className="text-sm font-black text-app-text-primary">{BDTshort(projectDue)}</div>
        </div>
        <div className="bg-app-surface rounded-2xl border border-app-border p-3 flex flex-col justify-center items-center text-center shadow-sm">
          <div className="w-8 h-8 bg-slate-300/50 text-violet-800 dark:bg-violet-500/20 dark:text-violet-400 rounded-lg flex items-center justify-center mb-2 border border-violet-300/30 dark:border-violet-500/30"><Building2 size={16} /></div>
          <div className="text-[10px] text-app-text-muted font-bold uppercase tracking-wider mb-0.5">{t("project_detail.expense")}</div>
          <div className="text-sm font-black text-app-text-primary">{BDTshort(prjExpenses.reduce((s, e) => s + e.amount, 0))}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 no-print">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 max-w-[calc(100vw-120px)] sm:max-w-[400px]">
            {prjPlans.map((pl: Plan) => (
              <button key={pl.id} onClick={() => !longPressTimer && setActivePlanId(pl.id)} onMouseDown={() => setLongPressTimer(setTimeout(() => { setEditPlanModal(pl); setEditPlanName(pl.name); }, 600))} onMouseUp={() => { clearTimeout(longPressTimer); setLongPressTimer(null); }} onTouchStart={() => setLongPressTimer(setTimeout(() => { setEditPlanModal(pl); setEditPlanName(pl.name); }, 600))} onTouchEnd={() => { clearTimeout(longPressTimer); setLongPressTimer(null); }} className={cn("px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border", activePlanId === pl.id ? "bg-app-tab-active border-app-tab-active text-app-bg shadow-md" : "bg-app-surface border-app-border text-app-text-secondary hover:bg-app-bg")}>
                {pl.name}
              </button>
            ))}
          </div>
          <button className="w-9 h-9 bg-app-surface text-app-text-secondary rounded-xl flex items-center justify-center hover:bg-app-bg shrink-0 border border-app-border shadow-sm" onClick={() => setShowAddPlan(true)}><Plus size={18} /></button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="flex-1 sm:flex-none bg-app-surface border border-app-border text-app-text-primary px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-app-bg shadow-sm flex items-center justify-center gap-2" onClick={() => window.print()}><Printer size={14} /> {t("project_detail.print_sheet")}</button>
          <button className="flex-1 sm:flex-none bg-app-tab-active text-app-bg px-4 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 shadow-sm flex items-center justify-center gap-2" onClick={() => setAddDefModal(true)}><Plus size={14} /> {t("project_detail.installment_col")}</button>
        </div>
      </div>

      {basePrjClients.length === 0 ? (
        <div className="text-center py-12 bg-app-surface rounded-3xl border border-app-border text-app-text-muted font-bold text-sm">{t("project_detail.add_client_prompt")}</div>
      ) : prjDefs.length === 0 ? (
        <div className="text-center py-12 bg-app-surface rounded-3xl border border-app-border text-app-text-muted font-bold text-sm">{t("project_detail.add_inst_prompt")}</div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh] rounded-2xl border border-app-border bg-app-surface shadow-sm scrollbar-thin transition-colors">
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 bg-app-nav-bg text-white text-left p-3 min-w-[140px] font-bold border-r border-b border-app-border/30 shadow-[4px_0_8px_rgba(0,0,0,0.3)]">
                  {t("project_detail.client_col")}
                  <div className="relative mt-2 flex items-center">
                    <Search size={12} className="absolute left-2 text-white/60" />
                    <input className="w-full pl-7 pr-7 py-1 !bg-white/10 !border-white/20 rounded-lg text-[10px] focus:outline-none !text-white" placeholder={t("client_info.search_ph")} value={search} onChange={e => setSearch(e.target.value)} />
                    {search && <button onClick={() => setSearch("")} className="absolute right-2 text-white/40 p-0.5"><X size={10} /></button>}
                  </div>
                </th>
                {prjDefs.map((d: InstDef, i: number) => (
                  <th key={`${d.id}-${i}`} className="sticky top-0 z-10 bg-app-nav-bg text-white p-3 min-w-[120px] font-bold border-r border-b border-app-border/30 text-center cursor-pointer select-none group relative" onMouseDown={() => setLongPressDefTimer(setTimeout(() => setEditDefModal(d), 600))} onMouseUp={() => { clearTimeout(longPressDefTimer); setLongPressDefTimer(null); }} onTouchStart={() => setLongPressDefTimer(setTimeout(() => setEditDefModal(d), 600))} onTouchEnd={() => { clearTimeout(longPressDefTimer); setLongPressDefTimer(null); }}>
                    <div className="text-[11px] mb-1 flex items-center justify-center gap-1">{d.title}</div>
                    <div className="text-[9px] text-white/70 font-medium">{BDT(d.targetAmount)}</div>
                    {d.dueDate && <div className="text-[8px] text-white/50 mt-0.5">{d.dueDate}</div>}
                  </th>
                ))}
                <th className="sticky top-0 z-10 bg-app-nav-bg text-white p-3 min-w-[100px] font-bold text-center border-r border-b border-app-border/30">{t("project_detail.total_col")}</th>
              </tr>
            </thead>
            <tbody>
              {prjClients.map((client: Client) => {
                const assignment = client.planAssignments?.find((pa) => pa.planId === activePlanId);
                const shareCount = assignment ? assignment.shareCount : (client.shareCount || 1);
                const rowTotal = prjDefs.reduce((s, d) => s + clientPaidForDef(client.id, d.id, payments), 0);
                const rowTarget = prjDefs.reduce((s, d) => s + shareCount * d.targetAmount, 0);
                return (
                  <tr key={client.id} className="group hover:bg-app-bg">
                    <td className="sticky left-0 z-20 bg-app-surface group-hover:bg-app-bg border-r border-b border-app-border p-3 shadow-[4px_0_8_rgba(0,0,0,0.03)]">
                      <div className="flex items-center gap-3">
                        <ClientAvatar client={client} size={32} />
                        <div>
                          <div className="text-xs font-bold text-app-text-primary">{client.name}</div>
                          <div className="text-[10px] text-app-text-secondary font-medium">{client.plot} {shareCount > 1 && <span className="text-blue-600 dark:text-blue-400">({shareCount} {t("client_info.shares")})</span>}</div>
                        </div>
                      </div>
                    </td>
                    {prjDefs.map((d: InstDef, i: number) => {
                      const cellTarget = d.targetAmount * shareCount;
                      const paid = clientPaidForDef(client.id, d.id, payments);
                      const pendingAmt = payments.filter((p: Payment) => p.clientId === client.id && p.instDefId === d.id && p.status === "pending").reduce((s, p) => s + p.amount, 0);
                      const st = cellStatus(paid, cellTarget);
                      const pct = Math.round((paid / cellTarget) * 100);
                      const m = STATUS[st];
                      return (
                        <td key={`${d.id}-${i}`} className="p-2 border-r border-b border-app-border text-center align-middle">
                          <button className={cn("w-full rounded-xl p-2 cursor-pointer transition-transform active:scale-95", m.bg)} onClick={() => setCellModal({ client, instDef: d })}>
                            <span className={cn("block text-xs font-black whitespace-nowrap", m.text)}>{paid > 0 ? BDTshort(paid) : "—"}</span>
                            <span className="block text-[9px] text-app-text-muted font-medium mt-0.5">{BDTshort(cellTarget)}</span>
                            {pendingAmt > 0 && <span className="block text-[9px] text-amber-600 dark:text-amber-400 font-bold mt-1 flex items-center justify-center gap-0.5"><Clock size={10} /> {BDTshort(pendingAmt)}</span>}
                            {paid > 0 && <div className="h-1 bg-white/50 rounded-full mt-1.5 overflow-hidden"><div className={cn("h-full rounded-full", m.bar)} style={{ width: `${pct}%` }} /></div>}
                          </button>
                        </td>
                      );
                    })}
                    <td className="p-3 text-center align-middle border-r border-b border-app-border">
                      <div className={cn("text-xs font-black", rowTotal >= rowTarget ? "text-emerald-600 dark:text-emerald-400" : rowTotal > 0 ? "text-amber-600 dark:text-amber-400" : "text-app-text-muted")}>{rowTotal > 0 ? BDTshort(rowTotal) : "—"}</div>
                      <div className="text-[10px] text-app-text-muted font-medium mt-0.5">{BDTshort(rowTarget)}</div>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-app-nav-bg text-white font-bold">
                <td className="sticky left-0 z-20 bg-app-nav-bg border-r border-white/10 p-3 text-white text-xs shadow-[2px_0_5px_rgba(0,0,0,0.2)]">{t("project_detail.total_col")}</td>
                {prjDefs.map((d: InstDef, i: number) => {
                  const ct = prjClients.reduce((s, c) => s + clientPaidForDef(c.id, d.id, payments), 0);
                  const cT = prjClients.reduce((s, c) => {
                    const assignment = c.planAssignments?.find(pa => pa.planId === activePlanId);
                    const sc = assignment ? (assignment.shareCount || 1) : (c.shareCount || 1);
                    return s + sc * d.targetAmount;
                  }, 0);
                  return (
                    <td key={`${d.id}-${i}`} className="p-3 border-r border-white/10 text-center align-middle">
                      <div className="text-xs font-black text-white">{BDTshort(ct)}</div>
                      <div className="text-[10px] text-white/70 font-medium mt-0.5">{cT > 0 ? Math.round((ct / cT) * 100) : 0}%</div>
                    </td>
                  );
                })}
                <td className="p-3 text-center align-middle"><div className="text-sm font-black text-emerald-400">{BDTshort(totalCollected)}</div></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {showAddPlan && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[500] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowAddPlan(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-app-surface-elevated rounded-3xl w-full max-w-sm p-8 shadow-2xl border border-app-border" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 bg-app-bg text-app-text-primary rounded-2xl flex items-center justify-center mb-6 mx-auto border border-app-border"><Table size={32} /></div>
              <h3 className="text-xl font-black text-app-text-primary mb-2 text-center">New Installment Plan</h3>
              <FG label="Plan Name"><input autoFocus className="w-full px-4 py-3.5 bg-app-bg border border-app-border rounded-2xl text-sm font-bold text-app-text-primary" placeholder="e.g. Revised Plan 2024" value={newPlanName} onChange={e => setNewPlanName(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newPlanName.trim()) { const newId = uid("PLN-"); actions.addPlan({ id: newId, projectId, name: newPlanName.trim() }); setActivePlanId(newId); setNewPlanName(""); setShowAddPlan(false); } }} /></FG>
              <div className="flex gap-3 mt-8">
                <button className="flex-1 bg-app-bg text-app-text-secondary font-bold py-3.5 rounded-2xl hover:bg-app-border border border-app-border" onClick={() => setShowAddPlan(false)}>Cancel</button>
                <button className="flex-1 bg-app-tab-active text-app-bg font-bold py-3.5 rounded-2xl disabled:opacity-50" disabled={!newPlanName.trim()} onClick={() => { if (newPlanName.trim()) { const newId = uid("PLN-"); actions.addPlan({ id: newId, projectId, name: newPlanName.trim() }); setActivePlanId(newId); setNewPlanName(""); setShowAddPlan(false); } }}>Create Plan</button>
              </div>
            </motion.div>
          </div>
        )}
        {editPlanModal && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[500] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setEditPlanModal(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-app-surface-elevated rounded-3xl w-full max-w-sm p-8 shadow-2xl border border-app-border" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-blue-500/20"><Edit2 size={32} /></div>
              <h3 className="text-xl font-black text-app-text-primary mb-2 text-center">Edit Plan Name</h3>
              <FG label="Plan Name"><input autoFocus className="w-full px-4 py-3.5 bg-app-bg border border-app-border rounded-2xl text-sm font-bold text-app-text-primary" value={editPlanName} onChange={e => setEditPlanName(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && editPlanName.trim()) { actions.updatePlan({ ...editPlanModal, name: editPlanName.trim() }); setEditPlanModal(null); } }} /></FG>
              <div className="flex gap-3 mt-8">
                <button className="flex-1 bg-app-bg text-app-text-secondary font-bold py-3.5 rounded-2xl hover:bg-app-border border border-app-border" onClick={() => setEditPlanModal(null)}>Cancel</button>
                <button className="flex-1 bg-app-tab-active text-app-bg font-bold py-3.5 rounded-2xl disabled:opacity-50" disabled={!editPlanName.trim()} onClick={() => { if (editPlanName.trim()) { actions.updatePlan({ ...editPlanModal, name: editPlanName.trim() }); setEditPlanModal(null); } }}>Save Changes</button>
              </div>
              {isSuperAdmin && <button className="w-full mt-6 text-rose-600 dark:text-rose-400 font-bold text-xs hover:underline flex items-center justify-center gap-1" onClick={() => setDeletePlanTarget(editPlanModal)}><Trash2 size={12} /> Delete Plan</button>}
            </motion.div>
          </div>
        )}
        {deletePlanTarget && <ConfirmDeletePlan plan={deletePlanTarget} amount={instDefs.filter((d: InstDef) => d.planId === deletePlanTarget.id).reduce((s: number, d: InstDef) => s + d.targetAmount, 0)} onConfirm={() => { actions.deletePlan(deletePlanTarget.id); setDeletePlanTarget(null); setEditPlanModal(null); }} onClose={() => setDeletePlanTarget(null)} />}
        {viewR && <ReceiptSheet payment={viewR.payment} instDef={viewR.instDef} client={viewR.client} project={project} isSuperAdmin={isSuperAdmin} onDelete={actions.deletePayment} onClose={() => setViewR(null)} />}
        {cellModal && <CellPaySheet client={cellModal.client} instDef={cellModal.instDef} payments={payments} project={project} isSuperAdmin={isSuperAdmin} onSave={(p: Payment) => { actions.addPayment(p); setCellModal(null); }} onDelete={(id: string) => actions.deletePayment(id)} onClose={() => setCellModal(null)} />}
        {addDefModal && <AddDefSheet projectId={projectId} planId={activePlanId} onSave={(d: InstDef) => { actions.addInstDef(d); setAddDefModal(false); }} onClose={() => setAddDefModal(false)} />}
        {editDefModal && <EditDefSheet def={editDefModal} onSave={(d: InstDef) => { actions.updateInstDef(d); setEditDefModal(null); }} onDelete={(id: string) => { actions.deleteInstDef(id, activePlanId!); setEditDefModal(null); }} onClose={() => setEditDefModal(null)} />}
      </AnimatePresence>
    </>
  );
}
