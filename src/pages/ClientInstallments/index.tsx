import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BDT, ac, todayStr, clientPaidForDef, cellStatus, cn } from "../../lib/utils";
import { ClientAvatar, PBar } from "../../components/Shared";
import { STATUS } from "../../lib/data";
import { ReceiptSheet } from "../../components/ProjectModals";
import { Clock, Loader2, AlertCircle, ChevronRight } from "lucide-react";
import { useLanguage } from "../../lib/i18n";
import { useAppStore } from "../../store/appStore";

export default function ClientInstallments() {
  const { t, lang } = useLanguage();
  const { auth, instDefs, payments, projects, plans, clients } = useAppStore();
  const client = clients.find(c => c.id === auth?.user.id);

  const [activePlanId, setActivePlanId] = useState<string>("all");
  const [viewModes, setViewModes] = useState<Record<string, "combined" | "shares">>({});
  const [payingId, setPayingId] = useState<string | null>(null);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [distMode, setDistMode] = useState<"equal" | "waterfall">("equal");

  if (!client) return null;

  const clientPlans = (client.planAssignments || []).map((pa: any) => plans.find((p: any) => p.id === pa.planId)).filter(Boolean);
  const hasMultiple = clientPlans.length > 1 || (client.planAssignments || []).some((pa: any) => (pa.shareCount || 1) > 1);
  
  const activePlan = activePlanId === "all" ? null : plans.find((p: any) => p.id === activePlanId);
  const prjDefs = activePlanId === "all"
    ? (() => {
        const defs: any[] = [];
        const globalSeen = new Set();
        
        // Add global installments once
        instDefs.filter((d: any) => d.projectId === client.projectId && d.isGlobal).forEach((d: any) => {
          if (!globalSeen.has(d.id)) {
            defs.push({ ...d, _shareCount: 1 });
            globalSeen.add(d.id);
          }
        });
        
        // Add plan-specific installments
        (client.planAssignments || []).forEach((pa: any) => {
          instDefs.filter((d: any) => d.planId === pa.planId && !d.isGlobal).forEach((d: any) => {
            defs.push({ ...d, _shareCount: pa.shareCount || 1 });
          });
        });
        
        return defs;
      })()
    : instDefs.filter((d: any) => d.planId === activePlanId || (d.projectId === client.projectId && d.isGlobal))
        .map(d => {
          const pa = client.planAssignments?.find((p: any) => p.planId === activePlanId);
          return { ...d, _shareCount: d.isGlobal ? 1 : (pa?.shareCount || 1) };
        });

  const totalPaid = payments.filter((p: any) => p.clientId === client.id && prjDefs.find((d: any) => d.id === p.instDefId) && p.status === "approved").reduce((s: number, p: any) => s + p.amount, 0);
  const totalTarget = prjDefs.reduce((s: number, d: any) => s + d.targetAmount * (d._shareCount || 1), 0);
  const currentShareCount = activePlanId === "all"
    ? (client.planAssignments || []).reduce((acc: number, pa: any) => acc + (pa.shareCount || 1), 0)
    : (client.planAssignments?.find((pa: any) => pa.planId === activePlanId)?.shareCount || client.shareCount || 1);

  const shareSlots = useMemo(() => {
    if (activePlanId !== "all") {
      const count = client.planAssignments?.find((pa: any) => pa.planId === activePlanId)?.shareCount || client.shareCount || 1;
      return Array.from({ length: count }).map((_, i) => ({
        planId: activePlanId,
        shareIndex: i,
        label: `${t('client_info.shares')} ${i + 1}`
      }));
    }
    
    return (client.planAssignments || []).flatMap((pa: any) => {
      const plan = plans.find((p: any) => p.id === pa.planId);
      const planName = plan?.name || "";
      return Array.from({ length: pa.shareCount || 1 }).map((_, i) => ({
        planId: pa.planId,
        shareIndex: i,
        label: `${planName} - ${t('client_info.shares')} ${i + 1}`
      }));
    });
  }, [activePlanId, client.planAssignments, client.shareCount, plans, t]);

  const today = todayStr();

  const viewMode = viewModes[activePlanId] || "combined";
  const setViewMode = (mode: "combined" | "shares") => {
    setViewModes(prev => ({ ...prev, [activePlanId]: mode }));
  };

  const showViewToggle = activePlanId === "all"
    ? (client.planAssignments || []).some((pa: any) => (pa.shareCount || 1) > 1)
    : (client.planAssignments?.find((pa: any) => pa.planId === activePlanId)?.shareCount || 1) > 1;

  const groupedDefs = useMemo(() => {
    if (activePlanId !== "all") return [{ id: activePlanId, name: activePlan?.name || "", defs: prjDefs }];
    
    const groups: Record<string, any[]> = {};
    prjDefs.forEach(d => {
      const key = d.isGlobal ? 'global' : (d.planId || 'other');
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });
    
    return Object.entries(groups).map(([id, defs]) => {
      const plan = plans.find((p: any) => p.id === id);
      return {
        id,
        name: id === 'global' ? (t('common.basic_payments') || "Basic Payments") : (plan?.name || ""),
        defs
      };
    });
  }, [activePlanId, prjDefs, activePlan, plans, t]);

  const isProcessingPayment = paymentResult && (!instDefs.find((d: any) => d.id === paymentResult.instDefId) || !projects.find((p: any) => p.id === activePlan?.projectId));

  useEffect(() => {
    if (!activePlanId && clientPlans.length > 0) {
      setActivePlanId("all");
    }
  }, [clientPlans, activePlanId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const transactionId = params.get("transactionId");
    
    if (payment === "success" && transactionId) {
      // Verify payment exists in Firestore
      const realPayment = payments.find(
        p => p.id === transactionId && p.clientId === client.id
      );
      
      if (realPayment) {
        setPaymentResult(realPayment);
      } else {
        setErrorMsg("Payment verification failed");
      }
      window.history.replaceState({}, document.title, 
        window.location.pathname);
    } else if (payment === "failed") {
      setErrorMsg(t('common.payment_failed_msg') || 
        "Payment failed or was cancelled.");
      window.history.replaceState({}, document.title, 
        window.location.pathname);
      setTimeout(() => setErrorMsg(null), 5000);
    }
  }, [client.id, payments, t]);

  if (isProcessingPayment) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-app-text-muted animate-spin" />
        <div className="text-app-text-secondary font-bold">{t('common.loading_payment_data') || "Processing payment details..."}</div>
      </div>
    );
  }

  const handlePayment = async (d: any, amount: number) => {
    setPayingId(d.id);
    try {
      const response = await fetch('/api/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount, 
          installmentId: d.id, 
          clientId: client.id, 
          clientName: client.name,
          clientEmail: client.email,
          clientPhone: client.phone,
          installmentNumber: d.title
        })
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid server response: ${text.substring(0, 100)}`);
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMsg(t('common.payment_init_error') || "Failed to initiate payment. Please try again later.");
        setPayingId(null);
      }
    } catch (error) {
      setErrorMsg(t('common.payment_init_error') || "Failed to initiate payment. Please try again later.");
      setPayingId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      {/* Client Info Card */}
      <div className="bg-app-surface rounded-3xl border border-app-border p-6 flex flex-col gap-4 mb-4 shadow-sm transition-colors relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-app-tab-active/5 rounded-full -mr-12 -mt-12 blur-xl" />
        
        <div className="flex items-center gap-4 relative z-10">
          <ClientAvatar client={client} size={64} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-app-text-muted uppercase tracking-widest mb-1">
              {t('common.welcome_back') || "Welcome Back"}
            </div>
            <div className="text-2xl font-black text-app-text-primary truncate leading-tight">{client.name}</div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              <div className="flex flex-wrap gap-1.5">
                {(client.planAssignments || []).map((pa: any, i: number) => {
                  const plan = plans.find((p: any) => p.id === pa.planId);
                  return (
                    <span key={pa.planId} className="inline-flex items-center px-2 py-0.5 rounded-md bg-app-bg border border-app-border text-[10px] font-black text-app-text-secondary uppercase tracking-tight">
                      {plan?.name} ({pa.shareCount || 1} {t('client_info.shares')})
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Selection Tabs - Only show if multiple plans exist */}
      {clientPlans.length > 1 && (
        <div className="flex bg-app-bg p-1 rounded-xl mb-6 overflow-x-auto scrollbar-hide transition-colors border border-app-border">
          <button 
            className={cn(
              "py-2.5 px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-1", 
              activePlanId === "all" ? "bg-app-tab-active text-app-bg shadow-sm" : "text-app-tab-inactive hover:text-app-text-primary"
            )} 
            onClick={() => setActivePlanId("all")}
          >
            {t('common.all_plans') || "All Plans"}
          </button>
          {clientPlans.map((pl: any) => (
            <button 
              key={pl.id} 
              className={cn(
                "py-2.5 px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-1", 
                activePlanId === pl.id ? "bg-app-tab-active text-app-bg shadow-sm" : "text-app-tab-inactive hover:text-app-text-primary"
              )} 
              onClick={() => setActivePlanId(pl.id)}
            >
              {pl.name}
            </button>
          ))}
        </div>
      )}

      {/* Global Summary Card */}
      <div className="bg-app-surface-elevated rounded-3xl p-6 mb-6 text-app-text-primary shadow-xl relative overflow-hidden border border-app-border">
        <div className="absolute top-0 right-0 w-32 h-32 bg-app-tab-active/5 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 rounded-full -ml-12 -mb-12 blur-xl" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold text-app-text-muted uppercase tracking-widest">
              {activePlanId === "all" 
                ? (clientPlans.length > 1 ? (t('common.all_total_summary') || "All Plans Summary") : (clientPlans[0]?.name || "Plan Summary"))
                : (activePlan?.name || "Plan Summary")}
            </div>
            <div className="bg-app-bg px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter text-app-text-secondary border border-app-border">
              {activePlanId === "all" 
                ? (clientPlans.length > 1 ? `${clientPlans.length} ${t('common.plans') || "Plans"}` : `${currentShareCount} ${t('client_info.shares') || "Shares"}`)
                : `${currentShareCount} ${t('client_info.shares') || "Shares"}`}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-[10px] text-app-text-muted font-bold uppercase mb-1">{t('common.total_target') || "Total Target"}</div>
              <div className="text-xl font-black">{BDT(totalTarget, lang === 'bn')}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-app-text-muted font-bold uppercase mb-1">{t('common.total_paid') || "Total Paid"}</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{BDT(totalPaid, lang === 'bn')}</div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between items-end mb-2">
              <div className="text-[10px] text-app-text-muted font-bold uppercase">{t('common.overall_progress') || "Overall Progress"}</div>
              <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">{Math.round((totalPaid / totalTarget) * 100) || 0}%</div>
            </div>
            <div className="h-2 bg-app-bg rounded-full overflow-hidden border border-app-border">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(totalPaid / totalTarget) * 100 || 0}%` }}
                className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              />
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-app-border flex justify-between items-center">
            <div className="text-[10px] text-app-text-muted font-bold uppercase">{t('common.total_due') || "Total Due"}</div>
            <div className="text-lg font-black text-rose-600 dark:text-rose-400">{BDT(Math.max(0, totalTarget - totalPaid), lang === 'bn')}</div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle - Only show if current view has multiple shares */}
      {showViewToggle && (
        <div className="space-y-3 mb-6">
          <div className="flex bg-app-bg p-1 rounded-xl border border-app-border">
            <button 
              className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all", viewMode === "combined" ? "bg-app-tab-active text-app-bg shadow-sm" : "text-app-tab-inactive hover:text-app-text-primary")}
              onClick={() => setViewMode("combined")}
            >
              {t('client.view_combined')}
            </button>
            <button 
              className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all", viewMode === "shares" ? "bg-app-tab-active text-app-bg shadow-sm" : "text-app-tab-inactive hover:text-app-text-primary")}
              onClick={() => setViewMode("shares")}
            >
              {t('client.view_per_share')}
            </button>
          </div>

          {viewMode === "shares" && (
            <div className="flex justify-center">
              <div className="inline-flex bg-app-surface p-1 rounded-lg border border-app-border">
                <button 
                  onClick={() => setDistMode("equal")}
                  className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all", distMode === "equal" ? "bg-app-tab-active text-app-bg shadow-sm" : "text-app-text-muted hover:text-app-text-primary")}
                >
                  {t('client.dist_equal')}
                </button>
                <button 
                  onClick={() => setDistMode("waterfall")}
                  className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all", distMode === "waterfall" ? "bg-app-tab-active text-app-bg shadow-sm" : "text-app-text-muted hover:text-app-text-primary")}
                >
                  {t('client.dist_waterfall')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {prjDefs.length === 0 && (
        <div className="text-center py-12 bg-app-surface rounded-3xl border border-app-border text-app-text-muted font-bold text-sm">
          {t('common.no_installments')}
        </div>
      )}

      <div className="space-y-6">
        {viewMode === "combined" ? (
          <div className="space-y-8">
            {groupedDefs.map((group) => {
              const showBox = activePlanId === "all" && clientPlans.length > 1;
              return (
                <div key={group.id} className={cn(showBox ? "bg-app-surface/50 rounded-3xl border border-app-border p-2 shadow-sm" : "")}>
                  {!showBox && activePlanId === "all" && (
                    <div className="mb-2 px-3 py-1 bg-app-bg rounded-lg text-[10px] font-black text-app-text-muted inline-block uppercase tracking-wider border border-app-border">
                      {group.name}
                    </div>
                  )}
                  <div className={cn(showBox ? "flex flex-col md:flex-row gap-2" : "space-y-3")}>
                    {/* Plan Label - Vertical style (only for All Plans with multiple plans) */}
                    {showBox && (
                      <div className="md:w-12 flex md:flex-col items-center justify-center bg-app-tab-active text-app-bg rounded-2xl py-4 px-2 shadow-md shrink-0">
                        <div className="md:-rotate-90 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em]">
                          {group.name}
                        </div>
                      </div>
                    )}

                    {/* Installments Container (Scrollable only for All Plans with multiple plans) */}
                    <div className={cn("flex-1 p-2 space-y-3", showBox ? "max-h-[480px] overflow-y-auto custom-scrollbar" : "")}>
                      {group.defs.map((d: any) => {
                        const paid = clientPaidForDef(client.id, d.id, payments);
                        const pendingAmt = payments.filter((p: any) => p.clientId === client.id && p.instDefId === d.id && p.status === "pending").reduce((s: number, p: any) => s + p.amount, 0);
                        const target = d.targetAmount * (d._shareCount || 1);
                        const st = cellStatus(paid, target);
                        const isDue = d.dueDate && d.dueDate < today && paid < target;
                        const m = STATUS[st];

                        return (
                          <div key={d.id} className="bg-app-surface rounded-2xl border border-app-border p-5 shadow-sm relative overflow-hidden transition-colors">
                            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", m.dot)} />
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <div className="text-base font-black text-app-text-primary">
                                  {d.title}
                                  {d.isGlobal && hasMultiple && (
                                    <span className="ml-2 text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                                      {t('common.global_payment_note')}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-app-text-secondary font-medium">{t('common.due')}: {d.dueDate || "—"}</span>
                                  {isDue && <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md px-2 py-0.5 text-[10px] font-bold flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Due</span>}
                                </div>
                              </div>
                              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", m.bg, m.text)}>
                                {st === "paid" ? t('common.status.paid') : st === "partial" ? t('common.status.partial') : t('common.status.unpaid')}
                              </span>
                            </div>
                            
                            <PBar paid={paid} target={target} />
                            
                            {target - paid > 0 && (
                              <div className="mt-3 pt-3 border-t border-app-border">
                                {activePaymentId === d.id ? (
                                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-app-text-muted uppercase tracking-wider">{t('common.payment_amount')}</span>
                                      <button 
                                        onClick={() => setActivePaymentId(null)}
                                        className="text-xs text-app-text-muted hover:text-app-text-secondary underline"
                                      >
                                        {t('common.cancel')}
                                      </button>
                                    </div>
                                    <div className="flex gap-2">
                                      <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted font-bold">৳</span>
                                        <input
                                          type="number"
                                          value={customAmount}
                                          onChange={(e) => setCustomAmount(e.target.value)}
                                          className="w-full pl-8 pr-3 py-2 bg-app-bg border border-app-border rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all text-app-text-primary"
                                          placeholder="0.00"
                                          autoFocus
                                        />
                                      </div>
                                      <button 
                                        disabled={!!payingId || !customAmount || parseFloat(customAmount) <= 0}
                                        className="bg-app-tab-active text-app-bg text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                                        onClick={() => handlePayment(d, parseFloat(customAmount))}
                                      >
                                        {payingId === d.id ? <Loader2 size={14} className="animate-spin" /> : t('common.confirm_pay')}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center">
                                    <div className="text-sm font-bold text-rose-600 dark:text-rose-400">{t('common.due')}: {BDT(target - paid, lang === 'bn')}</div>
                                    <button 
                                      disabled={!!payingId}
                                      className="bg-app-tab-active text-app-bg text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 disabled:opacity-50"
                                      onClick={() => {
                                        setActivePaymentId(d.id);
                                        setCustomAmount((target - paid).toString());
                                      }}
                                    >
                                      {t('common.pay_now')}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                            {pendingAmt > 0 && (
                              <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                <Clock size={14} /> {t('common.pending_approval_amount', { amount: BDT(pendingAmt, lang === 'bn') })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-8">
            {shareSlots.map((slot, j) => (
              <div key={j} className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-6 h-6 bg-app-tab-active text-app-bg rounded-lg flex items-center justify-center text-[10px] font-black">{j + 1}</div>
                  <div className="text-xs font-black text-app-text-primary uppercase tracking-widest">{slot.label}</div>
                </div>
                <div className="space-y-2">
                  {prjDefs.filter((d: any) => d.isGlobal || (d.planId === slot.planId && (d._shareCount || 1) >= slot.shareIndex + 1)).map((d: any) => {
                    const totalPaidForDef = clientPaidForDef(client.id, d.id, payments);
                    const sCount = d._shareCount || 1;
                    const sharePaid = d.isGlobal 
                      ? Math.min(d.targetAmount, totalPaidForDef)
                      : (distMode === "waterfall" 
                          ? Math.min(d.targetAmount, Math.max(0, totalPaidForDef - slot.shareIndex * d.targetAmount))
                          : Math.min(d.targetAmount, totalPaidForDef / sCount));
                    const st = cellStatus(sharePaid, d.targetAmount);
                    const m = STATUS[st];
                    const isDue = d.dueDate && d.dueDate < today && sharePaid < d.targetAmount;
                    
                    return (
                      <div key={`${d.id}-${j}`} className="bg-app-surface rounded-2xl border border-app-border p-5 shadow-sm relative overflow-hidden transition-colors">
                        <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", m.dot)} />
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="text-base font-black text-app-text-primary">
                              {d.title}
                              {d.isGlobal && hasMultiple && (
                                <span className="ml-2 text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                                  {t('common.global_payment_note')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-app-text-secondary font-medium">{t('common.due')}: {d.dueDate || "—"}</span>
                              {isDue && <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md px-2 py-0.5 text-[10px] font-bold flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Due</span>}
                            </div>
                          </div>
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", m.bg, m.text)}>
                            {st === "paid" ? t('common.status.paid') : st === "partial" ? t('common.status.partial') : t('common.status.unpaid')}
                          </span>
                        </div>
                        
                        <PBar paid={sharePaid} target={d.targetAmount} />
                        
                        {d.targetAmount - sharePaid > 0 && (
                          <div className="mt-3 pt-3 border-t border-app-border">
                            {activePaymentId === `${d.id}-${j}` ? (
                              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-app-text-muted uppercase tracking-wider">{t('common.payment_amount')}</span>
                                  <button 
                                    onClick={() => setActivePaymentId(null)}
                                    className="text-xs text-app-text-muted hover:text-app-text-secondary underline"
                                  >
                                    {t('common.cancel')}
                                  </button>
                                </div>
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted font-bold">৳</span>
                                    <input
                                      type="number"
                                      value={customAmount}
                                      onChange={(e) => setCustomAmount(e.target.value)}
                                      className="w-full pl-8 pr-3 py-2 bg-app-bg border border-app-border rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all text-app-text-primary"
                                      placeholder="0.00"
                                      autoFocus
                                    />
                                  </div>
                                  <button 
                                    disabled={!!payingId || !customAmount || parseFloat(customAmount) <= 0}
                                    className="bg-app-tab-active text-app-bg text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                                    onClick={() => handlePayment(d, parseFloat(customAmount))}
                                  >
                                    {payingId === d.id ? <Loader2 size={14} className="animate-spin" /> : t('common.confirm_pay')}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <div className="text-sm font-bold text-rose-600 dark:text-rose-400">{t('common.due')}: {BDT(d.targetAmount - sharePaid, lang === 'bn')}</div>
                                <button 
                                  disabled={!!payingId}
                                  className="bg-app-tab-active text-app-bg text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 disabled:opacity-50"
                                  onClick={() => {
                                    setActivePaymentId(`${d.id}-${j}`);
                                    setCustomAmount((d.targetAmount - sharePaid).toString());
                                  }}
                                >
                                  {t('common.pay_now')}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-4 right-4 z-[500] bg-rose-50 border border-rose-200 p-4 rounded-2xl shadow-lg flex items-center gap-3 text-rose-700 font-bold text-sm"
          >
            <AlertCircle size={20} />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {paymentResult && (
          <ReceiptSheet 
            payment={paymentResult} 
            instDef={instDefs.find((d: any) => d.id === paymentResult.instDefId)} 
            client={client} 
            project={projects.find((p: any) => p.id === client.projectId)} 
            hideOfficeCopy={true} 
            onClose={() => setPaymentResult(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
