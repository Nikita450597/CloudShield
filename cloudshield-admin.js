import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, getIdToken } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAPK7xOzqujXWkXntKz6ojnb1jZag7WW7c",
  authDomain: "cloudshield-7081e.firebaseapp.com",
  projectId: "cloudshield-7081e",
  storageBucket: "cloudshield-7081e.firebasestorage.app",
  messagingSenderId: "1065716286697",
  appId: "1:1065716286697:web:00b489aa11c31d6b5fdc78"
};

const SUPABASE_URL = "https://xphnmsyriepjafpntvyq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Yts-j_zjimR9pzdEEdmmMw_5_yMCrYw";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let adminUsers = [];
let adminEvents = [];
let adminFiles = [];
let currentPanel = "";

const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));

function formatTime(ts) {
  return ts?.toDate ? ts.toDate().toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) : "—";
}
function formatDate(ts) {
  return ts?.toDate ? ts.toDate().toLocaleDateString([], { month:"short", day:"numeric", year:"numeric" }) : "—";
}
function score(blocked, failed) { return Math.max(40, 100 - blocked * 3 - failed * 10); }
function label(s) { return s >= 90 ? "Excellent" : s >= 75 ? "Good" : s >= 60 ? "Attention" : "High Risk"; }
function setPanel(title, eyebrow = "CloudShield") {
  $("panelEyebrow").textContent = eyebrow;
  $("panelTitle").textContent = title;
  $("sidePanel").classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
  currentPanel = title;
}
function closePanel() {
  $("sidePanel").classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
  currentPanel = "";
}
function setPanelLoading() { $("panelContent").innerHTML = '<div class="py-12 text-center text-sm text-slate-500">Loading...</div>'; }
function emptyState(text) { return `<div class="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-sm text-slate-500">${escapeHtml(text)}</div>`; }

function setActiveNav(id) {
  document.querySelectorAll("nav a[id^='nav-']").forEach(a => {
    a.classList.remove("sidebar-active", "text-white");
    a.classList.add("text-slate-400");
  });
  const el = $(id);
  if (el) {
    el.classList.add("sidebar-active", "text-white");
    el.classList.remove("text-slate-400");
  }
}

function userById(id) { return adminUsers.find(u => u.id === id); }
function fileById(id) { return adminFiles.find(f => f.id === id); }

async function loadAdminData() {
  const [us, es, fs] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "securityEvents")),
    getDocs(collection(db, "files"))
  ]);
  adminUsers = us.docs.map(d => ({ id:d.id, ...d.data() }));
  adminEvents = es.docs.map(d => ({ id:d.id, ...d.data() }));
  adminFiles = fs.docs.map(d => ({ id:d.id, ...d.data() }));
  renderDashboardStats();
  renderEmployeeSecurity();
  renderAccessChart();
}

function renderDashboardStats() {
  const allowed = adminEvents.filter(e => e.status === "ALLOWED").length;
  const blocked = adminEvents.filter(e => e.status === "BLOCKED").length;
  const failed = adminEvents.filter(e => e.status === "FAILED").length;
  const s = score(blocked, failed);
  $("totalUsers").textContent = adminUsers.length;
  $("allowedRequests").textContent = allowed;
  $("blockedRequests").textContent = blocked;
  $("adminScore").textContent = s;
  $("threatTotal").textContent = blocked + failed;
  $("failedThreats").textContent = failed;
  $("unauthorizedThreats").textContent = adminEvents.filter(e => /unauthorized/i.test(e.action || "")).length;
  $("suspiciousThreats").textContent = adminEvents.filter(e => /suspicious/i.test(e.action || "")).length;
  $("permissionThreats").textContent = adminEvents.filter(e => /permission|access/i.test(e.action || "") && e.status === "BLOCKED").length;
  $("alertBadge").textContent = blocked;
}

