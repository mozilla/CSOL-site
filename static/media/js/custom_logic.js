$(document).ready(function(){
	$('.show-tooltip').tooltip();
	if($('body.home').length != 0) {
		var vidLink = $('<a href="#">watch video</a>').click(function(){
			if($('#i_vid').length == 0) {
				var bkgFade = $('<div id="bkg_fade" style="display:none;"></div>');
				var vidWrap = $('<div id="i_vid_wrap" style="display:none;"></div>');
				var vidClose = $('<a id="cl_i_vid" href="#">Close</a>').click(function(){
					$('#i_vid_wrap').fadeOut(function(){
						$(this).parent().fadeOut(function(){
							$(this).remove();
						});
					});
					return false;
				});
				$('body').prepend($(bkgFade).fadeIn(function() {
					$(this).append(vidWrap.append('<iframe id="i_vid" width="640" height="360" src="http://www.youtube.com/embed/6WwpwtYNsNk?autoplay=1&feature=player_detailpage" frameborder="0" allowfullscreen></iframe>', vidClose)).find('#i_vid_wrap').fadeIn();
				}));
			}
			return false;
		});
		$('<p id="rahm">This summer Mayor Rahm Emanuel is challenging all Chicago youth to participate in the Summer of Learning. School stops for the summer, but learning never should.</p>').prependTo('.footer .upper');
		$('<div id="bubbles"><span class="lt">join the conversation on <a href="#">Facebook</a>.</span><span class="rt">share stories</span></div>').appendTo('.footer .upper');
		$('li.challenges').after($('<li class="video"></li>').append(vidLink));
		$('li.learn a').append('<span> your city</span>');
		$('li.badges a').append('<span> Badges &</span>');
		$('li.challenges a').append('<span> your future.</span>');
	}
});