var gpio = require('../../lib/gpio');
var assert = require('assert');
//var sinon = require('sinon');

var gpioProbe = {
  emulatedPins : new Array(50),
  schema : null,
  digitalRead: function (pin) {
    return this.emulatedPins[pin];
  },
  digitalWrite: function (pin, state){ 
    this.emulatedPins[pin] = state;
    return this.emulatedPins[pin];
  },
  setup: function (schema) {
    this.schema = schema;
  },
  initPinsWith: function (value) {
    for (var i = 0; i < this.emulatedPins.length; i++ ){
      this.emulatedPins[i] = value;
    };
  },
};

var config = [ 
  {'name': 'a', 'pin': 47, 'state': 0},
  {'name': 'b', 'pin': 11, 'state': 0} ];

var realWpi = null;


describe('gpio', function() {
  before( function() {
    gpioProbe.initPinsWith(0);
    realWpi = gpio.overrideWiringPi(gpioProbe);
    gpio.init(config);
  });

  after( function() {
    gpio.overrideWiringPi(realWpi);
  });

  describe('updatePinStates', function() {
    it('should update all pin states', function() {
      gpioProbe.initPinsWith(1);
      gpio.updatePinStates();
      assert.deepEqual(
        config,
        [ {'name': 'a', 'pin': 47, 'state': 1},
          {'name': 'b', 'pin': 11, 'state': 1} ],
        'states are not updated properly');
    });
  });

  describe('togglePin', function () {
    it('should change active pin to inactive', function() {
      gpioProbe.initPinsWith(1);
      var res = gpio.togglePin(47);
      assert.deepEqual(
        res,
        {'pin': 47, 'state': 0},
        'pin has not changed its state');
    });

    it('should change inactive pin to active', function() {
      gpioProbe.initPinsWith(0);
      var res = gpio.togglePin(47);
      assert.deepEqual(
        res,
        {'pin': 47, 'state': 1},
        'pin has not changed its state');
    });
  });

  describe('setPin', function () {
    it('should set a pin by name to the given value', function() {
      gpioProbe.initPinsWith(0);
      gpio.setPin('a', 1);
      assert.equal(gpioProbe.emulatedPins[47], 1);
      gpio.setPin('a', 1);
      assert.equal(gpioProbe.emulatedPins[47], 1);
      gpio.setPin('a', 0);
      assert.equal(gpioProbe.emulatedPins[47], 0);
    });
  });

  describe('init', function () {
    it('should initialize the wiring_pi library to use gpio address schema', function() {
      assert.equal(gpioProbe.schema, 'gpio');
    });
  });
});

// vim: expandtab:tabstop=8:softtabstop=2:shiftwidth=2
