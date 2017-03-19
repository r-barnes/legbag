/*
Servo Tester
By: Richard Barnes (richard.barnes@berkeley.edu, http://rbarnes.org)

A servo works by moving to a position determined by a signal of varying pulse
width. The width of the pulse determines which position the servo moves to.
Position is a linear function of the pulse width.

Therefore, with an unknown servo, our goal is to determine the pulse widths
corresponding to the servos minimum and maximum positions.

To do this, hook up the servo as follows:

  Power:  Connect the red wire from servo to +5V (USB or external power supply).

  Ground: Connect black/brown wire from servo to Gnd on Arduino. Ensure the 
          foregoing power supply shares this ground.

  Signal: Connect white/orange/yellow from servo to a PWM pin on Arduino.
          I like Pin 5.

Then load this onto your Arduino. You can then enter pulse widths into the
serial monitor and observe where the servo goes. Experimentally determine the
minimum and maximum positions by looking for the lowest value that brings the
servo to its maximum range and the highest value that brings it to its minimum
range. You may need to increase or decrease MIN_POS_PW and MAX_POS_PW to reach
the full range of the servo.

For instance, with the Standard HiTEC HS-311 servo I'm currently testing, I find
the following values:

    Pulse Width | Position    | Note
            600 | 0 degrees   | Minimum position
           2400 | 180 degrees | Maximum position

Note that the 1500 pulse width would correspond to 90 degrees: the middle of the
range.

Once I know these values, I can declare a Servo object as in the code here and
place it to an exact position using:

    myservo.write(<DEGREES>);

*/
 
#include <Servo.h>

#define MIN_POS_PW  600
#define MAX_POS_PW 2400

Servo myservo;

void setup() {
  //Attach to a PWM pin, in this case 5. Set minimum position to 600 and maximum
  //to 2400. The servo will start at 1500, which is the center position for most
  //servos.
  myservo.attach(5,MIN_POS_PW,MAX_POS_PW); 
}

void loop() {
  if ( Serial.available()) {
    long a = Serial.parseInt();
    myservo.writeMicroseconds(a);
  }
}