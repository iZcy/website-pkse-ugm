import { useState, useEffect, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost, apiPut } from '../lib/api'
import { Wifi, WifiOff, RefreshCw, Upload } from 'lucide-react'

const PHONE_KEYS = ['phone','no_hp','no__hp','nomor_hp','nomor','no hp']
// Old loadBCContacts colMap (admin-common.js ~3013)
const COL_MAP: Record<string,string> = {
  full_name: 'Nama', nickname: 'Nickname', phone: 'No. HP',
  department: 'Kementerian', position: 'Jabatan',
  program_studi: 'Program Studi', fakultas: 'Fakultas', angkatan: 'Angkatan',
}

const qrInterval = { id: 0 as any }

// Session persistence — same endpoint/shape as old saveBCSession/loadBCSession
// (static/admin-common.js ~2857). localStorage mirror uses the same body shape.
const BC_SESSION_KEY = 'bcSession'
type BCSnapshot = { rows: Record<string,string>[]; headers: string[]; labels: string[] }
type BCSessionBody = { session_id?: string; columns: string[]; labels: string[]; rows: Record<string,string>[]; template: string; delay_ms: number; period: string }
type BCSelRange = { startRow: number; startCol: number; endRow: number; endCol: number }
type BCLogEntry = { phone: string; status: string; error?: string }

// Old addBCColumn / renameBCColumn key slugging (admin-common.js ~3249, ~3276)
function slugKey(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_')
}

// Old bcNormRange (admin-common.js ~3076)
function normRange(r: BCSelRange) {
  return { r1: Math.min(r.startRow, r.endRow), c1: Math.min(r.startCol, r.endCol), r2: Math.max(r.startRow, r.endRow), c2: Math.max(r.startCol, r.endCol) }
}
function isCellSelected(sel: BCSelRange | null, ri: number, ci: number): boolean {
  if(!sel) return false
  const n = normRange(sel)
  return ri >= n.r1 && ri <= n.r2 && ci >= n.c1 && ci <= n.c2
}
function preventSelect(e: Event) { e.preventDefault() }

// ── Template engine: faithful port of renderBCTemplateJS (admin-common.js 3477-3605) ──
function renderBCTemplateJS(template: string, varsIn: Record<string,string>): string {
  const vars: Record<string,string> = { ...varsIn }
  const MAX_ITER = 10; let iter = 0
  function evalCond(col: string, op: string, val: string | null): boolean {
    const cv = vars[col] !== undefined ? String(vars[col]) : ''
    switch(op) {
      case '==': return cv === val
      case '!=': return cv !== val
      case 'contains': return val ? cv.indexOf(val) >= 0 : false
      case '!contains': return val ? cv.indexOf(val) < 0 : false
      case 'startswith': return val ? cv.indexOf(val) === 0 : false
      case '!startswith': return val ? cv.indexOf(val) !== 0 : false
      case 'endswith': return val ? cv.slice(-val.length) === val : false
      case '!endswith': return val ? cv.slice(-val.length) !== val : false
      case 'matches': try { return val ? new RegExp(val, 'i').test(cv) : false } catch { return false }
      case '!matches': try { return val ? !new RegExp(val, 'i').test(cv) : false } catch { return false }
      case 'empty': return cv.trim() === ''
      case 'notempty': return cv.trim() !== ''
      case '>': return parseFloat(cv) > parseFloat(val || '0')
      case '>=': return parseFloat(cv) >= parseFloat(val || '0')
      case '<': return parseFloat(cv) < parseFloat(val || '0')
      case '<=': return parseFloat(cv) <= parseFloat(val || '0')
      default: return false
    }
  }
  function processConditionals(tmpl: string): string {
    const quotedOps = '==|!=|contains|!contains|startswith|!startswith|endswith|!endswith|matches|!matches|>|>=|<|<='
    const unquotedOps = 'empty|notempty'
    const reQ = new RegExp('\\{\\{if\\s+(\\w+)\\s*(' + quotedOps + ')\\s*"([^"]*?)"\\s*\\}\\}')
    const reU = new RegExp('\\{\\{if\\s+(\\w+)\\s*(' + unquotedOps + ')\\s*\\}\\}')
    while(iter++ < MAX_ITER) {
      const mQ = tmpl.match(reQ)
      const mU = tmpl.match(reU)
      let match: RegExpMatchArray | null = null, col = '', op = '', val: string | null = null
      if(mQ && mQ.index !== undefined) { match = mQ; col = mQ[1]; op = mQ[2]; val = mQ[3] }
      else if(mU && mU.index !== undefined) { match = mU; col = mU[1]; op = mU[2]; val = null }
      if(!match || match.index === undefined) break
      const startIdx = match.index
      const afterStart = startIdx + match[0].length
      let depth = 1, elsePos = -1, endPos = -1, searchFrom = afterStart
      while(depth > 0 && searchFrom < tmpl.length) {
        const nI = tmpl.indexOf('{{if', searchFrom), nE = tmpl.indexOf('{{else}}', searchFrom), nD = tmpl.indexOf('{{endif}}', searchFrom)
        if(nD === -1) break
        let nearest = nD
        if(nE !== -1 && nE < nearest) nearest = nE
        if(nI !== -1 && nI < nearest) { depth++; searchFrom = nI + 4; continue }
        if(nearest === nD) { depth--; if(depth === 0) endPos = nD; searchFrom = nD + 9; continue }
        if(depth === 1) elsePos = nearest
        searchFrom = nearest + 8
      }
      if(endPos === -1) break
      let result: string
      if(elsePos !== -1) {
        const t = tmpl.substring(afterStart, elsePos), f = tmpl.substring(elsePos + 8, endPos)
        result = evalCond(col, op, val) ? t : f
      } else {
        const b = tmpl.substring(afterStart, endPos)
        result = evalCond(col, op, val) ? b : ''
      }
      // If result is empty, clean up surrounding blank lines to avoid excess whitespace
      if(!result) {
        const blockEnd = endPos + 9
        const prevNL = tmpl.lastIndexOf('\n', startIdx - 1)
        const nextNL = tmpl.indexOf('\n', blockEnd)
        if(prevNL !== -1 && nextNL !== -1) {
          const before = tmpl.substring(prevNL + 1, startIdx)
          const after = tmpl.substring(blockEnd, nextNL)
          if(before.trim() === '' && after.trim() === '') { tmpl = tmpl.substring(0, prevNL) + tmpl.substring(nextNL + 1); continue }
        }
        if(prevNL !== -1 && tmpl.substring(prevNL + 1, startIdx).trim() === '') {
          const afterEnd = tmpl.indexOf('\n', blockEnd)
          if(afterEnd !== -1 && tmpl.substring(blockEnd, afterEnd).trim() === '') { tmpl = tmpl.substring(0, prevNL) + tmpl.substring(afterEnd + 1); continue }
        }
      }
      tmpl = tmpl.substring(0, startIdx) + result + tmpl.substring(endPos + 9)
    }
    return tmpl
  }
  function processSet(tmpl: string): string {
    return tmpl.replace(/\{\{set\s+(\w+)\s*=\s*"([^"]*?)"\s*\}\}/g, (_m, k, v) => { vars[k] = v; return '' })
  }
  function processMath(tmpl: string): string {
    tmpl = tmpl.replace(/\{\{(\w+)\s*\+\s*(\d+)\}\}/g, (_m, col, n) => String((parseInt(vars[col]) || 0) + parseInt(n)))
    tmpl = tmpl.replace(/\{\{(\w+)\s*-\s*(\d+)\}\}/g, (_m, col, n) => String((parseInt(vars[col]) || 0) - parseInt(n)))
    return tmpl
  }
  function processFilters(tmpl: string): string {
    tmpl = tmpl.replace(/\{\{(\w+)\|uppercase\}\}/g, (_m, c) => (vars[c] || '').toUpperCase())
    tmpl = tmpl.replace(/\{\{(\w+)\|lowercase\}\}/g, (_m, c) => (vars[c] || '').toLowerCase())
    tmpl = tmpl.replace(/\{\{(\w+)\|capitalize\}\}/g, (_m, c) => { const s = vars[c] || ''; return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() })
    tmpl = tmpl.replace(/\{\{(\w+)\|titlecase\}\}/g, (_m, c) => (vars[c] || '').replace(/\b\w/g, ch => ch.toUpperCase()))
    tmpl = tmpl.replace(/\{\{(\w+)\|trim\}\}/g, (_m, c) => (vars[c] || '').trim())
    tmpl = tmpl.replace(/\{\{(\w+)\|default:"([^"]*?)"\}\}/g, (_m, c, fb) => (vars[c] && String(vars[c]).trim()) ? vars[c] : fb)
    tmpl = tmpl.replace(/\{\{(\w+)\|length\}\}/g, (_m, c) => String((vars[c] || '').length))
    tmpl = tmpl.replace(/\{\{(\w+)\|slice:"([^"]*?)"\}\}/g, (_m, c, args) => {
      const parts = String(args).split(',').map(s => parseInt(s.trim()))
      return (vars[c] || '').slice(parts[0], parts[1])
    })
    tmpl = tmpl.replace(/\{\{(\w+)\|replace:"([^"]*?)"\}\}/g, (_m, c, args) => {
      const parts = String(args).split(',').map(s => s.trim())
      return (vars[c] || '').split(parts[0]).join(parts[1] || '')
    })
    tmpl = tmpl.replace(/\{\{(\w+)\|repeat:(\d+)\}\}/g, (_m, c, n) => {
      const s = vars[c] || ''; let r = ''
      for(let i = 0; i < parseInt(n); i++) r += (i > 0 ? '\n' : '') + s
      return r
    })
    return tmpl
  }
  function processVars(tmpl: string): string {
    for(const k in vars) {
      if(Object.prototype.hasOwnProperty.call(vars, k)) {
        tmpl = tmpl.replace(new RegExp('\\{\\{' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\}\\}', 'g'), vars[k])
      }
    }
    return tmpl
  }
  // Execute pipeline
  template = processSet(template)
  template = processMath(template)
  template = processFilters(template)
  template = processConditionals(template)
  template = processVars(template)
  // Collapse 3+ consecutive newlines into 2 (max 1 blank line between paragraphs)
  template = template.replace(/\n{3,}/g, '\n\n')
  // Strip whitespace from otherwise-blank lines
  template = template.replace(/^[ \t]+$/gm, '')
  return template
}

