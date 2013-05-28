(function ($) {
	
	var $upload = $('#evidence-upload'),
	    $wrapper = $upload.find('.items'),
	    $template = $wrapper.find('.item'),
	    fileInput = $template.find('input')[0],
	    xhr = (window.XMLHttpRequest && new XMLHttpRequest()) || {};

	function basicForm () {
		// Add basic functionality to the form, allowing the user to
		// add/remove file inputs

		var $buttons = $upload.find('p'),
		    $addButton = $(document.createElement('input'));

		$addButton
			.val('Add')
			.addClass('btn')
			.attr('type', 'button')
			.attr('title', 'Add another file')
			.click(addRow)
			.prependTo($buttons);

		function addRow () {
			$template.clone(true).appendTo($wrapper);

			var $items = $wrapper.find('.item');

			if ($items.length <= 1)
				return;

			var $remove = $(document.createElement('button'));

			$remove
				.addClass('btn remove')
				.attr('title', 'Remove')
				.click(function () { return removeRow($(this).parent('.item')); })
				.text('✕');

			$items.append($remove);
		}

		function removeRow (row) {
			$(row).remove();

			if ($wrapper.find('.item').length <= 1)
				$wrapper.find('.remove').remove();

			return false;
		}
	}

	function advancedForm () {
		var itemCount = 0;

		function blockEvent (e) {
			e = e || window.event;

			e.stopPropagation();
			if (e.preventDefault) {
				return e.preventDefault();
			} else {
				return e.returnValue = false;
			}
		}

		function addRow (notRemovable) {
			var $item = $template.clone(true),
		        id = 'file-upload-' + (++itemCount);

			$item
				.find('label')
					.attr('for', id)
					.end()
				.find('input')
					.attr('id', id)
					.end();

			$wrapper.append($item);

			if ($wrapper.find('.item').length <= 1)
				return;

			$wrapper.find('.remove').remove();

			var $remove = $(document.createElement('button'));

			$remove
				.addClass('btn remove')
				.attr('title', 'Remove')
				.click(function () { return removeRow($(this).parent('.item')); })
				.text('✕');

			$wrapper.find('.item').append($remove);

			if (notRemovable)
				$item.find('.remove').remove();
		}

		function removeRow (row) {
			$(row).remove();

			if ($wrapper.find('.item').length <= 1)
				$wrapper.find('.remove').remove();

			return false;
		}

		$template.remove();

		var $description = $(document.createElement('div')),
		    $label = $(document.createElement('label'));

		$description
			.addClass('description')
			.html('<span><strong>Drop photos and videos here</strong> <em>or</em></span>')
			.prependTo($template);

		$label
			.addClass('btn')
			.text('Choose photos and videos to upload')
			.appendTo($description);

		$template.find('input[type="file"]').on('change', function () {
			var $item = $(this).parent('.item'),
			    $description = $item.find('.description'),
			    $filename = $(document.createElement('div')),
			    $icon = $(document.createElement('span')),
			    mediaType = this.files[0].type.split('/')[0],
			    display = this.files[0].name;

			if (this.files.length > 1) {
				$icon.addClass('icon-folder-open');
				display = this.files.length + ' files';
			} else {
				switch (mediaType) {
					case 'image': $icon.addClass('icon-picture'); break;
					case 'video': $icon.addClass('icon-facetime-video'); break;
					default:      $icon.addClass('icon-file');
				}
			}

			$filename
				.addClass('filename')
				.insertBefore($description)
				.text(' ' + display)
				.prepend($icon);

			$description.remove();

			addRow(true);
		});

		$(document.body)
			.on('dragover', function (e) {
				blockEvent(e);

				var x = e.originalEvent.pageX,
				    y = e.originalEvent.pageY,
				    $input = $upload.find('input[type="file"]').last(),
				    offset = $input.offsetParent().offset();

				$input.css({
					left: x - offset.left - 100,
					top: y - offset.top - 15
				});
			})
			.on('drop', function (e) {
				var $input = $upload.find('input[type="file"]').last();

				$input.css({
					left: '',
					top: ''
				});
			});

		$upload.addClass('advanced');
		addRow();
	}

	if (!fileInput.files) {
		// We don't have access to the file data stored in a file input,
		// so we're just going to put in some functionality to add multiple
		// rows to make life a bit simpler.
		return basicForm();
	}

	if (!xhr.upload) {
		// We can't upload files asynchronously, so we're just going to
		// tidy up the form 
		return advancedForm();
	}

	// This is where we should be, in an ideal world, with a suitably
	// advanced browser

	
})(jQuery);