import os

base = r'C:\Claude\hcm-nextjs\src\app\(protected)\hr\employee\personnel-action'

fixes = {
    'promote': [
        ("flash('Pilih posisi baru.', 'error')",
         "flash(t('Pilih posisi baru.','Select a new position.'), 'error')"),
        ("'PA Promote berhasil diterapkan.'",
         "t('PA Promote berhasil diterapkan.','PA Promote applied successfully.')"),
        (">TO — Posisi Baru</p>",
         ">{t('TO — Posisi Baru','TO — New Position')}</p>"),
        ("label='New Grade (auto-fill dari posisi)'",
         "label={t('New Grade (auto-fill dari posisi)','New Grade (auto-fill from position)')}"),
        ("bg-red-500 rounded-xl hover:bg-red-600'>Hapus</button>",
         "bg-red-500 rounded-xl hover:bg-red-600'>{t('Hapus','Delete')}</button>"),
    ],
    'demote': [
        ("flash('Pilih posisi baru.', 'error')",
         "flash(t('Pilih posisi baru.','Select a new position.'), 'error')"),
        ("'PA Demote berhasil diterapkan.'",
         "t('PA Demote berhasil diterapkan.','PA Demote applied successfully.')"),
        (">TO — Posisi Baru (Lebih Rendah)</p>",
         ">{t('TO — Posisi Baru (Lebih Rendah)','TO — New Position (Lower)')}</p>"),
        ("label='New Grade (auto-fill dari posisi)'",
         "label={t('New Grade (auto-fill dari posisi)','New Grade (auto-fill from position)')}"),
        ("bg-red-500 rounded-xl hover:bg-red-600'>Hapus</button>",
         "bg-red-500 rounded-xl hover:bg-red-600'>{t('Hapus','Delete')}</button>"),
    ],
    'transfer': [
        ("'PA Transfer berhasil diterapkan.'",
         "t('PA Transfer berhasil diterapkan.','PA Transfer applied successfully.')"),
        (">TO — Departemen Tujuan</p>",
         ">{t('TO — Departemen Tujuan','TO — Target Department')}</p>"),
        ("bg-red-500 rounded-xl hover:bg-red-600'>Hapus</button>",
         "bg-red-500 rounded-xl hover:bg-red-600'>{t('Hapus','Delete')}</button>"),
    ],
    'transfer-across-company': [
        ("'PA Transfer Across Company berhasil diterapkan.'",
         "t('PA Transfer Across Company berhasil diterapkan.','PA Transfer Across Company applied successfully.')"),
        (">TO — Perusahaan & Posisi Tujuan</p>",
         ">{t('TO — Perusahaan & Posisi Tujuan','TO — Target Company & Position')}</p>"),
        ("bg-red-500 rounded-xl hover:bg-red-600'>Hapus</button>",
         "bg-red-500 rounded-xl hover:bg-red-600'>{t('Hapus','Delete')}</button>"),
    ],
    'terminate': [
        ("'PA Terminate berhasil diterapkan. Status karyawan menjadi Inactive.'",
         "t('PA Terminate berhasil diterapkan. Status karyawan menjadi Inactive.','PA Terminate applied successfully. Employee status changed to Inactive.')"),
        (">⚠️ Peringatan Terminasi</p>",
         ">{t('⚠️ Peringatan Terminasi','⚠️ Termination Warning')}</p>"),
        ("Status karyawan akan diubah menjadi <strong>Inactive</strong> pada tanggal yang ditentukan. Tindakan ini akan dicatat di riwayat karyawan.",
         "{t('Status karyawan akan diubah menjadi','Employee status will be changed to')} <strong>Inactive</strong> {t('pada tanggal yang ditentukan. Tindakan ini akan dicatat di riwayat karyawan.','on the specified date. This action will be recorded in the employee history.')}"),
        ("bg-red-500 rounded-xl hover:bg-red-600'>Hapus</button>",
         "bg-red-500 rounded-xl hover:bg-red-600'>{t('Hapus','Delete')}</button>"),
    ],
    'rehire': [
        ("flash('Pilih company tujuan.', 'error')",
         "flash(t('Pilih company tujuan.','Select a target company.'), 'error')"),
        ("flash('Pilih posisi baru.', 'error')",
         "flash(t('Pilih posisi baru.','Select a new position.'), 'error')"),
        ("'PA Rehire berhasil diterapkan. Status karyawan menjadi Active.'",
         "t('PA Rehire berhasil diterapkan. Status karyawan menjadi Active.','PA Rehire applied successfully. Employee status changed to Active.')"),
        ("ℹ️ Tidak ada karyawan dengan status Inactive saat ini.",
         "{t('ℹ️ Tidak ada karyawan dengan status Inactive saat ini.','ℹ️ No employees with Inactive status currently.')}"),
        (">TO — Penempatan Baru</p>",
         ">{t('TO — Penempatan Baru','TO — New Placement')}</p>"),
        ("bg-red-500 rounded-xl hover:bg-red-600'>Hapus</button>",
         "bg-red-500 rounded-xl hover:bg-red-600'>{t('Hapus','Delete')}</button>"),
    ],
    'change-employment-type': [
        ("'Employment type berhasil diubah.'",
         "t('Employment type berhasil diubah.','Employment type changed successfully.')"),
        ("value={form.fromEndDate || '(tidak ada)'}",
         "value={form.fromEndDate || t('(tidak ada)','(none)')}"),
        (">TO — Employment Type Baru</p>",
         ">{t('TO — Employment Type Baru','TO — New Employment Type')}</p>"),
        ("bg-red-500 rounded-xl hover:bg-red-600'>Hapus</button>",
         "bg-red-500 rounded-xl hover:bg-red-600'>{t('Hapus','Delete')}</button>"),
    ],
    'extend-contract': [
        ("flash('New End Date wajib diisi.', 'error')",
         "flash(t('New End Date wajib diisi.','New End Date is required.'), 'error')"),
        ("flash('New End Date harus lebih besar dari End Date saat ini.', 'error')",
         "flash(t('New End Date harus lebih besar dari End Date saat ini.','New End Date must be after the current End Date.'), 'error')"),
        ("ℹ️ Tidak ada karyawan Contract / Internship aktif saat ini.",
         "{t('ℹ️ Tidak ada karyawan Contract / Internship aktif saat ini.','ℹ️ No active Contract / Internship employees currently.')}"),
        ("value={form.fromEndDate || '(tidak ada)'}",
         "value={form.fromEndDate || t('(tidak ada)','(none)')}"),
        (">TO — Perpanjangan</p>",
         ">{t('TO — Perpanjangan','TO — Extension')}</p>"),
        ("📅 Durasi perpanjangan: kontrak akan berakhir pada <strong>{form.toEndDate}</strong>",
         "{t('📅 Durasi perpanjangan: kontrak akan berakhir pada','📅 Extension duration: contract will end on')} <strong>{form.toEndDate}</strong>"),
        ("bg-red-500 rounded-xl hover:bg-red-600'>Hapus</button>",
         "bg-red-500 rounded-xl hover:bg-red-600'>{t('Hapus','Delete')}</button>"),
        ("'PA Extend Contract berhasil diterapkan.'",
         "t('PA Extend Contract berhasil diterapkan.','PA Extend Contract applied successfully.')"),
    ],
}

# Also fix promote's applied success flash (line 126 pattern)
# promote: flash(targetStatus === 'Applied' ? 'PA Promote berhasil diterapkan.' : t('PA disimpan.','PA saved.'))
# The t() wrapper was already applied above for the string itself

for subdir, replacements in fixes.items():
    path = os.path.join(base, subdir, 'page.jsx')
    if not os.path.exists(path):
        print(f'NOT FOUND: {path}')
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new, 1)
        else:
            print(f'  [MISS] {subdir}: {repr(old[:60])}')
    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated: {subdir}')
    else:
        print(f'No changes: {subdir}')

print('Done')
