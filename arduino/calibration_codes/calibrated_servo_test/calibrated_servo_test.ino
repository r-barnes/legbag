/*
Calibrated Servo Tester
By: Richard Barnes (richard.barnes@berkeley.edu, http://rbarnes.org)

A servo works by moving to a position determined by a signal of varying pulse
width. The width of the pulse determines which position the servo moves to.
Position is a linear function of the pulse width.

This sketch assumes we have already determined which pulse widths correspond to
the minimum and maximum positions. We now want to find appropriate locations to
move the servo to.

To do so, configure the definitions below and load this onto your Arduino. You
can then enter positions and the servo will move to them and stay at those
locations.

*/
 
#include <Servo.h>

#define MIN_POS_PW  700
#define MAX_POS_PW 2300

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
    if(a==0) return; //parseInt returns a belated 0. This is the easiest way to disregard that.
    myservo.write(a);
  }
}
