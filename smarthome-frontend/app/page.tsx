'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Sliders,
  History,
  Sun,
  Radio,
  Lightbulb,
  ShieldCheck,
  ExternalLink,
  Download,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  ArrowUp,
  Home,
  Volume2
} from 'lucide-react';

interface Telemetry {
  ldr: number;
  dark: boolean;
  motion: boolean;
  auto: boolean;
  lamp: boolean;
  relay: boolean;
  security: boolean;
  alarm: boolean;
  uptime: number;
  lastUpdated: number | null;
}

interface SensorHistory {
  id: number;
  ldr_raw: number;
  lux: number;
  pir_status: number;
  created_at: string;
}

interface ControlLog {
  id: number;
  device: string;
  action: string;
  source: string;
  response: string;
  created_at: string;
}

export default function SmartSpaceDashboard() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  const [activeTab, setActiveTab] = useState<'ringkasan' | 'kontrol' | 'riwayat'>('ringkasan');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  const [telemetry, setTelemetry] = useState<Telemetry>({
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
  });

  const [selectedColor, setSelectedColor] = useState<string>('white');
  const [sensorHistory, setSensorHistory] = useState<SensorHistory[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<SensorHistory | null>(null);
  const [logs, setLogs] = useState<ControlLog[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  // Deteksi posisi scroll untuk tombol Scroll Up
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 1. Ambil status real-time dari Backend Express.js
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/status`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setIsOnline(data.online);
      if (data.telemetry) {
        setTelemetry(data.telemetry);
      }
    } catch {
      setIsOnline(false);
    }
  }, [API_URL]);

  // 2. Ambil 24 sampel terakhir untuk Grafik Tren Pencahayaan
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/sensors/history?limit=24`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setSensorHistory(data);
    } catch {
      // Abaikan sementara jika backend sedang restart
    }
  }, [API_URL]);

  // 3. Ambil riwayat aktivitas dari MySQL
  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/logs`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data);
    } catch {
      // Abaikan sementara jika backend sedang restart
    }
  }, [API_URL]);

  useEffect(() => {
    fetchStatus();
    fetchHistory();
    fetchLogs();

    const fastInterval = setInterval(fetchStatus, 2000);
    const slowInterval = setInterval(() => {
      fetchHistory();
      fetchLogs();
    }, 5000);

    return () => {
      clearInterval(fastInterval);
      clearInterval(slowInterval);
    };
  }, [fetchStatus, fetchHistory, fetchLogs]);

  // 4. Kirim perintah kontrol ke Backend -> MQTT -> ESP32
  const sendCommand = async (device: string, action: string) => {
    if (isSending) return;
    setIsSending(true);

    try {
      const res = await fetch(`${API_URL}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device, action })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showToast('success', result.message || `Perintah "${action}" terkonfirmasi.`);
        if (['red', 'green', 'blue', 'white'].includes(action)) {
          setSelectedColor(action);
        }
      } else {
        showToast('error', result.message || `Perintah "${action}" gagal.`);
      }

      await Promise.allSettled([fetchStatus(), fetchLogs()]);
    } catch {
      showToast('error', 'Gagal terhubung ke server Backend.');
    } finally {
      setIsSending(false);
    }
  };

  // 5. Hapus seluruh riwayat aktivitas dari Frontend & MySQL
  const clearLogs = async () => {
    if (logs.length === 0 || isSending) return;
    const confirmed = window.confirm('Yakin ingin menghapus seluruh riwayat aktivitas dari database?');
    if (!confirmed) return;

    setIsSending(true);
    try {
      const res = await fetch(`${API_URL}/logs`, { method: 'DELETE' });
      const result = await res.json();

      if (res.ok && result.success) {
        setLogs([]);
        showToast('success', result.message || 'Riwayat aktivitas berhasil dihapus.');
      } else {
        showToast('error', result.message || 'Gagal menghapus riwayat.');
      }
    } catch {
      showToast('error', 'Gagal terhubung ke server Backend.');
    } finally {
      setIsSending(false);
    }
  };

  const getWindowStyle = () => {
    if (!telemetry.lamp) {
      return {
        fill: '#1e3e45',
        glowColor: 'rgba(16, 185, 129, 0)',
        label: 'Mati'
      };
    }
    switch (selectedColor) {
      case 'red':
        return {
          fill: '#f87171',
          glowColor: 'rgba(248, 113, 113, 0.45)',
          label: 'Merah'
        };
      case 'green':
        return {
          fill: '#4ade80',
          glowColor: 'rgba(74, 222, 128, 0.45)',
          label: 'Hijau'
        };
      case 'blue':
        return {
          fill: '#60a5fa',
          glowColor: 'rgba(96, 165, 250, 0.45)',
          label: 'Biru'
        };
      default:
        return {
          fill: '#fde047',
          glowColor: 'rgba(253, 224, 71, 0.45)',
          label: 'Putih'
        };
    }
  };

  const windowStyle = getWindowStyle();

  const buildChartData = () => {
    const width = 300;
    const height = 80;
    const maxAdc = 4095;

    if (sensorHistory.length < 2) {
      return {
        line: `M 0 65 L ${width} 65`,
        area: `M 0 65 L ${width} 65 L ${width} ${height} L 0 ${height} Z`,
        coords: [] as { x: number; y: number; item: SensorHistory }[]
      };
    }

    const coords = sensorHistory.map((item, idx) => {
      const x = (idx / (sensorHistory.length - 1)) * width;
      const normalized = Math.min(Math.max(item.ldr_raw / maxAdc, 0), 1);
      const y = height - 6 - normalized * (height - 14);
      return { x, y, item };
    });

    const line = `M ${coords.map((c) => `${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' L ')}`;
    const area = `${line} L ${width} ${height} L 0 ${height} Z`;

    return { line, area, coords };
  };

  const chartData = buildChartData();

  const formatTime = (isoString: string | number | null) => {
    if (!isoString) return '--.--.--';
    return new Date(isoString).toLocaleTimeString('id-ID', { hour12: false });
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0d';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}j ${m}m ${s}d`;
    if (m > 0) return `${m}m ${s}d`;
    return `${s}d`;
  };

  const navItems = [
    { id: 'ringkasan', label: 'Ringkasan', icon: LayoutGrid },
    { id: 'kontrol', label: 'Kontrol perangkat', icon: Sliders },
    { id: 'riwayat', label: 'Riwayat aktivitas', icon: History }
  ] as const;

  return (
    <div className="flex min-h-screen bg-[#f4f7f8] font-sans text-slate-800 selection:bg-emerald-500/20">
      {/* NOTIFIKASI TOAST DENGAN ANIMASI SPRING */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md border text-xs font-medium ${
              toast.type === 'success'
                ? 'bg-[#0d282e]/95 text-emerald-50 border-emerald-500/30'
                : 'bg-rose-950/95 text-rose-50 border-rose-500/40'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <XCircle size={16} className="text-rose-400 shrink-0" />
            )}
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR DENGAN SLIDING ACTIVE INDICATOR */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="bg-[#0d282e] text-slate-300 flex flex-col justify-between p-6 shrink-0 overflow-hidden border-r border-slate-800"
          >
            <div className="w-52">
              <div className="mb-8 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                  <Home size={19} />
                </div>
                <div>
                  <span className="text-lg font-bold tracking-tight text-white block leading-none">
                    smartspace<span className="text-emerald-400">.</span>
                  </span>
                  <p className="text-[10px] tracking-widest uppercase text-slate-400 mt-1 font-semibold">
                    SMART HOME · KELOMPOK 4
                  </p>
                </div>
              </div>

              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive ? 'text-emerald-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeSidebarPill"
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                          className="absolute inset-0 bg-[#1a3a42] rounded-xl border border-emerald-500/20 shadow-sm"
                        />
                      )}
                      <Icon size={18} className="relative z-10" />
                      <span className="relative z-10">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="w-52 text-xs text-slate-400 border-t border-slate-700/50 pt-4 space-y-1">
              <p className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">
                PROJECT INTERNET OF THINGS
              </p>
              <p className="font-bold text-slate-200">ESP32 · Wokwi</p>
              <p className="text-slate-400/80">Pencahayaan & keamanan</p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
        {/* TOP HEADER */}
        <div className="flex flex-wrap justify-between items-center gap-3 text-sm text-slate-500">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Sembunyikan Sidebar' : 'Tampilkan Sidebar'}
              className="p-2 rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100 shadow-sm transition-colors"
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </motion.button>
            <div className="text-xs md:text-sm">
              <span className="text-slate-400">Workspace</span> /{' '}
              <span className="font-semibold text-slate-900">Rumah saya</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/80 text-xs text-slate-600 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              {isOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isOnline ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </span>
            <span className="font-medium">
              {isOnline ? 'ESP32 online · MQTT & MySQL terhubung' : 'ESP32 offline · Menunggu Wokwi'}
            </span>
          </div>
        </div>

        {/* BANNER DARURAT SAAT ALARM AKTIF */}
        <AnimatePresence>
          {telemetry.alarm && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -12 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -12 }}
              className="bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-2xl p-4 shadow-lg shadow-rose-500/20 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/15 rounded-xl animate-bounce">
                  <AlertTriangle size={22} className="shrink-0" />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-wide">
                    PERINGATAN KEAMANAN: ALARM AKTIF!
                  </p>
                  <p className="text-xs text-rose-100">
                    Buzzer berbunyi di ruangan. Klik tombol di samping untuk menonaktifkan.
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => sendCommand('alarm', 'alarm_off')}
                disabled={isSending}
                className="px-4 py-2.5 bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                Matikan Alarm Sekarang
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TITLE & STATUS BANNER */}
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-end gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Rumah nyaman, kendali di tangan.
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Pantau pencahayaan dan keamanan rumah dalam satu tempat.
              </p>
            </div>
            {isSending && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-xl"
              >
                <RefreshCw size={13} className="animate-spin" /> Menyinkronkan perintah...
              </motion.span>
            )}
          </div>

          <div className="bg-amber-50/90 border border-amber-200/70 rounded-2xl px-4 py-3 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
            <span>
              Live dari ESP32 · pembaruan terakhir{' '}
              <strong className="font-mono">{formatTime(telemetry.lastUpdated)}</strong> · Uptime{' '}
              <strong>{formatUptime(telemetry.uptime)}</strong>
            </span>
            <span className="text-[11px] font-medium text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
              Database MySQL Aktif
            </span>
          </div>
        </div>

        {/* 4 METRIC CARDS DENGAN STAGGERED MOTION */}
        {(activeTab === 'ringkasan' || activeTab === 'kontrol') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'Intensitas cahaya',
                value: telemetry.ldr,
                unit: 'ADC',
                sub: telemetry.dark ? 'Kondisi gelap' : 'Kondisi terang',
                icon: Sun,
                iconBg: 'bg-emerald-50 text-emerald-600',
                valueColor: 'text-slate-900'
              },
              {
                title: 'Sensor gerakan',
                value: telemetry.motion ? 'Terdeteksi' : 'Tidak ada',
                unit: '',
                sub: 'PIR · Area rumah',
                icon: Radio,
                iconBg: telemetry.motion ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600',
                valueColor: telemetry.motion ? 'text-amber-600' : 'text-slate-900'
              },
              {
                title: 'Pencahayaan',
                value: telemetry.lamp ? 'Menyala' : 'Mati',
                unit: '',
                sub: `${telemetry.auto ? 'Mode otomatis' : 'Mode manual'} · Relay ${telemetry.relay ? 'ON' : 'OFF'}`,
                icon: Lightbulb,
                iconBg: telemetry.lamp ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-600',
                valueColor: 'text-slate-900'
              },
              {
                title: 'Keamanan rumah',
                value: telemetry.security ? 'Aktif' : 'Nonaktif',
                unit: '',
                sub: telemetry.alarm ? 'ALARM BERBUNYI!' : 'Alarm siaga',
                icon: ShieldCheck,
                iconBg: telemetry.alarm ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600',
                valueColor: telemetry.alarm ? 'text-rose-600' : 'text-slate-900'
              }
            ].map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.06 }}
                  whileHover={{ y: -3, transition: { duration: 0.15 } }}
                  className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-slate-500 font-medium">{card.title}</span>
                    <div className={`p-2 rounded-xl ${card.iconBg}`}>
                      <Icon size={18} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-2xl font-bold tracking-tight ${card.valueColor}`}>
                        {card.value}
                      </span>
                      {card.unit && (
                        <span className="text-xs text-slate-400 font-semibold">{card.unit}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* PANEL KONTROL & KEAMANAN */}
        {(activeTab === 'ringkasan' || activeTab === 'kontrol') && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* KONTROL PENCAHAYAAN */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Kontrol pencahayaan</h2>
                  <p className="text-xs text-slate-400">NeoPixel & lampu utama</p>
                </div>
                <span
                  className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider transition-colors ${
                    telemetry.lamp
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                      : 'text-slate-500 bg-slate-100'
                  }`}
                >
                  Lampu {telemetry.lamp ? 'ON' : 'OFF'}
                </span>
              </div>

              {/* Visualizer Rumah Interaktif */}
              <div className="bg-gradient-to-b from-[#0c262c] to-[#123740] rounded-2xl p-8 flex items-center justify-center relative min-h-[215px] overflow-hidden border border-slate-800">
                <span className="absolute top-4 left-4 text-[10px] tracking-widest text-emerald-400/90 font-mono">
                  RUMAH SAYA / LIVING SPACE
                </span>
                <span className="absolute top-4 right-4 text-[10px] bg-white/10 backdrop-blur-sm text-slate-200 px-3 py-1 rounded-full border border-white/10">
                  NeoPixel: {windowStyle.label}
                </span>

                {/* Ambient Glow di belakang rumah */}
                <motion.div
                  animate={{
                    scale: telemetry.lamp ? [1, 1.15, 1] : 0.8,
                    opacity: telemetry.lamp ? 1 : 0
                  }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  style={{ backgroundColor: windowStyle.glowColor }}
                  className="absolute w-40 h-40 rounded-full blur-2xl pointer-events-none"
                />

                <svg className="w-48 h-40 relative z-10" viewBox="0 0 200 160" fill="none">
                  <path
                    d="M100 20 L170 80 V150 H30 V80 Z"
                    stroke="#4b838d"
                    strokeWidth="2.2"
                    fill="rgba(15, 46, 53, 0.6)"
                  />
                  <rect
                    x="48"
                    y="90"
                    width="32"
                    height="32"
                    rx="3"
                    fill={windowStyle.fill}
                    className="transition-colors duration-300"
                  />
                  <rect
                    x="110"
                    y="95"
                    width="26"
                    height="55"
                    rx="2"
                    stroke="#4b838d"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
              </div>

              {/* Mode Pencahayaan */}
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Mode pencahayaan</p>
                  <p className="text-xs text-slate-400">Otomatis mengikuti kondisi sensor LDR</p>
                </div>
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    disabled={isSending}
                    onClick={() => sendCommand('mode', 'auto')}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      telemetry.auto ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Otomatis
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    disabled={isSending}
                    onClick={() => sendCommand('mode', 'manual')}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      !telemetry.auto ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Manual
                  </motion.button>
                </div>
              </div>

              {/* Lampu & Relay */}
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Lampu & relay</p>
                  <p className="text-xs text-slate-400">
                    {telemetry.auto
                      ? 'Ubah ke mode manual untuk mengontrol lampu'
                      : 'Kendali manual aktif'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={telemetry.lamp}
                    disabled={telemetry.auto || isSending}
                    onChange={(e) =>
                      sendCommand('lamp', e.target.checked ? 'lamp_on' : 'lamp_off')
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-disabled:opacity-40" />
                </label>
              </div>

              {/* Warna NeoPixel */}
              <div className="flex justify-between items-center py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Warna NeoPixel</p>
                  <p className="text-xs text-slate-400">Tersedia pada mode manual</p>
                </div>
                <select
                  value={selectedColor}
                  disabled={telemetry.auto || isSending}
                  onChange={(e) => sendCommand('rgb', e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl px-3.5 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 disabled:opacity-40 transition-all"
                >
                  <option value="white">Putih (Default)</option>
                  <option value="red">Merah</option>
                  <option value="green">Hijau</option>
                  <option value="blue">Biru</option>
                </select>
              </div>
            </div>

            {/* SISTEM KEAMANAN & GRAFIK TREN */}
            <div className="lg:col-span-5 space-y-6">
              {/* Sistem Keamanan */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Sistem keamanan</h2>
                    <p className="text-xs text-slate-400">PIR motion sensor & buzzer</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      telemetry.security
                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                        : 'text-slate-500 bg-slate-100'
                    }`}
                  >
                    {telemetry.security ? 'TERLINDUNGI' : 'NONAKTIF'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Aktifkan keamanan</p>
                    <p className="text-xs text-slate-400">Bunyikan alarm jika ada gerakan</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={telemetry.security}
                      disabled={isSending}
                      onChange={(e) =>
                        sendCommand(
                          'security',
                          e.target.checked ? 'security_on' : 'security_off'
                        )
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                <div className="flex flex-wrap justify-between items-center pt-2 gap-2">
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        telemetry.alarm ? 'text-rose-600' : 'text-slate-800'
                      }`}
                    >
                      {telemetry.alarm ? 'ALARM SEDANG AKTIF!' : 'Tidak ada alarm aktif'}
                    </p>
                    <p className="text-xs text-slate-400">Durasi alarm demo: 5 detik</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => sendCommand('alarm', 'alarm_on')}
                      disabled={telemetry.alarm || isSending}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60 disabled:opacity-40 transition-colors"
                    >
                      <Volume2 size={13} /> Uji alarm
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => sendCommand('alarm', 'alarm_off')}
                      disabled={!telemetry.alarm || isSending}
                      className={`px-3.5 py-2 text-xs rounded-xl font-semibold transition-all ${
                        telemetry.alarm
                          ? 'bg-rose-600 text-white shadow-sm hover:bg-rose-700'
                          : 'bg-rose-50 text-rose-300 cursor-not-allowed opacity-60'
                      }`}
                    >
                      Hentikan alarm
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Grafik Tren Pencahayaan Interaktif dari MySQL */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Tren pencahayaan</h2>
                    <p className="text-xs text-slate-400">
                      {hoveredPoint
                        ? `${hoveredPoint.ldr_raw} ADC pada ${formatTime(hoveredPoint.created_at)}`
                        : `${sensorHistory.length} sampel terakhir · MySQL sensor_log`}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full uppercase">
                    LDR
                  </span>
                </div>

                <div className="pt-2">
                  <div className="h-28 w-full relative">
                    <svg
                      className="w-full h-full overflow-visible"
                      viewBox="0 0 300 80"
                      preserveAspectRatio="none"
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      <line
                        x1="0"
                        y1="30"
                        x2="300"
                        y2="30"
                        stroke="#e2e8f0"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />

                      <path d={chartData.area} fill="url(#chartGradient)" />
                      <path
                        d={chartData.line}
                        fill="none"
                        stroke="#059669"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />

                      {chartData.coords.map((pt, i) => (
                        <circle
                          key={i}
                          cx={pt.x}
                          cy={pt.y}
                          r={hoveredPoint?.id === pt.item.id ? 4.5 : 2.5}
                          fill={hoveredPoint?.id === pt.item.id ? '#047857' : '#10b981'}
                          className="cursor-pointer transition-all"
                          onMouseEnter={() => setHoveredPoint(pt.item)}
                        />
                      ))}
                    </svg>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 mt-2">
                    <span>Lebih awal</span>
                    <span>Ambang Gelap: 2500</span>
                    <span>Sekarang ({telemetry.ldr} ADC)</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* KONEKSI PERANGKAT & BAR INDIKATOR LDR */}
        {activeTab === 'ringkasan' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4"
          >
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Koneksi perangkat</h2>
                <p className="text-xs text-slate-400">
                  Data langsung dari ESP32 Wokwi · diperbarui setiap 2 detik
                </p>
              </div>
              <motion.a
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                href="https://wokwi.com/projects/479507966495015937"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-xl transition-colors font-semibold"
              >
                Buka Wokwi <ExternalLink size={12} />
              </motion.a>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Terang · ADC rendah (0)</span>
                <span>Gelap · ADC tinggi (4095)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                <motion.div
                  animate={{ width: `${Math.min((telemetry.ldr / 4095) * 100, 100)}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                />
              </div>
              <p className="text-[11px] text-slate-400 text-center pt-1">
                Lampu ON ≥ 2500 ADC · Lampu OFF ≤ 1800 ADC · Di antaranya mempertahankan kondisi sebelumnya.
              </p>
            </div>
          </motion.div>
        )}

        {/* TABEL RIWAYAT AKTIVITAS DARI MYSQL */}
        {(activeTab === 'ringkasan' || activeTab === 'riwayat') && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.25 }}
            className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4"
          >
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Riwayat aktivitas</h2>
                <p className="text-xs text-slate-400">
                  Tersimpan di MySQL (smarthome_db) · maksimal 100 aktivitas terakhir
                </p>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={clearLogs}
                  disabled={logs.length === 0 || isSending}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors font-semibold"
                >
                  Hapus Riwayat <Trash2 size={12} />
                </motion.button>
                <motion.a
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  href={`${API_URL}/logs/export`}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors font-semibold"
                >
                  Ekspor CSV <Download size={12} />
                </motion.a>
              </div>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold tracking-wider">
                    <th className="py-3 px-2">WAKTU</th>
                    <th className="py-3 px-2">AKTIVITAS</th>
                    <th className="py-3 px-2">SUMBER</th>
                    <th className="py-3 px-2">RESPONS SERVER</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Belum ada riwayat kontrol atau peringatan gerakan.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-2 text-slate-500 font-mono">
                          {formatTime(log.created_at)}
                        </td>
                        <td className="py-3 px-2 font-medium text-slate-800">{log.action}</td>
                        <td className="py-3 px-2 text-slate-500">{log.source}</td>
                        <td className="py-3 px-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              log.response === 'Terkonfirmasi'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                                : log.response === 'Peringatan'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/50'
                                : 'bg-rose-50 text-rose-700 border border-rose-200/50'
                            }`}
                          >
                            {log.response}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </main>

      {/* TOMBOL SCROLL UP KE PALING ATAS */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            title="Kembali ke atas"
            className={`fixed right-6 z-40 p-3 rounded-full bg-[#0d282e] text-emerald-400 hover:bg-[#1e3e45] shadow-xl border border-emerald-500/30 transition-colors ${
              toast ? 'bottom-20' : 'bottom-6'
            }`}
          >
            <ArrowUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}