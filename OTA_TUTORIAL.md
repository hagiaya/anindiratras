# Panduan OTA (Over-The-Air) Updates 100% Gratis di Capacitor via Supabase Storage

Panduan ini akan menjelaskan cara menerapkan sistem pembaruan aplikasi secara langsung (OTA) ke HP pengguna tanpa harus mereka men-download ulang via Google Play Store. Sistem ini memanfaatkan plugin **@capgo/capacitor-updater** yang bersifat open-source dan menumpang di penyimpanan **Supabase Storage** yang sudah Anda gunakan.

## 1. Persiapan Supabase
1. Buka Dashboard Supabase proyek Anda.
2. Buka menu **Storage**, lalu buat sebuah bucket baru bernama `app_updates`.
3. Pastikan bucket ini diset menjadi **Public** agar aplikasi dapat men-download file update tanpa autentikasi khusus.
4. Buat sebuah tabel baru di SQL Editor untuk mencatat rilis versi terbaru:
   ```sql
   CREATE TABLE public.app_versions (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     version_code VARCHAR(50) NOT NULL,
     zip_url TEXT NOT NULL,
     is_active BOOLEAN DEFAULT false,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

## 2. Instalasi Plugin di Aplikasi
Buka terminal/command prompt, arahkan ke folder `anindira-app`, dan jalankan perintah berikut:
```bash
npm install @capgo/capacitor-updater
npx cap sync
```

## 3. Integrasi Kode di Aplikasi (React)
Di file utama aplikasi Anda (misalnya di `src/App.tsx` atau file yang pertama kali dijalankan saat login), tambahkan logika pengecekan update:

```tsx
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { supabase } from './lib/supabase'; // Sesuaikan path

// Panggil fungsi ini saat aplikasi dimulai
const checkForUpdates = async () => {
  try {
    // 1. Beritahu OS bahwa aplikasi sudah siap
    await CapacitorUpdater.notifyAppReady();

    // 2. Cek tabel versi di Supabase untuk versi terbaru
    const { data, error } = await supabase
      .from('app_versions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return;

    // 3. (Opsional) Cek apakah versi ini sudah terinstall atau belum
    // Jika ada update baru, download zip-nya
    const versionInfo = await CapacitorUpdater.download({
      url: data.zip_url,
      version: data.version_code, 
    });

    // 4. Menerapkan Update (Aplikasi akan otomatis me-reload kode baru)
    if (versionInfo) {
      await CapacitorUpdater.set({ id: versionInfo.id });
    }
  } catch (err) {
    console.error('Gagal melakukan update OTA:', err);
  }
};
```

## 4. Cara Merilis Pembaruan (Saat Anda mengedit kode baru)
Setiap kali Anda selesai melakukan perbaikan bug atau menambahkan fitur baru, lakukan langkah ini:

1. Build aplikasi web Anda seperti biasa:
   ```bash
   npm run build
   ```
2. Masuk ke folder `dist` (hasil build).
3. **Zip (kompres)** seluruh *isi* folder `dist` tersebut menjadi satu file bernama `update-v1.0.1.zip` (ubah angka versinya sesuai kebutuhan).
4. Upload file `update-v1.0.1.zip` ke Supabase Storage (di dalam bucket `app_updates`).
5. Dapatkan URL Public dari file zip tersebut.
6. Masukkan data ke dalam tabel `app_versions` di Supabase:
   - `version_code`: "1.0.1"
   - `zip_url`: "https://[SUPABASE_URL_ANDA]/storage/v1/object/public/app_updates/update-v1.0.1.zip"
   - `is_active`: `true` (Nonaktifkan versi lama jika ada).

Selesai! Saat pengguna membuka aplikasinya, sistem akan mengunduh ZIP tersebut di latar belakang dan mereload UI ke versi terbaru yang baru saja Anda upload, tanpa perlu merilis ke Play Store!
