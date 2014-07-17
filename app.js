'use strict';

var os = require('os'),
	fs = require('fs'),
	param = require('commander'),
	config = require('./config.json'),
	msg = require('./msg'),
	util = require('./util'),
	site = require('./site'),
	proxyWeb = require('./proxyWeb.js'),
	proxyDns = require('./proxyDns.js');


exports.config = config;
exports.param = param;
exports.msg = msg;
exports.util = util;
exports.site = site;


function init() {
	proxyWeb.init(exports);
	proxyDns.init(exports);
}

function loadPlugin(name) {
	var mod = require('./plugin/' + name);
	mod.init(exports);
}

function main(argv) {
	param
		.version('1.0.1')
		.usage('[options]')
		.option('--portal', 'enable captive portal')
		//.option('--ssl', 'enable https MITM')
		.option('--offline', 'offline mode')
		.option('--debug', 'debug mode (no obfuscate)')
		.option('--dump', 'dump http headers')
		.option('--quiet', 'no message output')
		.parse(argv);

	init();

	loadPlugin('injector');
	loadPlugin('poisoning');

	if (param.debug) {
		util.warn('[SYS]', 'DEBUG MODE'.bold, 'enabled');
	}

	if (param.portal) {
		util.warn('[SYS]', 'PORTAL MODE'.bold, 'enabled');
		loadPlugin('portal');
	}

	if (param.offline) {
		util.warn('[SYS]', 'OFFLINE MODE'.bold, 'enabled');
		loadPlugin('offline');
	}

	loadPlugin('domain_hijack');

	//if (param.ssl) {
	//	util.warn('[SYS]', 'HTTPS-MITM'.bold, 'enabled');
	//	loadPlugin('sslclear');
	//}
}

main(process.argv);
