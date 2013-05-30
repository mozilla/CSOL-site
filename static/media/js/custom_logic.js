$(document).ready(function(){
	$('.show-tooltip').tooltip();
	if($('body.home').length != 0) {
		$('<p id="rahm">This summer Mayor Rahm Emanuel is challenging all Chicago youth to participate in the Summer of Learning. School stops for the summer, but learning never should.</p>').prependTo('.footer .upper');
		$('<div id="bubbles"><span class="lt">join the conversation on <a href="#">Facebook</a>.</span><span class="rt">share stories</span></div>').appendTo('.footer .upper');
		$('li.challenges').after('<li class="video"><a href="http://www.youtube.com/watch?v=6WwpwtYNsNk&feature=player_embedded" target=_blank>watch video</a></li>');
		$('li.learn a').append('<span> your city</span>');
		$('li.badges a').append('<span> Badges &</span>');
		$('li.challenges a').append('<span> your future.</span>');

	}
});