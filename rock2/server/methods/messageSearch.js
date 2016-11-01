Meteor.methods({
	messageSearch: function(text, rid, limit) {
		var from, mention, options, query, r, result, currentUserName, currentUserId, currentUserTimezoneOffset;
		check(text, String);
		check(rid, String);
		check(limit, Match.Optional(Number));
		currentUserId = Meteor.userId();
		if (!currentUserId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'messageSearch'
			});
		}
		currentUserName = Meteor.user().username;
		currentUserTimezoneOffset = Meteor.user().utcOffset;

		// I would place these methods at the bottom of the file for clarity but travis doesn't appreciate that.
		// (no-use-before-define)

		function filterStarred() {
			query['starred._id'] = currentUserId;
			return '';
		}

		function filterUrl() {
			query['urls.0'] = {
				$exists: true
			};
			return '';
		}

		function filterPinned() {
			query.pinned = true;
			return '';
		}

		function filterLocation() {
			query.location = {
				$exist: true
			};
			return '';
		}

		function filterBeforeDate(_, day, month, year) {
			month--;
			var beforeDate = new Date(year, month, day);
			beforeDate.setHours(beforeDate.getUTCHours() + beforeDate.getTimezoneOffset()/60 + currentUserTimezoneOffset);
			query.ts = {
				$lte: beforeDate
			};
			return '';
		}

		function filterAfterDate(_, day, month, year) {
			month--;
			day++;
			var afterDate = new Date(year, month, day);
			afterDate.setUTCHours(afterDate.getUTCHours() + afterDate.getTimezoneOffset()/60 + currentUserTimezoneOffset);
			if (query.ts) {
				query.ts.$gte = afterDate;
			} else {
				query.ts = {
					$gte: afterDate
				};
			}
			return '';
		}

		function filterOnDate(_, day, month, year) {
			month--;
			var date, dayAfter;
			date = new Date(year, month, day);
			date.setUTCHours(date.getUTCHours() + date.getTimezoneOffset()/60 + currentUserTimezoneOffset);
			dayAfter = new Date(date);
			dayAfter.setDate(dayAfter.getDate() + 1);
			delete query.ts;
			query.ts = {
				$gte: date,
				$lt: dayAfter
			};
			return '';
		}

		function sortByTimestamp(_, direction) {
			if (direction.startsWith('asc')) {
				options.sort.ts = 1;
			} else if (direction.startsWith('desc')) {
				options.sort.ts = -1;
			}
			return '';
		}

		/*
		 text = 'from:rodrigo mention:gabriel chat'
		 */
		result = {
			messages: [],
			users: [],
			channels: []
		};
		query = {};
		options = {
			sort: {
				ts: -1
			},
			limit: limit || 20
		};

		// Query for senders
		from = [];
		text = text.replace(/from:([a-z0-9.-_]+)/ig, function(match, username) {
			if (username === 'me' && !from.includes(currentUserName)) {
				username = currentUserName;
			}
			from.push(username);
			return '';
		});
		if (from.length > 0) {
			query['u.username'] = {
				$regex: from.join('|'),
				$options: 'i'
			};
		}
		// Query for senders
		mention = [];
		text = text.replace(/mention:([a-z0-9.-_]+)/ig, function(match, username) {
			mention.push(username);
			return '';
		});
		if (mention.length > 0) {
			query['mentions.username'] = {
				$regex: mention.join('|'),
				$options: 'i'
			};
		}
		// Filter on messages that are starred by the current user.
		text = text.replace(/has:star/g, filterStarred);
		// Filter on messages that have an url.
		text = text.replace(/has:url|has:link/g, filterUrl);
		// Filter on pinned messages.
		text = text.replace(/is:pinned|has:pin/g, filterPinned);
		// Filter on messages which have a location attached.
		text = text.replace(/has:location|has:map/g, filterLocation);
		// Filtering before/after/on a date
		// matches dd-MM-yyyy, dd/MM/yyyy, dd-MM-yyyy, prefixed by before:, after: and on: respectively.
		// Example: before:15/09/2016 after: 10-08-2016
		// if "on:" is set, "before:" and "after:" are ignored.
		text = text.replace(/before:(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/g, filterBeforeDate);
		text = text.replace(/after:(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/g, filterAfterDate);
		text = text.replace(/on:(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/g, filterOnDate);
		// Sort order
		text = text.replace(/(?:order|sort):(asc|ascend|ascending|desc|descend|descening)/g, sortByTimestamp);

		// Query in message text
		text = text.trim().replace(/\s\s/g, ' ');
		if (text !== '') {
			if (/^\/.+\/[imxs]*$/.test(text)) {
				r = text.split('/');
				query.msg = {
					$regex: r[1],
					$options: r[2]
				};
			} else if (RocketChat.settings.get('Message_AlwaysSearchRegExp')) {
				query.msg = {
					$regex: text,
					$options: 'i'
				};
			} else {
				query.$text = {
					$search: text
				};
				options.fields = {
					score: {
						$meta: 'textScore'
					}
				};
			}
		}
		if (Object.keys(query).length > 0) {
			query.t = {
				$ne: 'rm'  //hide removed messages (useful when searching for user messages)
			};
			query._hidden = {
				$ne: true  // don't return _hidden messages
			};
			if (rid != null) {
				query.rid = rid;
				if (Meteor.call('canAccessRoom', rid, currentUserId) !== false) {
					if (!RocketChat.settings.get('Message_ShowEditedStatus')) {
						options.fields = {
							'editedAt': 0
						};
					}
					result.messages = RocketChat.models.Messages.find(query, options).fetch();
				}
			}
		}

		return result;
	}
});
