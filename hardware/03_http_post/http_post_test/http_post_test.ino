#include <WiFi.h>
#include <HTTPClient.h>

//=========================
// WiFi Configuration
//=========================
const char* ssid = "AndroidAP_4408";
const char* password = "123456789";

// Backend URL
const char* server = "http://10.107.165.59:8000/telemetry";

//=========================
// Hardware Configuration
//=========================
const int sensorPin = 34;

// Sensor Calibration
const int DRY_VALUE = 4095;
const int WET_VALUE = 1350;

// Temporary battery percentage
const int batteryPercent = 95;

//=========================

void connectWiFi() {

  Serial.print("Connecting to WiFi");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {

    delay(500);
    Serial.print(".");

  }

  Serial.println();
  Serial.println("Connected Successfully!");

  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

}

//=========================

void setup() {

  Serial.begin(115200);

  pinMode(sensorPin, INPUT);

  connectWiFi();

}

//=========================

void loop() {

  // Reconnect if WiFi drops
  if (WiFi.status() != WL_CONNECTED) {

    Serial.println("WiFi Lost!");
    connectWiFi();

  }

  //=========================
  // Read Sensor
  //=========================

  int moistureRaw = analogRead(sensorPin);

  int wetnessPercent = map(
      moistureRaw,
      DRY_VALUE,
      WET_VALUE,
      0,
      100
  );

  wetnessPercent = constrain(wetnessPercent, 0, 100);

  int wifiRssi = WiFi.RSSI();

  //=========================
  // Debug Output
  //=========================

  Serial.println("--------------------------------");

  Serial.print("Raw ADC        : ");
  Serial.println(moistureRaw);

  Serial.print("Wetness        : ");
  Serial.print(wetnessPercent);
  Serial.println("%");

  Serial.print("Battery        : ");
  Serial.print(batteryPercent);
  Serial.println("%");

  Serial.print("WiFi RSSI      : ");
  Serial.print(wifiRssi);
  Serial.println(" dBm");

  //=========================
  // Create JSON
  //=========================

  String json = "{";

  json += "\"device_id\":\"CP-DEV-010\",";
  json += "\"moisture_raw\":" + String(moistureRaw) + ",";
  json += "\"wetness_percent\":" + String(wetnessPercent) + ",";
  json += "\"battery_percent\":" + String(batteryPercent) + ",";
  json += "\"wifi_rssi\":" + String(wifiRssi) + ",";
  json += "\"firmware_version\":\"1.0.0\"";

  json += "}";

  Serial.println("Sending JSON:");
  Serial.println(json);

  //=========================
  // HTTP POST
  //=========================

  HTTPClient http;

  http.begin(server);

  http.addHeader("Content-Type", "application/json");

  int responseCode = http.POST(json);

  Serial.print("HTTP Response Code: ");
  Serial.println(responseCode);

  if (responseCode > 0) {

    Serial.println("Server Response:");
    Serial.println(http.getString());

  } else {

    Serial.print("HTTP Error: ");
    Serial.println(http.errorToString(responseCode));

  }

  http.end();

  Serial.println();

  delay(10000);

}