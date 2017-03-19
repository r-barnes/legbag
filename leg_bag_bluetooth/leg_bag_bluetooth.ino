//Leg Bag Control Program
//By: Richard Barnes (richard.barnes@berkeley.edu, http://rbarnes.org)
//Use with: Adafruit Feather 32u4 Bluefruit LE

/*
This program sets up the Feather's Bluetooth with a custom channel name. Once
connected, it accepts UART serial input via Bluetooth. The program accepts the
following commands:

    Command | Action
    ----------------------------------------------------------------------------
    O       | Opens the bag by turning the servo to its 0 degree position
    C       | Closes the bag by turning the servo to its 90 degree position

The program assumes the existence of several external devices:

    Sensor  | Description
    ----------------------------------------------------------------------------
    Servo   | Opens and closes the bag by toggling between two positions.
            |
    Flex    | A strip whose resistence increases when it is bent. Sampled by
            | connecting it as part of a voltage divider.
            |
    Touch   | A metal plate serving as a capacitor in an RC circuit. The charge
              time of the circuit is used to determine if the plate has been
              touched.

*/

#include <Arduino.h>
#include <SPI.h>
#include <Servo.h>

#include "Adafruit_BLE.h"
#include "Adafruit_BluefruitLE_SPI.h"
#include "Adafruit_BluefruitLE_UART.h"
#include "BluefruitConfig.h"



//Debugging control
//ENSURE BOTH OF THESE ARE SET TO 0 (ZERO) FOR PRODUCTION
#define DEBUG_MODE                        0  //Show debugging info in Serial
#define FACTORYRESET_BLE                  1  //R

#define MINIMUM_FIRMWARE_VERSION    "0.6.6"  //Used only to determine what BLE LED can do.
#define MODE_LED_BEHAVIOUR            "SPI"  //BLE LED behavior. Values: DISABLE, MODE, BLEUART, HWUART, SPI, MANUAL

#define BLE_DEVICE_NAME  "LegBagController"  //Name other Bluetooth devices see when scanning

#define SERVO_CONTROL_PIN                 5  //Pin servo will be controlled by
#define SERVO_MIN_POS_PW                700  //Pulse width corresponding to minimum position of servo
#define SERVO_MAX_POS_PW               2300  //Pulse width corresponding to maximum position of servo



//We'll connect to the servo only when we're using it in order to reduce wear
//and save energy. The servo's neutral position (90 degrees) is closed for the
//tube.
Servo myservo;

//Bluetooth device
Adafruit_BluefruitLE_SPI ble(BLUEFRUIT_SPI_CS, BLUEFRUIT_SPI_IRQ, BLUEFRUIT_SPI_RST);



//Function for handling errors
void error(const __FlashStringHelper*err) {
  if(DEBUG_MODE){ //TODO: What to do if there's an error when not in debug mode?
    Serial.println(err);
    while (1);
  }
}



//Performs whatever actions are necessary to open the bag
void OpenBag(){
  //Connect to the servo and move it to the open position
  myservo.attach(SERVO_CONTROL_PIN,SERVO_MIN_POS_PW,SERVO_MAX_POS_PW); 
  myservo.write(0);
}



//Performs whatever actions are necessary to close the bag
void CloseBag(){
  myservo.write(90);   //Move the servo to its closed position
  delay(2000);         //Give it 2 seconds to get there, so we don't stop in an intermediate position
  myservo.detach();    //Disconnect from the servo
}



void setup(){
  if(DEBUG_MODE){
    while (!Serial);           //Required for Flora & Micro
    Serial.begin(115200);
  }

  delay(500);                  //Wait for the board to settle? TODO

  if(!ble.begin(VERBOSE_MODE)) //Initialize the BlueFruit
    error(F("Error initailizing Bluetooth!"));

  if (FACTORYRESET_BLE){       //Ensure everything is in a known state
    if(!ble.factoryReset())    
      error(F("Couldn't factory reset"));
  }

  //Set Bluefruit name, as seen by other Bluetooth devices
  ble.println("AT+GAPDEVNAME=" BLE_DEVICE_NAME);

  if (!ble.waitForOK())
    error(F("Failed to set Bluetooth name."));

  ble.echo(false);             //Disable command echo from Bluefruit
  ble.verbose(false);          //Disable debug info from Bluefruit

  while(!ble.isConnected())    //Wait for a BLE connection
    delay(500);

  //LED Activity command is only supported from 0.6.6 onwards
  if ( ble.isVersionAtLeast(MINIMUM_FIRMWARE_VERSION) )
    ble.sendCommandCheckOK("AT+HWModeLED=" MODE_LED_BEHAVIOUR);

  //Set module to DATA mode
  ble.setMode(BLUEFRUIT_MODE_DATA);
}



void loop(){
  while ( ble.available() ){
    int c = ble.read();

    if(c=='O')        //Open
      OpenBag();
    else if(c=='C')  //Close
      CloseBag();
    

    if(DEBUG_MODE)
      Serial.print((char)c);
  }
}

