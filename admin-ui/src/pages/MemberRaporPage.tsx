import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { apiGet } from '../lib/api'

interface Entry { instance_title: string; period_label: string; token: string; scores: number[]; activity_start: string; activity_end: string }
interface Member { FullName: string; Department: string; ProgramStudi: string; NIM: string; PhotoURL: string }
interface RaporData { member: Member; entries: Entry[]; chartData: { labels: string[]; scores: number[][] }; aspectLabels: string[] }

export default function MemberRaporPage() {
  const { id } = useParams<{id:string}>()
  const navigate = useNavigate()
  const [data, setData] = useState<RaporData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet(`/rapor/api/member/${id}`)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setLoading(false); navigate('/rapor') })
  }, [id])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50"><div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" /></div>
  if (!data) return null

  const { member, entries, chartData, aspectLabels } = data

  return (
    <div style={{background:'linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 50%,#f0fdf4 100%)',minHeight:'100vh',fontFamily:'Plus Jakarta Sans,sans-serif'}} className="pb-16">
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur rounded-full px-4 py-2 text-sm text-green-700 font-medium shadow-sm mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"/></svg>
            PKSE UGM
          </div>
          <h1 className="text-2xl font-bold text-green-900">Rapor Saya</h1>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-4">
            {member.PhotoURL ? <img src={member.PhotoURL} className="w-14 h-14 rounded-full object-cover border-2 border-green-200" /> : (
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl font-bold border-2 border-green-200">{member.FullName[0]}</div>
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900">{member.FullName}</h2>
              <p className="text-sm text-gray-500">{member.Department} · {member.ProgramStudi}</p>
              {member.NIM && <p className="text-xs text-gray-400 mt-0.5">NIM: {member.NIM}</p>}
            </div>
          </div>
        </div>

        {entries.length > 0 && chartData.scores.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h3 className="font-bold text-gray-900 mb-3">Perbandingan Skor</h3>
            <div className="h-64">
              <canvas id="scoreChart" />
            </div>
          </div>
        )}

        <h3 className="font-bold text-gray-700 mb-3">Daftar Rapor</h3>
        <div className="space-y-2">
          {entries.map(e => (
            <Link key={e.token} to={`/rapor/t/${e.token}`} className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{e.instance_title}</h4>
                  <p className="text-xs text-gray-500">{e.period_label} · {e.activity_start} — {e.activity_end}</p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Lihat Detail →</span>
              </div>
            </Link>
          ))}
        </div>

        {entries.length === 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <h3 className="text-lg font-bold text-gray-700 mb-1">Belum Ada Rapor</h3>
            <p className="text-sm text-gray-500">Rapor Anda belum tersedia.</p>
          </div>
        )}

        <div className="text-center mt-8">
          <Link to="/rapor" className="text-sm text-green-600 hover:underline">← Cari anggota lain</Link>
        </div>
      </div>
      <ChartScript labels={chartData.labels} scores={chartData.scores} aspectLabels={aspectLabels} />
    </div>
  )
}

function ChartScript({ labels, scores, aspectLabels }: { labels: string[]; scores: number[][]; aspectLabels: string[] }) {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
    script.onload = () => {
      const colors = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316']
      const maxLen = Math.max(...scores.map(s => s.length))
      const datasets = []
      for (let a = 0; a < maxLen; a++) {
        datasets.push({
          label: aspectLabels[a] || `Aspek ${a+1}`,
          data: labels.map((_, i) => (scores[i] || [])[a] || 0),
          borderColor: colors[a % colors.length],
          backgroundColor: colors[a % colors.length] + '20',
          tension: 0.3, pointRadius: 4, fill: false,
        })
      }
      // @ts-ignore
      new (window as any).Chart(document.getElementById('scoreChart'), {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { y: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } } },
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } },
        },
      })
    }
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])
  return null
}
