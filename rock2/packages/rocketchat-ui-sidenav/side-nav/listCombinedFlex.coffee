Template.listCombinedFlex.helpers
	channel: ->
		return Template.instance().channelsList?.get()
	hasMore: ->
		return Template.instance().hasMore.get()
	sortChannelsSelected: (sort) ->
		return Template.instance().sortChannels.get() is sort
	sortSubscriptionsSelected: (sort) ->
		return Template.instance().sortSubscriptions.get() is sort
	showSelected: (show) ->
		return Template.instance().show.get() is show
	channelTypeSelected: (type) ->
		return Template.instance().channelType.get() is type
	member: ->
		return !!RocketChat.models.Subscriptions.findOne({ name: @name, open: true })
	hidden: ->
		return !!RocketChat.models.Subscriptions.findOne({ name: @name, open: false })
	roomIcon: ->
		return RocketChat.roomTypes.getIcon @t
	url: ->
		return if @t is 'p' then 'group' else 'channel'
	canCreate: ->
		return RocketChat.authz.hasAtLeastOnePermission ['create-c', 'create-p']

Template.listCombinedFlex.events
	'click header': ->
		SideNav.closeFlex()

	'click .channel-link': ->
		SideNav.closeFlex()

	'click footer .create': ->
		if RocketChat.authz.hasAtLeastOnePermission( 'create-c')
			SideNav.setFlex "createCombinedFlex"

	'mouseenter header': ->
		SideNav.overArrow()

	'mouseleave header': ->
		SideNav.leaveArrow()

	'scroll .content': _.throttle (e, t) ->
		if t.hasMore.get() and e.target.scrollTop >= e.target.scrollHeight - e.target.clientHeight
			t.limit.set(t.limit.get() + 50)
	, 200

	'submit .search-form': (e) ->
		e.preventDefault()

	'keyup #channel-search': _.debounce (e, instance) ->
		instance.nameFilter.set($(e.currentTarget).val())
	, 300

	'change #sort-channels': (e, instance) ->
		instance.sortChannels.set($(e.currentTarget).val())

	'change #channel-type': (e, instance) ->
		instance.channelType.set($(e.currentTarget).val())

	'change #sort-subscriptions': (e, instance) ->
		instance.sortSubscriptions.set($(e.currentTarget).val())

	'change #show': (e, instance) ->
		show = $(e.currentTarget).val()
		if show is 'joined'
			instance.$('#sort-channels').hide();
			instance.$('#sort-subscriptions').show();
		else
			instance.$('#sort-channels').show();
			instance.$('#sort-subscriptions').hide();
		instance.show.set(show)

Template.listCombinedFlex.onCreated ->
	@channelsList = new ReactiveVar []
	@hasMore = new ReactiveVar true
	@limit = new ReactiveVar 50
	@nameFilter = new ReactiveVar ''
	@sortChannels = new ReactiveVar 'name'
	@sortSubscriptions = new ReactiveVar 'name'
	@channelType = new ReactiveVar 'all'
	@show = new ReactiveVar 'all'
	@type = if @t is 'p' then 'group' else 'channel'

	@autorun =>
		if @show.get() is 'joined'
			@hasMore.set true
			options =  { fields: { name: 1, t: 1 } }
			if _.isNumber @limit.get()
				options.limit = @limit.get()
			if _.trim(@sortSubscriptions.get())
				switch @sortSubscriptions.get()
					when 'name'
						options.sort = { name: 1 }
					when 'ls'
						options.sort = { ls: -1 }
			type = {$in: ['c', 'p']}
			if _.trim(@channelType.get())
				switch @channelType.get()
					when 'public'
						type = 'c'
					when 'private'
						type = 'p'
			@channelsList.set RocketChat.models.Subscriptions.find({
				name: new RegExp s.trim(s.escapeRegExp(@nameFilter.get())), "i"
				t: type
			}, options).fetch()
			if @channelsList.get().length < @limit.get()
				@hasMore.set false
		else
			Meteor.call 'channelsList', @nameFilter.get(), @channelType.get(), @limit.get(), @sortChannels.get(), (err, result) =>
				if result
					@hasMore.set true
					@channelsList.set result.channels
					if result.channels.length < @limit.get()
						@hasMore.set false
