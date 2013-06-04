$(document).ready(function(){

var mob = 0;

if( /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ) mob = 1

	$('.show-tooltip').tooltip();
	
	/*move filter labels into the selectors*/
	if($('.navbar.filter').length != 0) {
		$('.navbar.filter form label').each(function(){
			var selectID = ($(this).attr('for'));
			var selectEle = $('#' + selectID);
			$('#' + selectID + ' option:first').text($(this).text());
			var selectWrap = $('<div class="selectWrapper"></div>').append(this,selectEle);
			$('.navbar.filter form').prepend(selectWrap);

		});
	}

	/*landing page overrides*/
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

		/*landing page menu rearrange*/
		$('<p id="rahm">This summer Mayor Rahm Emanuel is challenging all Chicago youth to participate in the Summer of Learning. School stops for the summer, but learning never should.</p>').prependTo('.footer .upper');
		$('<div id="bubbles"><span class="lt">Join the conversation on <a href="https://www.facebook.com/ChicagoSummerOfLearning" target="_blank">Facebook</a>.</span><span class="rt">share stories</span></div>').appendTo('.footer .upper');
		
		/*landing page mobile overrides*/
		if(mob) { 
			vidLink = '<a href="http://www.youtube.com/v/6WwpwtYNsNk">watch video</a>';
		}

		$('li.claim').after($('<li class="video"></li>').append(vidLink));
		$('li.log-in').before($('.about'));

		/*landing page menu text*/
		$('li.claim a').append('<span> badges</span>');
		$('li.learn a').append('<span> your city</span>');
		$('li.badges a').append('<span> Badges &</span>');
		$('li.about a').append('<span> the program</span>')
		$('li.challenges a').append('<span> your future.</span>');
	} else {
		/*non-landing page overrides*/
		if(mob) { 
		var dynWrap = $('<div id="dynWrap" style="display:none;"></div>');
		var dynList = $('<li id="dyn"></li>');
		var dynLink = $('<a href="#" title="">Menu</a>').click(function(){
			$('#dynWrap').slideToggle();
			return false;
		});

		$('ul.nav').prepend(dynList.append(dynLink), dynWrap);
		//dynLink.appendTo(dynWrap.prependTo());

		$('ul.nav li').each(function(){
			if ($(this).attr("id") != "dyn") {
        		$(this).appendTo("#dynWrap");
    		}
		});
		}
	}
});