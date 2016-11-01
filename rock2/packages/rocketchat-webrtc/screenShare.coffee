@ChromeScreenShare =
	screenCallback: undefined

	getSourceId: (callback) ->
		if not callback? then throw '"callback" parameter is mandatory.'

		ChromeScreenShare.screenCallback = callback
		window.postMessage('get-sourceId', '*')


window.addEventListener 'message', (e) ->
	if e.origin isnt window.location.origin
		return

	# "cancel" button was clicked
	if e.data is 'PermissionDeniedError'
		if ChromeScreenShare.screenCallback?
			return ChromeScreenShare.screenCallback('PermissionDeniedError')
		else
			throw new Error('PermissionDeniedError')

	# extension shared temp sourceId
	if e.data.sourceId?
		ChromeScreenShare.screenCallback?(e.data.sourceId)
