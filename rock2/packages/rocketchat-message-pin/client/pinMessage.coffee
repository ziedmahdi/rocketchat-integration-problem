Meteor.methods
	pinMessage: (message) ->
		if not Meteor.userId()
			return false

		if not RocketChat.settings.get 'Message_AllowPinning'
			return false

		if not RocketChat.models.Subscriptions.findOne({ rid: message.rid })?
			return false

		ChatMessage.update
			_id: message._id
		,
			$set: { pinned: true }

	unpinMessage: (message) ->
		if not Meteor.userId()
			return false

		if not RocketChat.settings.get 'Message_AllowPinning'
			return false

		if not RocketChat.models.Subscriptions.findOne({ rid: message.rid })?
			return false

		ChatMessage.update
			_id: message._id
		,
			$set: { pinned: false }
