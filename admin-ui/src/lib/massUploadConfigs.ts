// Per-entity column configs for the Mass Upload grid.
// Ported from the `// ── Mass Upload Configs ──` section of static/admin-common.js.
// `entity` must match a case in bulkCreateOne (internal/cms/cms.go); column keys
// must match the JSON tags of the corresponding db struct.

export type MassUploadColumnType = 'text' | 'boolean' | 'select'

export interface MassUploadColumn {
  key: string
  label: string
  required?: boolean
  type?: MassUploadColumnType
  options?: string[]
  default?: string
}

export interface MassUploadConfig {
  /** Entity name sent as `entity` to POST /api/cms/bulk-create */
  entity: string
  /** Shown in the modal title: "Mass Upload — {title}" */
  title: string
  /** When true, `period_label` (current admin period) is injected into every item that has none */
  hasPeriod: boolean
  columns: MassUploadColumn[]
}

export const pengumumanMassUploadConfig: MassUploadConfig = {
  entity: 'announcements', title: 'Pengumuman', hasPeriod: true,
  columns: [
    { key: 'title', label: 'Judul', required: true },
    { key: 'content', label: 'Konten (teks)' },
    { key: 'published', label: 'Publikasi', type: 'boolean' },
  ],
}

export const artikelMassUploadConfig: MassUploadConfig = {
  entity: 'articles', title: 'Artikel', hasPeriod: true,
  columns: [
    { key: 'title', label: 'Judul', required: true },
    { key: 'slug', label: 'Slug' },
    { key: 'excerpt', label: 'Ringkasan' },
    { key: 'content', label: 'Konten (teks)' },
    { key: 'published', label: 'Publikasi', type: 'boolean' },
  ],
}

export const departemenMassUploadConfig: MassUploadConfig = {
  entity: 'departments', title: 'Kementerian', hasPeriod: true,
  columns: [
    { key: 'name', label: 'Nama Kementerian', required: true },
    { key: 'description', label: 'Deskripsi' },
  ],
}

export const programMassUploadConfig: MassUploadConfig = {
  entity: 'programs', title: 'Program', hasPeriod: true,
  columns: [
    { key: 'department', label: 'Kementerian', required: true },
    { key: 'title', label: 'Judul Program', required: true },
    { key: 'description', label: 'Deskripsi' },
  ],
}

export const anggotaMassUploadConfig: MassUploadConfig = {
  entity: 'members', title: 'Anggota', hasPeriod: true,
  columns: [
    { key: 'full_name', label: 'Nama Lengkap', required: true },
    { key: 'nickname', label: 'Nama Panggilan' },
    { key: 'program_studi', label: 'Program Studi' },
    { key: 'fakultas', label: 'Fakultas' },
    { key: 'angkatan', label: 'Angkatan' },
    { key: 'phone', label: 'No. HP' },
    { key: 'department', label: 'Kementerian' },
    { key: 'position', label: 'Jabatan' },
  ],
}

export const shortlinkMassUploadConfig: MassUploadConfig = {
  entity: 'shortlinks', title: 'Short Link', hasPeriod: false,
  columns: [
    { key: 'target_url', label: 'URL Tujuan', required: true },
    { key: 'code', label: 'Kode (opsional)' },
    { key: 'label', label: 'Label' },
  ],
}

export const faqMassUploadConfig: MassUploadConfig = {
  entity: 'faqs', title: 'FAQ', hasPeriod: true,
  columns: [
    { key: 'question', label: 'Pertanyaan', required: true },
    { key: 'answer', label: 'Jawaban', required: true },
  ],
}

export const periodeMassUploadConfig: MassUploadConfig = {
  entity: 'periods', title: 'Periode', hasPeriod: false,
  columns: [
    { key: 'label', label: 'Label (contoh: 25.26)', required: true },
    { key: 'display_name', label: 'Nama Tampilan', required: true },
  ],
}

export const akunMassUploadConfig: MassUploadConfig = {
  entity: 'accounts', title: 'Akun', hasPeriod: false,
  columns: [
    { key: 'username', label: 'Username', required: true },
    { key: 'password', label: 'Password', required: true },
    { key: 'role', label: 'Role', required: true, type: 'select', options: ['admin', 'superadmin'] },
    { key: 'assigned_period', label: 'Periode (untuk admin)' },
  ],
}
