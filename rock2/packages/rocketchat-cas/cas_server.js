/* globals RoutePolicy, logger */
/* jshint newcap: false */

var fiber = Npm.require('fibers');
var url = Npm.require('url');
var CAS = Npm.require('cas');

var _casCredentialTokens = {};

RoutePolicy.declare('/_cas/', 'network');

var closePopup = function(res) {
	res.writeHead(200, {'Content-Type': 'text/html'});
	var content = '<html><head><script>window.close()</script></head></html>';
	res.end(content, 'utf-8');
};

var casTicket = function(req, token, callback) {

	// get configuration
	if (!RocketChat.settings.get('CAS_enabled')) {
		logger.error('Got ticket validation request, but CAS is not enabled');
		callback();
	}

	// get ticket and validate.
	var parsedUrl = url.parse(req.url, true);
	var ticketId = parsedUrl.query.ticket;
	var baseUrl = RocketChat.settings.get('CAS_base_url');
	var cas_version = parseFloat(RocketChat.settings.get('CAS_version'));
	var appUrl = Meteor.absoluteUrl().replace(/\/$/, '') + __meteor_runtime_config__.ROOT_URL_PATH_PREFIX;
	logger.debug('Using CAS_base_url: ' + baseUrl);

	var cas = new CAS({
		base_url: baseUrl,
		version: cas_version,
		service: appUrl + '/_cas/' + token
	});

	cas.validate(ticketId, function(err, status, username, details) {
		if (err) {
			logger.error('error when trying to validate: ' + err.message);
		} else if (status) {
			logger.info('Validated user: ' + username);
			var user_info = { username: username };

			// CAS 2.0 attributes handling
			if (details && details.attributes) {
				_.extend(user_info, { attributes: details.attributes });
			}
			_casCredentialTokens[token] = user_info;
		} else {
			logger.error('Unable to validate ticket: ' + ticketId);
		}
		//logger.debug("Receveied response: " + JSON.stringify(details, null , 4));

		callback();
	});

	return;
};

var middleware = function(req, res, next) {
	// Make sure to catch any exceptions because otherwise we'd crash
	// the runner
	try {
		var barePath = req.url.substring(0, req.url.indexOf('?'));
		var splitPath = barePath.split('/');

		// Any non-cas request will continue down the default
		// middlewares.
		if (splitPath[1] !== '_cas') {
			next();
			return;
		}

		// get auth token
		var credentialToken = splitPath[2];
		if (!credentialToken) {
			closePopup(res);
			return;
		}

		// validate ticket
		casTicket(req, credentialToken, function() {
			closePopup(res);
		});

	} catch (err) {
		logger.error('Unexpected error : ' + err.message);
		closePopup(res);
	}
};

// Listen to incoming OAuth http requests
WebApp.connectHandlers.use(function(req, res, next) {
	// Need to create a fiber since we're using synchronous http calls and nothing
	// else is wrapping this in a fiber automatically
	fiber(function() {
		middleware(req, res, next);
	}).run();
});

var _hasCredential = function(credentialToken) {
	return _.has(_casCredentialTokens, credentialToken);
};

/*
 * Retrieve token and delete it to avoid replaying it.
 */
var _retrieveCredential = function(credentialToken) {
	var result = _casCredentialTokens[credentialToken];
	delete _casCredentialTokens[credentialToken];
	return result;
};

/*
 * Register a server-side login handle.
 * It is call after Accounts.callLoginMethod() is call from client.
 *
 */
Accounts.registerLoginHandler(function(options) {

	if (!options.cas) {
		return undefined;
	}

	if (!_hasCredential(options.cas.credentialToken)) {
		throw new Meteor.Error(Accounts.LoginCancelledError.numericError,
		'no matching login attempt found');
	}

	var result = _retrieveCredential(options.cas.credentialToken);
	var syncUserDataFieldMap = RocketChat.settings.get('CAS_Sync_User_Data_FieldMap').trim();
	var cas_version = parseFloat(RocketChat.settings.get('CAS_version'));
	var sync_enabled = RocketChat.settings.get('CAS_Sync_User_Data_Enabled');

	// We have these
	var ext_attrs = {
		username: result.username
	};

	// We need these
	var int_attrs = {
		email: undefined,
		name: undefined,
		username: undefined,
		rooms: undefined
	};

	// Import response attributes
	if (cas_version >= 2.0) {
		// Clean & import external attributes
		_.each(result.attributes, function(value, ext_name) {
			if (value) {
				ext_attrs[ext_name] = value[0];
			}
		});
	}

	// Source internal attributes
	if (syncUserDataFieldMap) {

		// Our mapping table: key(int_attr) -> value(ext_attr)
		// Spoken: Source this internal attribute from these external attributes
		const attr_map = JSON.parse(syncUserDataFieldMap);

		_.each(attr_map, function(source, int_name) {
			// Source is our String to interpolate
			if (_.isString(source)) {
				_.each(ext_attrs, function(value, ext_name) {
					source = source.replace('%' + ext_name + '%', ext_attrs[ext_name]);
				});

				int_attrs[int_name] = source;
				logger.debug('Sourced internal attribute: ' + int_name + ' = ' + source);
			}
		});
	}

	// Search existing user by its external service id
	logger.debug('Looking up user by id: ' + result.username);
	var user = Meteor.users.findOne({ 'services.cas.external_id': result.username });

	if (user) {
		logger.debug('Using existing user for \'' + result.username + '\' with id: ' + user._id);
		if (sync_enabled) {
			logger.debug('Syncing user attributes');
			// Update name
			if (int_attrs.name) {
				Meteor.users.update(user, { $set: { name: int_attrs.name }});
			}

			// Update email
			if (int_attrs.email) {
				Meteor.users.update(user, { $set: { emails: [{ address: int_attrs.email, verified: true }] }});
			}
		}
	} else {

		// Define new user
		var newUser = {
			username: result.username,
			active: true,
			globalRoles: ['user'],
			emails: [],
			services: {
				cas: {
					external_id: result.username,
					version: cas_version,
					attrs: int_attrs
				}
			}
		};

		// Add User.name
		if (int_attrs.name) {
			_.extend(newUser, {
				name: int_attrs.name
			});
		}

		// Add email
		if (int_attrs.email) {
			_.extend(newUser, {
				emails: [{ address: int_attrs.email, verified: true }]
			});
		}

		// Create the user
		logger.debug('User "' + result.username + '" does not exist yet, creating it');
		var userId = Accounts.insertUserDoc({}, newUser);

		// Fetch and use it
		user = Meteor.users.findOne(userId);
		logger.debug('Created new user for \'' + result.username + '\' with id: ' + user._id);
		//logger.debug(JSON.stringify(user, undefined, 4));

		logger.debug('Joining user to default channels');
		Meteor.runAsUser(user._id, function() {
			Meteor.call('joinDefaultChannels');
		});

		logger.debug('Joining user to attribute channels: ' + int_attrs.rooms);
		if (int_attrs.rooms) {
			_.each(int_attrs.rooms.split(','), function(room_name) {
				if (room_name) {
					var room = RocketChat.models.Rooms.findOneByNameAndType(room_name, 'c');
					if (!room) {
						room = RocketChat.models.Rooms.createWithIdTypeAndName(Random.id(), 'c', room_name);
					}
					RocketChat.models.Rooms.addUsernameByName(room_name, result.username);
					RocketChat.models.Subscriptions.createWithRoomAndUser(room, user, {
						ts: new Date(),
						open: true,
						alert: true,
						unread: 1
					});
				}
			});
		}

	}

	return { userId: user._id };
});
