/* globals msgStream */
Meteor.methods({
	setReaction(reaction, messageId) {
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'setReaction' });
		}

		let message = RocketChat.models.Messages.findOneById(messageId);

		let room = Meteor.call('canAccessRoom', message.rid, Meteor.userId());

		if (!room) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'setReaction' });
		}

		const user = Meteor.user();

		if (Array.isArray(room.muted) && room.muted.indexOf(user.username) !== -1) {
			RocketChat.Notifications.notifyUser(Meteor.userId(), 'message', {
				_id: Random.id(),
				rid: room._id,
				ts: new Date(),
				msg: TAPi18n.__('You_have_been_muted', {}, user.language)
			});
			return false;
		} else if (!RocketChat.models.Subscriptions.findOne({ rid: message.rid })) {
			return false;
		}

		if (message.reactions && message.reactions[reaction] && message.reactions[reaction].usernames.indexOf(user.username) !== -1) {
			message.reactions[reaction].usernames.splice(message.reactions[reaction].usernames.indexOf(user.username), 1);

			if (message.reactions[reaction].usernames.length === 0) {
				delete message.reactions[reaction];
			}

			if (_.isEmpty(message.reactions)) {
				delete message.reactions;
				RocketChat.models.Messages.unsetReactions(messageId);
			} else {
				RocketChat.models.Messages.setReactions(messageId, message.reactions);
			}
		} else {
			if (!message.reactions) {
				message.reactions = {};
			}
			if (!message.reactions[reaction]) {
				message.reactions[reaction] = {
					usernames: []
				};
			}
			message.reactions[reaction].usernames.push(user.username);

			RocketChat.models.Messages.setReactions(messageId, message.reactions);
		}

		msgStream.emit(message.rid, message);

		return;
	}
});
