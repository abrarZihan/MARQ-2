import { useEffect } from "react";
import { 
  onSnapshot, collection, doc, query, where, orderBy, limit 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { useAppStore } from "../store/appStore";
import { Project, Plan, Client, InstDef, Payment, Expense, Admin, Log } from "../types";

export function useFirestoreListeners() {
  const {
    auth,
    setProjects,
    setPlans,
    setClients,
    setInstDefs,
    setPayments,
    setExpenses,
    setAdmins,
    setLogs,
    setDataLoaded
  } = useAppStore();

  useEffect(() => {
    // Basic collections needed by everyone
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
    let unsubApproved = () => {};

    if (auth?.role === "admin" || auth?.role === "superadmin") {
      // Fetch all clients real-time for lookups
      unsubClients = onSnapshot(collection(db, "clients"), (s) => {
        setClients(s.docs.map(d => ({ ...d.data(), id: d.id } as Client)));
        setDataLoaded(prev => ({ ...prev, clients: true }));
      }, (e) => handleFirestoreError(e, OperationType.LIST, "clients"));

      // Fetch ALL payments real-time for accurate dashboard calculations
      unsubPayments = onSnapshot(collection(db, "payments"), (s) => {
        const result = s.docs.map(d => ({ ...d.data(), id: d.id } as Payment));
        setPayments(result);
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

      unsubLogs = onSnapshot(query(collection(db, "logs"), orderBy("ts", "desc"), limit(20)), (s) => {
        setLogs(s.docs.map(d => ({ ...d.data(), id: d.id } as Log)));
        setDataLoaded(prev => ({ ...prev, logs: true }));
      }, (e) => handleFirestoreError(e, OperationType.LIST, "logs"));
    } else if (auth?.role === "client" && auth?.user?.id) {
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
      
      setDataLoaded(prev => ({ ...prev, expenses: true, admins: true, logs: true }));
    } else {
      setClients([]);
      setPayments([]);
      setExpenses([]);
      setAdmins([]);
      setLogs([]);
    }

    return () => {
      unsubProjects(); unsubPlans(); unsubClients(); unsubInstDefs(); unsubPayments(); unsubExpenses(); unsubAdmins(); unsubLogs();
      if (typeof unsubApproved === 'function') unsubApproved();
    };
  }, [auth]);
}
