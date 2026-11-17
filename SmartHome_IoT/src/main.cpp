#include <WiFi.h>
#include <PubSubClient.h>
#include <Adafruit_NeoPixel.h>

// ================= KONEKSI =================
const char *WIFI_SSID = "Wokwi-GUEST";
const char *WIFI_PASSWORD = "";

// Broker publik untuk simulasi tugas.
const char *MQTT_HOST = "broker.hivemq.com";
const int MQTT_PORT = 1883;
const char *TOPIC_DATA = "unpam/k4/231011450396/smarthome/data";
const char *TOPIC_COMMAND = "unpam/k4/231011450396/smarthome/command";

// ================= PIN =================
const int PIN_LDR = 34;
const int PIN_PIR = 27;
const int PIN_BUTTON = 14;
const int PIN_PIXEL = 26;
const int PIN_BUZZER = 25;
const int PIN_RELAY = 33;

// Untuk relay dengan atribut transistor: pnp.
// Jika nyala lampu relay terbalik di Wokwi, tukar nilai HIGH dan LOW di bawah ini.
const int RELAY_ON = HIGH;
const int RELAY_OFF = LOW;

// ================= OBJEK =================
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
Adafruit_NeoPixel pixel(1, PIN_PIXEL, NEO_GRB + NEO_KHZ800);

// ================= STATUS =================
bool otomatis = true;
bool keamanan = true;
bool lampu = false;
bool gelap = false;
bool gerakan = false;
bool gerakanLama = false;
bool alarmAktif = false;

int nilaiLdr = 0;
uint32_t warna;

unsigned long alarmMulai = 0;
unsigned long terakhirData = 0;
unsigned long terakhirSensor = 0;
unsigned long terakhirMqtt = 0;
unsigned long terakhirWifi = 0;
unsigned long terakhirStatus = 0;

int tombolLama = HIGH;
int tombolStabil = HIGH;
unsigned long tombolBerubah = 0;

// ================= AKTUATOR =================
void aturLampu(bool aktif)
{
  lampu = aktif;
  digitalWrite(PIN_RELAY, aktif ? RELAY_ON : RELAY_OFF);
  pixel.setPixelColor(0, aktif ? warna : pixel.Color(0, 0, 0));
  pixel.show();
}

void stopAlarm()
{
  alarmAktif = false;
  noTone(PIN_BUZZER);
}

void mulaiAlarm()
{
  alarmAktif = true;
  alarmMulai = millis();
  tone(PIN_BUZZER, 2000);
  Serial.println("[ALARM] Gerakan terdeteksi!");
}

// ================= KIRIM DATA =================
void kirimData()
{
  if (!mqtt.connected())
  {
    return;
  }

  char payload[256];
  snprintf(
      payload, sizeof(payload),
      "{\"ldr\":%d,\"dark\":%s,\"motion\":%s,"
      "\"auto\":%s,\"lamp\":%s,\"relay\":%s,"
      "\"security\":%s,\"alarm\":%s,"
      "\"uptime\":%lu}",
      nilaiLdr,
      gelap ? "true" : "false",
      gerakan ? "true" : "false",
      otomatis ? "true" : "false",
      lampu ? "true" : "false",
      lampu ? "true" : "false",
      keamanan ? "true" : "false",
      alarmAktif ? "true" : "false",
      millis() / 1000UL);

  bool berhasil = mqtt.publish(TOPIC_DATA, payload, false);
  if (berhasil)
  {
    Serial.print("[DATA] ");
    Serial.println(payload);
  }
  else
  {
    Serial.println("[DATA] Pengiriman gagal.");
  }
}

