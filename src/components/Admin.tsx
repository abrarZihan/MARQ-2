import React, { useState } from "react";
import { BDT, BDTshort, dotJoin, ac, initials, fmtTs, uid, todayStr, clientPaidForDef, cellStatus, cn } from "../lib/utils";
import { ACTION_META, EXP_CATS, STATUS, STATUS_LABEL } from "../lib/data";
import { Badge, PBar, FG, ClientAvatar, PassCell, ConfirmDelete } from "./Shared";
import { motion } from "motion/react";
import { Building2, CheckCircle2, Clock, Trash2, Edit2, UserPlus, FileText, Pickaxe, HardHat, Package, Users, Zap, Droplets, Paintbrush, Box, CircleDollarSign, XCircle, RefreshCw, UserMinus, Building, ShieldPlus, ShieldMinus, KeyRound, Key, ClipboardList, Shield } from "lucide-react";

import { useLanguage } from "../lib/i18n";

import { Log, Project } from "../types";

export const LogRow: React.FC<{ log: Log; projects: Project[] }> = ({ log, projects }) => {
  const { t } = useLanguage();
  const m = ACTION_META[log.action as string] || { icon: "FileText", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-500/10" };
  const label = t('common.actions.' + log.action) || log.action;
  const prj = projects?.find((p: Project) => p.id === log.projectId);
  
  // Map string icons to Lucide components
  const IconComponent = m.icon === "CircleDollarSign" ? <CircleDollarSign size={20} className="text-emerald-600 dark:text-emerald-400" /> : 
                        m.icon === "Clock" ? <Clock size={20} className="text-amber-600 dark:text-amber-400" /> :
                        m.icon === "CheckCircle2" ? <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" /> :
                        m.icon === "XCircle" ? <XCircle size={20} className="text-rose-600 dark:text-rose-400" /> :
                        m.icon === "Trash2" ? <Trash2 size={20} className="text-rose-600 dark:text-rose-400" /> :
                        m.icon === "UserPlus" ? <UserPlus size={20} className="text-blue-600 dark:text-blue-400" /> :
                        m.icon === "Edit2" ? <Edit2 size={20} className="text-amber-600 dark:text-amber-400" /> :
                        m.icon === "RefreshCw" ? <RefreshCw size={20} className="text-violet-600 dark:text-violet-400" /> :
                        m.icon === "UserMinus" ? <UserMinus size={20} className="text-rose-600 dark:text-rose-400" /> :
                        m.icon === "Building2" ? <Building2 size={20} className="text-violet-600 dark:text-violet-400" /> :
                        m.icon === "ClipboardList" ? <ClipboardList size={20} className="text-cyan-600 dark:text-cyan-400" /> :
                        m.icon === "Building" ? <Building size={20} className="text-emerald-600 dark:text-emerald-400" /> :
                        m.icon === "ShieldPlus" ? <ShieldPlus size={20} className="text-emerald-600 dark:text-emerald-400" /> :
                        m.icon === "ShieldMinus" ? <ShieldMinus size={20} className="text-rose-600 dark:text-rose-400" /> :
                        m.icon === "KeyRound" ? <KeyRound size={20} className="text-orange-600 dark:text-orange-400" /> :
                        m.icon === "Key" ? <Key size={20} className="text-cyan-600 dark:text-cyan-400" /> : <FileText size={20} />;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-app-border last:border-0 transition-colors">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg", m.bg)}>
        {IconComponent}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-extrabold text-app-text-primary">{log.adminName}</span>
          <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold", m.bg, m.color)}>{label}</span>
          {prj && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-app-bg text-app-text-secondary">{prj.name}</span>}
        </div>
        <div className="text-xs text-app-text-secondary font-medium">
          {dotJoin(
            typeof log.target === 'object' ? JSON.stringify(log.target) : log.target, 
            typeof log.detail === 'object' ? JSON.stringify(log.detail) : log.detail
          )}
        </div>
        <div className="text-[10px] text-app-text-muted mt-1 font-medium">{fmtTs(log.ts)}</div>
      </div>
    </div>
  );
}
