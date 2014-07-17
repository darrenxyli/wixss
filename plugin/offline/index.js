'use strict';

var PATH = __dirname + '/asset/';


exports.init = function(app) {

	var site = app.site.create('*', PATH);
	site.setErrPage('_404.html');

	// hijack all dns & web request
	app.msg.on('DomainQuery', function(e) {
		e.hijack();
		return false;
	});

	app.msg.on('WebReqBegin', function(e) {
		if (site.request(e)) {
			// stop forward
			return false;
		}
	});
};
