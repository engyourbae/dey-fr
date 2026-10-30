# DEY SillageArchitect

Laboratorium formula parfum DIY: rancang formula, hitung massa & HPP, simpan resep, dan cadangkan seluruh data ke Google Drive.

## Struktur
```
index.html
assets/css/style.css
assets/js/store.js    penyimpanan, ekspor, impor, backup
assets/js/app.js      antarmuka & logika
.github/workflows/pages.yml
```

## Deploy ke GitHub Pages
1. Buat repository baru di GitHub, lalu dari folder ini:
   ```
   git init && git add . && git commit -m "DEY SillageArchitect"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git push -u origin main
   ```
2. Di GitHub: **Settings → Pages → Source: GitHub Actions**.
3. Setiap `git push` ke `main` otomatis ter-deploy.

## Data & backup
Data tersimpan di browser (localStorage). Jika cache dihapus, data hilang, jadi:
- Tab **Cadangan** → unduh backup `.json` → upload ke folder Drive Anda.
- Tempel link folder Drive di tab Cadangan agar bisa dibuka dengan satu klik.
- Pulihkan lewat **Impor backup**.
- Tiap resep juga bisa diunduh sendiri (`.json` untuk data, `.txt` untuk lembar timbang).
