/**
 * Created by Riven on 2017/9/25 0025.
 */
const Firmata = require('./firmata.js');
const Emitter = require("events");

const ArgumentType = Scratch.ArgumentType;
const BlockType = Scratch.BlockType;
const formatMessage = Scratch.formatMessage;
const log = Scratch.log;

class TransportStub extends Emitter {
  constructor(path/*, options, openCallback*/) {
    super();
    this.isOpen = true;
    this.baudRate = 0;
    this.path = path;
  }

  write(buffer) {
    // console.log("transport write", buffer);
    // Tests are written to work with arrays not buffers
    // this shouldn't impact the data, just the container
    // This also should be changed in future test rewrites
    /* istanbul ignore else */
    if (Buffer.isBuffer(buffer)) {
      buffer = Array.from(buffer);
    }

    this.lastWrite = buffer;
    this.emit("write", buffer);
  }

  static list() {
    /* istanbul ignore next */
    return Promise.resolve([]);
  }
}

const wireCommon = gen => {
    gen.setupCodes_['wire'] = `Wire.begin()`;
    gen.includes_['wire'] = '#include <Wire.h>\n';
};

const pin2firmata = (pin, aidx) => {
    if (pin.startsWith('A')){
        // A0 starts with 14
        pin = parseInt(pin[1], 10)+14;
        if (aidx) pin-=14; // with buildin this.pins[this.analogPins[pin]]
    } else {
        pin = parseInt(pin, 10);
    }
    return pin;
}

class ArduinoExtension {
    constructor (runtime){
        this.runtime = runtime;
        this.comm = runtime.ioDevices.comm;
        this.session = null;
        this.runtime.registerPeripheralExtension('Arduino', this);
        // session callbacks
        this.onmessage = this.onmessage.bind(this);
        this.onclose = this.onclose.bind(this);

        this.decoder = new TextDecoder();
        this.lineBuffer = '';
        const firmata = new Firmata();
        this.trans = new TransportStub();
        this.board = new firmata.Board(this.trans);
        this.board.pin2firmata = pin2firmata;
        window.board = this.board;
        window.five = window.require('johnny-five');
        this.trans.on("write", data => {
            if (this.session) this.session.write(data);
        });
        this.board.on('ready', ()=>{
            // cross extension usage
            if (!window.j5board){
                window.j5board = new five.Board({
                    io: window.board,
                    debug: false,
                    repl: false
                });
            }
        });
    }

    onmessage (data){
        this.board.transport.emit('data', data);
    }

    onclose (){
        this.session = null;
    }

    // method required by vm runtime
    scan (){
        this.comm.getDeviceList().then(result => {
            this.runtime.emit(this.runtime.constructor.PERIPHERAL_LIST_UPDATE, result);
        });
    }

    connect (id){
        this.comm.connect(id).then(sess => {
            this.session = sess;
            this.session.onmessage = this.onmessage;
            this.session.onclose = this.onclose;
            // notify gui connected
            this.runtime.emit(this.runtime.constructor.PERIPHERAL_CONNECTED);
        }).catch(err => {
            log.warn('connect peripheral fail', err);
        });
    }

    disconnect (){
        this.session.close();
    }

    isConnected (){
        return Boolean(this.session);
    }

