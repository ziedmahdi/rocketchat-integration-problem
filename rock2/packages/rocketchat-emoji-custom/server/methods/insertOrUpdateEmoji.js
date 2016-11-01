/* globals RocketChatFileEmojiCustomInstance */
Meteor.methods({
	insertOrUpdateEmoji(emojiData) {
		if (!RocketChat.authz.hasPermission(this.userId, 'manage-emoji')) {
			throw new Meteor.Error('not_authorized');
		}

		if (!s.trim(emojiData.name)) {
			throw new Meteor.Error('error-the-field-is-required', 'The field Name is required', { method: 'insertOrUpdateEmoji', field: 'Name' });
		}

		//let nameValidation = new RegExp('^[0-9a-zA-Z-_+;.]+$');
		//let aliasValidation = new RegExp('^[0-9a-zA-Z-_+;., ]+$');

		//allow all characters except colon, whitespace, comma, >, <, &, ", ', /, \, (, )
		//more practical than allowing specific sets of characters; also allows foreign languages
		let nameValidation = /[\s,:><&"'\/\\\(\)]/;
		let aliasValidation = /[:><&"'\/\\\(\)]/;

		//silently strip colon; this allows for uploading :emojiname: as emojiname
		emojiData.name = emojiData.name.replace(/:/g, '');
		emojiData.aliases = emojiData.aliases.replace(/:/g, '');

		if (nameValidation.test(emojiData.name)) {
			throw new Meteor.Error('error-input-is-not-a-valid-field', `${emojiData.name} is not a valid name`, { method: 'insertOrUpdateEmoji', input: emojiData.name, field: 'Name' });
		}

		if (emojiData.aliases) {
			if (aliasValidation.test(emojiData.aliases)) {
				throw new Meteor.Error('error-input-is-not-a-valid-field', `${emojiData.aliases} is not a valid alias set`, { method: 'insertOrUpdateEmoji', input: emojiData.aliases, field: 'Alias_Set' });
			}
			emojiData.aliases = emojiData.aliases.split(/[\s,]/);
			emojiData.aliases = emojiData.aliases.filter(Boolean);
			emojiData.aliases = _.without(emojiData.aliases, emojiData.name);
		} else {
			emojiData.aliases = [];
		}

		let matchingResults = [];

		if (emojiData._id) {
			matchingResults = RocketChat.models.EmojiCustom.findByNameOrAliasExceptID(emojiData.name, emojiData._id).fetch();
			for (let alias of emojiData.aliases) {
				matchingResults = matchingResults.concat(RocketChat.models.EmojiCustom.findByNameOrAliasExceptID(alias, emojiData._id).fetch());
			}
		} else {
			matchingResults = RocketChat.models.EmojiCustom.findByNameOrAlias(emojiData.name).fetch();
			for (let alias of emojiData.aliases) {
				matchingResults = matchingResults.concat(RocketChat.models.EmojiCustom.findByNameOrAlias(alias).fetch());
			}
		}

		if (matchingResults.length > 0) {
			throw new Meteor.Error('Custom_Emoji_Error_Name_Or_Alias_Already_In_Use', 'The custom emoji or one of its aliases is already in use', { method: 'insertOrUpdateEmoji' });
		}

		if (!emojiData._id) {
			//insert emoji
			let createEmoji = {
				name: emojiData.name,
				aliases: emojiData.aliases,
				extension: emojiData.extension
			};

			let _id = RocketChat.models.EmojiCustom.create(createEmoji);

			RocketChat.Notifications.notifyAll('updateEmojiCustom', {emojiData: createEmoji});

			return _id;
		} else {
			//update emoji
			if (emojiData.newFile) {
				RocketChatFileEmojiCustomInstance.deleteFile(encodeURIComponent(`${emojiData.name}.${emojiData.extension}`));
				RocketChatFileEmojiCustomInstance.deleteFile(encodeURIComponent(`${emojiData.name}.${emojiData.previousExtension}`));
				RocketChatFileEmojiCustomInstance.deleteFile(encodeURIComponent(`${emojiData.previousName}.${emojiData.extension}`));
				RocketChatFileEmojiCustomInstance.deleteFile(encodeURIComponent(`${emojiData.previousName}.${emojiData.previousExtension}`));

				RocketChat.models.EmojiCustom.setExtension(emojiData._id, emojiData.extension);
			} else if (emojiData.name !== emojiData.previousName) {
				let rs = RocketChatFileEmojiCustomInstance.getFileWithReadStream(encodeURIComponent(`${emojiData.previousName}.${emojiData.previousExtension}`));
				if (rs !== null) {
					RocketChatFileEmojiCustomInstance.deleteFile(encodeURIComponent(`${emojiData.name}.${emojiData.extension}`));
					let ws = RocketChatFileEmojiCustomInstance.createWriteStream(encodeURIComponent(`${emojiData.name}.${emojiData.previousExtension}`), rs.contentType);
					ws.on('end', Meteor.bindEnvironment(() =>
						RocketChatFileEmojiCustomInstance.deleteFile(encodeURIComponent(`${emojiData.previousName}.${emojiData.previousExtension}`))
						));
					rs.readStream.pipe(ws);
				}
			}

			if (emojiData.name !== emojiData.previousName) {
				RocketChat.models.EmojiCustom.setName(emojiData._id, emojiData.name);
			}

			if (emojiData.aliases) {
				RocketChat.models.EmojiCustom.setAliases(emojiData._id, emojiData.aliases);
			} else {
				RocketChat.models.EmojiCustom.setAliases(emojiData._id, []);
			}

			RocketChat.Notifications.notifyAll('updateEmojiCustom', {emojiData});

			return true;
		}
	}
});
