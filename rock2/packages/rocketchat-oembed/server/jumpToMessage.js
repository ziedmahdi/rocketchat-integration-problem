/* globals getAvatarUrlFromUsername */

const URL = Npm.require('url');
const QueryString = Npm.require('querystring');

RocketChat.callbacks.add('beforeSaveMessage', (msg) => {
	if (msg && msg.urls) {
		msg.urls.forEach((item) => {
			if (item.url.indexOf(Meteor.absoluteUrl()) === 0) {
				const urlObj = URL.parse(item.url);
				if (urlObj.query) {
					const queryString = QueryString.parse(urlObj.query);
					if (_.isString(queryString.msg)) { // Jump-to query param
						let jumpToMessage = RocketChat.models.Messages.findOneById(queryString.msg);
						if (jumpToMessage) {
							msg.attachments = msg.attachments || [];
							msg.attachments.push({
								'text' : jumpToMessage.msg,
								'author_name' : jumpToMessage.u.username,
								'author_icon' : getAvatarUrlFromUsername(jumpToMessage.u.username),
								'message_link' : item.url,
								'attachments' : jumpToMessage.attachments || [],
								'ts': jumpToMessage.ts
							});
							item.ignoreParse = true;
						}
					}
				}
			}
		});
	}
	return msg;
}, RocketChat.callbacks.priority.LOW, 'jumpToMessage');
