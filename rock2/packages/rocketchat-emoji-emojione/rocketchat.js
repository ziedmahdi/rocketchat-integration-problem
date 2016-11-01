/* globals emojione, emojisByCategory, emojiCategories, toneList */
RocketChat.emoji.packages.emojione = emojione;
RocketChat.emoji.packages.emojione.imageType = 'png';
RocketChat.emoji.packages.emojione.sprites = true;
RocketChat.emoji.packages.emojione.emojisByCategory = emojisByCategory;
RocketChat.emoji.packages.emojione.emojiCategories = emojiCategories;
RocketChat.emoji.packages.emojione.toneList = toneList;

RocketChat.emoji.packages.emojione.render = function(emoji) {
	return emojione.toImage(emoji);
};

//http://stackoverflow.com/a/26990347 function isSet() from Gajus
function isSetNotNull(fn) {
	var value;
	try {
		value = fn();
	} catch (e) {
		value = null;
	} finally {
		return value !== null && value !== undefined;
	}
}

// RocketChat.emoji.list is the collection of emojis from all emoji packages
for (let key in emojione.emojioneList) {
	if (emojione.emojioneList.hasOwnProperty(key)) {
		let emoji = emojione.emojioneList[key];
		emoji.emojiPackage = 'emojione';
		RocketChat.emoji.list[key] = emoji;
	}
}

// Additional settings -- ascii emojis
Meteor.startup(function() {
	Tracker.autorun(function() {
		if (isSetNotNull(() => RocketChat.emoji.packages.emojione)) {
			if (isSetNotNull(() => Meteor.user().settings.preferences.convertAsciiEmoji)) {
				RocketChat.emoji.packages.emojione.ascii = Meteor.user().settings.preferences.convertAsciiEmoji;
			} else {
				RocketChat.emoji.packages.emojione.ascii = true;
			}
		}
	});
});
