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
Proyek ini disusun untuk memenuhi tugas mata kuliah **Internet of Things (IoT)** — Program Studi Teknik Informatika, Universitas Pamulang.
