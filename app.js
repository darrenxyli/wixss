'use strict';

var os = require('os'),
	fs = require('fs'),
	param = require('commander'),
	config = require('./config.json'),
	util = require('./util'),
	msg = require('./msg'),
	proxyWeb = require('./proxyWeb.js'),
	proxyDns = require('./proxyDns.js');


exports.config = config;
exports.param = param;
exports.msg = msg;
exports.util = util;


function loadPlugin(name) {
	var mod = require('./plugin/' + name);
	mod.init(exports);
}

function main(argv) {
	param
		.version('1.0.1')
		.usage('[options]')
		.option('--portal', 'enable captive portal')
		.option('--ssl', 'enable https MITM')
		.option('--debug', 'debug mode (no obfuscate)')
		.option('--dump', 'dump http headers')
		.option('--quiet', 'no message output')
		.parse(argv);


	loadPlugin('domain_hijack');

	loadPlugin('injector');
	loadPlugin('poisoning');


	if (param.debug) {
		util.warn('[SYS]', 'DEBUG MODE'.bold, 'enabled');
	}

	if (param.portal) {
		util.warn('[SYS]', 'PORTAL MODE'.bold, 'enabled');
		loadPlugin('portal');
	}

	if (param.ssl) {
		util.warn('[SYS]', 'HTTPS-MITM'.bold, 'enabled');
		loadPlugin('sslclear');
	}

	proxyDns.init(exports);
	proxyWeb.init(exports);
}

main(process.argv);
