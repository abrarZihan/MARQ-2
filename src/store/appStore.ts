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
  setProjects: (projects: Project[] | ((prev: Project[]) => Project[])) => void;
  setPlans: (plans: Plan[] | ((prev: Plan[]) => Plan[])) => void;
  setClients: (clients: Client[] | ((prev: Client[]) => Client[])) => void;
  setInstDefs: (instDefs: InstDef[] | ((prev: InstDef[]) => InstDef[])) => void;
  setPayments: (payments: Payment[] | ((prev: Payment[]) => Payment[])) => void;
  setExpenses: (expenses: Expense[] | ((prev: Expense[]) => Expense[])) => void;
  setAdmins: (admins: Admin[] | ((prev: Admin[]) => Admin[])) => void;
  setLogs: (logs: Log[] | ((prev: Log[]) => Log[])) => void;
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
  setProjects: (projects) => set((state) => ({ projects: typeof projects === 'function' ? projects(state.projects) : projects })),
  setPlans: (plans) => set((state) => ({ plans: typeof plans === 'function' ? plans(state.plans) : plans })),
  setClients: (clients) => set((state) => ({ clients: typeof clients === 'function' ? clients(state.clients) : clients })),
  setInstDefs: (instDefs) => set((state) => ({ instDefs: typeof instDefs === 'function' ? instDefs(state.instDefs) : instDefs })),
  setPayments: (payments) => set((state) => ({ payments: typeof payments === 'function' ? payments(state.payments) : payments })),
  setExpenses: (expenses) => set((state) => ({ expenses: typeof expenses === 'function' ? expenses(state.expenses) : expenses })),
  setAdmins: (admins) => set((state) => ({ admins: typeof admins === 'function' ? admins(state.admins) : admins })),
  setLogs: (logs) => set((state) => ({ logs: typeof logs === 'function' ? logs(state.logs) : logs })),
  setDrawer: (drawer) => set({ drawer }),
  setSelProject: (selProject) => set({ selProject }),
  setForceChangePw: (forceChangePw) => set({ forceChangePw }),
  setLoading: (loading) => set({ loading }),
  setDataLoaded: (updater) => set((state) => {
    const next = typeof updater === 'function' ? updater(state.dataLoaded) : { ...state.dataLoaded, ...updater };
    if (JSON.stringify(next) === JSON.stringify(state.dataLoaded)) return state;
    return { dataLoaded: next };
  }),
  setToast: (toast) => set({ toast }),
}));
