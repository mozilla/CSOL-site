(function($, undefined) {
	if (typeof $ === "undefined" || $ === null)
		return;

	var oldXHR = $.ajaxSettings.xhr;

	$.ajaxSettings.xhr = function() {
		var xhr = oldXHR();

		if(xhr instanceof window.XMLHttpRequest) {
			xhr.addEventListener('progress', this.progress, false);
		}

		if(xhr.upload) {
			xhr.upload.addEventListener('progress', this.progress, false);
		}

		return xhr;
	};

	function initializeBasic (form, options) {
		var $form = $(form),
		    $wrapper = $(options.itemWrapper),
		    $template = $(options.template),
		    $buttons = $(options.buttonContainer),
		    $addButton = $(document.createElement('input')),
		    itemSelector = '.' + $template[0].className.replace(/\s+/g, '.');

		$form.addClass('basic');

		$addButton
			.val('Add')
			.addClass('btn')
			.attr('type', 'button')
			.attr('title', 'Add another file')
			.click(addRow)
			.prependTo($buttons);

		function addRow () {
			$template.clone().appendTo($wrapper);

			var $items = $wrapper.find(itemSelector);

			if ($items.length <= 1)
				return;

			var $remove = $(document.createElement('button'));

			$remove
				.addClass('btn remove')
				.attr('title', 'Remove')
				.text('✕')
				.click(function () {
					removeRow($(this).parent(itemSelector));
					return false;
				});

			$items.append($remove);
		}

		function removeRow (row) {
			$(row).remove();

			if ($wrapper.find(itemSelector).length <= 1)
				$wrapper.find('.remove').remove();
		}
	}

	function initializeAdvanced (form, options) {
		var $form = $(form),
		    $wrapper = $(options.itemWrapper),
		    $template = $(options.template),
		    $buttons = $(options.buttonContainer),
		    $description = $(document.createElement('div')),
		    $label = $(document.createElement('label')),
		    itemSelector = '.' + $template[0].className.replace(/\s+/g, '.'),
		    itemCount = 0,
		    xhr = (window.XMLHttpRequest && new XMLHttpRequest()) || {};

		$form.addClass('advanced');

		$template.remove();

		$description
			.addClass('description')
			.html('<span><strong>Drop photos and videos here</strong> <em>or</em></span>')
			.prependTo($template);

		$label
			.addClass('btn')
			.text('Choose photos and videos to upload')
			.appendTo($description)
			.click(function() { $(this).parents('.item').find('input').click(); });

		if (xhr.upload && window.FormData) {
			goAsync();
		} else {
			goStandard();
		}

		addRow();

		function blockEvent (e) {
			e = e || window.event;

			e.stopPropagation();
			if (e.preventDefault) {
				return e.preventDefault();
			} else {
				return e.returnValue = false;
			}
		}

		function addRow (append) {
			var $item = $template.clone(true),
		        id = 'upload-item-' + (++itemCount);

			$item
				.find('label')
					.attr('for', id)
					.end()
				.find('input[type="file"]')
					.attr('id', id)
					.end();

			if (append) {
				$item.insertAfter($wrapper.find(itemSelector).first());
			} else {
				$wrapper.prepend($item);
			}

			if ($wrapper.find(itemSelector).length <= 1)
				return;

			$wrapper.find('.remove').remove();

			var $remove = $(document.createElement('button'));

			$remove
				.addClass('btn remove')
				.attr('title', 'Remove')
				.text('✕')
				.click(function () {
					removeRow($(this).parent(itemSelector));
					return false;
				});

			var $items = $wrapper.find(itemSelector).append($remove);

			if (append) {
				$items.first().find('.remove').remove();
			} else {
				$item.find('.remove').remove();
			}

			return $item;
		}

		function removeRow (row) {
			$(row)
				.trigger('remove')
				.remove();

			if ($wrapper.find(itemSelector).length <= 1)
				$wrapper.find('.remove').remove();
		}

		function goAsync () {
			$buttons
				.find('.btn')
					.text('Done');

			function upload (e) {
				blockEvent(e);

				var e = e.originalEvent || e,
				    files = (e.dataTransfer||this).files,
				    $field = $(this),
				    $item = $field.parent(itemSelector);

				if ($field[0] !== $form[0])
					$field.remove();

				if (!$item.length)
					$item = addRow(true);

				$.each(files, function (index) {
					var $description = $item.find('.description'),
					    $filename = $(document.createElement('div')),
					    $icon = $(document.createElement('span')),
					    $progress = $(document.createElement('div')),
					    form = new FormData(),
					    xhr = new XMLHttpRequest(),
					    file = this,
					    key = e.timeStamp + '-' + index,
					    mediaType = file.type.split('/')[0],
					    display = file.name;

					switch (mediaType) {
						case 'image': $icon.addClass('icon-picture'); break;
						case 'video': $icon.addClass('icon-facetime-video'); break;
						default:      $icon.addClass('icon-file');
					}

					$filename
						.addClass('filename')
						.insertBefore($description)
						.text(' ' + display)
						.prepend($icon);

					$progress
						.addClass('progress progress-striped active')
						.html('<span class="bar"></span>')
						.insertBefore($description);

					$description.remove();

					form.append($field.attr('name') || options.field, file);
					$.each(options.params || {}, function (key, value) {
						form.append(key, value);
					});

					var transfer = $.ajax({
						url: options.action,
						type: options.method,
						cache: false,
						contentType: false,
						processData: false,
						data: form,
						progress: function (e) {
							if (!e.lengthComputable) return;

							var progress = Math.max(0, Math.min(100, 100 * e.loaded / e.total));
							$progress.find('.bar').css('width', progress + '%');
						}
					}).done(function (rsp) {
						if (rsp.status !== 'ok') {
							$progress
								.removeClass('progress-striped active')
								.addClass('progress-danger');
							$form.trigger('failed', {
								status: rsp.status,
								message: rsp.message,
								key: key
							});
							return;
						}

						$progress
							.removeClass('progress-striped active')
							.addClass('progress-success');

						$form.trigger('uploaded', {
							file: file,
							evidence: rsp.evidence[0],
							key: key
						});
					}).fail(function () {
						$progress
							.removeClass('progress-striped active')
							.addClass('progress-danger');

						$form.trigger('failed', {
							key: key
						});
					}).always(function () {
						$progress.find('.bar').css('width', '100%');
					});

					$item.on('remove', function () {
						transfer.abort();
						$form.trigger('removed', {
							file: file,
							key: key
						});
					});

					$item = addRow(e.type === "drop");
				});

				if (e.type === "drop")
					$item.remove();

				return false;
			}

			$template.find('input[type="file"]').on('change', upload);

			$form
				.addClass('async')
				.on('dragenter', blockEvent)
				.on('dragover', blockEvent)
				.on('drop', upload);
		}

		function goStandard () {
			$template.find('input[type="file"]').on('change', function () {
				var $item = $(this).parent(itemSelector),
				    $description = $item.find('.description'),
				    $filename = $(document.createElement('div')),
				    $icon = $(document.createElement('span')),
				    mediaType = this.files[0].type.split('/')[0],
				    display = this.files[0].name;

				if (this.files.length > 1) {
					$icon.addClass('icon-folder-open');
					if (display.length > 40) {
						var meta = display.match(/^(.*)(\.[^.]+)$/);
						display = meta[1].substr(0, 15) + '...' + meta[1].substr(-15) + (meta[2] ? meta[2] : '');
					}
					display += ' + ' + (this.files.length - 1) + ' more';
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

				addRow();
			});

			$form
				.addClass('standard')
				.on('dragover', function (e) {
					blockEvent(e);

					var x = e.originalEvent.pageX,
					    y = e.originalEvent.pageY,
					    $input = $wrapper.find('input[type="file"]').first(),
					    offset = $input.offsetParent().offset();

					$input.css({
						left: x - offset.left - 100,
						top: y - offset.top - 15
					});
				})
				.on('drop', function (e) {
					var $input = $wrapper.find('input[type="file"]').first();

					$input.css({
						left: '',
						top: ''
					});
				});
		}
	}

	function setup () {
		var input = document.createElement('input');
		input.type = 'file';
		if (!input.files)
			return initializeBasic;

		return initializeAdvanced;
	}

	var initialize = setup();

	$.fn.uploader = function (options) {
		this.each(function () {
			var $form = $(this),
			    $fields = $form.find('input[type="hidden"]'),
			    params = {};

			$fields.each(function() {
				params[this.name] = this.value;
			});

			return initialize(this, $.extend(options||{}, {
				action: $form.attr('action') || document.location.href,
				method: $form.attr('method'),
				field: 'media',
				params: params,
				itemWrapper: $form.find('.items'),
				template: $form.find('.item'),
				buttonContainer: $form.find('.buttons')
			}));
		});

		return $(this);
	}
})(jQuery);