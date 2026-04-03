import React, { useState, useRef, useEffect, Component } from "react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "motion/react";
import { 
  INIT_ADMINS, SP, SC, SD, SPA, SE, INIT_LOGS, 
  STATUS, STATUS_LABEL, EXP_CATS, ACTION_META 
} from "./lib/data";
import { 
  BDT, BDTshort, dotJoin, uid, todayStr, tsNow, fmtTs, genClientId, 
  clientPaidForDef, cellStatus, ac, initials, cn 
} from "./lib/utils";
import { 
  Badge, PBar, FG, ClientAvatar, PassCell, ConfirmDelete, 
  Drawer, BottomBar, Login, ForceChangePw 
} from "./components/Shared";
import { AuditLogPage, LogRow } from "./components/Admin";
import { AdminProfile, AdminManagePage, AdminPaymentsPage } from "./components/AdminPages";
import { ProjectDetail } from "./components/ProjectDetail";
import { ClientInstallments, ClientReceipts, ClientExpenses, ClientProfile } from "./components/ClientPages";
import { Eye, EyeOff, ShieldPlus, KeyRound, Trash2, ShieldMinus, Building2, Wallet, ChevronRight, Clock, CheckCircle2, XCircle, MoreVertical, Edit2, AlertCircle } from "lucide-react";
import { CategoryIcon, CategoryColor } from "./components/Shared";
import { useLanguage } from "./lib/i18n";

// Firebase
import { 
  onSnapshot, collection, doc, setDoc, updateDoc, deleteDoc, 
  query, where, getDocs, writeBatch, orderBy, limit, getDoc 
} from "firebase/firestore";
import { 
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut 
} from "firebase/auth";
import { db, auth as fbAuth, handleFirestoreError, OperationType } from "./firebase";

// --- Components that were in App.tsx ---

