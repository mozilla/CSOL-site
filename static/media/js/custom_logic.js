$(document).ready(function(){

var mob = 0;
if( /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ) mob = 1

	$('.show-tooltip').tooltip();

	/*landing page overrides*/
	if($('body.home').length != 0) {
		if(!mob) {
			var vidLink = $('li.video').click(function(){
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
		}
	} 
	/*non-landing page mobile overrides*/
	else {
			/*sliding menu for movile devices*/
			if(mob) { 
				var dynWrap = $('<div id="dynWrap" style="display:none;"></div>');
				var dynList = $('<li id="dyn"></li>');
				var dynLink = $('<a href="#" title="">Menu</a>').click(function(){
					$('#dynWrap').slideToggle();
					return false;
				});
				$('ul.nav').prepend(dynList.append(dynLink), dynWrap);
				$('ul.nav li').each(function(){
				if ($(this).attr("id") != "dyn") {
        			$(this).appendTo("#dynWrap");
    			}
			});
		}
	}
});
