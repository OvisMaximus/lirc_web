var devices = {};
var macroConfigurations = {};
var macros = {};
var visibleMacroNames = [];
var insertMacroFromSequence;

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

function getCallSequence(stepConfiguration) {
  var calledMacroName = stepConfiguration[1];
  var calledMacroConfiguration = macroConfigurations[calledMacroName];
  if (! calledMacroConfiguration) {
    throw new Error('No Macro defined with name "' + calledMacroName + '"');
  }
  return calledMacroConfiguration.sequence;
}


function insertMacroStep(done, stepConfiguration) {
  var deviceName = stepConfiguration[0];
  if (deviceName.toLowerCase() === 'call') {
    return insertMacroFromSequence(done, getCallSequence(stepConfiguration));
  }

  return createMacroStep(done, stepConfiguration);
}

insertMacroFromSequence = function (callback, sequence) {
  var i;
  var done = callback;

  for (i = sequence.length - 1; i >= 0; i--) {
    done = insertMacroStep(done, sequence[i].slice());
  }

  return done;
};

function createMacroFromSequence(sequence) {
  var done = function () {};

  return insertMacroFromSequence(done, sequence);
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
