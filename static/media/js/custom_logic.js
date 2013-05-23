$(document).ready(function(){
	$('.show-tooltip').tooltip();


	$('.modal').on('show', function () {
		$('body').addClass('noscroll');
		$('.modal-container').show();
	});

	$('.modal').on('hide', function () {
		$('body').removeClass('noscroll');
		$('.modal-container').hide();
	});

});