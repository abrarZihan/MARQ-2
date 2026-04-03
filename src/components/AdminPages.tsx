import { useState, useRef } from "react";
import { useLanguage } from "../lib/i18n";
import { motion, AnimatePresence } from "motion/react";
import { BDT, BDTshort, ac, initials, uid, todayStr, cn } from "../lib/utils";
import { FG, ConfirmDelete } from "./Shared";
import { Eye, EyeOff, ShieldPlus, KeyRound, Trash2, ShieldMinus, Search, Receipt } from "lucide-react";
import { ReceiptSheet } from "./ProjectModals";

export function AdminProfile({ admin, onUpdate }: any) {
  const { t } = useLanguage();
  if (!admin) return null;
  const [old, setOld] = useState("");
  const [nw, setNw] = useState("");
  const [conf, setConf] = useState("");
  const [showO, setShowO] = useState(false);
  const [showN, setShowN] = useState(false);
  const [msg, setMsg] = useState<any>(null);
  
  const color = admin.role === "superadmin" ? "#f59e0b" : ac(admin.id);
  
  const save = () => {
    setMsg(null);
    if (!old) return setMsg({ t: "e", v: t('common.error_enter_current_pw') });
    if (old !== admin.password) return setMsg({ t: "e", v: t('common.error_wrong_current_pw') });
    if (!nw || nw.length < 4) return setMsg({ t: "e", v: t('common.error_min_chars', { count: 4 }) });
    if (nw !== conf) return setMsg({ t: "e", v: t('common.error_pw_mismatch') });
    onUpdate(nw, false);
    setOld(""); setNw(""); setConf("");
    setMsg({ t: "s", v: t('common.success_pw_changed') });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-5">
          <div 
            style={{ backgroundColor: color + "20", color }} 
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black shrink-0"
          >
            {initials(admin.name)}
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{admin.name}</div>
            <div className="text-sm font-bold text-slate-500 mt-1">@{admin.username}</div>
            <span className={cn(
              "px-3 py-1 rounded-lg text-xs font-bold inline-block mt-3",
              admin.role === "superadmin" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
            )}>
              {admin.role === "superadmin" ? t('common.super_admin') : t('common.admin')}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
            <KeyRound size={20} />
          </div>
          <h2 className="text-lg font-black text-slate-900">{t('common.change_password')}</h2>
        </div>
        
        <FG label={t('common.current_password')}>
          <div className="relative">
            <input 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all pr-12" 
              type={showO ? "text" : "password"} 
              value={old} onChange={e => setOld(e.target.value)} 
            />
            <button onClick={() => setShowO(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
              {showO ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </FG>
        
        <FG label={t('common.new_password')}>
          <div className="relative">
            <input 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all pr-12" 
              type={showN ? "text" : "password"} 
              value={nw} onChange={e => setNw(e.target.value)} 
            />
            <button onClick={() => setShowN(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
              {showN ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </FG>
        
        <FG label={t('common.confirm_password')}>
          <input 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" 
            type="password" 
            value={conf} onChange={e => setConf(e.target.value)} 
          />
        </FG>
        
        <AnimatePresence>
          {msg && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <div className={cn(
                "p-4 rounded-xl mb-6 text-sm font-bold border",
                msg.t === "s" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
              )}>
                {msg.v}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors mt-2" onClick={save}>
          {t('common.change_password')}
        </button>
      </div>
    </motion.div>
  );
}


export function AdminPaymentsPage({ payments, clients, instDefs, projects }: any) {
  const { t } = useLanguage();
  const [selPay, setSelPay] = useState<any>(null);
  const [search, setSearch] = useState("");

  const filtered = payments
    .filter((p: any) => p.status === "approved")
    .filter((p: any) => {
      const c = clients.find((cl: any) => cl.id === p.clientId);
      const d = instDefs.find((di: any) => di.id === p.instDefId);
      const prj = projects.find((pr: any) => pr.id === c?.projectId);
      const s = search.toLowerCase();
      return (
        c?.name?.toLowerCase().includes(s) ||
        c?.id?.toLowerCase().includes(s) ||
        d?.title?.toLowerCase().includes(s) ||
        prj?.name?.toLowerCase().includes(s)
      );
    })
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      <div className="mb-6">
        <h1 className="text-xl font-black text-slate-900">{t('nav.payments')}</h1>
        <p className="text-xs font-medium text-slate-500">{t('project_modals.payment_record')}</p>
      </div>

      <div className="relative mb-6">
        <input 
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-slate-400 shadow-sm" 
          placeholder={t('client_info.search_ph')}
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          <Search size={18} />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((p: any) => {
          const c = clients.find((cl: any) => cl.id === p.clientId);
          const d = instDefs.find((di: any) => di.id === p.instDefId);
          const prj = projects.find((pr: any) => pr.id === c?.projectId);
          
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-extrabold text-slate-900">{c?.name || p.clientId}</div>
                <div className="text-xs font-bold text-slate-400">{p.date}</div>
              </div>
              <div className="text-right shrink-0">
                <button 
                  className="flex items-center gap-1.5 text-xs font-black text-blue-600 hover:text-blue-700 underline uppercase tracking-wider"
                  onClick={() => setSelPay(p)}
                >
                  <span className="text-sm">🧾</span>
                  {t('modal.receipt') || 'রসিদ'}
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 border-dashed">
            <div className="text-slate-300 mb-2 flex justify-center"><Receipt size={48} /></div>
            <div className="text-sm font-bold text-slate-400">{t('project_detail.no_activity')}</div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selPay && (
          <ReceiptSheet 
            payment={selPay} 
            client={clients.find((c: any) => c.id === selPay.clientId)} 
            project={projects.find((pr: any) => pr.id === clients.find((c: any) => c.id === selPay.clientId)?.projectId)}
            instDef={instDefs.find((d: any) => d.id === selPay.instDefId)}
            onClose={() => setSelPay(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function AdminManagePage({ admins, onAdd, onDelete, onResetPw, currentAdminId }: any) {
  const { t } = useLanguage();
  const [addModal, setAddModal] = useState(false);
  const [resetTarget, setReset] = useState<any>(null);
  const [delTarget, setDel] = useState<any>(null);
  const [tempPw, setTempPw] = useState("");
  const [newF, setNewF] = useState({ name: "", username: "", password: "" });
  
  const s = (k: string, v: string) => setNewF(p => ({ ...p, [k]: v }));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-slate-900">{t('common.admin_management')}</h1>
          <p className="text-xs font-medium text-slate-500">{t('common.admins_count', { count: admins.length })}</p>
        </div>
        <button 
          className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2" 
          onClick={() => setAddModal(true)}
        >
          <ShieldPlus size={18} />
          {t('common.add_admin')}
        </button>
      </div>

      <div className="space-y-3">
        {admins.map((adm: any) => {
          const isSelf = adm.id === currentAdminId;
          const isSuper = adm.role === "superadmin";
          const color = isSuper ? "#f59e0b" : ac(adm.id);
          
          return (
            <div key={adm.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
              <div 
                style={{ backgroundColor: color + "20", color }} 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0"
              >
                {initials(adm.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-base font-extrabold text-slate-900">{adm.name}</span>
                  {isSelf && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700">{t('common.you')}</span>}
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold",
                    isSuper ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                  )}>
                    {isSuper ? t('common.super_admin') : t('common.admin')}
                  </span>
                  {adm.isTemp && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-orange-600">{t('common.temp_pw')}</span>}
                </div>
                <div className="text-xs font-bold text-slate-400">@{adm.username}</div>
              </div>
              {!isSuper && (
                <div className="flex gap-2">
                  <button 
                    className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center hover:bg-orange-100 transition-colors" 
                    onClick={() => { setReset(adm); setTempPw(""); }}
                  >
                    <KeyRound size={18} />
                  </button>
                  {!isSelf && (
                    <button 
                      className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-100 transition-colors" 
                      onClick={() => setDel(adm)}
                    >
                      <ShieldMinus size={18} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

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
              <div className="text-xl font-black text-slate-900 mb-6">{t('common.new_admin_title')}</div>
              
              <FG label={t('common.full_name')}>
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" value={newF.name} onChange={e => s("name", e.target.value)} />
              </FG>
              <div className="grid grid-cols-2 gap-4">
                <FG label={t('common.username')}>
                  <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" value={newF.username} onChange={e => s("username", e.target.value)} />
                </FG>
                <FG label={t('common.temp_password')}>
                  <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" value={newF.password} onChange={e => s("password", e.target.value)} />
                </FG>
              </div>
              
              <div className="flex gap-3 mt-4">
                <button 
                  className="flex-1 bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors" 
                  onClick={() => {
                    if (!newF.name || !newF.username || !newF.password) { alert(t('common.error_fill_all')); return; }
                    onAdd({ id: uid("adm-"), name: newF.name, username: newF.username, password: newF.password, role: "admin", isTemp: true });
                    setAddModal(false); setNewF({ name: "", username: "", password: "" });
                  }}
                >
                  {t('common.add_button')}
                </button>
                <button className="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors" onClick={() => setAddModal(false)}>{t('common.cancel')}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {resetTarget && (
          <div className="fixed inset-0 bg-slate-900/60 z-[300] flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={() => setReset(null)}>
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 pb-safe" 
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
              <div className="text-xl font-black text-slate-900 mb-6">{t('common.reset_password_title', { name: resetTarget.name })}</div>
              
              <FG label={t('common.new_temp_password')}>
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" value={tempPw} onChange={e => setTempPw(e.target.value)} />
              </FG>
              
              <div className="flex gap-3 mt-4">
                <button 
                  className="flex-1 bg-orange-100 text-orange-700 font-bold py-3.5 rounded-xl hover:bg-orange-200 transition-colors" 
                  onClick={() => {
                    if (!tempPw) { alert(t('common.error_enter_pw')); return; }
                    onResetPw(resetTarget.id, tempPw);
                    setReset(null);
                  }}
                >
                  {t('common.reset_button')}
                </button>
                <button className="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors" onClick={() => setReset(null)}>{t('common.cancel')}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {delTarget && (
          <ConfirmDelete 
            message={<div dangerouslySetInnerHTML={{ __html: t('common.delete_admin_confirm', { name: delTarget.name, username: delTarget.username }) }} />} 
            onConfirm={() => { onDelete(delTarget.id); setDel(null); }} 
            onClose={() => setDel(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
