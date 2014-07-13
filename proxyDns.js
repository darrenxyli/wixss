'use strict';

var os = require('os'),
	server = require('dgram').createSocket('udp4');


var TYPE_A = 1,
	FLARES = 0x8000,
	PUB_DNS = '8.8.8.8',
	QUERY_TIMEOUT = 10 * 1000,
	BUF_ANSWER = new Buffer([		//+16 bytes
		0xC0, 0x0C,					// domain ptr
		0x00, 0x01,					// type
		0x00, 0x01,					// class
		0x00, 0x00, 0x00, 0x0A,		// ttl
		0x00, 0x04,					// len
		0x00, 0x00, 0x00, 0x00,		// ip
	]);

var mApp,
	mIpBuf,
	mAddrMap = {};


function DnsProxy() {}

/**
 * 返回劫持者 IP
 */
DnsProxy.prototype.hijack = function() {
	this.reply(mIpBuf);
};

/**
 * 返回指定 IP
 */
DnsProxy.prototype.reply = function(ipBuf) {
	//
	// DNS回复包和请求包 前面部分相同，
	// 所以可在请求包的基础上扩充。
	//
	var addr = this.addr;
	var bufReq = this.data;
	var bufRes = new Buffer(bufReq.length + 16);
	bufReq.copy(bufRes);					// 前面部分（和请求的一样）

	ipBuf.copy(BUF_ANSWER, +12);			// 填充我们的IP地址
	BUF_ANSWER.copy(bufRes, bufReq.length);	// 后面部分（bufAns数据）

	bufRes.writeUInt16BE(0x8180, +2);		// [02~03] flags
	bufRes.writeUInt16BE(0x0001, +6);		// [06~07] answer-couter

	// 回复给用户
	server.send(bufRes,
		0, bufRes.length,
		addr.port,
		addr.address
	);
};

/**
 * 转发到公网
 */
DnsProxy.prototype.proxy = function() {
	var addr = this.addr;
	var data = this.data;

	mAddrMap[this.reqId] = this.addr;

	server.send(data,
		0, data.length,
		53,
		PUB_DNS
	);

	// 查询超时
	//rAddr._tid = setTimeout(function() {
	//	delete mAddrMap[reqId];
	//	//e.reply();
	//}, QUERY_TIMEOUT);
};


function setHijackIP(ip) {
	mApp.util.log('[DNS]', 'spoof:', ip);
	mIpBuf = new Buffer(ip.split('.'));
}

/**
 * 返回本机 IP 地址
 */
function getLocalIP() {
	var nifs = os.networkInterfaces();
	for(var i in nifs) {
		var adapters = nifs[i];

		for(var j in adapters) {
			var cfg = adapters[j];
			if (cfg.family != 'IPv4') {
				continue;
			}
			if (! /^(0|127|169)/.test(cfg.address)) {
				return cfg.address;
			}
		}
	}
}

/**
 * 分析域名字符
 */
function parseDomainString(data) {
	// FIXME
	var key = data.toString('utf8', +12, data.length - 5);
	return key.replace(/[\u0000-\u0020]/g, '.').substr(1);
}


server.on('message', function(data, rAddr) {

	var reqId = data.readUInt16BE(+0);
	var reqFlag = data.readUInt16BE(+2);

	//
	// 收到外网DNS的答复，转发给用户
	//
	if (reqFlag & FLARES) {
		rAddr = mAddrMap[reqId];
		if (rAddr) {
			//clearTimeout(rAddr._tid);
			server.send(data,
				0, data.length,
				rAddr.port,
				rAddr.address
			);
			delete mAddrMap[reqId];
		}
		return;
	}

	// 派发事件
	var e = new DnsProxy();
	e.addr = rAddr;
	e.reqId = reqId;
	e.data = data;

	// 忽略非 A 类请求
	var type = data.readUInt16BE(data.length - 4);
	if (type != TYPE_A) {
		e.proxy();
		return;
	}

	// 获取域名字符串
	var domain = parseDomainString(data);
	e.domain = domain;

	if (!mApp.param.quiet) {
		mApp.util.log('[DNS]',
			mApp.util.strPad(rAddr.address, 15), 'REQ '.bold, domain);
	}

	if (mApp.msg.emit('DomainQuery', e)) {
		// 默认处理：转发到公网DNS
		e.proxy();
	}
});


server.on('listening', function() {
	mApp.util.log('[DNS] running');
});

server.on('error', function() {
	mApp.util.err('[DNS] fail bind UDP:53');
});


exports.init = function(app) {
	mApp = app;

	var ip = getLocalIP();
	setHijackIP(ip);

	if (app.config['dns_pub']) {
		PUB_DNS = app.config['dns_pub'];
	}
	if (app.config['dns_query_timeout']) {
		QUERY_TIMEOUT = 1000 * app.config['dns_query_timeout'];
	}

	server.bind(53);
};
