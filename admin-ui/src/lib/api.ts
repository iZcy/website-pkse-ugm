const BASE = ''

async function request(url: string, opts: RequestInit = {}) {
  const res = await fetch(BASE + url, { credentials: 'same-origin', ...opts })
  if (res.status === 401) { window.location.href = '/admin' }
  return res
}

export async function apiGet(url: string) {
  const res = await request(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export async function apiPost(url: string, body: Record<string, unknown>) {
  const res = await request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export async function apiPut(url: string, body?: Record<string, unknown>) {
  const res = await request(url, {
    method: 'PUT',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json().catch(() => ({}))
}

export async function apiDelete(url: string) {
  const res = await request(url, { method: 'DELETE' })
  if (!res.ok) throw new Error('Delete failed')
}

// Types from the Go backend
export interface Activity {
  id: string
  period_label: string
  category: string
  name: string
  date: string
  attendee_ids: string[]
  created_at: string
}

export interface Member {
  id: string
  full_name: string
  department: string
  nim?: string
  photo_url?: string
}

export interface RaporInstance {
  id: string
  period_label: string
  title: string
  activity_start: string
  activity_end: string
  published: boolean
  created_at: string
}

export interface RaporEntry {
  id: string
  instance_id: string
  member_id: string
  period_label: string
  scores: number[]
  feedback: string
  token: string
  published: boolean
  created_at: string
  updated_at: string
}
