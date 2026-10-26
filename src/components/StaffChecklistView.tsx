import { Camera, Check, ChevronDown, LockKeyhole, UploadCloud } from "lucide-react";
import type { ReactNode } from "react";
import type { Category, PhotoEvidence, Staff, TaskItem } from "../types";

interface Props {
  date: string; staff: Staff[]; categories: Category[]; tasks: TaskItem[];
  picId: string; completed: string[]; photos: PhotoEvidence[];
  open: Record<string, boolean>; uploading: string | null; onPic: (id: string) => void;
  onToggle: (id: string) => void; onPhoto: (files: File[]) => void;
  onOpen: (id: string, value: boolean) => void; onDraft: () => void; onSubmit: () => void;
  staffTab: "closing" | "history"; onStaffTab: (tab: "closing" | "history") => void; historyView: ReactNode;
}
const prettyDate = (value: string) => new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`)).toUpperCase();

export function StaffChecklistView({ date, staff, categories, tasks, picId, completed, photos, open, uploading, onPic, onToggle, onPhoto, onOpen, onDraft, onSubmit, staffTab, onStaffTab, historyView }: Props) {
  const activeCategoryIds = new Set(categories.filter(category => category.active).map(category => category.id));
  const active = tasks.filter(task => task.active && activeCategoryIds.has(task.categoryId));
  const visibleCategories = categories
    .filter(category => category.active)
    .map(category => ({ category, tasks: active.filter(task => task.categoryId === category.id) }))
    .filter(({ tasks: categoryTasks }) => categoryTasks.length > 0);
  const done = active.filter(task => completed.includes(task.id)).length;
  const ready = active.length > 0 && done === active.length && photos.length > 0;
  return <div className="space-y-3 pb-32">
    <div className="flex items-start justify-between"><h1 className="text-[27px] font-black leading-[1.08]"><span className="text-amber-600">NGOLAB</span> Closing<br />Checklist</h1><span className="rounded-lg border-2 border-amber-500 px-2 py-1 text-[10px] font-black text-amber-700">{prettyDate(date)}</span></div>
    <section className="card"><label className="mb-2 block text-[11px] font-black text-slate-600">PILIH PIC HARI INI (WAJIB) *</label><select className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:border-amber-500" value={picId} onChange={event => onPic(event.target.value)}><option value="">Pilih nama karyawan...</option>{staff.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select>{!picId && <p className="mt-2 text-xs font-bold text-amber-700">Silakan pilih nama PIC terlebih dahulu untuk memulai closing.</p>}</section>
    <section className="card"><div className="mb-2 flex justify-between text-[10px] font-black text-slate-600"><span>PROGRES CLOSING: {done} DARI {active.length} TUGAS SELESAI</span><span>{active.length ? Math.round(done / active.length * 100) : 0}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-300"><div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${active.length ? done / active.length * 100 : 0}%` }} /></div></section>
    <nav className="flex gap-5 border-b border-slate-200"><button className={`border-b-2 px-1 pb-2 text-xs font-black ${staffTab === "closing" ? "border-amber-500 text-amber-600" : "border-transparent text-slate-500"}`} onClick={() => onStaffTab("closing")}>Closing Hari Ini</button><button className={`border-b-2 px-1 pb-2 text-xs font-black ${staffTab === "history" ? "border-amber-500 text-amber-600" : "border-transparent text-slate-500"}`} onClick={() => onStaffTab("history")}>Riwayat Closing</button></nav>
    {staffTab === "history" ? historyView : <>{!picId && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">Pilih PIC untuk membuka checklist dan kamera.</div>}
    <div className={!picId ? "pointer-events-none opacity-50" : ""}>{visibleCategories.map(({ category, tasks: categoryTasks }) => {
      const categoryDone = categoryTasks.filter(task => completed.includes(task.id)).length;
      return <details key={category.id} open={open[category.id]} onToggle={event => onOpen(category.id, event.currentTarget.open)} className="mb-2 overflow-hidden rounded-xl bg-[#E3ECF5]"><summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2.5"><span className="flex-1"><b className="block text-xs capitalize">{category.name}</b><small className="text-[10px] text-slate-500">{categoryDone} dari {categoryTasks.length} selesai</small></span><ChevronDown size={16} /></summary><div className="px-2 pb-2">{categoryTasks.map(task => <button key={task.id} disabled={!picId} onClick={() => onToggle(task.id)} className={`flex w-full items-center gap-2 border-t border-slate-300 px-2.5 py-2 text-left text-xs ${completed.includes(task.id) ? "rounded-lg bg-[#D1FAE5]" : ""}`}><span className={`grid h-4 w-4 place-items-center rounded-sm border-2 ${completed.includes(task.id) ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-400 bg-white"}`}>{completed.includes(task.id) && <Check size={11} />}</span>{task.text}</button>)}</div></details>;
    })}</div>
    <section className={!picId ? "pointer-events-none opacity-50" : ""}><div className="mb-2 flex items-center justify-between"><h2 className="text-lg font-black">Bukti Foto Wajib</h2><span className="rounded-md bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800">Bisa lebih dari 1 foto</span></div><PhotoBox title="Bukti foto closing" photos={photos} uploading={Boolean(uploading)} onPhoto={onPhoto} /></section>
    <p className="rounded-xl border border-slate-200 bg-slate-100 p-3 text-[11px] leading-relaxed text-slate-600">Laporan yang sudah dikirim tidak dapat diubah kembali. Pastikan semua data sudah sesuai dengan standar operasional outlet.</p>
    <div className="fixed bottom-0 left-1/2 z-10 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white p-3 shadow-lg"><p className={`mb-2 text-center text-[10px] font-bold text-slate-500 ${ready ? "hidden" : ""}`}>🔴 Selesaikan semua centang & foto untuk mengirim</p><div className="grid grid-cols-[.8fr_1.6fr] gap-2"><button className="btn bg-slate-100 text-[#0B1F3A]" onClick={onDraft}>Draft</button><button className="btn bg-amber-500 text-white" disabled={!ready || Boolean(uploading)} onClick={onSubmit}>{uploading ? <><UploadCloud className="mr-1 inline animate-bounce" size={14} /> Mengirim foto...</> : <><LockKeyhole className="mr-1 inline" size={14} /> KUNCI & KIRIM LAPORAN</>}</button></div></div></>}
  </div>;
}
function PhotoBox({ title, photos, uploading, onPhoto }: { title: string; photos: PhotoEvidence[]; uploading: boolean; onPhoto: (files: File[]) => void }) {
  return <div className="grid grid-cols-2 items-start gap-1">{photos.map((photo, index) => <div className="h-24 overflow-hidden rounded-xl border border-amber-300 bg-white" key={`bukti-${index}`}><div className="relative h-full"><span className="absolute left-1 top-1 z-10 rounded bg-amber-100 px-1 py-0.5 text-[8px] font-black text-amber-700">Pratinjau</span><img className="h-full w-full object-cover" src={photo.localUrl} alt={`${title} ${index + 1}`} /></div></div>)}<label className={`flex h-24 ${photos.length === 0 ? "col-span-2" : ""} cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-400 bg-white text-center text-[10px] font-bold text-slate-500 ${uploading ? "pointer-events-none opacity-50" : ""}`}><Camera size={18} /><span>Tambah foto</span><input className="hidden" type="file" accept="image/*" capture="environment" multiple disabled={uploading} onChange={event => { if (event.target.files?.length) onPhoto(Array.from(event.target.files)); event.currentTarget.value = ""; }} /></label></div>;
}
