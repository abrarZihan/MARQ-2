import { doc, setDoc, updateDoc, deleteDoc, writeBatch, collection, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { useAppStore } from "../store/appStore";
import { useLanguage } from "../lib/i18n";
import { uid, tsNow, BDT, dotJoin, sanitize } from "../lib/utils";
import { 
  CLIENT_FIELDS, PROJECT_FIELDS, PLAN_FIELDS, INST_DEF_FIELDS, PAYMENT_FIELDS, EXPENSE_FIELDS, ADMIN_FIELDS 
} from "../lib/constants";
import { Project, Client, Plan, InstDef, Payment, Expense, Admin } from "../types";

export function useActions() {
  const { t } = useLanguage();
  const { 
    auth, projects, clients, plans, instDefs, payments, expenses, admins, 
    setToast, setSelProject, setAuth, setForceChangePw
  } = useAppStore();

  const adminUser = auth?.role !== "client" ? auth?.user : null;
  const isSuperAdmin = auth?.role === "superadmin";

  const showToast = (m: string, t: 's' | 'e' = 's') => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 3000);
  };

  const addLog = async (action: string, target: string | Record<string, unknown>, detail: string | Record<string, unknown>, projectId: string | null = null) => {
    if (!adminUser) return;
    const sTarget = typeof target === 'object' ? JSON.stringify(target) : String(target || "");
    const sDetail = typeof detail === 'object' ? JSON.stringify(detail) : String(detail || "");
    const newLog = { 
      id: uid("LOG"), adminId: adminUser.id, adminName: adminUser.name, 
      action, target: sTarget, detail: sDetail, projectId, ts: tsNow() 
    };
    try {
      await setDoc(doc(db, "logs", newLog.id), newLog);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `logs/${newLog.id}`);
    }
  };

  // Client CRUD
  const updateClient = async (c: Client, oldId: string) => {
    try {
      const clean = sanitize(c, CLIENT_FIELDS);
      await setDoc(doc(db, "clients", clean.id), clean);
      if (oldId && oldId !== clean.id) {
        const clientPayments = payments.filter(p => p.clientId === oldId);
        const chunks = [];
        for (let i = 0; i < clientPayments.length; i += 450) chunks.push(clientPayments.slice(i, i + 450));
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(p => { batch.update(doc(db, "payments", p.id), { clientId: clean.id }); });
          await batch.commit();
        }
        await deleteDoc(doc(db, "clients", oldId));
        addLog("client_id_change", `${oldId} → ${clean.id}`, `${clean.name} এর ID পরিবর্তন`, clean.projectId);
      } else {
        addLog("client_edit", `${clean.id} - ${clean.name}`, "তথ্য আপডেট", clean.projectId);
      }
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `clients/${c.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const addClient = async (c: Client) => {
    if (clients.find(cl => cl.id === c.id)) { alert("এই ID আছে"); return; }
    try {
      const clean = sanitize(c, CLIENT_FIELDS);
      await setDoc(doc(db, "clients", clean.id), clean);
      addLog("client_add", `${clean.id} - ${clean.name}`, "নতুন ক্লাইন্ট", clean.projectId);
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `clients/${c.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const deleteClient = async (id: string) => {
    const c = clients.find(cl => cl.id === id);
    const clientPayments = payments.filter(p => p.clientId === id);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "clients", id));
      clientPayments.forEach(p => { batch.delete(doc(db, "payments", p.id)); });
      await batch.commit();
      if (c) addLog("client_delete", `${c.id} - ${c.name}`, "মুছে ফেলা হয়েছে", c.projectId);
      showToast(t("common.success_deleted"));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `clients/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const addBulkClients = async (bulk: Client[]) => {
    const batch = writeBatch(db);
    bulk.forEach(c => {
      const { __new, ...data } = c as any;
      batch.set(doc(db, "clients", data.id), data);
    });
    try {
      await batch.commit();
      addLog("client_add", `${bulk.length} জন ক্লাইন্ট`, "Bulk import");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "clients (bulk)");
    }
  };

  // Project CRUD
  const addProject = async (p: Project) => { 
    try {
      const clean = sanitize(p, PROJECT_FIELDS);
      await setDoc(doc(db, "projects", clean.id), clean);
      const defaultPlan = { id: uid("PLN-"), projectId: clean.id, name: "Default Plan" };
      await setDoc(doc(db, "plans", defaultPlan.id), defaultPlan);
      addLog("project_add", clean.name, "নতুন প্রজেক্ট ও ডিফল্ট প্ল্যান"); 
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `projects/${p.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const updateProject = async (p: Project) => {
    try {
      const clean = sanitize(p, PROJECT_FIELDS);
      await updateDoc(doc(db, "projects", clean.id), clean);
      addLog("project_edit", clean.name, "প্রজেক্ট তথ্য আপডেট");
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
      if (prj) addLog("project_delete", prj.name, "মুছে ফেলা হয়েছে");
      showToast(t("common.success_deleted"));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `projects/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  // Plan CRUD
  const addPlan = async (p: Plan) => {
    try {
      const clean = sanitize(p, PLAN_FIELDS);
      await setDoc(doc(db, "plans", clean.id), clean);
      addLog("plan_add", clean.name, "নতুন প্ল্যান", clean.projectId);
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `plans/${p.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const updatePlan = async (p: Plan) => {
    try {
      const clean = sanitize(p, PLAN_FIELDS);
      await updateDoc(doc(db, "plans", clean.id), clean);
      addLog("plan_edit", clean.name, "প্ল্যান আপডেট", clean.projectId);
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `plans/${p.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const deletePlan = async (id: string) => {
    const p = plans.find(x => x.id === id);
    const defsToDelete = instDefs.filter((d: InstDef) => d.planId === id);
    const clientsToUpdate = clients.filter((c: Client) => (c.planAssignments || []).some(pa => pa.planId === id));
    
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "plans", id));
      defsToDelete.forEach((d: InstDef) => batch.delete(doc(db, "instDefs", d.id)));
      clientsToUpdate.forEach((c: Client) => {
        const nextAssignments = (c.planAssignments || []).filter(pa => pa.planId !== id);
        batch.update(doc(db, "clients", c.id), { planAssignments: nextAssignments });
      });
      await batch.commit();
      if (p) addLog("plan_delete", p.name, "প্ল্যান মুছে ফেলা হয়েছে", p.projectId);
      showToast(t("common.success_deleted"));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `plans/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  // InstDef CRUD
  const addInstDef = async (d: InstDef) => {
    try {
      const clean = sanitize(d, INST_DEF_FIELDS);
      await setDoc(doc(db, "instDefs", clean.id), clean);
      const plan = plans.find(pl => pl.id === clean.planId);
      const prj = projects.find(proj => proj.id === plan?.projectId);
      addLog("instdef_add", clean.title, dotJoin(prj?.name, plan?.name, `৳${clean.targetAmount}`), prj?.id || null);
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `instDefs/${d.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const updateInstDef = async (d: InstDef) => {
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
      const relatedPayments = payments.filter(p => p.instDefId === id);
      const chunks = [];
      for (let i = 0; i < relatedPayments.length; i += 450) chunks.push(relatedPayments.slice(i, i + 450));
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(p => { batch.delete(doc(db, "payments", p.id)); });
        await batch.commit();
      }
      await deleteDoc(doc(db, "instDefs", id));
      const plan = plans.find(pl => pl.id === planId);
      if (d) addLog("instdef_delete", d.title, "কিস্তি কলাম মুছে ফেলা হয়েছে", plan?.projectId || null);
      showToast(t("common.success_deleted"));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `instDefs/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  // Payment CRUD
  const addPayment = async (p: Payment) => {
    try {
      const c = clients.find(cl => cl.id === p.clientId);
      const clean = sanitize({ ...p, projectId: p.projectId || c?.projectId }, PAYMENT_FIELDS);
      await setDoc(doc(db, "payments", clean.id), clean);
      const d = instDefs.find(di => di.id === clean.instDefId);
      const action = clean.status === "approved" ? "payment_add" : "payment_pending";
      addLog(action, `${c?.id} - ${c?.name}`, `${BDT(clean.amount)} — ${d?.title}${clean.status === "pending" ? " (pending)" : ""}`, c?.projectId);
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `payments/${p.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const updatePayment = async (p: Payment) => {
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
        addLog("payment_delete", `${c?.name || p.clientId}`, `${BDT(p.amount)} — ${d?.title}`, c?.projectId);
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
        addLog("payment_approved", `${c?.id} - ${c?.name}`, `${BDT(p.amount)} — ${d?.title}`, c?.projectId);
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
        addLog("payment_rejected", `${c?.id} - ${c?.name}`, `${BDT(p.amount)} — ${d?.title}`, c?.projectId);
      }
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `payments/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  // Expense CRUD
  const addExpense = async (e: Expense) => {
    try {
      const clean = sanitize(e, EXPENSE_FIELDS);
      await setDoc(doc(db, "expenses", clean.id), clean);
      addLog("expense_add", clean.category, `${BDT(clean.amount)} — ${clean.description}`, clean.projectId);
      showToast(t("common.success_saved"));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `expenses/${e.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const updateExpense = async (e: Expense) => {
    try {
      const clean = sanitize(e, EXPENSE_FIELDS);
      await updateDoc(doc(db, "expenses", clean.id), clean);
      addLog("expense_edit", clean.category, `${BDT(clean.amount)} — ${clean.description}`, clean.projectId);
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
      if (e) addLog("expense_delete", e.category, `${BDT(e.amount)} — ${e.description}`, e.projectId);
      showToast(t("common.success_deleted"));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  // Admin CRUD
  const addAdmin = async (a: Admin) => {
    try {
      const clean = sanitize(a, ADMIN_FIELDS);
      await setDoc(doc(db, "admins", clean.id), clean);
      addLog("admin_add", clean.name, clean.role);
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `admins/${a.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const updateAdmin = async (a: Admin) => {
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
      if (a) addLog("admin_remove", a.name, a.role);
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
      if (a) addLog("admin_reset_pw", a.name, "Temporary password সেট");
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
      for (let i = 0; i < docs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 500);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      addLog("admin_clear_logs", "All Logs", "Logs cleared by Super Admin");
      showToast(t("common.success_deleted"));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, "logs");
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const changeAdminPassword = async (id: string, newPw: string) => {
    try {
      await updateDoc(doc(db, "admins", id), { password: newPw, isTemp: false });
      const a = admins.find(x => x.id === id);
      if (a) {
        addLog("pw_change", a.name, "পাসওয়ার্ড পরিবর্তন");
        if (auth?.user.id === id) {
          setAuth({ ...auth, user: { ...a, password: newPw, isTemp: false } });
        }
      }
      showToast(t("common.success_saved"));
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `admins/${id}`);
      showToast(t("common.error_occurred"), 'e');
      return false;
    }
  };

  const migratePayments = async () => {
    if (!isSuperAdmin) return;
    try {
      setToast({ m: "Migration started...", t: 's' });
      
      // 1. Fetch ALL payments and ALL clients from server to ensure complete mapping
      const [paySnap, clientSnap] = await Promise.all([
        getDocs(collection(db, "payments")),
        getDocs(collection(db, "clients"))
      ]);
      
      const allPays = paySnap.docs.map(d => ({ ...d.data(), id: d.id } as Payment));
      const allClients = clientSnap.docs.map(d => ({ ...d.data(), id: d.id } as Client));
      
      // 2. Identify records missing projectId
      const missing = allPays.filter(p => !p.projectId);
      if (missing.length === 0) {
        setToast({ m: "No payments need migration.", t: 's' });
        return;
      }

      // 3. Batch update in chunks of 450 (Firestore limit is 500)
      let count = 0;
      for (let i = 0; i < missing.length; i += 450) {
        const batch = writeBatch(db);
        const chunk = missing.slice(i, i + 450);
        chunk.forEach(p => {
          const client = allClients.find(c => c.id === p.clientId);
          if (client?.projectId) {
            batch.update(doc(db, "payments", p.id), { projectId: client.projectId });
            count++;
          }
        });
        await batch.commit();
      }
      
      addLog("admin_data_migration", "Payments Collection", `Migrated ${count} payment records with projectId`);
      setToast({ m: `Successfully migrated ${count} payments.`, t: 's' });
      setTimeout(() => setToast(null), 5000);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, "payments (migration)");
      setToast({ m: "Migration failed. See console.", t: 'e' });
    }
  };

  const migrateInstDefs = async () => {
    if (!isSuperAdmin) return;
    try {
      setToast({ m: "InstDef Migration started...", t: 's' });
      
      const [instSnap, planSnap] = await Promise.all([
        getDocs(collection(db, "instDefs")),
        getDocs(collection(db, "plans"))
      ]);
      
      const allInsts = instSnap.docs.map(d => ({ ...d.data(), id: d.id } as InstDef));
      const allPlans = planSnap.docs.map(d => ({ ...d.data(), id: d.id } as Plan));
      
      const missing = allInsts.filter(d => !d.projectId);
      if (missing.length === 0) {
        setToast({ m: "No InstDefs need migration.", t: 's' });
        return;
      }

      let count = 0;
      for (let i = 0; i < missing.length; i += 450) {
        const batch = writeBatch(db);
        const chunk = missing.slice(i, i + 450);
        chunk.forEach(d => {
          const plan = allPlans.find(pl => pl.id === d.planId);
          if (plan?.projectId) {
            batch.update(doc(db, "instDefs", d.id), { projectId: plan.projectId });
            count++;
          }
        });
        await batch.commit();
      }
      
      addLog("admin_data_migration", "InstDefs Collection", `Migrated ${count} InstDef records with projectId`);
      setToast({ m: `Successfully migrated ${count} instDefs.`, t: 's' });
      setTimeout(() => setToast(null), 5000);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, "instDefs (migration)");
      setToast({ m: "Migration failed. See console.", t: 'e' });
    }
  };

  return {
    addLog, updateClient, addClient, deleteClient, addBulkClients,
    addProject, updateProject, deleteProject,
    addPlan, updatePlan, deletePlan,
    addInstDef, updateInstDef, deleteInstDef,
    addPayment, updatePayment, deletePayment, approvePayment, rejectPayment,
    addExpense, updateExpense, deleteExpense,
    addAdmin, updateAdmin, removeAdmin, resetAdminPw, clearLogs,
    changeAdminPassword, migratePayments, migrateInstDefs
  };
}
