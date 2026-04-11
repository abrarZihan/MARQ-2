import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Globe } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../../lib/i18n";
import { useAppStore } from "../../store/appStore";
import { cn } from "../../lib/utils";
import { LOGO_URL } from "../../lib/data";
import { FG } from "../../components/Shared";
import { AuthUser } from "../../types";

// Firebase
import { 
  doc, setDoc, updateDoc, query, where, getDocs, getDoc, collection 
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { db, auth as fbAuth } from "../../firebase";

export default function Login() {
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const { setAuth, setLoading, setForceChangePw } = useAppStore();
  
  const [role, setRole] = useState("admin");
  const [id, setId] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [localLoading, setLocalLoading] = useState(false);

  const login = async (role: string, id: string, pass: string) => {
    setLoading(true);
    try {
      // Ensure anonymous auth for security rules
      if (!fbAuth.currentUser) {
        try {
          await signInAnonymously(fbAuth);
        } catch (e) {
          // Ignore error if anonymous auth is disabled
        }
      }

      const collectionName = role === "admin" ? "admins" : "clients";
      
      if (role === "admin") {
        // Query Firestore for the admin user by username
        const q = query(collection(db, collectionName), where("username", "==", id));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          setLoading(false);
          return { error: "অ্যাকাউন্টটি খুঁজে পাওয়া যায়নি" };
        }
        
        const userData = snap.docs[0].data() as AuthUser;
        // Verify password (in a real app, this would be hashed)
        if ((userData as any).password !== pass) {
          setLoading(false);
          return { error: "পাসওয়ার্ড ভুল" };
        }
        
        // Link Firestore UID with Auth UID for security rules
        if (fbAuth.currentUser) {
          try {
            if (userData.uid !== fbAuth.currentUser.uid) {
              await updateDoc(doc(db, "admins", userData.id), { uid: fbAuth.currentUser.uid });
            }
            await setDoc(doc(db, "roles", fbAuth.currentUser.uid), { 
              role: userData.role === "superadmin" ? "superadmin" : "admin", 
              id: userData.id 
            });
          } catch (e) {
            console.error("Role linking failed:", e);
          }
        }

        const userRole = (userData.role === "superadmin" ? "superadmin" : role) as "admin" | "superadmin";
        setAuth({ role: userRole, user: userData });
        
        // Check if password change is required
        if (role === "admin" && userData.isTemp) {
          setForceChangePw(true);
          navigate("/force-change-pw");
        } else {
          navigate("/");
        }
      } else {
        // Client login flow
        const docRef = doc(db, collectionName, id);
        const snap = await getDoc(docRef);
        
        if (!snap.exists()) {
          setLoading(false);
          return { error: "অ্যাকাউন্টটি খুঁজে পাওয়া যায়নি" };
        }
        
        const userData = snap.data() as AuthUser;
        if ((userData as any).password !== pass) {
          setLoading(false);
          return { error: "পাসওয়ার্ড ভুল" };
        }

        if (fbAuth.currentUser) {
          try {
            if (userData.uid !== fbAuth.currentUser.uid) {
              await updateDoc(doc(db, "clients", id), { uid: fbAuth.currentUser.uid });
            }
            await setDoc(doc(db, "roles", fbAuth.currentUser.uid), { 
              role: "client", 
              id: id 
            });
          } catch (e) {
            console.error("Role linking failed:", e);
          }
        }

        setAuth({ role: "client", user: userData });
        navigate("/");
      }
    } catch (e) {
      console.error("Login error:", e);
      return { error: "লগইন করতে সমস্যা হয়েছে" };
    } finally {
      setLoading(false);
    }
  };

  const attempt = async () => {
    if (!id || !pass) return setErr(t("login.err_all_info"));
    setErr("");
    setLocalLoading(true);
    const res = await login(role, id, pass);
    if (res?.error) {
      setErr(res.error);
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-app-nav-bg p-4 relative transition-colors">
      <button 
        onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
        className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-white/10 text-white rounded-full text-xs font-bold transition-colors border border-white/20 hover:bg-white/20"
      >
        <Globe size={14} />
        {lang === 'bn' ? 'English' : 'বাংলা'}
      </button>
      <div className="text-center mb-8">
        <div className="text-3xl font-black text-white tracking-tighter">MARQ BUILDERS</div>
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-app-surface rounded-3xl p-8 w-full max-w-md shadow-2xl border border-app-border"
      >
        <div className="w-32 h-32 bg-white force-white rounded-3xl flex items-center justify-center overflow-hidden mx-auto mb-4 shadow-sm border border-app-border">
          <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
        </div>
        <div className="text-center mb-6">
          <div className="text-2xl font-extrabold text-app-text-primary">{t("login.welcome")}</div>
          <div className="text-sm text-app-text-secondary mt-1">{t("login.enter_account")}</div>
        </div>
        
        <div className="flex bg-app-bg p-1 rounded-xl mb-6 border border-app-border">
          {[["admin", t("login.admin")], ["client", t("login.client")]].map(([v, l]) => (
            <button 
              key={v} 
              onClick={() => { setRole(v as any); setErr(""); }}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all",
                role === v ? "bg-app-tab-active text-app-bg shadow-sm" : "text-app-tab-inactive hover:text-app-text-primary"
              )}
            >
              {l}
            </button>
          ))}
        </div>

        <FG label={role === "admin" ? t("login.username") : t("login.customer_id")}>
          <input 
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-app-nav-bg transition-all border border-app-input-border bg-app-input-bg text-app-text-primary" 
            placeholder={role === "admin" ? "admin" : "C001"} 
            value={id} onChange={e => setId(e.target.value)} 
          />
        </FG>
        <FG label={t("login.password")}>
          <div className="relative">
            <input 
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-app-nav-bg transition-all pr-12 border border-app-input-border bg-app-input-bg text-app-text-primary" 
              type={show ? "text" : "password"} 
              placeholder="••••••••" 
              value={pass} onChange={e => setPass(e.target.value)} 
              onKeyDown={e => e.key === "Enter" && attempt()} 
            />
            <button 
              onClick={() => setShow(s => !s)} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text-secondary p-1"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </FG>
        
        <AnimatePresence>
          {err && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <div className="text-app-error-text text-sm font-bold mb-4 bg-app-error-bg p-3 rounded-xl border border-app-error-text/10">{err}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          disabled={localLoading}
          className="w-full bg-app-tab-active text-app-bg font-bold py-3.5 rounded-xl hover:opacity-90 transition-colors mb-6 disabled:opacity-50" 
          onClick={attempt}
        >
          {localLoading ? t("login.loading") : t("login.enter")}
        </button>

        <div className="bg-app-bg rounded-xl p-4 border border-app-border text-xs text-app-text-secondary">
          <div className="font-bold text-app-text-muted text-[10px] mb-2 uppercase tracking-wider">{t("login.warning")}</div>
          <div className="leading-relaxed">
            {t("login.warning_text")}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
