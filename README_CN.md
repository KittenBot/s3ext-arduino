# 基于Kittenblock/Scratch3的Arduino插件

这是Kittenblock内置的arduino插件，其他外围电子模块和传感器分布在以下3个仓库中：

https://github.com/KittenBot/s3ext-arduino-actuator

https://github.com/KittenBot/s3ext-arduino-display

https://github.com/KittenBot/s3ext-arduino-sensors

基本的Arduino积木块基于[Firmata](https://github.com/firmata/firmata.js)实现，外围电子模块大部分依赖于[johnny-five](https://github.com/rwaldron/johnny-five)，Kittenblock 1.84已经内置了`johnny-five`库。

并欢迎大家添加模块和代码，如果不熟悉代码也可以在我们qq群或者github issue提出，谢谢 ~

## 通讯固件

Arduino内置的FirmataStandard.ino即可，但是请将通讯波特率改为115200，Kittenblock默认串口波特率均为115200。

## 图形化转C++

Kittenblock内置的arduino编译环境已经集成了大部分常见的arduino库，参见`安装目录/arduino/libraries`。







