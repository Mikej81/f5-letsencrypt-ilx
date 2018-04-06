le-challenge-hooks
==================

A strategy for node-letsencrypt that uses hooks to configure a webserver to
meet tls-sni-01 or tls-sni-02 challenges.

Install
-------

```bash
npm install --save le-challenge-hooks@2.x
```

Usage
-----

```bash
var leChallenge = require('le-challenge-hooks').create({
  debug: false // default
, hooksPath: path.join('~', 'letsencrypt', 'hooks') // default
, hooksServer: "apache2-debian"
, hooksTemplate: "/path/to/config-file-template"
, hooksBind: "*" // default
, hooksPort: "443" // default
, hooksWebroot: "/var/www" // default, though nothing should actually be served
, hooksPreEnable: "/bin/true" // validate {{{conf}}} prior to enabling if necessary
, hooksEnable: "ln -s {{{conf}}} /etc/apache2/sites-enabled"
, hooksPreReload: "apache2ctl configtest"
, hooksReload: "/etc/init.d/apache2 reload"
, hooksDisable: "rm /etc/apache2/sites-enabled/{{{token}}}.conf"
});

var LE = require('letsencrypt');

LE.create({
  server: LE.stagingServerUrl
, challengeType: "tls-sni-01"
, challenge: leChallenge
});
```

Either `hooksServer` or `hooksTemplate` must be provided. Some options default
to the values given above as marked.

The `hooksServer` option sets defaults for all the options below it to suit a
particular server/distro. The defaults can still be overridden by providing
values. Servers available so far include (contributions for additional servers
welcome):

* apache2-debian

If providing your own shell hooks or configuration file template, note that the
following substitutions are available:

* `{{{token}}}`: the token
* `{{{domain}}}`: the domain for which a certificate is being sought (beware of
  this if using multiple domains per certificate)
* `{{{subject}}}`: the domain for which the generated challenge-fulfilling
  certificate must be used (only available when generating it)
* `{{{cert}}}`: the path to the generated certificate: `hooksPath/token.crt`
* `{{{privkey}}}`: the path to the generated private key: `hooksPath/token.key`
* `{{{conf}}}`: the path to the generated config file: `hooksPath/token.conf`
* `{{{bind}}}`: the value of the `hooksBind` option
* `{{{port}}}`: the value of the `hooksPort` option
* `{{{webroot}}}`: the value of the `hooksWebroot` option

Exposed Methods
---------------

For ACME Challenge:

* `set(opts, domain, key, val, done)`
* `get(defaults, domain, key, done)`
* `remove(defaults, domain, key, done)`

For node-letsencrypt internals:

* `getOptions()` returns the internal defaults merged with the user-supplied options
