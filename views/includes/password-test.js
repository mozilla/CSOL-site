function passwordStrength (password) {
	if (!password)
		return 0;

	// Start the score at -10, to take into account
	// the fact that at least one variation at the end
	// will pass - and one variation isn't very variable
	var score = -10,
	    l = password.length,
	    letters = {};

	// Easy bonus for a long password
	if (l >= 12)
		score += 5;

	// Award every unique letter up to 5 repetitions
	while (--l + 1) {
		letters[password[l]] = (letters[password[l]]||0) + 1;
		score += Math.max(0, 5 - letters[password[l]] + 1);
	}

	// Award every character variant
	$.each([/\d/, /[a-z]/, /[A-Z]/, /\W/], function (i, re) {
		if (re.test(password))
			score += 10;
	});

	return score;
}

function setupPasswordStrengthTest () {
	var $password = $('#input-password'),
	    $result = $(document.createElement('div')),
	    $bar = $(document.createElement('div'));

	if (!$password.length)
		return;

	$password.addClass('metered');
	$bar.addClass('bar');

	$result
		.width($password.outerWidth())
		.addClass('progress password-meter')
		.append($bar)
		.insertAfter($password);

	$password.on('keyup', function() {
		var password = $password.val(),
		    strength = passwordStrength(password),
		    type;

		if (strength < 40)
			type = 'danger';
		else if (strength < 70)
			type = 'warning';
		else
			type = 'success';

		$bar.css('width', Math.min(100, strength) + '%');
		$bar[0].className = 'bar bar-' + type;
	});
}
