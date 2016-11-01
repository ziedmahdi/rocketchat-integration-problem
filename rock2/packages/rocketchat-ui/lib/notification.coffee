# @TODO implementar 'clicar na notificacao' abre a janela do chat
@KonchatNotification =
	notificationStatus: new ReactiveVar

	# notificacoes HTML5
	getDesktopPermission: ->
		if window.Notification && Notification.permission != "granted" && !Meteor.settings.public.sandstorm
			Notification.requestPermission (status) ->
				KonchatNotification.notificationStatus.set status
				if Notification.permission != status
					Notification.permission = status

	notify: (notification) ->
		if window.Notification && Notification.permission == "granted"
			message = { rid: notification.payload?.rid, msg: notification.text, notification: true }
			RocketChat.promises.run('onClientMessageReceived', message).then (message) ->
				n = new Notification notification.title,
					icon: notification.icon or getAvatarUrlFromUsername notification.payload.sender.username
					body: _.stripTags(message.msg)
					tag: notification.payload._id,
					silent: true

				notificationDuration = (notification.duration - 0) or (Meteor.user()?.settings?.preferences?.desktopNotificationDuration - 0) or RocketChat.settings.get('Desktop_Notifications_Duration')
				if notificationDuration > 0
					setTimeout ( -> n.close() ), notificationDuration * 1000

				if notification.payload?.rid?
					n.onclick = ->
						this.close()
						window.focus()
						switch notification.payload.type
							when 'd'
								FlowRouter.go 'direct', { username: notification.payload.sender.username }, FlowRouter.current().queryParams
							when 'c'
								FlowRouter.go 'channel', { name: notification.payload.name }, FlowRouter.current().queryParams
							when 'p'
								FlowRouter.go 'group', { name: notification.payload.name }, FlowRouter.current().queryParams

	showDesktop: (notification) ->
		if notification.payload.rid is Session.get('openedRoom') and window.document.hasFocus?()
			return

		if Meteor.user().status is 'busy' or Meteor.settings.public.sandstorm?
			return

		getAvatarAsPng notification.payload.sender.username, (avatarAsPng) ->
			notification.icon = avatarAsPng
			KonchatNotification.notify(notification)

	newMessage: ->
		if not Session.equals('user_' + Meteor.userId() + '_status', 'busy') and Meteor.user()?.settings?.preferences?.newMessageNotification isnt false
			$('#chatAudioNotification')[0].play()

	newRoom: (rid, withSound = true) ->
		Tracker.nonreactive ->
			newRoomSound = Session.get('newRoomSound')
			if newRoomSound?
				newRoomSound = _.union newRoomSound, rid
			else
				newRoomSound = [rid]

			Session.set('newRoomSound', newRoomSound)

		# $('.link-room-' + rid).addClass('new-room-highlight')

	removeRoomNotification: (rid) ->
		Tracker.nonreactive ->
			Session.set('newRoomSound', [])

		$('.link-room-' + rid).removeClass('new-room-highlight')

Tracker.autorun ->
	if Session.get('newRoomSound')?.length > 0
		Tracker.nonreactive ->
			if not Session.equals('user_' + Meteor.userId() + '_status', 'busy') and Meteor.user()?.settings?.preferences?.newRoomNotification isnt false
				$('#chatNewRoomNotification').each ->
					this.play?()
	else
		$('#chatNewRoomNotification').each ->
			this.pause?()
			this.currentTime = 0
