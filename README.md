# DEY SillageArchitect v2

Laboratorium formula parfum DIY: rancang formula, hitung massa bibit dan alkohol, pantau maserasi, simpan resep, dan cadangkan semua data ke Google Drive.

## Fitur
- **Ringkasan:** statistik, resep yang sedang maserasi (dengan progres), resep terbaru, status backup.
- **Laboratorium:** total massa + konsentrasi (EDC/EDT/EDP/Parfum), pembagian top/heart/base, lembar timbang langsung, HPP bibit dan alkohol, status, jadwal maserasi, rating.
- **Pustaka:** cari, urutkan, filter kategori/status, favorit, detail resep, ubah, duplikat, unduh `.json` / `.txt`, salin lembar.
- **Akademi:** panduan alat, bahan, dilusi, blending.
- **Cadangan:** backup lengkap `.json`, impor (gabung / ganti), ekspor CSV, link folder Drive, riwayat backup, penyimpanan permanen.
- Pintasan: `Ctrl/Cmd + S` menyimpan resep di Laboratorium.

## Struktur
```
index.html
assets/css/style.css
assets/js/store.js   penyimpanan, migrasi data lama, ekspor/impor
assets/js/app.js     antarmuka dan logika
.github/workflows/pages.yml
```

## Deploy ke GitHub Pages
```
git init && git add . && git commit -m "DEY SillageArchitect v2"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```
Lalu **Settings → Pages → Source: GitHub Actions**. Setiap push ke `main` otomatis ter-deploy.

## Data dan backup
Data tersimpan di browser (localStorage). Jika cache dihapus, data bisa hilang, jadi unduh backup di tab **Cadangan**, unggah ke Drive, dan tempel link foldernya di aplikasi. Pulihkan lewat **Impor & ganti semua**. Data dari versi sebelumnya otomatis dimigrasi saat dimuat atau diimpor.

## Format angka
Ribuan dipisah titik (10.000), desimal memakai koma (2,500 g), sesuai standar Indonesia.
