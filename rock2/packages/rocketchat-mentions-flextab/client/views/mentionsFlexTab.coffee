Template.mentionsFlexTab.helpers
	hasMessages: ->
		return MentionedMessage.find({ rid: @rid }, { sort: { ts: -1 } }).count() > 0

	messages: ->
		return MentionedMessage.find { rid: @rid }, { sort: { ts: -1 } }

	message: ->
		return _.extend(this, { customClass: 'mentions' })

	notReadySubscription: ->
		return 'notready' unless Template.instance().subscriptionsReady()

	hasMore: ->
		return Template.instance().hasMore.get()

Template.mentionsFlexTab.onCreated ->
	@hasMore = new ReactiveVar true
	@limit = new ReactiveVar 50
	@autorun =>
		@subscribe 'mentionedMessages', @data.rid, @limit.get(), =>
			if MentionedMessage.find({ rid: @data.rid }).count() < @limit.get()
				@hasMore.set false

Template.mentionsFlexTab.events
	'click .message-cog': (e, t) ->
		e.stopPropagation()
		e.preventDefault()
		message_id = $(e.currentTarget).closest('.message').attr('id')
		RocketChat.MessageAction.hideDropDown()
		t.$("\##{message_id} .message-dropdown").remove()
		message = MentionedMessage.findOne message_id
		actions = RocketChat.MessageAction.getButtons message, 'mentions'
		el = Blaze.toHTMLWithData Template.messageDropdown, { actions: actions }
		t.$("\##{message_id} .message-cog-container").append el
		dropDown = t.$("\##{message_id} .message-dropdown")
		dropDown.show()

	'scroll .content': _.throttle (e, instance) ->
		if e.target.scrollTop >= e.target.scrollHeight - e.target.clientHeight && instance.hasMore.get()
			instance.limit.set(instance.limit.get() + 50)
	, 200
