Meteor.publish('livechat:integration', function() {
	if (!this.userId) {
		return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', { publish: 'livechat:integration' }));
	}

	if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
		return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', { publish: 'livechat:integration' }));
	}

	var self = this;

	var handle = RocketChat.models.Settings.findByIds(['Livechat_webhookUrl', 'Livechat_secret_token', 'Livechat_webhook_on_close', 'Livechat_webhook_on_offline_msg']).observeChanges({
		added(id, fields) {
			self.added('livechatIntegration', id, fields);
		},
		changed(id, fields) {
			self.changed('livechatIntegration', id, fields);
		},
		removed(id) {
			self.removed('livechatIntegration', id);
		}
	});

	self.ready();

	self.onStop(function() {
		handle.stop();
	});
});
