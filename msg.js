'use strict';

var evtMap = {};

exports.on = function(name, fn) {
	var list = evtMap[name] || (evtMap[name] = []);
	list.push(fn);
};

exports.emit = function(name, e) {
	var list = evtMap[name];
	if (list) {
		for (var i = 0, n = list.length; i < n; i++) {
			if (list[i](e) === false) {
				return false;
			}
		}
	}
	return true;
};
