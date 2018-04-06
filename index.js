'use strict';

/*
  Need to add in greenlock-express (https://github.com/Daplie/greenlock-express) 
  for cert renewals and junk, add hooks to ssl profiles, csrs, all that...

 https://acme-staging.api.letsencrypt.org/directory

 ShellJS might be nice for bash/tmsh access to greenlock-cli...

#!/bin/bash

node bin/letsencrypt certonly \
  --agree-tos --email 'john.doe@gmail.com' \
  --standalone \
  --domains example.com,www.example.com \
  --server https://acme-staging.api.letsencrypt.org/directory \
  --config-dir ~/letsencrypt.test/etc
  
  May even be easier to create from scratch since a lot of the greenlock is ancillary...
  
  https://letsencrypt.org/docs/staging-environment/
  https://letsencrypt.org/docs/
  
  
*/

// Import the f5-nodejs module.
var f5 = require('f5-nodejs');

var LE = require('greenlock');
var le;

// Storage Backend
var leStore = require('le-store-certbot').create({
  configDir: './acme/etc'                                 // or /etc/letsencrypt or wherever
, debug: false
});

// ACME Challenge Handlers
var leHttpChallenge = require('le-challenge-fs').create({
  webrootPath: '~/acme/var/'                              // or template string such as
, debug: false                                            // '/srv/www/:hostname/.well-known/acme-challenge'
});
var leSniChallenge = require('le-challenge-sni').create({
 debug: false
});

function leAgree(opts, agreeCb) {
  // opts = { email, domains, tosUrl }
  agreeCb(null, opts.tosUrl);
}

// Create a new rpc server for listening to TCL iRule calls.
var ilx = new f5.ILXServer();

ilx.addMethod('le-create', function(req, res, le) {
    le = LE.create({
      server: LE.stagingServerUrl                             // or LE.productionServerUrl
    , store: leStore                                          // handles saving of config, accounts, and certificates
    , challenges: {
        'http-01': leHttpChallenge                            // handles /.well-known/acme-challege keys and tokens
      , 'tls-sni-01': leSniChallenge                          // handles generating a certificate with the correct name
      , 'tls-sni-02': leSniChallenge
      }
    , challengeType: 'http-01'                                // default to this challenge type
    , agreeToTerms: leAgree                                   // hook to allow user to view and accept LE TOS
    //, sni: require('le-sni-auto').create({})                // handles sni callback
    , debug: false
    //, log: function (debug) {console.log.apply(console, args);} // handles debug outputs
    });
});

ilx.addMethod('le-check', function(req, res, le) {
// Check in-memory cache of certificates for the named domain
le.check({ domains: [ 'example.com' ] }).then(function (results) {
  if (results) {
    // we already have certificates
    return;
  }


  // Register Certificate manually
  le.register({

    domains: ['example.com']                                // CHANGE TO YOUR DOMAIN (list for SANS)
  , email: 'user@email.com'                                 // CHANGE TO YOUR EMAIL
  , agreeTos: ''                                            // set to tosUrl string (or true) to pre-approve (and skip agreeToTerms)
  , rsaKeySize: 2048                                        // 2048 or higher
  , challengeType: 'http-01'                                // http-01, tls-sni-01, or dns-01

  }).then(function (results) {

    console.log('success');

  }, function (err) {

    // Note: you must either use le.middleware() with express,
    // manually use le.challenges['http-01'].get(opts, domain, key, val, done)
    // or have a webserver running and responding
    // to /.well-known/acme-challenge at `webrootPath`
    console.error('[Error]: node-greenlock/examples/standalone');
    console.error(err.stack);

  });

});
});

// Start listening for ILX::call and ILX::notify events.
ilx.listen();
