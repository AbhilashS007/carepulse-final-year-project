#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "AndroidAP_4408";
const char* password = "123456789";

const char* server = "http://10.107.165.59:8000/telemetry/test";

void setup() {

  Serial.begin(115200);

  WiFi.begin(ssid, password);

  Serial.print("Connecting");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected!");

}

void loop() {

  if (WiFi.status() == WL_CONNECTED) {

    HTTPClient http;

    http.begin(server);

    http.addHeader("Content-Type", "application/json");

    String json =
      "{\"device_id\":\"ESP32-001\",\"wetness\":72,\"battery\":95}";

    int code = http.POST(json);

    Serial.print("HTTP Response Code: ");
    Serial.println(code);

    Serial.println(http.getString());

    http.end();
  }

  delay(10000);
}