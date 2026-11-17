const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://broker.hivemq.com:1883';
const TOPIC_DATA = process.env.TOPIC_DATA || 'unpam/k4/231011450396/smarthome/data';
const TOPIC_COMMAND = process.env.TOPIC_COMMAND || 'unpam/k4/231011450396/smarthome/command';

// State terakhir di memori untuk akses cepat & verifikasi perintah
let latestTelemetry = {
  ldr: 0,
  dark: false,
  motion: false,
  auto: true,
  lamp: false,
  relay: false,
  security: true,
  alarm: false,
  uptime: 0,
  lastUpdated: null
};

let lastSensorSaveTime = 0;
let previousMotion = false;
let previousLamp = false;
let pendingConfirmation = null;

// ================= KONEKSI MQTT =================
const mqttClient = mqtt.connect(MQTT_BROKER, {
  clientId: 'backend_k4_' + Math.random().toString(16).substring(2, 8)
});

mqttClient.on('connect', () => {
  console.log('[MQTT] Terhubung ke broker:', MQTT_BROKER);
  mqttClient.subscribe(TOPIC_DATA, (err) => {
    if (err) {
      console.error('[MQTT] Gagal subscribe:', err.message);
    } else {
      console.log('[MQTT] Berhasil subscribe ke:', TOPIC_DATA);
    }
  });
});

mqttClient.on('message', async (topic, payload) => {
  if (topic !== TOPIC_DATA) return;

  try {
    const data = JSON.parse(payload.toString());
    const now = Date.now();
    console.log(`[MQTT DATA] LDR: ${data.ldr} | Gerak: ${data.motion} | Lampu: ${data.lamp}`);

    latestTelemetry = {
      ...data,
      lastUpdated: now
    };

    // 1. Cek apakah ada perintah web yang sedang menunggu konfirmasi
    if (pendingConfirmation) {
      const { action, resolve } = pendingConfirmation;
      let isConfirmed = false;

      if (action === 'auto' && data.auto === true) isConfirmed = true;
      if (action === 'manual' && data.auto === false) isConfirmed = true;
      if (action === 'lamp_on' && data.lamp === true) isConfirmed = true;
      if (action === 'lamp_off' && data.lamp === false) isConfirmed = true;
      if (action === 'security_on' && data.security === true) isConfirmed = true;
      if (action === 'security_off' && data.security === false) isConfirmed = true;
      if (action === 'alarm_on' && data.alarm === true) isConfirmed = true;
      if (action === 'alarm_off' && data.alarm === false) isConfirmed = true;
      if (['red', 'green', 'blue', 'white'].includes(action)) isConfirmed = true;

      if (isConfirmed) {
        clearTimeout(pendingConfirmation.timer);
        pendingConfirmation = null;
        resolve(true);
      }
    }

    // 2. Update status perangkat terkini di tabel device_status
    const modeStr = data.auto ? 'auto' : 'manual';
    const stateStr = data.lamp ? 'LAMP_ON' : 'LAMP_OFF';
    await db.query(
      'UPDATE device_status SET mode = ?, state = ?, last_seen = NOW() WHERE id = 1',
      [modeStr, stateStr]
    );

    // 3. Simpan ke sensor_log setiap 10 detik ATAU saat ada perubahan gerakan/lampu
    const eventChanged = data.motion !== previousMotion || data.lamp !== previousLamp;
    if (now - lastSensorSaveTime >= 10000 || eventChanged) {
      lastSensorSaveTime = now;
      const estimatedLux = parseFloat(((4095 - data.ldr) * 0.25).toFixed(2));
      await db.query(
        'INSERT INTO sensor_log (ldr_raw, lux, pir_status) VALUES (?, ?, ?)',
        [data.ldr, estimatedLux, data.motion ? 1 : 0]
      );
      console.log('[DB] Data sensor tersimpan ke sensor_log');
    }

    // 4. Catat ke control_log jika alarm aktif otomatis karena gerakan PIR
    if (data.motion && !previousMotion && data.security) {
      await db.query(
        'INSERT INTO control_log (device, action, source, response) VALUES (?, ?, ?, ?)',
        ['buzzer', 'Alarm keamanan aktif', 'ESP32 / PIR', 'Peringatan']
      );
    }

    previousMotion = data.motion;
    previousLamp = data.lamp;

  } catch (err) {
    console.error('[ERROR] Gagal memproses data MQTT / MySQL:', err.message);
  }
});


