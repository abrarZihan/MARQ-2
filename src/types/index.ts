export interface Project {
  id: string;
  name: string;
  description: string;
}

export interface Plan {
  id: string;
  projectId: string;
  name: string;
}

export interface Client {
  id: string;
  projectId: string;
  name: string;
  fatherHusband: string;
  birthDate: string;
  phone: string;
  email: string;
  nid: string;
  plot: string;
  totalAmount: number;
  shareCount?: number;
  password: string;
  photo: string;
  schedules?: Record<string, number>;
  planAssignments?: { planId: string; assignedAt?: string; shareCount?: number }[];
  uid?: string;
  remarks?: string;
}

export interface InstDef {
  id: string;
  projectId: string;
  planId: string; // Migrated from scheduleId in App.tsx
  title: string;
  dueDate: string;
  targetAmount: number;
}

export interface Payment {
  id: string;
  projectId?: string;
  clientId: string;
  instDefId: string;
  amount: number;
  date: string;
  note: string;
  status: "approved" | "pending" | "rejected";
  approvedBy: string | null;
}

export interface Expense {
  id: string;
  projectId: string;
  date: string;
  category: string;
  description: string;
  amount: number;
}

export interface Admin {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: "admin" | "superadmin";
  isTemp: boolean;
  uid?: string;
}

export interface Log {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  target: string;
  detail: string;
  projectId: string | null;
  ts: string;
}

export interface AuthUser {
  uid?: string;
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  photo?: string;
  plot?: string;
  password?: string;
  role: "admin" | "superadmin" | "client";
  displayName?: string;
  isTemp?: boolean;
}

export interface AuthState {
  role: "admin" | "superadmin" | "client";
  user: AuthUser;
}

export interface DataLoadedState {
  projects: boolean;
  plans: boolean;
  clients: boolean;
  instDefs: boolean;
  payments: boolean;
  expenses: boolean;
  admins: boolean;
  logs: boolean;
}
