var assert = require('assert');

var macros = require('../../lib/macros');
var deviceMock = {
  operations: [],
  expectedArgs: null,
  call: function (done, args) {
    this.operations.push(args);
    done();
  },
  validateArguments: function (args) {
    if (this.expectedArgs !== null) {
      if (args.length !== this.expectedArgs.length) {
        throw new Error('wrong argument count' + args.length);
      }
      if (args !== this.expectedArgs) {
        throw new Error('illegal arguments');
      }
    }
  },
};

var CONFIG_HELLO_WORLD = [{
  'name': 'hello world',
  'sequence': [
    ['say', 'hello'],
    ['say', 'world'],
  ],
}];

var CONFIG_HELLO = [
  {
    'name': 'hello',
    'sequence': [
      ['say', 'hello'],
    ],
  }, {
    'name': 'world',
    'hidden': false,
    'sequence': [
      ['say', 'world'],
    ],
  }, {
    'name': '!',
    'hidden': true,
    'sequence': [
      ['say', '!'],
    ],
  },
];


var CONFIG_UNKNOWN_DEVICE = [{
  'name': 'dont care',
  'sequence': [
    ['reject', 'a'],
  ],
}];

describe('macros', function () {
  describe('configuration', function () {
    beforeEach(function () {
      deviceMock.expectedArgs = null;
      deviceMock.operations = [];
      macros.resetConfiguration();
      macros.registerDevice('say', deviceMock);
    });

    it('should reject a macro with a command for a unknown device', function () {
      assert.throws(function () {macros.init(CONFIG_UNKNOWN_DEVICE);}, Error);
    });

    it('should reject a macro with a invalid argument count for', function () {
      deviceMock.expectedArgs = ['shu', 'bidu'];
      assert.throws(function () {macros.init(CONFIG_HELLO_WORLD);}, Error);
    });

    it('should reject a macro with a invalid argument content', function () {
      deviceMock.expectedArgs = ['hoo'];
      assert.throws(function () {macros.init(CONFIG_HELLO_WORLD);}, Error);
    });

    it('should accept a macro with valid or unchecked arguments', function () {
      macros.init(CONFIG_HELLO_WORLD);
    });
  });

  describe('devices', function () {
    it('should accept registrations', function () {
      macros.registerDevice('say', deviceMock);
    });
  });

  describe('execution', function () {
    beforeEach(function () {
      deviceMock.expectedArgs = null;
      deviceMock.operations = [];
      macros.resetConfiguration();
      macros.registerDevice('say', deviceMock);
      macros.init(CONFIG_HELLO_WORLD);
    });
    it('should accept a macro name for execution', function () {
      macros.execute('hello world');
      assert.deepEqual(deviceMock.operations, [['hello'], ['world']]);
    });
  });

  describe('application support', function () {
    before(function () {
      deviceMock.expectedArgs = null;
      deviceMock.operations = [];
      macros.resetConfiguration();
      macros.registerDevice('say', deviceMock);
      macros.init(CONFIG_HELLO);
    });

    it('should provide a list of macro names, that can be shown in a UI', function () {
      assert.deepEqual(macros.getGuiMacroLabels(), ['hello', 'world']);
    });
  });
});

// vim: expandtab tabstop=8 softtabstop=2 shiftwidth=2
