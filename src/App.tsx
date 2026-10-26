import { useEffect, useMemo, useState } from "react";
import seed from "../db.json";
import { AdminAuditView } from "./components/AdminAuditView";
import { AdminSopView } from "./components/AdminSopView";
import { StaffChecklistView } from "./components/StaffChecklistView";
import { StaffHistoryView } from "./components/StaffHistoryView";
import { SuccessSummaryView } from "./components/SuccessSummaryView";
import type { ClosingReport, Database, PhotoEvidence } from "./types";
import { compressImage, uploadPhoto } from "./utils/googleDrive";

const KEY = "daily-close-fnb-react-v1";
const SESSION_KEY = "daily-close-fnb-session-v1";
const DATABASE_UPDATED_EVENT = "daily-close-database-updated";
const API_BASE = "http://localhost:3001";
const dateNow = () => new Date().toISOString().slice(0, 10);
const timeNow = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
};
async function requestError(response: Response, fallback: string) {
  try {
    const body = await response.json() as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}
function loadDatabase(): Database {
  const stored = JSON.parse(localStorage.getItem(KEY) || "null") as Partial<Database> | null;
  const source = stored || seed as unknown as Database;
  const categories = ((source.categories || seed.categories) as Array<Record<string, unknown>>).map((category, index) => ({
    id: typeof category.id === "string" ? category.id : `category-${index + 1}`,
    name: typeof category.name === "string" ? category.name : `Area ${index + 1}`,
    icon: typeof category.icon === "string" ? category.icon : "Store",
    active: category.active !== false
  }));
  const tasks = ((source.tasks || seed.tasks) as unknown as Array<Record<string, unknown>>).map((task, index) => {
    const legacyCategory = typeof task.category === "string" ? task.category : "";
    const categoryId = typeof task.categoryId === "string" ? task.categoryId : categories.find(category => category.id === legacyCategory || category.name.toLowerCase() === legacyCategory.toLowerCase())?.id;
    return {
      id: typeof task.id === "string" ? task.id : `task-${index + 1}`,
      text: typeof task.text === "string" ? task.text : "",
      categoryId: categoryId || categories[0]?.id || "dapur",
      active: task.active !== false
    };
  });
  return {
    staff: (source.staff || seed.staff) as Database["staff"],
    categories,
    tasks,
    reports: (source.reports || []) as Database["reports"]
  };
}
interface SavedSession {
  date: string;
  picId: string;
  completed: string[];
  photos: PhotoEvidence[];
  success: ClosingReport | null;
}
function loadSession(): SavedSession {
  const fallback: SavedSession = { date: dateNow(), picId: "", completed: [], photos: [], success: null };
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null") as Partial<SavedSession> | null;
    if (!saved || saved.date !== dateNow()) return fallback;
    return {
      date: saved.date,
      picId: saved.picId || "",
      completed: Array.isArray(saved.completed) ? saved.completed : [],
      photos: Array.isArray(saved.photos) ? saved.photos : [],
      success: saved.success || null
    };
  } catch {
    return fallback;
  }
}
export default function App() {
  const [db, setDb] = useState<Database>(loadDatabase);
  const [backendReady, setBackendReady] = useState(false);
  const savedSession = useMemo(loadSession, []);
  const [mode, setMode] = useState<"staff" | "admin">(window.location.pathname === "/admin" ? "admin" : "staff"); const [tab, setTab] = useState<"audit" | "sop">("audit"); const [staffTab, setStaffTab] = useState<"closing" | "history">("closing"); const [picId, setPicId] = useState(savedSession.picId); const [completed, setCompleted] = useState<string[]>(savedSession.completed); const [photos, setPhotos] = useState<PhotoEvidence[]>(savedSession.photos); const [uploading, setUploading] = useState<string | null>(null); const [success, setSuccess] = useState<ClosingReport | null>(savedSession.success); const [toast, setToast] = useState("");
  const [adminPassword, setAdminPassword] = useState(""); const [adminAuthenticated, setAdminAuthenticated] = useState(false); const [adminLoginError, setAdminLoginError] = useState("");
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(db)), [db]);
  useEffect(() => {
    let cancelled = false;
    const loadFromBackend = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/bootstrap`);
        if (!response.ok) throw new Error("Backend tidak merespons.");
        const data = await response.json() as Database;
        if (!cancelled) {
          setDb(data);
          setBackendReady(true);
        }
      } catch {
        if (!cancelled) setBackendReady(false);
      }
    };
    loadFromBackend();
    const timer = window.setInterval(loadFromBackend, 2000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);
  useEffect(() => {
    const syncDatabase = (event: StorageEvent) => {
      if (event.key !== KEY) return;
      setDb(loadDatabase());
    };
    const syncWhenVisible = () => setDb(loadDatabase());
    const syncFromSameTab = () => setDb(loadDatabase());
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(DATABASE_UPDATED_EVENT) : null;
    const syncFromChannel = () => syncFromSameTab();
    window.addEventListener("storage", syncDatabase);
    window.addEventListener("focus", syncWhenVisible);
    window.addEventListener(DATABASE_UPDATED_EVENT, syncFromSameTab);
    channel?.addEventListener("message", syncFromChannel);
    const refreshTimer = window.setInterval(syncWhenVisible, 1000);
    return () => {
      window.removeEventListener("storage", syncDatabase);
      window.removeEventListener("focus", syncWhenVisible);
      window.removeEventListener(DATABASE_UPDATED_EVENT, syncFromSameTab);
      channel?.removeEventListener("message", syncFromChannel);
      channel?.close();
      window.clearInterval(refreshTimer);
    };
  }, []);
  useEffect(() => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ date: dateNow(), picId, completed, photos, success }));
  }, [picId, completed, photos, success]);
  const categories = db.categories; const staff = db.staff; const activePic = staff.find(person => person.id === picId);
  const activeCategoryIds = new Set(categories.filter(category => category.active).map(category => category.id));
  const activeTasks = db.tasks.filter(task => task.active && activeCategoryIds.has(task.categoryId));
  const completedActiveTaskIds = completed.filter(id => activeTasks.some(task => task.id === id));
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2200); };
  const takePhoto = async (files: File[]) => { if (!activePic) return; try { const prepared = await Promise.all(files.map(async file => ({ localUrl: await compressImage(file, activePic.name, timeNow()), time: timeNow(), uploaded: false }))); setPhotos(current => [...current, ...prepared]); notify(`${prepared.length} pratinjau foto siap. Periksa sebelum dikirim.`); } catch (error) { notify(error instanceof Error ? error.message : "Foto tidak dapat diproses."); } };
  const submit = async () => {
    if (!activePic || completedActiveTaskIds.length !== activeTasks.length || !photos.length || uploading) return;
    setUploading("submit");
    try {
      const uploadPhotos = async (items: PhotoEvidence[]) => Promise.all(items.map(async (photo, index) => {
        if (photo.uploaded && photo.imageUrl && photo.viewUrl) return photo;
        const remote = await uploadPhoto(photo.localUrl, `${dateNow()}-bukti-${index + 1}-${activePic.name.replace(/\s+/g, "-")}.jpg`);
        return { ...photo, ...remote, uploaded: true };
      }));
      const uploadedPhotos = await uploadPhotos(photos);
      const report: ClosingReport = { id: `report-${Date.now()}`, date: dateNow(), staffId: activePic.id, staffName: activePic.name, submitTime: timeNow(), completedTaskIds: completedActiveTaskIds, completedTaskNames: db.tasks.filter(task => completedActiveTaskIds.includes(task.id)).map(task => task.text), photos: uploadedPhotos };
      const response = await fetch(`${API_BASE}/api/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(report) });
      if (!response.ok) throw new Error(await requestError(response, "Riwayat closing gagal disimpan."));
      setPhotos(uploadedPhotos);
      setDb(current => ({ ...current, reports: [report, ...current.reports] })); setSuccess(report);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Sebagian foto gagal dikirim. Silakan coba lagi.");
    } finally { setUploading(null); }
  };
  const reset = () => { setSuccess(null); setPicId(""); setCompleted([]); setPhotos([]); };
  const closingView = success ? <SuccessSummaryView report={success} onHome={reset} /> : <StaffChecklistView date={dateNow()} staff={staff} categories={categories} tasks={db.tasks} picId={picId} completed={completed} photos={photos} uploading={uploading} open={{ dapur: true, depan: true, kasir: true }} onPic={setPicId} onToggle={id => setCompleted(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])} onPhoto={takePhoto} onOpen={() => undefined} onDraft={() => notify("Progres draft berhasil disimpan")} onSubmit={submit} staffTab={staffTab} onStaffTab={setStaffTab} historyView={<StaffHistoryView reports={db.reports} />} />; 
  const staffView = closingView;
  const updateDatabase = (next: Database) => {
    setDb(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(DATABASE_UPDATED_EVENT));
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(DATABASE_UPDATED_EVENT);
      channel.postMessage({ updatedAt: Date.now() });
      channel.close();
    }
  };
  const updateCategories = async (nextCategories: Database["categories"]) => {
    const added = nextCategories.filter(category => !categories.some(previous => previous.id === category.id));
    const changed = nextCategories.filter(category => categories.find(previous => previous.id === category.id)?.active !== category.active);
    try {
      await Promise.all(added.map(async category => {
        const response = await fetch(`${API_BASE}/api/categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(category) });
        if (!response.ok) throw new Error(await requestError(response, "Area gagal disimpan ke database."));
      }));
      await Promise.all(changed.map(async category => {
        const response = await fetch(`${API_BASE}/api/categories/${encodeURIComponent(category.id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: category.active }) });
        if (!response.ok) throw new Error(await requestError(response, "Status area gagal disimpan ke database."));
      }));
      updateDatabase({ ...db, categories: nextCategories });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Status area gagal disimpan.");
    }
  };
  const updateStaff = async (nextStaff: Database["staff"]) => {
    const added = nextStaff.filter(person => !staff.some(previous => previous.id === person.id));
    try {
      await Promise.all(added.map(async person => {
        const response = await fetch(`${API_BASE}/api/staff`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(person) });
        if (!response.ok) throw new Error(await requestError(response, "PIC gagal disimpan ke database."));
      }));
      updateDatabase({ ...db, staff: nextStaff });
    } catch (error) { notify(error instanceof Error ? error.message : "PIC gagal disimpan."); }
  };
  const adminView = !adminAuthenticated ? <div className="mx-auto flex min-h-screen max-w-md items-center px-4"><form className="card w-full bg-white shadow-sm" onSubmit={event => { event.preventDefault(); if (adminPassword === "admin12") { setAdminAuthenticated(true); setAdminLoginError(""); } else { setAdminLoginError("Sandi admin salah."); } }}><h1 className="mb-1 text-2xl font-black">Login Admin</h1><p className="mb-4 text-sm text-slate-500">Masukkan sandi untuk mengakses halaman admin.</p><label className="mb-2 block text-[11px] font-black text-slate-600" htmlFor="admin-password">SANDI ADMIN</label><input id="admin-password" autoFocus type="password" value={adminPassword} onChange={event => { setAdminPassword(event.target.value); setAdminLoginError(""); }} className="mb-3 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:border-amber-500" placeholder="Masukkan sandi" /><button className="btn w-full bg-amber-500 text-white" type="submit">Masuk</button>{adminLoginError && <p className="mt-2 text-center text-xs font-bold text-red-600">{adminLoginError}</p>}</form></div> : <div className="mx-auto min-h-screen max-w-md px-4 pt-4">{tab === "audit" ? <AdminAuditView reports={db.reports} onTab={setTab} /> : <AdminSopView tasks={db.tasks} categories={categories} staff={db.staff} onChange={tasks => updateDatabase({ ...db, tasks })} onStaffChange={updateStaff} onCategoriesChange={updateCategories} onTab={setTab} />}</div>;
  return <>{mode === "staff" ? <div className="mx-auto min-h-screen max-w-md px-4 pt-4">{staffView}</div> : adminView}{!backendReady && <div className="fixed top-0 left-0 right-0 z-40 bg-red-600 px-3 py-1 text-center text-[10px] font-bold text-white">Backend MySQL tidak terhubung</div>}{toast && <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-[#0B1F3A] px-4 py-3 text-xs font-bold text-white">{toast}</div>}</>;
}
