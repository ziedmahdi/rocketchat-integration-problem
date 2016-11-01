RocketChat.saveUser = function(userId, userData) {
	const user = RocketChat.models.Users.findOneById(userId);

	if (userData._id && userId !== userData._id && !RocketChat.authz.hasPermission(userId, 'edit-other-user-info')) {
		throw new Meteor.Error('error-action-not-allowed', 'Editing user is not allowed', { method: 'insertOrUpdateUser', action: 'Editing_user' });
	}

	if (!userData._id && !RocketChat.authz.hasPermission(userId, 'create-user')) {
		throw new Meteor.Error('error-action-not-allowed', 'Adding user is not allowed', { method: 'insertOrUpdateUser', action: 'Adding_user' });
	}

	if (userData.role === 'admin' && !RocketChat.authz.hasPermission(userId, 'assign-admin-role')) {
		throw new Meteor.Error('error-action-not-allowed', 'Assigning admin is not allowed', { method: 'insertOrUpdateUser', action: 'Assign_admin' });
	}

	if (!userData._id && !s.trim(userData.name)) {
		throw new Meteor.Error('error-the-field-is-required', 'The field Name is required', { method: 'insertOrUpdateUser', field: 'Name' });
	}

	if (!userData._id && !s.trim(userData.username)) {
		throw new Meteor.Error('error-the-field-is-required', 'The field Username is required', { method: 'insertOrUpdateUser', field: 'Username' });
	}

	let nameValidation;

	try {
		nameValidation = new RegExp('^' + RocketChat.settings.get('UTF8_Names_Validation') + '$');
	} catch (e) {
		nameValidation = new RegExp('^[0-9a-zA-Z-_.]+$');
	}

	if (userData.username && !nameValidation.test(userData.username)) {
		throw new Meteor.Error('error-input-is-not-a-valid-field', `${_.escape(userData.username)} is not a valid username`, { method: 'insertOrUpdateUser', input: userData.username, field: 'Username' });
	}

	if (!userData._id && !userData.password) {
		throw new Meteor.Error('error-the-field-is-required', 'The field Password is required', { method: 'insertOrUpdateUser', field: 'Password' });
	}

	if (!userData._id) {
		if (!RocketChat.checkUsernameAvailability(userData.username)) {
			throw new Meteor.Error('error-field-unavailable', `${_.escape(userData.username)} is already in use :(`, { method: 'insertOrUpdateUser', field: userData.username });
		}

		if (userData.email && !RocketChat.checkEmailAvailability(userData.email)) {
			throw new Meteor.Error('error-field-unavailable', `${_.escape(userData.email)} is already in use :(`, { method: 'insertOrUpdateUser', field: userData.email });
		}

		RocketChat.validateEmailDomain(userData.email);

		// insert user
		const createUser = {
			username: userData.username,
			password: userData.password
		};
		if (userData.email) {
			createUser.email = userData.email;
		}

		const _id = Accounts.createUser(createUser);

		const updateUser = {
			$set: {
				name: userData.name,
				roles: [ (userData.role || 'user') ]
			}
		};

		if (userData.requirePasswordChange) {
			updateUser.$set.requirePasswordChange = userData.requirePasswordChange;
		}

		if (userData.verified) {
			updateUser.$set['emails.0.verified'] = true;
		}

		Meteor.users.update({ _id: _id }, updateUser);

		if (userData.joinDefaultChannels) {
			Meteor.runAsUser(_id, () => {
				Meteor.call('joinDefaultChannels');
			});
		}

		if (userData.sendWelcomeEmail) {
			const header = RocketChat.placeholders.replace(RocketChat.settings.get('Email_Header') || '');
			const footer = RocketChat.placeholders.replace(RocketChat.settings.get('Email_Footer') || '');

			let subject, html, email;

			if (RocketChat.settings.get('Accounts_UserAddedEmail_Customized')) {
				subject = RocketChat.settings.get('Accounts_UserAddedEmailSubject');
				html = RocketChat.settings.get('Accounts_UserAddedEmail');
			} else {
				subject = TAPi18n.__('Accounts_UserAddedEmailSubject_Default', { lng: user.language || RocketChat.settings.get('language') || 'en' });
				html = TAPi18n.__('Accounts_UserAddedEmail_Default', { lng: user.language || RocketChat.settings.get('language') || 'en' });
			}

			subject = RocketChat.placeholders.replace(subject);
			html = RocketChat.placeholders.replace(html, {
				name: userData.name,
				email: userData.email,
				password: userData.password
			});

			email = {
				to: userData.email,
				from: RocketChat.settings.get('From_Email'),
				subject: subject,
				html: header + html + footer
			};

			Meteor.defer(function() {
				try {
					Email.send(email);
				} catch (error) {
					throw new Meteor.Error('error-email-send-failed', 'Error trying to send email: ' + error.message, { function: 'RocketChat.saveUser', message: error.message });
				}
			});
		}

		return _id;
	} else {
		// update user
		const updateUser = {
			$set: {}
		};

		if (userData.name) {
			updateUser.$set.name = userData.name;
		}

		if (userData.requirePasswordChange) {
			updateUser.$set.requirePasswordChange = userData.requirePasswordChange;
		}

		if (userData.verified) {
			updateUser.$set['emails.0.verified'] = true;
		} else {
			updateUser.$set['emails.0.verified'] = false;
		}

		Meteor.users.update({ _id: userData._id }, updateUser);

		if (userData.username) {
			RocketChat.setUsername(userData._id, userData.username);
		}

		if (userData.email) {
			RocketChat.setEmail(userData._id, userData.email);
		}

		if (userData.password && userData.password.trim() && RocketChat.authz.hasPermission(userId, 'edit-other-user-password')) {
			Accounts.setPassword(userData._id, userData.password.trim());
		}

		return true;
	}
};
