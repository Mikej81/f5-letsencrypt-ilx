'use strict';

var DAY = 24 * 60 * 60 * 1000;

var LE = require('letsencrypt');

module.exports.run = function (args) {
  var leChallenge;
  var leStore;
  var servers;
  var USE_DNS = {};

  var challengeType;
  if (args.dns01) {
    challengeType = 'dns-01';
    args.webrootPath = '';
    args.standalone = USE_DNS;
  } else if (args.tlsSni01Port || args.hooks) {
    challengeType = 'tls-sni-01';
    args.webrootPath = '';
  } else /*if (args.http01Port)*/ {
    challengeType = 'http-01';
  }

  if (args.manual) {
    leChallenge = require('le-challenge-manual').create({});
  }
  else if (args.hooks) {
    leChallenge = require('le-challenge-hooks').create({
      hooksPath: args.hooksPath
    , hooksServer: args.hooksServer
    , hooksTemplate: args.hooksTemplate
    , hooksBind: args.hooksBind
    , hooksPort: args.hooksPort
    , hooksWebroot: args.hooksWebroot
    , hooksPreEnable: args.hooksPreEnable
    , hooksEnable: args.hooksEnable
    , hooksPreReload: args.hooksPreReload
    , hooksReload: args.hooksReload
    , hooksDisable: args.hooksDisable
    });
  }
  else if (args.webrootPath) {
    // webrootPath is all that really matters here
    // TODO rename le-challenge-fs to le-challenge-webroot
    leChallenge = require('./lib/webroot').create({ webrootPath: args.webrootPath });
  }
  else if (args.tlsSni01Port) {
    leChallenge = require('le-challenge-sni').create({});
    servers = require('./lib/servers').create(leChallenge);
  }
  else if (USE_DNS !== args.standalone) {
    leChallenge = require('le-challenge-standalone').create({});
    servers = require('./lib/servers').create(leChallenge);
  }

  var privkeyPath = args.domainKeyPath || ':configDir/live/:hostname/privkey.pem'; //args.privkeyPath
  leStore = require('le-store-certbot').create({
    configDir: args.configDir
  , privkeyPath: privkeyPath
  , fullchainPath: args.fullchainPath
  , certPath: args.certPath
  , chainPath: args.chainPath
  , webrootPath: args.webrootPath
  , domainKeyPath: args.domainKeyPath
  , accountKeyPath: args.accountKeyPath
  });

  if (!args.server) {
    throw new Error("You must specify a server to use with --server");
  }

  // let LE know that we're handling standalone / webroot here
  var leChallenges = {};
  leChallenges[challengeType] = leChallenge;
  var le = LE.create({
    debug: args.debug
  , server: args.server
  , store: leStore
  , challenges: leChallenges
  , renewWithin: args.renewWithin * DAY
  , duplicate: args.duplicate
  });

  if (servers) {
    if (args.tlsSni01Port) {
      servers = servers.startServers(
        [], args.tlsSni01Port
      , { debug: args.debug, httpsOptions: le.httpsOptions }
      );
    }
    else {
      servers = servers.startServers(
        args.http01Port || [80], []
      , { debug: args.debug }
      );
    }
  }

  // Note: can't use args directly as null values will overwrite template values
  le.register({
    debug: args.debug
  , email: args.email
  , agreeTos: args.agreeTos
  , domains: args.domains
  , rsaKeySize: args.rsaKeySize
  , challengeType: challengeType
  }).then(function (certs) {
    if (!certs._renewing) {
      return certs;
    }
    console.log("");
    console.log("Got certificate(s) for " + certs.altnames.join(', '));
    console.log("\tIssued at " + new Date(certs.issuedAt).toISOString() + "");
    console.log("\tValid until " + new Date(certs.expiresAt).toISOString() + "");
    console.log("");
    console.log("Renewing them now");
    return certs._renewing;
  }).then(function (certs) {
    if (servers) {
      servers.closeServers();
    }

    console.log("");
    console.log("Got certificate(s) for " + certs.altnames.join(', '));
    console.log("\tIssued at " + new Date(certs.issuedAt).toISOString() + "");
    console.log("\tValid until " + new Date(certs.expiresAt).toISOString() + "");
    console.log("");
    console.log('Private key installed at:');
    console.log(
      privkeyPath
      .replace(/:configDir/g, args.configDir)
      .replace(/:hostname/g, args.domains[0])
    );
    console.log("");

    // should get back account, path to certs, pems, etc?
    console.log('Certificates installed at:');
    console.log(
      [
        args.certPath
      , args.chainPath
      , args.fullchainPath
      ].join('\n')
      .replace(/:configDir/g, args.configDir)
      .replace(/:hostname/g, args.domains[0])
    );
    console.log("");

    process.exit(0);
  }, function (err) {
    console.error('[Error]: letsencrypt-cli');
    console.error(err.stack || new Error('get stack').stack);

    process.exit(1);
  });

};
