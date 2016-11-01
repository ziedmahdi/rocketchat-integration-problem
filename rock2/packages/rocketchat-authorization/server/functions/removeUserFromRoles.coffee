RocketChat.authz.removeUserFromRoles = (userId, roleNames, scope) ->
	if not userId or not roleNames
		return false

	user = RocketChat.models.Users.findOneById(userId)
	if not user?
		throw new Meteor.Error 'error-invalid-user', 'Invalid user', { function: 'RocketChat.authz.removeUserFromRoles' }

	roleNames = [].concat roleNames

	existingRoleNames = _.pluck(RocketChat.authz.getRoles(), '_id')
	invalidRoleNames = _.difference(roleNames, existingRoleNames)
	unless _.isEmpty(invalidRoleNames)
		throw new Meteor.Error 'error-invalid-role', 'Invalid role', { function: 'RocketChat.authz.removeUserFromRoles' }

	RocketChat.models.Roles.removeUserRoles(userId, roleNames, scope)

	return true