// ================= PERINTAH =================
void prosesPerintah(String perintah)
{
  perintah.trim();
  bool dikenal = true;

  if (perintah == "auto")
  {
    otomatis = true;
    aturLampu(gelap);
  }
  else if (perintah == "manual")
  {
    otomatis = false;
  }
  else if (perintah == "lamp_on")
  {
    if (!otomatis)
    {
      aturLampu(true);
    }
    else
    {
      Serial.println("[INFO] Pilih mode manual dahulu.");
    }
  }
  else if (perintah == "lamp_off")
  {
    if (!otomatis)
    {
      aturLampu(false);
    }
    else
    {
      Serial.println("[INFO] Pilih mode manual dahulu.");
    }
  }
  else if (perintah == "security_on")
  {
    keamanan = true;
    if (gerakan && !alarmAktif)
    {
      mulaiAlarm();
    }
  }
  else if (perintah == "security_off")
  {
    keamanan = false;
    stopAlarm();
  }
  else if (perintah == "alarm_on")
  {
    mulaiAlarm();
  }
  else if (perintah == "alarm_off")
  {
    stopAlarm();
  }
  else if (perintah == "red" || perintah == "green" || perintah == "blue" || perintah == "white")
  {
    if (!otomatis)
    {
      if (perintah == "red")
      {
        warna = pixel.Color(255, 0, 0);
      }
      else if (perintah == "green")
      {
        warna = pixel.Color(0, 255, 0);
      }
      else if (perintah == "blue")
      {
        warna = pixel.Color(0, 0, 255);
      }
      else
      {
        warna = pixel.Color(255, 255, 255);
      }
      aturLampu(lampu);
    }
    else
    {
      Serial.println("[INFO] Pilih mode manual dahulu.");
    }
  }
  // --- TAMBAHAN PERBAIKAN: Format Hexadecimal dari Web Dashboard (#RRGGBB) ---
  else if (perintah.startsWith("#") && perintah.length() == 7)
  {
    if (!otomatis)
    {
      long number = strtol(perintah.substring(1).c_str(), NULL, 16);
      byte r = (number >> 16) & 0xFF;
      byte g = (number >> 8) & 0xFF;
      byte b = number & 0xFF;
      warna = pixel.Color(r, g, b);
      aturLampu(lampu);
    }
    else
    {
      Serial.println("[INFO] Pilih mode manual dahulu.");
    }
  }
  else
  {
    dikenal = false;
  }

  if (dikenal)
  {
    Serial.print("[PERINTAH] ");
    Serial.println(perintah);
    kirimData();
  }
}

// ================= TERIMA MQTT =================
void mqttCallback(char *topic, byte *payload, unsigned int length)
{
  if (String(topic) != TOPIC_COMMAND)
  {
    return;
  }

  if (length > 64)
  {
    return;
  }

  String perintah;
  perintah.reserve(length);
  for (unsigned int i = 0; i < length; i++)
  {
    perintah += (char)payload[i];
  }

  prosesPerintah(perintah);
}

// ================= KONEKSI =================
void jagaKoneksi()
{
  unsigned long sekarang = millis();

  if (WiFi.status() != WL_CONNECTED)
  {
    if (sekarang - terakhirWifi >= 10000)
    {
      terakhirWifi = sekarang;
      Serial.println("[WiFi] Mencoba tersambung kembali...");
      WiFi.reconnect();
    }
    return;
  }

  if (!mqtt.connected())
  {
    if (sekarang - terakhirMqtt >= 5000)
    {
      terakhirMqtt = sekarang;
      String clientId = "k4-esp32-";
      clientId += WiFi.macAddress();
      clientId.replace(":", "");

      Serial.println("[MQTT] Menghubungkan...");
      if (mqtt.connect(clientId.c_str()))
      {
        if (mqtt.subscribe(TOPIC_COMMAND))
        {
          Serial.println("[MQTT] TERHUBUNG");
          kirimData();
        }
        else
        {
          Serial.println("[MQTT] Subscribe gagal.");
          mqtt.disconnect();
        }
      }
      else
      {
        Serial.print("[MQTT] Gagal, kode: ");
        Serial.println(mqtt.state());
      }
    }
  }
  else
  {
    mqtt.loop();
  }
}

// ================= SENSOR =================
void bacaSensor()
{
  nilaiLdr = analogRead(PIN_LDR);
  gerakan = digitalRead(PIN_PIR) == HIGH;

  // Histeresis: batas ON dan OFF berbeda.
  if (nilaiLdr >= 2500)
  {
    gelap = true;
  }
  else if (nilaiLdr <= 1800)
  {
    gelap = false;
  }

  if (otomatis && lampu != gelap)
  {
    aturLampu(gelap);
  }

  // Memicu alarm saat awal kejadian gerakan.
  if (keamanan && gerakan && !gerakanLama)
  {
    mulaiAlarm();
  }

  gerakanLama = gerakan;
}