    getInfo (){
        return {
            id: 'Arduino',

            name: 'Arduino',

            color1: '#00979C',
            color2: '#008184',
            color3: '#008184',

            showStatusButton: true,

            blocks: [
                {
                    opcode: 'arduinostart',
                    blockType: BlockType.CONDITIONAL,

                    branchCount: 2,
                    isTerminal: true,
                    message2: 'loop',
                    text: ['Arduino Setup', 'loop'],
                    hatType: true,
                    func: 'noop'
                },
                {
                    opcode: 'serialreadline',
                    blockType: BlockType.CONDITIONAL,

                    branchCount: 1,
                    isTerminal: false,

                    text: formatMessage({
                        id: 'arduino.serialreadline',
                        default: '[SERIAL] Readline'
                    }),
                    arguments: {
                        SERIAL: {
                            type: ArgumentType.STRING,
                            menu: 'serialtype',
                            defaultValue: 'Serial'
                        }
                    },
                    func: 'noop'
                },
                {
                    opcode: 'serialavailable',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'arduino.serialavailable',
                        default: '[SERIAL] Available'
                    }),
                    arguments: {
                        SERIAL: {
                            type: ArgumentType.STRING,
                            menu: 'serialtype',
                            defaultValue: 'Serial'
                        }
                    },
                    func: 'noop',
                    gen: {
                        arduino: this.serAvailable
                    }
                },
                {
                    opcode: 'serialread',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'arduino.serialread',
                        default: '[SERIAL] Read'
                    }),
                    arguments: {
                        SERIAL: {
                            type: ArgumentType.STRING,
                            menu: 'serialtype',
                            defaultValue: 'Serial'
                        }
                    },
                    func: 'noop'
                },
                {
                    opcode: 'serialbegin',
                    blockType: BlockType.COMMAND,

                    text: formatMessage({
                        id: 'arduino.serialbegin',
                        default: 'Serial Begin [BAUD]'
                    }),
                    arguments: {
                        BAUD: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 115200
                        }
                    },
                    func: 'serialbegin',
                    sepafter: 36
                },
                {
                    opcode: 'println',
                    blockType: BlockType.COMMAND,

                    text: formatMessage({
                        id: 'arduino.println',
                        default: 'Serial Print [TEXT]'
                    }),
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Hello World'
                        }
                    },
                    func: 'noop'
                },
                {
                    opcode: 'printvalue',
                    blockType: BlockType.COMMAND,

                    text: formatMessage({
                        id: 'arduino.printvalue',
                        default: 'Serial Print [TEXT] = [VALUE]'
                    }),
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Apple'
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 123
                        }
                    },
                    func: 'noop'
                },
                {
                    opcode: 's4xparse',
                    blockType: BlockType.COMMAND,

                    text: formatMessage({
                        id: 'arduino.s4xparse',
                        default: 'S4X Parse [PARAM]'
                    }),
                    arguments: {
                        PARAM: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Apple'
                        }
                    },
                    func: 'noop',
                    sepafter: 36
                },
                {
                    opcode: 'softwareserial',
                    blockType: BlockType.COMMAND,

                    text: formatMessage({
                        id: 'arduino.softwareserial',
                        default: 'Software Serial TX[TX] RX[RX] [BAUD]'
                    }),
                    arguments: {
                        TX: {
                            type: ArgumentType.STRING,
                            defaultValue: '3',
                            menu: 'digiPin'
                        },
                        RX: {
                            type: ArgumentType.STRING,
                            defaultValue: '4',
                            menu: 'digiPin'
                        },
                        BAUD: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 9600
                        }
                    },
                    func: 'noop'
                },
                {
                    opcode: 'softwareserialprintln',
                    blockType: BlockType.COMMAND,

                    text: formatMessage({
                        id: 'arduino.softwareserialprintln',
                        default: 'Software Serial Println [TEXT]'
                    }),
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Hello World'
                        }
                    },
                    func: 'noop'
                },
                '---',
                {
                    opcode: 'pinmode',
                    blockType: BlockType.COMMAND,

                    text: formatMessage({
                        id: 'arduino.pinmode',
                        default: 'Pin Mode [PIN] [MODE]'
                    }),
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            defaultValue: '13',
                            menu: 'digiPin'
                        },
                        MODE: {
                            type: ArgumentType.STRING,
                            menu: 'pinMode',
                            defaultValue: 1
                        }
                    },
                    func: 'pinMode'
                },
                {
                    opcode: 'digitalwrite',
                    blockType: BlockType.COMMAND,

                    text: formatMessage({
                        id: 'arduino.digitalwrite',
                        default: 'Digital Write [PIN] [VALUE]'
                    }),
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            defaultValue: '13',
                            menu: 'digiPin'
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            menu: 'level',
                            defaultValue: 1
                        }
                    },
                    func: 'digitalWrite'
                },
                {
                    opcode: 'analogwrite',
                    blockType: BlockType.COMMAND,

                    text: formatMessage({
                        id: 'arduino.analogwrite',
                        default: 'Analog Write [PIN] [VALUE]'
                    }),
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            menu: 'analogWritePin',
                            defaultValue: '3'
                        },
                        VALUE: {
                            type: ArgumentType.SLIDERANALOGWR,
                            defaultValue: 120
                        }
                    },
                    func: 'analogWrite'
                },
                {
                    opcode: 'digitalread',
                    blockType: BlockType.BOOLEAN,

                    text: formatMessage({
                        id: 'arduino.digitalread',
                        default: 'Digital Read [PIN]'
                    }),
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            defaultValue: '3',
                            menu: 'digiPin'
                        }
                    },
                    func: 'digitalRead'
                },
                {
                    opcode: 'analogread',
                    blockType: BlockType.REPORTER,

                    text: formatMessage({
                        id: 'arduino.analogread',
                        default: 'Analog Read [PIN]'
                    }),
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            defaultValue: 'A0',
                            menu: 'analogPin'
                        }
                    },
                    func: 'analogRead',
                    sepafter: 36
                },
                {
                    opcode: 'led',
                    blockType: BlockType.COMMAND,

                    text: formatMessage({
                        id: 'arduino.led',
                        default: 'LED [PIN] [VALUE]'
                    }),
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            defaultValue: '13',
                            menu: 'digiPin'
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            menu: 'onoff',
                            defaultValue: '0'
                        }
                    },
                    func: 'led'
                },
                {
                    opcode: 'mapping',
                    blockType: BlockType.REPORTER,

                    text: formatMessage({
                        id: 'arduino.mapping',
                        default: 'Map [VAL] from [FROMLOW]~[FROMHIGH] to [TOLOW]~[TOHIGH]'
                    }),
                    arguments: {
                        VAL: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        },
                        FROMLOW: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        FROMHIGH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 255
                        },
                        TOLOW: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        TOHIGH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1024
                        }
                    },
                    func: 'mapping'
                },
                {
                    opcode: 'millis',
                    blockType: BlockType.REPORTER,

                    text: formatMessage({
                        id: 'arduino.millis',
                        default: 'millis'
                    }),
                    func: 'noop'
                },
                {
                    opcode: 'stringtypo',
                    blockType: BlockType.REPORTER,

                    text: formatMessage({
                        id: 'arduino.stringtypo',
                        default: 'String[TEXT],[TYPO]'
                    }),
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: '123'
                        },
                        TYPO: {
                            type: ArgumentType.STRING,
                            defaultValue: 'HEX',
                            menu: 'StrTypo'
                        }
                    },
                    func: 'noop',
                    gen: {
                        arduino: this.stringtypo
                    }
                },
                {
                    opcode: 'typecast',
                    blockType: BlockType.REPORTER,

                    text: formatMessage({
                        id: 'arduino.typecast',
                        default: 'Cast [VALUE] to [TYPO]'
                    }),
                    arguments: {
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: '123'
                        },
                        TYPO: {
                            type: ArgumentType.STRING,
                            defaultValue: 'char',
                            menu: 'Typo'
                        }
                    },
                    func: 'noop',
                    gen: {
                        arduino: this.typecast
                    }
                },
                '---',
                {
                    opcode: 'wireBegin',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'arduino.wiretrans',
                        default: 'Wire Begin Trans [ADDR]'
                    }),
                    arguments: {
                        ADDR: {
                            type: ArgumentType.STRING,
                            defaultValue: '0x12'
                        }
                    },
                    func: 'wireBegin',
                    gen: {
                        arduino: this.wireBeginGen
                    }
                },
                {
                    opcode: 'wireWrite',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'arduino.wirewrite',
                        default: 'Wire Write [DATA]'
                    }),
                    arguments: {
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: 'abc'
                        }
                    },
                    func: 'wireWrite',
                    gen: {
                        arduino: this.wireWriteGen
                    }
                },
                {
                    opcode: 'wireRead',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'arduino.wireread',
                        default: 'Wire Read [ADDR] Bytes [LEN]'
                    }),
                    arguments: {
                        ADDR: {
                            type: ArgumentType.STRING,
                            defaultValue: '0x12'
                        },
                        LEN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 6
                        }
                    },
                    func: 'wireRead',
                    gen: {
                        arduino: this.wireReadGen
                    }
                },
                {
                    opcode: 'wireEnd',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'arduino.wireEnd',
                        default: 'Wire End'
                    }),
                    func: 'wireEnd',
                    gen: {
                        arduino: this.wireEndGen
                    }
                },
                {
                    opcode: 'wireEndRet',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'arduino.wireEnd',
                        default: 'Wire End'
                    }),
                    func: 'noop',
                    gen: {
                        arduino: this.wireEndRetGen
                    }
                },
            ],
            menus: {
                pinMode: [
                    {text:'INPUT', value: '0'},
                    {text: 'OUTPUT', value: '1'},
                    {text: 'INPUT_PULLUP', value: '2'}
                ],
                level: [{text: 'HIGH', value: '1'}, {text: 'LOW', value: '0'}],
                onoff: [{text: 'ON', value: '0'}, {text: 'OFF', value: '1'}],
                digiPin: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13',
                    'A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
                analogPin: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
                analogWritePin: ['3', '5', '6', '9', '10', '11'],
                serialtype: [{text: 'Serial', value: 'Serial'}, {text: 'Soft Serial', value: 'softser'}],
                StrTypo: ['HEX', 'BIN', 'DEC'],
                Typo: ['byte', 'char', 'int', 'long', 'word', 'float']
            },
        };
    }

    noop (){
        return Promise.reject(formatMessage({
            id: 'kblock.notify.nosupportonlinemode',
            defaultMessage: 'Not support in online mode'
        }));
    }
    
    serialbegin (){
        // just a fake empty function
    }


    pinMode (args){
        const pin = args.PIN;
        const mode = args.MODE;
        const mode2firmata = {
            '0': board.MODES.INPUT,
            '1': board.MODES.OUTPUT,
            '2': board.MODES.PULLUP
        }
        board.pinMode(pin2firmata(pin), mode2firmata[mode]);
    }

    digitalWrite (args){
        const pin = args.PIN;
        const pinId = pin2firmata(pin);
        const value = parseInt(args.VALUE, 10);        
        board.digitalWrite(pinId, value ? 1 : 0);
    }

    led (args){
        const pin = args.PIN;
        const value = parseInt(args.VALUE, 10);
        board.digitalWrite(pin2firmata(pin), value ? 0 : 1); // inverse for kittenbot's led module
    }

    analogWrite (args){
        const pin = args.PIN;
        const v = parseInt(args.VALUE, 10);
        const pinId = pin2firmata(pin);
        const p = board.pins[pinId];
        if (p.mode !== 3){
            board.pinMode(pinId, 3);
        }
        board.analogWrite(pinId,v)
    }

    digitalRead (args) {
        const pin = args.PIN;
        // board.pinMode(pin2firmata(pin), board.MODES.INPUT);
        const pinId = pin2firmata(pin);
        const p = board.pins[pinId];
        if (p.mode === undefined){
            vm.emit('showAlert', {msg: 'PinMode Undefined'});
            return;
        }
        if (board.eventNames().indexOf(`digital-read-${pinId}`) === -1){
            board.digitalRead(pinId, ret => {
                // board.reportDigitalPin(pinId, 0);
            });
        }
        return p.value;
    }

    analogRead (args){
        const pin = args.PIN;
        const pinId = pin2firmata(pin,1);
        return new Promise(resolve => {
            board.analogRead(pinId, ret => {
                board.reportAnalogPin(pinId, 0);
                resolve(ret);
            })
        });
    }

    mapping (args){
        const x = args.VAL;
        const in_min = args.FROMLOW;
        const in_max = args.FROMHIGH;
        const out_min = args.TOLOW;
        const out_max = args.TOHIGH;
        return parseFloat(((x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min)).toFixed(2);
    }


    wiretrans (gen, block){
        let branch = gen.statementToCode(block, 'SUBSTACK');

        gen.includes_['wire'] = '#include <Wire.h>\n';
        let code = `
while (${sertype}.available()) {
    char c = ${sertype}.read();
    buf[bufindex++] = c;
    if (c == '\\n') {
      buf[bufindex] = '\\0';
      ${branch}
      memset(buf, 0, 64);
      bufindex = 0;
    }
    if (bufindex >= 64) {
      bufindex = 0;
    }
}\n`;
        return code;
    }

    wireBegin (args){
        this.i2cAddr = parseInt(args.ADDR, 16);
        board.i2cConfig();
    }

    wireBeginGen (gen, block){
        wireCommon(gen);
        const addr = gen.valueToCode(block, 'ADDR');
        return `Wire.beginTransmission(${addr})`;
    }

    wireWrite (args){
        const data = args.DATA;
        board.i2cWrite(this.i2cAddr, data, data.length);
    }

    wireWriteGen (gen, block){
        const data = gen.valueToCode(block, 'DATA');
        return `Wire.write(${data})`;
    }

    wireRead (args){
        const reg = parseInt(args.ADDR, 16);
        const len = parseInt(args.LEN);
        // board.i2cWrite(this.i2cAddr, data, data.length);
        return new Promise(resolve => {
            board.i2cReadOnce(this.i2cAddr, reg, len, ret => {
                resolve(ret);
            });
        });
    }

    wireReadGen (gen, block){
        gen.functions_['wireread'] = `\nString wireRead(int addr, int len){
    String ret = "";
    Wire.requestFrom(2, 6);

    while(Wire.available()){ 
        char c = Wire.read();
        ret += c;
    }
    return ret;
}\n`
        const addr = gen.valueToCode(block, 'ADDR');
        const len = gen.valueToCode(block, 'LEN');
        return [`wireRead(${addr},${len})`, 0];
    }

    wireEnd (){
        board.i2cStop(this.i2cAddr);
    }

    wireEndGen (gen, block){
        return 'Wire.endTransmission()';
    }

    wireEndRetGen (gen, block){
        return ['Wire.endTransmission()', 0];
    }

    stringtypo (gen, block){
        const text = gen.valueToCode(block, 'TEXT');
        const typo = gen.valueToCode(block, 'TYPO');
        const code = `String(${text}, ${typo})`
        return [code, 0];
    }

    typecast (gen, block){
        const value = gen.valueToCode(block, 'VALUE');
        const typo = gen.valueToCode(block, 'TYPO');
        const code = `${typo}(${value})`
        return [code, 0];
    }

    serAvailable (gen, block){
        const sertype = gen.valueToCode(block, 'SERIAL');
        const code = `${sertype}.available()`;
        return [code, 0];
    }

}

module.exports = ArduinoExtension;
