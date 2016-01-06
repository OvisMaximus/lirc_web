var gpio = require('../../lib/gpio');
var assert = require('assert');
//var sinon = require('sinon');

var wpi = {
  data : new Array(50),
  schema : null,
  digitalRead: function (pin) {
    return this.data[pin];
  },
  digitalWrite: function (pin, state){ 
    this.data[pin] = state;
    return this.data[pin];
  },
  setup: function (schema) {
    this.schema = schema;
  },
};

var config = [ 
  {'name': 'a', 'pin': 47, 'state': 0},
  {'name': 'b', 'pin': 11, 'state': 0} ];

var realWpi = null;

function initWpiPinsWith(value) {
  for (var i = 0; i < wpi.data.length; i++ ){
    wpi.data[i] = value;
  };
}

describe('gpio', function() {
  before( function() {
    initWpiPinsWith(0);
    realWpi = gpio.overrideWirePi(wpi);
    gpio.init(config);
  });

  after( function() {
    gpio.overrideWirePi(realWpi);
  });

  describe('updatePinStates', function() {
    it('should update all pin states', function() {
      initWpiPinsWith(1);
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
      initWpiPinsWith(1);
      var res = gpio.togglePin(47);
      assert.deepEqual(
        res,
        {'pin': 47, 'state': 0},
        'pin has not changed its state');
    });

    it('should change inactive pin to active', function() {
      initWpiPinsWith(0);
      var res = gpio.togglePin(47);
      assert.deepEqual(
        res,
        {'pin': 47, 'state': 1},
        'pin has not changed its state');
    });
  });

  describe('setPin', function () {
    it('should set a pin by name to the given value', function() {
      initWpiPinsWith(0);
      gpio.setPin('a', 1);
      assert.equal(wpi.data[47], 1);
      gpio.setPin('a', 1);
      assert.equal(wpi.data[47], 1);
      gpio.setPin('a', 0);
      assert.equal(wpi.data[47], 0);
    });
  });

  describe('init', function () {
    it('should initialize the wiring_pi library to use gpio address schema', function() {
      assert.equal(wpi.schema, 'gpio');
    });
  });
});

// vim: expandtab:tabstop=8:softtabstop=2:shiftwidth=2
