# DIMZ BUILDER STUDIO
**BUILD YOUR IDEA INTO REALITY.**

Platform web untuk mengubah **ZIP / HTML** menjadi **APK Android (WebView)** dan **website siap hosting**.

## Struktur
```
index.html  style.css  script.js  assets/   ← frontend (dashboard, editor, ZIP/preview, file manager)
server/server.js  server/package.json       ← build server (Node.js + Gradle) untuk APK asli
```

## Fitur yang berjalan di browser (tanpa server)
ZIP→Website, HTML→Website (editor CodeMirror + live preview, Download HTML, Export ZIP), baca/ekstrak ZIP (JSZip), deteksi index.html, preview, file manager, riwayat, dark/light mode.

## Menjalankan build server (wajib untuk APK)
Kebutuhan: **Node.js 18+**, **JDK 17**, **Gradle 8.2+** (perintah `gradle` ada di PATH), **Android SDK** dengan `platforms;android-34` dan `build-tools;34.0.0`, lisensi sudah di-accept (`sdkmanager --licenses`). Server butuh internet saat build pertama (unduh Android Gradle Plugin).

```bash
cd server
npm install
export ANDROID_HOME=$HOME/Android/Sdk      # Windows: set ANDROID_HOME=C:\Users\NAMA\AppData\Local\Android\Sdk
npm start                                   # http://localhost:3000
```
Buka **http://localhost:3000** (frontend ikut dilayani server). Indikator di kanan atas harus hijau ("Build server siap"). Jika frontend dibuka dari host lain, isi URL server di menu Pengaturan.

Alur build: ZIP/HTML → diekstrak ke `app/src/main/assets/www` → dibuat proyek Android (Manifest, MainActivity WebView, Gradle) → `gradle assembleDebug` → APK. APK memakai debug key sehingga bisa langsung di-install (aktifkan "install dari sumber tidak dikenal"). Untuk Play Store, tanda tangani ulang dengan keystore rilis.

## API
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/health` | `{ok, sdk, gradle}` |
| POST | `/api/build` | multipart: `project` (zip), `name`, `package`, `version`, `code`, `icon` (png, opsional) → `{id}` |
| GET | `/api/status/:id` | `{state: queued/building/done/failed, progress, log, error}` |
| GET | `/api/download/:id` | unduh APK |

## Catatan
- Package name: huruf kecil/angka/underscore, min. 2 segmen, bukan kata kunci Java.
- Aplikasi memuat `file:///android_asset/www/index.html`; `fetch()` ke file lokal tidak didukung WebView, gunakan aset statis.
- Job & APK dibersihkan otomatis setelah 1 jam. Untuk produksi tambahkan autentikasi dan rate limit (build menjalankan Gradle di server Anda).
