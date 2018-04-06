'use strict';

var challenge = require('./').create({ debug: true, webrootPath: '/tmp/acme-challenge' });

var opts = challenge.getOptions();
var domain = 'example.com';
var token = 'token-id';
var key = 'secret-key';

challenge.remove(opts, domain, token, function () {
  // ignore error, if any

  challenge.set(opts, domain, token, key, function (err) {
    // if there's an error, there's a problem
    if (err) {
      throw err;
    }

    // throw new Error("manually check /tmp/acme-challenge");

    challenge.get(opts, domain, token, function (err, _key) {
      // if there's an error, there's a problem
      if (err) {
        throw err;
      }

      // should retrieve the key
      if (key !== _key) {
        throw new Error("FAIL: could not get key by token");
      }

      challenge.remove(opts, domain, token, function () {
        // if there's an error, there's a problem
        if (err) {
          throw err;
        }

        challenge.get(opts, domain, token, function (err, _key) {
          // error here is okay

          // should NOT retrieve the key
          if (_key) {
            throw new Error("FAIL: should not get key");
          }

          console.info('PASS');
        });
      });
    });
  });
});
