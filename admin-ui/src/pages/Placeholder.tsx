export default function PlaceholderPage({ title }: { title: string }) {
  return function Page() {
    return (
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">{title}</h2>
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-slate-400">
          Halaman {title.toLowerCase()} belum di-migrasi ke Vite. Gunakan menu di sidebar.
        </div>
      </div>
    )
  }
}
