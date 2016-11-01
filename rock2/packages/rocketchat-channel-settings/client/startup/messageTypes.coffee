Meteor.startup ->
	RocketChat.MessageTypes.registerType
		id: 'room_changed_privacy'
		system: true
		message: 'room_changed_privacy'
		data: (message) ->
			return {
				user_by: message.u?.username
				room_type: message.msg
			}

	RocketChat.MessageTypes.registerType
		id: 'room_changed_topic'
		system: true
		message: 'room_changed_topic'
		data: (message) ->
			return {
				user_by: message.u?.username
				room_topic: message.msg
			}

	RocketChat.MessageTypes.registerType
		id: 'room_changed_description'
		system: true
		message: 'room_changed_description'
		data: (message) ->
			user_by: message.u?.username
			room_description: message.msg
