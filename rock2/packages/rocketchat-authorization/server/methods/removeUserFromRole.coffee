Meteor.methods
	'authorization:removeUserFromRole': (roleName, username, scope) ->
		if not Meteor.userId() or not RocketChat.authz.hasPermission Meteor.userId(), 'access-permissions'
			throw new Meteor.Error "error-action-not-allowed", 'Access permissions is not allowed', { method: 'authorization:removeUserFromRole', action: 'Accessing_permissions' }

		if not roleName or not _.isString(roleName) or not username or not _.isString(username)
			throw new Meteor.Error 'error-invalid-arguments', 'Invalid arguments', { method: 'authorization:removeUserFromRole' }

		user = Meteor.users.findOne { username: username }, { fields: { _id: 1, roles: 1 } }

		if not user?._id?
			throw new Meteor.Error 'error-invalid-user', 'Invalid user', { method: 'authorization:removeUserFromRole' }

		# prevent removing last user from admin role
		if roleName is 'admin'
			adminCount = Meteor.users.find({ roles: { $in: ['admin'] } }).count()
			userIsAdmin = user.roles.indexOf('admin') > -1
			if adminCount is 1 and userIsAdmin
				throw new Meteor.Error 'error-action-not-allowed', 'Leaving the app without admins is not allowed', { method: 'removeUserFromRole', action: 'Remove_last_admin' }

		remove = RocketChat.models.Roles.removeUserRoles user._id, roleName, scope

		if RocketChat.settings.get('UI_DisplayRoles')
			RocketChat.Notifications.notifyAll('roles-change', { type: 'removed', _id: roleName, u: { _id: user._id, username: username }, scope: scope });

		return remove
