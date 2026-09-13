/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Pencil, Trash2, RefreshCw, GripVertical } from 'lucide-react'
import Sortable from 'sortablejs'

// ── Shared stat helpers (ported 1:1 from static/admin-common.js) ──────────────

export const CHART_CHOICES = [
  { value: 'bar', label: 'Bar' },
  { value: 'line', label: 'Line' },
  { value: 'pie', label: 'Pie' },
  { value: 'doughnut', label: 'Doughnut' },
  { value: 'area', label: 'Area' },
  { value: 'radar', label: 'Radar' },
  { value: 'scatter', label: 'Scatter' },
  { value: 'bubble', label: 'Bubble' },
  { value: 'polar', label: 'Polar' },
  { value: 'histogram', label: 'Histogram' },
  { value: 'stacked_bar', label: 'Stacked Bar' },
  { value: 'grouped_bar', label: 'Grouped Bar' },
  { value: 'funnel', label: 'Funnel' },
  { value: 'heatmap', label: 'Heatmap' },
  { value: 'kpi', label: 'KPI Card' },
  { value: 'table', label: 'Table' },
]

export type StatMode = 'single' | 'xy' | 'series'
export interface StatPoint { label: string; value: number; x: number; y: number; r: number }
export interface StatRow { label: string; value: string; x: string; y: string }

/** Mode of the value editor for a chart type: kpi = single number, scatter/bubble = XY points, else label+value series. */
export function statChartMode(chartType: string): StatMode {
  const t = String(chartType || '').toLowerCase()
  if (t === 'kpi') return 'single'
  if (t === 'scatter' || t === 'bubble') return 'xy'
  return 'series'
}

/** Deserialise the stored string `value`. Primary format is a JSON array; legacy "label:value;..." / "x,y;..." / bare number are also accepted. */
export function parseStatInputValue(raw: string, chartType: string): { mode: StatMode; single: string; points: StatPoint[] } {
  const txt = String(raw || '').trim()
  const mode = statChartMode(chartType)
  if (!txt) return { mode, single: '', points: [] }
  if (mode === 'single') return { mode, single: txt, points: [] }
  try {
    const parsed = JSON.parse(txt)
    if (!Array.isArray(parsed)) return { mode, single: txt, points: [] }
    const points: StatPoint[] = parsed.map((item: any) => ({
      label: String(item?.label ?? '').trim(),
      value: Number(item?.value),
      x: Number(item?.x),
      y: Number(item?.y),
      r: Number(item?.r),
    }))
    return { mode, single: '', points }
  } catch {
    if (mode === 'xy') {
      const points = txt.split(/[;\n]+/).map((line, idx) => {
        const [xRaw, yRaw] = line.split(',').map(v => String(v || '').trim())
        const x = Number(xRaw); const y = Number(yRaw)
        if (Number.isNaN(x) || Number.isNaN(y)) return null
        return { label: `Titik ${idx + 1}`, value: NaN, x, y, r: 6 }
      }).filter(Boolean) as StatPoint[]
      return { mode, single: '', points }
    }
    const pairs = txt.split(/[;\n]+/).map(line => {
      const [labelRaw, valueRaw] = line.split(':')
      const label = String(labelRaw || '').trim()
      const value = Number(String(valueRaw || '').trim())
      if (!label || Number.isNaN(value)) return null
      return { label, value, x: NaN, y: NaN, r: NaN }
    }).filter(Boolean) as StatPoint[]
    if (pairs.length) return { mode, single: '', points: pairs }
    const singleNumeric = Number(txt)
    if (!Number.isNaN(singleNumeric)) return { mode, single: '', points: [{ label: 'Nilai', value: singleNumeric, x: NaN, y: NaN, r: NaN }] }
    return { mode, single: txt, points: [] }
  }
}

