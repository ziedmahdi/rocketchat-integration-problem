###
# Markdown is a named function that will parse markdown syntax
# @param {Object} message - The message object
###

class Markdown
	constructor: (message) ->
		msg = message

		if not _.isString message
			if _.trim message?.html
				msg = message.html
			else
				return message

		schemes = RocketChat.settings.get('Markdown_SupportSchemesForLink').split(',').join('|')

		# Support ![alt text](http://image url)
		msg = msg.replace new RegExp("!\\[([^\\]]+)\\]\\(((?:#{schemes}):\\/\\/[^\\)]+)\\)", 'gm'), (match, title, url) ->
			target = if url.indexOf(Meteor.absoluteUrl()) is 0 then '' else '_blank'
			return '<a href="' + url + '" title="' + title + '" class="swipebox" target="' + target + '"><div class="inline-image" style="background-image: url(' + url + ');"></div></a>'

		# Support [Text](http://link)
		msg = msg.replace new RegExp("\\[([^\\]]+)\\]\\(((?:#{schemes}):\\/\\/[^\\)]+)\\)", 'gm'), (match, title, url) ->
			target = if url.indexOf(Meteor.absoluteUrl()) is 0 then '' else '_blank'
			return '<a href="' + url + '" target="' + target + '">' + title + '</a>'

		# Support <http://link|Text>
		msg = msg.replace new RegExp("(?:<|&lt;)((?:#{schemes}):\\/\\/[^\\|]+)\\|(.+?)(?=>|&gt;)(?:>|&gt;)", 'gm'), (match, url, title) ->
			target = if url.indexOf(Meteor.absoluteUrl()) is 0 then '' else '_blank'
			return '<a href="' + url + '" target="' + target + '">' + title + '</a>'

		if RocketChat.settings.get('Markdown_Headers')
			# Support # Text for h1
			msg = msg.replace(/^# (([\S\w\d-_\/\*\.,\\][ \u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]?)+)/gm, '<h1>$1</h1>')

			# Support # Text for h2
			msg = msg.replace(/^## (([\S\w\d-_\/\*\.,\\][ \u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]?)+)/gm, '<h2>$1</h2>')

			# Support # Text for h3
			msg = msg.replace(/^### (([\S\w\d-_\/\*\.,\\][ \u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]?)+)/gm, '<h3>$1</h3>')

			# Support # Text for h4
			msg = msg.replace(/^#### (([\S\w\d-_\/\*\.,\\][ \u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]?)+)/gm, '<h4>$1</h4>')

		# Support *text* to make bold
		msg = msg.replace(/(^|&gt;|[ >_~`])\*{1,2}([^\*\r\n]+)\*{1,2}([<_~`]|\B|\b|$)/gm, '$1<span class="copyonly">*</span><strong>$2</strong><span class="copyonly">*</span>$3')

		# Support _text_ to make italics
		msg = msg.replace(/(^|&gt;|[ >*~`])\_([^\_\r\n]+)\_([<*~`]|\B|\b|$)/gm, '$1<span class="copyonly">_</span><em>$2</em><span class="copyonly">_</span>$3')

		# Support ~text~ to strike through text
		msg = msg.replace(/(^|&gt;|[ >_*`])\~{1,2}([^~\r\n]+)\~{1,2}([<_*`]|\B|\b|$)/gm, '$1<span class="copyonly">~</span><strike>$2</strike><span class="copyonly">~</span>$3')

		# Support for block quote
		# >>>
		# Text
		# <<<
		msg = msg.replace(/(?:&gt;){3}\n+([\s\S]*?)\n+(?:&lt;){3}/g, '<blockquote><span class="copyonly">&gt;&gt;&gt;</span>$1<span class="copyonly">&lt;&lt;&lt;</span></blockquote>')

		# Support >Text for quote
		msg = msg.replace(/^&gt;(.*)$/gm, '<blockquote><span class="copyonly">&gt;</span>$1</blockquote>')

		# Remove white-space around blockquote (prevent <br>). Because blockquote is block element.
		msg = msg.replace(/\s*<blockquote>/gm, '<blockquote>')
		msg = msg.replace(/<\/blockquote>\s*/gm, '</blockquote>')

		# Remove new-line between blockquotes.
		msg = msg.replace(/<\/blockquote>\n<blockquote>/gm, '</blockquote><blockquote>')

		if not _.isString message
			message.html = msg
		else
			message = msg

		console.log 'Markdown', message if window?.rocketDebug

		return message


RocketChat.Markdown = Markdown
RocketChat.callbacks.add 'renderMessage', Markdown, RocketChat.callbacks.priority.HIGH, 'markdown'

if Meteor.isClient
	Blaze.registerHelper 'RocketChatMarkdown', (text) ->
		return RocketChat.Markdown text
