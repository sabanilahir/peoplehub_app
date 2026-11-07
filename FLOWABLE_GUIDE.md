# Panduan Menjalankan Flowable Engine Lokal (Tanpa Docker) & BPMN.js

Sistem ini telah dilengkapi dengan integrasi menyeluruh antara **Flowable Engine Opensource Lokal (Tanpa Docker)**, **Editor Visual BPMN.js**, dan **Dashboard Analisa & Metrik Workflow**.

---

## 1. Menjalankan Flowable Lokal (Tanpa Docker)

Engine Flowable adalah aplikasi Java / Spring Boot open-source yang dapat dijalankan langsung di Windows tanpa memerlukan Docker.

### Cara Cepat (Otomatis dengan Script):

Cukup jalankan script batch yang telah disediakan:

```cmd
scripts\start-flowable.bat
```

Script ini akan:
1. Memeriksa ketersediaan Java di komputer Anda (memerlukan JDK/JRE 11, 17, atau 21).
2. Jika file binary Flowable belum ada, script akan mengunduh dan mengekstrak `flowable-ui.war` secara otomatis ke folder `flowable/`.
3. Menjalankan engine Flowable lokal pada port `8080`.

---

### Cara Alternatif (Manual dengan Java):

1. **Pastikan Java Terpasang**:
   Buka Command Prompt atau PowerShell, jalankan:
   ```cmd
   java -version
   ```
   *Jika belum terpasang, unduh gratis: [Eclipse Temurin OpenJDK 17](https://adoptium.net/temurin/releases/)*.

2. **Unduh Paket Flowable Open Source**:
   - Unduh dari GitHub: [Flowable 6.8.0 Release](https://github.com/flowable/flowable-engine/releases/download/flowable-6.8.0/flowable-6.8.0.zip).
   - Ekstrak file zip, lalu ambil file `flowable-ui.war` (atau `flowable-rest.war`) yang ada di dalam subfolder `wars/`.
   - Letakkan file tersebut di dalam folder `flowable/` pada project ini.

3. **Jalankan Engine**:
   ```cmd
   java -jar flowable\flowable-ui.war --server.port=8080
   ```

4. **Engine Siap Digunakan**:
   - **REST API Endpoint**: `http://localhost:8080/flowable-rest` (atau `http://localhost:8080/flowable-ui/process-api`)
   - **Flowable UI Portal**: `http://localhost:8080/flowable-ui`
   - **Default Akun**: `admin` / `test`

---

## 2. Hubungkan ke Aplikasi Manusistem HCM

1. Buka menu di Dynamic Sidebar:
   👉 **Workflow Engine** &rarr; **Flowable Settings** (`/sysadmin/workflow/flowable-settings`)
2. Pastikan setting terisi:
   - **REST API URL**: `http://localhost:8080/flowable-rest`
   - **UI URL**: `http://localhost:8080/flowable-ui`
   - **Username**: `admin`
   - **Password**: `test`
   - Centang **Enable Flowable**
3. Klik tombol **🔗 Test**. Status akan berubah menjadi **🟢 Connected!**
4. Klik **💾 Save**.

---

## 3. Desain Alur Kerja dengan BPMN.js Visual Editor

Buka:
👉 **Workflow Engine** &rarr; **BPMN Designer** (`/sysadmin/workflow/designer`)

Fitur utama:
- **Visual Drag-and-Drop**: Tambahkan Start Event, User Task (Persetujuan), Gateway (Cabang logika), dan End Event.
- **Pilihan Template**: Tersedia template *Pengajuan Cuti Karyawan*, *Klaim Reimbursement*, dan *Blank Process*.
- **Import & Export**: Upload file diagram `.bpmn` dari disk, atau unduh sebagai BPMN 2.0 XML / gambar SVG.
- **Deploy Langsung ke Engine**: Klik tombol **🚀 Deploy ke Flowable** untuk mendaftarkan definisi proses ke engine Flowable lokal secara instan.

---

## 4. Dashboard Analisa & Metrik Workflow

Buka:
👉 **Workflow Engine** &rarr; **Workflow Analytics** (`/sysadmin/workflow/analytics`)

Fitur analisa:
- **Ringkasan KPI**: Total eksekusi, proses aktif, success rate, dan cycle time rata-rata.
- **Throughput Trend**: Tren mingguan/bulanan proses diajukan vs disetujui.
- **Deteksi Bottleneck**: Mengidentifikasi langkah persetujuan mana yang paling lambat (&gt; 12 jam SLA).
- **Approver Workload**: Monitoring beban kerja per role atasan/verifikator.
- **Tabel Health**: Evaluasi status alur kerja (*Healthy* vs *Warning*).
