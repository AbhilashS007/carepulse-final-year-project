#include <WiFi.h>

const char* ssid = "AndroidAP_4408";
const char* password = "123456789";

void setup() {
  Serial.begin(115200);

  Serial.println();
  Serial.println("================================");
  Serial.println("CarePulse WiFi Test");
  Serial.println("================================");

  WiFi.begin(ssid, password);

  Serial.print("Connecting");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Connected Successfully!");

  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  Serial.print("Signal Strength (RSSI): ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
}

void loop() {

}