// ── Template syntax help modal (port of bcToggleHelp, admin-common.js 2602-2704 + broadcast.html 308-320) ──
const L = '{{', R = '}}'
const ex = (t: string) => <span className="text-blue-600">{t}</span>
const cm = (t: string) => <code className="bg-slate-200 text-slate-800 px-1 rounded text-xs">{t}</code>
const res = (t: string) => <span className="text-green-600 font-semibold">{t}</span>

function BCHelpModal({ cols, labels, rows, onClose }: { cols: string[]; labels: string[]; rows: Record<string,string>[]; onClose: () => void }) {
  // Get first contact's data for live examples
  const sample: Record<string,string> = {}
  if(rows.length > 0) cols.forEach(h => { sample[h] = rows[0][h] || '' })
  const evalEx = (tmpl: string) => { try { return renderBCTemplateJS(tmpl, { ...sample }) } catch { return '(error)' } }
  const sWrap = (label: string, template: ReactNode, output: string) => (
    <div className="mb-3">
      <div className="text-[10px] text-slate-400 mb-0.5">{label}</div>
      <div className="bg-slate-800 text-slate-200 rounded p-2 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">{template}</div>
      <div className="mt-0.5 flex items-start gap-1">
        <span className="text-slate-400 text-[10px]">&#8594;</span>
        <div className="bg-green-50 border border-green-200 rounded p-1.5 font-mono text-[11px] text-green-800 whitespace-pre-wrap flex-1">{output || res('(kosong)')}</div>
      </div>
    </div>
  )
  return (
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4" onClick={e => { if(e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Sintaks Template Pesan
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition text-lg leading-none">&times;</button>
        </div>
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          <div className="flex gap-3" style={{ minHeight: 400 }}>
            {/* LEFT COLUMN — Syntax Reference */}
            <div className="flex-1 min-w-0 space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-700 mb-1.5 flex items-center gap-1.5"><span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-mono">{L}var{R}</span> Variabel</h4>
                <p className="text-slate-500 mb-1">Sisipkan nilai kolom kontak.</p>
                <div className="bg-slate-50 border border-slate-200 rounded p-2 font-mono text-[11px]">Halo {ex(L + 'nickname' + R)}!</div>
              </div>
              <div>
                <h4 className="font-bold text-slate-700 mb-1.5 flex items-center gap-1.5"><span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-mono">{L}var|filter{R}</span> Filter</h4>
                <div className="bg-slate-50 border border-slate-200 rounded p-2 font-mono text-[11px] space-y-0.5">
                  <p>{ex(L + 'var|uppercase' + R)} <span className="text-slate-400">kapital semua</span></p>
                  <p>{ex(L + 'var|lowercase' + R)} <span className="text-slate-400">kecil semua</span></p>
                  <p>{ex(L + 'var|capitalize' + R)} <span className="text-slate-400">kapital pertama</span></p>
                  <p>{ex(L + 'var|titlecase' + R)} <span className="text-slate-400">Title Case</span></p>
                  <p>{ex(L + 'var|trim' + R)} <span className="text-slate-400">hapus spasi</span></p>
                  <p>{ex(L + 'var|length' + R)} <span className="text-slate-400">jumlah karakter</span></p>
                  <p>{ex(L + 'var|default:"fb"' + R)} <span className="text-slate-400">fallback</span></p>
                  <p>{ex(L + 'var|slice:"0,6"' + R)} <span className="text-slate-400">potong teks</span></p>
                  <p>{ex(L + 'var|replace:"a,b"' + R)} <span className="text-slate-400">ganti teks</span></p>
                  <p>{ex(L + 'var|repeat:3' + R)} <span className="text-slate-400">ulang Nx</span></p>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-slate-700 mb-1.5 flex items-center gap-1.5"><span className="bg-teal-100 text-teal-700 text-[10px] px-1.5 py-0.5 rounded font-mono">{L}set{R}</span> <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded font-mono">{L}var+N{R}</span> Set &amp; Math</h4>
                <div className="bg-slate-50 border border-slate-200 rounded p-2 font-mono text-[11px] space-y-0.5">
                  <p>{ex(L + 'set x="Halo"' + R)} <span className="text-slate-400">definisi variabel</span></p>
                  <p>{ex(L + 'angkatan + 1' + R)} <span className="text-slate-400">tambah</span></p>
                  <p>{ex(L + 'angkatan - 4' + R)} <span className="text-slate-400">kurang</span></p>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-slate-700 mb-1.5 flex items-center gap-1.5"><span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-mono">{L}if{R}</span> Kondisional</h4>
                <p className="text-slate-500 mb-1">Bersarang (nested) didukung. {cm(L + 'else' + R)} opsional.</p>
                <div className="bg-slate-50 border border-slate-200 rounded p-2 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">{ex(L + 'if angkatan == "2022"' + R)}{'\n  Freshman!\n'}{ex(L + 'else' + R)}{'\n  Senior!\n'}{ex(L + 'endif' + R)}</div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                  <div><b className="text-slate-600">Perbandingan:</b></div><div>{cm('==')} {cm('!=')} {cm('>')} {cm('>=')} {cm('<')} {cm('<=')}</div>
                  <div><b className="text-slate-600">Teks:</b></div><div>{cm('contains')} {cm('!contains')} {cm('startswith')} {cm('!startswith')} {cm('endswith')} {cm('!endswith')}</div>
                  <div><b className="text-slate-600">Regex:</b></div><div>{cm('matches')} {cm('!matches')}</div>
                  <div><b className="text-slate-600">Keberadaan:</b></div><div>{cm('empty')} {cm('notempty')}</div>
                </div>
              </div>
            </div>
            {/* RIGHT COLUMN — Live Examples with current data */}
            <div className="flex-1 min-w-0 space-y-3 text-xs">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                <h4 className="font-bold text-blue-800 mb-1 text-[10px]">Kolom Tersedia (kontak pertama)</h4>
                <table className="w-full text-[11px]"><tbody>
                  {cols.map((h, i) => {
                    const val = sample[h] || '(kosong)'
                    return (
                      <tr key={h}>
                        <td className="pr-3 py-0.5 font-mono text-blue-600 whitespace-nowrap">{ex(L + h + R)}</td>
                        <td className="pr-3 py-0.5 text-slate-400 text-xs">{labels[i] || h}</td>
                        <td className="py-0.5 text-slate-700 text-xs truncate max-w-[180px]" title={val}>{val}</td>
                      </tr>
                    )
                  })}
                </tbody></table>
              </div>
              {sWrap('Variabel dasar', <>{ex(L + 'full_name|titlecase' + R)} ({ex(L + 'nickname' + R)})</>, evalEx('{{full_name|titlecase}} ({{nickname}})'))}
              {sWrap('Filter default', ex(L + 'position|default:"Anggota"' + R), evalEx('{{position|default:"Anggota"}}'))}
              {sWrap('Math', <>Gen {ex(L + 'angkatan + 4' + R)}</>, evalEx('Gen {{angkatan + 4}}'))}
              {sWrap('Kondisional == (true)', <>{ex(L + 'if angkatan == "2022"' + R)}{'\nAngkatan 2022!'}{ex(L + 'else' + R)}{'\nLain'}{ex(L + 'endif' + R)}</>, evalEx('{{if angkatan == "2022"}}Angkatan 2022!{{else}}Lain{{endif}}'))}
              {sWrap('Kondisional empty', <>{ex(L + 'if position empty' + R)}{'\nNo jabatan'}{ex(L + 'endif' + R)}</>, evalEx('{{if position empty}}No jabatan{{endif}}'))}
              {sWrap('Kondisional contains', <>{ex(L + 'if fakultas contains "Tek"' + R)}{'\nFak. Teknik'}{ex(L + 'else' + R)}{'\nLain'}{ex(L + 'endif' + R)}</>, evalEx('{{if fakultas contains "Tek"}}Fak. Teknik{{else}}Lain{{endif}}'))}
              {sWrap('Nested kondisional', <>{ex(L + 'if angkatan == "2022"' + R)}{'\n'}{ex(L + 'if fakultas contains "Tek"' + R)}{'\nTI 22'}{ex(L + 'else' + R)}{'\nNon-Tek 22'}{ex(L + 'endif' + R)}{'\n'}{ex(L + 'else' + R)}{'\nNon-2022'}{ex(L + 'endif' + R)}</>, evalEx('{{if angkatan == "2022"}}{{if fakultas contains "Tek"}}TI 22{{else}}Non-Tek 22{{endif}}{{else}}Non-2022{{endif}}'))}
              {sWrap('Regex matches', <>{ex(L + 'if phone matches "^0817"' + R)}{'\nPrefix 0817!'}{ex(L + 'else' + R)}{'\nLain'}{ex(L + 'endif' + R)}</>, evalEx('{{if phone matches "^0817"}}Prefix 0817!{{else}}Lain{{endif}}'))}
              {sWrap('Template lengkap', <>{ex(L + 'set salam="Halo"' + R)}{'\n'}{ex(L + 'salam' + R)}, {ex(L + 'full_name|titlecase' + R)}!{'\n'}{ex(L + 'if position notempty' + R)}{'\n'}{ex(L + 'position' + R)} di {ex(L + 'department' + R)}{'\n'}{ex(L + 'else' + R)}{'\nAnggota '}{ex(L + 'department' + R)}{'\n'}{ex(L + 'endif' + R)}</>,
                evalEx('{{set salam="Halo"}}\n{{salam}}, {{full_name|titlecase}}!\n{{if position notempty}}{{position}} di {{department}}\n{{else}}Anggota {{department}}\n{{endif}}'))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BroadcastPage() {
  const { period, periods } = usePeriod()
  const [tab, setTab] = useState<'connection'|'broadcast'|'log'>('broadcast')
  const [step, setStep] = useState(1)
  const [waConnected, setWaConnected] = useState(false)
  const [waStatusText, setWaStatusText] = useState('Memeriksa koneksi...')
  const [qrCode, setQrCode] = useState('')
  const [rows, setRows] = useState<Record<string,string>[]>([])
  const [cols, setCols] = useState<string[]>([])
  const [colLabels, setColLabels] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [message, setMessage] = useState('')
  // Old bc-delay input is in seconds (broadcast.html 249); session stores delay_ms
  const [delaySec, setDelaySec] = useState('3')
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState({ sent: 0, failed: 0, percentage: 0 })
  const [liveLog, setLiveLog] = useState<BCLogEntry[]>([])
  const [testPhone, setTestPhone] = useState('')
  const [testContact, setTestContact] = useState('')
  const [previewRow, setPreviewRow] = useState('')
  const [history, setHistory] = useState<any[]>([])
  const [historyError, setHistoryError] = useState(false)
  const [logDetail, setLogDetail] = useState<{ id: string; log: any; recipients: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [contactFilter, setContactFilter] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [selRange, setSelRangeState] = useState<BCSelRange | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const wsRef = useRef<WebSocket|null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const csvRef = useRef<HTMLInputElement>(null)
  const liveLogRef = useRef<HTMLDivElement>(null)
  // Undo/redo (old bcUndoStack/bcRedoStack, admin-common.js ~2557, ~3044)
  const undoStack = useRef<BCSnapshot[]>([])
  const redoStack = useRef<BCSnapshot[]>([])
  // Session persistence (old bcSessionID, admin-common.js ~2552)
  const sessionIdRef = useRef<string>('')
  const sessionLoaded = useRef(false)
  // Cell selection (old bcSelRange/bcSelAnchor/bcSelecting/bcMouseDownPos, admin-common.js ~2559, ~3096)
  const selRangeRef = useRef<BCSelRange | null>(null)
  const selAnchor = useRef<{ row: number; col: number } | null>(null)
  const selecting = useRef(false)
  const mouseDownPos = useRef<{ x: number; y: number; ri: number; ci: number } | null>(null)
  // Latest table/template state for use inside stable callbacks (keydown, save, ws)
  const stateRef = useRef({ rows, cols, colLabels, message, delaySec, period, selected })
  stateRef.current = { rows, cols, colLabels, message, delaySec, period, selected }

  const setSelRange = useCallback((r: BCSelRange | null) => { selRangeRef.current = r; setSelRangeState(r) }, [])

  // Old sendBroadcast phone key lookup (admin-common.js ~3675): '' when no phone column
  const findPhoneKey = useCallback(() => {
    for(const k of PHONE_KEYS) if(cols.includes(k)) return k
    return ''
  }, [cols])

  const loadQR = useCallback(async () => {
    try {
      const r = await fetch('/api/broadcast/qr', { credentials: 'same-origin' })
      if(r.ok) { const b = await r.blob(); setQrCode(URL.createObjectURL(b)) }
    } catch {}
  }, [])

  // Port of loadWAStatus (admin-common.js 2909-2934)
  const loadWAStatus = useCallback(async () => {
    try {
      const status = await apiGet('/api/broadcast/status')
      setWaConnected(!!status.connected)
      if(status.connected) { setWaStatusText('WhatsApp terhubung'); setQrCode('') }
      else { setWaStatusText('WhatsApp tidak terhubung'); loadQR() }
    } catch { setWaConnected(false); setWaStatusText('Service tidak tersedia') }
  }, [loadQR])

  // Port of loadBCContacts (admin-common.js 2996-3042)
  const loadBCContacts = useCallback(async () => {
    try {
      const filter = contactFilter || period || 'ALL'
      const contacts = await apiGet(`/api/broadcast/anggota-contacts?period=${encodeURIComponent(filter)}`)
      if(!contacts || !Array.isArray(contacts)) {
        if(stateRef.current.rows.length === 0) { setCols([]); setColLabels([]) }
        return
      }
      // Save existing selection state by phone
      const existingSel: Record<string, boolean> = {}
      const st = stateRef.current
      st.rows.forEach((r, i) => { if(st.selected.has(i) && r.phone) existingSel[r.phone] = true })
      const headers: string[] = [], labels: string[] = []
      if(contacts.length > 0) {
        for(const key in contacts[0]) {
          if(!Object.prototype.hasOwnProperty.call(contacts[0], key)) continue
          headers.push(key); labels.push(COL_MAP[key] || key)
        }
      }
      const newRows: Record<string,string>[] = []
      const newSel = new Set<number>()
      contacts.forEach((c: any) => {
        const row: Record<string,string> = {}
        headers.forEach(h => {
          let val = c[h] !== undefined ? c[h] : ''
          if(!val) {
            const snake = h.replace(/([A-Z])/g, m => '_' + m.toLowerCase())
            val = c[snake] !== undefined ? c[snake] : ''
          }
          row[h] = String(val ?? '')
        })
        if(existingSel[row.phone]) newSel.add(newRows.length)
        newRows.push(row)
      })
      setCols(headers); setColLabels(labels); setRows(newRows); setSelected(newSel)
      setSelRange(null)
    } catch { /* keep whatever we have */ }
  }, [period, contactFilter, setSelRange])

  const load = useCallback(async () => {
    await Promise.all([loadWAStatus(), loadBCContacts()])
    setLoading(false)
  }, [loadWAStatus, loadBCContacts])

  // ── Session Persistence (port of loadBCSession/saveBCSession, admin-common.js 2859-2907) ──
  const applySession = useCallback((s: any) => {
    if(!s) return
    if(s.id) sessionIdRef.current = String(s.id)
    if(Array.isArray(s.columns) && s.columns.length > 0) {
      setCols(s.columns)
      setColLabels(Array.isArray(s.labels) && s.labels.length ? s.labels : s.columns)
      setRows((s.rows || []).map((r: any) => { const row: Record<string,string> = {}; for(const k in r) if(k !== '_selected') row[k] = String(r[k] ?? ''); return row }))
    }
    if(s.template) setMessage(String(s.template))
    if(s.delay_ms) setDelaySec(String(Math.round((Number(s.delay_ms) || 3000) / 1000)))
  }, [])

  const loadBCSession = useCallback(async () => {
    let restored = false
    try {
      const data = await apiGet('/api/broadcast/session')
      if(data && data.session && data.session.id) { applySession(data.session); restored = true }
    } catch { /* start fresh */ }
    if(!restored) {
      try {
        const raw = localStorage.getItem(BC_SESSION_KEY)
        if(raw) { const s = JSON.parse(raw); applySession({ ...s, id: s.session_id || '' }) }
      } catch { /* start fresh */ }
    }
  }, [applySession])

  const saveBCSession = useCallback(async () => {
    const st = stateRef.current
    const body: BCSessionBody = {
      columns: st.cols,
      labels: st.colLabels,
      rows: st.rows.map(r => { const clean: Record<string,string> = {}; for(const k in r) if(k !== '_selected') clean[k] = r[k]; return clean }),
      template: st.message,
      delay_ms: (parseInt(st.delaySec) || 3) * 1000,
      period: st.period || '',
    }
    if(sessionIdRef.current) body.session_id = sessionIdRef.current
    try { localStorage.setItem(BC_SESSION_KEY, JSON.stringify(body)) } catch {}
    try {
      const data = await apiPut('/api/broadcast/session', body)
      if(data && data.session_id) sessionIdRef.current = String(data.session_id)
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => {
    if(sessionLoaded.current) { load(); return }
    sessionLoaded.current = true
    loadBCSession().then(() => load())
  }, [load, loadBCSession])

  useEffect(() => {
    if(waConnected && qrInterval.id) { clearInterval(qrInterval.id); qrInterval.id = 0 }
    else if(!waConnected) { qrInterval.id = setInterval(loadQR, 15000) }
    return () => { if(qrInterval.id) clearInterval(qrInterval.id) }
  }, [waConnected, loadQR])

  // ── History (port of loadBCHistory/showBCDetail, admin-common.js 3714-3792) ──
  const loadBCHistory = useCallback(async () => {
    try { const logs = await apiGet('/api/broadcast/logs'); setHistory(Array.isArray(logs) ? logs : []); setHistoryError(false) }
    catch { setHistory([]); setHistoryError(true) }
  }, [])
  async function showBCDetail(id: string) {
    if(logDetail && logDetail.id === id) return
    try {
      const data = await apiGet(`/api/broadcast/logs/${id}`)
      if(!data || !data.log) return
      setLogDetail({ id, log: data.log, recipients: data.recipients || [] })
    } catch {}
  }

  // ── WebSocket (port of connectBCWebSocket/handleBCEvent, admin-common.js 3798-3838) ──
  // Server message shapes (internal/broadcast/broadcast.go ~394, ~430):
  //   {type:'broadcast_progress', id, phone, status:'sent'|'failed', error, sent, failed, total, percentage}
  //   {type:'broadcast_completed', id, status:'done'|'failed'|'partial', sent, failed, total}
  const handleBCEvent = useCallback((data: any) => {
    if(!data || !data.type) return
    if(data.type === 'broadcast_progress') {
      setProgress({ sent: data.sent || 0, failed: data.failed || 0, percentage: data.percentage || 0 })
      if(data.phone) setLiveLog(p => [...p, { phone: data.phone, status: data.status || 'sent', error: data.error || '' }])
    }
    if(data.type === 'broadcast_completed') {
      bcUnlockBroadcast()
      loadBCHistory()
      loadWAStatus()
      const msg = data.status === 'done' ? 'Broadcast selesai! ' + (data.sent || 0) + ' pesan terkirim.'
        : data.status === 'failed' ? 'Broadcast gagal. ' + (data.failed || 0) + ' dari ' + (data.total || 0) + ' gagal.'
        : 'Broadcast sebagian: ' + (data.sent || 0) + ' terkirim, ' + (data.failed || 0) + ' gagal.'
      alert(msg)
    }
  }, [loadBCHistory, loadWAStatus])
  const handleBCEventRef = useRef(handleBCEvent)
  handleBCEventRef.current = handleBCEvent

  useEffect(() => {
    let reconnectTimer: any
    function connect() {
      const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/broadcast/ws`)
      ws.onmessage = e => { try { handleBCEventRef.current(JSON.parse(e.data)) } catch {} }
      ws.onclose = () => { reconnectTimer = setTimeout(connect, 5000) }
      ws.onerror = () => { ws.close() }
      wsRef.current = ws
    }
    connect()
    return () => { clearTimeout(reconnectTimer); wsRef.current?.close() }
  }, [])

  useEffect(() => { const el = liveLogRef.current; if(el) el.scrollTop = el.scrollHeight }, [liveLog])

  // Old bcLockBroadcast/bcUnlockBroadcast (admin-common.js 2740-2760)
  function bcLockBroadcast() { setSending(true); setLiveLog([]); setProgress({ sent: 0, failed: 0, percentage: 0 }) }
  function bcUnlockBroadcast() { setSending(false) }

  // ── Live Preview (debounced 500ms, port of updateLivePreview, admin-common.js 3462-3475) ──
  const selectedIdx = rows.map((_, i) => i).filter(i => selected.has(i))
  const previewIdx = previewRow !== '' && selected.has(parseInt(previewRow)) ? parseInt(previewRow) : (selectedIdx[0] ?? -1)
  useEffect(() => {
    const t = setTimeout(() => {
      if(!message || previewIdx < 0 || !rows[previewIdx]) { setPreview(null); return }
      const vars: Record<string,string> = {}
      cols.forEach(h => { vars[h] = rows[previewIdx][h] || '' })
      setPreview(renderBCTemplateJS(message, vars))
    }, 500)
    return () => clearTimeout(t)
  }, [message, previewIdx, rows, cols])

  async function disconnectWA() {
    if(!confirm('Disconnect WhatsApp?')) return
    try { await apiPost('/api/broadcast/disconnect', {}) } catch(e: any) { alert('Gagal: ' + e.message); return }
    // Retry status check a few times — wa-service may need a moment to restart
    setWaStatusText('Memutuskan...')
    for(let attempt = 0; attempt < 5; attempt++) {
      await new Promise(r => setTimeout(r, 1500))
      try {
        const data = await apiGet('/api/broadcast/status')
        if(data && !data.connected) { loadWAStatus(); return }
      } catch { /* Service not ready yet, keep retrying */ }
    }
    loadWAStatus()
  }

  // ── Undo / Redo (port of bcSnapshot/bcRestore/bcPushUndo/bcUndo/bcRedo, admin-common.js 3045-3072) ──
  const bcSnapshot = useCallback((): BCSnapshot => {
    const st = stateRef.current
    return { rows: st.rows.map(r => ({ ...r })), headers: st.cols.slice(), labels: st.colLabels.slice() }
  }, [])
  const bcRestore = useCallback((snap: BCSnapshot) => {
    setRows(snap.rows); setCols(snap.headers); setColLabels(snap.labels)
    stateRef.current = { ...stateRef.current, rows: snap.rows, cols: snap.headers, colLabels: snap.labels }
    saveBCSession()
  }, [saveBCSession])
  const bcPushUndo = useCallback(() => {
    undoStack.current.push(bcSnapshot())
    redoStack.current = []
  }, [bcSnapshot])
  const bcUndo = useCallback(() => {
    if(undoStack.current.length === 0) return
    redoStack.current.push(bcSnapshot())
    bcRestore(undoStack.current.pop()!)
  }, [bcSnapshot, bcRestore])
  const bcRedo = useCallback(() => {
    if(redoStack.current.length === 0) return
    undoStack.current.push(bcSnapshot())
    bcRestore(redoStack.current.pop()!)
  }, [bcSnapshot, bcRestore])

  // ── Cell Selection (port of bcCellMouseDown/Move/Up, bcCopySelection, admin-common.js 3074-3157) ──
  const bcCopySelection = useCallback(() => {
    const sel = selRangeRef.current
    if(!sel) return
    const n = normRange(sel)
    const st = stateRef.current
    const lines: string[] = []
    for(let ri = n.r1; ri <= n.r2; ri++) {
      if(ri >= st.rows.length) break
      const vals: string[] = []
      for(let ci = n.c1; ci <= n.c2; ci++) {
        if(ci >= st.cols.length) break
        vals.push(st.rows[ri][st.cols[ci]] || '')
      }
      lines.push(vals.join('\t'))
    }
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {})
  }, [])
  const bcCellMouseUp = useCallback(() => {
    mouseDownPos.current = null
    selecting.current = false
    selAnchor.current = null
    document.removeEventListener('mouseup', bcCellMouseUp)
    document.removeEventListener('selectstart', preventSelect)
  }, [])
  function bcCellMouseDown(e: React.MouseEvent, ri: number, ci: number) {
    if(selRangeRef.current) setSelRange(null)
    if(ci < 0) return
    if(e.shiftKey && selAnchor.current) {
      setSelRange({ startRow: selAnchor.current.row, startCol: selAnchor.current.col, endRow: ri, endCol: ci })
    } else {
      mouseDownPos.current = { x: e.clientX, y: e.clientY, ri, ci }
    }
  }
  function bcCellMouseMove(e: React.MouseEvent, ri: number, ci: number) {
    if(!mouseDownPos.current || !(e.buttons & 1)) return
    const dx = e.clientX - mouseDownPos.current.x, dy = e.clientY - mouseDownPos.current.y
    if(!selecting.current && (dx * dx + dy * dy) < 25) return
    if(!selecting.current) {
      selecting.current = true
      selAnchor.current = { row: mouseDownPos.current.ri, col: mouseDownPos.current.ci }
      document.addEventListener('mouseup', bcCellMouseUp)
      document.addEventListener('selectstart', preventSelect)
    }
    if(ci < 0 || !selAnchor.current) return
    setSelRange({ startRow: selAnchor.current.row, startCol: selAnchor.current.col, endRow: ri, endCol: ci })
  }

  // Keyboard shortcuts (old initBroadcast keydown, admin-common.js 2575-2579): Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z / Ctrl+C
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if(tag === 'INPUT' || tag === 'TEXTAREA') return
      if((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); bcUndo() }
      else if((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); bcRedo() }
      else if((e.ctrlKey || e.metaKey) && e.key === 'c' && selRangeRef.current) { e.preventDefault(); bcCopySelection() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [bcUndo, bcRedo, bcCopySelection])

  // ── Step Navigation (port of bcGoToStep/validateBCStep, admin-common.js 2790-2849) ──
  function validateBCStep(s: number): boolean {
    if(s === 1) {
      if(selected.size === 0) { alert('Pilih minimal 1 kontak (centang baris).'); return false }
      return true
    }
    if(s === 2) {
      if(!message.trim()) { alert('Template pesan tidak boleh kosong.'); return false }
      return true
    }
    return true
  }
  function goToStep(s: number) {
    if(s > step) { if(!validateBCStep(step)) return; saveBCSession() }
    else if(s < step) { saveBCSession() }
    setStep(s)
    if(s === 2) { setPreviewRow(''); setTestContact('') }
  }

  function toggleRow(i: number) { const n = new Set(selected); n.has(i) ? n.delete(i) : n.add(i); setSelected(n) }
  function toggleAll(checked: boolean) { setSelected(checked ? new Set(rows.map((_, i) => i)) : new Set()) }
  function updateCell(ri: number, col: string, val: string) { if((rows[ri]?.[col] || '') === val) return; bcPushUndo(); const u = [...rows]; u[ri] = { ...u[ri], [col]: val }; setRows(u) }
  // Old addBCRow (admin-common.js 3237): new row is selected
  function addRow() { bcPushUndo(); setRows([...rows, cols.reduce((a, c) => ({ ...a, [c]: '' }), {} as Record<string,string>)]); setSelected(new Set([...selected, rows.length])) }
  function deleteRow(ri: number) {
    bcPushUndo()
    setRows(rows.filter((_, i) => i !== ri))
    const n = new Set<number>(); selected.forEach(i => { if(i < ri) n.add(i); else if(i > ri) n.add(i - 1) }); setSelected(n)
  }
  // Port of addBCColumn (admin-common.js 3244-3258): slug the key, duplicate check
  function addCol() {
    const name = prompt('Nama kolom baru:')
    if(!name || !name.trim()) return
    let key = slugKey(name)
    if(!key) key = 'col_' + cols.length
    if(cols.indexOf(key) >= 0) { alert('Kolom "' + key + '" sudah ada.'); return }
    bcPushUndo()
    setCols([...cols, key]); setColLabels([...colLabels, name.trim()])
    setRows(rows.map(r => ({ ...r, [key]: '' })))
  }
  // Port of deleteBCColumn (admin-common.js 3160-3172): confirm, push undo, drop key from every row, save session
  function deleteCol(ci: number) {
    if(ci < 0 || ci >= cols.length) return
    const key = cols[ci]; const label = colLabels[ci] || key
    if(!confirm(`Hapus kolom "${label}"?`)) return
    bcPushUndo()
    const nc = cols.filter((_, i) => i !== ci), nl = colLabels.filter((_, i) => i !== ci)
    const nr = rows.map(r => { const o = { ...r }; delete o[key]; return o })
    setCols(nc); setColLabels(nl); setRows(nr)
    setSelRange(null)
    stateRef.current = { ...stateRef.current, rows: nr, cols: nc, colLabels: nl }
    saveBCSession()
  }
  // Port of renameBCColumn (admin-common.js 3266-3279): rename label AND migrate the {{key}} + row data
  function renameCol(ci: number) {
    const key = cols[ci]
    const currentLabel = colLabels[ci] || key
    const newLabel = prompt('Rename kolom "' + currentLabel + '":', currentLabel)
    if(newLabel === null || !newLabel.trim() || newLabel.trim() === currentLabel) return
    bcPushUndo()
    const nl = [...colLabels]; nl[ci] = newLabel.trim()
    const newKey = slugKey(newLabel)
    if(newKey && newKey !== key && cols.indexOf(newKey) < 0) {
      const nr = rows.map(r => {
        if(!Object.prototype.hasOwnProperty.call(r, key)) return r
        const o = { ...r }; o[newKey] = o[key]; delete o[key]; return o
      })
      const nc = [...cols]; nc[ci] = newKey
      setCols(nc); setRows(nr)
    }
    setColLabels(nl)
  }

  // Port of onBCCellPaste (admin-common.js 3281-3325): tab = column, newline = row; grows the table as needed
  function onCellPaste(e: React.ClipboardEvent<HTMLTableCellElement>, ri: number, ci: number) {
    const text = e.clipboardData.getData('text')
    if(!text) return
    // Single value (no tab/newline) → let normal contenteditable input handle it
    if(text.indexOf('\t') < 0 && text.indexOf('\n') < 0 && text.indexOf('\r') < 0) return
    e.preventDefault(); e.stopPropagation()
    if(ci < 0) return
    bcPushUndo()
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
    if(lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
    let origRow = ri, origCol = ci
    if(selRangeRef.current) { const n = normRange(selRangeRef.current); origRow = n.r1; origCol = n.c1 }
    // First pass: determine needed dimensions
    let maxCols = 0
    const parsedLines = lines.map(l => { const vals = l.split('\t'); if(vals.length > maxCols) maxCols = vals.length; return vals })
    const headers = cols.slice(), labels = colLabels.slice()
    // Expand columns if needed (add unnamed-N for extras)
    while(headers.length < origCol + maxCols) {
      headers.push('unnamed-' + (headers.length + 1))
      labels.push('unnamed-' + headers.length)
    }
    const newRows = rows.map(r => ({ ...r }))
    // Expand rows if needed
    while(newRows.length < origRow + lines.length) {
      const emptyRow: Record<string,string> = {}
      headers.forEach(h => { emptyRow[h] = '' })
      newRows.push(emptyRow)
    }
    // Fill data
    for(let i = 0; i < parsedLines.length; i++) {
      const r = origRow + i
      for(let vi = 0; vi < parsedLines[i].length; vi++) {
        const c = origCol + vi
        if(c < headers.length) newRows[r][headers[c]] = parsedLines[i][vi]
      }
    }
    setCols(headers); setColLabels(labels); setRows(newRows)
    stateRef.current = { ...stateRef.current, rows: newRows, cols: headers, colLabels: labels }
    saveBCSession()
  }

  function importCSV() {
    const input = csvRef.current || document.createElement('input')
    input.type = 'file'; input.accept = '.csv'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]; if(!file) return
      const text = await file.text()
      const lines = text.split('\n').filter((l: string) => l.trim())
      if(lines.length < 2) { alert('CSV kosong'); return }
      bcPushUndo()
      const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase())
      const allCols = new Set(cols)
      headers.forEach((h: string) => allCols.add(h))
      const newCols = Array.from(allCols)
      setCols(newCols)
      setColLabels(newCols.map((c, i) => colLabels[i] && cols[i] === c ? colLabels[i] : c))
      const newRows = [...rows]
      for(let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map((v: string) => v.trim())
        const row: Record<string,string> = {}
        headers.forEach((h: string, idx: number) => { row[h] = vals[idx] || '' })
        newRows.push(row)
      }
      setRows(newRows)
    }
    input.click()
  }

  // Port of insertBCVar (admin-common.js 3418-3430)
  function insertVar(v: string) {
    const el = textareaRef.current; if(!el) return
    const start = el.selectionStart, end = el.selectionEnd
    const insert = `{{${v}}}`
    el.value = el.value.slice(0, start) + insert + el.value.slice(end)
    el.selectionStart = el.selectionEnd = start + insert.length
    el.focus()
    setMessage(el.value)
  }

  // Port of bcCopyLLMContext (admin-common.js 2706-2738)
  function bcCopyLLMContext() {
    if(!cols.length) { alert('Belum ada data kontak.'); return }
    const sample: Record<string,string> = {}
    if(rows.length > 0) cols.forEach(h => { sample[h] = rows[0][h] || '' })
    const c = cols.map((h, i) => '  - ' + h + ' (label: "' + (colLabels[i] || h) + '") = ' + (sample[h] || '(kosong)')).join('\n')
    const ctx = '# Template Broadcast PKSE UGM\n\n'
      + '## Data Columns (from first contact)\n' + c + '\n\n'
      + '## Template Syntax Rules\n'
      + '- Variable: {{column_name}}\n'
      + '- Filters: {{col|uppercase}}, {{col|lowercase}}, {{col|capitalize}}, {{col|titlecase}}, {{col|trim}}, {{col|length}}, {{col|default:"fallback"}}, {{col|slice:"start,end"}}, {{col|replace:"find,replace"}}, {{col|repeat:N}}\n'
      + '- Math: {{col + N}}, {{col - N}}\n'
      + '- Set variable: {{set var="value"}} then use {{var}}\n'
      + '- Conditionals (support nesting):\n'
      + '  {{if col == "val"}}...{{else}}...{{endif}}\n'
      + '  {{if col != "val"}}...{{endif}}\n'
      + '  {{if col contains "val"}}...{{endif}}\n'
      + '  {{if col startswith "val"}}...{{endif}}\n'
      + '  {{if col endswith "val"}}...{{endif}}\n'
      + '  {{if col matches "regex"}}...{{endif}}\n'
      + '  {{if col empty}}...{{endif}}\n'
      + '  {{if col notempty}}...{{endif}}\n'
      + '  {{if col > "val"}}...{{endif}}\n'
      + '  {{if col >= "val"}}...{{endif}}\n'
      + '  {{if col < "val"}}...{{endif}}\n'
      + '  {{if col <= "val"}}...{{endif}}\n\n'
      + '## Task\n'
      + 'Using the data columns above, generate a WhatsApp broadcast message template using the syntax rules.\n'
      + 'Use conditionals to handle different cases (e.g., empty fields, different departments, etc.).\n'
      + 'Only output the template text, nothing else.\n'
    const done = () => alert('Context berhasil disalin ke clipboard!')
    navigator.clipboard.writeText(ctx).then(done).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = ctx; document.body.appendChild(ta); ta.select()
      document.execCommand('copy'); document.body.removeChild(ta)
      done()
    })
  }

  // Port of sendBCTest (admin-common.js 3609-3641)
  async function sendBCTest() {
    if(!message.trim()) { alert('Template pesan kosong.'); return }
    let phone = '', msg = ''
    const idx = testContact !== '' ? parseInt(testContact) : -1
    if(testContact !== '' && rows[idx]) {
      // Send to existing contact — use their actual data
      const row = rows[idx]
      const pk = findPhoneKey()
      if(pk) phone = (row[pk] || '').replace(/\D/g, '')
      if(!phone || phone.length < 8) { alert('Kontak tidak memiliki nomor HP valid.'); return }
      const vars: Record<string,string> = {}
      cols.forEach(h => { vars[h] = row[h] || '' })
      msg = renderBCTemplateJS(message, vars)
    } else {
      // Custom number — send exactly what the preview shows
      phone = testPhone.trim().replace(/\D/g, '')
      if(!phone || phone.length < 8) { alert('Masukkan nomor HP valid (min 8 digit).'); return }
      msg = preview !== null ? preview : renderBCTemplateJS(message, {})
    }
    try {
      await apiPost('/api/broadcast/send', { message: msg, phones: [phone], messages: [msg], delay_ms: 0 })
      alert('Test terkirim ke ' + phone)
    } catch(e: any) { alert('Gagal kirim test: ' + e.message) }
  }

  // Port of sendBroadcast (admin-common.js 3666-3712): locks until WS broadcast_completed
  async function sendBroadcast() {
    const sel = rows.filter((_, i) => selected.has(i))
    if(sel.length === 0) { alert('Pilih minimal 1 kontak.'); return }
    if(!message.trim()) { alert('Template pesan kosong.'); return }
    if(!confirm('Kirim broadcast ke ' + sel.length + ' kontak?')) return

    const phoneKey = findPhoneKey()
    if(!phoneKey) { alert('Kolom nomor HP tidak ditemukan. Pastikan ada kolom "phone" atau "no_hp".'); return }

    const phones: string[] = [], messages: string[] = []
    sel.forEach(row => {
      const ph = (row[phoneKey] || '').replace(/\D/g, '')
      if(ph.length < 8) return
      phones.push(ph)
      const vars: Record<string,string> = {}
      cols.forEach(h => { vars[h] = row[h] || '' })
      messages.push(renderBCTemplateJS(message, vars))
    })
    if(phones.length === 0) { alert('Tidak ada kontak dengan nomor HP valid.'); return }

    const delayMs = (parseInt(delaySec) || 3) * 1000
    bcLockBroadcast()
    try {
      await apiPost('/api/broadcast/send', { message, phones, messages, delay_ms: delayMs })
    } catch(e: any) {
      alert('Gagal memulai broadcast: ' + e.message)
      bcUnlockBroadcast()
    }
  }

  if(loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  const selectedCount = selected.size
  const stepLabels = ['Kontak', 'Pesan', 'Kirim']
  const btnPrimary = 'bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2 rounded-lg transition font-medium flex items-center gap-2'
  const btnBack = 'bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm px-5 py-2 rounded-lg transition font-medium flex items-center gap-2'
  const iconNext = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
  const iconBack = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
  const iconPlus = <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">WhatsApp Broadcast</h2>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-sm ${waConnected ? 'text-green-600' : 'text-red-500'}`}>
            {waConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {waConnected ? 'Terhubung' : 'Tidak terhubung'}
          </span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl w-fit mb-4">
        {[{k:'connection',l:'Koneksi'},{k:'broadcast',l:'Broadcast'},{k:'log',l:'Log'}].map(t => (
          <button key={t.k} onClick={() => { if(sending && t.k !== 'broadcast') return; setTab(t.k as any); if(t.k === 'log') loadBCHistory() }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.k ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t.l}</button>
        ))}
      </div>

      {/* ═══ TAB: Connection ═══ */}
      {tab === 'connection' && (
        <section className="border border-slate-200 rounded-xl p-6 bg-white">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Koneksi WhatsApp
          </h3>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-3.5 h-3.5 rounded-full ${waConnected ? 'bg-green-500' : waStatusText === 'Memutuskan...' ? 'bg-yellow-400' : waStatusText === 'Service tidak tersedia' ? 'bg-slate-400' : 'bg-red-500'}`} />
            <span className="text-sm text-slate-600 font-medium">{waStatusText}</span>
            <button onClick={loadWAStatus} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition border border-slate-200">Refresh</button>
            <button onClick={disconnectWA} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg transition border border-red-200 ml-auto">Disconnect</button>
          </div>
          {!waConnected && (
            <div className="border border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center bg-slate-50">
              <p className="text-sm text-slate-600 mb-3 font-medium">Scan QR code dengan WhatsApp</p>
              {qrCode && <img src={qrCode} alt="QR Code" className="w-56 h-56 border-2 border-white shadow-lg rounded-xl bg-white p-2" />}
              <p className="text-xs text-slate-400 mt-3">Buka WhatsApp &gt; Perangkat tertaut &gt; Tautkan perangkat</p>
              <button onClick={loadQR} className="mt-3 text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg transition font-medium flex items-center gap-1"><RefreshCw className="w-3 h-3" />Refresh QR</button>
            </div>
          )}
        </section>
      )}

      {/* ═══ TAB: Broadcast (Wizard) ═══ */}
      {tab === 'broadcast' && (
        <div className="relative bg-white rounded-xl border border-slate-200 p-6">
          {/* Send Lock Overlay */}
          {sending && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-30 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm font-medium text-blue-700">Broadcast sedang berlangsung...</p>
              </div>
            </div>
          )}

          {/* Step Indicator (old updateStepIndicators: done = green check, current = blue) */}
          <div className="flex items-center gap-2 sm:gap-3 mb-5">
            {stepLabels.map((l, i) => {
              const s = i + 1, done = s < step, cur = s === step
              return (
                <button key={s} onClick={() => goToStep(s)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${done ? 'bg-green-500 text-white' : cur ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'} text-xs sm:text-sm font-medium`}>
                  <span className={`w-5 h-5 rounded-full ${done ? 'bg-white text-green-500' : cur ? 'bg-white text-blue-600' : 'bg-slate-300 text-slate-500'} text-xs flex items-center justify-center font-bold`}>{done ? '✓' : s}</span>
                  <span className="hidden sm:inline">{l}</span>
                </button>
              )
            })}
          </div>

          {/* Step 1: Contacts Table */}
          {step === 1 && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <select value={contactFilter || period || 'ALL'} onChange={e => setContactFilter(e.target.value)} className="text-sm border border-slate-300 rounded-lg px-2 py-1">
                  <option value="ALL">Semua Periode</option>
                  {periods.map((p: any) => (
                    <option key={p.label || p.Label} value={p.label || p.Label}>{p.display_name || p.DisplayName || p.label || p.Label}</option>
                  ))}
                </select>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={addRow} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1">{iconPlus}Tambah Baris</button>
                  <button onClick={addCol} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1">{iconPlus}Tambah Kolom</button>
                  <button onClick={bcUndo} className="bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs px-2 py-1.5 rounded-lg transition" title="Undo (Ctrl+Z)">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a5 5 0 015 5v2M3 10l5-5M3 10l5 5"/></svg>
                  </button>
                  <button onClick={bcRedo} className="bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs px-2 py-1.5 rounded-lg transition" title="Redo (Ctrl+Y)">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10H11a5 5 0 00-5 5v2M21 10l-5-5M21 10l-5 5"/></svg>
                  </button>
                  <button onClick={importCSV} className="bg-green-50 hover:bg-green-100 text-green-700 text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1"><Upload className="w-3 h-3" />Import CSV</button>
                </div>
                <span className="text-xs text-slate-400 sm:ml-auto">{rows.length} kontak{selectedCount > 0 ? ` (${selectedCount} dipilih)` : ''}</span>
              </div>
              <div className="overflow-auto bg-white rounded-lg border border-slate-200" style={{ maxHeight: '55vh' }}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                      <th className="px-3 py-2 w-8 text-center"><input type="checkbox" checked={selectedCount >= rows.length && rows.length > 0} onChange={e => toggleAll(e.target.checked)} className="rounded" title="Pilih semua" /></th>
                      {cols.map((c, i) => (
                        <th key={c} className="px-3 py-2 min-w-[120px] cursor-pointer hover:text-blue-600 select-none whitespace-nowrap group" onDoubleClick={() => renameCol(i)} title="Double-click untuk rename variabel">
                          {colLabels[i] || c}
                          <button onClick={e => { e.stopPropagation(); deleteCol(i) }} className="ml-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs transition" title="Hapus kolom">&times;</button>
                        </th>
                      ))}
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(rows.length === 0 || cols.length === 0) ? (
                      <tr><td colSpan={Math.max(cols.length + 2, 3)} className="text-center text-slate-400 py-8 text-sm">Tidak ada kontak. Tambahkan baris manual atau paste CSV.</td></tr>
                    ) : rows.map((r, ri) => (
                      <tr key={ri} className="border-t border-slate-100 hover:bg-blue-50/50">
                        <td className="px-2 py-1 text-center w-8"><input type="checkbox" checked={selected.has(ri)} onChange={() => toggleRow(ri)} className="rounded" /></td>
                        {cols.map((c, ci) => (
                          <td key={c} className={`px-2 py-1 border-r border-slate-100 last:border-r-0${isCellSelected(selRange, ri, ci) ? ' bg-blue-200' : ''}`}
                            contentEditable suppressContentEditableWarning data-row={ri} data-col={c}
                            onMouseDown={e => bcCellMouseDown(e, ri, ci)}
                            onMouseMove={e => bcCellMouseMove(e, ri, ci)}
                            onBlur={e => updateCell(ri, c, e.currentTarget.textContent || '')}
                            onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur() } }}
                            onPaste={e => onCellPaste(e, ri, ci)}>{r[c] || ''}</td>
                        ))}
                        <td className="px-2 py-1 text-center w-10"><button onClick={() => deleteRow(ri)} className="text-red-400 hover:text-red-600 text-xs p-1" title="Hapus">&times;</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-3">Tip: Double-click column header untuk rename variabel. Klik sel untuk edit. Centang baris untuk pilih penerima broadcast. Ctrl+V untuk paste data dari spreadsheet.</p>
              <div className="flex items-center justify-end mt-4 pt-3 border-t border-slate-200">
                <button onClick={() => goToStep(2)} className={btnPrimary}>Selanjutnya{iconNext}</button>
              </div>
            </div>
          )}

          {/* Step 2: Compose Template + Live Preview */}
          {step === 2 && (
            <div>
              <section className="border border-slate-200 rounded-xl p-5 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-700">Template Pesan</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={bcCopyLLMContext} className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition border border-purple-200" title="Salin konteks untuk LLM lain">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                      Copy LLM
                    </button>
                    <button onClick={() => setShowHelp(true)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition border border-blue-200" title="Bantuan sintaks template">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      Bantuan
                    </button>
                  </div>
                </div>
                <textarea ref={textareaRef} rows={8} value={message} onChange={e => setMessage(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-300 focus:outline-none" placeholder="Tulis template pesan di sini..." />

                {/* Variable chips */}
                <div className="mt-3">
                  <label className="text-xs text-slate-500 block mb-1.5">Variabel tersedia <span className="text-slate-400">(klik untuk insert):</span></label>
                  <div className="flex flex-wrap gap-1.5">
                    {cols.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Tidak ada variabel. Muat kontak di Langkah 1.</span>
                    ) : cols.map((h, i) => (
                      <button key={h} type="button" onClick={() => insertVar(h)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 cursor-pointer transition whitespace-nowrap">{`{{${h}}}`} <span className="text-blue-400 font-normal">{colLabels[i] || h}</span></button>
                    ))}
                  </div>
                </div>

                {/* Live Preview */}
                <div className="mt-4 border-t border-slate-200 pt-3">
                  <div className="flex items-center gap-3 mb-2">
                    <label className="text-xs font-medium text-slate-600">Preview:</label>
                    <select value={previewIdx >= 0 ? String(previewIdx) : ''} onChange={e => setPreviewRow(e.target.value)} className="text-xs border border-slate-300 rounded-lg px-2 py-1">
                      {selectedIdx.map(ri => <option key={ri} value={ri}>{rows[ri].full_name || rows[ri].phone || `Baris ${ri + 1}`}</option>)}
                    </select>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap min-h-[60px] max-h-48 overflow-y-auto">
                    {preview === null
                      ? <span className="text-slate-400 italic">{message ? 'Pilih kontak dan ketik template untuk melihat preview.' : 'Mulai mengetik template untuk melihat preview...'}</span>
                      : preview}
                  </div>
                </div>

                {/* Test Broadcast */}
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 block mb-1">Test ke:</label>
                      <select value={testContact} onChange={e => setTestContact(e.target.value)} className="text-sm border border-slate-300 rounded-lg px-2 py-2 focus:ring-2 focus:ring-blue-300 focus:outline-none">
                        <option value="">-- pilih kontak --</option>
                        {selectedIdx.map(ri => <option key={ri} value={ri}>{rows[ri].full_name || rows[ri].nickname || `Baris ${ri + 1}`}</option>)}
                      </select>
                    </div>
                    {testContact === '' && (
                      <div className="flex-1">
                        <label className="text-xs text-slate-500 block mb-1">Nomor custom:</label>
                        <input type="text" value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="08xxxxxxxxxx" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none" />
                      </div>
                    )}
                    <button onClick={sendBCTest} className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-3 py-2 rounded-lg transition font-medium">Kirim Test</button>
                  </div>
                </div>
              </section>
              <div className="flex items-center justify-between mt-5">
                <button onClick={() => goToStep(1)} className={btnBack}>{iconBack}Kembali</button>
                <button onClick={() => goToStep(3)} className={btnPrimary}>Selanjutnya{iconNext}</button>
              </div>
            </div>
          )}

          {/* Step 3: Configure & Send */}
          {step === 3 && (
            <div>
              <section className="border border-slate-200 rounded-xl p-5 bg-white">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Delay antar pesan (detik)</label>
                      <input type="number" min={0} max={60} value={delaySec} onChange={e => setDelaySec(e.target.value)} className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Penerima terpilih</label>
                      <span className="text-sm font-bold text-blue-600">{selectedCount}</span>
                    </div>
                  </div>
                  <button onClick={sendBroadcast} disabled={sending} className={`w-full bg-green-600 hover:bg-green-700 text-white text-sm px-5 py-2.5 rounded-lg transition flex items-center justify-center gap-2 font-medium${sending ? ' opacity-50' : ''}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-2zm0 0v-8"/></svg>
                    Kirim Broadcast
                  </button>
                </div>
              </section>

              {/* Live Progress Panel (shown during sending) */}
              {sending && (
                <div className="mt-4 border border-blue-200 rounded-xl bg-blue-50/50 overflow-hidden">
                  <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span className="text-sm font-medium">Sedang Mengirim...</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-green-300">{progress.sent} terkirim</span>
                      <span className="text-red-300">{progress.failed} gagal</span>
                      <span className="font-bold">{Math.round(progress.percentage)}%</span>
                    </div>
                  </div>
                  <div className="px-5 pt-3">
                    <div className="w-full bg-blue-200 rounded-full h-2 mb-4">
                      <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress.percentage}%` }}></div>
                    </div>
                  </div>
                  <div ref={liveLogRef} className="px-5 pb-4 max-h-64 overflow-y-auto space-y-1">
                    {liveLog.map((l, i) => {
                      const ok = l.status === 'sent'
                      return (
                        <div key={i} className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${ok ? 'bg-green-50' : 'bg-red-50'}`}>
                          <span className="text-slate-400 w-6 text-right flex-shrink-0">{i + 1}</span>
                          {ok ? <span className="text-green-500 flex-shrink-0">&#10003;</span> : <span className="text-red-500 flex-shrink-0">&#10007;</span>}
                          <span className="text-slate-700 font-mono">{l.phone}</span>
                          {l.error && <span className="text-red-400 truncate max-w-[200px]"> — {l.error}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-start mt-4">
                <button onClick={() => goToStep(2)} className={btnBack}>{iconBack}Kembali</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: Log ═══ */}
      {tab === 'log' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-700">Riwayat Broadcast</h3>
            <button onClick={loadBCHistory} className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1 rounded-lg transition border border-slate-200">Refresh</button>
          </div>
          {historyError ? <p className="text-sm text-red-500">Gagal memuat riwayat.</p>
            : history.length === 0 ? <p className="text-sm text-slate-400 italic">Belum ada riwayat broadcast.</p>
            : (
              <div className="space-y-2">
                {history.slice(0, 20).map((log: any) => {
                  const badge = log.status === 'done' ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Selesai</span>
                    : log.status === 'failed' ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Gagal</span>
                    : log.status === 'partial' ? <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Sebagian</span>
                    : log.status === 'sending' ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Mengirim</span>
                    : <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{log.status || ''}</span>
                  const date = log.started_at ? new Date(log.started_at).toLocaleString('id-ID') : ''
                  const open = logDetail && logDetail.id === log.id
                  const d = open ? logDetail!.log : null
                  const statusText = d ? (d.status === 'done' ? 'Selesai' : d.status === 'failed' ? 'Gagal' : (d.status || '')) : ''
                  const statusColor = d ? (d.status === 'done' ? 'text-green-600' : d.status === 'failed' ? 'text-red-600' : 'text-yellow-600') : ''
                  return (
                    <div key={log.id}>
                      <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50" onClick={() => showBCDetail(log.id)}>
                        {badge}
                        <span className="text-xs text-slate-400 hidden sm:inline">{date}</span>
                        <span className="text-sm text-slate-700 flex-1 truncate">{(log.message || '').substring(0, 80)}</span>
                        <span className="text-xs text-slate-400">{log.sent_count || 0}/{log.total_receivers || 0}</span>
                      </div>
                      {open && d && (
                        <div className="ml-4 sm:ml-8 mt-1 border border-slate-200 rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-slate-700">Detail Broadcast</h4>
                            <button onClick={() => setLogDetail(null)} className="text-xs text-slate-400 hover:text-slate-600">&times; Tutup</button>
                          </div>
                          <div className="text-sm text-slate-600 space-y-1 mb-3">
                            <p><strong>Status:</strong> <span className={statusColor}>{statusText}</span></p>
                            <p><strong>Terkirim:</strong> {d.sent_count || 0} / {d.total_receivers || 0}</p>
                            {d.completed_at && <p><strong>Selesai:</strong> {new Date(d.completed_at).toLocaleString('id-ID')}</p>}
                          </div>
                          <div className="border-t border-slate-200 pt-3">
                            <p className="text-xs font-medium text-slate-500 mb-2">Pesan:</p>
                            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap max-h-32 overflow-y-auto">{d.message || ''}</div>
                          </div>
                          {logDetail!.recipients.length > 0 && (
                            <div className="border-t border-slate-200 pt-3 mt-3">
                              <p className="text-xs font-medium text-slate-500 mb-2">Penerima ({logDetail!.recipients.length}):</p>
                              <div className="max-h-40 overflow-y-auto space-y-1">
                                {logDetail!.recipients.map((r: any, i: number) => (
                                  <div key={i} className="text-xs flex items-center gap-2">
                                    {r.status === 'sent' ? <span className="text-green-500">&#10003;</span> : <span className="text-red-500">&#10007;</span>}
                                    <span className="text-slate-600">{r.phone || ''}</span>
                                    {r.error && <span className="text-red-400">{r.error}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
        </div>
      )}

      {/* Help Modal */}
      {showHelp && <BCHelpModal cols={cols} labels={colLabels} rows={rows} onClose={() => setShowHelp(false)} />}
    </div>
  )
}
