Package.describe({
	name: 'rocketchat:slackbridge',
	version: '0.0.1',
	summary: '',
	git: '',
	documentation: 'README.md'
});

Package.onUse(function(api) {
	api.use('ecmascript');
	api.use('rocketchat:lib');
	api.use('rocketchat:logger');

	api.addFiles('slashcommand/slackbridge_import.client.js', 'client');

	api.addFiles('logger.js', 'server');
	api.addFiles('settings.js', 'server');
	api.addFiles('slackbridge.js', 'server');
	api.addFiles('slashcommand/slackbridge_import.server.js', 'server');
});

Npm.depends({
	'slack-client': '2.0.4'
});
