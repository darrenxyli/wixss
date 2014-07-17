'use strict';

var fs = require('fs'),
	mime = require('mime');


function Site(host, root) {
	this._host = host;
	this._root = root;
	this._cache = {};
}

/**
 * return true if succeed
 */
Site.prototype.request = function(e) {
	var req = e.clientReq;

	if (this._host != '*' && this._host != req.headers.host) {
		return;
	}

	var url = req.url;
	if (url.substr(-1) == '/') {
		url += 'index.html';
	}

	var buf = this._read(url);
	if (!buf) {
		buf = this._read(this._errPage);
		if (!buf) {
			return;
		}
	}

	e.output(200, {'content-type': mime.lookup(url)}, buf);
	return true;
};

Site.prototype.setErrPage = function(file) {
	this._errPage  = file;
};

Site.prototype.cacheFile = function(file) {
	var buf = readFile(file);
	if (buf) {
		mFileCache[file] = buf;
	}
};

Site.prototype.cacheFold = function() {

};

Site.prototype.cacheAll = function() {

};

Site.prototype._readFile = function(url) {
	try {
		var path = this._root + url.replace(/\.\./g, '');
		return fs.readFileSync(path);
	}
	catch(e) {}
};

Site.prototype._read = function(url) {
	var buf = this._cache[url];
	if (buf) {
		return buf;
	}
	return this._readFile(url);
};



exports.create = function(host, root) {
	return new Site(host, root);
};
