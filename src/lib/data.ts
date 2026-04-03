export const INIT_ADMINS = [
  { id:"superadmin", name:"Super Admin",  username:"superadmin", password:"admin123", role:"superadmin", isTemp:false },
  { id:"adm-rahim",  name:"রহিম উদ্দিন", username:"rahim",      password:"temp1234", role:"admin",      isTemp:true  },
  { id:"adm-karim",  name:"করিম হোসেন",  username:"karim",      password:"karim123", role:"admin",      isTemp:false },
];
export const SP = [
  { id:"PRJ-1", name:"MARQ Height",     description:"মিরপুর-১০, ঢাকা · ১২ তলা আবাসিক প্রজেক্ট" },
  { id:"PRJ-2", name:"MARQ Twin Tower", description:"উত্তরা, ঢাকা · টুইন টাওয়ার কমার্শিয়াল" },
];
export const INIT_SCHEDULES = [
  { id: "SCH-1-1", projectId: "PRJ-1", name: "1300 sqft" },
  { id: "SCH-2-1", projectId: "PRJ-2", name: "Standard" },
];
export const SC = [
  { id:"C001", projectId:"PRJ-1", name:"রাহেলা বেগম",      fatherHusband:"আব্দুল করিম",     birthDate:"1985-06-12", phone:"01711-111111", email:"rahela@gmail.com",  nid:"1234567890", plot:"A-4B",  totalAmount:2500000, password:"1234", photo:"", schedules: { "SCH-1-1": 1 } },
  { id:"C002", projectId:"PRJ-1", name:"মোহাম্মদ শফিকুল",  fatherHusband:"নুরুল ইসলাম",     birthDate:"1978-03-22", phone:"01822-222222", email:"shafiq@gmail.com",  nid:"2345678901", plot:"B-7C",  totalAmount:2800000, password:"1234", photo:"", schedules: { "SCH-1-1": 1 } },
  { id:"C003", projectId:"PRJ-1", name:"সালমা আক্তার",     fatherHusband:"জাহাঙ্গীর হোসেন", birthDate:"1990-11-05", phone:"01933-333333", email:"salma@gmail.com",   nid:"3456789012", plot:"C-2A",  totalAmount:2600000, password:"1234", photo:"", schedules: { "SCH-1-1": 1 } },
  { id:"C004", projectId:"PRJ-1", name:"আব্দুল্লাহ মামুন", fatherHusband:"মোজাম্মেল হক",    birthDate:"1982-07-18", phone:"01644-444444", email:"mamun@gmail.com",   nid:"4567890123", plot:"D-1F",  totalAmount:3000000, password:"1234", photo:"", schedules: { "SCH-1-1": 1 } },
  { id:"C005", projectId:"PRJ-1", name:"নাসরিন সুলতানা",   fatherHusband:"রফিকুল ইসলাম",    birthDate:"1992-04-09", phone:"01555-555555", email:"nasrin@gmail.com",  nid:"5678901234", plot:"E-3B",  totalAmount:2700000, password:"1234", photo:"", schedules: { "SCH-1-1": 1 } },
  { id:"C006", projectId:"PRJ-2", name:"করিম উদ্দিন",      fatherHusband:"আলী আহমেদ",       birthDate:"1975-09-25", phone:"01666-666666", email:"karim2@gmail.com",  nid:"6789012345", plot:"T1-3F", totalAmount:5500000, password:"1234", photo:"", schedules: { "SCH-2-1": 1 } },
  { id:"C007", projectId:"PRJ-2", name:"ফারহানা ইয়াসমিন", fatherHusband:"তানভীর আহমেদ",    birthDate:"1980-12-14", phone:"01777-777777", email:"farhana@gmail.com", nid:"7890123456", plot:"T2-5G", totalAmount:6000000, password:"1234", photo:"", schedules: { "SCH-2-1": 1 } },
  { id:"C008", projectId:"PRJ-2", name:"মাহবুবুর রহমান",   fatherHusband:"সিরাজুল ইসলাম",   birthDate:"1971-02-28", phone:"01888-888888", email:"mahbub@gmail.com",  nid:"8901234567", plot:"T1-8A", totalAmount:5800000, password:"1234", photo:"", schedules: { "SCH-2-1": 1 } },
];
export const SD = [
  { id:"D001", projectId:"PRJ-1", scheduleId: "SCH-1-1", title:"বুকিং মানি", dueDate:"2024-01-15", targetAmount:300000  },
  { id:"D002", projectId:"PRJ-1", scheduleId: "SCH-1-1", title:"১ম কিস্তি",  dueDate:"2024-04-01", targetAmount:500000  },
  { id:"D003", projectId:"PRJ-1", scheduleId: "SCH-1-1", title:"২য় কিস্তি",  dueDate:"2024-07-01", targetAmount:500000  },
  { id:"D004", projectId:"PRJ-1", scheduleId: "SCH-1-1", title:"৩য় কিস্তি",  dueDate:"2024-10-01", targetAmount:500000  },
  { id:"D005", projectId:"PRJ-1", scheduleId: "SCH-1-1", title:"৪র্থ কিস্তি", dueDate:"2025-01-01", targetAmount:500000  },
  { id:"D006", projectId:"PRJ-2", scheduleId: "SCH-2-1", title:"বুকিং মানি", dueDate:"2024-02-01", targetAmount:600000  },
  { id:"D007", projectId:"PRJ-2", scheduleId: "SCH-2-1", title:"১ম কিস্তি",  dueDate:"2024-05-01", targetAmount:1000000 },
  { id:"D008", projectId:"PRJ-2", scheduleId: "SCH-2-1", title:"২য় কিস্তি",  dueDate:"2024-08-01", targetAmount:1000000 },
  { id:"D009", projectId:"PRJ-2", scheduleId: "SCH-2-1", title:"৩য় কিস্তি",  dueDate:"2024-11-01", targetAmount:1000000 },
];
export const SPA = [
  { id:"PAY-001", clientId:"C001", instDefId:"D001", amount:300000,  date:"2024-01-13", note:"", status:"approved", approvedBy:null },
  { id:"PAY-002", clientId:"C001", instDefId:"D002", amount:500000,  date:"2024-03-30", note:"", status:"approved", approvedBy:null },
  { id:"PAY-003", clientId:"C001", instDefId:"D003", amount:300000,  date:"2024-07-05", note:"আংশিক", status:"approved", approvedBy:null },
  { id:"PAY-004", clientId:"C002", instDefId:"D001", amount:300000,  date:"2024-01-16", note:"", status:"approved", approvedBy:null },
  { id:"PAY-005", clientId:"C002", instDefId:"D002", amount:500000,  date:"2024-04-02", note:"", status:"approved", approvedBy:null },
  { id:"PAY-006", clientId:"C002", instDefId:"D003", amount:200000,  date:"2024-07-10", note:"আংশিক", status:"approved", approvedBy:null },
  { id:"PAY-007", clientId:"C003", instDefId:"D001", amount:300000,  date:"2024-01-15", note:"", status:"approved", approvedBy:null },
  { id:"PAY-008", clientId:"C003", instDefId:"D002", amount:150000,  date:"2024-04-10", note:"আংশিক", status:"approved", approvedBy:null },
  { id:"PAY-009", clientId:"C004", instDefId:"D001", amount:300000,  date:"2024-01-14", note:"", status:"approved", approvedBy:null },
  { id:"PAY-010", clientId:"C004", instDefId:"D002", amount:500000,  date:"2024-04-01", note:"", status:"approved", approvedBy:null },
  { id:"PAY-011", clientId:"C004", instDefId:"D003", amount:500000,  date:"2024-07-01", note:"", status:"approved", approvedBy:null },
  { id:"PAY-012", clientId:"C004", instDefId:"D004", amount:500000,  date:"2024-10-02", note:"", status:"approved", approvedBy:null },
  { id:"PAY-013", clientId:"C005", instDefId:"D001", amount:300000,  date:"2024-01-18", note:"", status:"approved", approvedBy:null },
  { id:"PAY-014", clientId:"C005", instDefId:"D002", amount:250000,  date:"2024-04-15", note:"আংশিক", status:"approved", approvedBy:null },
  { id:"PAY-015", clientId:"C006", instDefId:"D006", amount:600000,  date:"2024-02-01", note:"", status:"approved", approvedBy:null },
  { id:"PAY-016", clientId:"C006", instDefId:"D007", amount:1000000, date:"2024-05-02", note:"", status:"approved", approvedBy:null },
  { id:"PAY-017", clientId:"C006", instDefId:"D008", amount:500000,  date:"2024-08-10", note:"আংশিক", status:"approved", approvedBy:null },
  { id:"PAY-018", clientId:"C007", instDefId:"D006", amount:600000,  date:"2024-02-03", note:"", status:"approved", approvedBy:null },
  { id:"PAY-019", clientId:"C007", instDefId:"D007", amount:1000000, date:"2024-05-01", note:"", status:"approved", approvedBy:null },
  { id:"PAY-020", clientId:"C007", instDefId:"D008", amount:1000000, date:"2024-08-01", note:"", status:"approved", approvedBy:null },
  { id:"PAY-021", clientId:"C007", instDefId:"D009", amount:600000,  date:"2024-11-05", note:"আংশিক", status:"approved", approvedBy:null },
  { id:"PAY-022", clientId:"C008", instDefId:"D006", amount:600000,  date:"2024-02-05", note:"", status:"approved", approvedBy:null },
  { id:"PAY-023", clientId:"C008", instDefId:"D007", amount:400000,  date:"2024-05-20", note:"আংশিক", status:"approved", approvedBy:null },
];
export const SE = [
  { id:"EX-001", projectId:"PRJ-1", date:"2024-01-10", category:"ভূমি সমতলকরণ",  description:"মাটি ভরাট ও সমতলকরণ",        amount:350000  },
  { id:"EX-002", projectId:"PRJ-1", date:"2024-02-05", category:"ফাউন্ডেশন",      description:"পাইলিং ও ফাউন্ডেশন কাজ",     amount:1200000 },
  { id:"EX-003", projectId:"PRJ-1", date:"2024-03-12", category:"নির্মাণ সামগ্রী", description:"ইট, বালি, সিমেন্ট, রড",      amount:850000  },
  { id:"EX-004", projectId:"PRJ-1", date:"2024-04-20", category:"শ্রমিক মজুরি",   description:"এপ্রিল মাসের মজুরি",          amount:280000  },
  { id:"EX-005", projectId:"PRJ-1", date:"2024-05-15", category:"বৈদ্যুতিক কাজ",  description:"ইলেকট্রিক্যাল ওয়্যারিং",    amount:320000  },
  { id:"EX-006", projectId:"PRJ-1", date:"2024-06-10", category:"পানি সরবরাহ",    description:"প্লাম্বিং ও পাইপলাইন",       amount:190000  },
  { id:"EX-007", projectId:"PRJ-2", date:"2024-01-25", category:"ভূমি সমতলকরণ",  description:"ডিপ এক্সকাভেশন",             amount:600000  },
  { id:"EX-008", projectId:"PRJ-2", date:"2024-02-18", category:"ফাউন্ডেশন",      description:"ডিপ পাইলিং — টাওয়ার ১",     amount:2200000 },
  { id:"EX-009", projectId:"PRJ-2", date:"2024-03-20", category:"ফাউন্ডেশন",      description:"ডিপ পাইলিং — টাওয়ার ২",     amount:2100000 },
  { id:"EX-010", projectId:"PRJ-2", date:"2024-04-15", category:"নির্মাণ সামগ্রী", description:"স্টিল স্ট্রাকচার ও কংক্রিট", amount:1800000 },
  { id:"EX-011", projectId:"PRJ-2", date:"2024-05-25", category:"শ্রমিক মজুরি",   description:"মে মাসের মজুরি",              amount:450000  },
];
export const INIT_LOGS = [
  { id:"LOG-001", adminId:"superadmin", adminName:"Super Admin", action:"payment_add",    target:"C001 - রাহেলা বেগম",      detail:"৳3,00,000 — বুকিং মানি", projectId:"PRJ-1", ts:"2024-01-13T10:22:00" },
  { id:"LOG-002", adminId:"adm-karim",  adminName:"করিম হোসেন",  action:"payment_add",    target:"C002 - মোহাম্মদ শফিকুল",  detail:"৳3,00,000 — বুকিং মানি", projectId:"PRJ-1", ts:"2024-01-16T09:15:00" },
  { id:"LOG-003", adminId:"adm-rahim",  adminName:"রহিম উদ্দিন", action:"client_add",     target:"C003 - সালমা আক্তার",     detail:"নতুন ক্লাইন্ট যোগ",      projectId:"PRJ-1", ts:"2024-01-14T14:05:00" },
  { id:"LOG-004", adminId:"adm-karim",  adminName:"করিম হোসেন",  action:"payment_add",    target:"C004 - আব্দুল্লাহ মামুন", detail:"৳5,00,000 — ১ম কিস্তি",  projectId:"PRJ-1", ts:"2024-04-01T11:30:00" },
  { id:"LOG-005", adminId:"superadmin", adminName:"Super Admin", action:"expense_add",    target:"PRJ-2",                   detail:"ডিপ পাইলিং ৳22,00,000",  projectId:"PRJ-2", ts:"2024-02-18T13:00:00" },
  { id:"LOG-006", adminId:"adm-rahim",  adminName:"রহিম উদ্দিন", action:"client_edit",    target:"C005 - নাসরিন সুলতানা",   detail:"তথ্য আপডেট",             projectId:"PRJ-1", ts:"2024-03-10T16:45:00" },
  { id:"LOG-007", adminId:"adm-karim",  adminName:"করিম হোসেন",  action:"payment_add",    target:"C007 - ফারহানা",          detail:"৳10,00,000 — ১ম কিস্তি", projectId:"PRJ-2", ts:"2024-05-01T10:00:00" },
  { id:"LOG-008", adminId:"superadmin", adminName:"Super Admin", action:"admin_reset_pw", target:"রহিম উদ্দিন",            detail:"Temporary password সেট",  projectId:null,    ts:"2024-06-01T09:00:00" },
];

