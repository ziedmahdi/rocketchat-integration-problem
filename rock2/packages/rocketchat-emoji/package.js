Package.describe({
	name: 'rocketchat:emoji',
	version: '1.0.0',
	summary: 'Package and message pre-processor that supports aggregating multiple emoji packages',
	git: ''
});

Package.onUse(function(api) {
	api.use([
		'ecmascript',
		'underscore',
		'templating',
		'less',
		'rocketchat:lib',
		'rocketchat:ui-message'
	]);

	api.addFiles('function-isSet.js', 'client');
	api.addFiles('rocketchat.js', 'client');

	api.addFiles('emojiParser.js', 'client');

	api.addFiles('emojiPicker.html', 'client');
	api.addFiles('emojiPicker.js', 'client');

	api.addAssets('emojiPicker.less', 'server');
	api.addFiles('loadStylesheet.js', 'server');
	api.addFiles('emoji.css', 'client');

	api.addFiles('lib/emojiRenderer.js', 'client');
	api.addFiles('lib/EmojiPicker.js', 'client');
	api.addFiles('emojiButton.js', 'client');

	api.export('renderEmoji');
});
