var openCenteredPopup = function(url, width, height) {

	var screenX = typeof window.screenX !== 'undefined' ? window.screenX : window.screenLeft;
	var screenY = typeof window.screenY !== 'undefined' ? window.screenY : window.screenTop;
	var outerWidth = typeof window.outerWidth !== 'undefined' ? window.outerWidth : document.body.clientWidth;
	var outerHeight = typeof window.outerHeight !== 'undefined' ? window.outerHeight : (document.body.clientHeight - 22);
	// XXX what is the 22?

	// Use `outerWidth - width` and `outerHeight - height` for help in
	// positioning the popup centered relative to the current window
	var left = screenX + (outerWidth - width) / 2;
	var top = screenY + (outerHeight - height) / 2;
	var features = ('width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',scrollbars=yes');

	var newwindow = window.open(url, 'Login', features);
	if (newwindow.focus) {
		newwindow.focus();
	}

	return newwindow;
};

Meteor.loginWithCas = function(options, callback) {
	options = options || {};

	var credentialToken = Random.id();
	var login_url = RocketChat.settings.get('CAS_login_url');
	var popup_width = RocketChat.settings.get('CAS_popup_width');
	var popup_height = RocketChat.settings.get('CAS_popup_height');

	if (!login_url) {
		return;
	}

	var appUrl = Meteor.absoluteUrl().replace(/\/$/, '') + __meteor_runtime_config__.ROOT_URL_PATH_PREFIX;
	var loginUrl = login_url + '?service=' + appUrl + '/_cas/' + credentialToken;

	var popup = openCenteredPopup(
		loginUrl,
		popup_width || 800,
		popup_height || 600
	);

	// Fix for #3200: monitor the popup differently if it's Cordova
	if (Meteor.isCordova) {
		// Check the URL when each page finishes loading, and if the URL contains "ticket", then close the popup because CAS has finished
		popup.addEventListener('loadstop', function(e) {
			if (e.url.indexOf('?ticket=') !== -1) {
				popup.close();
			}
		});
		popup.addEventListener('exit', function() {
			// check auth on server.
			Accounts.callLoginMethod({
				methodArguments: [{ cas: { credentialToken: credentialToken } }],
				userCallback: callback
			});
		});
	} else {
		var checkPopupOpen = setInterval(function() {
			var popupClosed;
			try {
				// Fix for #328 - added a second test criteria (popup.closed === undefined)
				// to humour this Android quirk:
				// http://code.google.com/p/android/issues/detail?id=21061
				popupClosed = popup.closed || popup.closed === undefined;
			} catch (e) {
				// For some unknown reason, IE9 (and others?) sometimes (when
				// the popup closes too quickly?) throws "SCRIPT16386: No such
				// interface supported" when trying to read 'popup.closed'. Try
				// again in 100ms.
				return;
			}

			if (popupClosed) {
				clearInterval(checkPopupOpen);

				// check auth on server.
				Accounts.callLoginMethod({
					methodArguments: [{ cas: { credentialToken: credentialToken } }],
					userCallback: callback
				});
			}
		}, 100);
	}
};
