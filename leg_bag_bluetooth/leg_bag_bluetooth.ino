#include <Arduino.h>
#include <SPI.h>

#include "Adafruit_BLE.h"
#include "Adafruit_BluefruitLE_SPI.h"
#include "Adafruit_BluefruitLE_UART.h"

#include "BluefruitConfig.h"


// MODE_LED_BEHAVIOUR        LED activity, valid options are
//                           "DISABLE" or "MODE" or "BLEUART" or
//                           "HWUART"  or "SPI"  or "MANUAL"

#define DEBUG_MODE                  0
#define FACTORYRESET_ENABLE         1
#define MINIMUM_FIRMWARE_VERSION    "0.6.6"
#define MODE_LED_BEHAVIOUR          "SPI"

#define BAG_CONTROL_PIN             A0

Adafruit_BluefruitLE_SPI ble(BLUEFRUIT_SPI_CS, BLUEFRUIT_SPI_IRQ, BLUEFRUIT_SPI_RST);

// A small helper
void error(const __FlashStringHelper*err) {
  if(DEBUG_MODE){ //TODO: What to do if there's an error when not in debug mode?
    Serial.println(err);
    while (1);
  }
}

/**************************************************************************/
/*!
    @brief  Sets up the HW an the BLE module (this function is called
            automatically on startup)
*/
/**************************************************************************/
void setup(void){
  if(DEBUG_MODE){
    while (!Serial);  // required for Flora & Micro //TODO: Need to remove this in order to get it to start with app
    Serial.begin(115200);
  }

  //Wait for the board to settle? TODO
  delay(500);

  //Set up pin for opening and closing (controlling) the bag
  pinMode(BAG_CONTROL_PIN, OUTPUT);
  digitalWrite(BAG_CONTROL_PIN, LOW);
  
  if(!ble.begin(VERBOSE_MODE)) //Initialize the BlueFruit
    error(F("Error initailizing Bluetooth!"));

  //Perform a factory reset to make sure everything is in a known state
  if (FACTORYRESET_ENABLE){
    if(!ble.factoryReset())
      error(F("Couldn't factory reset"));
  }

  ble.println("AT+GAPDEVNAME=LegBagController");

  if (!ble.waitForOK())
    error(F("Failed to set Bluetooth name."));

  ble.echo(false); //Disable command echo from Bluefruit
  //ble.info();
  ble.verbose(false);  // debug info is a little annoying after this point!

  //Wait for a BLE connection
  while(!ble.isConnected())
    delay(500);

  // LED Activity command is only supported from 0.6.6
  if ( ble.isVersionAtLeast(MINIMUM_FIRMWARE_VERSION) )
    ble.sendCommandCheckOK("AT+HWModeLED=" MODE_LED_BEHAVIOUR);

  // Set module to DATA mode
  ble.setMode(BLUEFRUIT_MODE_DATA);
}

/**************************************************************************/
/*!
    @brief  Constantly poll for new command or response data
*/
/**************************************************************************/
void loop(void){
/*
  char n, inputs[BUFSIZE+1];
  if (Serial.available())
  {
    n = Serial.readBytes(inputs, BUFSIZE);
    inputs[n] = 0;
    // Send characters to Bluefruit
    Serial.print("Sending: ");
    Serial.println(inputs);

    // Send input data to host via Bluefruit
    ble.print(inputs);
  }*/

  while ( ble.available() ){
    int c = ble.read();

    if(c=='T'){
      tone(6, 15, 2000);
    } else if(c=='O'){ //Open
      digitalWrite(BAG_CONTROL_PIN, HIGH);
    } else if(c=='C'){ //Close
      digitalWrite(BAG_CONTROL_PIN, LOW);
    }

    if(DEBUG_MODE)
      Serial.print((char)c);
  }
}
