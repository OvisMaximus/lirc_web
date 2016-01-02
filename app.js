#! /usr/bin/env node

// Requirements
var express = require('express');
var lircNode = require('lirc_node');
var consolidate = require('consolidate');
var swig = require('swig');
var labels = require('./lib/labels');
var https = require('https');
var fs = require('fs');
var wpi = require('wiring-pi');

// Precompile templates
var JST = {
  index: swig.compileFile(__dirname + '/templates/index.swig'),
};

// Create app
var app = module.exports = express();

// lirc_web configuration
var config = {};

// Server & SSL options
var port = 3000;
var sslOptions = {
  key: null,
  cert: null,
};

// Labels for remotes / commands
var labelFor = labels(config.remoteLabels, config.commandLabels);

// App configuration
app.engine('.html', consolidate.swig);
app.configure(function () {
  app.use(express.logger());
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.compress());
  app.use(express.static(__dirname + '/static'));
});

wpi.setup('gpio');
updateGpioPinStates();

function updateGpioPinStates() {
    if (config.gpios) {
        var i, io;
        for (i=0; i<config.gpios.length; i++) {
            io = config.gpios[i];
            io.state = wpi.digitalRead(io.pin);
        }
    }
}

function toggleGpioPin(pinId) {
    var numericPinId = parseInt(pinId);
    var currentState = wpi.digitalRead(numericPinId);
    var newState = currentState > 0 ? 0 : 1;
    wpi.digitalWrite(numericPinId, newState);
    return {"pin": pinId, "state": newState};
}

function getGpioPinIdByName(pinName) {
    function findElement(array, propertyName, propertyValue) {
        for (var i=0; i<array.length; i++) {
            if(array[i][propertyName] == propertyValue) {
                return array[i];
            }
        }
    }
    gpioPin = findElement(config.gpios, "name", pinName);
    return gpioPin.pin;
}

function setGpio(pinName, newState){
    numericPinId = getGpioPinIdByName(pinName);
    wpi.digitalWrite(numericPinId, newState);
}

function _init() {
  var home = process.env.HOME;

  lircNode.init();

  // Config file is optional
  try {
    try {
      config = require(__dirname + '/config.json');
    } catch (e) {
      config = require(home + '/.lirc_web_config.json');
    }
  } catch (e) {
    console.log('DEBUG:', e);
    console.log('WARNING: Cannot find config.json!');
  }
}

function refineRemotes(myRemotes) {
  var newRemotes = {};
  var newRemoteCommands = null;
  var remote = null;

  function isBlacklistExisting(remoteName) {
    return config.blacklists && config.blacklists[remoteName];
  }

  function getCommandsForRemote(remoteName) {
    var remoteCommands = myRemotes[remoteName];
    var blacklist = null;

    if (isBlacklistExisting(remoteName)) {
      blacklist = config.blacklists[remoteName];

      remoteCommands = remoteCommands.filter(function (command) {
        return blacklist.indexOf(command) < 0;
      });
    }

    return remoteCommands;
  }

  for (remote in myRemotes) {
    newRemoteCommands = getCommandsForRemote(remote);
    newRemotes[remote] = newRemoteCommands;
  }

  return newRemotes;
}

// Based on node environment, initialize connection to lircNode or use test data
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
  lircNode.remotes = require(__dirname + '/test/fixtures/remotes.json');
  config = require(__dirname + '/test/fixtures/config.json');
} else {
  _init();
}

// Routes
var labelFor = labels(config.remoteLabels, config.commandLabels)

// Web UI
app.get('/', function(req, res) {
  var refined_remotes = refineRemotes(lirc_node.remotes);
  res.send(JST.index.render({
    remotes: refined_remotes,
    macros: config.macros,
    repeaters: config.repeaters,
    gpios: config.gpios,
    labelForRemote: labelFor.remote,
    labelForCommand: labelFor.command
  }));
});

