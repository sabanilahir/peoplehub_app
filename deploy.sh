#!/bin/bash
set -e

echo "🚀 [Deploy] Mengambil image terbaru dari GHCR..."
docker compose -f docker-compose.prod.yml pull

echo "🔄 [Deploy] Menjalankan migrasi database Prisma..."
docker compose -f docker-compose.prod.yml run --rm web prisma migrate deploy || true

echo "⚡ [Deploy] Menjalankan container versi terbaru..."
docker compose -f docker-compose.prod.yml up -d

echo "🧹 [Deploy] Membersihkan image lama yang tidak terpakai..."
docker image prune -f

echo "✅ [Deploy] Deployment berhasil selesai!"