function renderEmployeeSecurity() {
  const body = $("employeeSecurityBody");
  const emps = adminUsers.filter(u => u.role === "employee");
  if (!emps.length) { body.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-slate-600">No employee accounts found.</td></tr>'; return; }
  body.innerHTML = emps.map(u => {
    const mine = adminEvents.filter(e => e.userId === u.id);
    const b = mine.filter(e => e.status === "BLOCKED").length;
    const f = mine.filter(e => e.status === "FAILED").length;
    const s = score(b, f);
    const fc = adminFiles.filter(x => x.userId === u.id).length;
    const c = s >= 90 ? "emerald" : s >= 75 ? "amber" : "red";
    return `<tr class="border-b border-slate-800/50 hover:bg-slate-800/20">
      <td class="px-6 py-4 text-slate-300">${escapeHtml(u.email || "Unknown")}</td>
      <td class="px-6 py-4 text-blue-400 uppercase">${escapeHtml(u.role)}</td>
      <td class="px-6 py-4"><span class="font-semibold text-white">${s}/100</span><span class="ml-2 text-[10px] text-${c}-400">${label(s)}</span></td>
      <td class="px-6 py-4 text-${b ? "amber" : "emerald"}-400">${b}</td>
      <td class="px-6 py-4 text-slate-400">${fc}</td>
    </tr>`;
  }).join("");
}

function renderAccessChart() {
  const chart = $("accessChart");
  if (!chart) return;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - i);
    days.push(d);
  }
  const totals = days.map(d => {
    const next = new Date(d); next.setDate(next.getDate()+1);
    const ev = adminEvents.filter(e => e.timestamp?.toDate && e.timestamp.toDate() >= d && e.timestamp.toDate() < next);
    return { day:d.toLocaleDateString([], {weekday:"short"}), allowed:ev.filter(e=>e.status==="ALLOWED").length, blocked:ev.filter(e=>e.status==="BLOCKED").length };
  });
  const max = Math.max(1, ...totals.map(x => x.allowed + x.blocked));
  chart.innerHTML = totals.map(x => {
    const hA = Math.max(4, Math.round((x.allowed / max) * 150));
    const hB = x.blocked ? Math.max(4, Math.round((x.blocked / max) * 150)) : 0;
    return `<div class="flex-1 h-full flex items-end justify-center gap-1 group" title="${x.day}: ${x.allowed} allowed, ${x.blocked} blocked">
      <div class="w-2.5 rounded-t bg-blue-500/50" style="height:${hA}px"></div>
      <div class="w-2.5 rounded-t bg-red-500/60" style="height:${hB}px"></div>
    </div>`;
  }).join("");
}

function renderAlerts() {
  const blocked = adminEvents.filter(e => e.status === "BLOCKED" || e.status === "FAILED").sort((a,b) => (b.timestamp?.toMillis?.()||0)-(a.timestamp?.toMillis?.()||0));
  $("panelContent").innerHTML = blocked.length ? blocked.map(e => `<div class="mb-3 rounded-xl border border-red-500/15 bg-red-500/5 p-4">
    <div class="flex items-start justify-between gap-4"><div><p class="text-sm font-medium text-white">${escapeHtml(e.action || "Security event")}</p><p class="text-xs text-slate-500 mt-1">${escapeHtml(e.email || "Unknown user")}</p></div><span class="text-[10px] px-2 py-1 rounded-md ${e.status === "BLOCKED" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}">${escapeHtml(e.status)}</span></div>
    <p class="text-[11px] text-slate-600 mt-3">${formatTime(e.timestamp)}</p></div>`).join("") : emptyState("No blocked or failed security events.");
}

function renderLogs() {
  const events = [...adminEvents].sort((a,b)=>(b.timestamp?.toMillis?.()||0)-(a.timestamp?.toMillis?.()||0));
  $("panelContent").innerHTML = events.length ? `<div class="overflow-hidden rounded-xl border border-slate-800"><table class="w-full text-left"><thead class="bg-slate-900/70"><tr class="text-[10px] uppercase tracking-widest text-slate-600"><th class="px-4 py-3">Time</th><th class="px-4 py-3">User</th><th class="px-4 py-3">Action</th><th class="px-4 py-3">Result</th></tr></thead><tbody>${events.map(e=>`<tr class="border-t border-slate-800/70"><td class="px-4 py-3 text-xs text-slate-500">${formatTime(e.timestamp)}</td><td class="px-4 py-3 text-xs text-slate-300">${escapeHtml(e.email || "Unknown")}</td><td class="px-4 py-3 text-xs text-slate-400">${escapeHtml(e.action || "Security event")}</td><td class="px-4 py-3 text-[10px] ${e.status === "BLOCKED" ? "text-red-400" : e.status === "FAILED" ? "text-amber-400" : "text-emerald-400"}">${escapeHtml(e.status || "UNKNOWN")}</td></tr>`).join("")}</tbody></table></div>` : emptyState("No security events recorded yet.");
}

