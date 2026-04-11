import React, { useState, useRef, useEffect, Component } from "react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "motion/react";
import { 
  INIT_ADMINS, SP, SC, SD, SPA, SE, INIT_LOGS, 
  STATUS, STATUS_LABEL, EXP_CATS, ACTION_META, LOGO_URL 
} from "./lib/data";
import { 
  BDT, BDTshort, dotJoin, uid, todayStr, tsNow, fmtTs, genClientId, 
  clientPaidForDef, cellStatus, ac, initials, cn 
} from "./lib/utils";
import { ThemeToggle } from './components/ThemeToggle.tsx';
import { 
  Badge, PBar, FG, ClientAvatar, PassCell, ConfirmDelete, 
  Drawer, BottomBar 
} from "./components/Shared";
import Login from "./pages/Login";
import ForceChangePw from "./pages/ForceChangePw";
import AdminHome from "./pages/AdminHome";
import AdminManagePage from "./pages/AdminManagePage";
import AuditLogPage from "./pages/AuditLogPage";
import AdminProfile from "./pages/AdminProfile";
import ProjectDetail from "./pages/ProjectDetail";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
import { LogRow } from "./components/Admin";
import { AdminPaymentsPage } from "./components/AdminPages";
import { ClientExpenses, ClientProfile } from "./components/ClientPages";
import ClientInstallments from "./pages/ClientInstallments";
import ClientReceipts from "./pages/ClientReceipts";
import { Eye, EyeOff, ShieldPlus, KeyRound, Trash2, ShieldMinus, Building2, Wallet, ChevronRight, Clock, CheckCircle2, XCircle, MoreVertical, Edit2, AlertCircle, ClipboardList, CircleDollarSign } from "lucide-react";
import { CategoryIcon, CategoryColor } from "./components/Shared";
import { useLanguage } from "./lib/i18n";
import { useAppStore } from "./store/appStore";
import { 
  Project, Plan, Client, InstDef, Payment, Expense, Admin, Log, AuthUser 
} from "./types";

// Firebase
import { 
  onSnapshot, collection, doc, setDoc, updateDoc, deleteDoc, 
  query, where, getDocs, writeBatch, orderBy, limit, getDoc 
} from "firebase/firestore";
import { 
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInAnonymously 
} from "firebase/auth";
import { db, auth as fbAuth, handleFirestoreError, OperationType } from "./firebase";

// --- Protected Route Component ---
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { auth, loading } = useAppStore();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-app-bg"><div className="w-10 h-10 border-4 border-app-tab-active border-t-transparent rounded-full animate-spin" /></div>;
  if (!auth) return <Navigate to="/login" state={{ from: location }} replace />;
  if (allowedRoles && !allowedRoles.includes(auth.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}

// --- Main App Component ---
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
        <div className="min-h-screen bg-app-bg flex items-center justify-center p-6">
          <div className="bg-app-surface rounded-3xl border border-app-border p-8 max-w-md w-full shadow-xl">
            <div className="w-16 h-16 bg-app-banner-error-bg text-app-banner-error-text rounded-2xl flex items-center justify-center mb-6">
              <AlertCircle size={32} />
            </div>
            <h1 className="text-2xl font-black text-app-text-primary mb-2">Something went wrong</h1>
            <p className="text-app-text-muted font-medium mb-6">The application encountered an unexpected error. Please try refreshing the page.</p>
            <div className="bg-app-bg rounded-xl p-4 border border-app-border mb-6 overflow-auto max-h-40">
              <pre className="text-[10px] font-mono text-app-banner-error-text whitespace-pre-wrap">
                {JSON.stringify(errorInfo, null, 2)}
              </pre>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-app-tab-active text-app-surface font-bold py-4 rounded-2xl hover:opacity-90 transition-colors"
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
const INST_DEF_FIELDS = ['id', 'projectId', 'planId', 'title', 'dueDate', 'targetAmount', 'isGlobal'];
const PAYMENT_FIELDS = ['id', 'clientId', 'instDefId', 'amount', 'date', 'status', 'note', 'method', 'trxId', 'approvedBy'];
const EXPENSE_FIELDS = ['id', 'projectId', 'category', 'amount', 'date', 'description'];
const ADMIN_FIELDS = ['id', 'name', 'username', 'password', 'role', 'isTemp'];

// ROOT APP COMPONENT
export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </BrowserRouter>
  );
}

