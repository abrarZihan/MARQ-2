import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BDT, cn } from "../../lib/utils";
import { ReceiptSheet } from "../../components/ProjectModals";
import { FileText, ChevronRight, Clock } from "lucide-react";
import { useLanguage } from "../../lib/i18n";
import { useAppStore } from "../../store/appStore";

import { Payment, Client, InstDef, Project } from "../../types";

export default function ClientReceipts() {
  const { t, lang } = useLanguage();
  const { auth, instDefs, payments, projects, clients } = useAppStore();
  const client = clients.find(c => c.id === auth?.user.id) as Client;
  
  const [viewR, setViewR] = useState<Payment | null>(null);

  if (!client) return null;

  const myPays = [...payments.filter((p: Payment) => p.clientId === client.id && p.status === "approved")].sort((a, b) => b.date.localeCompare(a.date));
  const pendingPays = payments.filter((p: Payment) => p.clientId === client.id && p.status === "pending");
  const project = projects.find((p: Project) => p.id === client.projectId);

  const hasMultiple = (client.planAssignments || []).length > 1 || (client.planAssignments || []).some(pa => (pa.shareCount || 1) > 1);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-app-text-primary">{t('common.receipts')}</h1>
          <p className="text-xs font-medium text-app-text-secondary">{t('common.approved_count', { count: myPays.length })}</p>
        </div>
      </div>

      {pendingPays.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
          <Clock size={16} /> {t('common.pending_approval_count', { count: pendingPays.length })}
        </div>
      )}

      {myPays.length === 0 ? (
        <div className="text-center py-16 bg-app-surface rounded-3xl border border-app-border text-app-text-muted font-bold text-sm">
          {t('common.no_approved_payments')}
        </div>
      ) : (
        <div className="space-y-3">
          {myPays.map((p: Payment, i: number) => {
            const def = instDefs.find((d: InstDef) => d.id === p.instDefId);
            return (
              <motion.div 
                whileHover={{ scale: 0.98, y: -2 }} whileTap={{ scale: 0.95 }}
                key={`${p.id}-${i}`} 
                className="bg-app-surface rounded-3xl border border-app-border p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden cursor-pointer group"
                onClick={() => setViewR(p)}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 group-hover:w-2 transition-all" />
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-app-bg rounded-xl flex items-center justify-center text-app-text-muted group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors border border-app-border">
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="text-[10px] text-app-text-muted font-mono font-bold tracking-widest uppercase mb-0.5">{p.id ? (p.id.split('-')[1] || p.id) : ""}</div>
                      <div className="text-base font-black text-app-text-primary leading-tight">
                        {def?.title || t('common.installment')}
                      </div>
                    </div>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t('common.approved')}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10px] text-app-text-muted font-bold uppercase tracking-widest mb-1">{t('common.amount_paid')}</div>
                    <div className="text-2xl font-black text-app-text-primary tracking-tighter">{BDT(p.amount, lang === 'bn')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-app-text-secondary font-bold mb-2">{p.date}</div>
                    <div className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-black uppercase tracking-wider group-hover:gap-2 transition-all">
                      {t('common.receipt_link')} <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence mode="wait">
        {viewR && <ReceiptSheet payment={viewR} instDef={instDefs.find((d: InstDef) => d.id === viewR.instDefId)} client={client} project={project} isSuperAdmin={false} onClose={() => setViewR(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}