function renderTests() {
  $("panelContent").innerHTML = `<div class="space-y-3">
    ${["Firebase Authentication", "Firestore role-based access control", "Secure file ownership checks", "Shared-file permission checks", "Admin-only deletion", "Security event logging"].map((x,i)=>`<div class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4"><div><p class="text-sm text-white">${x}</p><p class="text-[11px] text-slate-600 mt-1">${i === 4 ? "Employees are denied deletion at the database layer." : "CloudShield protection control"}</p></div><span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">ACTIVE</span></div>`).join("")}
  </div>`;
}

function renderUsers() {
  const admins = adminUsers.filter(u=>u.role === "admin");
  const employees = adminUsers.filter(u=>u.role === "employee");
  $("panelContent").innerHTML = `<div class="space-y-6">
    <div><p class="text-[10px] uppercase tracking-widest text-slate-600 mb-3">Administrators</p>${admins.length ? admins.map(u=>userCard(u,"ADMIN")).join("") : emptyState("No administrators found.")}</div>
    <div><p class="text-[10px] uppercase tracking-widest text-slate-600 mb-3">Employees</p>${employees.length ? employees.map(u=>userCard(u,"EMPLOYEE")).join("") : emptyState("No employees found.")}</div>
  </div>`;
}
function userCard(u, role) { return `<div class="mb-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex items-center justify-between"><div><p class="text-sm text-white">${escapeHtml(u.email || "Unknown")}</p><p class="text-[10px] text-slate-600 mt-1">UID: ${escapeHtml(u.id)}</p></div><span class="text-[10px] ${role === "ADMIN" ? "text-blue-400 bg-blue-500/10" : "text-slate-400 bg-slate-800"} px-2 py-1 rounded-md">${role}</span></div>`; }

function renderProfile() {
  const user = auth.currentUser;
  const data = userById(user?.uid) || {};
  $("panelContent").innerHTML = `<div class="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
    <div class="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xl font-semibold text-blue-400">${escapeHtml((user?.email || "A")[0].toUpperCase())}</div>
    <p class="text-lg font-semibold text-white mt-5">${escapeHtml(user?.email || "Unknown")}</p>
    <span class="inline-block mt-2 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md uppercase">${escapeHtml(data.role || "admin")}</span>
    <div class="mt-6 pt-5 border-t border-slate-800"><p class="text-[10px] uppercase tracking-widest text-slate-600">Account created</p><p class="text-sm text-slate-300 mt-2">${formatDate(data.createdAt)}</p></div>
  </div>`;
}

async function adminToken() { return await getIdToken(auth.currentUser, true); }

async function openSecureFile(file) {
  const viewer = window.open("about:blank", "_blank");
  if (!viewer) { alert("Please allow pop-ups for CloudShield to view secure files."); return; }
  viewer.document.write("<title>CloudShield — Secure File</title><body style='font-family:system-ui;background:#050914;color:#cbd5e1;padding:40px'>Opening secure file…</body>");
  try {
    const token = await adminToken();
    const r = await fetch(`${SUPABASE_URL}/functions/v1/cloudshield-files`, { method:"POST", headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY}, body:JSON.stringify({action:"download-url", idToken:token, fileId:file.id, path:file.storagePath}) });
    const x = await r.json();
    if (!r.ok || !x.success) throw new Error(x.error || "Access denied.");
    viewer.location.href = x.signedUrl;
  } catch (e) { viewer.close(); alert(e.message || "Could not open file."); }
}

async function deleteAdminFile(file) {
  if (!confirm(`Delete “${file.fileName || file.fileName || "this file"}” permanently?`)) return;
  try {
    const token = await adminToken();
    const r = await fetch(`${SUPABASE_URL}/functions/v1/cloudshield-files`, { method:"POST", headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY}, body:JSON.stringify({action:"delete-file", idToken:token, fileId:file.id, path:file.storagePath}) });
    const x = await r.json();
    if (!r.ok || !x.success) throw new Error(x.error || "Delete denied.");
    await deleteDoc(doc(db,"files",file.id));
    adminFiles = adminFiles.filter(f=>f.id!==file.id);
    renderFilesPanel();
    renderEmployeeSecurity();
    alert("File deleted successfully.");
  } catch (e) { console.error(e); alert(e.message || "Could not delete file."); }
}

