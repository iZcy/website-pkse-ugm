'use strict';

/**
 * Defines friendly Content Manager layouts for all content types.
 * Runs on every Strapi start — idempotent, safe to re-run.
 */
async function setupContentManagerLayouts({ strapi }) {
  const configs = [
    // ── ANNOUNCEMENT ────────────────────────────────────────────────────────
    {
      uid: 'api::announcement.announcement',
      settings: {
        bulkable: true,
        filterable: true,
        searchable: true,
        pageSize: 10,
        mainField: 'title',
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'DESC',
      },
      metadatas: {
        id:          { edit: {}, list: { label: 'ID', searchable: true, sortable: true } },
        title:       { edit: { label: 'Judul', description: 'Judul singkat pengumuman.', placeholder: 'Contoh: Pendaftaran Anggota Baru 2025/2026', visible: true, editable: true }, list: { label: 'Judul', searchable: true, sortable: true } },
        content:     { edit: { label: 'Isi Pengumuman', description: 'Tulis isi lengkap pengumuman di sini.', placeholder: 'Isi pengumuman...', visible: true, editable: true }, list: { label: 'Isi', searchable: false, sortable: false } },
        createdAt:   { edit: { label: 'Dibuat', visible: false, editable: false }, list: { label: 'Tanggal', searchable: false, sortable: true } },
        publishedAt: { edit: { label: 'Dipublikasikan', visible: true, editable: true }, list: { label: 'Status', searchable: false, sortable: true } },
        updatedAt:   { edit: { label: 'Diperbarui', visible: false, editable: false }, list: { label: 'Diperbarui', searchable: false, sortable: true } },
      },
      layouts: {
        list: ['id', 'title', 'createdAt', 'publishedAt'],
        editRelations: [],
        edit: [
          [{ name: 'title', size: 12 }],
          [{ name: 'content', size: 12 }],
        ],
      },
    },

    // ── DEPARTMENT ──────────────────────────────────────────────────────────
    {
      uid: 'api::department.department',
      settings: {
        bulkable: true,
        filterable: false,
        searchable: true,
        pageSize: 25,
        mainField: 'name',
        defaultSortBy: 'sort_order',
        defaultSortOrder: 'ASC',
      },
      metadatas: {
        id:          { edit: {}, list: { label: 'ID', searchable: true, sortable: true } },
        name:        { edit: { label: 'Nama Departemen', description: 'Nama resmi departemen atau divisi.', placeholder: 'Contoh: Departemen Sosial Masyarakat', visible: true, editable: true }, list: { label: 'Nama', searchable: true, sortable: true } },
        description: { edit: { label: 'Deskripsi', description: 'Penjelasan singkat tugas dan fungsi departemen (1–2 kalimat).', placeholder: 'Contoh: Berfokus pada pengembangan kegiatan sosial kemasyarakatan...', visible: true, editable: true }, list: { label: 'Deskripsi', searchable: false, sortable: false } },
        icon_class:  { edit: { label: 'Kelas Ikon (Font Awesome)', description: 'Salin kelas ikon dari fontawesome.com, contoh: fas fa-heart', placeholder: 'fas fa-star', visible: true, editable: true }, list: { label: 'Ikon', searchable: false, sortable: false } },
        sort_order:  { edit: { label: 'Urutan Tampil', description: 'Angka lebih kecil tampil lebih dulu. Isi 0 jika tidak perlu urutan khusus.', placeholder: '0', visible: true, editable: true }, list: { label: 'Urutan', searchable: false, sortable: true } },
        createdAt:   { edit: { label: 'Dibuat', visible: false, editable: false }, list: { label: 'Dibuat', searchable: false, sortable: true } },
        updatedAt:   { edit: { label: 'Diperbarui', visible: false, editable: false }, list: { label: 'Diperbarui', searchable: false, sortable: false } },
      },
      layouts: {
        list: ['id', 'name', 'icon_class', 'sort_order'],
        editRelations: [],
        edit: [
          [{ name: 'name', size: 8 }, { name: 'sort_order', size: 4 }],
          [{ name: 'icon_class', size: 6 }],
          [{ name: 'description', size: 12 }],
        ],
      },
    },

    // ── OFFICER ─────────────────────────────────────────────────────────────
    {
      uid: 'api::officer.officer',
      settings: {
        bulkable: true,
        filterable: true,
        searchable: true,
        pageSize: 25,
        mainField: 'name',
        defaultSortBy: 'sort_order',
        defaultSortOrder: 'ASC',
      },
      metadatas: {
        id:         { edit: {}, list: { label: 'ID', searchable: true, sortable: true } },
        name:       { edit: { label: 'Nama Lengkap', description: 'Nama lengkap pengurus.', placeholder: 'Contoh: Budi Santoso', visible: true, editable: true }, list: { label: 'Nama', searchable: true, sortable: true } },
        role:       { edit: { label: 'Jabatan', description: 'Jabatan resmi dalam organisasi.', placeholder: 'Contoh: Ketua Umum', visible: true, editable: true }, list: { label: 'Jabatan', searchable: true, sortable: true } },
        department: { edit: { label: 'Departemen', description: 'Nama departemen tempat pengurus bertugas (kosongkan untuk pengurus inti).', placeholder: 'Contoh: Departemen Sosial Masyarakat', visible: true, editable: true }, list: { label: 'Departemen', searchable: true, sortable: false } },
        tier:       { edit: { label: 'Level Pengurus', description: '"inti" = ketua/wakil/sekretaris/bendahara, "departemen" = kepala & anggota departemen.', visible: true, editable: true }, list: { label: 'Level', searchable: false, sortable: true } },
        photo_url:  { edit: { label: 'URL Foto', description: 'Link foto profil (opsional). Gunakan link Google Drive, CDN, atau Instagram.', placeholder: 'https://...', visible: true, editable: true }, list: { label: 'Foto', searchable: false, sortable: false } },
        sort_order: { edit: { label: 'Urutan Tampil', description: 'Angka lebih kecil tampil lebih dulu.', placeholder: '0', visible: true, editable: true }, list: { label: 'Urutan', searchable: false, sortable: true } },
        createdAt:  { edit: { label: 'Dibuat', visible: false, editable: false }, list: { label: 'Dibuat', searchable: false, sortable: true } },
        updatedAt:  { edit: { label: 'Diperbarui', visible: false, editable: false }, list: { label: 'Diperbarui', searchable: false, sortable: false } },
      },
      layouts: {
        list: ['id', 'name', 'role', 'department', 'tier', 'sort_order'],
        editRelations: [],
        edit: [
          [{ name: 'name', size: 8 }, { name: 'sort_order', size: 4 }],
          [{ name: 'role', size: 6 }, { name: 'tier', size: 6 }],
          [{ name: 'department', size: 12 }],
          [{ name: 'photo_url', size: 12 }],
        ],
      },
    },

    // ── SITE SETTING (single type) ───────────────────────────────────────────
    {
      uid: 'api::site-setting.site-setting',
      settings: {
        bulkable: false,
        filterable: false,
        searchable: false,
        pageSize: 10,
        mainField: 'id',
        defaultSortBy: 'id',
        defaultSortOrder: 'ASC',
      },
      metadatas: {
        id:          { edit: {}, list: { label: 'ID', searchable: false, sortable: false } },
        sejarah:     { edit: { label: 'Sejarah Paguyuban', description: 'Narasi sejarah pendirian dan perjalanan Paguyuban KSE UGM.', placeholder: 'Tulis narasi sejarah di sini...', visible: true, editable: true }, list: { label: 'Sejarah', searchable: false, sortable: false } },
        visi:        { edit: { label: 'Visi', description: 'Pernyataan visi resmi organisasi (1–2 kalimat).', placeholder: 'Contoh: Menjadi paguyuban yang...', visible: true, editable: true }, list: { label: 'Visi', searchable: false, sortable: false } },
        misi:        { edit: { label: 'Misi (JSON Array)', description: 'Daftar poin misi. Format: ["Misi pertama", "Misi kedua", "Misi ketiga"]', placeholder: '["Poin misi 1", "Poin misi 2"]', visible: true, editable: true }, list: { label: 'Misi', searchable: false, sortable: false } },
        stat_members:{ edit: { label: 'Jumlah Anggota Aktif', description: 'Teks yang ditampilkan pada statistik anggota aktif di halaman Beranda.', placeholder: '65+', visible: true, editable: true }, list: { label: 'Anggota', searchable: false, sortable: false } },
        stat_dept:   { edit: { label: 'Jumlah Departemen', description: 'Teks yang ditampilkan pada statistik departemen di halaman Beranda.', placeholder: '7', visible: true, editable: true }, list: { label: 'Dept', searchable: false, sortable: false } },
        stat_proker: { edit: { label: 'Jumlah Program Kerja', description: 'Teks yang ditampilkan pada statistik proker di halaman Beranda.', placeholder: '15+', visible: true, editable: true }, list: { label: 'Proker', searchable: false, sortable: false } },
        createdAt:   { edit: { label: 'Dibuat', visible: false, editable: false }, list: { label: 'Dibuat', searchable: false, sortable: false } },
        updatedAt:   { edit: { label: 'Diperbarui', visible: false, editable: false }, list: { label: 'Diperbarui', searchable: false, sortable: false } },
      },
      layouts: {
        list: ['id', 'stat_members', 'stat_dept', 'stat_proker'],
        editRelations: [],
        edit: [
          [{ name: 'visi', size: 12 }],
          [{ name: 'misi', size: 12 }],
          [{ name: 'sejarah', size: 12 }],
          [{ name: 'stat_members', size: 4 }, { name: 'stat_dept', size: 4 }, { name: 'stat_proker', size: 4 }],
        ],
      },
    },
  ];

  for (const config of configs) {
    const storeKey = `plugin_content-manager_configuration_content-types::${config.uid}`;
    try {
      await strapi.store({ type: 'plugin', name: 'content-manager' }).set({
        key: `configuration_${config.uid}`,
        value: config,
      });
      strapi.log.info(`[bootstrap] Layout configured: ${config.uid}`);
    } catch (err) {
      strapi.log.warn(`[bootstrap] Failed to set layout for ${config.uid}: ${err.message}`);
    }
  }
}

module.exports = {
  register(/* { strapi } */) {},
  async bootstrap({ strapi }) {
    await setupContentManagerLayouts({ strapi });
  },
};
