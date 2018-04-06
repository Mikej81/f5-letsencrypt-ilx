'use strict';

var challenge = require('./').create({});

var opts = challenge.getOptions();
var domain = 'example.com';
var token = 'token-id';
var key = 'secret-key';

// this will cause the prompt to appear
challenge.set(opts, domain, token, key, function (err) {
	// if there's an error, there's a problem
	if (err) {
		throw err;
	}

	// this will cause the final completion message to appear
	challenge.remove(opts, domain, token, function () {
	});
});
