'use strict';

var Promise = require('bluebird');
var Mustache = require('mustache');
var path = require('path');
var fs = require('fs');
var readFile = Promise.promisify(fs.readFile);
var writeFile = Promise.promisify(fs.writeFile);
var unlink = Promise.promisify(fs.unlink);
var mkdirp = Promise.promisify(require('mkdirp'));
var generate = Promise.promisify(require('le-tls-sni').generate);
var subprocess = require('child_process');

var u; // undefined
var defaults = {
  hooksPath: path.join('~', 'letsencrypt', 'hooks')
  //hooksPath: path.join(require('os').tmpdir(), 'acme-challenge')
, hooksServer: u
, hooksTemplate: u
, hooksBind: "*"
, hooksPort: "443"
, hooksWebroot: "/var/www"
, hooksPreEnable: u
, hooksEnable: u
, hooksPreReload: u
, hooksReload: u
, hooksDisable: u
, debug: false
, challengeType: u
};
var serverDefaults = {};
var templates = {};

var merge = function(args, fallback) {
  Object.keys(defaults).forEach(function(key) {
    if ('undefined' === typeof args[key] || args[key] === null) {
      args[key] = fallback[key];
    }
  });
  return args;
};

var common = function(args, domain, token) {
  return {
    token: token
  , domain: domain
  , cert: path.join(args.hooksPath, token + ".crt")
  , privkey: path.join(args.hooksPath, token + ".key")
  , conf: path.join(args.hooksPath, token + ".conf")
  , bind: args.hooksBind
  , port: args.hooksPort
  , webroot: args.hooksWebroot
  };
};

var exec = Promise.promisify(function(command, message, params, done) {
  if (!command) {
    done(null);
    return;
  }
  var command = Mustache.render(command, params);
  var child = subprocess.exec(command);
  child.on('exit', function(code) {
    if (code === 0) {
      done(null);
    } else {
      done(new Error(message));
    }
  });
});

module.exports.create = function(args) {
  var options = merge(merge({}, args), defaults);

  var handlers = {
    getOptions: function() {
      return options;
    }

    //
    // NOTE: the "args" here in `set()` are NOT accessible to `get()` and `remove()`
    // They are provided so that you can store them in an implementation-specific way
    // if you need access to them.
    //
  , set: function(args, domain, token, secret, done) {
      var args = merge({}, args);
      var certs;
      var params;

      if (!args.hooksServer && !args.hooksTemplate) {
        throw new Error("hooksServer or hooksTemplate must be provided");
      }
      Promise.resolve().then(function() {
        if (!args.hooksServer) return {};
        if (args.hooksServer in serverDefaults) return serverDefaults[args.hooksServer];
        if (!/^[-_A-Za-z0-9]+$/.test(args.hooksServer)) {
          throw new Error("invalid hooks server");
        }
        var serverPath = path.join(__dirname, "servers", args.hooksServer + ".json");
        return readFile(serverPath, 'utf8').then(function(json) {
          json = JSON.parse(json);
          if (json.hooksTemplate) {
            json.hooksTemplate = path.join(__dirname, "servers", json.hooksTemplate);
          }
          serverDefaults[args.hooksServer] = json;
          return json;
        });
      }).then(function(json) {
        args = merge(args, json);
      }).then(function() {
        if (args.hooksTemplate in templates) return;
        return readFile(args.hooksTemplate, 'utf8').then(function(data) {
          templates[args.hooksTemplate] = data;
        });
      }).then(function() {
        return mkdirp(args.hooksPath);
      }).then(function() {
        return generate(args, domain, token, secret);
      }).then(function(generated) {
        certs = generated;
        params = common(args, domain, token);
        params.subject = certs.subject;
        var template = templates[args.hooksTemplate];
        return writeFile(params.conf, Mustache.render(template, params), 'utf8');
      }).then(function() {
        return writeFile(params.privkey, certs.privkey, 'utf8');
      }).then(function() {
        return writeFile(params.cert, certs.cert, 'utf8');
      }).then(function() {
        return exec(args.hooksPreEnable, "webserver configuration error", params);
      }).then(function() {
        return exec(args.hooksEnable, "error enabling webesrver configuration", params);
      }).then(function() {
        return exec(args.hooksPreReload, "webserver configuration error", params);
      }).then(function() {
        return exec(args.hooksReload, "error reloading webserver", params);
      }).then(function() {
        done(null);
      },function(err) {
        done(err);
      });
    }

  , get: function(defaults, domain, key, done) {
      throw new Error("Challenge.get() has no implementation for hooks.");
    }

    //
    // NOTE: the "defaults" here are still merged and templated, just like "args" would be,
    // but if you specifically need "args" you must retrieve them from some storage mechanism
    // based on domain and key
    //
  , remove: function(defaults, domain, token, done) {
      var args = merge({}, defaults);
      if (args.hooksServer) {
        args = merge(args, serverDefaults[args.hooksServer]);
      }
      var params = common(args, domain, token);
      Promise.resolve().then(function() {
        return exec(args.hooksDisable, "error disabling webserver configuration", params);
      }).then(function() {
        return exec(args.hooksPreReload, "webserver configuration error", params);
      }).then(function() {
        return exec(args.hooksReload, "error reloading webserver", params);
      }).then(function() {
        return unlink(params.conf);
      }).then(function() {
        return unlink(params.privkey);
      }).then(function() {
        return unlink(params.cert);
      }).then(function() {
        done(null);
      },function(err) {
        done(err);
      });
    }
  };

  return handlers;
};