// ================= TOMBOL =================
void bacaTombol()
{
  int bacaan = digitalRead(PIN_BUTTON);
  unsigned long sekarang = millis();

  if (bacaan != tombolLama)
  {
    tombolLama = bacaan;
    tombolBerubah = sekarang;
  }

  if (sekarang - tombolBerubah >= 40 && bacaan != tombolStabil)
  {
    tombolStabil = bacaan;
    if (tombolStabil == LOW)
    {
      if (!otomatis)
      {
        aturLampu(!lampu);
        Serial.println(lampu ? "[TOMBOL] Lampu ON" : "[TOMBOL] Lampu OFF");
        kirimData();
      }
      else
      {
        Serial.println("[TOMBOL] Masuk mode manual dahulu.");
      }
    }
  }
}

// ================= SERIAL =================
void bacaSerial()
{
  while (Serial.available())
  {
    char c = Serial.read();
    switch (c)
    {
    case 'a':
      prosesPerintah("auto");
      break;
    case 'm':
      prosesPerintah("manual");
      break;
    case '1':
      prosesPerintah("lamp_on");
      break;
    case '0':
      prosesPerintah("lamp_off");
      break;
    case 's':
      prosesPerintah(keamanan ? "security_off" : "security_on");
      break;
    case 'x':
      prosesPerintah("alarm_off");
      break;
    case 'r':
      prosesPerintah("red");
      break;
    case 'g':
      prosesPerintah("green");
      break;
    case 'b':
      prosesPerintah("blue");
      break;
    case 'w':
      prosesPerintah("white");
      break;
    }
  }
}

void tampilkanStatus()
{
  Serial.printf(
      "LDR=%d | Cahaya=%s | PIR=%s | Mode=%s"
      " | Lampu=%s | Keamanan=%s | Alarm=%s"
      " | WiFi=%s | MQTT=%s\n",
      nilaiLdr,
      gelap ? "GELAP" : "TERANG",
      gerakan ? "GERAK" : "AMAN",
      otomatis ? "AUTO" : "MANUAL",
      lampu ? "ON" : "OFF",
      keamanan ? "AKTIF" : "NONAKTIF",
      alarmAktif ? "ON" : "OFF",
      WiFi.status() == WL_CONNECTED ? "OK" : "PUTUS",
      mqtt.connected() ? "OK" : "PUTUS");
}

// ================= SETUP =================
void setup()
{
  Serial.begin(115200);

  pinMode(PIN_LDR, INPUT);
  pinMode(PIN_PIR, INPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);

  digitalWrite(PIN_RELAY, RELAY_OFF);
  pinMode(PIN_RELAY, OUTPUT);

  analogReadResolution(12);

  pixel.begin();
  pixel.setBrightness(180);
  warna = pixel.Color(255, 255, 255);

  aturLampu(false);
  stopAlarm();

  bacaSensor();

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setBufferSize(512);
  mqtt.setKeepAlive(15);
  mqtt.setSocketTimeout(1);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);

  Serial.println("====== SMART HOME KELOMPOK 4 ======");
  Serial.println("[WiFi] Menghubungkan ke Wokwi-GUEST");
  Serial.println("a = otomatis | m = manual");
  Serial.println("1 = lampu ON | 0 = lampu OFF");
  Serial.println("s = keamanan | x = hentikan alarm");
  Serial.println("r/g/b/w = warna lampu");
  Serial.println("==================================");
}

// ================= LOOP =================
void loop()
{
  unsigned long sekarang = millis();

  if (sekarang - terakhirSensor >= 100)
  {
    terakhirSensor = sekarang;
    bacaSensor();
  }

  bacaTombol();
  bacaSerial();

  if (alarmAktif && sekarang - alarmMulai >= 5000)
  {
    stopAlarm();
  }

  jagaKoneksi();

  if (sekarang - terakhirData >= 2000)
  {
    terakhirData = sekarang;
    kirimData();
  }

  if (sekarang - terakhirStatus >= 2000)
  {
    terakhirStatus = sekarang;
    tampilkanStatus();
  }
}