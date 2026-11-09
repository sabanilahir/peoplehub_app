# Panduan Deploy PeopleHub ke VPS (Zero-Build Deployment)

Aplikasi ini menggunakan metode **Zero-Build di VPS** menggunakan **GitHub Actions** dan **GitHub Container Registry (GHCR)**, serta telah terintegrasi penuh dengan **Flowable BPMN Engine (v6.8.0)** dalam satu orkestrasi `docker-compose.prod.yml`. VPS Anda tidak perlu mengompilasi/build apapun, sehingga hemat RAM, CPU, dan waktu.

---

## 1. Alur Singkat

1. **Laptop:** Jalankan `git push origin dev` (atau `main`).
2. **GitHub Actions:** Otomatis mem-build image Docker dan menyimpannya di `ghcr.io/sabanilahir/peoplehub_app`.
3. **VPS:** Menjalankan `./deploy.sh` atau `docker compose -f docker-compose.prod.yml up -d`.
   - Mengambil image PeopleHub terbaru dari GHCR.
   - Mengambil image resmi Flowable Engine (`flowable/flowable-ui:6.8.0`) dari Docker Hub.
   - Selesai dalam ~15-30 detik!

---

## 2. Persiapan Awal di VPS

### A. Persiapan Direktori & File
1. Masuk ke VPS Anda via SSH:
   ```bash
   ssh user@ip-vps-anda
   ```
2. Buat direktori aplikasi:
   ```bash
   mkdir -p /opt/peoplehub
   cd /opt/peoplehub
   ```
3. Salin file konfigurasi penting dari repository ke VPS:
   - `docker-compose.prod.yml`
   - `deploy.sh` (beri hak eksekusi: `chmod +x deploy.sh`)
   - `.env` (isi dengan kredensial database PostgreSQL, SMTP, dsb.)

Contoh isi file `.env` di VPS:
```env
PORT=3000
NODE_ENV=production
DATABASE_URL="postgresql://user:password@host:5432/peoplehub_db?schema=public&sslmode=prefer"
DIRECT_URL="postgresql://user:password@host:5432/peoplehub_db?schema=public"

# URL internal docker network Flowable Engine
FLOWABLE_URL="http://flowable:8080/flowable-ui/process-api"
FLOWABLE_UI_URL="http://YOUR_VPS_IP:8080/flowable-ui"
```

---

## 3. Menjalankan Aplikasi & Flowable di VPS

Cukup jalankan script deploy:
```bash
./deploy.sh
```

Atau secara manual:
```bash
# 1. Tarik image terbaru
docker compose -f docker-compose.prod.yml pull

# 2. Migrasi skema database Prisma
docker compose -f docker-compose.prod.yml run --rm web npx prisma migrate deploy

# 3. Jalankan kedua container (PeopleHub & Flowable Engine)
docker compose -f docker-compose.prod.yml up -d
```

### Memeriksa Status Container di VPS:
```bash
docker compose -f docker-compose.prod.yml ps
```
Anda akan melihat 2 container berjalan:
- `peoplehub_app` pada port `3000`
- `peoplehub_flowable` pada port `8080`

---

## 4. Cara Update Aplikasi Selanjutnya

Setiap kali Anda selesai membuat fitur atau update kode:
1. Di laptop:
   ```bash
   git add .
   git commit -m "Update fitur XYZ"
   git push origin dev
   ```
2. Tunggu ~2-3 menit hingga GitHub Actions selesai mem-build image. (Cek di tab **Actions** di repo GitHub Anda).
3. Di VPS, cukup jalankan:
   ```bash
   ./deploy.sh
   ```
   Aplikasi dan Flowable langsung ter-update tanpa downtime lama dan tanpa menguras RAM VPS!
