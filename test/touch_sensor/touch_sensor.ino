/*
Capacitive Touch Sensor Tester
By: Richard Barnes (richard.barnes@berkeley.edu, http://rbarnes.org)

Long Explanation
================

Capactive touch sensing works by timing how long it takes to charge a capacitor
connected to an RC circuit. Higher capacitance values make the circuit take
longer to charge. We take advantage of this to develop a low-pressure button.

Assuming you are working with the Adafruit Feather 32u4 Bluefruit LE board, you
have pins A0, A1, A2, A3, A4, and A5 which can be used for digital or analog
input or output.

We will connect these two pins with 1-10MOhm resistor. A low-valued resistor
makes the sensor less sensitive. A high-valued resistor makes it so the sensor
will trigger with proximity, not even necessarily with touch.

We will then connect a piece of metal to the Sensor Pin. This piece of metal
adds some capacitance of its own, but, if touched by a person, the capacitance
will increase considerably. Putting a piece of tape over the piece of metal
makes it into a crude pressure sensor.

The code works by setting the Emitter Pin high. The Sensor Pin is briefly set to
output and brought high. This discharges it. The pin is then set low and the
time taken for it to reach a significant fraction of the voltage of the Emitter
Pin is measured.

It was suggested that a small capacitor (100 pF) from the Sensor Pin to ground
might improve stability and repeatability, but I did not find this to be so.

The receive pin may be connected with a wire, but a 1K or higher resistor will
help protect the Teensy's pin if a user directly touches the object and delivers
an electro-static shock. The safest construction uses an insulating layer, such
as the clear tape in the example above.

Short Explanation
=================

 * Place a 1MOhm resistor between A2 and A3
 * Connect a piece of metal, the touch sensor pad, to A3 through 1+KOhm resistor
 * Possibly cover the metal with tape, to make it safer from electro-static shock
 * Run the code and observe the outputs

*/

#include "CapacitiveSensor.h"

CapacitiveSensor cs_4_2 = CapacitiveSensor(A2,A3);        // 10M resistor between pins 4 & 2, pin 2 is sensor pin, add a wire and or foil if desired

void setup() {
  //cs_4_2.set_CS_AutocaL_Millis(0xFFFFFFFF);     //Uncomment this line to urn off autocalibration
  Serial.begin(9600);
}

void loop() {
  long start  = millis();
  long total1 = cs_4_2.capacitiveSensor(30);

  Serial.print(millis() - start);  //Check on performance in milliseconds. Low values are better
  Serial.print("\t");
  Serial.println(total1);          //Print output

  delay(10);                       //Arbitrary delay to limit output rate
}

