Template.permissionsRole.helpers
	role: ->
		return RocketChat.models.Roles.findOne({ _id: FlowRouter.getParam('name') }) or {}

	userInRole: ->
		return Template.instance().usersInRole.get()

	editing: ->
		return FlowRouter.getParam('name')?

	emailAddress: ->
		if @emails?.length > 0
			return @emails[0].address

	hasPermission: ->
		return RocketChat.authz.hasAllPermission 'access-permissions'

	protected: ->
		return @protected

	editable: ->
		return @_id? and not @protected

	hasUsers: ->
		return Template.instance().usersInRole.get() && Template.instance().usersInRole.get().count() > 0

	hasMore: ->
		return Template.instance().limit?.get() <= Template.instance().usersInRole.get().count()

	isLoading: ->
		return 'btn-loading' unless Template.instance().ready?.get()

	searchRoom: ->
		return Template.instance().searchRoom.get()

	autocompleteChannelSettings: ->
		return {
			limit: 10
			# inputDelay: 300
			rules: [
				{
					collection: 'CachedChannelList'
					subscription: 'channelAndPrivateAutocomplete'
					field: 'name'
					template: Template.roomSearch
					noMatchTemplate: Template.roomSearchEmpty
					matchAll: true
					sort: 'name'
					selector: (match) ->
						return { name: match }
				}
			]
		}

	autocompleteUsernameSettings: ->
		return {
			limit: 10
			rules: [
				{
					collection: 'CachedUserList'
					subscription: 'userAutocomplete'
					field: 'username'
					template: Template.userSearch
					noMatchTemplate: Template.userSearchEmpty
					matchAll: true
					filter:
						exceptions: Template.instance().usersInRole.get()?.fetch()
					selector: (match) ->
						return { term: match }
					sort: 'username'
				}
			]
		}

Template.permissionsRole.events

	'click .remove-user': (e, instance) ->
		e.preventDefault()

		swal
			title: t('Are_you_sure')
			type: 'warning'
			showCancelButton: true
			confirmButtonColor: '#DD6B55'
			confirmButtonText: t('Yes')
			cancelButtonText: t('Cancel')
			closeOnConfirm: false
			html: false
		, =>
			Meteor.call 'authorization:removeUserFromRole', FlowRouter.getParam('name'), @username, instance.searchRoom.get(), (error, result) ->
				if error
					return handleError(error)

				swal
					title: t('Removed')
					text: t('User_removed')
					type: 'success'
					timer: 1000
					showConfirmButton: false

	'submit #form-role': (e, instance) ->
		e.preventDefault()

		oldBtnValue = e.currentTarget.elements['save'].value

		e.currentTarget.elements['save'].value = t('Saving')

		roleData =
			description: e.currentTarget.elements['description'].value
			scope: e.currentTarget.elements['scope'].value

		if @_id
			roleData.name = @_id
		else
			roleData.name = e.currentTarget.elements['name'].value


		Meteor.call 'authorization:saveRole', roleData, (error, result) =>
			e.currentTarget.elements['save'].value = oldBtnValue
			if error
				return handleError(error)

			toastr.success t('Saved')

			if not @_id?
				FlowRouter.go 'admin-permissions-edit', { name: roleData.name }


	'submit #form-users': (e, instance) ->
		e.preventDefault()

		if e.currentTarget.elements['username'].value.trim() is ''
			return toastr.error t('Please_fill_a_username')

		oldBtnValue = e.currentTarget.elements['add'].value

		e.currentTarget.elements['add'].value = t('Saving')

		Meteor.call 'authorization:addUserToRole', FlowRouter.getParam('name'), e.currentTarget.elements['username'].value, instance.searchRoom.get(), (error, result) =>
			e.currentTarget.elements['add'].value = oldBtnValue
			if error
				return handleError(error)

			instance.subscribe 'usersInRole', FlowRouter.getParam('name'), instance.searchRoom.get()
			toastr.success t('User_added')
			e.currentTarget.reset()

	'submit #form-search-room': (e) ->
		e.preventDefault()

	'click .delete-role': (e, instance) ->
		e.preventDefault()

		if @protected
			return toastr.error t('error-delete-protected-role')

		Meteor.call 'authorization:deleteRole', @_id, (error, result) ->
			if error
				return handleError(error)

			toastr.success t('Role_removed')

			FlowRouter.go 'admin-permissions'

	'click .load-more': (e, t) ->
		e.preventDefault()
		e.stopPropagation()
		t.limit.set t.limit.get() + 50

	'autocompleteselect input[name=room]': (event, template, doc) ->
		template.searchRoom.set(doc._id)

Template.permissionsRole.onCreated ->
	@searchRoom = new ReactiveVar
	@searchUsername = new ReactiveVar
	@usersInRole = new ReactiveVar
	@limit = new ReactiveVar 50
	@ready = new ReactiveVar true

	@subscribe 'roles', FlowRouter.getParam('name')

	@autorun =>
		if @searchRoom.get()
			@subscribe 'roomSubscriptionsByRole', @searchRoom.get(), FlowRouter.getParam('name')

		limit = @limit.get()
		subscription = @subscribe 'usersInRole', FlowRouter.getParam('name'), @searchRoom.get(), limit
		@ready.set subscription.ready()
		@usersInRole.set(RocketChat.models.Roles.findUsersInRole(FlowRouter.getParam('name'), @searchRoom.get(), { sort: { username: 1 } }))
