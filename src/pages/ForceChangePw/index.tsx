import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../../lib/i18n";
import { useAppStore } from "../../store/appStore";
import { FG } from "../../components/Shared";

// Firebase
import { doc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

export default function ForceChangePw() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { auth, setAuth, setForceChangePw } = useAppStore();
  const [newPw, setNewPw] = useState("");
  const [conf, setConf] = useState("");
  const [showN, setShowN] = useState(false);
  const [err, setErr] = useState("");

  const admin = auth?.user;

  const onDone = async (pw: string = "", isActualChange: boolean) => {
    if (!admin || !auth || auth.role === "client") return;
    
    if (isActualChange) {
      try {
        // Update password in Firestore
        await updateDoc(doc(db, "admins", admin.id), { 
          password: pw, 
          isTemp: false 
        });
        
        // Add audit log
        await addDoc(collection(db, "logs"), {
          action: "Password Change",
          details: `Admin ${admin.name} changed their password`,
          user: admin.name,
          timestamp: serverTimestamp()
        });

        // Update local state
        const updated = { ...admin, password: pw, isTemp: false };
        setAuth({ ...auth, user: updated });
      } catch (e) {
        console.error("Password change failed:", e);
        setErr("পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে");
        return;
      }
    }
    // Close the force change screen
    setForceChangePw(false);
    navigate("/");
  };

  const save = () => {
    if (!newPw || newPw.length < 4) return setErr(t("pw.min_4"));
    if (newPw !== conf) return setErr(t("pw.mismatch"));
    onDone(newPw, true);
  };

  if (!admin) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-app-bg p-4 transition-colors">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-app-surface rounded-3xl p-8 w-full max-w-md shadow-2xl border border-app-border"
      >
        <div className="w-14 h-14 bg-app-warning-bg text-app-warning-text rounded-2xl flex items-center justify-center mx-auto mb-6 border border-app-warning-text/10">
          <div className="text-app-warning-text"><KeyRound size={28} /></div>
        </div>
        <div className="text-center mb-8">
          <div className="text-xl font-extrabold text-app-text-primary">{t("login.welcome")}, {admin.name}!</div>
          <div className="text-sm text-app-text-secondary mt-2">{t("pw.temp_msg")}</div>
        </div>
        
        <FG label={t("pw.new_pw")}>
          <div className="relative">
            <input 
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all pr-12 border border-app-border bg-app-input-bg text-app-text-primary" 
              type={showN ? "text" : "password"} 
              value={newPw} onChange={e => { setNewPw(e.target.value); setErr(""); }} 
            />
            <button onClick={() => setShowN(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text-secondary p-1">
              {showN ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </FG>
        <FG label={t("pw.confirm")}>
          <input 
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-app-text-muted transition-all border border-app-border bg-app-input-bg text-app-text-primary" 
            type="password" 
            value={conf} onChange={e => { setConf(e.target.value); setErr(""); }} 
          />
        </FG>
        
        <AnimatePresence>
          {err && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <div className="text-app-error-text text-sm font-bold mb-4 bg-app-error-bg p-3 rounded-xl border border-app-error-text/10">{err}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <button className="w-full bg-app-tab-active text-app-bg font-bold py-3.5 rounded-xl hover:opacity-90 transition-colors mb-3" onClick={save}>
          {t("pw.set_new")}
        </button>
        <button className="w-full bg-app-bg text-app-text-secondary font-bold py-3.5 rounded-xl hover:bg-app-border transition-colors border border-app-border" onClick={() => onDone("", false)}>
          {t("pw.skip")}
        </button>
      </motion.div>
    </div>
  );
}
