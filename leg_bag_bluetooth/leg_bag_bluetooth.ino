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

#include "CapacitiveSensor.h"

typedef unsigned long time_t;

//PINS
#define SERVO_CONTROL_PIN                 5  //Pin servo will be controlled by
#define FLEX_SENSOR_PIN                  A1  //Reads flex sensor
#define TOUCH_EMITTER_PIN                A2  //Sends signal to touch sensor
#define TOUCH_SENSOR_PIN                 A3  //Reads signal from touch sensor

//Debugging control
//ENSURE BOTH OF THESE ARE SET TO 0 (ZERO) FOR PRODUCTION
#define DEBUG_MODE                        0  //Show debugging info in Serial
#define FACTORYRESET_BLE                  1  //R

#define MINIMUM_FIRMWARE_VERSION    "0.6.6"  //Used only to determine what BLE LED can do.
#define MODE_LED_BEHAVIOUR            "SPI"  //BLE LED behavior. Values: DISABLE, MODE, BLEUART, HWUART, SPI, MANUAL

#define BLE_DEVICE_NAME  "LegBagController"  //Name other Bluetooth devices see when scanning

#define SERVO_MIN_POS_PW                700  //Pulse width corresponding to minimum position of servo
#define SERVO_MAX_POS_PW               2300  //Pulse width corresponding to maximum position of servo
#define SERVO_OPEN_BAG_DEGREES            5  //Position in degrees at which servo has opened bag
#define SERVO_CLOSE_BAG_DEGREES          57  //Position in degrees at which servo has closed bag

//Backup touch sensor to open bag
#define SECS_TO_OPEN_BAG_ON_TOUCH         5  //How many seconds the bag should be opened for when the touch sensor is activated

//Measure the voltage at 5V and the actual resistance of your
#define SECS_BETWEEN_FLEX_SAMPLES         1  //Seconds each sample-and-send of the flex sensor
const float FLEX_VCC = 4.98;    //Measured voltage of Arduino 5V line
const float FLEX_R   = 47500.0; //Measured resistance of voltage divider's second resistor
time_t next_flex_sample_ms = 0;

//We'll connect to the servo only when we're using it in order to reduce wear
//and save energy. The servo's neutral position (90 degrees) is closed for the
//tube.
Servo myservo;

//For touch button
CapacitiveSensor touch_sensor = CapacitiveSensor(TOUCH_EMITTER_PIN,TOUCH_SENSOR_PIN);

//Bluetooth device
Adafruit_BluefruitLE_SPI ble(BLUEFRUIT_SPI_CS, BLUEFRUIT_SPI_IRQ, BLUEFRUIT_SPI_RST);

//Time to close the bag again. This is set to a non-zero value if the touch
//sensor is activated and indicates the time, in milliseconds, when the bag
//should next be closed.
time_t close_bag_time_ms = 0;


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
  myservo.write(SERVO_OPEN_BAG_DEGREES);
}



//Performs whatever actions are necessary to close the bag
void CloseBag(){
  myservo.write(SERVO_CLOSE_BAG_DEGREES);   //Move the servo to its closed position
  delay(2000);         //Give it 2 seconds to get there, so we don't stop in an intermediate position
  myservo.detach();    //Disconnect from the servo
}



//Reads from the backup touch sensor
inline void HandleTouchSensor(time_t now_ms){
  long touch_value = touch_sensor.capacitiveSensor(30);

  if(touch_value>400 && close_bag_time_ms==0){
    close_bag_time_ms = now_ms+SECS_TO_OPEN_BAG_ON_TOUCH*1000;
    OpenBag();
  }

  if(close_bag_time_ms>0 && now_ms>close_bag_time_ms){
    close_bag_time_ms = 0;
    CloseBag();
  }
}



//Reads the flex sensor and tries to send information about it over Bluetooth
inline void ReadAndSendFlex(time_t now_ms){
  if(now_ms<next_flex_sample_ms)
    return;

  next_flex_sample_ms = now_ms+SECS_BETWEEN_FLEX_SAMPLES*1000;

  auto  flexADC = analogRead(FLEX_SENSOR_PIN);       //Level units from ADC
  float flexV   = flexADC * FLEX_VCC / 1023.0;       //Measured voltage from voltage divider
  float flexR   = FLEX_R * (FLEX_VCC / flexV - 1.0); //The resistance of the flex sensor

  char output[BUFSIZE+1] = "HELLO\n\0";

  // Send input data to host via Bluefruit
  ble.print(flexR);

  if(DEBUG_MODE){
    Serial.println(output);
    Serial.println(flexR);
  }
}



//Used by the main loop to read Bluetooth
inline void HandleBluetoothInput(){
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



//This is run when the Arduino boots up after a power cycle
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
  if(DEBUG_MODE)
    ble.info();
  ble.verbose(false);          //Disable debug info from Bluefruit

  while(!ble.isConnected())    //Wait for a BLE connection
    delay(500);

  //LED Activity command is only supported from 0.6.6 onwards
  if ( ble.isVersionAtLeast(MINIMUM_FIRMWARE_VERSION) )
    ble.sendCommandCheckOK("AT+HWModeLED=" MODE_LED_BEHAVIOUR);

  //Set module to DATA mode
  ble.setMode(BLUEFRUIT_MODE_DATA);

  //Pin used for flex sensor
  pinMode(FLEX_SENSOR_PIN, INPUT);

  if(DEBUG_MODE)
    Serial.print("Setup finished!");
}



//Main loop: this runs continuously during program operation
void loop(){
  time_t now_ms = millis();

  //HandleTouchSensor(now_ms);

  ReadAndSendFlex(now_ms);

  HandleBluetoothInput();
}

