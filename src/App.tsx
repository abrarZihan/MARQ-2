import * as React from "react";
import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "motion/react";
import { 
  INIT_LOGS, 
  STATUS, STATUS_LABEL, EXP_CATS, ACTION_META, LOGO_URL 
} from "./lib/data";
import { 
  BDT, BDTshort, dotJoin, uid, todayStr, tsNow, fmtTs, genClientId, 
  clientPaidForDef, cellStatus, ac, initials, cn 
} from "./lib/utils";
import { ThemeToggle } from './components/ThemeToggle.tsx';
import { ThemeProvider } from "./components/ThemeProvider";
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
import ClientProfile from "./pages/ClientProfile";
import ClientInstallments from "./pages/ClientInstallments";
import ClientReceipts from "./pages/ClientReceipts";
import ClientExpenses from "./pages/ClientExpenses";
import { Eye, EyeOff, ShieldPlus, KeyRound, Trash2, ShieldMinus, Building2, Wallet, ChevronRight, Clock, CheckCircle2, XCircle, MoreVertical, Edit2, AlertCircle, ClipboardList, CircleDollarSign } from "lucide-react";
import { CategoryIcon, CategoryColor } from "./components/Shared";
import { useLanguage, LanguageProvider } from "./lib/i18n";
import { useAppStore } from "./store/appStore";
import { 
  Project, Plan, Client, InstDef, Payment, Expense, Admin, Log, AuthUser 
} from "./types";

// Firebase
import { 
  collection, doc, setDoc, getDoc 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { useFirestoreListeners } from "./hooks/useFirestoreListeners";
import { useActions } from "./hooks/useActions";

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

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

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
    return (this as any).props.children;
  }
}

// ROOT APP COMPONENT
export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { auth, setAuth, clients, loading, setLoading, dataLoaded } = useAppStore();

  useFirestoreListeners();

  useEffect(() => {
    const init = async () => {
      try {
        const superAdminRef = doc(db, "admins", "superadmin");
        const superAdminSnap = await getDoc(superAdminRef);
        if (!superAdminSnap.exists()) {
          const superAdmin = { id: "superadmin", name: "Super Admin", username: "superadmin", password: "1234", role: "superadmin", isTemp: false };
          await setDoc(superAdminRef, superAdmin);
        }
      } catch (e) {
        console.error("Init error:", e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (dataLoaded.projects && dataLoaded.plans && dataLoaded.clients && dataLoaded.instDefs && dataLoaded.payments) {
      setLoading(false);
    }
  }, [dataLoaded, setLoading]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, [setLoading]);

  useEffect(() => {
    if (auth?.role === "client" && auth?.user?.id && clients.length > 0) {
      const updatedUser = clients.find(c => c.id === auth.user.id);
      if (updatedUser) {
        const authUser = auth.user;
        if (
          updatedUser.name !== authUser.name ||
          updatedUser.phone !== authUser.phone ||
          updatedUser.plot !== authUser.plot
        ) {
          setAuth({ 
            ...auth, 
            user: { 
              ...authUser, 
              ...updatedUser,
              role: "client", 
              username: updatedUser.id 
            } as AuthUser 
          });
        }
      }
    }
  }, [clients, auth, setAuth]);

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
  const {
    auth, setAuth,
    projects, plans, clients, instDefs, payments, expenses, logs,
    drawer, setDrawer, setSelProject, setForceChangePw
  } = useAppStore();

  const actions = useActions();
  const role = auth?.role;
  const isSuperAdmin = role === "superadmin";

  const pathParts = location.pathname.split("/");
  const projectIdFromUrl = pathParts[1] === "project" ? pathParts[2] : null;
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
  const pendingCount = payments.filter((p: Payment) => p.status === "pending").length;

  const logout = () => { 
    setAuth(null); setSelProject(null); setForceChangePw(false); 
    navigate("/login");
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
            <AdminHome />
          } />
          <Route path="/log" element={<AuditLogPage />} />
          <Route path="/admins" element={<AdminManagePage />} />
          <Route path="/profile" element={
            role === "client" ? <ClientProfile /> :
            <AdminProfile />
          } />
          <Route path="/payments" element={<AdminPaymentsPage />} />
          <Route path="/project/:projectId" element={<ProjectDetail />} />
          <Route path="/installments" element={<ClientInstallments />} />
          <Route path="/receipts" element={<ClientReceipts />} />
          <Route path="/expenses" element={<ClientExpenses />} />
        </Routes>
      </main>

      <BottomBar role={role} />
    </div>
  );
}
