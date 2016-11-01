/* globals LivechatVideoCall, Livechat */
// Functions to call on messages of type 'command'
this.Commands = {
	survey: function() {
		if (!($('body #survey').length)) {
			Blaze.render(Template.survey, $('body').get(0));
		}
	},

	endCall: function() {
		LivechatVideoCall.finish();
	},

	promptTranscript: function() {
		if (Livechat.transcript) {
			const user = Meteor.user();
			let email = user.emails && user.emails.length > 0 ? user.emails[0].address : '';

			swal({
				title: t('Chat_ended'),
				text: Livechat.transcriptMessage,
				type: 'input',
				inputValue: email,
				showCancelButton: true,
				cancelButtonText: t('no'),
				confirmButtonText: t('yes'),
				closeOnCancel: true,
				closeOnConfirm: false
			}, (response) => {
				if ((typeof response === 'boolean') && !response) {
					return true;
				} else {
					if (!response) {
						swal.showInputError(t('please enter your email'));
						return false;
					}
					if (response.trim() === '') {
						swal.showInputError(t('please enter your email'));
						return false;
					} else {
						Meteor.call('livechat:sendTranscript', visitor.getRoom(), response, (err) => {
							if (err) {
								console.error(err);
							}
							swal({
								title: t('transcript_sent'),
								type: 'success',
								timer: 1000,
								showConfirmButton: false
							});
						});
					}
				}
			});
		} else {
			swal({
				title: t('Chat_ended'),
				type: 'success',
				timer: 1000,
				showConfirmButton: false
			});
		}
	}
};
