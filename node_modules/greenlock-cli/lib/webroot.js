'use strict';

module.exports.create = function (defaults) {
  var fs = require('fs');
  var path = require('path');
  var mkdirp = require('mkdirp');

  var handlers = {
    //
    // set,get,remove challenges
    //
    getOptions: function () {
      return defaults;
    }

  , set: function (args, domain, token, secret, cb) {
      var challengePath = path.join(args.webrootPath || defaults.webrootPath, '.well-known', 'acme-challenge');
      mkdirp(challengePath, function (err) {
        if (err) {
          console.error("Could not create --webroot-path '" + challengePath + "':", err.code);
          console.error("Try checking the permissions, maybe?");
          cb(err);
          return;
        }

        var tokenfile = path.join(challengePath, token);

        fs.writeFile(tokenfile, secret, 'utf8', function (err) {
          if (err) {
            console.error("Could not write '" + tokenfile + "':", err.code);
            cb(err);
            return;
          }

          cb(null);
        });
      });
    }

    // handled as file read by web server
  , get: function (args, domain, token, cb) {
      // see https://github.com/Daplie/node-letsencrypt/issues/41
      cb(new Error("get not implemented (on purpose) in le-cli/lib/webroot.js"));
    }

  , remove: function (args, domain, token, cb) {
      var tokenfile = path.join(args.webrootPath || defaults.webrootPath, '.well-known', 'acme-challenge', token);

      fs.unlink(tokenfile, function (err) {
        if (err) {
          console.error("Could not unlink '" + tokenfile + "':", err.code);
          cb(err);
          return;
        }

        cb(null);
      });
    }
  };

  return handlers;
};
