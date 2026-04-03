import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "motion/react";
import { BDT, BDTshort, dotJoin, ac, initials, uid, todayStr, cn, genClientId } from "../lib/utils";
import { FG, ConfirmDelete, ClientAvatar, PassCell } from "./Shared";
import { Trash2, Eye, EyeOff, Edit2, Camera, Printer, FileUp } from "lucide-react";

import { useLanguage } from "../lib/i18n";

export function ClientInfoPage({ clients, allClients, onUpdate, onAddBulk, onAddSingle, onDelete, projectId, plans }: any) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [editClient, setEditClient] = useState<any>(null);
  const [viewClient, setViewClient] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [importSheet, setImportSheet] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = clients.filter((c: any) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || c.name?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q) || c.phone?.includes(q) || c.nid?.includes(q) || c.email?.toLowerCase().includes(q);
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
            const foundKey = Object.keys(r).find(rk => {
              const normalized = rk.toLowerCase().replace(/[\s_]/g, "");
              return normalized === k || normalized.includes(k);
            });
            if (foundKey && r[foundKey]) return { key: foundKey, value: String(r[foundKey]) };
          }
          return null;
        };

        const name = get(["customername", "name", "fullname", "clientname"])?.value || "";
        const phone = get(["phone", "mobile", "contact", "cell", "number"])?.value || "";
        const nid = get(["nid", "nationalid", "national"])?.value || "";
        
        if (!name) return;

        // Identity key: Name + Phone + NID
        const identity = `${name}|${phone}|${nid}`.toLowerCase().replace(/[\s_]/g, "");
        const planName = get(["plan", "plantype", "category", "type"])?.value || "Default";
        const shareCount = parseInt(get(["sharecount", "shares", "count", "share"])?.value) || 1;

        if (clientMap.has(identity)) {
          const existing = clientMap.get(identity);
          existing.totalShares += shareCount;
          existing.plans[planName] = (existing.plans[planName] || 0) + shareCount;
        } else {
          clientMap.set(identity, {
            row: r,
            totalShares: shareCount,
            plans: { [planName]: shareCount },
            firstIndex: i
          });
        }
      });

      const mapped = Array.from(clientMap.values()).map((g: any) => {
        const r = g.row;
        const i = g.firstIndex;
        const usedKeys = new Set<string>();
        
        const getVal = (targetKeys: string[]) => {
          for (const k of targetKeys) {
            const foundKey = Object.keys(r).find(rk => {
              const normalized = rk.toLowerCase().replace(/[\s_]/g, "");
              return normalized === k || normalized.includes(k);
            });
            if (foundKey && r[foundKey]) {
              usedKeys.add(foundKey);
              return String(r[foundKey]);
            }
          }
          return "";
        };

        const phone = getVal(["phone", "mobile", "contact", "cell", "number"]);
        const id = getVal(["customerid", "clientid", "id", "sl", "serial"]) || phone || genClientId([...allClients]);
        
        // Map plan names to actual plan IDs
        const planAssignments = Object.entries(g.plans).map(([pName, count]) => {
          const matchedPlan = plans.find((p: any) => p.name.toLowerCase().includes(pName.toLowerCase()) || pName.toLowerCase().includes(p.name.toLowerCase()));
          return {
            planId: matchedPlan ? matchedPlan.id : (plans[0]?.id || "default"),
            shareCount: count
          };
        });

        const client: any = {
          id,
          name: getVal(["customername", "name", "fullname", "clientname"]),
          fatherHusband: getVal(["father", "husband", "parent", "guardian"]),
          birthDate: getVal(["birth", "dob", "dateofbirth"]),
          phone,
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

        const otherInfo: string[] = [];
        Object.keys(r).forEach(key => {
          if (!usedKeys.has(key) && r[key]) otherInfo.push(`${key}: ${r[key]}`);
        });
        if (otherInfo.length > 0) client.remarks = otherInfo.join(" | ");

        return client;
      });

      setImportData(mapped);
      setImportSheet(true);
    };
    reader.readAsArrayBuffer(file);
  };

  const newTpl = {
    __new: true, id: genClientId(allClients), name: "", fatherHusband: "", birthDate: "",
    phone: "", email: "", nid: "", plot: "", totalAmount: "", shareCount: 1, photo: "", projectId, password: "1234", remarks: ""
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">{t("client_info.title")}</h1>
          <p className="text-xs font-medium text-slate-500">{t("client_info.stats", { count: clients.length })}</p>
        </div>
        <div className="flex gap-2 no-print">
          <button 
            className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2" 
            onClick={() => window.print()}
          >
            <Printer size={14} /> {t("client_info.print")}
          </button>
          <button 
            className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2" 
            onClick={() => fileRef.current?.click()}
          >
            <FileUp size={14} /> {t("client_info.import")}
          </button>
          <button 
            className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm" 
            onClick={() => setEditClient(newTpl)}
          >
            {t("client_info.add_client")}
          </button>
        </div>
      </div>
      
      <input 
        ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" 
        onChange={e => { if (e.target.files?.[0]) parseFile(e.target.files[0]); e.target.value = ""; }} 
      />
      
      <div className="flex gap-2 mb-4 no-print">
        <input 
          className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" 
          placeholder={t("client_info.search_ph")} 
          value={search} onChange={e => setSearch(e.target.value)} 
        />
        <select 
          className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all"
          value={planFilter} onChange={e => setPlanFilter(e.target.value)}
        >
          <option value="all">All Plans</option>
          {plans.filter((p: any) => p.projectId === projectId).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      
      <div className="overflow-x-auto overflow-y-auto max-h-[60vh] rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="bg-slate-900 text-white p-3 text-center w-10 font-bold border-r border-white/10">SL</th>
              <th className="bg-slate-900 text-white p-3 w-12 font-bold border-r border-white/10">{t("client_info.photo")}</th>
              <th className="bg-slate-900 text-white p-3 text-left font-bold border-r border-white/10">{t("client_info.customer_id")}</th>
              <th className="bg-slate-900 text-white p-3 text-left font-bold border-r border-white/10">{t("client_info.name")}</th>
              <th className="bg-slate-900 text-white p-3 text-left font-bold border-r border-white/10">{t("client_info.father_husband")}</th>
              <th className="bg-slate-900 text-white p-3 text-left font-bold border-r border-white/10">{t("client_info.birth_date")}</th>
              <th className="bg-slate-900 text-white p-3 text-left font-bold border-r border-white/10">{t("client_info.phone")}</th>
              <th className="bg-slate-900 text-white p-3 text-left font-bold border-r border-white/10">{t("client_info.share_count")}</th>
              <th className="bg-slate-900 text-white p-3 text-left font-bold border-r border-white/10">{t("common.password")}</th>
              <th className="bg-slate-900 text-white p-3 text-left font-bold border-r border-white/10">{t("client_info.email")}</th>
              <th className="bg-slate-900 text-white p-3 text-left font-bold border-r border-white/10">{t("client_info.nid")}</th>
              <th className="bg-slate-900 text-white p-3 text-center font-bold no-print">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={11} className="text-center py-12 text-slate-400 font-bold">{t("client_info.no_clients")}</td></tr>
            )}
            {filtered.map((c: any, i: number) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                <td className="p-3 text-center text-slate-400 font-medium">{i + 1}</td>
                <td className="p-3"><ClientAvatar client={c} size={34} /></td>
                <td className="p-3"><span className="bg-slate-100 px-2 py-1 rounded-md font-mono text-[10px] font-bold text-slate-600">{c.id}</span></td>
                <td className="p-3 font-bold text-slate-900">{c.name || "—"}</td>
                <td className="p-3 text-slate-500 font-medium">{c.fatherHusband || "—"}</td>
                <td className="p-3 text-slate-500 font-medium whitespace-nowrap">{c.birthDate || "—"}</td>
                <td className="p-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-slate-900">{c.phone || "—"}</span>
                    <span className="text-[9px] text-slate-400 font-bold tracking-wider">USERNAME</span>
                  </div>
                </td>
                <td className="p-3">
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-bold text-[10px]">
                    {getTotalShares(c)} {t("client_info.shares")}
                  </span>
                </td>
                <td className="p-3"><PassCell value={c.password || "1234"} /></td>
                <td className="p-3 text-blue-600 font-medium">{c.email || "—"}</td>
                <td className="p-3"><span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-md font-mono text-[10px] font-bold">{c.nid || "—"}</span></td>
                <td className="p-3 no-print">
                  <div className="flex gap-1.5 justify-center">
                    <button className="w-7 h-7 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors" onClick={() => setViewClient(c)}><Eye size={14} /></button>
                    <button className="w-7 h-7 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:bg-slate-800 transition-colors" onClick={() => { const { __new, ...clean } = c; setEditClient(clean); }}><Edit2 size={14} /></button>
                    <button className="w-7 h-7 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center hover:bg-rose-200 transition-colors" onClick={() => setDeleteTarget(c)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium">
        {t("client_info.help_text")}
      </div>

      <AnimatePresence mode="wait">
        {viewClient && <ClientDetailSheet client={viewClient} onClose={() => setViewClient(null)} onEdit={(c: any) => { setViewClient(null); setEditClient({ ...c }); }} />}
        {editClient && <ClientEditSheet client={editClient} allClients={allClients} plans={plans} onSave={(c: any, oldId: string) => { if (c.__new) { onAddSingle(c); } else { onUpdate(c, oldId); } setEditClient(null); }} onClose={() => setEditClient(null)} />}
        {importSheet && importData && <ImportPreviewSheet data={importData} onConfirm={() => { onAddBulk(importData); setImportSheet(false); setImportData(null); }} onClose={() => { setImportSheet(false); setImportData(null); }} />}
        {deleteTarget && <ConfirmDelete message={<><b>{deleteTarget.name}</b> ({deleteTarget.id}){t("client_info.will_be_deleted")}</>} onConfirm={() => { onDelete(deleteTarget.id); setDeleteTarget(null); }} onClose={() => setDeleteTarget(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}

function ClientDetailSheet({ client, onClose, onEdit }: any) {
  const { t } = useLanguage();
  const [showPass, setShowPass] = useState(false);

  const totalShares = !client.planAssignments || client.planAssignments.length === 0 
    ? (client.shareCount || 1) 
    : client.planAssignments.reduce((sum: number, pa: any) => sum + (pa.shareCount || 0), 0);
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[400] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 pb-safe max-h-[90vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
        
        <div className="flex items-center gap-4 mb-6">
          <ClientAvatar client={client} size={64} />
          <div>
            <div className="text-xl font-black text-slate-900">{client.name}</div>
            <div className="text-sm font-medium text-slate-500 mt-1">{dotJoin(client.phone, client.plot)}</div>
          </div>
        </div>
        
        <div className="space-y-3 mb-6">
          {[
            [t("client_info.customer_id"), client.id], [t("client_info.name"), client.name], [t("client_info.father_husband"), client.fatherHusband], 
            [t("client_info.birth_date"), client.birthDate], [t("client_info.phone"), client.phone], [t("client_info.email"), client.email], 
            [t("client_info.nid"), client.nid], [t("client_info.plot"), client.plot], [t("client_info.total_amount"), BDT(client.totalAmount)],
            [t("client_info.share_count"), totalShares],
            [t("client_info.remarks"), client.remarks]
          ].map(([l, v]) => (
            <div key={l as string} className="flex items-center py-2 border-b border-slate-100 last:border-0">
              <span className="text-xs font-bold text-slate-400 w-32 shrink-0">{l}</span>
              <span className="text-sm font-bold text-slate-900 flex-1">{v || "—"}</span>
            </div>
          ))}
          <div className="flex items-center py-2 border-b border-slate-100 last:border-0">
            <span className="text-xs font-bold text-slate-400 w-32 shrink-0">Password</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold tracking-widest text-slate-900">{showPass ? client.password : "••••••"}</span>
              <button className="text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setShowPass(s => !s)}>
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 no-print">
          <button className="flex-1 bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2" onClick={() => onEdit(client)}><Edit2 size={16} /> Edit</button>
          <button className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2" onClick={() => window.print()}><Printer size={16} /> {t("client_info.print")}</button>
          <button className="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors" onClick={onClose}>{t("client_info.close")}</button>
        </div>
      </motion.div>
    </div>
  );
}

function ClientEditSheet({ client, allClients, plans, onSave, onClose }: any) {
  const { t } = useLanguage();
  const isNew = !!client.__new;
  const originalId = client.id;
  const [f, setF] = useState({ ...client, planAssignments: client.planAssignments || [] });
  const [idManuallyEdited, setIdManuallyEdited] = useState(false);
  const [preview, setPreview] = useState(client.photo || "");
  const [showPass, setShowPass] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  
  const s = (k: string, v: any) => {
    setF((p: any) => {
      const next = { ...p, [k]: v };
      // If it's a new client, phone is being updated, and ID hasn't been manually edited
      if (isNew && k === "phone" && !idManuallyEdited) {
        next.id = v || client.id; // Fallback to original generated ID if phone is cleared
      }
      return next;
    });
  };

  const handleIdChange = (v: string) => {
    setIdManuallyEdited(true);
    s("id", v);
  };
  
  const handlePhoto = (e: any) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader(); 
    r.onload = ev => { setPreview(ev.target?.result as string); s("photo", ev.target?.result as string); }; 
    r.readAsDataURL(file);
  };
  
  const idChanged = !isNew && f.id !== originalId;
  
  const submit = () => {
    if (!f.name) { alert(t("client_info.name_req")); return; }
    if (!f.id) { alert(t("client_info.id_req")); return; }
    if (isNew && allClients.find((c: any) => c.id === f.id)) { alert(t("client_info.id_exists")); return; }
    if (!isNew && idChanged && allClients.find((c: any) => c.id === f.id && c.id !== originalId)) { alert(t("client_info.id_exists_other")); return; }
    onSave({ ...f, totalAmount: parseFloat(f.totalAmount) || 0, shareCount: parseInt(f.shareCount) || 1, password: f.password || "1234", planAssignments: f.planAssignments }, originalId);
  };

  const addAssignment = () => {
    s("planAssignments", [...f.planAssignments, { planId: plans[0]?.id || "", shareCount: 1 }]);
  };

  const updateAssignment = (index: number, k: string, v: any) => {
    const next = [...f.planAssignments];
    next[index] = { ...next[index], [k]: v };
    s("planAssignments", next);
  };

  const removeAssignment = (index: number) => {
    s("planAssignments", f.planAssignments.filter((_: any, i: number) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[400] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 pb-safe max-h-[90vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
        <div className="text-xl font-black text-slate-900 mb-6">{isNew ? t("client_info.new_client") : t("client_info.update_client")}</div>
        
        <div className="flex items-center gap-4 mb-6">
          <div 
            className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-slate-50 shrink-0 hover:bg-slate-100 transition-colors" 
            onClick={() => photoRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <>
                <Camera size={20} className="text-slate-400 mb-1" />
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{t("client_info.photo")}</div>
              </>
            )}
          </div>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-900 truncate">{f.name || t("client_info.no_name")}</div>
            <div className="text-xs text-slate-500 font-medium">{f.id}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FG label="Customer ID">
              <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" value={f.id} onChange={e => handleIdChange(e.target.value)} />
            </FG>
            {idChanged && <div className="text-[10px] bg-indigo-50 text-indigo-700 rounded-lg p-2 -mt-2 mb-4 font-bold border border-indigo-100">🔄 <b>{originalId}</b> → <b>{f.id}</b><br/>{t("client_info.id_change_warn")}</div>}
          </div>
          <FG label={t("client_info.plot")}>
            <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" value={f.plot || ""} onChange={e => s("plot", e.target.value)} />
          </FG>
        </div>
        
        <FG label={t("client_info.name")}><input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" value={f.name || ""} onChange={e => s("name", e.target.value)} /></FG>
        <FG label={t("client_info.father_husband_name")}><input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" value={f.fatherHusband || ""} onChange={e => s("fatherHusband", e.target.value)} /></FG>
        
        <div className="grid grid-cols-2 gap-4">
          <FG label={t("client_info.birth_date_full")}><input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" type="date" value={f.birthDate || ""} onChange={e => s("birthDate", e.target.value)} /></FG>
          <FG label="Phone"><input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" value={f.phone || ""} onChange={e => s("phone", e.target.value)} /></FG>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FG label="Email"><input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" type="email" value={f.email || ""} onChange={e => s("email", e.target.value)} /></FG>
          <FG label="NID"><input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" value={f.nid || ""} onChange={e => s("nid", e.target.value)} /></FG>
        </div>

        <div className="mt-6 mb-2 text-sm font-bold text-slate-900">Plan Assignments</div>
        {f.planAssignments.map((pa: any, i: number) => (
          <div key={i} className="flex gap-2 mb-2">
            <select className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" value={pa.planId} onChange={e => updateAssignment(i, "planId", e.target.value)}>
              {plans.map((pl: any) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
            </select>
            <input className="w-20 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" type="number" value={pa.shareCount} onChange={e => updateAssignment(i, "shareCount", parseInt(e.target.value) || 0)} />
            <button className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100" onClick={() => removeAssignment(i)}><Trash2 size={16} /></button>
          </div>
        ))}
        <button className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm" onClick={addAssignment}>+ Add Plan</button>

        <FG label={t("client_info.remarks")}>
          <textarea 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all min-h-[80px]" 
            value={f.remarks || ""} 
            onChange={e => s("remarks", e.target.value)} 
            placeholder={t("client_info.remarks_ph")}
          />
        </FG>
        
        <div className="grid grid-cols-2 gap-4">
          <FG label={t("client_info.total_amount_bdt")}><input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" type="number" value={f.totalAmount} onChange={e => s("totalAmount", e.target.value)} /></FG>
          <FG label={t("client_info.share_count")}><input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" type="number" value={f.shareCount} onChange={e => s("shareCount", e.target.value)} /></FG>
        </div>
        
        <FG label="Password">
          <div className="relative">
            <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all pr-10" type={showPass ? "text" : "password"} value={f.password || ""} onChange={e => s("password", e.target.value)} />
            <button onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">{showPass ? "🙈" : "👁️"}</button>
          </div>
        </FG>
        
        <div className="flex gap-3 mt-4">
          <button className="flex-1 bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors" onClick={submit}>{isNew ? t("client_info.add") : t("client_info.update")}</button>
          <button className="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors" onClick={onClose}>{t("client_info.cancel")}</button>
        </div>
      </motion.div>
    </div>
  );
}

function ImportPreviewSheet({ data, onConfirm, onClose }: any) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[400] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 pb-safe max-h-[90vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
        <div className="text-xl font-black text-slate-900 mb-6">📥 {t("client_info.import_preview")} — {data.length} {t("client_info.clients_count")}</div>
        
        <div className="overflow-x-auto mb-4 border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold text-left">
                <th className="p-2 border-b border-slate-200">{t("client_info.row")}</th>
                <th className="p-2 border-b border-slate-200">ID</th>
                <th className="p-2 border-b border-slate-200">{t("client_info.name")}</th>
                <th className="p-2 border-b border-slate-200">{t("client_info.share_count")}</th>
                <th className="p-2 border-b border-slate-200">Phone</th>
                <th className="p-2 border-b border-slate-200">{t("client_info.remarks_col")}</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 15).map((r: any, i: number) => (
                <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="p-2 text-slate-400 font-medium">{r._row}</td>
                  <td className="p-2"><span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold text-slate-600">{r.id}</span></td>
                  <td className="p-2 font-bold text-slate-900">{r.name || <span className="text-rose-500">{t("client_info.empty")}</span>}</td>
                  <td className="p-2 text-slate-500 font-bold">{r.shareCount || 1}</td>
                  <td className="p-2 text-slate-500 font-medium">{r.phone || "—"}</td>
                  <td className="p-2 text-[10px] text-slate-400 italic truncate max-w-[100px]">{r.remarks || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {data.length > 15 && <div className="text-xs text-slate-400 font-bold text-center mb-4">{t("client_info.more_count", { count: data.length - 15 })}</div>}
        
        <div className="flex gap-3">
          <button className="flex-1 bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors" onClick={onConfirm}>{t("client_info.import_btn", { count: data.length })}</button>
          <button className="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors" onClick={onClose}>{t("client_info.cancel")}</button>
        </div>
      </motion.div>
    </div>
  );
}
