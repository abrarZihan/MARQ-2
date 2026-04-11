import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "motion/react";
import { BDT, dotJoin, uid, cn, genClientId, tsNow } from "../../../lib/utils";
import { FG, ConfirmDelete, ClientAvatar, PassCell } from "../../../components/Shared";
import { Trash2, Eye, EyeOff, Edit2, Camera, Printer, FileUp, Search, Filter, X } from "lucide-react";
import { useLanguage } from "../../../lib/i18n";
import { useAppStore } from "../../../store/appStore";
import { db, handleFirestoreError, OperationType } from "../../../firebase";
import { doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";

const CLIENT_FIELDS = ['id', 'projectId', 'name', 'fatherHusband', 'birthDate', 'phone', 'email', 'nid', 'plot', 'totalAmount', 'shareCount', 'password', 'photo', 'remarks', 'planAssignments', '_row'];

const sanitize = (data: any, allowedFields: string[]) => {
  const clean: any = {};
  allowedFields.forEach(f => {
    if (data[f] !== undefined) clean[f] = data[f];
  });
  return clean;
};

export default function ClientsTab({ projectId }: { projectId: string }) {
  const { t, lang } = useLanguage();
  const { clients, plans, payments, auth, setToast } = useAppStore();
  
  const adminUser = auth?.user;
  const projectClients = clients.filter(c => c.projectId === projectId);
  
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const [viewClient, setViewClient] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [importSheet, setImportSheet] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (m: string, t: 's' | 'e' = 's') => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 3000);
  };

  const addLog = async (action: string, target: any, detail: any) => {
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

  // Actions
  const onAddClient = async (c: any) => {
    try {
      const clean = sanitize(c, CLIENT_FIELDS);
      await setDoc(doc(db, "clients", clean.id), clean);
      addLog("client_add", `${clean.id} - ${clean.name}`, "নতুন ক্লাইন্ট");
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `clients/${c.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const onUpdateClient = async (c: any, oldId: string) => {
    try {
      const clean = sanitize(c, CLIENT_FIELDS);
      await setDoc(doc(db, "clients", clean.id), clean);
      if (oldId && oldId !== clean.id) {
        const clientPayments = payments.filter(p => p.clientId === oldId);
        const chunks = [];
        for (let i = 0; i < clientPayments.length; i += 450) chunks.push(clientPayments.slice(i, i + 450));
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(p => batch.update(doc(db, "payments", p.id), { clientId: clean.id }));
          await batch.commit();
        }
        await deleteDoc(doc(db, "clients", oldId));
        addLog("client_id_change", `${oldId} → ${clean.id}`, `${clean.name} এর ID পরিবর্তন`);
      } else {
        addLog("client_edit", `${clean.id} - ${clean.name}`, "তথ্য আপডেট");
      }
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `clients/${c.id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const onDeleteClient = async (id: string) => {
    const c = clients.find(cl => cl.id === id);
    const clientPayments = payments.filter(p => p.clientId === id);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "clients", id));
      clientPayments.forEach(p => 
        batch.delete(doc(db, "payments", p.id))
      );
      await batch.commit();
      if (c) addLog("client_delete", `${c.id} - ${c.name}`, "মুছে ফেলা হয়েছে");
      showToast(t("common.success_deleted"));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `clients/${id}`);
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const onAddBulkClients = async (bulk: any[]) => {
    const batch = writeBatch(db);
    bulk.forEach(c => {
      const { __new, ...data } = c;
      const clean = sanitize(data, CLIENT_FIELDS);
      batch.set(doc(db, "clients", clean.id), clean);
    });
    try {
      await batch.commit();
      addLog("client_add", `${bulk.length} জন ক্লাইন্ট`, "Bulk import");
      showToast(t("common.success_saved"));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "clients (bulk)");
      showToast(t("common.error_occurred"), 'e');
    }
  };

  const filtered = projectClients.filter((c: any) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || c.name?.toLowerCase()?.includes(q) || c.id?.toLowerCase()?.includes(q) || c.phone?.includes(q) || c.nid?.includes(q) || c.email?.toLowerCase()?.includes(q);
    const matchesPlan = planFilter === "all" || (c.planAssignments || []).some((pa: any) => pa.planId === planFilter);
    return matchesSearch && matchesPlan;
  });

  const getTotalShares = (c: any) => {
    if (!c.planAssignments || c.planAssignments.length === 0) return c.shareCount || 1;
    return c.planAssignments.reduce((sum: number, pa: any) => sum + (pa.shareCount || 0), 0);
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const wb = XLSX.read(e.target?.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const clientMap = new Map<string, any>();
      rows.forEach((r: any, i: number) => {
        const get = (targetKeys: string[]) => {
          for (const k of targetKeys) {
            const foundKey = Object.keys(r).find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, "") === k || rk.toLowerCase().replace(/[^a-z0-9]/g, "").includes(k));
            if (foundKey && r[foundKey] !== undefined && r[foundKey] !== null) return { key: foundKey, value: String(r[foundKey]) };
          }
          return null;
        };
        const name = get(["customername", "name", "fullname", "clientname"])?.value || "";
        const phone = get(["phone", "mobile", "contact", "cell", "number"])?.value || "";
        const nid = get(["nid", "nationalid", "national"])?.value || "";
        if (!name) return;
        const identity = `${name}|${phone}|${nid}`.toLowerCase().replace(/[^a-z0-9]/g, "");
        const plansFromRow: Record<string, number> = {};
        Object.keys(r).forEach(key => {
          if (key.toLowerCase().includes("shares")) {
            const planName = key.replace(/shares/i, "").trim();
            const shareCount = parseInt(String(r[key])) || 0;
            if (shareCount > 0) plansFromRow[planName] = (plansFromRow[planName] || 0) + shareCount;
          }
        });
        if (Object.keys(plansFromRow).length === 0) {
          const planName = get(["plan", "plantype", "category", "type"])?.value || "Default";
          const shareCount = parseInt(get(["sharecount", "shares", "count", "share"])?.value) || 1;
          plansFromRow[planName] = shareCount;
        }
        const totalShares = Object.values(plansFromRow).reduce((a: number, b: number) => a + b, 0);
        if (clientMap.has(identity)) {
          const existing = clientMap.get(identity);
          existing.totalShares += totalShares;
          Object.entries(plansFromRow).forEach(([pName, count]) => { existing.plans[pName] = (existing.plans[pName] || 0) + count; });
        } else {
          clientMap.set(identity, { row: r, totalShares, plans: plansFromRow, firstIndex: i });
        }
      });
      const mapped = Array.from(clientMap.values()).map((g: any) => {
        const r = g.row;
        const i = g.firstIndex;
        const getVal = (targetKeys: string[]) => {
          for (const k of targetKeys) {
            const foundKey = Object.keys(r).find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, "") === k || rk.toLowerCase().replace(/[^a-z0-9]/g, "").includes(k));
            if (foundKey && r[foundKey] !== undefined && r[foundKey] !== null) return String(r[foundKey]);
          }
          return "";
        };
        const planAssignments = Object.entries(g.plans).map(([pName, count]) => {
          const matchedPlan = plans.find((p: any) => p.name.toLowerCase() === pName.toLowerCase());
          return { planId: matchedPlan ? matchedPlan.id : `NEW_PLAN_${pName}`, planName: pName, shareCount: count };
        });
        return {
          id: getVal(["customerid", "clientid", "id", "sl", "serial"]) || getVal(["phone", "mobile", "contact", "cell", "number"]) || genClientId([...clients]),
          name: getVal(["customername", "name", "fullname", "clientname"]),
          fatherHusband: getVal(["father", "husband", "parent", "guardian"]),
          birthDate: getVal(["birth", "dob", "dateofbirth"]),
          phone: getVal(["phone", "mobile", "contact", "cell", "number"]),
          email: getVal(["email", "mail", "gmail"]),
          nid: getVal(["nid", "nationalid", "national"]),
          plot: getVal(["plot", "flat", "unit", "apartment", "plotno", "flatno"]),
          totalAmount: parseFloat(getVal(["totalamount", "amount", "price", "total", "value"])) || 0,
          shareCount: g.totalShares,
          planAssignments,
          password: "1234",
          photo: "",
          projectId,
          remarks: "",
          _row: i + 2
        };
      });
      setImportData(mapped);
      setImportSheet(true);
    };
    reader.readAsArrayBuffer(file);
  };

  const newTpl = {
    __new: true, id: genClientId(clients), name: "", fatherHusband: "", birthDate: "",
    phone: "", email: "", nid: "", plot: "", totalAmount: "", shareCount: 1, photo: "", projectId, password: "1234", remarks: ""
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-app-text-primary">{t("client_info.title")}</h1>
          <p className="text-xs font-medium text-app-text-secondary">{t("client_info.stats", { count: projectClients.length })}</p>
        </div>
        <div className="flex gap-2 no-print">
          <button className="bg-app-surface border border-app-border text-app-text-secondary px-3 py-2 rounded-xl text-xs font-bold hover:bg-app-bg shadow-sm flex items-center gap-2" onClick={() => window.print()}><Printer size={14} /> {t("client_info.print")}</button>
          <button className="bg-app-surface border border-app-border text-app-text-secondary px-3 py-2 rounded-xl text-xs font-bold hover:bg-app-bg shadow-sm flex items-center gap-2" onClick={() => fileRef.current?.click()}><FileUp size={14} /> {t("client_info.import")}</button>
          <button className="bg-app-tab-active text-app-bg px-3 py-2 rounded-xl text-xs font-bold hover:opacity-90 shadow-sm" onClick={() => setEditClient(newTpl)}>{t("client_info.add_client")}</button>
        </div>
      </div>
      
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { if (e.target.files?.[0]) parseFile(e.target.files[0]); e.target.value = ""; }} />
      
      <div className="relative mb-4 no-print flex items-center gap-2">
        <div className="relative flex-1 group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-app-text-muted group-focus-within:text-app-text-secondary" />
          <input className="w-full pl-11 pr-11 py-3.5 bg-app-surface border border-app-border rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted shadow-sm text-app-text-primary" placeholder={t("client_info.search_ph")} value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text-secondary p-1"><X size={16} /></button>}
        </div>
        <div className="relative">
          <button onClick={() => setShowFilterMenu(!showFilterMenu)} className={cn("p-3.5 rounded-2xl border flex items-center justify-center gap-2 font-bold text-sm", planFilter !== "all" ? "bg-app-tab-active border-app-tab-active text-app-bg shadow-lg" : "bg-app-surface border-app-border text-app-text-secondary hover:bg-app-bg shadow-sm")}>
            <Filter size={18} />
            {planFilter !== "all" && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md">1</span>}
          </button>
          <AnimatePresence>
            {showFilterMenu && (
              <>
                <div className="fixed inset-0 z-[100]" onClick={() => setShowFilterMenu(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="absolute right-0 mt-2 w-56 bg-app-surface-elevated border border-app-border rounded-2xl shadow-xl z-[101] overflow-hidden p-2">
                  <div className="px-3 py-2 text-[10px] font-black text-app-text-muted uppercase tracking-wider">Filter by Plan</div>
                  <button onClick={() => { setPlanFilter("all"); setShowFilterMenu(false); }} className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors mb-1", planFilter === "all" ? "bg-app-bg text-app-text-primary" : "text-app-text-secondary hover:bg-app-bg")}>All Plans</button>
                  {plans.filter((p: any) => p.projectId === projectId).map((p: any) => (
                    <button key={p.id} onClick={() => { setPlanFilter(p.id); setShowFilterMenu(false); }} className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors mb-1", planFilter === p.id ? "bg-app-bg text-app-text-primary" : "text-app-text-secondary hover:bg-app-bg")}>{p.name}</button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <div className="overflow-x-auto overflow-y-auto max-h-[60vh] rounded-2xl border border-app-border bg-app-surface shadow-sm">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="bg-app-nav-bg text-white p-3 text-center w-10 font-bold border-r border-b border-app-border/30">SL</th>
              <th className="bg-app-nav-bg text-white p-3 w-12 font-bold border-r border-b border-app-border/30">{t("client_info.photo")}</th>
              <th className="bg-app-nav-bg text-white p-3 text-left font-bold border-r border-b border-app-border/30">{t("client_info.customer_id")}</th>
              <th className="bg-app-nav-bg text-white p-3 text-left font-bold border-r border-b border-app-border/30">{t("client_info.name")}</th>
              <th className="bg-app-nav-bg text-white p-3 text-left font-bold border-r border-b border-app-border/30">{t("client_info.phone")}</th>
              <th className="bg-app-nav-bg text-white p-3 text-left font-bold border-r border-b border-app-border/30">{t("client_info.share_count")}</th>
              <th className="bg-app-nav-bg text-white p-3 text-left font-bold border-r border-b border-app-border/30">{t("common.password")}</th>
              <th className="bg-app-nav-bg text-white p-3 text-center font-bold border-b border-app-border/30 no-print">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-app-text-muted font-bold">{t("client_info.no_clients")}</td></tr>
            )}
            {filtered.map((c: any, i: number) => (
              <tr key={c.id} className="hover:bg-app-bg transition-colors border-b border-app-border last:border-0">
                <td className="p-3 text-center text-app-text-muted font-medium border-r border-app-border">{i + 1}</td>
                <td className="p-3 border-r border-app-border"><ClientAvatar client={c} size={34} /></td>
                <td className="p-3 border-r border-app-border"><span className="bg-app-bg px-2 py-1 rounded-md font-mono text-[10px] font-bold text-app-text-secondary border border-app-border">{c.id}</span></td>
                <td className="p-3 font-bold text-app-text-primary border-r border-app-border">{c.name || "—"}</td>
                <td className="p-3 border-r border-app-border"><span className="font-bold text-app-text-primary">{c.phone || "—"}</span></td>
                <td className="p-3 border-r border-app-border"><span className="bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 px-2 py-1 rounded-md font-bold text-[10px] border border-blue-200 dark:border-blue-500/20">{getTotalShares(c)} {t("client_info.shares")}</span></td>
                <td className="p-3 border-r border-app-border"><PassCell value={c.password || "1234"} /></td>
                <td className="p-3 no-print">
                  <div className="flex gap-1.5 justify-center">
                    <button className="w-7 h-7 bg-app-bg text-app-text-secondary rounded-lg flex items-center justify-center hover:bg-app-border border border-app-border" onClick={() => setViewClient(c)}><Eye size={14} /></button>
                    <button className="w-7 h-7 bg-app-tab-active text-app-bg rounded-lg flex items-center justify-center hover:opacity-90" onClick={() => { const { __new, ...clean } = c; setEditClient(clean); }}><Edit2 size={14} /></button>
                    <button className="w-7 h-7 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center hover:bg-rose-500/20 border border-rose-500/20" onClick={() => setDeleteTarget(c)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence mode="wait">
        {viewClient && <ClientDetailSheet client={viewClient} onClose={() => setViewClient(null)} onEdit={(c: any) => { setViewClient(null); setEditClient({ ...c }); }} />}
        {editClient && <ClientEditSheet client={editClient} allClients={clients} plans={plans} onSave={(c: any, oldId: string) => { if (c.__new) { onAddClient(c); } else { onUpdateClient(c, oldId); } setEditClient(null); }} onClose={() => setEditClient(null)} />}
        {importSheet && importData && <ImportPreviewSheet data={importData} onConfirm={() => { onAddBulkClients(importData); setImportSheet(false); setImportData(null); }} onClose={() => { setImportSheet(false); setImportData(null); }} />}
        {deleteTarget && <ConfirmDelete message={<><b>{deleteTarget.name}</b> ({deleteTarget.id}){t("client_info.will_be_deleted")}</>} onConfirm={() => { onDeleteClient(deleteTarget.id); setDeleteTarget(null); }} onClose={() => setDeleteTarget(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}

// Sub-components
function ClientDetailSheet({ client, onClose, onEdit }: any) {
  const { t, lang } = useLanguage();
  const [showPass, setShowPass] = useState(false);
  const totalShares = !client.planAssignments || client.planAssignments.length === 0 ? (client.shareCount || 1) : client.planAssignments.reduce((sum: number, pa: any) => sum + (pa.shareCount || 0), 0);
  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[400] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-app-surface-elevated rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto border border-app-border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-4 mb-6"><ClientAvatar client={client} size={64} /><div><div className="text-xl font-black text-app-text-primary">{client.name}</div><div className="text-sm font-medium text-app-text-secondary mt-1">{dotJoin(client.phone, client.plot)}</div></div></div>
        <div className="space-y-3 mb-6">
          {[ [t("client_info.customer_id"), client.id], [t("client_info.name"), client.name], [t("client_info.phone"), client.phone], [t("client_info.plot"), client.plot], [t("client_info.share_count"), totalShares] ].map(([l, v], i) => (
            <div key={i} className="flex items-center py-2 border-b border-app-border last:border-0"><span className="text-xs font-bold text-app-text-muted w-32 shrink-0">{l}</span><span className="text-sm font-bold text-app-text-primary flex-1">{v || "—"}</span></div>
          ))}
          <div className="flex items-center py-2 border-b border-app-border last:border-0"><span className="text-xs font-bold text-app-text-muted w-32 shrink-0">Password</span><div className="flex items-center gap-2"><span className="text-sm font-mono font-bold tracking-widest text-app-text-primary">{showPass ? client.password : "••••••"}</span><button className="text-app-text-muted hover:text-app-text-secondary" onClick={() => setShowPass(s => !s)}>{showPass ? <EyeOff size={14} /> : <Eye size={14} />}</button></div></div>
        </div>
        <div className="flex gap-3"><button className="flex-1 bg-app-tab-active text-app-bg font-bold py-3.5 rounded-xl" onClick={() => onEdit(client)}><Edit2 size={16} /> Edit</button><button className="flex-1 bg-app-bg text-app-text-secondary font-bold py-3.5 rounded-xl border border-app-border" onClick={onClose}>{t("client_info.close")}</button></div>
      </motion.div>
    </div>
  );
}

function ClientEditSheet({ client, allClients, plans, onSave, onClose }: any) {
  const { t } = useLanguage();
  const isNew = !!client.__new;
  const originalId = client.id;
  const [f, setF] = useState({ ...client, planAssignments: client.planAssignments || [] });
  const [showPass, setShowPass] = useState(false);
  const s = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const submit = () => {
    if (!f.name || !f.id) { alert("Name and ID are required"); return; }
    onSave({ ...f, totalAmount: parseFloat(f.totalAmount) || 0, shareCount: parseInt(f.shareCount) || 1 }, originalId);
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[400] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-app-surface-elevated rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto border border-app-border" onClick={e => e.stopPropagation()}>
        <div className="text-xl font-black text-app-text-primary mb-6">{isNew ? t("client_info.new_client") : t("client_info.update_client")}</div>
        <FG label="Customer ID"><input className="w-full px-4 py-3.5 bg-app-bg border border-app-border rounded-xl text-sm" value={f.id} onChange={e => s("id", e.target.value)} /></FG>
        <FG label={t("client_info.name")}><input className="w-full px-4 py-3.5 bg-app-bg border border-app-border rounded-xl text-sm" value={f.name || ""} onChange={e => s("name", e.target.value)} /></FG>
        <FG label="Phone"><input className="w-full px-4 py-3.5 bg-app-bg border border-app-border rounded-xl text-sm" value={f.phone || ""} onChange={e => s("phone", e.target.value)} /></FG>
        <FG label={t("client_info.plot")}><input className="w-full px-4 py-3.5 bg-app-bg border border-app-border rounded-xl text-sm" value={f.plot || ""} onChange={e => s("plot", e.target.value)} /></FG>
        <div className="mt-6 mb-2 text-sm font-bold text-app-text-primary">Plan Assignments</div>
        {f.planAssignments.map((pa: any, i: number) => (
          <div key={i} className="flex gap-2 mb-2">
            <select className="flex-1 px-4 py-3.5 bg-app-bg border border-app-border rounded-xl text-sm" value={pa.planId} onChange={e => { const next = [...f.planAssignments]; next[i].planId = e.target.value; s("planAssignments", next); }}>
              {plans.map((pl: any) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
            </select>
            <input className="w-20 px-4 py-3.5 bg-app-bg border border-app-border rounded-xl text-sm" type="number" value={pa.shareCount} onChange={e => { const next = [...f.planAssignments]; next[i].shareCount = parseInt(e.target.value) || 0; s("planAssignments", next); }} />
            <button className="p-3 bg-rose-500/10 text-rose-600 rounded-xl" onClick={() => s("planAssignments", f.planAssignments.filter((_: any, idx: number) => idx !== i))}><Trash2 size={16} /></button>
          </div>
        ))}
        <button className="w-full py-3 bg-app-bg text-app-text-secondary font-bold rounded-xl border border-app-border mb-4" onClick={() => s("planAssignments", [...f.planAssignments, { planId: plans[0]?.id || "", shareCount: 1 }])}>+ Add Plan</button>
        <div className="flex gap-3 mt-4"><button className="flex-1 bg-app-tab-active text-app-bg font-bold py-3.5 rounded-xl" onClick={submit}>{isNew ? t("client_info.add") : t("client_info.update")}</button><button className="flex-1 bg-app-bg text-app-text-secondary font-bold py-3.5 rounded-xl border border-app-border" onClick={onClose}>{t("client_info.cancel")}</button></div>
      </motion.div>
    </div>
  );
}

function ImportPreviewSheet({ data, onConfirm, onClose }: any) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[400] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-app-surface-elevated rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto border border-app-border" onClick={e => e.stopPropagation()}>
        <div className="text-xl font-black text-app-text-primary mb-6">📥 {t("client_info.import_preview")} — {data.length} Clients</div>
        <div className="overflow-x-auto mb-4 border border-app-border rounded-xl"><table className="w-full text-xs border-collapse"><thead><tr className="bg-app-bg text-app-text-muted font-bold text-left"><th className="p-2">ID</th><th className="p-2">Name</th><th className="p-2">Shares</th></tr></thead><tbody>{data.slice(0, 10).map((r: any, i: number) => (<tr key={i} className="border-b border-app-border last:border-0"><td className="p-2 font-mono">{r.id}</td><td className="p-2 font-bold">{r.name}</td><td className="p-2">{r.shareCount}</td></tr>))}</tbody></table></div>
        <div className="flex gap-3"><button className="flex-1 bg-app-tab-active text-app-bg font-bold py-3.5 rounded-xl" onClick={onConfirm}>{t("client_info.import_btn", { count: data.length })}</button><button className="flex-1 bg-app-bg text-app-text-secondary font-bold py-3.5 rounded-xl border border-app-border" onClick={onClose}>{t("client_info.cancel")}</button></div>
      </motion.div>
    </div>
  );
}
