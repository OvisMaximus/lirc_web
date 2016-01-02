var wpi = require('wiring-pi');
var gpios = null;

function updatePinStates() {
  var i;
  var gpio;
  if (gpios) {
    for (i = 0; i < gpios.length; i++) {
      gpio = gpios[i];
      gpio.state = wpi.digitalRead(gpio.pin);
    }
  }
}

function togglePin(pinId) {
  var numericPinId = parseInt(pinId, 10);
  var currentState = wpi.digitalRead(numericPinId);
  var newState = currentState > 0 ? 0 : 1;
  wpi.digitalWrite(numericPinId, newState);
  return {
    'pin': pinId,
    'state': newState,
  };
}

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

function setPin(pinName, newState) {
  var numericPinId = getPinIdByName(pinName);
  wpi.digitalWrite(numericPinId, newState);
}

function init(configuration) {
  if (configuration) {
    gpios = configuration;
    wpi.setup('gpio');
    updatePinStates();
  }
}

module.exports = {
  togglePin: togglePin(),
  setPin: setPin(),
  updatePinStates: updatePinStates(),
  getPinIdByName: getPinIdByName(),
  init: init(),
};
