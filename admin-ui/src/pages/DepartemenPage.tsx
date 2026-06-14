import { useState, useEffect, useCallback, useRef } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus, Pencil, Trash2, GripVertical, UserPlus, Network } from 'lucide-react'
import ImageUpload from '../components/ImageUpload'
import Sortable from 'sortablejs'

export default function DepartemenPage() {
  const { period } = usePeriod()
  const [depts, setDepts] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [editId, setEditId] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', icon: '', icon_url: '', parent_id: '', sort_order: 0 })
  const [assignDeptId, setAssignDeptId] = useState('')
  const [checkedMembers, setCheckedMembers] = useState<Set<string>>(new Set())
  const sortRef = useRef<Sortable | null>(null)

  const load = useCallback(async () => {
    try {
      const [d, m1] = await Promise.all([
        apiGet(`/api/cms/departments?period=${period}`),
        apiGet(`/api/cms/members?period=${period}`),
      ])
      setDepts((d || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)))
      let allMembers = m1.items || m1 || []
      const totalPages = m1.pages || 1
      for (let p = 2; p <= totalPages; p++) {
        const m2 = await apiGet(`/api/cms/members?period=${period}&page=${p}`)
        const items = m2?.items || []
        allMembers = allMembers.concat(items)
      }
      setMembers(allMembers.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)))
    } catch { setDepts([]); setMembers([]) }
    setLoading(false)
  }, [period])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    const el = document.getElementById('dept-cards')
    if (!el || loading || depts.length === 0) return
    sortRef.current?.destroy()
    sortRef.current = Sortable.create(el, {
      animation: 180, handle: '.drag-handle', draggable: '.dept-card',
      onEnd: async () => {
        const cards = el.querySelectorAll('.dept-card')
        for (let i = 0; i < cards.length; i++) {
          const id = (cards[i] as HTMLElement).dataset.deptId
          if (id) await apiPut(`/api/cms/departments/${id}`, { sort_order: i }).catch(() => {})
        }
        load()
      },
    })
    return () => { sortRef.current?.destroy(); sortRef.current = null }
  }, [depts, loading])

  function buildTree() {
    const map = new Map<string, any>(); const roots: any[] = []
    depts.forEach((d: any) => { d._children = []; map.set(d.id, d) })
    depts.forEach((d: any) => {
      if (d.parent_id && map.has(d.parent_id)) map.get(d.parent_id)._children.push(d)
      else roots.push(d)
    })
    return roots
  }

  function getDeptMembers(deptName: string) {
    return members.filter((m: any) => (m.department || '').toLowerCase() === (deptName || '').toLowerCase())
  }

  function openAdd(pid?: string) {
    setEditId('')
    setForm({ name: '', description: '', icon: '', icon_url: '', parent_id: pid || '', sort_order: depts.length })
    setShowModal(true)
  }
  function openEdit(d: any) {
    setEditId(d.id)
    setForm({ name: d.name || '', description: d.description || '', icon: d.icon || '', icon_url: d.icon_url || '', parent_id: d.parent_id || '', sort_order: d.sort_order || 0 })
    setShowModal(true)
  }

  async function save() {
    if (!form.name) return alert('Nama wajib diisi')
    setSaving(true)
    try {
      const body: any = { ...form, period_label: period }
      if (editId) await apiPut(`/api/cms/departments/${editId}`, body)
      else await apiPost('/api/cms/departments', body)
      setShowModal(false); load()
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  async function remove(id: string) {
    if (!confirm('Hapus departemen ini?')) return
    await apiDelete(`/api/cms/departments/${id}`); load()
  }

  function openAssign(deptId: string) {
    setAssignDeptId(deptId); setCheckedMembers(new Set()); setShowAssign(true)
  }

  async function saveAssign() {
    setSaving(true)
    for (const mid of checkedMembers) {
      const m = members.find((x: any) => x.id === mid)
      await apiPut(`/api/cms/members/${mid}`, {
        department: depts.find((d: any) => d.id === assignDeptId)?.name || m?.department,
        sort_order: m?.sort_order || 0, position: m?.position || '',
      }).catch(() => {})
    }
    setShowAssign(false); load(); setSaving(false)
  }

  const unassigned = members.filter((m: any) => !m.department || !depts.some((d: any) => d.name?.toLowerCase() === m.department?.toLowerCase()))
  const tree = buildTree()
  const parentOptions = depts.filter((d: any) => d.id !== editId && !d.parent_id)

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Kementerian / Departemen</h2>
        <button onClick={() => openAdd()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Tambah</button>
      </div>

      <div id="dept-cards" className="space-y-3">
        {depts.length === 0 && <div className="text-slate-400 text-center py-8">Belum ada departemen.</div>}
        {tree.map((d: any) => (
          <DeptCard key={d.id} d={d} depth={0} members={getDeptMembers(d.name)}
            onEdit={openEdit} onDelete={remove} onAddSub={openAdd} onAssign={openAssign} />
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold p-6 pb-0 flex-shrink-0">{editId ? 'Edit' : 'Tambah'} Departemen</h3>
            <div className="overflow-y-auto flex-1 p-6 space-y-3">
              <div><label className="text-sm font-medium">Nama</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">Deskripsi</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">Icon (emoji)</label><input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">Icon URL</label><ImageUpload value={form.icon_url} onChange={url => setForm({ ...form, icon_url: url })} /></div>
              <div><label className="text-sm font-medium">Induk</label><select value={form.parent_id} onChange={e => setForm({ ...form, parent_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="">- Tidak ada -</option>{parentOptions.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div><label className="text-sm font-medium">Urutan</label><input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex gap-2 justify-end p-6 pt-0 flex-shrink-0"><button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button><button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{saving ? '...' : 'Simpan'}</button></div>
          </div>
        </div>
      )}

      {showAssign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowAssign(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-bold p-6 pb-0 flex-shrink-0">Assign Anggota ke {depts.find((d: any) => d.id === assignDeptId)?.name}</h3>
            <div className="overflow-y-auto flex-1 p-6 space-y-1">
              {unassigned.length === 0 && <div className="text-slate-400 text-sm">Semua anggota memiliki departemen.</div>}
              {unassigned.map((m: any) => (
                <label key={m.id} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer text-sm">
                  <input type="checkbox" checked={checkedMembers.has(m.id)} onChange={() => { const n = new Set(checkedMembers); n.has(m.id) ? n.delete(m.id) : n.add(m.id); setCheckedMembers(n) }} />
                  {m.full_name}
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end p-6 pt-0 flex-shrink-0"><button onClick={() => setShowAssign(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button><button onClick={saveAssign} disabled={saving || checkedMembers.size === 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{saving ? '...' : `Assign (${checkedMembers.size})`}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

function DeptCard({ d, depth, members, onEdit, onDelete, onAddSub, onAssign }: any) {
  const ml = depth * 24
  return (
    <div>
      <div className="dept-card bg-white rounded-xl p-4 border border-slate-200 space-y-3" data-dept-id={d.id} style={{ marginLeft: ml }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2 min-w-0">
            <button className="drag-handle mt-0.5 text-slate-400 hover:text-slate-600 cursor-grab p-0.5" title="Geser urutan"><GripVertical className="w-4 h-4" /></button>
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {d.icon_url ? <img loading="lazy" src={d.icon_url} className="w-full h-full object-contain p-1" alt="" /> : <span className="text-xl">{d.icon || <Network className="w-5 h-5 text-slate-400" />}</span>}
            </div>
            <div className="min-w-0"><h3 className="font-semibold text-slate-800">{d.name}</h3>{d.description && <p className="text-slate-500 text-sm">{d.description}</p>}</div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => onAddSub(d.id)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs">+ Sub</button>
            <button onClick={() => onAssign(d.id)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs"><UserPlus className="w-3 h-3 inline mr-0.5" />Assign</button>
            <button onClick={() => onEdit(d)} className="p-1 hover:bg-slate-100 rounded"><Pencil className="w-3.5 h-3.5 text-blue-600" /></button>
            <button onClick={() => onDelete(d.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2 min-h-[36px]">
          {members.length === 0 ? <div className="text-xs text-slate-400 p-1">Belum ada anggota di kementerian ini.</div> : (
            <div className="flex flex-wrap gap-1">{members.map((m: any) => (
              <span key={m.id} className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 rounded-full px-2 py-1">{m.photo_url ? <img loading="lazy" src={`${m.photo_url}?size=thumb`} className="w-4 h-4 rounded-full" alt="" /> : null}{m.full_name}</span>
            ))}</div>
          )}
        </div>
      </div>
      {d._children?.length > 0 && (
        <div className="ml-6 mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
          {d._children.map((child: any) => <DeptCard key={child.id} d={child} depth={depth + 1} members={[]} onEdit={onEdit} onDelete={onDelete} onAddSub={onAddSub} onAssign={onAssign} />)}
        </div>
      )}
    </div>
  )
}