function PendingApprovals({ payments, clients, instDefs, projects, onApprove, onReject }: any) {
  const { t } = useLanguage();
  const pending = payments.filter((p: any) => p.status === "pending");
  if (pending.length === 0) return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
      <CheckCircle2 size={24} className="text-emerald-600" />
      <span className="text-sm font-bold text-emerald-700">{t("dashboard.no_pending")}</span>
    </div>
  );
  return (
    <div className="mb-6">
      <div className="text-sm font-extrabold text-rose-600 mb-3 flex items-center gap-2">
        <span className="bg-rose-100 text-rose-600 rounded-full px-2.5 py-0.5 text-xs">{pending.length}</span>
        {t("dashboard.pending_approval")}
      </div>
      {pending.map((p: any) => {
        const client = clients.find((c: any) => c.id === p.clientId);
        const def = instDefs.find((d: any) => d.id === p.instDefId);
        const prj = projects.find((pr: any) => pr.id === client?.projectId);
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            key={p.id} 
            className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-3"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-sm font-extrabold text-slate-900">{client?.name || p.clientId}</div>
                <div className="text-xs text-slate-500 mt-0.5">{dotJoin(prj?.name, def?.title)}</div>
                <div className="text-xs text-slate-500 mt-0.5">{dotJoin(p.date, p.note)}</div>
              </div>
              <div className="text-xl font-black text-amber-700">{BDT(p.amount)}</div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 bg-emerald-100 text-emerald-700 font-bold py-2.5 rounded-xl hover:bg-emerald-200 transition-colors text-sm flex items-center justify-center gap-2" onClick={() => onApprove(p.id)}><CheckCircle2 size={16} /> {t("dashboard.approve")}</button>
              <button className="flex-1 bg-rose-100 text-rose-700 font-bold py-2.5 rounded-xl hover:bg-rose-200 transition-colors text-sm flex items-center justify-center gap-2" onClick={() => onReject(p.id)}><XCircle size={16} /> {t("dashboard.reject")}</button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function FinancialSummary({ projects, clients, instDefs, payments, expenses, plans }: any) {
  const { t } = useLanguage();
  const approvedPays = payments.filter((p: any) => p.status === "approved");
  const pendingPays = payments.filter((p: any) => p.status === "pending");
  const totalExpected = clients.reduce((s: number, c: any) => {
    const prjPlans = plans.filter((p: any) => p.projectId === c.projectId);
    // If client has assignments, use them. Otherwise use the first plan found for the project.
    const assignments = c.planAssignments || [];
    if (assignments.length > 0) {
      return s + assignments.reduce((as: number, pa: any) => {
        const pDefs = instDefs.filter((d: any) => d.planId === pa.planId);
        return as + (pDefs.reduce((ds: number, d: any) => ds + d.targetAmount, 0) * pa.shareCount);
      }, 0);
    } else {
      // Fallback to first plan if no assignment
      const firstPlan = prjPlans[0];
      if (!firstPlan) return s;
      const pDefs = instDefs.filter((d: any) => d.planId === firstPlan.id);
      return s + (pDefs.reduce((ds: number, d: any) => ds + d.targetAmount, 0) * (c.shareCount || 1));
    }
  }, 0);
  const totalCollected = approvedPays.reduce((s: number, p: any) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s: number, e: any) => s + e.amount, 0);
  const totalPending = pendingPays.reduce((s: number, p: any) => s + p.amount, 0);
  const totalDue = Math.max(0, totalExpected - totalCollected);
  const netProfit = totalCollected - totalExpenses;
  const collectPct = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
            <Wallet size={18} />
          </div>
          <h1 className="text-xl font-black text-slate-900">{t("dashboard.financial_summary")}</h1>
        </div>
        <p className="text-xs font-medium text-slate-500">{t("dashboard.overall_analysis")}</p>
      </div>
      
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 mb-4 text-white shadow-xl">
        <div className="text-xs text-slate-400 font-bold mb-1 tracking-wider">{t("dashboard.net_profit_loss")}</div>
        <div className={cn("text-4xl font-black tracking-tighter", netProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
          {netProfit >= 0 ? "+" : ""}{BDT(netProfit)}
        </div>
        <div className="text-xs text-slate-400 mt-2 font-medium">{t("dashboard.collection_minus_expense")}</div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t("dashboard.total_expected")}</div>
          <div className="text-lg font-black text-slate-900 mt-1">{BDTshort(totalExpected)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t("dashboard.total_collected")}</div>
          <div className="text-lg font-black text-emerald-600 mt-1">{BDTshort(totalCollected)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t("dashboard.total_due")}</div>
          <div className="text-lg font-black text-rose-600 mt-1">{BDTshort(totalDue)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t("dashboard.total_expenses")}</div>
          <div className="text-lg font-black text-violet-600 mt-1">{BDTshort(totalExpenses)}</div>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-bold text-slate-900">{t("dashboard.collection_progress")}</span>
          <span className="text-lg font-black text-blue-600">{collectPct}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
          <motion.div 
            initial={{ width: 0 }} animate={{ width: `${collectPct}%` }} 
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full" 
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 font-medium">
          <span>{t("dashboard.collected_label")} {BDT(totalCollected)}</span>
          <span>{t("dashboard.due_label")} {BDT(totalDue)}</span>
        </div>
        {totalPending > 0 && (
          <div className="mt-4 text-xs text-amber-700 font-bold bg-amber-50 rounded-xl p-3 border border-amber-100 flex items-center gap-2">
            <Clock size={14} /> {t("dashboard.pending_approval_label")} {BDT(totalPending)}
          </div>
        )}
      </div>
      
      <div className="text-lg font-black text-slate-900 mb-4">{t("dashboard.project_analysis")}</div>
      
      {projects.map((prj: any, idx: number) => {
        const prjClients = clients.filter((c: any) => c.projectId === prj.id);
        const prjDefs = instDefs.filter((d: any) => d.projectId === prj.id);
        const prjExpenses = expenses.filter((e: any) => e.projectId === prj.id);
        const prjPays = approvedPays.filter((p: any) => prjClients.find((c: any) => c.id === p.clientId));
        
        const expected = prjClients.reduce((s: number, c: any) => {
          const assignments = c.planAssignments || [];
          if (assignments.length > 0) {
            return s + assignments.reduce((as: number, pa: any) => {
              const pDefs = instDefs.filter((d: any) => d.planId === pa.planId);
              return as + (pDefs.reduce((ds: number, d: any) => ds + d.targetAmount, 0) * pa.shareCount);
            }, 0);
          } else {
            const prjPlans = plans.filter((p: any) => p.projectId === prj.id);
            const firstPlan = prjPlans[0];
            if (!firstPlan) return s;
            const pDefs = instDefs.filter((d: any) => d.planId === firstPlan.id);
            return s + (pDefs.reduce((ds: number, d: any) => ds + d.targetAmount, 0) * (c.shareCount || 1));
          }
        }, 0);
        const collected = prjPays.reduce((s: number, p: any) => s + p.amount, 0);
        const spent = prjExpenses.reduce((s: number, e: any) => s + e.amount, 0);
        const due = Math.max(0, expected - collected);
        const net = collected - spent;
        const pct = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0;
        
        const color = ac(prj.id);
        const catMap: Record<string, number> = {};
        prjExpenses.forEach((e: any) => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
        const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
        
        return (
          <div key={prj.id} className="bg-white rounded-2xl border border-slate-200 p-5 mb-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: color }} />
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-base font-black text-slate-900">{prj.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{t("dashboard.stats", { clients: prjClients.length, insts: prjDefs.length })}</div>
              </div>
              <span className={cn("text-sm font-black", net >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {net >= 0 ? "+" : ""}{BDTshort(net)}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-emerald-50 rounded-xl p-2.5">
                <div className="text-[9px] text-slate-500 font-bold uppercase">{t("dashboard.collected_short")}</div>
                <div className="text-sm font-black text-emerald-700 mt-0.5">{BDTshort(collected)}</div>
              </div>
              <div className="bg-rose-50 rounded-xl p-2.5">
                <div className="text-[9px] text-slate-500 font-bold uppercase">{t("dashboard.due_short")}</div>
                <div className="text-sm font-black text-rose-700 mt-0.5">{BDTshort(due)}</div>
              </div>
              <div className="bg-violet-50 rounded-xl p-2.5">
                <div className="text-[9px] text-slate-500 font-bold uppercase">{t("dashboard.expense_short")}</div>
                <div className="text-sm font-black text-violet-700 mt-0.5">{BDTshort(spent)}</div>
              </div>
            </div>
            
            <div className="flex justify-between items-end mb-1.5">
              <span className="text-xs text-slate-500 font-medium">{t("dashboard.collection_progress")}</span>
              <span className="text-xs font-black" style={{ color }}>{pct}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full rounded-full" style={{ backgroundColor: color }} />
            </div>
            
            {topCats.length > 0 && (
              <div>
                <div className="text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-wider">{t("dashboard.top_expenses")}</div>
                {topCats.map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between items-center text-xs mb-1.5 text-slate-600">
                    <span className="font-medium flex items-center gap-1.5">
                      <div className={cn("w-5 h-5 rounded-md flex items-center justify-center", CategoryColor(cat))}>
                        <CategoryIcon category={cat} size={12} />
                      </div>
                      {cat}
                    </span>
                    <span className="font-bold text-slate-900">{BDT(amt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </motion.div>
  );
}

function AdminHome({ projects, clients, payments, instDefs, expenses, plans, onSelect, onAddProject, onUpdateProject, onDeleteProject, isSuperAdmin, onApprovePayment, onRejectPayment }: any) {
  const { t } = useLanguage();
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState<any>(null);
  const [delProject, setDelProject] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [view, setView] = useState("projects");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  
  const allCollected = payments.filter((p: any) => p.status === "approved").reduce((s: number, p: any) => s + p.amount, 0);
  const pendingCount = payments.filter((p: any) => p.status === "pending").length;
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">MARQ Builders</h1>
          <p className="text-sm font-medium text-slate-500">{t("admin_home.projects_count", { count: projects.length })}</p>
        </div>
        <button 
          className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm" 
          onClick={() => setAddModal(true)}
        >
          {t("admin_home.add_project")}
        </button>
      </div>
      
      <div className="flex bg-slate-200/50 p-1 rounded-xl mb-6">
        <button 
          className={cn("flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2", view === "projects" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")} 
          onClick={() => setView("projects")}
        >
          <Building2 size={16} /> {t("admin_home.projects_tab")}
        </button>
        <button 
          className={cn("flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2", view === "financial" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")} 
          onClick={() => setView("financial")}
        >
          <Wallet size={16} /> {t("admin_home.financial_tab")}
        </button>
      </div>
      
      {view === "financial" && <FinancialSummary projects={projects} clients={clients} instDefs={instDefs} payments={payments} expenses={expenses} plans={plans} />}
      
      {view === "projects" && (
        <>
          {isSuperAdmin && <PendingApprovals payments={payments} clients={clients} instDefs={instDefs} projects={projects} onApprove={onApprovePayment} onReject={onRejectPayment} />}
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-center">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-3">
                <Building2 size={20} />
              </div>
              <div className="text-xs text-slate-500 font-bold mb-1">{t("admin_home.total_projects")}</div>
              <div className="text-xl font-black text-slate-900">{projects.length}</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-center">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
                <Wallet size={20} />
              </div>
              <div className="text-xs text-slate-500 font-bold mb-1">{t("admin_home.total_collected")}</div>
              <div className="text-xl font-black text-slate-900">{BDTshort(allCollected)}</div>
            </div>
          </div>
          
          {pendingCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex justify-between items-center">
              <span className="text-sm font-bold text-amber-700 flex items-center gap-2"><Clock size={16} /> {pendingCount}{t("admin_home.pending_payments")}</span>
              {!isSuperAdmin && <span className="text-xs font-medium text-amber-600">{t("admin_home.super_admin_approve")}</span>}
            </div>
          )}
          
          <div className="space-y-3">
            {projects.map((prj: any) => {
              const prjClients = clients.filter((c: any) => c.projectId === prj.id);
              const prjPaid = payments.filter((p: any) => p.status === "approved" && prjClients.find((c: any) => c.id === p.clientId)).reduce((s: number, p: any) => s + p.amount, 0);
              const color = ac(prj.id);
              
              return (
                <motion.div 
                  whileHover={{ scale: 0.98 }} whileTap={{ scale: 0.95 }}
                  key={prj.id} 
                  className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer shadow-sm hover:shadow-md transition-all" 
                  onClick={() => onSelect(prj.id)}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + "20", color }}>
                      <Building2 size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-black text-slate-900 truncate">{prj.name}</div>
                      <div className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">{prj.description}</div>
                    </div>
                    <div className="text-slate-300 flex items-center justify-center w-6 h-6">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: color + "15", color }}>{prjClients.length} জন</span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700">{BDTshort(prjPaid)}</span>
                    </div>
                    
                    <div className="relative">
                      <button 
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                        onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === prj.id ? null : prj.id); }}
                      >
                        <MoreVertical size={20} />
                      </button>
                      
                      <AnimatePresence>
                        {menuOpen === prj.id && (
                          <>
                            <div className="fixed inset-0 z-[100]" onClick={e => { e.stopPropagation(); setMenuOpen(null); }} />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 bottom-full mb-2 w-36 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-[110] overflow-hidden"
                              onClick={e => e.stopPropagation()}
                            >
                              <button 
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                onClick={() => {
                                  setEditModal(prj);
                                  setEditName(prj.name);
                                  setEditDesc(prj.description || "");
                                  setMenuOpen(null);
                                }}
                              >
                                <Edit2 size={16} className="text-blue-500" /> {t("common.edit")}
                              </button>
                              <button 
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                                onClick={() => {
                                  setDelProject(prj);
                                  setMenuOpen(null);
                                }}
                              >
                                <Trash2 size={16} /> {t("project_detail.delete")}
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
        </>
      )}
      
      <AnimatePresence>
        {addModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-[300] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={() => setAddModal(false)}>
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 pb-safe" 
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
              <div className="text-xl font-black text-slate-900 mb-6">{t("admin_home.new_project")}</div>
              <FG label={t("admin_home.project_name")}>
                <input 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" 
                  placeholder={t("admin_home.project_name_ph")} 
                  value={newName} onChange={e => setNewName(e.target.value)} 
                />
              </FG>
              <FG label={t("admin_home.project_desc")}>
                <input 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" 
                  value={newDesc} onChange={e => setNewDesc(e.target.value)} 
                />
              </FG>
              <button 
                className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors mt-2" 
                onClick={() => {
                  if (newName.trim()) {
                    onAddProject({ id: uid("PRJ-"), name: newName.trim(), description: newDesc.trim() });
                    setAddModal(false); setNewName(""); setNewDesc("");
                  }
                }}
              >
                {t("admin_home.add_btn")}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-[300] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={() => setEditModal(null)}>
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 pb-safe" 
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
              <div className="text-xl font-black text-slate-900 mb-6">{t("common.edit")} {t("admin_home.projects_tab")}</div>
              <FG label={t("admin_home.project_name")}>
                <input 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" 
                  value={editName} onChange={e => setEditName(e.target.value)} 
                />
              </FG>
              <FG label={t("admin_home.project_desc")}>
                <input 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" 
                  value={editDesc} onChange={e => setEditDesc(e.target.value)} 
                />
              </FG>
              <button 
                className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors mt-2" 
                onClick={() => {
                  if (editName.trim()) {
                    onUpdateProject({ ...editModal, name: editName.trim(), description: editDesc.trim() });
                    setEditModal(null);
                  }
                }}
              >
                {t("common.save")}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {delProject && (
          <ConfirmDelete 
            message={<><b>{delProject.name}</b> {t("admin_home.delete_warning")}</>} 
            onConfirm={() => { onDeleteProject(delProject.id); setDelProject(null); }} 
            onClose={() => setDelProject(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Error Boundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}
class ErrorBoundary extends (Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorInfo = { error: String(this.state.error) };
      try {
        if (this.state.error && typeof this.state.error === 'object' && 'message' in this.state.error) {
          errorInfo = JSON.parse(this.state.error.message);
        }
      } catch (e) {}
      
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full shadow-xl">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
              <AlertCircle size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-slate-500 font-medium mb-6">The application encountered an unexpected error. Please try refreshing the page.</p>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6 overflow-auto max-h-40">
              <pre className="text-[10px] font-mono text-rose-600 whitespace-pre-wrap">
                {JSON.stringify(errorInfo, null, 2)}
              </pre>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ROOT APP COMPONENT
export default function App() {
  const { t } = useLanguage();
  const [auth, setAuth] = useState<any>(() => {
    const saved = localStorage.getItem("marq_auth");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (auth) localStorage.setItem("marq_auth", JSON.stringify(auth));
    else localStorage.removeItem("marq_auth");
  }, [auth]);
  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem("marq_auth");
    if (saved) {
      const authData = JSON.parse(saved);
      return authData.role === "client" ? "installments" : "home";
    }
    return "home";
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [instDefs, setInstDefs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [drawer, setDrawer] = useState(false);
  const [selProject, setSelProject] = useState<string | null>(null);
  const [forceChangePw, setForceChangePw] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState({
    projects: false,
    plans: false,
    clients: false,
    instDefs: false,
    payments: false,
    expenses: false,
    admins: false,
    logs: false
  });

  const [toast, setToast] = useState<{ m: string, t: 's' | 'e' } | null>(null);

  const showToast = (m: string, t: 's' | 'e' = 's') => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 3000);
  };

  // Helper to sanitize data before Firestore
  const sanitize = (data: any, allowedFields: string[]) => {
    const clean: any = {};
    allowedFields.forEach(f => {
      if (data[f] !== undefined) clean[f] = data[f];
    });
    return clean;
  };

  const CLIENT_FIELDS = ['id', 'projectId', 'name', 'fatherHusband', 'birthDate', 'phone', 'email', 'nid', 'plot', 'totalAmount', 'shareCount', 'password', 'photo', 'remarks', 'planAssignments', '_row'];
  const PROJECT_FIELDS = ['id', 'name', 'description'];
  const PLAN_FIELDS = ['id', 'projectId', 'name'];
  const INST_DEF_FIELDS = ['id', 'projectId', 'planId', 'title', 'dueDate', 'targetAmount'];
  const PAYMENT_FIELDS = ['id', 'clientId', 'instDefId', 'amount', 'date', 'status', 'note', 'method', 'trxId', 'approvedBy'];
  const EXPENSE_FIELDS = ['id', 'projectId', 'category', 'amount', 'date', 'description'];
  const ADMIN_FIELDS = ['id', 'name', 'username', 'password', 'role', 'isTemp'];

  // Firestore Real-time Listeners
  useEffect(() => {
    // Initial data load and superadmin bootstrap
    const init = async () => {
      try {
        // Always ensure superadmin exists
        const superAdmin = { id: "superadmin", name: "Super Admin", username: "superadmin", password: "1234", role: "superadmin", isTemp: false };
        await setDoc(doc(db, "admins", "superadmin"), superAdmin);
      } catch (e) {
        console.error("Init error:", e);
      }
    };
    init();

    const unsubProjects = onSnapshot(collection(db, "projects"), (s) => {
      setProjects(s.docs.map(d => ({ ...d.data(), id: d.id })));
      setDataLoaded(prev => ({ ...prev, projects: true }));
    }, (e) => handleFirestoreError(e, OperationType.LIST, "projects"));

    const unsubPlans = onSnapshot(collection(db, "plans"), (s) => {
      setPlans(s.docs.map(d => ({ ...d.data(), id: d.id })));
      setDataLoaded(prev => ({ ...prev, plans: true }));
    }, (e) => handleFirestoreError(e, OperationType.LIST, "plans"));

    const unsubClients = onSnapshot(collection(db, "clients"), (s) => {
      setClients(s.docs.map(d => ({ ...d.data(), id: d.id })));
      setDataLoaded(prev => ({ ...prev, clients: true }));
    }, (e) => handleFirestoreError(e, OperationType.LIST, "clients"));

    const unsubInstDefs = onSnapshot(collection(db, "instDefs"), (s) => {
      setInstDefs(s.docs.map(d => ({ ...d.data(), id: d.id })));
      setDataLoaded(prev => ({ ...prev, instDefs: true }));
    }, (e) => handleFirestoreError(e, OperationType.LIST, "instDefs"));

    const unsubPayments = onSnapshot(collection(db, "payments"), (s) => {
      setPayments(s.docs.map(d => ({ ...d.data(), id: d.id })));
      setDataLoaded(prev => ({ ...prev, payments: true }));
    }, (e) => handleFirestoreError(e, OperationType.LIST, "payments"));

    const unsubExpenses = onSnapshot(collection(db, "expenses"), (s) => {
      setExpenses(s.docs.map(d => ({ ...d.data(), id: d.id })));
      setDataLoaded(prev => ({ ...prev, expenses: true }));
    }, (e) => handleFirestoreError(e, OperationType.LIST, "expenses"));

    const unsubAdmins = onSnapshot(collection(db, "admins"), (s) => {
      setAdmins(s.docs.map(d => ({ ...d.data(), id: d.id })));
      setDataLoaded(prev => ({ ...prev, admins: true }));
    }, (e) => handleFirestoreError(e, OperationType.LIST, "admins"));

    const unsubLogs = onSnapshot(query(collection(db, "logs"), orderBy("ts", "desc"), limit(100)), (s) => {
      setLogs(s.docs.map(d => ({ ...d.data(), id: d.id })));
      setDataLoaded(prev => ({ ...prev, logs: true }));
    }, (e) => handleFirestoreError(e, OperationType.LIST, "logs"));

    return () => {
      unsubProjects(); unsubPlans(); unsubClients(); unsubInstDefs(); unsubPayments(); unsubExpenses(); unsubAdmins(); unsubLogs();
    };
  }, []);

  // Set loading to false only when essential data is loaded
  useEffect(() => {
    if (dataLoaded.projects && dataLoaded.plans && dataLoaded.clients && dataLoaded.instDefs && dataLoaded.payments) {
      setLoading(false);
    }
  }, [dataLoaded]);

  // Keep client auth user in sync with clients collection
  useEffect(() => {
    if (auth?.role === "client" && auth?.user?.id && clients.length > 0) {
      const updatedUser = clients.find(c => c.id === auth.user.id);
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(auth.user)) {
        setAuth({ ...auth, user: updatedUser });
      }
    }
  }, [clients, auth]);

  // Migration: Assign instDefs to a default plan if planId is missing
  useEffect(() => {
    if (dataLoaded.plans && dataLoaded.instDefs) {
      instDefs.forEach(async (d: any) => {
        if (!d.planId && d.projectId) {
          let plan = plans.find(p => p.projectId === d.projectId && p.name === "Default Plan");
          if (!plan) {
            plan = { id: uid("PLN-"), projectId: d.projectId, name: "Default Plan" };
            await setDoc(doc(db, "plans", plan.id), plan);
          }
          await updateDoc(doc(db, "instDefs", d.id), { planId: plan.id });
        }
      });
    }
  }, [dataLoaded, plans, instDefs]);

  const addLog = async (adminUser: any, action: string, target: any, detail: any, projectId: string | null = null) => {
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

  const login = async (role: string, id: string, pass: string) => {
    setLoading(true);
    try {
      // Hardcoded bypass for superadmin
      if (role === "admin" && id === "superadmin" && pass === "1234") {
        const superAdmin = { id: "superadmin", name: "Super Admin", username: "superadmin", password: "1234", role: "superadmin", isTemp: false };
        setAuth({ role: "superadmin", user: superAdmin });
        setPage("home");
        setLoading(false);
        return;
      }

      const collectionName = role === "admin" ? "admins" : "clients";
      
      if (role === "admin") {
        const q = query(collection(db, collectionName), where("username", "==", id));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          setLoading(false);
          return { error: "অ্যাকাউন্টটি খুঁজে পাওয়া যায়নি" };
        }
        const userData = snap.docs[0].data();
        if (userData.password !== pass) {
          setLoading(false);
          return { error: "পাসওয়ার্ড ভুল" };
        }
        const userRole = userData.role === "superadmin" ? "superadmin" : role;
        setAuth({ role: userRole, user: userData });
        if (role === "admin" && userData.isTemp) setForceChangePw(true);
        setPage(userRole === "admin" || userRole === "superadmin" ? "home" : "installments");
      } else {
        // Client login
        const docRef = doc(db, collectionName, id);
        const snap = await getDoc(docRef);
        
        if (!snap.exists()) {
          setLoading(false);
          return { error: "অ্যাকাউন্টটি খুঁজে পাওয়া যায়নি" };
        }
        const userData = snap.data();
        if (userData.password !== pass) {
          setLoading(false);
          return { error: "পাসওয়ার্ড ভুল" };
        }
        setAuth({ role: "client", user: userData });
        setPage("installments");
      }
    } catch (e) {
      console.error("Login error:", e);
      return { error: "লগইন করতে সমস্যা হয়েছে" };
    } finally {
      setLoading(false);
    }
  };
  
  const logout = () => { 
    setAuth(null); setPage("home"); setSelProject(null); setForceChangePw(false); 
  };

  const isSuperAdmin = auth?.user?.role === "superadmin";
  const adminUser = (auth?.role === "admin" || auth?.role === "superadmin") ? auth.user : null;

  // Client CRUD
  const updateClient = async (c: any, oldId: string) => {
    try {
      const clean = sanitize(c, CLIENT_FIELDS);
      await setDoc(doc(db, "clients", clean.id), clean);
      if (oldId && oldId !== clean.id) {
        // Migrate payments
        const batch = writeBatch(db);
        const clientPayments = payments.filter(p => p.clientId === oldId);
        clientPayments.forEach(p => {
          batch.update(doc(db, "payments", p.id), { clientId: clean.id });
        });
        await batch.commit();
        await deleteDoc(doc(db, "clients", oldId));
        addLog(adminUser, "client_id_change", `${oldId} → ${clean.id}`, `${clean.name} এর ID পরিবর্তন`, clean.projectId);
      } else {
        addLog(adminUser, "client_edit", `${clean.id} - ${clean.name}`, "তথ্য আপডেট", clean.projectId);
      }
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `clients/${c.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };
  
  const addClient = async (c: any) => {
    if (clients.find(cl => cl.id === c.id)) { alert("এই ID আছে"); return; }
    try {
      const clean = sanitize(c, CLIENT_FIELDS);
      await setDoc(doc(db, "clients", clean.id), clean);
      addLog(adminUser, "client_add", `${clean.id} - ${clean.name}`, "নতুন ক্লাইন্ট", clean.projectId);
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `clients/${c.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };
  
  const deleteClient = async (id: string) => {
    const c = clients.find(cl => cl.id === id);
    try {
      await deleteDoc(doc(db, "clients", id));
      if (c) addLog(adminUser, "client_delete", `${c.id} - ${c.name}`, "মুছে ফেলা হয়েছে", c.projectId);
      showToast(t("common.success_deleted"));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `clients/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };
  
  const addBulkClients = async (bulk: any[]) => {
    const batch = writeBatch(db);
    bulk.forEach(c => {
      const { __new, ...data } = c;
      batch.set(doc(db, "clients", data.id), data);
    });
    try {
      await batch.commit();
      addLog(adminUser, "client_add", `${bulk.length} জন ক্লাইন্ট`, "Bulk import");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "clients (bulk)");
    }
  };

  // Project CRUD
  const addProject = async (p: any) => { 
    try {
      const clean = sanitize(p, PROJECT_FIELDS);
      await setDoc(doc(db, "projects", clean.id), clean);
      const defaultPlan = { id: uid("PLN-"), projectId: clean.id, name: "Default Plan" };
      await setDoc(doc(db, "plans", defaultPlan.id), defaultPlan);
      addLog(adminUser, "project_add", clean.name, "নতুন প্রজেক্ট ও ডিফল্ট প্ল্যান"); 
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `projects/${p.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };
  const updateProject = async (p: any) => {
    try {
      const clean = sanitize(p, PROJECT_FIELDS);
      await updateDoc(doc(db, "projects", clean.id), clean);
      addLog(adminUser, "project_edit", clean.name, "প্রজেক্ট তথ্য আপডেট");
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `projects/${p.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };
  const deleteProject = async (id: string) => {
    const prj = projects.find(p => p.id === id);
    const prjClients = clients.filter(c => c.projectId === id);
    const prjClientIds = prjClients.map(c => c.id);
    const prjPlans = plans.filter(pl => pl.projectId === id);
    const prjPlanIds = prjPlans.map(pl => pl.id);
    const prjInstDefs = instDefs.filter(d => prjPlanIds.includes(d.planId));
    const prjExpenses = expenses.filter(e => e.projectId === id);
    const prjPayments = payments.filter(p => prjClientIds.includes(p.clientId));

    const docsToDelete = [
      doc(db, "projects", id),
      ...prjClients.map(c => doc(db, "clients", c.id)),
      ...prjPlans.map(pl => doc(db, "plans", pl.id)),
      ...prjInstDefs.map(d => doc(db, "instDefs", d.id)),
      ...prjExpenses.map(e => doc(db, "expenses", e.id)),
      ...prjPayments.map(p => doc(db, "payments", p.id))
    ];

    try {
      for (let i = 0; i < docsToDelete.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docsToDelete.slice(i, i + 500);
        chunk.forEach(d => batch.delete(d));
        await batch.commit();
      }
      if (prj) addLog(adminUser, "project_delete", prj.name, "মুছে ফেলা হয়েছে");
      showToast(t("common.success_deleted"));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `projects/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const addPlan = async (p: any) => {
    try {
      const clean = sanitize(p, PLAN_FIELDS);
      await setDoc(doc(db, "plans", clean.id), clean);
      addLog(adminUser, "plan_add", clean.name, "নতুন প্ল্যান", clean.projectId);
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `plans/${p.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const updatePlan = async (p: any) => {
    try {
      const clean = sanitize(p, PLAN_FIELDS);
      await updateDoc(doc(db, "plans", clean.id), clean);
      addLog(adminUser, "plan_edit", clean.name, "প্ল্যান আপডেট", clean.projectId);
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `plans/${p.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const deletePlan = async (id: string) => {
    const p = plans.find(x => x.id === id);
    const defsToDelete = instDefs.filter((d: any) => d.planId === id);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "plans", id));
      defsToDelete.forEach((d: any) => batch.delete(doc(db, "instDefs", d.id)));
      await batch.commit();
      if (p) addLog(adminUser, "plan_delete", p.name, "প্ল্যান মুছে ফেলা হয়েছে", p.projectId);
      showToast(t("common.success_deleted"));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `plans/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  // InstDef CRUD
  const addInstDef = async (d: any) => {
    try {
      const clean = sanitize(d, INST_DEF_FIELDS);
      await setDoc(doc(db, "instDefs", clean.id), clean);
      const plan = plans.find(pl => pl.id === clean.planId);
      const prj = projects.find(p => p.id === plan?.projectId);
      addLog(adminUser, "instdef_add", clean.title, dotJoin(prj?.name, plan?.name, `৳${clean.targetAmount}`), prj?.id || null);
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `instDefs/${d.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };
  const updateInstDef = async (d: any) => {
    try {
      const clean = sanitize(d, INST_DEF_FIELDS);
      await updateDoc(doc(db, "instDefs", clean.id), clean);
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `instDefs/${d.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };
  const deleteInstDef = async (id: string, planId: string) => {
    const d = instDefs.find(x => x.id === id);
    try {
      await deleteDoc(doc(db, "instDefs", id));
      const plan = plans.find(pl => pl.id === planId);
      if (d) addLog(adminUser, "instdef_delete", d.title, "কিস্তি কলাম মুছে ফেলা হয়েছে", plan?.projectId || null);
      showToast(t("common.success_deleted"));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `instDefs/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  // Payment CRUD
  const addPayment = async (p: any) => {
    try {
      const clean = sanitize(p, PAYMENT_FIELDS);
      await setDoc(doc(db, "payments", clean.id), clean);
      const c = clients.find(cl => cl.id === clean.clientId);
      const d = instDefs.find(di => di.id === clean.instDefId);
      const action = clean.status === "approved" ? "payment_add" : "payment_pending";
      addLog(adminUser, action, `${c?.id} - ${c?.name}`, `${BDT(clean.amount)} — ${d?.title}${clean.status === "pending" ? " (pending)" : ""}`, c?.projectId);
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `payments/${p.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };
  const updatePayment = async (p: any) => {
    try {
      const clean = sanitize(p, PAYMENT_FIELDS);
      await updateDoc(doc(db, "payments", clean.id), clean);
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `payments/${p.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };
  const deletePayment = async (id: string) => {
    const p = payments.find(x => x.id === id);
    try {
      await deleteDoc(doc(db, "payments", id));
      if (p) {
        const c = clients.find(cl => cl.id === p.clientId);
        const d = instDefs.find(di => di.id === p.instDefId);
        addLog(adminUser, "payment_delete", `${c?.name || p.clientId}`, `${BDT(p.amount)} — ${d?.title}`, c?.projectId);
      }
      showToast(t("common.success_deleted"));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `payments/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };
  const approvePayment = async (id: string) => {
    try {
      await updateDoc(doc(db, "payments", id), { status: "approved", approvedBy: adminUser.id });
      const p = payments.find(x => x.id === id);
      if (p) {
        const c = clients.find(cl => cl.id === p.clientId);
        const d = instDefs.find(di => di.id === p.instDefId);
        addLog(adminUser, "payment_approved", `${c?.id} - ${c?.name}`, `${BDT(p.amount)} — ${d?.title}`, c?.projectId);
      }
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `payments/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };
  const rejectPayment = async (id: string) => {
    try {
      await updateDoc(doc(db, "payments", id), { status: "rejected" });
      const p = payments.find(x => x.id === id);
      if (p) {
        const c = clients.find(cl => cl.id === p.clientId);
        const d = instDefs.find(di => di.id === p.instDefId);
        addLog(adminUser, "payment_rejected", `${c?.id} - ${c?.name}`, `${BDT(p.amount)} — ${d?.title}`, c?.projectId);
      }
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `payments/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  // Expense CRUD
  const addExpense = async (e: any) => {
    try {
      const clean = sanitize(e, EXPENSE_FIELDS);
      await setDoc(doc(db, "expenses", clean.id), clean);
      addLog(adminUser, "expense_add", clean.category, `${BDT(clean.amount)} — ${clean.description}`, clean.projectId);
      showToast(t("common.success_saved"));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `expenses/${e.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };
  const updateExpense = async (e: any) => {
    try {
      const clean = sanitize(e, EXPENSE_FIELDS);
      await updateDoc(doc(db, "expenses", clean.id), clean);
      addLog(adminUser, "expense_edit", clean.category, `${BDT(clean.amount)} — ${clean.description}`, clean.projectId);
      showToast(t("common.success_saved"));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `expenses/${e.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };
  const deleteExpense = async (id: string) => {
    const e = expenses.find(x => x.id === id);
    try {
      await deleteDoc(doc(db, "expenses", id));
      if (e) addLog(adminUser, "expense_delete", e.category, `${BDT(e.amount)} — ${e.description}`, e.projectId);
      showToast(t("common.success_deleted"));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  // Admin CRUD
  const addAdmin = async (a: any) => {
    try {
      const clean = sanitize(a, ADMIN_FIELDS);
      await setDoc(doc(db, "admins", clean.id), clean);
      addLog(adminUser, "admin_add", clean.name, clean.role);
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `admins/${a.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };
  const updateAdmin = async (a: any) => {
    try {
      const clean = sanitize(a, ADMIN_FIELDS);
      await updateDoc(doc(db, "admins", clean.id), clean);
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `admins/${a.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };
  const removeAdmin = async (id: string) => {
    const a = admins.find(x => x.id === id);
    try {
      await deleteDoc(doc(db, "admins", id));
      if (a) addLog(adminUser, "admin_remove", a.name, a.role);
      showToast(t("common.success_deleted"));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `admins/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };
  const resetAdminPw = async (id: string, newPw: string) => {
    try {
      await updateDoc(doc(db, "admins", id), { password: newPw, isTemp: true });
      const a = admins.find(x => x.id === id);
      if (a) addLog(adminUser, "admin_reset_pw", a.name, "Temporary password সেট");
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `admins/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const clearLogs = async () => {
    if (!isSuperAdmin) return;
    try {
      const snap = await getDocs(collection(db, "logs"));
      const docs = snap.docs;
      
      // Firestore writeBatch has a limit of 500 operations.
      // We process in chunks of 500.
      for (let i = 0; i < docs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 500);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      
      addLog(adminUser, "admin_clear_logs", "All Logs", "Logs cleared by Super Admin");
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, "logs");
    }
  };

  const changeMyPw = async (newPw: string, wasTemp: boolean) => {
    if (!auth?.user?.username) return;
    try {
      // Find the doc by username since that's our unique ID for admins
      const q = query(collection(db, "admins"), where("username", "==", auth.user.username));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error("Admin not found");
      
      const docId = snap.docs[0].id;
      await updateDoc(doc(db, "admins", docId), { password: newPw, isTemp: false });
      
      const updatedUser = { ...auth.user, password: newPw, isTemp: false };
      setAuth({ ...auth, user: updatedUser });
      setForceChangePw(false);
      addLog(updatedUser, "pw_change", updatedUser.name, wasTemp ? "Temporary password পরিবর্তন" : "পাসওয়ার্ড পরিবর্তন");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `admins/${auth.user.username}`);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <div className="text-sm font-bold text-slate-500">লোডিং...</div>
      </div>
    </div>
  );

  if (!auth) return <Login onLogin={login} />;
  if (forceChangePw && adminUser) return <ForceChangePw admin={adminUser} onDone={changeMyPw} />;

  const { role, user } = auth;

  const curProject = selProject ? projects.find(p => p.id === selProject) : null;
  const PAGE_TITLES: Record<string, string> = { 
    home: t("nav.projects"), 
    log: t("nav.log"), 
    admins: t("nav.admin_manage"), 
    profile: t("nav.profile"), 
    installments: t("nav.my_installments"), 
    receipts: t("nav.receipts"), 
    expenses: t("nav.expenses") 
  };
  const topTitle = curProject ? curProject.name : (PAGE_TITLES[page] || "");
  const pendingCount = payments.filter((p: any) => p.status === "pending").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 flex items-center px-4 gap-3 z-[100] shadow-md no-print">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="h-8 w-auto object-contain brightness-0 invert"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div>
            <div className="font-black text-lg text-white tracking-tight">MARQ <span className="text-slate-400 font-bold">Builders</span></div>
            <div className="text-[11px] text-slate-400 font-bold tracking-wider uppercase truncate">{topTitle}</div>
          </div>
        </div>
        {isSuperAdmin && pendingCount > 0 && (
          <div className="bg-rose-500 text-white rounded-full px-3 py-1 text-xs font-black shadow-sm flex items-center gap-1.5">
            <Clock size={12} /> {pendingCount}
          </div>
        )}
        <button 
          className="w-10 h-10 bg-white/10 rounded-xl flex flex-col items-center justify-center gap-1.5 hover:bg-white/20 transition-colors" 
          onClick={() => setDrawer(true)}
        >
          <span className="w-5 h-0.5 bg-slate-300 rounded-full" />
          <span className="w-5 h-0.5 bg-slate-300 rounded-full" />
          <span className="w-5 h-0.5 bg-slate-300 rounded-full" />
        </button>
      </div>

      <Drawer 
        role={role} page={selProject ? "project" : page} setPage={(p: string) => { setPage(p); setSelProject(null); }} 
        user={user} onLogout={logout} open={drawer} onClose={() => setDrawer(false)} 
        isSuperAdmin={isSuperAdmin} pendingCount={pendingCount} 
      />

      <main className="pt-20 px-4 pb-24 max-w-4xl mx-auto">
        {(role === "admin" || role === "superadmin") && !selProject && page === "home" && (
          <AdminHome 
            projects={projects} clients={clients} payments={payments} instDefs={instDefs} expenses={expenses} plans={plans}
            onSelect={(id: string) => setSelProject(id)} onAddProject={addProject} onUpdateProject={updateProject} onDeleteProject={deleteProject} 
            isSuperAdmin={isSuperAdmin} onApprovePayment={approvePayment} onRejectPayment={rejectPayment} 
          />
        )}
        {(role === "admin" || role === "superadmin") && !selProject && page === "log" && (
          <AuditLogPage 
            logs={logs} projects={projects} 
            isSuperAdmin={isSuperAdmin} onClearLogs={clearLogs} 
          />
        )}
        
        {(role === "admin" || role === "superadmin") && !selProject && page === "profile" && <AdminProfile admin={adminUser} onUpdate={changeMyPw} />}
        {(role === "admin" || role === "superadmin") && !selProject && page === "payments" && <AdminPaymentsPage payments={payments} clients={clients} instDefs={instDefs} projects={projects} />}
        {(role === "admin" || role === "superadmin") && !selProject && page === "admins" && isSuperAdmin && <AdminManagePage admins={admins} onAdd={addAdmin} onUpdate={addAdmin} onDelete={removeAdmin} onResetPw={resetAdminPw} currentAdminId={adminUser.id} />}
        {(role === "admin" || role === "superadmin") && selProject && curProject && (
          <ProjectDetail 
            project={curProject} clients={clients} allClients={clients} instDefs={instDefs} plans={plans} payments={payments} expenses={expenses} logs={logs} isSuperAdmin={isSuperAdmin}
            onBack={() => setSelProject(null)}
            onAddPlan={addPlan}
            onUpdatePlan={updatePlan}
            onDeletePlan={deletePlan}
            onAddDef={addInstDef}
            onDeleteInstDef={deleteInstDef}
            onAddPayment={addPayment}
            onDeletePayment={deletePayment}
            onAddExpense={addExpense}
            onUpdateExpense={updateExpense}
            onDeleteExpense={deleteExpense}
            onUpdateClient={updateClient} onAddBulkClients={addBulkClients} onAddClient={addClient} onDeleteClient={deleteClient}
          />
        )}
        
        {role === "client" && page === "installments" && <ClientInstallments client={auth.user} instDefs={instDefs} payments={payments} projects={projects} plans={plans} />}
        {role === "client" && page === "receipts" && <ClientReceipts client={auth.user} instDefs={instDefs} payments={payments} projects={projects} />}
        {role === "client" && page === "expenses" && <ClientExpenses client={auth.user} expenses={expenses} />}
        {role === "client" && page === "profile" && <ClientProfile client={auth.user} onUpdateClient={(c: any) => { updateClient(c, c.id); setAuth({ ...auth, user: c }); }} />}
      </main>

      <BottomBar role={role} page={page} setPage={setPage} />
    </div>
  );
}
