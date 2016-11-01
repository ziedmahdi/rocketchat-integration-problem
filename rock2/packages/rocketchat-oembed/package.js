Package.describe({
	name: 'rocketchat:oembed',
	version: '0.0.1',
	summary: 'Message pre-processor that insert oEmbed widget in template',
	git: ''
});

Npm.depends({
	'he': '1.1.0',
	'jschardet': '1.4.1',
	'iconv-lite': '0.4.13',
	'ip-range-check': '0.0.2'
});

Package.onUse(function(api) {
	api.use([
		'http',
		'templating',
		'ecmascript',
		'coffeescript',
		'underscore',
		'konecty:change-case',
		'rocketchat:lib'
	]);

	api.addFiles('client/baseWidget.html', 'client');
	api.addFiles('client/baseWidget.coffee', 'client');

	api.addFiles('client/oembedImageWidget.html', 'client');
	api.addFiles('client/oembedImageWidget.coffee', 'client');

	api.addFiles('client/oembedAudioWidget.html', 'client');
	api.addFiles('client/oembedAudioWidget.coffee', 'client');

	api.addFiles('client/oembedVideoWidget.html', 'client');
	api.addFiles('client/oembedVideoWidget.coffee', 'client');

	api.addFiles('client/oembedYoutubeWidget.html', 'client');
	api.addFiles('client/oembedYoutubeWidget.coffee', 'client');

	api.addFiles('client/oembedUrlWidget.html', 'client');
	api.addFiles('client/oembedUrlWidget.coffee', 'client');

	api.addFiles('client/oembedFrameWidget.html', 'client');
	api.addFiles('client/oembedFrameWidget.coffee', 'client');

	api.addFiles('client/oembedSandstormGrain.html', 'client');
	api.addFiles('client/oembedSandstormGrain.coffee', 'client');

	api.addFiles('server/server.coffee', 'server');
	api.addFiles('server/providers.coffee', 'server');
	api.addFiles('server/jumpToMessage.js', 'server');
	api.addFiles('server/models/OEmbedCache.coffee', 'server');

	api.export('OEmbed', 'server');
});
