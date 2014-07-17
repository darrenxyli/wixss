'use strict';

var net = require('net'),
	fs = require('fs');

var PATH = __dirname + '/asset/',
	RECORD_FILE = PATH + 'record.json';


var TYPE_WEB = 1,
	TYPE_APP = 2;

var mApp,
	//mRecord = require(RECORD_FILE),
	mCheckQueue = [],
	mTypeMap = {};


exports.init = function(app) {
	mApp = app;
	app.msg.on('DomainQuery', handleQuery);
	return true;
};


function handleQuery(e) {
	var domain = e.domain;

	function onCheckDone(isWebDomain) {
		if (isWebDomain) {
			mTypeMap[domain] = TYPE_WEB;
			e.hijack();
		}
		else {
			mTypeMap[domain] = TYPE_APP;
			e.proxy();
		}
	}

	switch(mTypeMap[domain]) {
	case TYPE_WEB:		// Web 域名
		e.hijack();
		break;
	case TYPE_APP:		// App 域名
		e.proxy();
		return;
	default:			// 未知域名，尝试连接 80/443 端口
		checkWebDomain(domain, onCheckDone);
		break;
	}
	return false;
}


function checkWebDomain(domain, callback) {

	// 该域名已在检测中，保存到队列
	var queue = mCheckQueue[domain];
	if (queue) {
		queue.push(callback);
		return;
	}

	queue = mCheckQueue[domain] = [callback];

	//
	// 队列回调
	//
	function queueCallback(status) {
		queue.forEach(function(cb) {
			cb(status);
		});
		delete mCheckQueue[domain];
	}

	conn(domain, 443, onConnHttps);

	//
	// 如果 443 端口开放，不劫持该域名，
	// 否则继续检测 80 端口。
	//
	function onConnHttps(success) {
		if (success) {
			mApp.util.warn('[DNS]', domain + ':443 is open');
			queueCallback(false);
		}
		else {
			conn(domain, 80, onConnHttp);
		}
	}

	//
	// 如果 80 端口开放，劫持该域名
	// 否则转发给外网 DNS 解析
	//
	function onConnHttp(success) {
		if (success) {
			queueCallback(true);
		}
		else {
			mApp.util.warn('[DNS]', domain + ':80 is not opened');
			queueCallback(false);
		}
	}
}


function conn(host, port, callback) {
	var s = net.connect(port, host, function() {
		s.destroy();
		callback(true);
	});

	function err() {
		s.destroy();
		callback(false);
	}

	s.setTimeout(2000, err);
	s.on('error', err);
}
