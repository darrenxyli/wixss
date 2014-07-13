'use strict';

var http = require('http'),
	https = require('https'),
	zlib = require('zlib');

var POST_MAX_KB = 100 * 1024,
	POST_TIMEOUT = 10 * 1000;

var mApp,
	mPostMaxBytes,
	mPostTimeout;


function WebProxy() {}

/**
 * 返回错误
 */
WebProxy.prototype.error = function(err) {
	if (!mApp.param['quiet']) {
		mApp.util.err('[WEB]', err);
	}
	this.clientRes.writeHead(404);
	this.clientRes.end();
};

/**
 * 返回内容
 */
WebProxy.prototype.output = function(status, headers, buf) {
	var clientReq = this.clientReq,
		clientRes = this.clientRes;

	if (!buf || buf.length == 0) {
		flush();
	}

	// 用户支持的压缩算法
	var usrEnc = clientReq.headers['accept-encoding'];
	var fnEnc;

	if (usrEnc) {
		if (/gzip/i.test(usrEnc)) {
			fnEnc = zlib.gzip;
			headers['content-encoding'] = 'gzip';
		}
		else if (/deflate/i.test(usrEnc)) {
			fnEnc = zlib.deflate;
			headers['content-encoding'] = 'deflate';
		}
		else {
			delete headers['content-encoding'];
		}
	}

	var me = this;

	// 压缩返回数据
	if (fnEnc) {
		fnEnc(buf, function(err, data) {
			if (err) {
				me.error(err);
			} else {
				flush(data);
			}
		});
	}
	else {
		flush(buf);
	}

	function flush(data) {
		if (data && data.length > 0) {
			headers['content-length'] = data.length;
		}
		clientRes.writeHead(status, headers);
		clientRes.end(data);
	}
};

/**
 * 发起代理请求
 */
WebProxy.prototype.proxy = function() {

	var clientReq = this.clientReq,
		clientRes = this.clientRes,
		host = clientReq.headers['host'];

	var site = host,
		port = 80,
		p = host.indexOf(':');

	// 目标端口
	if (p != -1) {
		site = host.substr(0, p);
		port = +host.substr(p + 1) || 80;
	}

	// 请求参数
	var fn = this.secure ? https.request : http.request;
	var options = {
		host: site,
		port: port,
		method: clientReq.method,
		path: clientReq.url,
		headers: clientReq.headers
	};

	// 收到响应
	var me = this;
	var handler = fn(options, function(serverRes) {

		me.serverRes = serverRes;
		if (mApp.msg.emit('WebResBegin', me)) {
			// 默认转发处理
			clientRes.writeHead(serverRes.statusCode, serverRes.headers);
			serverRes.pipe(clientRes);
		}
	});

	handler.on('error', function(err) {
		me.error('proxy error');
	});

	handler.end(this.clientData);
}


/**
 * 客户端HTTP请求
 */
var R_URL = /^(https??):\/\/[^/]*(.*)/i;

function onHttpRequest(req, res) {

	var e = new WebProxy();
	e.clientReq = req;
	e.clientRes = res;

	var host = req.headers['host'];
	if (!host) {
		e.error('missing host');
		return;
	}

	// GET 绝对路径（浏览器代理）
	var m = req.url.match(R_URL);
	if (m) {
		e.fullUrl = req.url;

		// 是否 https？
		if (m[1].length == 5) {
			e.secure = true;
		}
		// 取相对路径
		req.url = m[2];
	}
	else {
		e.fullUrl = 'http://' + host + req.url;
	}


	if (!req.url) {
		e.error('invaild url');
		return;
	}


	// 请求日志
	if (!mApp.param['quiet']) {
		var addr = mApp.util.strPad(req.connection.remoteAddress, 15);
		var met = mApp.util.strPad(req.method, 4);

		mApp.util.log('[WEB]', addr, met.bold, mApp.util.formatUrl(e.fullUrl));

		if (mApp.param['dump']) {
			mApp.util.dumpRequest(req);
		}
	}

	// 派发`RequestBegin`
	if (!mApp.msg.emit('WebReqBegin', e)) {
		return;
	}

	// 等待 POST 完整数据
	var chunks = [];
	var bytes = 0;

	req.on('data', function(chunk) {
		chunks.push(chunk);
		bytes += chunk.length;

		// 超过最大接收数据
		if (bytes > POST_MAX_KB) {
			e.error('recv bytes exceed');
		}
	});

	req.on('end', function() {
		clearTimeout(wait);
		e.clientData = Buffer.concat(chunks, bytes);

		// 派发`WebReqDone`
		if (mApp.msg.emit('WebReqDone', e)) {
			e.proxy();
		}
	});

	// 接收超时处理
	var wait = setTimeout(function() {
		req.destroy();
		e.error('recv timeout');
	}, mPostTimeout);
}

/**
 * 启动代理服务
 */
exports.init = function(app) {
	mApp = app;

	// 最大提交数据
	if (mApp.config['post_max_kb']) {
		POST_MAX_KB = mApp.config['post_max_kb'] * 1024;
	}
	// 最长提交时间
	if (mApp.config['post_max_timeout']) {
		POST_TIMEOUT = mApp.config['post_max_timeout'] * 1000;
	}

    var svrHttp = http.createServer(onHttpRequest);

    svrHttp.listen(80, function() {
        mApp.util.log('[WEB] running');
    });

    svrHttp.on('error', function() {
        mApp.util.err('[WEB] fail bind TCP:80');
    });
};
