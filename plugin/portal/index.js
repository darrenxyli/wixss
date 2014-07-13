'use strict';

var fs = require('fs'),
	mime = require('mime');

var PATH = __dirname + '/asset/';


var mApp,
	mAuthedMap = {},
	mPortalUrl,
	mPortalSite;


exports.init = function(app) {
	mApp = app;

	// 读取 portal 地址
	mPortalUrl = mApp.config['portal_url'];
	if (!mPortalUrl) {
		mApp.util.err('[SYS] portal url not specified');
		return;
	}

	mPortalSite = mApp.util.getSiteFromUrl(mPortalUrl);

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

	// 认证页面
	//FIXME (host OR host:80)
	if (req.headers['host'].indexOf(mPortalSite) == 0) {
		processPortal(e);
		return false;
	}

	// 重定向到 portal url
	e.output(302, {'location': mPortalUrl} );
	return false;
}

function isAuth(ip) {
	return mAuthedMap[ip];
}


function processPortal(e) {
	var req = e.clientReq;
	var host = req.headers['host'];
	var path = req.url;

	if (path.substr(-1) == '/') {
		path += 'index.html';
	}

	// 本地文件路径
	path = PATH + path.replace(/\.\./g, '');

	var buf;
	try {
		buf = fs.readFileSync(path);
	}
	catch(e) {
		return;
	}
	e.output(200, {'content-type': mime.lookup(path)}, buf);
	return false;
}
