'use strict';

var fs = require('fs'),
	mime = require('mime');

var PATH = __dirname + '/asset/';

var mApp,
	mAuthIpMap = {},
	mPortalUrl,
	mSite;


exports.init = function(app) {
	mApp = app;

	// 读取 portal 地址
	mPortalUrl = mApp.config['portal_url'];
	if (!mPortalUrl) {
		mApp.util.err('[SYS] portal url not specified');
		return;
	}

	// 
	var host = mApp.util.getSiteFromUrl(mPortalUrl);
	mSite = mApp.site.create(host, PATH);

	// 处理重定向
	mApp.msg.on('DomainQuery', handleQuery);
	mApp.msg.on('WebReqBegin', handleWebReqBegin);
	return true;
};


function handleQuery(e) {
	if (!isAuth(e.addr.address)) {
		e.hijack();
		return false;
	}
}

function handleWebReqBegin(e) {
	var req = e.clientReq;
	var ip = req.connection.remoteAddress;

	// 该 IP 已通过认证
	if (isAuth(ip)) {
		return false;
	}

	// ...
	if (mSite.request(e)) {
		return false;
	}

	// 重定向到 portal url
	e.output(302, {'location': mPortalUrl} );
	return false;
}

function isAuth(ip) {
	return mAuthIpMap[ip];
}
