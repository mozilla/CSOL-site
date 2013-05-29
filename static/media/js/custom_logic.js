$(document).ready(function(){
	$('.show-tooltip').tooltip();
	if($('body.home').length != 0) {
		$('<img style="position:absolute; top:0; left:0;" src="/media/img/rahm-head.png">').prependTo('.footer .upper');
	}
});