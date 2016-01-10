var devices = {};
var macroConfigurations = {};
var macros = {};
var visibleMacroNames = [];

function resetConfiguration() {
  devices = {};
  macroConfigurations = {};
  macros = {};
  visibleMacroNames = [];
}

function createMacroStep(done, stepDescription) {
  var deviceName = stepDescription.shift();
  var device = devices[deviceName];


  if (! device) {
    throw new Error('Can not create macro. DeviceName "' + deviceName + '" is not known.');
  }

  device.validateArguments(stepDescription);

  return function () {
    device.call(done, stepDescription);
  };
}

function createMacroFromSequence(sequence) {
  var i;
  var done = function () {};

  for (i = sequence.length - 1; i >= 0; i--) {
    done = createMacroStep(done, sequence[i].slice());
  }

  return done;
}

function isVisibleMacro(macroConfig) {
  if (macroConfig.hidden && macroConfig.hidden === true) {
    return false;
  }

  return true;
}

function registerMacro(macroConfig) {
  var macroName = macroConfig.name;
  var sequence = macroConfig.sequence;
  var macro = createMacroFromSequence(sequence);
  macroConfigurations[macroName] = macroConfig;
  macros[macroName] = macro;
  if (isVisibleMacro(macroConfig)) {
    visibleMacroNames.push(macroName);
  }
}

function acceptConfiguration(newConfiguration) {
  newConfiguration.forEach(function (macro) {
    registerMacro(macro);
  });
}

function registerDevice(deviceName, callback) {
  devices[deviceName] = callback;
}

function executeMacroByName(macroName) {
  var macro = macros[macroName];
  macro();
}

function getMacroLabelsForDisplay() {
  return visibleMacroNames;
}

module.exports = {
  init: acceptConfiguration,
  resetConfiguration: resetConfiguration,
  registerDevice: registerDevice,
  execute: executeMacroByName,
  getGuiMacroLabels: getMacroLabelsForDisplay,
};

// vim: expandtab tabstop=8 softtabstop=2 shiftwidth=2
