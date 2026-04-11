import { create } from 'zustand';
import { 
  Project, Plan, Client, InstDef, Payment, Expense, Admin, Log, 
  AuthState, DataLoadedState 
} from '../types';

interface AppStoreState {
  // Data State
  auth: AuthState | null;
  projects: Project[];
  plans: Plan[];
  clients: Client[];
  instDefs: InstDef[];
  payments: Payment[];
  expenses: Expense[];
  admins: Admin[];
  logs: Log[];
  
  // UI State
  drawer: boolean;
  selProject: string | null;
  forceChangePw: boolean;
  loading: boolean;
  dataLoaded: DataLoadedState;
  toast: { m: string; t: 's' | 'e' } | null;

  // Actions
  setAuth: (auth: AuthState | null) => void;
  setProjects: (projects: Project[]) => void;
  setPlans: (plans: Plan[]) => void;
  setClients: (clients: Client[]) => void;
  setInstDefs: (instDefs: InstDef[]) => void;
  setPayments: (payments: Payment[]) => void;
  setExpenses: (expenses: Expense[]) => void;
  setAdmins: (admins: Admin[]) => void;
  setLogs: (logs: Log[]) => void;
  setDrawer: (drawer: boolean) => void;
  setSelProject: (selProject: string | null) => void;
  setForceChangePw: (forceChangePw: boolean) => void;
  setLoading: (loading: boolean) => void;
  setDataLoaded: (updater: Partial<DataLoadedState> | ((prev: DataLoadedState) => DataLoadedState)) => void;
  setToast: (toast: { m: string; t: 's' | 'e' } | null) => void;
}

const getInitialAuth = (): AuthState | null => {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem("marq_auth");
  return saved ? JSON.parse(saved) : null;
};

export const useAppStore = create<AppStoreState>((set) => ({
  // Initial State
  auth: getInitialAuth(),
  projects: [],
  plans: [],
  clients: [],
  instDefs: [],
  payments: [],
  expenses: [],
  admins: [],
  logs: [],
  drawer: false,
  selProject: null,
  forceChangePw: false,
  loading: true,
  dataLoaded: {
    projects: false,
    plans: false,
    clients: false,
    instDefs: false,
    payments: false,
    expenses: false,
    admins: false,
    logs: false
  },
  toast: null,

  // Actions
  setAuth: (auth) => {
    if (auth) localStorage.setItem("marq_auth", JSON.stringify(auth));
    else localStorage.removeItem("marq_auth");
    set({ auth });
  },
  setProjects: (projects) => set({ projects }),
  setPlans: (plans) => set({ plans }),
  setClients: (clients) => set({ clients }),
  setInstDefs: (instDefs) => set({ instDefs }),
  setPayments: (payments) => set({ payments }),
  setExpenses: (expenses) => set({ expenses }),
  setAdmins: (admins) => set({ admins }),
  setLogs: (logs) => set({ logs }),
  setDrawer: (drawer) => set({ drawer }),
  setSelProject: (selProject) => set({ selProject }),
  setForceChangePw: (forceChangePw) => set({ forceChangePw }),
  setLoading: (loading) => set({ loading }),
  setDataLoaded: (updater) => set((state) => ({
    dataLoaded: typeof updater === 'function' ? updater(state.dataLoaded) : { ...state.dataLoaded, ...updater }
  })),
  setToast: (toast) => set({ toast }),
}));