async function manageFileAccess(file) {
  const employees = adminUsers.filter(u=>u.role === "employee" && u.id !== file.userId);
  const grants = Array.isArray(file.allowedUsers) ? file.allowedUsers : [];
  $("fileModalTitle").textContent = "Manage File Access";
  $("fileModalContent").innerHTML = `<p class="text-sm text-white mb-1">${escapeHtml(file.fileName || "Untitled file")}</p><p class="text-xs text-slate-600 mb-5">Owner: ${escapeHtml((userById(file.userId)?.email) || file.email || "Unknown")}</p>
    <div class="space-y-2">${employees.length ? employees.map(u=>`<label class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-3 cursor-pointer"><span class="text-sm text-slate-300">${escapeHtml(u.email)}</span><input type="checkbox" class="grant-user w-4 h-4 accent-blue-500" value="${escapeHtml(u.id)}" ${grants.includes(u.id)?"checked":""}></label>`).join("") : emptyState("No other employees available.")}</div>
    <div class="flex justify-end gap-2 mt-6"><button id="cancelAccess" class="px-4 py-2 rounded-lg border border-slate-800 text-sm text-slate-400 hover:text-white">Cancel</button><button id="saveAccess" class="px-4 py-2 rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-500">Save access</button></div>`;
  $("fileAccessModal").classList.remove("hidden");
  $("cancelAccess").onclick = () => $("fileAccessModal").classList.add("hidden");
  $("saveAccess").onclick = async () => {
    const allowedUsers = [...document.querySelectorAll(".grant-user:checked")].map(x=>x.value);
    try {
      await updateDoc(doc(db,"files",file.id), { allowedUsers });
      file.allowedUsers = allowedUsers;
      $("fileAccessModal").classList.add("hidden");
      renderFilesPanel();
    } catch (e) { alert(e.message || "Could not update access."); }
  };
}

function renderFilesPanel() {
  const files = [...adminFiles].sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0));
  $("panelContent").innerHTML = files.length ? `<div class="space-y-3">${files.map(file=>{
    const owner = userById(file.userId)?.email || file.email || "Unknown";
    const shared = Array.isArray(file.allowedUsers) ? file.allowedUsers.length : 0;
    return `<div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="text-sm font-medium text-white truncate">${escapeHtml(file.fileName || "Untitled file")}</p><p class="text-[11px] text-slate-500 mt-1">Owner: ${escapeHtml(owner)}</p><p class="text-[10px] text-slate-600 mt-1">${shared} employee${shared===1?"":"s"} with access</p></div><span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">SECURED</span></div>
      <div class="flex gap-2 mt-4"><button data-view-file="${escapeHtml(file.id)}" class="flex-1 px-3 py-2 rounded-lg border border-slate-800 text-xs text-slate-300 hover:text-white hover:bg-slate-800">View</button><button data-manage-file="${escapeHtml(file.id)}" class="flex-1 px-3 py-2 rounded-lg border border-blue-500/20 text-xs text-blue-400 hover:bg-blue-500/10">Manage Access</button><button data-delete-file="${escapeHtml(file.id)}" class="px-3 py-2 rounded-lg border border-red-500/20 text-xs text-red-400 hover:bg-red-500/10">Delete</button></div>
    </div>`;
  }).join("")}</div>` : emptyState("No secure files have been uploaded yet.");
  document.querySelectorAll("[data-view-file]").forEach(b=>b.onclick=()=>openSecureFile(fileById(b.dataset.viewFile)));
  document.querySelectorAll("[data-manage-file]").forEach(b=>b.onclick=()=>manageFileAccess(fileById(b.dataset.manageFile)));
  document.querySelectorAll("[data-delete-file]").forEach(b=>b.onclick=()=>deleteAdminFile(fileById(b.dataset.deleteFile)));
}

function runSearch(term) {
  term = term.trim().toLowerCase();
  if (!term) { if (currentPanel === "Search") closePanel(); return; }
  setActiveNav(""); setPanel("Search", "Global search");
  const users = adminUsers.filter(u=>(u.email||"").toLowerCase().includes(term));
  const files = adminFiles.filter(f=>[f.fileName,f.email,f.userId].some(v=>String(v||"").toLowerCase().includes(term)));
  const events = adminEvents.filter(e=>[e.email,e.action,e.status].some(v=>String(v||"").toLowerCase().includes(term)));
  $("panelContent").innerHTML = `<div class="space-y-6">
    <div><p class="text-[10px] uppercase tracking-widest text-slate-600 mb-3">Users (${users.length})</p>${users.length?users.map(u=>userCard(u,String(u.role||"USER").toUpperCase())).join(""):emptyState("No users matched.")}</div>
    <div><p class="text-[10px] uppercase tracking-widest text-slate-600 mb-3">Files (${files.length})</p>${files.length?files.map(f=>`<button data-search-file="${escapeHtml(f.id)}" class="w-full text-left mb-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4 hover:bg-slate-800/40"><p class="text-sm text-white">${escapeHtml(f.fileName||"Untitled file")}</p><p class="text-[11px] text-slate-500 mt-1">${escapeHtml(f.email||userById(f.userId)?.email||"Unknown")}</p></button>`).join(""):emptyState("No files matched.")}</div>
    <div><p class="text-[10px] uppercase tracking-widest text-slate-600 mb-3">Security events (${events.length})</p>${events.length?events.slice(0,30).map(e=>`<div class="mb-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4"><p class="text-sm text-white">${escapeHtml(e.action||"Security event")}</p><p class="text-[11px] text-slate-500 mt-1">${escapeHtml(e.email||"Unknown")} · ${escapeHtml(e.status||"")}</p></div>`).join(""):emptyState("No security events matched.")}</div>
  </div>`;
  document.querySelectorAll("[data-search-file]").forEach(b=>b.onclick=()=>openSecureFile(fileById(b.dataset.searchFile)));
}

function openSection(type) {
  closePanel();
  if (type === "dashboard") { setActiveNav("nav-dashboard"); window.scrollTo({top:0,behavior:"smooth"}); return; }
  const map = { profile:["My Profile","Overview",renderProfile,"nav-profile"], alerts:["Security Alerts","Security",renderAlerts,"nav-alerts"], logs:["Activity Logs","Security",renderLogs,"nav-logs"], tests:["Security Tests","Security",renderTests,"nav-tests"], users:["User Management","Management",renderUsers,"nav-users"], files:["Secure Files","Management",renderFilesPanel,"nav-files"] };
  const item = map[type]; if (!item) return;
  setActiveNav(item[3]); setPanel(item[0], item[1]); setPanelLoading(); item[2]();
}

function bindNavigation() {
  const actions = {"nav-dashboard":"dashboard","nav-profile":"profile","nav-alerts":"alerts","nav-logs":"logs","nav-tests":"tests","nav-users":"users","nav-files":"files"};
  Object.entries(actions).forEach(([id,type])=>$(id)?.addEventListener("click",e=>{e.preventDefault();openSection(type);}));
  $("panelClose").addEventListener("click",closePanel);
  $("panelBackdrop").addEventListener("click",closePanel);
  $("fileModalClose").addEventListener("click",()=>$("fileAccessModal").classList.add("hidden"));
  $("fileModalBackdrop").addEventListener("click",()=>$("fileAccessModal").classList.add("hidden"));
  $("logoutBtn").addEventListener("click",async()=>{await signOut(auth);location.href="index.html";});
  $("bellBtn").addEventListener("click",()=>openSection("alerts"));
  $("themeBtn").addEventListener("click",()=>{
    document.body.classList.toggle("theme-soft");
    localStorage.setItem("cloudshield-theme-soft",document.body.classList.contains("theme-soft")?"1":"0");
  });
  if(localStorage.getItem("cloudshield-theme-soft")==="1") document.body.classList.add("theme-soft");
  let searchTimer;
  $("globalSearch").addEventListener("input",e=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>runSearch(e.target.value),180);});
  $("globalSearch").addEventListener("keydown",e=>{if(e.key==="Escape"){e.target.value="";closePanel();setActiveNav("nav-dashboard");}});
}

async function init() {
  bindNavigation();
  if (window.lucide) lucide.createIcons();
  onAuthStateChanged(auth, async user => {
    if (!user) { location.href="index.html"; return; }
    $("userEmail").textContent = user.email || "";
    try {
      const snap = await getDoc(doc(db,"users",user.uid));
      if (!snap.exists() || snap.data().role !== "admin") { location.href="employee-dashboard.html"; return; }
      $("userRole").textContent = "ADMIN";
      await loadAdminData();
    } catch(e) {
      console.error("Could not load admin dashboard:",e);
      alert("Could not load CloudShield security data. Check Firestore permissions.");
    }
  });
}

const style = document.createElement("style");
style.textContent = `.theme-soft{filter:saturate(.82) brightness(1.08)} .theme-soft main{background-color:#080e1a} .theme-soft header{background-color:rgba(11,18,32,.92)!important}`;
document.head.appendChild(style);
init();
