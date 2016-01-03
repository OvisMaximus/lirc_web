var wpi = require('wiring-pi');
var gpios = null;

exports.updatePinStates = function () {
  var i;
  var gpio;
  if (gpios) {
    for (i = 0; i < gpios.length; i++) {
      gpio = gpios[i];
      gpio.state = wpi.digitalRead(gpio.pin);
    }
  }
};

exports.togglePin = function (pinId) {
  var numericPinId = parseInt(pinId, 10);
  var currentState = wpi.digitalRead(numericPinId);
  var newState = currentState > 0 ? 0 : 1;
  wpi.digitalWrite(numericPinId, newState);
  return {
    'pin': pinId,
    'state': newState,
  };
};

function findElement(array, propertyName, propertyValue) {
  var i;
  for (i = 0; i < array.length; i++) {
    if (array[i][propertyName] === propertyValue) {
      return array[i];
    }
  }
}

function getPinIdByName(pinName) {
  var gpioPin = findElement(gpios, 'name', pinName);
  return gpioPin.pin;
}

exports.setPin = function (pinName, newState) {
  var numericPinId = getPinIdByName(pinName);
  wpi.digitalWrite(numericPinId, newState);
};

exports.init = function (configuration) {
  if (configuration) {
    gpios = configuration;
    wpi.setup('gpio');
    exports.updatePinStates();
  }
};