/** Short human summary of a stored value (used in tables). */
export function statValuePreview(raw: string, chartType: string): string {
  const parsed = parseStatInputValue(raw, chartType)
  if (parsed.mode === 'single') return String(parsed.single || '-')
  if (!parsed.points.length) return '-'
  if (parsed.mode === 'xy') return `${parsed.points.length} titik koordinat`
  if (parsed.points.length === 1) return `${parsed.points[0].label}: ${parsed.points[0].value}`
  return `${parsed.points.length} baris data`
}

/** Editable rows (strings) from stored points. */
export function pointsToRows(points: StatPoint[]): StatRow[] {
  const rows = points.map(p => ({
    label: p.label || '',
    value: Number.isFinite(p.value) ? String(p.value) : '',
    x: Number.isFinite(p.x) ? String(p.x) : '',
    y: Number.isFinite(p.y) ? String(p.y) : '',
  }))
  return rows.length ? rows : [{ label: '', value: '', x: '', y: '' }]
}

/** Serialise editor state to the string stored in `value`. Throws with an Indonesian message on validation error (same as old collectStatInputValue). */
export function collectStatInputValue(chartType: string, single: string, rows: StatRow[]): string {
  const mode = statChartMode(chartType)
  if (mode === 'single') return String(single || '').trim()
  if (!rows.length) throw new Error('Tambahkan minimal 1 baris data.')
  if (mode === 'xy') {
    const points = rows.map((row, idx) => {
      const label = (row.label || '').trim() || `Titik ${idx + 1}`
      const x = Number(row.x); const y = Number(row.y)
      if (row.x.trim() === '' || row.y.trim() === '' || Number.isNaN(x) || Number.isNaN(y)) {
        throw new Error(`Baris ${idx + 1} harus punya nilai X dan Y numerik.`)
      }
      const point: any = { label, x, y }
      if (String(chartType).toLowerCase() === 'bubble') point.r = 6
      return point
    })
    return JSON.stringify(points)
  }
  const points = rows.map((row, idx) => {
    const label = (row.label || '').trim()
    const value = Number(row.value)
    if (!label || row.value.trim() === '' || Number.isNaN(value)) {
      throw new Error(`Baris ${idx + 1} harus punya label dan nilai numerik.`)
    }
    return { label, value }
  })
  return JSON.stringify(points)
}

