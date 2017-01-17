/*
 * This programme reads the temperature (Celsius), relative humidity, and light (0-1000) and sends it to Sigfox every 10 minutes
 */
 
#include <Wire.h>
#include <arduinoUART.h>
#include <arduinoUtils.h>
#include <arduinoSigfox.h>

#include <DHT.h>
#define DHTTYPE DHT22
#define LEDONBOARD 13
#define DHTPIN  2
#define LEDREAD 3
#define LEDACK 4
#define LEDERROR 5
DHT dht(DHTPIN, DHTTYPE, 11); // 11 works fine for ESP8266

float humidity, temperature;
int light;
int secondsdelay = 600;

// define union-type variables for the temperature and humidity that we can use when sending data to Sigfox
union
{
  uint8_t  values[4];
  float    temperature;
} temperature_union;

union
{
  uint8_t  values[4];
  float    humidity;
} humidity_union;

//////////////////////////////////////////////
uint8_t socket = SOCKET0;     //Asign to UART0
//////////////////////////////////////////////

uint8_t error;

void getReadings() {
    humidity = dht.readHumidity();
    temperature = dht.readTemperature();
    if (isnan(humidity) || isnan(temperature)) {
      humidity = 0;
      temperature = 0;
    }

    temperature_union.temperature = temperature;
    humidity_union.humidity = humidity;
    light = analogRead(0);
}


void setup()
{
  pinMode(LEDONBOARD, OUTPUT);
  digitalWrite(LEDONBOARD, LOW);
  pinMode(LEDREAD, OUTPUT);
  pinMode(LEDACK, OUTPUT);
  pinMode(LEDERROR, OUTPUT);
  blinkn (3,LEDREAD);
  blinkn (3,LEDACK);
  blinkn (3,LEDERROR);
  // Set up sensors
  dht.begin();
  delay (200);
  getReadings();
}

void blinkn (int i, int pin ) {
  int j;
  for (j=0; j < i; j++) {
    digitalWrite(pin, HIGH);
    delay (100);
    digitalWrite(pin, LOW);
    delay (100); 
  }
}

void loop()
{  
  error = Sigfox.ON(socket);
  if( error != 0 ) {
    blinkn (3,LEDONBOARD);
  } else {
    blinkn (3,LEDREAD);
    getReadings();
    
    /*
     * Old message structure (using 2 byte integers instead of 4 byte float values
     * 
    int16_t temperatureb2 = (int16_t)(temperature * 100);
    int16_t humidityb2 = (int16_t)(humidity * 100);
    int16_t lightb2 = (int16_t)(light);
    byte data[6];
    data[0] = temperatureb2 >> 8;
    data[1] = temperatureb2 & 0xFF;
    data[2] = humidityb2 >> 8;
    data[3] = humidityb2 & 0xFF;
    data[4] = lightb2 >> 8;
    data[5] = lightb2 & 0xFF;*/

    int16_t lightb2 = (int16_t)(light);
    byte data[10];

    data[0] = temperature_union.values[3]; // big-endian
    data[1] = temperature_union.values[2];
    data[2] = temperature_union.values[1];
    data[3] = temperature_union.values[0];

    data[4] = humidity_union.values[3]; // big-endian
    data[5] = humidity_union.values[2];
    data[6] = humidity_union.values[1];
    data[7] = humidity_union.values[0];

    data[8] = lightb2 >> 8;
    data[9] = lightb2 & 0xFF;
    
    error = Sigfox.sendACK(data, sizeof(data));
    if( error == 0 ) {
      blinkn (3,LEDACK);
    } else {
      blinkn (3,LEDERROR);
    }
  }
  blinkn (6,LEDONBOARD);
  delay(600000);
}
