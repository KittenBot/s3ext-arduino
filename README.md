# Arduino extension for kittenblock/scratch3

Here is the arduino extension in kittenblock, other external electron modules, and sensors distributed in the following repos:

https://github.com/KittenBot/s3ext-arduino-actuator

https://github.com/KittenBot/s3ext-arduino-display

https://github.com/KittenBot/s3ext-arduino-sensors

The communication between kittenblock and arduino board is based on [Firmata](https://github.com/firmata/firmata.js)，most external modules and sensors are powered by [johnny-five](https://github.com/rwaldron/johnny-five)，Kittenblock v1.84 already shipped with `johnny-five` lib.

Pull-request is big welcome, you may add/modify blocks and generators. If you are not so familiar with nodejs things, please fire an issue, we will do the work, thank you~

## Firmware

The buildin firmata example `FirmataStandard.ino` should be good enough for most cases, but please change to baudrate to 115200, since all serial based communication in kittenblock fixed to 115200.

## Blocks to C++

Kittenblock's arduino compile tool has included most common libs, please see`installdir/arduino/libraries`. You may add your favored libs to this directory.