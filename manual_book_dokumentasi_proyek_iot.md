# 🏠 SmartSpace — Smart Home Pengatur Pencahayaan dan Keamanan Ruangan

[![ESP32](https://img.shields.io/badge/Microcontroller-ESP32-blue?style=flat-square&logo=espressif)](https://www.espressif.com/)
[![Wokwi](https://img.shields.io/badge/Simulation-Wokwi-green?style=flat-square)](https://wokwi.com/projects/479507966495015937)
[![MQTT](https://img.shields.io/badge/Protocol-MQTT%20(HiveMQ)-purple?style=flat-square&logo=mqtt)](https://www.hivemq.com/)
[![Node.js](https://img.shields.io/badge/Backend-Express.js-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)

**SmartSpace** adalah sistem **Internet of Things (IoT)** untuk pemantauan dan pengendalian pencahayaan serta keamanan ruangan secara *real-time* dan dua arah (*bidirectional*). Proyek ini mengintegrasikan mikrokontroler **ESP32** (disimulasikan pada **Wokwi**), protokol komunikasi **MQTT**, server **Node.js/Express.js**, database relasional **MySQL**, serta antarmuka **Web Dashboard interaktif berbasis Next.js**.

🔗 **Simulasi Perangkat Keras Virtual (Wokwi):**  
👉 **[https://wokwi.com/projects/479507966495015937](https://wokwi.com/projects/479507966495015937)**

---

## 👥 Tim Pengembang (Kelompok 4)

**Program Studi Teknik Informatika — Fakultas Ilmu Komputer, Universitas Pamulang**  
*Dosen Pengampu: Fitri Nurlaela, S.T., M.Kom*

| No | Nama Anggota | NIM | Peran Utama |
| :---: | :--- | :--- | :--- |
| 1 | **Achmad Syahril Fauzi** | `231011450396` | Arsitektur Sistem, Backend REST API & Verifikasi MQTT |
| 2 | **Mochamad One Sopyan** | `231011450529` | Pemrograman ESP32 (`sketch.ino`) & Perancangan Database MySQL |
| 3 | **Widi Purnama Sidi** | `231011450154` | Konfigurasi Jaringan WiFi, Broker MQTT & Komunikasi Dua Arah |
| 4 | **Feby Fatimah** | `231011450659` | Pengembangan Web Dashboard Next.js & Visualisasi Data |
| 5 | **Lucy Worowaty Suharno** | `231011450364` | Analisis Kebutuhan, Pengujian End-to-End & Dokumentasi |

---

## ✨ Fitur Utama Sistem

1. **Otomatisasi Pencahayaan Cerdas (Mode Otomatis & Manual):**
   * Membaca intensitas cahaya ruangan menggunakan sensor **LDR (`0–4095 ADC`)** dengan mekanisme **histeresis** (`Lampu ON >= 2500 ADC`, `Lampu OFF <= 1800 ADC`) agar lampu tidak berkedip saat cahaya berada di titik ambang.
   * Mendukung kendali jarak jauh via Web Dashboard maupun tombol fisik lokal (**Push Button** dengan *software debouncing* `40 ms`).
   * Pengaturan warna lampu **NeoPixel RGB** (`Putih`, `Merah`, `Hijau`, `Biru`) pada mode manual.
2. **Sistem Keamanan Ruangan & Alarm Otomatis:**
   * Mendeteksi pergerakan manusia menggunakan **PIR Motion Sensor** dan membunyikan **Piezo Buzzer (`2000 Hz`)** secara otomatis selama 5 detik.
   * Dilengkapi fitur **Uji Alarm (Panic Button)** dan **Hentikan Alarm** langsung dari dashboard, disertai banner peringatan darurat secara *real-time*.
3. **Komunikasi Dua Arah dengan Konfirmasi Server:**
   * Setiap perintah kontrol dari Web Dashboard dikirim melalui REST API $\rightarrow$ Broker MQTT $\rightarrow$ ESP32, lalu diverifikasi balik dari payload telemetri ESP32 (`Terkonfirmasi` / `Gagal`).
4. **Pencatatan Historis & Ekspor Laporan:**
   * Menyimpan riwayat pembacaan sensor (`sensor_log`) dan log kendali/peringatan (`control_log`) ke dalam **MySQL**.
   * Menampilkan grafik area interaktif (*Tren Pencahayaan*), fitur **Ekspor CSV**, serta penghapusan log langsung dari dashboard.

---

## 🛠️ Teknologi & Arsitektur Sistem

```text
┌──────────────────────┐       MQTT (JSON)       ┌────────────────────────┐
│   ESP32 Simulator    │ ──────────────────────► │   HiveMQ Public Broker │
│ (Wokwi / PlatformIO) │ ◄────────────────────── │  broker.hivemq.com     │
└──────────────────────┘      MQTT (Command)     └───────────┬────────────┘
                                                             │ Pub / Sub
                                                             ▼
┌──────────────────────┐     REST API (HTTP)     ┌────────────────────────┐
│   Web Dashboard      │ ◄─────────────────────► │   Backend Server       │
│ Next.js + Tailwind + │                         │   Node.js + Express.js │
│    Framer Motion     │                         └───────────┬────────────┘
└──────────────────────┘                                     │ SQL (mysql2)
                                                             ▼
                                                 ┌────────────────────────┐
                                                 │   Database MySQL       │
                                                 │    (smarthome_db)      │
                                                 └────────────────────────┘
```

* **Perangkat Keras Virtual:** ESP32 DevKit V1, Photoresistor (LDR), PIR Motion Sensor, Push Button, NeoPixel RGB LED, Relay Module 1-Channel, Piezo Buzzer, LED & Resistor.
* **Firmware:** Arduino C++ (`PubSubClient`, `Adafruit_NeoPixel`).
* **Protokol IoT:** MQTT (`broker.hivemq.com`, Port `1883`).
  * Topik Telemetri: `unpam/k4/231011450396/smarthome/data`
  * Topik Perintah: `unpam/k4/231011450396/smarthome/command`
* **Backend:** Node.js, Express.js, `mqtt`, `mysql2`, `cors`, `dotenv`.
* **Database:** MySQL / MariaDB (`smarthome_db`).
* **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide Icons, Framer Motion.

---

## 🔌 Pemetaan Pin ESP32 (Wokwi)

| Komponen | Pin Komponen | Pin ESP32 | Tipe Sinyal | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| **LDR Sensor Module** | `AO` | `GPIO 34` | Input Analog | Pembacaan ADC 12-bit (`0–4095`) |
| **PIR Motion Sensor** | `OUT` | `GPIO 27` | Input Digital | Deteksi gerakan (`HIGH`/`LOW`) |
| **Push Button** | Pin 1 | `GPIO 14` | Input Digital | Tombol manual (`INPUT_PULLUP`) |
| **NeoPixel RGB LED** | `DIN` | `GPIO 26` | Output Digital | Lampu indikator warna RGB |
| **Relay Module** | `IN` | `GPIO 33` | Output Digital | Saklar lampu utama (`ACTIVE HIGH`) |
| **Piezo Buzzer** | `+` | `GPIO 25` | Output Digital | Alarm sirene (`2000 Hz`) |

---

## 📂 Struktur Direktori Proyek

```text
Project-IoT-SmartHome-K4/
├── wokwi-esp32/                # Kode firmware & skema Wokwi / PlatformIO
│   ├── src/main.cpp            # Kode utama ESP32 (sketch.ino)
│   ├── diagram.json            # Konfigurasi rangkaian virtual Wokwi
│   └── platformio.ini          # Konfigurasi library PlatformIO
├── smarthome-backend/          # Server REST API & MQTT Bridge
│   ├── db.js                   # Koneksi pool MySQL (mysql2/promise)
│   ├── server.js               # Endpoint API & subscriber/publisher MQTT
│   ├── .env.example            # Template konfigurasi environment
│   └── package.json
├── smarthome-frontend/         # Aplikasi Web Dashboard Next.js
│   ├── app/
│   │   ├── layout.tsx          # Metadata judul & layout utama
│   │   └── page.tsx            # Halaman utama dashboard interaktif
│   ├── public/                 # Aset gambar & logo
│   ├── .env.local              # Konfigurasi URL API Backend
│   └── package.json
└── README.md                   # Dokumentasi & Manual Book
```

---

## 🚀 Panduan Instalasi & Menjalankan Proyek (Step-by-Step)

### Prasyarat Sistem
Pastikan perangkat lunak berikut sudah terpasang di komputer Anda:
* **Node.js** (versi 18 atau lebih baru)
* **MySQL Server** (melalui XAMPP, Laragon, atau MySQL Workbench)
* **Browser Web** (Google Chrome / Edge) & koneksi internet untuk mengakses broker MQTT HiveMQ serta simulator Wokwi.

---

### Langkah 1: Konfigurasi Database MySQL

1. Jalankan layanan **MySQL** (misalnya melalui XAMPP Control Panel).
2. Buka **phpMyAdmin** (`http://localhost/phpmyadmin`) atau terminal MySQL, lalu jalankan perintah SQL berikut untuk membuat database dan tabel:

```sql
CREATE DATABASE IF NOT EXISTS smarthome_db;
USE smarthome_db;

-- Tabel riwayat pembacaan sensor
CREATE TABLE IF NOT EXISTS sensor_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ldr_raw INT NOT NULL,
  lux FLOAT NOT NULL,
  pir_status TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel riwayat kontrol & peringatan keamanan
CREATE TABLE IF NOT EXISTS control_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  source VARCHAR(50) NOT NULL,
  response VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel status koneksi terkini ESP32
CREATE TABLE IF NOT EXISTS device_status (
  id INT PRIMARY KEY,
  mode VARCHAR(20) NOT NULL DEFAULT 'auto',
  state VARCHAR(20) NOT NULL DEFAULT 'LAMP_OFF',
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Inisialisasi baris awal status perangkat
INSERT IGNORE INTO device_status (id, mode, state) VALUES (1, 'auto', 'LAMP_OFF');
```

---

### Langkah 2: Instalasi & Menjalankan Backend (`smarthome-backend`)

1. Buka terminal baru dan masuk ke direktori `smarthome-backend`:
   ```bash
   cd smarthome-backend
   ```
2. Pasang seluruh dependensi Node.js:
   ```bash
   npm install
   ```
3. Buat file `.env` di dalam folder `smarthome-backend` dengan isi berikut (sesuaikan `DB_USER` dan `DB_PASSWORD` dengan konfigurasi MySQL Anda):
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=smarthome_db

   MQTT_BROKER=mqtt://broker.hivemq.com:1883
   TOPIC_DATA=unpam/k4/231011450396/smarthome/data
   TOPIC_COMMAND=unpam/k4/231011450396/smarthome/command
   ```
4. Jalankan server backend:
   ```bash
   node server.js
   ```
5. Pastikan muncul log berikut di terminal:
   ```text
   [SERVER] Backend SmartHome berjalan di http://localhost:5000
   [MQTT] Terhubung ke broker: mqtt://broker.hivemq.com:1883
   [MQTT] Berhasil subscribe ke: unpam/k4/231011450396/smarthome/data
   ```

---

### Langkah 3: Instalasi & Menjalankan Frontend (`smarthome-frontend`)

1. Buka terminal kedua (biarkan terminal backend tetap berjalan) dan masuk ke folder `smarthome-frontend`:
   ```bash
   cd smarthome-frontend
   ```
2. Pasang seluruh paket dependensi (termasuk `lucide-react` dan `framer-motion`):
   ```bash
   npm install
   ```
3. Buat file `.env.local` di dalam folder `smarthome-frontend`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```
4. Jalankan server pengembangan Next.js:
   ```bash
   npm run dev
   ```
5. Buka browser dan akses **[http://localhost:3000](http://localhost:3000)**.

---

### Langkah 4: Menjalankan Simulasi ESP32 di Wokwi

1. Buka tautan proyek simulasi Wokwi:  
   👉 **[https://wokwi.com/projects/479507966495015937](https://wokwi.com/projects/479507966495015937)**
2. Klik tombol **Start the simulation** (ikon **Play** berwarna hijau).
3. Tunggu beberapa detik hingga **Serial Monitor** di bagian bawah menampilkan `WiFi=OK | MQTT=OK`.
4. Kembali ke Web Dashboard (`http://localhost:3000`): indikator status di pojok kanan atas akan berubah menjadi hijau (**`ESP32 online · MQTT & MySQL terhubung`**) dan data sensor mulai diperbarui secara langsung.

---

## 🧪 Panduan Pengujian Fitur (Manual Book)

| Fitur | Cara Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- |
| **Otomatisasi Lampu (LDR)** | Pastikan mode dashboard berada di **Otomatis**. Klik sensor LDR di Wokwi dan geser slider ke kiri (`>= 2500 ADC`). | Relay & NeoPixel Wokwi menyala otomatis; visualizer rumah di web menyala kuning dan nilai ADC naik. |
| **Kontrol Manual & Warna RGB** | Klik **Manual** pada dashboard, nyalakan toggle **Lampu & relay**, lalu pilih warna **Merah / Hijau / Biru**. | NeoPixel di Wokwi berubah warna sesuai pilihan; muncul notifikasi *Terkonfirmasi* dan tercatat di tabel riwayat. |
| **Deteksi Gerakan (PIR)** | Aktifkan toggle **Aktifkan keamanan**, lalu klik sensor PIR di Wokwi dan tekan **Simulate motion**. | Buzzer di Wokwi berbunyi 5 detik; banner darurat merah muncul di dashboard dan tercatat sebagai *Peringatan*. |
| **Uji & Hentikan Alarm** | Klik tombol **Uji alarm** di dashboard, lalu klik **Hentikan alarm** / **Matikan Alarm Sekarang**. | Buzzer Wokwi berbunyi seketika saat diuji dan langsung berhenti saat tombol matikan ditekan. |
| **Ekspor & Hapus Riwayat** | Klik **Ekspor CSV** untuk mengunduh laporan, atau **Hapus Riwayat** untuk mengosongkan log. | File `riwayat-smarthome-k4.csv` terunduh, atau tabel log dan database `control_log` terhapus bersih. |

---

## 📜 Lisensi

Proyek ini disusun untuk memenuhi tugas mata kuliah **Internet of Things (IoT)** — Program Studi Teknik Informatika, Universitas Pamulang.