const CHART_ICON_SVG: Record<string, string> = {
  bar: '<svg viewBox="0 0 100 56" class="w-full h-10"><rect x="8" y="28" width="14" height="20" rx="2" fill="#2563eb"/><rect x="30" y="20" width="14" height="28" rx="2" fill="#60a5fa"/><rect x="52" y="12" width="14" height="36" rx="2" fill="#93c5fd"/><rect x="74" y="24" width="14" height="24" rx="2" fill="#1d4ed8"/></svg>',
  line: '<svg viewBox="0 0 100 56" class="w-full h-10"><polyline points="6,40 24,30 42,34 60,16 78,22 94,10" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="30" r="2.5" fill="#60a5fa"/><circle cx="60" cy="16" r="2.5" fill="#60a5fa"/></svg>',
  pie: '<svg viewBox="0 0 100 56" class="w-full h-10"><circle cx="50" cy="28" r="18" fill="#dbeafe"/><path d="M50 28 L50 10 A18 18 0 0 1 66.5 35 Z" fill="#2563eb"/><path d="M50 28 L66.5 35 A18 18 0 0 1 36 41 Z" fill="#60a5fa"/></svg>',
  doughnut: '<svg viewBox="0 0 100 56" class="w-full h-10"><circle cx="50" cy="28" r="18" fill="none" stroke="#dbeafe" stroke-width="10"/><circle cx="50" cy="28" r="18" fill="none" stroke="#2563eb" stroke-width="10" stroke-dasharray="72 44" transform="rotate(-90 50 28)"/></svg>',
  area: '<svg viewBox="0 0 100 56" class="w-full h-10"><path d="M6 44 L24 30 L42 34 L60 16 L78 22 L94 12 L94 48 L6 48 Z" fill="#bfdbfe"/><polyline points="6,44 24,30 42,34 60,16 78,22 94,12" fill="none" stroke="#2563eb" stroke-width="2.5"/></svg>',
  radar: '<svg viewBox="0 0 100 56" class="w-full h-10"><polygon points="50,10 68,20 64,40 36,40 32,20" fill="#dbeafe" stroke="#93c5fd"/><polygon points="50,16 62,23 58,35 42,35 38,23" fill="#60a5fa" fill-opacity="0.55" stroke="#2563eb"/></svg>',
  scatter: '<svg viewBox="0 0 100 56" class="w-full h-10"><circle cx="16" cy="38" r="3" fill="#2563eb"/><circle cx="30" cy="28" r="3" fill="#60a5fa"/><circle cx="44" cy="34" r="3" fill="#3b82f6"/><circle cx="58" cy="18" r="3" fill="#1d4ed8"/><circle cx="72" cy="24" r="3" fill="#93c5fd"/><circle cx="86" cy="14" r="3" fill="#2563eb"/></svg>',
  bubble: '<svg viewBox="0 0 100 56" class="w-full h-10"><circle cx="22" cy="34" r="7" fill="#93c5fd"/><circle cx="44" cy="26" r="10" fill="#60a5fa"/><circle cx="66" cy="20" r="13" fill="#3b82f6"/><circle cx="82" cy="30" r="8" fill="#1d4ed8"/></svg>',
  polar: '<svg viewBox="0 0 100 56" class="w-full h-10"><circle cx="50" cy="28" r="18" fill="none" stroke="#cbd5e1"/><path d="M50 28 L50 10 A18 18 0 0 1 66 34 Z" fill="#2563eb"/><path d="M50 28 L66 34 A18 18 0 0 1 38 44 Z" fill="#60a5fa"/><path d="M50 28 L38 44 A18 18 0 0 1 32 18 Z" fill="#93c5fd"/></svg>',
  histogram: '<svg viewBox="0 0 100 56" class="w-full h-10"><rect x="10" y="30" width="11" height="18" fill="#bfdbfe"/><rect x="21" y="22" width="11" height="26" fill="#93c5fd"/><rect x="32" y="16" width="11" height="32" fill="#60a5fa"/><rect x="43" y="12" width="11" height="36" fill="#3b82f6"/><rect x="54" y="18" width="11" height="30" fill="#2563eb"/><rect x="65" y="26" width="11" height="22" fill="#1d4ed8"/><rect x="76" y="32" width="11" height="16" fill="#1e40af"/></svg>',
  stacked_bar: '<svg viewBox="0 0 100 56" class="w-full h-10"><rect x="12" y="12" width="14" height="16" fill="#93c5fd"/><rect x="12" y="28" width="14" height="20" fill="#2563eb"/><rect x="38" y="18" width="14" height="14" fill="#93c5fd"/><rect x="38" y="32" width="14" height="16" fill="#2563eb"/><rect x="64" y="10" width="14" height="22" fill="#93c5fd"/><rect x="64" y="32" width="14" height="16" fill="#2563eb"/></svg>',
  grouped_bar: '<svg viewBox="0 0 100 56" class="w-full h-10"><rect x="10" y="24" width="8" height="24" fill="#2563eb"/><rect x="20" y="30" width="8" height="18" fill="#93c5fd"/><rect x="38" y="18" width="8" height="30" fill="#2563eb"/><rect x="48" y="24" width="8" height="24" fill="#93c5fd"/><rect x="66" y="14" width="8" height="34" fill="#2563eb"/><rect x="76" y="20" width="8" height="28" fill="#93c5fd"/></svg>',
  funnel: '<svg viewBox="0 0 100 56" class="w-full h-10"><polygon points="12,12 88,12 74,22 26,22" fill="#2563eb"/><polygon points="26,24 74,24 64,34 36,34" fill="#60a5fa"/><polygon points="36,36 64,36 57,46 43,46" fill="#93c5fd"/></svg>',
  heatmap: '<svg viewBox="0 0 100 56" class="w-full h-10"><rect x="10" y="12" width="16" height="12" fill="#dbeafe"/><rect x="28" y="12" width="16" height="12" fill="#93c5fd"/><rect x="46" y="12" width="16" height="12" fill="#60a5fa"/><rect x="64" y="12" width="16" height="12" fill="#1d4ed8"/><rect x="10" y="26" width="16" height="12" fill="#93c5fd"/><rect x="28" y="26" width="16" height="12" fill="#60a5fa"/><rect x="46" y="26" width="16" height="12" fill="#2563eb"/><rect x="64" y="26" width="16" height="12" fill="#3b82f6"/><rect x="10" y="40" width="16" height="6" fill="#dbeafe"/><rect x="28" y="40" width="16" height="6" fill="#bfdbfe"/><rect x="46" y="40" width="16" height="6" fill="#93c5fd"/><rect x="64" y="40" width="16" height="6" fill="#60a5fa"/></svg>',
  kpi: '<svg viewBox="0 0 100 56" class="w-full h-10"><rect x="14" y="14" width="72" height="28" rx="6" fill="#eff6ff" stroke="#93c5fd"/><text x="50" y="31" text-anchor="middle" font-size="11" font-family="Arial, sans-serif" fill="#1d4ed8">92%</text></svg>',
  table: '<svg viewBox="0 0 100 56" class="w-full h-10"><rect x="10" y="12" width="80" height="32" rx="3" fill="#ffffff" stroke="#93c5fd"/><line x1="10" y1="23" x2="90" y2="23" stroke="#cbd5e1"/><line x1="10" y1="34" x2="90" y2="34" stroke="#cbd5e1"/><line x1="38" y1="12" x2="38" y2="44" stroke="#cbd5e1"/><line x1="64" y1="12" x2="64" y2="44" stroke="#cbd5e1"/></svg>',
}