function AppContent() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    auth, setAuth,
    projects, setProjects,
    plans, setPlans,
    clients, setClients,
    instDefs, setInstDefs,
    payments, setPayments,
    expenses, setExpenses,
    admins, setAdmins,
    logs, setLogs,
    drawer, setDrawer,
    selProject, setSelProject,
    forceChangePw, setForceChangePw,
    loading, setLoading,
    dataLoaded, setDataLoaded,
    toast, setToast
  } = useAppStore();

  useEffect(() => {
    // Silent anonymous sign-in to provide request.auth for security rules
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

    // Publicly readable (needed for basic app structure)
    const unsubProjects = onSnapshot(collection(db, "projects"), (s) => {
      setProjects(s.docs.map(d => ({ ...d.data(), id: d.id } as Project)));
      setDataLoaded(prev => ({ ...prev, projects: true }));
    }, (e) => handleFirestoreError(e, OperationType.LIST, "projects"));

    const unsubPlans = onSnapshot(collection(db, "plans"), (s) => {
      setPlans(s.docs.map(d => ({ ...d.data(), id: d.id } as Plan)));
      setDataLoaded(prev => ({ ...prev, plans: true }));
    }, (e) => handleFirestoreError(e, OperationType.LIST, "plans"));

    const unsubInstDefs = onSnapshot(collection(db, "instDefs"), (s) => {
      setInstDefs(s.docs.map(d => ({ ...d.data(), id: d.id } as InstDef)));
      setDataLoaded(prev => ({ ...prev, instDefs: true }));
    }, (e) => handleFirestoreError(e, OperationType.LIST, "instDefs"));

    let unsubClients = () => {};
    let unsubPayments = () => {};
    let unsubExpenses = () => {};
    let unsubAdmins = () => {};
    let unsubLogs = () => {};

    if (auth?.role === "admin" || auth?.role === "superadmin") {
      unsubClients = onSnapshot(collection(db, "clients"), (s) => {
        setClients(s.docs.map(d => ({ ...d.data(), id: d.id } as Client)));
        setDataLoaded(prev => ({ ...prev, clients: true }));
      }, (e) => handleFirestoreError(e, OperationType.LIST, "clients"));

      unsubPayments = onSnapshot(collection(db, "payments"), (s) => {
        setPayments(s.docs.map(d => ({ ...d.data(), id: d.id } as Payment)));
        setDataLoaded(prev => ({ ...prev, payments: true }));
      }, (e) => handleFirestoreError(e, OperationType.LIST, "payments"));

      unsubExpenses = onSnapshot(collection(db, "expenses"), (s) => {
        setExpenses(s.docs.map(d => ({ ...d.data(), id: d.id } as Expense)));
        setDataLoaded(prev => ({ ...prev, expenses: true }));
      }, (e) => handleFirestoreError(e, OperationType.LIST, "expenses"));

      unsubAdmins = onSnapshot(collection(db, "admins"), (s) => {
        setAdmins(s.docs.map(d => ({ ...d.data(), id: d.id } as Admin)));
        setDataLoaded(prev => ({ ...prev, admins: true }));
      }, (e) => handleFirestoreError(e, OperationType.LIST, "admins"));

      unsubLogs = onSnapshot(query(collection(db, "logs"), orderBy("ts", "desc"), limit(100)), (s) => {
        setLogs(s.docs.map(d => ({ ...d.data(), id: d.id } as Log)));
        setDataLoaded(prev => ({ ...prev, logs: true }));
      }, (e) => handleFirestoreError(e, OperationType.LIST, "logs"));
    } else if (auth?.role === "client" && auth?.user?.id) {
      // Client only sees their own doc and payments
      unsubClients = onSnapshot(doc(db, "clients", auth.user.id), (d) => {
        if (d.exists()) {
          setClients([{ ...d.data(), id: d.id } as Client]);
        }
        setDataLoaded(prev => ({ ...prev, clients: true }));
      }, (e) => handleFirestoreError(e, OperationType.GET, `clients/${auth.user.id}`));

      unsubPayments = onSnapshot(query(collection(db, "payments"), where("clientId", "==", auth.user.id)), (s) => {
        setPayments(s.docs.map(d => ({ ...d.data(), id: d.id } as Payment)));
        setDataLoaded(prev => ({ ...prev, payments: true }));
      }, (e) => handleFirestoreError(e, OperationType.LIST, "payments"));
      
      // Mark others as loaded to stop loading spinner
      setDataLoaded(prev => ({ ...prev, expenses: true, admins: true, logs: true }));
    } else {
      // Not logged in yet - clear data or keep empty
      setClients([]);
      setPayments([]);
      setExpenses([]);
      setAdmins([]);
      setLogs([]);
      // We don't set dataLoaded to false here because we want the login screen to show
    }

    return () => {
      unsubProjects(); unsubPlans(); unsubClients(); unsubInstDefs(); unsubPayments(); unsubExpenses(); unsubAdmins(); unsubLogs();
    };
  }, [auth]);

    // Set loading to false only when essential data is loaded
  useEffect(() => {
    if (dataLoaded.projects && dataLoaded.plans && dataLoaded.clients && dataLoaded.instDefs && dataLoaded.payments) {
      setLoading(false);
    }
  }, [dataLoaded]);

  // Fallback to stop loading after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  // Keep client auth user in sync with clients collection
  useEffect(() => {
    if (auth?.role === "client" && auth?.user?.id && clients.length > 0) {
      const updatedUser = clients.find(c => c.id === auth.user.id);
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(auth.user)) {
        setAuth({ ...auth, user: { ...updatedUser, role: "client", username: updatedUser.id } as AuthUser });
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

  if (loading && !auth) return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-app-border border-t-app-tab-active rounded-full animate-spin" />
        <div className="text-sm font-bold text-app-text-muted">লোডিং...</div>
      </div>
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={!auth ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/force-change-pw" element={
        <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
          <ForceChangePw />
        </ProtectedRoute>
      } />
      <Route path="/*" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function MainLayout() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract projectId from URL manually since useParams() won't see it in the layout shell
  const pathParts = location.pathname.split("/");
  const projectIdFromUrl = pathParts[1] === "project" ? pathParts[2] : null;

  const {
    auth, setAuth,
    projects, setProjects,
    plans, setPlans,
    clients, setClients,
    instDefs, setInstDefs,
    payments, setPayments,
    expenses, setExpenses,
    admins, setAdmins,
    logs, setLogs,
    drawer, setDrawer,
    selProject, setSelProject,
    setForceChangePw,
    loading, setLoading,
    dataLoaded, setDataLoaded,
    toast, setToast
  } = useAppStore();

  const role = auth?.role;
  const adminUser = auth?.role !== "client" ? auth?.user : null;
  const isSuperAdmin = role === "superadmin";

  const page = location.pathname.split("/")[1] || "home";

  const curProject = projectIdFromUrl ? projects.find(p => p.id === projectIdFromUrl) : null;
  const PAGE_TITLES: Record<string, string> = { 
    "/": t("nav.projects"), 
    "/log": t("nav.log"), 
    "/admins": t("nav.admin_manage"), 
    "/profile": t("nav.profile"), 
    "/installments": t("nav.my_installments"), 
    "/receipts": t("nav.receipts"), 
    "/expenses": t("nav.expenses"),
    "/payments": t("nav.payments")
  };
  const topTitle = curProject ? curProject.name : (PAGE_TITLES[location.pathname] || "");
  const pendingCount = payments.filter((p: any) => p.status === "pending").length;

  const showToast = (m: string, t: 's' | 'e' = 's') => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 3000);
  };

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

  const logout = () => { 
    setAuth(null); setSelProject(null); setForceChangePw(false); 
    navigate("/login");
  };

  // Client CRUD
  const updateClient = async (c: any, oldId: string) => {
    try {
      const clean = sanitize(c, CLIENT_FIELDS);
      await setDoc(doc(db, "clients", clean.id), clean);
      if (oldId && oldId !== clean.id) {
        // Migrate payments in chunks to avoid batch limits
        const clientPayments = payments.filter(p => p.clientId === oldId);
        const chunks = [];
        for (let i = 0; i < clientPayments.length; i += 450) {
          chunks.push(clientPayments.slice(i, i + 450));
        }

        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(p => {
            batch.update(doc(db, "payments", p.id), { clientId: clean.id });
          });
          await batch.commit();
        }

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
    console.log("Deleting plan:", id);
    const p = plans.find(x => x.id === id);
    const defsToDelete = instDefs.filter((d: any) => d.planId === id);
    const clientsToUpdate = clients.filter((c: any) => (c.planAssignments || []).some((pa: any) => pa.planId === id));
    console.log("Defs to delete:", defsToDelete.length, "Clients to update:", clientsToUpdate.length);
    
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "plans", id));
      defsToDelete.forEach((d: any) => batch.delete(doc(db, "instDefs", d.id)));
      
      clientsToUpdate.forEach((c: any) => {
        const nextAssignments = (c.planAssignments || []).filter((pa: any) => pa.planId !== id);
        batch.update(doc(db, "clients", c.id), { planAssignments: nextAssignments });
      });
      
      await batch.commit();
      console.log("Plan deleted successfully");
      if (p) addLog(adminUser, "plan_delete", p.name, "প্ল্যান মুছে ফেলা হয়েছে", p.projectId);
      showToast(t("common.success_deleted"));
    } catch (e) {
      console.error("Error deleting plan:", e);
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
      // Cascade delete payments
      const relatedPayments = payments.filter(p => p.instDefId === id);
      const chunks = [];
      for (let i = 0; i < relatedPayments.length; i += 450) {
        chunks.push(relatedPayments.slice(i, i + 450));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(p => {
          batch.delete(doc(db, "payments", p.id));
        });
        await batch.commit();
      }

      await deleteDoc(doc(db, "instDefs", id));
      const plan = plans.find(pl => pl.id === planId);
      if (d) addLog(adminUser, "instdef_delete", d.title, "কিস্তি কলাম মুছে ফেলা হয়েছে (সাথে সংশ্লিষ্ট সব পেমেন্ট)", plan?.projectId || null);
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
      await updateDoc(doc(db, "payments", id), { status: "approved", approvedBy: adminUser?.id });
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

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="fixed top-0 left-0 right-0 h-16 bg-app-nav-bg border-b border-app-nav-text/10 flex items-center px-4 gap-3 z-[100] shadow-sm no-print transition-colors">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <div>
            <div className="font-black text-lg text-app-nav-text tracking-tight">MARQ <span className="text-app-nav-text-muted font-bold">Builders</span></div>
            <div className="text-[11px] text-app-nav-text-muted font-bold tracking-wider uppercase truncate">{topTitle}</div>
          </div>
        </div>
        {isSuperAdmin && pendingCount > 0 && (
          <div className="bg-rose-500 text-white rounded-full px-3 py-1 text-xs font-black shadow-sm flex items-center gap-1.5">
            <Clock size={12} /> {pendingCount}
          </div>
        )}
        <ThemeToggle />
          <button 
            className="w-10 h-10 bg-app-nav-text/10 rounded-xl flex flex-col items-center justify-center gap-1.5 hover:bg-app-nav-text/20 transition-colors" 
            onClick={() => setDrawer(true)}
          >
            <span className="w-5 h-0.5 bg-app-nav-text-muted rounded-full" />
            <span className="w-5 h-0.5 bg-app-nav-text-muted rounded-full" />
            <span className="w-5 h-0.5 bg-app-nav-text-muted rounded-full" />
          </button>
      </div>

      <Drawer 
        role={role} 
        user={auth?.user} 
        onLogout={logout} 
        open={drawer} 
        onClose={() => setDrawer(false)} 
        isSuperAdmin={isSuperAdmin} 
        pendingCount={pendingCount} 
      />

      <main className="pt-20 px-4 pb-24 max-w-4xl mx-auto">
        <Routes>
          <Route path="/" element={
            role === "client" ? <Navigate to="/installments" replace /> :
            <AdminHome 
              projects={projects} clients={clients} payments={payments} instDefs={instDefs} expenses={expenses} plans={plans}
              onSelect={(id: string) => navigate(`/project/${id}`)} onAddProject={addProject} onUpdateProject={updateProject} onDeleteProject={deleteProject} 
              isSuperAdmin={isSuperAdmin} onApprovePayment={approvePayment} onRejectPayment={rejectPayment} 
            />
          } />
          <Route path="/log" element={<AuditLogPage logs={logs} projects={projects} isSuperAdmin={isSuperAdmin} onClearLogs={clearLogs} />} />
          <Route path="/admins" element={<AdminManagePage />} />
          <Route path="/profile" element={
            role === "client" ? <ClientProfile client={auth?.user} instDefs={instDefs} onUpdateClient={(c: any) => { updateClient(c, c.id); setAuth({ ...auth!, user: c }); }} /> :
            <AdminProfile />
          } />
          <Route path="/payments" element={<AdminPaymentsPage payments={payments} clients={clients} instDefs={instDefs} projects={projects} isSuperAdmin={isSuperAdmin} onDeletePayment={deletePayment} />} />
          <Route path="/project/:projectId" element={<ProjectDetail />} />
          <Route path="/installments" element={<ClientInstallments />} />
          <Route path="/receipts" element={<ClientReceipts />} />
          <Route path="/expenses" element={<ClientExpenses client={auth?.user} expenses={expenses} />} />
        </Routes>
      </main>

      <BottomBar role={role} />
    </div>
  );
}
