import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BDT, ac, initials, todayStr, clientPaidForDef, cellStatus, cn, tsNow } from "../lib/utils";
import { FG, ClientAvatar, PBar, CategoryIcon, CategoryColor } from "./Shared";
import { STATUS } from "../lib/data";
import { ReceiptSheet } from "./ProjectModals";
import { Eye, EyeOff, Building2, CheckCircle2, Clock, KeyRound, FileText, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { useLanguage } from "../lib/i18n";

export function ClientInstallments({ client, instDefs, payments, projects, plans }: any) {
  const { t, lang } = useLanguage();
  const [activePlanId, setActivePlanId] = useState<string>("all");
  const [viewModes, setViewModes] = useState<Record<string, "combined" | "shares">>({});
  const [payingId, setPayingId] = useState<string | null>(null);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [distMode, setDistMode] = useState<"equal" | "waterfall">("equal");

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
  const color = ac(client.id);

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
    const amount = params.get("amount");
    const installmentNumber = params.get("installmentNumber");
    const installmentId = params.get("installmentId");

    if (payment === "success" && transactionId) {
      setPaymentResult({
        id: transactionId,
        amount: parseFloat(amount || "0"),
        date: todayStr(),
        instDefId: installmentId,
        clientId: client.id,
        status: "approved",
        note: `Online Payment - Installment ${installmentNumber}`
      });
      // Clear URL params without refreshing
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (payment === "failed") {
      setErrorMsg(t('common.payment_failed_msg') || "Payment failed or was cancelled. Please try again.");
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setErrorMsg(null), 5000);
    }
  }, [client.id, t]);

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
      console.log('Initiating payment for installment:', d.id, 'amount:', amount);
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
      
      console.log('Payment initiation response status:', response.status);
      const text = await response.text();
      console.log('Payment initiation response text:', text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse JSON. Response text:", text);
        throw new Error(`Invalid server response: ${text.substring(0, 100)}`);
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Payment initiation failed:', data);
        setErrorMsg(t('common.payment_init_error') || "Failed to initiate payment. Please try again later.");
        setPayingId(null);
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
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

      <AnimatePresence>
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

export function ClientReceipts({ client, instDefs, payments, projects }: any) {
  const { t, lang } = useLanguage();
  const [viewR, setViewR] = useState<any>(null);
  const myPays = [...payments.filter((p: any) => p.clientId === client.id && p.status === "approved")].sort((a, b) => b.date.localeCompare(a.date));
  const pendingPays = payments.filter((p: any) => p.clientId === client.id && p.status === "pending");
  const project = projects.find((p: any) => p.id === client.projectId);

  const hasMultiple = (client.planAssignments || []).length > 1 || (client.planAssignments || []).some((pa: any) => (pa.shareCount || 1) > 1);

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
          {myPays.map((p: any, i: number) => {
            const def = instDefs.find((d: any) => d.id === p.instDefId);
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
                        {def?.isGlobal && hasMultiple && (
                          <div className="text-[9px] font-bold text-blue-500 uppercase tracking-tight mt-0.5">
                            {t('common.global_payment_note')}
                          </div>
                        )}
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
        {viewR && <ReceiptSheet payment={viewR} instDef={instDefs.find((d: any) => d.id === viewR.instDefId)} client={client} project={project} hideOfficeCopy={true} onClose={() => setViewR(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}

export function ClientExpenses({ client, expenses }: any) {
  const { t, lang } = useLanguage();
  const [selExp, setSelExp] = useState<any>(null);
  const prjExpenses = expenses.filter((e: any) => e.projectId === client.projectId);
  const total = prjExpenses.reduce((s: number, e: any) => s + e.amount, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      <div className="mb-6">
        <h1 className="text-xl font-black text-app-text-primary">{t('common.project_expenses')}</h1>
      </div>

      <div className="bg-app-surface rounded-3xl border border-app-border p-6 mb-6 shadow-sm flex items-center gap-5 transition-colors">
        <div className="w-16 h-16 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center shrink-0">
          <CategoryIcon category="মোট ব্যয়" size={32} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-app-text-muted uppercase tracking-wider mb-1">{t('common.total_expenses')}</div>
          <div className="text-3xl font-black text-app-text-primary tracking-tight">{BDT(total, lang === 'bn')}</div>
        </div>
      </div>

      {prjExpenses.length === 0 ? (
        <div className="text-center py-16 bg-app-surface rounded-3xl border border-app-border text-app-text-muted font-bold text-sm">
          {t('common.no_expenses')}
        </div>
      ) : (
        <div className="space-y-3">
          {[...prjExpenses].sort((a, b) => b.date.localeCompare(a.date)).map((e: any, i: number) => {
            return (
              <motion.div 
                whileTap={{ scale: 0.98 }}
                key={e.id} 
                className="bg-app-surface rounded-2xl border border-app-border p-4 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-app-bg transition-colors"
                onClick={() => setSelExp(e)}
              >
                <div 
                  className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", CategoryColor(e.category))}
                >
                  <CategoryIcon category={e.category} size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-app-text-primary">{e.category}</div>
                  <div className="text-xs text-app-text-secondary font-medium mt-0.5 truncate">{e.description}</div>
                  <div className="text-[10px] text-app-text-muted mt-1">{e.date}</div>
                </div>
                <div className="text-base font-black shrink-0 text-app-text-primary">{BDT(e.amount, lang === 'bn')}</div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selExp && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 z-[500] flex items-end sm:items-center justify-center backdrop-blur-sm p-4" onClick={() => setSelExp(null)}>
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-app-surface-elevated rounded-t-3xl sm:rounded-3xl w-full max-w-md p-8 pb-safe border border-app-border" 
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-app-border rounded-full mx-auto mb-8 sm:hidden" />
              
              <div className="flex items-center gap-5 mb-8">
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", CategoryColor(selExp.category))}>
                  <CategoryIcon category={selExp.category} size={32} />
                </div>
                <div>
                  <div className="text-xs font-bold text-app-text-muted uppercase tracking-widest mb-1">{selExp.category}</div>
                  <div className="text-2xl font-black text-app-text-primary leading-tight">{BDT(selExp.amount, lang === 'bn')}</div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="text-[10px] text-app-text-muted font-bold uppercase tracking-widest mb-2">{t('common.details')}</div>
                  <div className="text-sm font-bold text-app-text-secondary bg-app-bg p-4 rounded-2xl border border-app-border leading-relaxed">
                    {selExp.description || "—"}
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-4 border-t border-app-border">
                  <span className="text-xs font-bold text-app-text-muted uppercase tracking-widest">{t('modal.date')}</span>
                  <span className="text-sm font-black text-app-text-primary">{selExp.date}</span>
                </div>
              </div>

              <button 
                className="w-full bg-app-tab-active text-app-bg font-bold py-4 rounded-2xl hover:opacity-90 transition-colors mt-8 shadow-lg" 
                onClick={() => setSelExp(null)}
              >
                {t('project_modals.close')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ClientProfile({ client, instDefs, onUpdateClient }: any) {
  const { t, lang } = useLanguage();
  const [old, setOld] = useState("");
  const [nw, setNw] = useState("");
  const [conf, setConf] = useState("");
  const [showO, setShowO] = useState(false);
  const [showN, setShowN] = useState(false);
  const [msg, setMsg] = useState<any>(null);
  
  const color = ac(client.id);
  
  const save = () => {
    setMsg(null);
    if (!old) return setMsg({ t: "e", v: t('common.error_enter_current_pw') });
    if (old !== client.password) return setMsg({ t: "e", v: t('common.error_wrong_current_pw') });
    if (!nw || nw.length < 4) return setMsg({ t: "e", v: t('common.error_min_chars', { count: 4 }) });
    if (nw !== conf) return setMsg({ t: "e", v: t('common.error_pw_mismatch') });
    onUpdateClient({ ...client, password: nw });
    setOld(""); setNw(""); setConf("");
    setMsg({ t: "s", v: t('common.success_pw_changed') });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      <div className="bg-app-surface rounded-3xl border border-app-border p-6 mb-6 shadow-sm transition-colors">
        <div className="flex items-center gap-5 mb-8">
          <ClientAvatar client={client} size={80} />
          <div>
            <div className="text-2xl font-black text-app-text-primary">{client.name}</div>
            <div className="text-sm font-medium text-app-text-secondary mt-1">{t('client.plot')}: <span className="font-bold" style={{ color }}>{client.plot}</span></div>
          </div>
        </div>
        
        <div className="space-y-4">
          {[
            [t('common.customer_id'), client.id], [t('common.phone'), client.phone || "—"], 
            [t('client.father_husband'), client.fatherHusband || "—"], [t('client.birth_date'), client.birthDate || "—"], 
            [t('client.email'), client.email || "—"], [t('client.nid'), client.nid || "—"], 
            [t('common.total_price_label'), BDT((() => {
              let total = 0;
              const globalSeen = new Set();
              
              // Sum global installments once
              instDefs.filter((d: any) => d.projectId === client.projectId && d.isGlobal).forEach((d: any) => {
                if (!globalSeen.has(d.id)) {
                  total += d.targetAmount;
                  globalSeen.add(d.id);
                }
              });
              
              // Sum plan installments multiplied by their share counts
              (client.planAssignments || []).forEach((pa: any) => {
                instDefs.filter((d: any) => d.planId === pa.planId && !d.isGlobal).forEach((d: any) => {
                  total += d.targetAmount * (pa.shareCount || 1);
                });
              });
              
              return total;
            })(), lang === 'bn')]
          ].map(([l, v], i) => (
            <div key={`${l}-${i}`} className="flex items-center py-2 border-b border-app-border last:border-0">
              <span className="text-xs font-bold text-app-text-muted w-32 shrink-0">{l}</span>
              <span className="text-sm font-bold text-app-text-primary flex-1">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-app-surface rounded-3xl border border-app-border p-6 shadow-sm transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-app-bg rounded-xl flex items-center justify-center text-app-text-secondary border border-app-border">
            <KeyRound size={20} />
          </div>
          <h2 className="text-lg font-black text-app-text-primary">{t('common.change_password')}</h2>
        </div>
        
        <FG label={t('common.current_password')}>
          <div className="relative">
            <input 
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all pr-12 text-app-text-primary" 
              type={showO ? "text" : "password"} 
              value={old} onChange={e => setOld(e.target.value)} 
            />
            <button onClick={() => setShowO(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text-secondary p-1">
              {showO ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </FG>
        
        <FG label={t('common.new_password')}>
          <div className="relative">
            <input 
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all pr-12 text-app-text-primary" 
              type={showN ? "text" : "password"} 
              value={nw} onChange={e => setNw(e.target.value)} 
            />
            <button onClick={() => setShowN(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text-secondary p-1">
              {showN ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </FG>
        
        <FG label={t('common.confirm_password')}>
          <input 
            className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all text-app-text-primary" 
            type="password" 
            value={conf} onChange={e => setConf(e.target.value)} 
          />
        </FG>
        
        <AnimatePresence>
          {msg && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <div className={cn(
                "p-4 rounded-xl mb-6 text-sm font-bold border",
                msg.t === "s" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
              )}>
                {msg.v}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button className="w-full bg-app-tab-active text-app-bg font-bold py-3.5 rounded-xl hover:opacity-90 transition-colors mt-2" onClick={save}>
          {t('common.change_password')}
        </button>
      </div>
    </motion.div>
  );
}
