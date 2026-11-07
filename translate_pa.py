import os

base = r'C:\Claude\hcm-nextjs\src\app\(protected)\hr\employee\personnel-action'
subdirs = ['promote','demote','transfer','transfer-across-company','terminate','rehire','change-employment-type','extend-contract']

common = [
    ("from '@/store/personnelActionStore'",
     "from '@/store/personnelActionStore'\nimport { useT } from '@/store/languageStore'"),
    ("function Sel({ value, onChange, options, placeholder = '-- Pilih --', disabled = false }) {",
     "function Sel({ value, onChange, options, placeholder, disabled = false }) {\n  const t = useT()\n  const _ph = placeholder ?? t('-- Pilih --', '-- Select --')"),
    ("      <option value=''>{placeholder}</option>",
     "      <option value=''>{_ph}</option>"),
    ("placeholder='Cari nama / PA number…'",
     "placeholder={t('Cari nama / PA number…', 'Search name / PA number…')}"),
    ("placeholder='Semua Status'",
     "placeholder={t('Semua Status', 'All Status')}"),
    ("font-medium'>Hapus</button>",
     "font-medium'>{t('Hapus','Delete')}</button>"),
    ("<Field label='Karyawan *'>",
     "<Field label={t('Karyawan *','Employee *')}>"),
    ("FROM — Kondisi Saat Ini",
     "{t('FROM — Kondisi Saat Ini','FROM — Current State')}"),
    (">Detail PA<",
     ">{t('Detail PA','PA Details')}<"),
    ("✅ Diterapkan pada <strong>",
     "{t('✅ Diterapkan pada','✅ Applied on')} <strong>"),
    ("isView ? 'Tutup' : 'Batal'",
     "isView ? t('Tutup','Close') : t('Batal','Cancel')"),
    (">Simpan Draft<",
     ">{t('Simpan Draft','Save Draft')}<"),
    (">Hapus PA ini?<",
     ">{t('Hapus PA ini?','Delete this PA?')}<"),
    ("Tindakan ini tidak bisa dibatalkan.",
     "{t('Tindakan ini tidak bisa dibatalkan.','This action cannot be undone.')}"),
    ("hover:bg-gray-100'>Batal</button>",
     "hover:bg-gray-100'>{t('Batal','Cancel')}</button>"),
    ("flash('PA dihapus.')",
     "flash(t('PA dihapus.','PA deleted.'))"),
    ("flash('Pilih karyawan.', 'error')",
     "flash(t('Pilih karyawan.','Select an employee.'), 'error')"),
    ("flash('Effective date wajib diisi.', 'error')",
     "flash(t('Effective date wajib diisi.','Effective date is required.'), 'error')"),
    ("flash('Reason wajib dipilih.', 'error')",
     "flash(t('Reason wajib dipilih.','Reason is required.'), 'error')"),
    ("flash('PA disimpan.')",
     "flash(t('PA disimpan.','PA saved.'))"),
]

per_page_subtitles = {
    'promote':                 ('Kenaikan posisi & grade karyawan',               'Employee position & grade promotion'),
    'demote':                  ('Penurunan posisi & grade karyawan',               'Employee position & grade demotion'),
    'transfer':                ('Perpindahan karyawan antar departemen',           'Employee transfer between departments'),
    'transfer-across-company': ('Perpindahan karyawan lintas perusahaan',         'Employee transfer across companies'),
    'terminate':               ('Pemutusan hubungan kerja karyawan',               'Employee termination'),
    'rehire':                  ('Perekrutan kembali karyawan yang pernah bekerja', 'Re-hiring of former employees'),
    'change-employment-type':  ('Perubahan tipe kepegawaian karyawan',             'Change employee employment type'),
    'extend-contract':         ('Perpanjangan kontrak kerja karyawan (Contract / Internship)', 'Employee contract extension (Contract / Internship)'),
}

per_page_empty = {
    'promote':                 ('Belum ada PA Promote',                  'No Promote PA yet'),
    'demote':                  ('Belum ada PA Demote',                   'No Demote PA yet'),
    'transfer':                ('Belum ada PA Transfer',                 'No Transfer PA yet'),
    'transfer-across-company': ('Belum ada PA Transfer Across Company',  'No Transfer Across Company PA yet'),
    'terminate':               ('Belum ada PA Terminate',                'No Terminate PA yet'),
    'rehire':                  ('Belum ada PA Rehire',                   'No Rehire PA yet'),
    'change-employment-type':  ('Belum ada PA Change Employment Type',   'No Change Employment Type PA yet'),
    'extend-contract':         ('Belum ada PA Extend Contract',          'No Extend Contract PA yet'),
}

per_page_cols = {
    'promote':                 ("'Karyawan','Dari Posisi','Ke Posisi'",               "t('Karyawan','Employee'),t('Dari Posisi','From Position'),t('Ke Posisi','To Position')"),
    'demote':                  ("'Karyawan','Dari Posisi','Ke Posisi'",               "t('Karyawan','Employee'),t('Dari Posisi','From Position'),t('Ke Posisi','To Position')"),
    'transfer':                ("'Karyawan','Dari Dept','Ke Dept'",                   "t('Karyawan','Employee'),t('Dari Dept','From Dept'),t('Ke Dept','To Dept')"),
    'transfer-across-company': ("'Karyawan','Dari Company','Ke Company'",             "t('Karyawan','Employee'),t('Dari Company','From Company'),t('Ke Company','To Company')"),
    'terminate':               ("'Karyawan','Company'",                               "t('Karyawan','Employee'),'Company'"),
    'rehire':                  ("'Karyawan','Company Baru','Posisi Baru'",             "t('Karyawan','Employee'),t('Company Baru','New Company'),t('Posisi Baru','New Position')"),
    'change-employment-type':  ("'Karyawan','Dari Type','Ke Type','End Date Baru'",   "t('Karyawan','Employee'),t('Dari Type','From Type'),t('Ke Type','To Type'),t('End Date Baru','New End Date')"),
    'extend-contract':         ("'Karyawan','Employment Type','End Date Lama','End Date Baru'", "t('Karyawan','Employee'),'Employment Type',t('End Date Lama','Old End Date'),t('End Date Baru','New End Date')"),
}

for subdir in subdirs:
    path = os.path.join(base, subdir, 'page.jsx')
    if not os.path.exists(path):
        print(f'NOT FOUND: {path}')
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content

    for old, new in common:
        if old in content:
            content = content.replace(old, new, 1)

    if subdir in per_page_subtitles:
        id_txt, en_txt = per_page_subtitles[subdir]
        if id_txt in content:
            content = content.replace(id_txt, "{t('" + id_txt + "','" + en_txt + "')}", 1)

    if subdir in per_page_empty:
        id_txt, en_txt = per_page_empty[subdir]
        if '<p>' + id_txt + '</p>' in content:
            content = content.replace('<p>' + id_txt + '</p>', "<p>{t('" + id_txt + "','" + en_txt + "')}</p>", 1)

    if subdir in per_page_cols:
        old_cols, new_cols = per_page_cols[subdir]
        if old_cols in content:
            content = content.replace(old_cols, new_cols, 1)

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated: {subdir}')
    else:
        print(f'No changes: {subdir}')

print('Done')
