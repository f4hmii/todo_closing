import type { ClosingReport } from "../types";

const formatReportDate = (value: string) => {
  const dateValue = value.includes("T") ? value : `${value}T12:00:00`;
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
};

export function StaffHistoryView({ reports }: { reports: ClosingReport[] }) {
  return <div className="space-y-3 pb-8">
    <div>
      <h1 className="text-2xl font-black">Riwayat Closing</h1>
      <p className="text-sm text-slate-500">Laporan closing yang sudah dikunci.</p>
    </div>
    {reports.length === 0 ? <div className="card text-center text-sm text-slate-500">Belum ada riwayat closing.</div> : reports.map(report => <article className="rounded-xl border border-slate-200 bg-white p-3" key={report.id}>
      <div className="flex items-start justify-between gap-2">
        <div><b className="text-sm">{formatReportDate(report.date)}</b><p className="text-[11px] text-slate-500">{report.staffName} · {report.submitTime} WIB</p></div>
        <span className="rounded bg-emerald-100 px-2 py-1 text-[9px] font-black text-emerald-700">Terkunci</span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1">{report.photos.map((photo, index) => <img className="h-16 w-full rounded object-cover" key={index} src={photo.imageUrl || photo.localUrl} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = photo.localUrl; }} alt={`Bukti foto ${index + 1}`} />)}</div>
      <p className="mt-2 text-[10px] font-bold text-slate-500">{report.completedTaskIds.length} checklist selesai · {report.photos.length} foto bukti</p>
    </article>)}
  </div>;
}