/** Static icon of a chart type (old chartPreviewSVG). */
export function ChartIcon({ type }: { type: string }) {
  return <div dangerouslySetInnerHTML={{ __html: CHART_ICON_SVG[type] || CHART_ICON_SVG.bar }} />
}

/** Chart type picker grid (old renderChartChoices). */
export function ChartChoices({ value, onChange, readOnly = false }: { value: string; onChange?: (v: string) => void; readOnly?: boolean }) {
  const current = value || 'bar'
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {CHART_CHOICES.map(c => {
        const active = c.value === current
        return (
          <button key={c.value} type="button" disabled={readOnly} onClick={() => onChange?.(c.value)}
            className={`border rounded-lg p-2 text-xs font-medium transition text-left ${readOnly ? 'opacity-50 cursor-not-allowed ' : ''}${active ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
            <div className={`rounded-md border ${active ? 'border-blue-300 bg-blue-500/10' : 'border-slate-200 bg-slate-50'} p-1.5 mb-1 overflow-hidden`}><ChartIcon type={c.value} /></div>
            <div className="truncate">{c.label}</div>
          </button>
        )
      })}
    </div>
  )
}

const PALETTE = ['#2563eb', '#60a5fa', '#93c5fd', '#1d4ed8', '#3b82f6', '#bfdbfe', '#1e40af', '#dbeafe']

/** Data-driven preview of the value (old renderStatPreview used Chart.js; rendered here as inline SVG). */
export function StatPreview({ chartType, raw }: { chartType: string; raw: string }) {
  const parsed = parseStatInputValue(raw, chartType)
  const type = String(chartType || 'bar').toLowerCase()
  const hasData = parsed.mode === 'single' ? !!String(parsed.single || '').trim() : parsed.points.length > 0
  const W = 320, H = 150, padL = 28, padB = 22, padT = 10, padR = 10

  let body: ReactNode
  if (!hasData) {
    body = <div className="h-full flex items-center justify-center text-xs text-slate-400">Isi data untuk melihat preview.</div>
  } else if (parsed.mode === 'single') {
    body = (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-blue-700">{parsed.single}</div>
        <div className="text-xs text-slate-500 mt-1">KPI Card</div>
      </div>
    )
  } else if (parsed.mode === 'xy') {
    const pts = parsed.points.map(p => ({ x: Number(p.x) || 0, y: Number(p.y) || 0, r: Number(p.r) || 6 }))
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
    const minX = Math.min(0, ...xs), maxX = Math.max(1, ...xs), minY = Math.min(0, ...ys), maxY = Math.max(1, ...ys)
    const sx = (x: number) => padL + ((x - minX) / (maxX - minX || 1)) * (W - padL - padR)
    const sy = (y: number) => H - padB - ((y - minY) / (maxY - minY || 1)) * (H - padB - padT)
    body = (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#cbd5e1" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#cbd5e1" />
        {pts.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={type === 'bubble' ? p.r : 4} fill={PALETTE[i % PALETTE.length]} fillOpacity={type === 'bubble' ? 0.7 : 1} />)}
      </svg>
    )
  } else if (['pie', 'doughnut', 'polar'].includes(type)) {
    const vals = parsed.points.map(p => Math.max(0, Number(p.value) || 0))
    const total = vals.reduce((a, b) => a + b, 0) || 1
    const cx = W / 2, cy = H / 2, R = 60
    let angle = -Math.PI / 2
    const slices = vals.map((v, i) => {
      const a0 = angle, a1 = angle + (v / total) * Math.PI * 2; angle = a1
      const r = type === 'polar' ? 20 + (v / Math.max(...vals, 1)) * (R - 20) : R
      const large = a1 - a0 > Math.PI ? 1 : 0
      const d = `M${cx} ${cy} L${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`
      return <path key={i} d={d} fill={PALETTE[i % PALETTE.length]} stroke="#fff" strokeWidth={1} />
    })
    body = (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        {slices}
        {type === 'doughnut' && <circle cx={cx} cy={cy} r={R * 0.55} fill="#fff" />}
      </svg>
    )
  } else if (['line', 'area', 'radar'].includes(type)) {
    const vals = parsed.points.map(p => Number(p.value) || 0)
    const max = Math.max(1, ...vals), min = Math.min(0, ...vals)
    const n = vals.length
    const sx = (i: number) => padL + (n > 1 ? (i / (n - 1)) * (W - padL - padR) : (W - padL - padR) / 2)
    const sy = (v: number) => H - padB - ((v - min) / (max - min || 1)) * (H - padB - padT)
    const pts = vals.map((v, i) => `${sx(i)},${sy(v)}`).join(' ')
    body = (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#cbd5e1" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#cbd5e1" />
        {type === 'area' && <polygon points={`${sx(0)},${H - padB} ${pts} ${sx(n - 1)},${H - padB}`} fill="#bfdbfe" />}
        <polyline points={pts} fill="none" stroke="#2563eb" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {vals.map((v, i) => <circle key={i} cx={sx(i)} cy={sy(v)} r={3} fill="#60a5fa" />)}
        {parsed.points.map((p, i) => <text key={i} x={sx(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#64748b">{(p.label || '-').slice(0, 8)}</text>)}
      </svg>
    )
  } else {
    const vals = parsed.points.map(p => Number(p.value) || 0)
    const max = Math.max(1, ...vals)
    const n = vals.length
    const slot = (W - padL - padR) / n
    const bw = Math.min(40, slot * 0.6)
    body = (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#cbd5e1" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#cbd5e1" />
        {vals.map((v, i) => {
          const h = (Math.max(0, v) / max) * (H - padB - padT)
          const x = padL + slot * i + (slot - bw) / 2
          return <rect key={i} x={x} y={H - padB - h} width={bw} height={h} rx={2} fill={PALETTE[i % PALETTE.length]} />
        })}
        {parsed.points.map((p, i) => <text key={i} x={padL + slot * i + slot / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="#64748b">{(p.label || '-').slice(0, 8)}</text>)}
      </svg>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Preview Chart</p>
      <div className="h-44 bg-white border border-slate-200 rounded-lg p-2">{body}</div>
    </div>
  )
}

/** Value editor: single input for KPI, editable row list for series / XY (old renderStatValueInput + renderStatSeriesRows). */
export function StatValueEditor({ chartType, single, rows, onSingle, onRows }: {
  chartType: string; single: string; rows: StatRow[]; onSingle: (v: string) => void; onRows: (r: StatRow[]) => void
}) {
  const mode = statChartMode(chartType)
  const isBubble = String(chartType).toLowerCase() === 'bubble'
  const setRow = (idx: number, patch: Partial<StatRow>) => onRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  const removeRow = (idx: number) => onRows(rows.filter((_, i) => i !== idx))
  const addRow = () => onRows([...rows, { label: '', value: '', x: '', y: '' }])
  const inputCls = 'border border-slate-300 rounded-lg px-2 py-2 text-xs'

  if (mode === 'single') {
    return (
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Nilai Utama</label>
        <input type="text" value={single} onChange={e => onSingle(e.target.value)} placeholder="150" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <p className="text-xs text-slate-500 mt-1">Nilai tunggal untuk KPI card.</p>
      </div>
    )
  }
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">{mode === 'xy' ? 'Data Titik' : 'Data Label dan Nilai'}</label>
      <div className="space-y-2">
        {rows.map((row, idx) => mode === 'xy' ? (
          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
            <input type="text" className={`col-span-4 ${inputCls}`} placeholder="Label" value={row.label} onChange={e => setRow(idx, { label: e.target.value })} />
            <input type="number" step="any" className={`col-span-3 ${inputCls}`} placeholder="X" value={row.x} onChange={e => setRow(idx, { x: e.target.value })} />
            <input type="number" step="any" className={`col-span-3 ${inputCls}`} placeholder="Y" value={row.y} onChange={e => setRow(idx, { y: e.target.value })} />
            <button type="button" onClick={() => removeRow(idx)} className="col-span-2 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded-lg py-2">Hapus</button>
          </div>
        ) : (
          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
            <input type="text" className={`col-span-6 ${inputCls}`} placeholder="Label" value={row.label} onChange={e => setRow(idx, { label: e.target.value })} />
            <input type="number" step="any" className={`col-span-4 ${inputCls}`} placeholder="Nilai" value={row.value} onChange={e => setRow(idx, { value: e.target.value })} />
            <button type="button" onClick={() => removeRow(idx)} className="col-span-2 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded-lg py-2">Hapus</button>
          </div>
        ))}
        <button type="button" onClick={addRow} className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">{mode === 'xy' ? '+ Tambah Titik' : '+ Tambah Baris Data'}</button>
      </div>
      <p className="text-xs text-slate-500 mt-1">
        {mode === 'xy'
          ? (isBubble ? 'Isi titik koordinat X dan Y. Bubble akan memakai ukuran default.' : 'Isi titik koordinat X dan Y untuk scatter chart.')
          : 'Isi data seperti tabel sederhana: label + angka.'}
      </p>
    </div>
  )
}

/** Serialise without throwing (for live preview). */
function tryCollect(chartType: string, single: string, rows: StatRow[]): string {
  try { return collectStatInputValue(chartType, single, rows) } catch { return '' }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StatistikPage() {
  const { period } = usePeriod()
  const [templates, setTemplates] = useState<any[]>([])
  const [periodStats, setPeriodStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [single, setSingle] = useState('')
  const [rows, setRows] = useState<StatRow[]>([])
  const tbodyRef = useRef<HTMLTableSectionElement>(null)
  const sortRef = useRef<Sortable | null>(null)

  const load = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([
        apiGet('/api/cms/stats?period=_TEMPLATE_'),
        apiGet(`/api/cms/stats?period=${encodeURIComponent(period)}`),
      ])
      setTemplates(t || [])
      setPeriodStats(s || [])
    } catch { setTemplates([]); setPeriodStats([]) }
    setLoading(false)
  }, [period])
  useEffect(() => { load() }, [load])

  // GET ?period=X already returns every template merged with this period's value
  // (id = value doc id when it exists, else the template id; template_id = the template).
  // Old UI only listed fillable templates.
  const fillableIds = new Set(templates.filter((t: any) => t.fillable).map((t: any) => t.template_id || t.id))
  const displayStats = periodStats.filter((s: any) => fillableIds.size === 0 || fillableIds.has(s.template_id || s.id))

  // Full template payload (template PUT $sets every field, so partial bodies would wipe label/desc/flags).
  function templatePayload(tpl: any, order: number) {
    return {
      ...tpl,
      period_label: '_TEMPLATE_',
      template_id: tpl.template_id || tpl.id,
      chart_type: tpl.chart_type || 'bar',
      fillable: !!tpl.fillable,
      visible: tpl.visible !== false,
      value: String(tpl.value ?? ''),
      order,
    }
  }

  // Init sortable (old initStatsSortable: order lives on the template row)
  useEffect(() => {
    if (!tbodyRef.current || loading || displayStats.length === 0) return
    sortRef.current?.destroy()
    sortRef.current = Sortable.create(tbodyRef.current, {
      animation: 180,
      handle: '.drag-handle',
      onEnd: async () => {
        const trs = tbodyRef.current?.querySelectorAll('tr[data-template-id]')
        if (!trs) return
        for (let i = 0; i < trs.length; i++) {
          const tid = (trs[i] as HTMLElement).dataset.templateId
          const tpl = templates.find((t: any) => t.id === tid)
          if (tpl) await apiPut(`/api/cms/stats/${tpl.id}`, templatePayload(tpl, i)).catch(() => {})
        }
        load()
      },
    })
    return () => { sortRef.current?.destroy(); sortRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodStats, templates, loading])

  function openEdit(s: any) {
    const parsed = parseStatInputValue(String(s.value ?? ''), s.chart_type || 'bar')
    setEditing(s)
    setSingle(parsed.single)
    setRows(pointsToRows(parsed.points))
    setShowModal(true)
  }

  function periodPayload(s: any, value: string) {
    return {
      id: s.id,
      template_id: s.template_id || s.id,
      period_label: period,
      label: s.label || '',
      value,
      desc: s.desc || '',
      chart_type: s.chart_type || 'bar',
      fillable: !!s.fillable,
      visible: s.visible !== false,
      order: s.order || 0,
    }
  }

  async function save() {
    if (!editing) return
    let value = ''
    try { value = collectStatInputValue(editing.chart_type || 'bar', single, rows) }
    catch (e: any) { alert(e.message || String(e)); return }
    if (!value.trim()) { alert('Value statistik periode wajib diisi.'); return }
    setSaving(true)
    try {
      const body = periodPayload(editing, value)
      const hasOwnDoc = editing.id && editing.id !== (editing.template_id || editing.id)
      if (hasOwnDoc) await apiPut(`/api/cms/stats/${editing.id}`, body)
      else await apiPost('/api/cms/stats', body)
      setShowModal(false); load()
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  async function remove(s: any) {
    if (!confirm(`Hapus nilai "${s.label}" untuk periode ini?`)) return
    try { await apiDelete(`/api/cms/stats/${s.id}`); load() } catch (e: any) { alert(e.message) }
  }

  async function syncTemplate() {
    if (!period || period === '_TEMPLATE_') { alert('Pilih periode valid!'); return }
    if (!confirm('Tarik template statistik global ke periode ini? Nilai yang sudah diisi pada periode ini akan direset ke 0.')) return
    try { await apiPost('/api/cms/sync-stats', { period_label: period }); setSyncMsg('Tersinkron!'); setTimeout(() => setSyncMsg(''), 2000); load() }
    catch (e: any) { alert(e.message) }
  }

  // Inline edit only for single-mode (KPI) stats; series stats must go through the modal.
  async function updateValue(s: any, value: string) {
    const v = String(value || '').trim()
    if (v === String(s.value ?? '').trim()) return
    try { await apiPut(`/api/cms/stats/${s.id}`, periodPayload(s, v)); load() } catch (e: any) { alert(e.message) }
  }

  const editChartType = editing?.chart_type || 'bar'
  const previewRaw = editing ? tryCollect(editChartType, single, rows) : ''

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Statistik Periode</h2>
        <div className="flex gap-2 items-center">
          {syncMsg && <span className="text-sm text-green-600">{syncMsg}</span>}
          <button onClick={syncTemplate} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Sync Template</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 w-8"></th>
              <th className="text-left px-4 py-2">Label</th>
              <th className="text-left px-4 py-2">Tipe</th>
              <th className="text-left px-4 py-2">Nilai</th>
              <th className="text-left px-4 py-2">Deskripsi</th>
              <th className="px-4 py-2 w-8">#</th>
              <th className="px-4 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {displayStats.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-slate-400">Belum ada template statistik yang dapat diisi. Buat template di Template Statistik terlebih dahulu.</td></tr>
            )}
            {displayStats.map((s: any) => {
              const ct = s.chart_type || 'bar'
              const mode = statChartMode(ct)
              const hasOwnDoc = s.id && s.id !== (s.template_id || s.id)
              return (
                <tr key={s.template_id || s.id} data-template-id={s.template_id || s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-2"><button className="drag-handle text-slate-300 hover:text-slate-500 cursor-grab p-1"><GripVertical className="w-3.5 h-3.5" /></button></td>
                  <td className="px-4 py-2 font-medium">{s.label}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16 rounded-md border border-slate-200 bg-slate-50 p-1"><ChartIcon type={ct} /></div>
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{ct}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {mode === 'single' ? (
                      <input type="text" key={`${s.id}:${s.value}`} defaultValue={s.value || ''} onBlur={e => updateValue(s, e.target.value)} className="w-24 border rounded px-2 py-1 text-sm text-center" />
                    ) : (
                      <div>
                        <p className="font-semibold text-slate-700">{statValuePreview(String(s.value ?? ''), ct)}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Mode: {mode}</p>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{s.desc}</td>
                  <td className="px-2 py-2 text-xs text-slate-400">{s.order || 0}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(s)} title="Isi Nilai" className="p-1 rounded hover:bg-slate-100"><Pencil className="w-3.5 h-3.5 text-blue-600" /></button>
                      {hasOwnDoc && <button onClick={() => remove(s)} title="Hapus nilai periode" className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold p-6 pb-0 flex-shrink-0">Isi Nilai: {editing.label}</h3>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div><label className="text-sm font-medium">Label</label><input value={editing.label || ''} disabled className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500" /></div>
              <StatValueEditor chartType={editChartType} single={single} rows={rows} onSingle={setSingle} onRows={setRows} />
              <StatPreview chartType={editChartType} raw={previewRaw} />
              <div><label className="text-sm font-medium">Deskripsi Tambahan</label><input value={editing.desc || ''} disabled className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500" /></div>
              <div><label className="text-sm font-medium block mb-2">Jenis Chart</label><ChartChoices value={editChartType} readOnly /></div>
            </div>
            <div className="flex gap-2 justify-end p-6 pt-0 flex-shrink-0">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{saving ? '...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
