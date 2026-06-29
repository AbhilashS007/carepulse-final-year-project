const int sensorPin = 34;

// Calibration values
const int dryValue = 4095;
const int wetValue = 1350;

void setup() {
  Serial.begin(115200);
}

void loop() {
  int rawValue = analogRead(sensorPin);

  int wetness = map(rawValue, dryValue, wetValue, 0, 100);
  wetness = constrain(wetness, 0, 100);

  Serial.print("Raw: ");
  Serial.print(rawValue);

  Serial.print(" | Wetness: ");
  Serial.print(wetness);
  Serial.println("%");

  delay(1000);
}