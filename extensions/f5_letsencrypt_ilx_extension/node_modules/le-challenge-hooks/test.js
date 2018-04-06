'use strict';

var fs = require('fs');
var path = require('path');

var falsePath;
if (fs.existsSync("/bin/false")) {
	falsePath = "/bin/false";
} else if (fs.existsSync("/usr/bin/false")) {
	falsePath = "/usr/bin/false";
} else {
	throw new Error("can't find 'false' program");
}

var challenge = require('./').create({
  hooksPath: "/tmp/le-challenge-hooks-test"
, debug: true
});

var domain = 'example.com';
var token = 'token-id';
var key = 'secret-key';
var confExpected = fs.readFileSync(path.join(__dirname, 'servers', 'test.expected'), 'utf8');

var opts = challenge.getOptions();
opts.hooksServer = "test";
opts.challengeType = "tls-sni-01";

function tryUnlink(path) {
  try {
    fs.unlinkSync(path);
  } catch (err) {
  }
}

if (fs.existsSync("/tmp/le-challenge-hooks-test/token-id.crt")) {
  throw new Error("cert already exists");
}
if (fs.existsSync("/tmp/le-challenge-hooks-test/token-id.key")) {
  throw new Error("key already exists");
}
if (fs.existsSync("/tmp/le-challenge-hooks-test/token-id.conf")) {
  throw new Error("conf already exists");
}
challenge.set(opts, domain, token, key, function (err) {
  // if there's an error, there's a problem
  if (err) {
    throw err;
  }

  if (!fs.existsSync("/tmp/le-challenge-hooks-test/token-id.crt")) {
    throw new Error("cert not written");
  }
  if (!fs.existsSync("/tmp/le-challenge-hooks-test/token-id.key")) {
    throw new Error("key not written");
  }
  var conf = fs.readFileSync("/tmp/le-challenge-hooks-test/token-id.conf", 'utf8');
  if (conf !== confExpected) {
    throw new Error("incorrect configuration");
  }
  if (!fs.existsSync("/tmp/le-challenge-hooks-test/pre")) {
    throw new Error("conf not pre-checked");
  }
  if (!fs.existsSync("/tmp/le-challenge-hooks-test/enabled")) {
    throw new Error("conf not enabled");
  }
  if (!fs.existsSync("/tmp/le-challenge-hooks-test/checked")) {
    throw new error("conf not checked");
  }
  if (!fs.existsSync("/tmp/le-challenge-hooks-test/reloaded")) {
    throw new error("webserver not reloaded");
  }
  tryUnlink("/tmp/le-challenge-hooks-test/pre");
  tryUnlink("/tmp/le-challenge-hooks-test/enabled");
  tryUnlink("/tmp/le-challenge-hooks-test/checked");
  tryUnlink("/tmp/le-challenge-hooks-test/reloaded");

  challenge.remove(opts, domain, token, function (err) {
    // if there's an error, there's a problem
    if (err) {
      throw err;
    }

    if (fs.existsSync("/tmp/le-challenge-hooks-test/token-id.crt")) {
      throw new Error("cert not removed");
    }
    if (fs.existsSync("/tmp/le-challenge-hooks-test/token-id.key")) {
      throw new Error("key not removed");
    }
    if (fs.existsSync("/tmp/le-challenge-hooks-test/token-id.conf")) {
      throw new Error("conf not removed");
    }
    if (!fs.existsSync("/tmp/le-challenge-hooks-test/disabled")) {
      throw new Error("conf not disabled");
    }
    if (!fs.existsSync("/tmp/le-challenge-hooks-test/checked")) {
      throw new Error("conf not checked");
    }
    if (!fs.existsSync("/tmp/le-challenge-hooks-test/reloaded")) {
      throw new Error("webserver not reloaded");
    }
    tryUnlink("/tmp/le-challenge-hooks-test/disabled");
    tryUnlink("/tmp/le-challenge-hooks-test/checked");
    tryUnlink("/tmp/le-challenge-hooks-test/reloaded");

    delete opts.hooksServer;
    opts.hooksTemplate = path.join(__dirname, "servers", "test");

	 var next;
    next = makeRemoveFailureTest("hooksReload");
    next = makeRemoveFailureTest("hooksPreReload", next);
    next = makeRemoveFailureTest("hooksDisable", next);
    next = makeSetFailureTest("hooksReload", next);
    next = makeSetFailureTest("hooksPreReload", next);
    next = makeSetFailureTest("hooksEnable", next);
    next = makeSetFailureTest("hooksPreEnable", next);
    next();
  });
});

function makeRemoveFailureTest(failurePoint, next) {
  return function() {
    challenge.set(opts, domain, token, key, function (err) {
      // if there's an error, there's a problem
      if (err) {
        throw err;
      }

      opts[failurePoint] = falsePath;
      challenge.remove(opts, domain, token, function (err) {
        // if there's no error, there's a problem!
        if (!err) {
          throw new Error("remove didn't fail as expected");
        }

        tryUnlink("/tmp/le-challenge-hooks-test/token-id.crt");
        tryUnlink("/tmp/le-challenge-hooks-test/token-id.key");
        tryUnlink("/tmp/le-challenge-hooks-test/token-id.conf");

        delete opts[failurePoint];
        if (next) {
          next();
        } else {
          fs.rmdirSync("/tmp/le-challenge-hooks-test");
          console.info('PASS');
        }
      });
    });
  };
}
function makeSetFailureTest(failurePoint, next) {
  return function() {
    opts[failurePoint] = falsePath;
    challenge.set(opts, domain, token, key, function (err) {
      // if there's no error, there's a problem!
      if (!err) {
        throw new Error("remove didn't fail as expected");
      }

      tryUnlink("/tmp/le-challenge-hooks-test/token-id.crt");
      tryUnlink("/tmp/le-challenge-hooks-test/token-id.key");
      tryUnlink("/tmp/le-challenge-hooks-test/token-id.conf");

      delete opts[failurePoint];
      next();
    });
  };
}