// ================= REST API ENDPOINTS =================

// 1. Ambil status perangkat & data telemetri terkini
app.get('/api/status', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM device_status WHERE id = 1');
    const isOnline = latestTelemetry.lastUpdated && (Date.now() - latestTelemetry.lastUpdated <= 10000);

    res.json({
      online: Boolean(isOnline),
      telemetry: latestTelemetry,
      device: rows[0] || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Ambil 24 sampel terakhir untuk grafik Tren Pencahayaan
app.get('/api/sensors/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 24;
    const [rows] = await db.query(
      'SELECT id, ldr_raw, lux, pir_status, created_at FROM sensor_log ORDER BY id DESC LIMIT ?',
      [limit]
    );
    // Balik urutan agar kronologis dari kiri (lama) ke kanan (terbaru)
    res.json(rows.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Ambil riwayat aktivitas (maksimal 100 data terakhir)
app.get('/api/logs', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, device, action, source, response, created_at FROM control_log ORDER BY id DESC LIMIT 100'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Ekspor riwayat aktivitas ke file CSV
app.get('/api/logs/export', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, created_at, device, action, source, response FROM control_log ORDER BY id DESC LIMIT 500'
    );

    let csv = 'ID,Waktu,Perangkat,Aktivitas,Sumber,Status\n';
    rows.forEach((r) => {
      const waktu = new Date(r.created_at).toLocaleString('id-ID').replace(/,/g, '');
      csv += `${r.id},"${waktu}","${r.device}","${r.action}","${r.source}","${r.response}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="riwayat-smarthome-k4.csv"');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4b. Hapus seluruh riwayat aktivitas dari database MySQL
app.delete('/api/logs', async (req, res) => {
  try {
    await db.query('TRUNCATE TABLE control_log');
    console.log('[DB] Seluruh riwayat control_log berhasil dihapus');
    res.json({ success: true, message: 'Seluruh riwayat aktivitas berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Kirim perintah kontrol ke ESP32 dan verifikasi balasannya
app.post('/api/control', async (req, res) => {
  const { device, action } = req.body;

  if (!action) {
    return res.status(400).json({ success: false, message: 'Parameter action wajib diisi' });
  }

  // Tolak perintah lampu/warna jika ESP32 masih dalam mode otomatis
  if (latestTelemetry.auto && ['lamp_on', 'lamp_off', 'red', 'green', 'blue', 'white'].includes(action)) {
    await db.query(
      'INSERT INTO control_log (device, action, source, response) VALUES (?, ?, ?, ?)',
      [device || 'lamp', `Perintah: ${action}`, 'Dashboard', 'Gagal']
    );
    return res.status(400).json({
      success: false,
      message: 'Gagal: Ubah ke mode manual terlebih dahulu.'
    });
  }

  // Publish perintah ke topik MQTT ESP32
  mqttClient.publish(TOPIC_COMMAND, action);

  // Tunggu balasan konfirmasi dari ESP32 maksimal 3 detik
  const confirmed = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingConfirmation = null;
      resolve(false);
    }, 3000);

    pendingConfirmation = { action, resolve, timer };
  });

  const statusText = confirmed ? 'Terkonfirmasi' : 'Gagal';

  await db.query(
    'INSERT INTO control_log (device, action, source, response) VALUES (?, ?, ?, ?)',
    [device || 'system', `Perintah: ${action}`, 'Dashboard', statusText]
  );

  res.json({
    success: confirmed,
    status: statusText,
    message: confirmed
      ? `Perintah "${action}" berhasil dieksekusi oleh ESP32.`
      : `Timeout: ESP32 tidak merespons perintah "${action}".`
  });
});

app.listen(PORT, () => {
  console.log(`[SERVER] Backend SmartHome berjalan di http://localhost:${PORT}`);
});

