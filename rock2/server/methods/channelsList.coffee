Meteor.methods
	channelsList: (filter, channelType, limit, sort) ->
		this.unblock()

		check filter, String
		check channelType, String
		check limit, Match.Optional(Number)
		check sort, Match.Optional(String)

		if not Meteor.userId()
			throw new Meteor.Error 'error-invalid-user', 'Invalid user', { method: 'channelsList' }

		options =  { fields: { name: 1, t: 1 }, sort: { msgs:-1 } }
		if _.isNumber limit
			options.limit = limit
		if _.trim(sort)
			switch sort
				when 'name'
					options.sort = { name: 1 }
				when 'msgs'
					options.sort = { msgs: -1 }

		roomTypes = []
		if channelType isnt 'private'
			if RocketChat.authz.hasPermission Meteor.userId(), 'view-c-room'
				roomTypes.push {type: 'c'}
			else if RocketChat.authz.hasPermission Meteor.userId(), 'view-joined-room'
				roomIds = _.pluck RocketChat.models.Subscriptions.findByTypeAndUserId('c', Meteor.userId()).fetch(), 'rid'
				roomTypes.push {type: 'c', ids: roomIds}

		if channelType isnt 'public' and RocketChat.authz.hasPermission Meteor.userId(), 'view-p-room'
			userPref = Meteor.user()?.settings?.preferences?.mergeChannels
			globalPref = RocketChat.settings.get('UI_Merge_Channels_Groups')
			mergeChannels = if userPref? then userPref else globalPref
			if mergeChannels
				roomTypes.push {type: 'p', username: Meteor.user().username}

		if roomTypes.length
			if filter
				return { channels: RocketChat.models.Rooms.findByNameContainingTypesWithUsername(filter, roomTypes, options).fetch() }
			else
				return { channels: RocketChat.models.Rooms.findContainingTypesWithUsername(roomTypes, options).fetch() }
		else
			return { channels: [] }