export const LOGO_URL = "https://i.ibb.co/23dTx0Gf/16953-fotor-bg-remover-2026040118142.png";

export const STATUS: Record<string, any> = {
  paid:    { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  partial: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500", bar: "bg-amber-500" },
  unpaid:  { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-300", bar: "bg-slate-300" },
};
export const STATUS_LABEL: Record<string, string> = { paid: "status.paid", partial: "status.partial", unpaid: "status.unpaid" };

export const EXP_ICON: Record<string, string> = {
  "ভূমি সমতলকরণ": "Pickaxe",
  "ফাউন্ডেশন": "HardHat",
  "নির্মাণ সামগ্রী": "Package",
  "শ্রমিক মজুরি": "Users",
  "বৈদ্যুতিক কাজ": "Zap",
  "পানি সরবরাহ": "Droplets",
  "ফিনিশিং": "Paintbrush",
  "অন্যান্য": "Box"
};
export const EXP_CATS = Object.keys(EXP_ICON);

export const ACTION_META: Record<string, any> = {
  payment_add:      { icon: "CircleDollarSign", color: "text-emerald-700", bg: "bg-emerald-100" },
  payment_pending:  { icon: "Clock", color: "text-amber-700", bg: "bg-amber-100" },
  payment_approved: { icon: "CheckCircle2", color: "text-emerald-700", bg: "bg-emerald-100" },
  payment_rejected: { icon: "XCircle", color: "text-rose-600", bg: "bg-rose-100" },
  payment_delete:   { icon: "Trash2", color: "text-rose-600", bg: "bg-rose-100" },
  client_add:       { icon: "UserPlus", color: "text-blue-700", bg: "bg-blue-100" },
  client_edit:      { icon: "Edit2", color: "text-amber-700", bg: "bg-amber-100" },
  client_id_change: { icon: "RefreshCw", color: "text-violet-700", bg: "bg-violet-100" },
  client_delete:    { icon: "UserMinus", color: "text-rose-600", bg: "bg-rose-100" },
  expense_add:      { icon: "Building2", color: "text-violet-700", bg: "bg-violet-100" },
  expense_delete:   { icon: "Trash2", color: "text-rose-600", bg: "bg-rose-100" },
  instdef_add:      { icon: "ClipboardList", color: "text-cyan-700", bg: "bg-cyan-100" },
  instdef_delete:   { icon: "Trash2", color: "text-rose-600", bg: "bg-rose-100" },
  project_add:      { icon: "Building", color: "text-emerald-700", bg: "bg-emerald-100" },
  project_delete:   { icon: "Trash2", color: "text-rose-600", bg: "bg-rose-100" },
  admin_add:        { icon: "ShieldPlus", color: "text-emerald-700", bg: "bg-emerald-100" },
  admin_remove:     { icon: "ShieldMinus", color: "text-rose-600", bg: "bg-rose-100" },
  admin_reset_pw:   { icon: "KeyRound", color: "text-orange-600", bg: "bg-orange-100" },
  pw_change:        { icon: "Key", color: "text-cyan-700", bg: "bg-cyan-100" },
  admin_clear_logs: { icon: "Trash2", color: "text-rose-600", bg: "bg-rose-100" },
};
