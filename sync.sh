#!/bin/bash
set -e
set -o pipefail

# Fungsi logging error
log_error() {
  echo -e "❌ [$1] $2"
}

# Fungsi konfirmasi retry
retry_prompt() {
  read -p "⚠️  Gagal $1. Coba ulang? (y/n): " retry
  [[ "$retry" =~ ^[Yy]$ ]] && return 0 || return 1
}

# Fungsi penanganan konflik merge
handle_merge_conflict() {
  echo "⚠️  Terdeteksi konflik merge."
  echo "📄 File yang mengalami konflik:"
  echo "--------------------------------"
  git diff --name-only --diff-filter=U
  echo "--------------------------------"
  echo "🛠  Silakan buka file yang ditandai <<<<<<<, =======, >>>>>>> dan selesaikan konflik secara manual."
  read -p "✅ Setelah selesai perbaikan dan disimpan, tekan Enter untuk lanjut..."

  # Verifikasi apakah konflik masih ada
  if git diff --check | grep -q '<<<<<<<'; then
    echo "🚫 Konflik masih ada. Silakan pastikan semua konflik telah diperbaiki."
    exit 1
  fi

  echo "✅ Konflik dianggap selesai dan file bersih dari tanda konflik."

  # Tambahkan semua perubahan dan commit
  git add .
  TIMESTAMP=$(date +"%H:%M %d/%m/%Y")
  git commit -m "Perbaikan konflik manual - $TIMESTAMP"
  echo "✅ Commit penyelesaian konflik telah dibuat."
}

# Fungsi git pull dengan rebase
pull_from_git() {
  echo "🌐 Menarik perubahan dari remote..."
  if ! git pull --rebase --autostash origin main; then
    log_error "GIT_PULL" "Gagal menarik data dari remote."

    if git status | grep -q 'both modified'; then
      handle_merge_conflict
    elif retry_prompt "git pull"; then
      pull_from_git
    else
      echo "🚫 Sinkronisasi dibatalkan."
      exit 1
    fi
  fi
}

# Fungsi push ke remote
push_to_git() {
  echo "🚀 Mendorong perubahan ke remote..."
  if ! git push origin main; then
    log_error "GIT_PUSH" "Push ditolak (non-fast-forward atau konflik)."
    echo "🔁 Perbaiki dengan:"
    echo "   git pull --rebase origin main && git push origin main"
    exit 1
  fi
}

# Fungsi sinkronisasi otomatis
auto_sync() {
  # Cek status rebase tertunda
  if [ -d ".git/rebase-merge" ]; then
    echo "⚠️  Rebase tertunda terdeteksi."
    read -p "Ingin membatalkan dan lanjut? (y/n): " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then
      git rebase --abort
      echo "✅ Rebase dibatalkan."
    else
      echo "❌ Proses dibatalkan oleh pengguna."
      exit 1
    fi
  fi

  # Tarik metadata dan cek HEAD
  git fetch origin main
  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse origin/main)

  if [ "$LOCAL" != "$REMOTE" ]; then
    echo "🔄 Perbedaan ditemukan, akan melakukan rebase..."
    pull_from_git
  else
    echo "✅ HEAD lokal sudah sinkron dengan remote."
  fi

  # Cek perubahan lokal
  if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Perubahan lokal terdeteksi:"
    git status -s

    read -p "Ingin commit dan push? (y/n): " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
      TIMESTAMP=$(date +"%H:%M %d/%m/%Y")
      git add .
      git commit -m "Auto-sync $TIMESTAMP"
      push_to_git
    else
      echo "⏹️  Commit dibatalkan."
    fi
  else
    echo "📦 Tidak ada perubahan lokal."
  fi
}

# =====================
# Eksekusi Utama
# =====================
trap 'echo -e "\n❌ Terjadi kesalahan pada baris $LINENO. Kode keluar: $?"; read -p "Tekan Enter untuk keluar..."' ERR

echo "🚀 Memulai sinkronisasi Git..."
auto_sync
read -p "✅ Proses selesai. Tekan Enter untuk keluar..."
