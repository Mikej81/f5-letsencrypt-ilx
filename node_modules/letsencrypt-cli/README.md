[![Join the chat at https://gitter.im/Daplie/letsencrypt-express](https://badges.gitter.im/Daplie/letsencrypt-express.svg)](https://gitter.im/Daplie/letsencrypt-express?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

| [letsencrypt (library)](https://github.com/Daplie/node-letsencrypt)
| **letsencrypt-cli**
| [letsencrypt-express](https://github.com/Daplie/letsencrypt-express)
| [letsencrypt-koa](https://github.com/Daplie/letsencrypt-koa)
| [letsencrypt-hapi](https://github.com/Daplie/letsencrypt-hapi)
|

# letsencrypt-cli (for node.js)

CLI for node-letsencrypt modeled after the official client.

* Free SSL Certificates
* 90-day certificate lifetime
* One-off standalone registration / renewal
* On-the-fly registration / renewal via webroot

## Install Node

For **Windows**:

Choose **Stable** from <https://nodejs.org/en/>

For Linux and **OS X**:

```
curl -L bit.ly/nodejs-min | bash
```

# Install LetsEncrypt

```bash
npm install -g letsencrypt-cli@2.x
```

## Usage

These commands are shown using the **testing server**.

Want to use the **live server**?

1. remove the `--server https://acme-staging.api.letsencrypt.org/directory`
2. or change it to `--server https://acme-v01.api.letsencrypt.org/directory`

**Note**: This has really only been tested with single domains so if
multiple domains doesn't work for you, file a bug.

### Standalone (primarily for testing)

You can run standalone mode to get a cert **on the server**. You either use an
http-01 challenge (the default) on port 80, or a tls-sni-01 challenge on port
443 (or 5001). Like so:

```bash
letsencrypt certonly \
  --agree-tos --email john.doe@example.com \
  --standalone \
  --domains example.com,www.example.com \
  --server https://acme-staging.api.letsencrypt.org/directory \
  --config-dir ~/letsencrypt/etc
```

or

```bash
letsencrypt certonly \
  --agree-tos --email john.doe@example.com \
  --standalone --tls-sni-01-port 443 \
  --domains example.com,www.example.com \
  --server https://acme-staging.api.letsencrypt.org/directory \
  --config-dir ~/letsencrypt/etc
```

Then you can see your certs at `~/letsencrypt/etc/live`.

```
ls ~/letsencrypt/etc/live
```

This option is great for testing, but since it requires the use of
the same ports that your webserver needs, it isn't a good choice
for production.

### WebRoot (production option 1)

You can specify the path to where you keep your `index.html` with `webroot`, as
long as your server is serving plain HTTP on port 80.

For example, if I want to get a domain for `example.com` and my `index.html` is
at `/srv/www/example.com`, then I would use this command:

```bash
sudo letsencrypt certonly \
  --agree-tos --email john.doe@example.com \
  --webroot --webroot-path /srv/www/example.com \
  --config-dir /etc/letsencrypt \
  --domains example.com,www.example.com \
  --server https://acme-staging.api.letsencrypt.org/directory
```

Note that we use `sudo` because in this example we are using `/etc/letsencrypt`
as the cert directory rather than `~/letsencrypt/etc`, which we used in the previous example.

Then see your brand new shiny certs:

```
ls /etc/letsencrypt/live/
```

You can use a cron job to run the script above every 80 days (the certificates expire after 90 days)
so that you always have fresh certificates.

### Hooks (production option 2)

You can also integrate with a secure server. This is more complicated than the
webroot option, but it allows you to obtain certificates with only port 443
open. This facility can work with any web server as long as it supports server
name indication (SNI) and you can provide a configuration file template and
shell hooks to install and uninstall the configuration (without downtime). In
fact, it doesn't even need to be a webserver (though it must run on port 443);
it could be another server that performs SSL/TLS negotiation with SNI.

The process works something like this. You would run:

```bash
sudo letsencrypt certonly \
  --agree-tos --email john.doe@example.com \
  --hooks --hooks-server apache2-debian \
  --config-dir /etc/letsencrypt \
  --domains example.com,www.example.com \
  --server https://acme-staging.api.letsencrypt.org/directory
```

Three files are then generated:

* a configuration fragment: `some-long-string.conf`
* a challenge-fulfilling certificate: `the-same-long-string.crt`
* a private key: `the-same-long-string.key`

A hook is then run to enable the fragment, e.g. by linking it (it should not be
moved) into a `conf.d` directory (for Apache on Debian, `sites-enabled`). A
second hook is then run to check the configuration is valid, to avoid
accidental downtime, and then another to signal to the server to reload the
configuration. The server will now serve the generated certificate on a special
domain to prove you own the domain you're getting a certificate for.

After the domain has been validated externally, hooks are run to disable the
configuration fragment, and again check and reload the configuration.

You can then find your brand new certs in:

```
ls /etc/letsencrypt/live/
```

Tailor to your server and distro using the `--hooks-server` option. So far, the
following are supported (contributions for additional servers welcome):

* apache2-debian

To tweak it for your setup and taste, see all the `hooks-` options in the
Command Line Options section below. Also note that the following substitutions
are available for use in the hooks and the template:

* `{{{token}}}`: the token
* `{{{domain}}}`: the domain for which a certificate is being sought (beware of
  this if using multiple domains per certificate)
* `{{{subject}}}`: the domain for which the generated challenge-fulfilling
  certificate must be used (only available when generating it)
* `{{{cert}}}`: the path to the generated certificate: `hooks-path/token.crt`
* `{{{privkey}}}`: the path to the generated private key: `hooks-path/token.key`
* `{{{conf}}}`: the path to the generated config file: `hooks-path/token.conf`
* `{{{bind}}}`: the value of the `hooks-bind` option
* `{{{port}}}`: the value of the `hooks-port` option
* `{{{webroot}}}`: the value of the `hooks-webroot` option

### Interactive (for debugging)

The token (for all challenge types) and keyAuthorization (only for https-01)
will be printed to the screen and you will be given time to copy it wherever
(file, dns record, database, etc) and the process will complete once you hit `enter`.

```bash
sudo letsencrypt certonly \
  --agree-tos --email john.doe@example.com \
  --manual
  --config-dir /etc/letsencrypt \
  --domains example.com,www.example.com \
  --server https://acme-staging.api.letsencrypt.org/directory
```

## Test with a free domain

```bash
# Install Daplie DNS
npm install -g ddns-cli

# see terms of use
ddns --help

# agree to terms and get domain
ddns --random --email user@example.com --agree

# the default is to use the ip address from which
# you can the command, but you can also assign the
# ip manually
ddns --random --email user@example.com --agree -a '127.0.0.1'
```

Example domain:

```
rubber-duck-42.daplie.me
```

## Run without Root

If you'd like to allow node.js to use privileged ports `80` and `443`
(and everything under 1024 really) without being run as `root` or `sudo`,
you can use `setcap` to do so. (it may need to be run any time you reinstall node as well)

```bash
sudo setcap cap_net_bind_service=+ep /usr/local/bin/node
```

By default `node-letsencrypt` assumes your home directory `~/letsencrypt/`, but if
you really want to use `/etc/letsencrypt`, `/var/lib/letsencrypt/`, and `/var/log/letsencrypt`
you could change the permissions on them. **Probably a BAD IDEA**. Probabry a security risk.

```
# PROBABLY A BAD IDEA
sudo chown -R $(whoami) /etc/letsencrypt /var/lib/letsencrypt /var/log/letsencrypt
```

## Command Line Options

```
Usage:
  letsencrypt [OPTIONS] [ARGS]

Options:
      --server [STRING]         ACME Directory Resource URI. (Default is https://acme-v01.api.letsencrypt.org/directory))

      --email EMAIL             Email used for registration and recovery contact. (default: null)

      --agree-tos BOOLEAN       Agree to the Let's Encrypt Subscriber Agreement

      --domains URL             Domain names to apply. For multiple domains you can enter a comma
                                separated list of domains as a parameter. (default: [])

      --renew-within [NUMBER]   Renew certificates this many days before expiry. (default: 7)

      --duplicate BOOLEAN       Allow getting a certificate that duplicates an existing one/is
                                an early renewal.

      --rsa-key-size [NUMBER]   Size (in bits) of the RSA key. (Default is 2048)

      --cert-path STRING        Path to where new cert.pem is saved
                                (Default is :conf/live/:hostname/cert.pem)

      --fullchain-path [STRING] Path to where new fullchain.pem (cert + chain) is saved
                                (Default is :conf/live/:hostname/fullchain.pem)

      --chain-path [STRING]     Path to where new chain.pem is saved
                                (Default is :conf/live/:hostname/chain.pem)

      --domain-key-path STRING  Path to privkey.pem to use for domain (default: generate new)

      --account-key-path STRING Path to privkey.pem to use for account (default: generate new)

      --config-dir STRING       Configuration directory. (Default is ~/letsencrypt/etc/)

      --tls-sni-01-port NUMBER  Use TLS-SNI-01 challenge type with this port.
                                (must be 443 with most production servers) (Boulder allows 5001 in testing mode)

      --http-01-port [NUMBER]   Use HTTP-01 challenge type with this port, used for SimpleHttp challenge. (Default is 80)
                                (must be 80 with most production servers)

      --dns-01                  Use DNS-01 challenge type.

      --standalone [BOOLEAN]    Obtain certs using a "standalone" webserver.  (Default is true)

      --manual [BOOLEAN]        Print the token and key to the screen and wait for you to hit enter,
                                giving you time to copy it somewhere before continuing. (Default is false)

      --webroot BOOLEAN         Obtain certs by placing files in a webroot directory.

      --webroot-path STRING     public_html / webroot path.

      --hooks BOOLEAN           Obtain certs with hooks that configure a webserver to meet TLS-SNI-01 challenges.

      --hooks-path STRING       Path in which to store files for hooks.
                                (Default is ~/letsencrypt/apache)

      --hooks-server STRING     Type of webserver to configure. Sets defaults for all the following --hooks- options.
                                Either --hooks-server or --hooks-template must be given.
                                (See the Hooks section above for a list of supported servers.)

      --hooks-template STRING   Template to use for hooks configuration file.
                                Either --hooks-server or --hooks-template must be given.

      --hooks-bind STRING       IP address to use in configuration for hooks. (Default is *)

      --hooks-port STRING       Port to use in configuration for hooks. (Default is 443)

      --hooks-webroot STRING    Webroot to use in configuration for hooks (e.g. empty dir).
                                Nothing should actually be served from here. (Default is /var/www)

      --hooks-pre-enable STRING Hook to check the webserver configuration prior to enabling.

      --hooks-enable STRING     Hook to enable the webserver configuration.

      --hooks-pre-reload STRING Hook to check the webserver configuration prior to reloading.

      --hooks-reload STRING     Hook to reload the webserver.

      --hooks-disable STRING    Hook to disable the webserver configuration.

      --debug BOOLEAN           show traces and logs

  -h, --help                    Display help and usage details
```

Note: some of the options may not be fully implemented. If you encounter a problem, please report a bug on the issues page.