// Refresh
app.get('/refresh', function (req, res) {
  _init();
  res.redirect('/');
});

// List all remotes in JSON format
app.get('/remotes.json', function (req, res) {
  res.json(refineRemotes(lircNode.remotes));
});

// List all commands for :remote in JSON format
app.get('/remotes/:remote.json', function (req, res) {
  if (lircNode.remotes[req.params.remote]) {
    res.json(refineRemotes(lircNode.remotes)[req.params.remote]);
  } else {
    res.send(404);
  }
});

// List all gpio switches in JSON format
app.get('/gpios.json', function(req, res) {respondWithGpioState(res)});

function respondWithGpioState(res) {
    if (config.gpios) {
        updateGpioPinStates();
        res.json(config.gpios);
    } else {
        res.send(404);
    }
}

// List all macros in JSON format
app.get('/macros.json', function (req, res) {
  res.json(config.macros);
});

// List all commands for :macro in JSON format
app.get('/macros/:macro.json', function (req, res) {
  if (config.macros && config.macros[req.params.macro]) {
    res.json(config.macros[req.params.macro]);
  } else {
    res.send(404);
  }
});

// Send :remote/:command one time
app.post('/remotes/:remote/:command', function (req, res) {
  lircNode.irsend.send_once(req.params.remote, req.params.command, function () {});
  res.setHeader('Cache-Control', 'no-cache');
  res.send(200);
});

// Start sending :remote/:command repeatedly
app.post('/remotes/:remote/:command/send_start', function (req, res) {
  lircNode.irsend.send_start(req.params.remote, req.params.command, function () {});
  res.setHeader('Cache-Control', 'no-cache');
  res.send(200);
});

// Stop sending :remote/:command repeatedly
app.post('/remotes/:remote/:command/send_stop', function (req, res) {
  lircNode.irsend.send_stop(req.params.remote, req.params.command, function () {});
  res.setHeader('Cache-Control', 'no-cache');
  res.send(200);
});

// toggle /gpios/:gpio_pin 
app.post('/gpios/:gpio_pin', function(req, res) {
    newValue = toggleGpioPin(req.params.gpio_pin);
    res.setHeader('Cache-Control', 'no-cache');
    res.json(newValue);
    res.end();
});


// Execute a macro (a collection of commands to one or more remotes)
app.post('/macros/:macro', function (req, res) {
  var i = 0;
  var nextCommand = null;

  // If the macro exists, execute each command in the macro with 100msec
  // delay between each command.
  if (config.macros && config.macros[req.params.macro]) {
    nextCommand = function () {
      var command = config.macros[req.params.macro][i];

      if (!command) { return true; }

      // increment
      i = i + 1;

      if (command[0] === 'delay') {
        setTimeout(nextCommand, command[1]);
      } else if (command[0] == "gpio") {
        setGpio(command[1], command[2]);
        nextCommand();
      } else {
        // By default, wait 100msec before calling next command
        lircNode.irsend.send_once(command[0], command[1], function () { setTimeout(nextCommand, 100); });
      }
    };

    // kick off macro w/ first command
    nextCommand();
  }

  res.setHeader('Cache-Control', 'no-cache');
  if(config.gpios) {
    respondWithGpioState(res);
  } else {
    res.send(200);
  }
});

// Listen (http)
if (config.server && config.server.port) {
  port = config.server.port;
}
app.listen(port);
console.log('Open Source Universal Remote UI + API has started on port ' + port + ' (http).');

// Listen (https)
if (config.server && config.server.ssl && config.server.ssl_cert && config.server.ssl_key && config.server.ssl_port) {
  sslOptions = {
    key: fs.readFileSync(config.server.ssl_key),
    cert: fs.readFileSync(config.server.ssl_cert),
  };

  https.createServer(sslOptions, app).listen(config.server.ssl_port);

  console.log('Open Source Universal Remote UI + API has started on port ' + config.server.ssl_port + ' (https).');
}
