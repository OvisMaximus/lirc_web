// lirc_web - v0.0.8
// Alex Bain <alex@alexba.in>

// Requirements
var express = require('express'),
    lirc_node = require('lirc_node'),
    consolidate = require('consolidate'),
    path = require('path'),
    swig = require('swig'),
    wpi = require('wiring-pi'),
    labels = require('./lib/labels');

// Precompile templates
var JST = {
    index: swig.compileFile(__dirname + '/templates/index.swig')
};

// Create app
var app = module.exports = express();

// App configuration
app.engine('.html', consolidate.swig);
app.configure(function() {
    app.use(express.logger());
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.compress());
    app.use(express.static(__dirname + '/static'));
});

// lirc_web configuration
var config = {};

// Based on node environment, initialize connection to lirc_node or use test data
if (process.env.NODE_ENV == 'test' || process.env.NODE_ENV == 'development') {
    lirc_node.remotes = require(__dirname + '/test/fixtures/remotes.json');
    config = require(__dirname + '/test/fixtures/config.json');
} else {
    _init();
}

wpi.setup('gpio');
updateGpioPinStates();

function updateGpioPinStates() {
    var i, io;
    for (i=0; i<config.gpios.length; i++) {
        io = config.gpios[i];
        io.state = wpi.digitalRead(io.pin);
        console.log(JSON.stringify(io,null,4));
    }
}

function toggleGpioPin(pin) {
    var numericPinId = parseInt(pin);
    var currentState = wpi.digitalRead(numericPinId);
    var newState = currentState > 0 ? 0 : 1;
    wpi.digitalWrite(numericPinId, newState);
    return {"pin": pin, "state": newState};
}

function _init() {
    lirc_node.init();

    // Config file is optional
    try {
        config = require(__dirname + '/config.json');
    } catch(e) {
        console.log("DEBUG:", e);
        console.log("WARNING: Cannot find config.json!");
    }
}

function refineRemotes(myRemotes) {
    function getCommandsForRemote(remoteName) {
        var commands = myRemotes[remoteName];

        if (isBlacklistExisting(remoteName)){
            blacklist = config.blacklists[remoteName]
            commands = commands.filter( function(command) {
                return blacklist.indexOf(command) < 0;
            });
        }

        return commands;
    }

    function isBlacklistExisting(remoteName) {
        return config.blacklists && config.blacklists[remoteName];
    }

    var newRemotes = {};
    for(remote in myRemotes) {
        commands = getCommandsForRemote(remote);
        newRemotes[remote] = commands;
    };
    return newRemotes;        
} 

// Routes

var labelFor = labels(config.remoteLabels, config.commandLabels)

// Web UI
app.get('/', function(req, res) {
    var refined_remotes = refineRemotes(lirc_node.remotes);
    res.send(JST['index'].render({
        remotes: refined_remotes,
        macros: config.macros,
        repeaters: config.repeaters,
        gpios: config.gpios,
        labelForRemote: labelFor.remote,
        labelForCommand: labelFor.command
    }));
});

// Refresh
app.get('/refresh', function(req, res) {
    _init();
    res.redirect('/');
});

// List all remotes in JSON format
app.get('/remotes.json', function(req, res) {
    res.json(refineRemotes(lirc_node.remotes));
});

// List all commands for :remote in JSON format
app.get('/remotes/:remote.json', function(req, res) {
    if (lirc_node.remotes[req.params.remote]) {
        res.json(refineRemotes(lirc_node.remotes)[req.params.remote]);
    } else {
        res.send(404);
    }
});

// List all gpio switches in JSON format
app.get('/gpios.json', function(req, res) {
    if (config.gpios) {
        updateGpioPinStates();
        res.json(config.gpios);
    } else {
        res.send(404);
    }
});

// List all macros in JSON format
app.get('/macros.json', function(req, res) {
    res.json(config.macros);
});

// List all commands for :macro in JSON format
app.get('/macros/:macro.json', function(req, res) {
    if (config.macros && config.macros[req.params.macro]) {
        res.json(config.macros[req.params.macro]);
    } else {
        res.send(404);
    }
});


// Send :remote/:command one time
app.post('/remotes/:remote/:command', function(req, res) {
    lirc_node.irsend.send_once(req.params.remote, req.params.command, function() {});
    res.setHeader('Cache-Control', 'no-cache');
    res.send(200);
});

// Start sending :remote/:command repeatedly
app.post('/remotes/:remote/:command/send_start', function(req, res) {
    lirc_node.irsend.send_start(req.params.remote, req.params.command, function() {});
    res.setHeader('Cache-Control', 'no-cache');
    res.send(200);
});

// Stop sending :remote/:command repeatedly
app.post('/remotes/:remote/:command/send_stop', function(req, res) {
    lirc_node.irsend.send_stop(req.params.remote, req.params.command, function() {});
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
app.post('/macros/:macro', function(req, res) {

    // If the macro exists, execute each command in the macro with 100msec
    // delay between each command.
    if (config.macros && config.macros[req.params.macro]) {
        var i = 0;

        var nextCommand = function() {
            var command = config.macros[req.params.macro][i];

    	    if (!command) { return true; }

            // increment
            i = i + 1;

            if (command[0] == "delay") {
                setTimeout(nextCommand, command[1]);
            } else {
                // By default, wait 100msec before calling next command
                lirc_node.irsend.send_once(command[0], command[1], function() { setTimeout(nextCommand, 100); });
            }
        };

        // kick off macro w/ first command
        nextCommand();
    }

    res.setHeader('Cache-Control', 'no-cache');
    res.send(200);
});

// Default port is 3000
app.listen(3000);
console.log("Open Source Universal Remote UI + API has started on port 3000.");
