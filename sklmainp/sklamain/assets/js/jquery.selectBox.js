;
(function($) {
    var SelectBox = window.SelectBox = function(select, options) {
        if (select instanceof jQuery) {
            if (select.length > 0) {
                select = select[0];
            } else {
                return;
            }
        }
        this.typeTimer = null;
        this.typeSearch = '';
        this.isMac = navigator.platform.match(/mac/i);
        options = 'object' === typeof options ? options : {};
        this.selectElement = select;
        if (!options.mobile && navigator.userAgent.match(/iPad|iPhone|Android|IEMobile|BlackBerry/i)) {
            return false;
        }
        if ('select' !== select.tagName.toLowerCase()) {
            return false;
        }
        this.init(options);
    };
    SelectBox.prototype.version = '1.2.0';
    SelectBox.prototype.init = function(options) {
        var select = $(this.selectElement);
        if (select.data('selectBox-control')) {
            return false;
        }
        var control = $('<a class="selectBox" />'),
            inline = select.attr('multiple') || parseInt(select.attr('size')) > 1,
            settings = options || {},
            tabIndex = parseInt(select.prop('tabindex')) || 0,
            self = this;
        control.width(select.outerWidth()).addClass(select.attr('class')).attr('title', select.attr('title') || '').attr('tabindex', tabIndex).css('display', 'inline-block').bind('focus.selectBox', function() {
            if (this !== document.activeElement && document.body !== document.activeElement) {
                $(document.activeElement).blur();
            }
            if (control.hasClass('selectBox-active')) {
                return;
            }
            control.addClass('selectBox-active');
            select.trigger('focus');
        }).bind('blur.selectBox', function() {
            if (!control.hasClass('selectBox-active')) {
                return;
            }
            control.removeClass('selectBox-active');
            select.trigger('blur');
        });
        if (!$(window).data('selectBox-bindings')) {
            $(window).data('selectBox-bindings', true).bind('scroll.selectBox', (settings.hideOnWindowScroll) ? this.hideMenus : $.noop).bind('resize.selectBox', this.hideMenus);
        }
        if (select.attr('disabled')) {
            control.addClass('selectBox-disabled');
        }
        select.bind('click.selectBox', function(event) {
            control.focus();
            event.preventDefault();
        });
        if (inline) {
            options = this.getOptions('inline');
            control.append(options).data('selectBox-options', options).addClass('selectBox-inline selectBox-menuShowing').bind('keydown.selectBox', function(event) {
                self.handleKeyDown(event);
            }).bind('keypress.selectBox', function(event) {
                self.handleKeyPress(event);
            }).bind('mousedown.selectBox', function(event) {
                if (1 !== event.which) {
                    return;
                }
                if ($(event.target).is('A.selectBox-inline')) {
                    event.preventDefault();
                }
                if (!control.hasClass('selectBox-focus')) {
                    control.focus();
                }
            }).insertAfter(select);
            if (!select[0].style.height) {
                var size = select.attr('size') ? parseInt(select.attr('size')) : 5;
                var tmp = control.clone().removeAttr('id').css({
                    position: 'absolute',
                    top: '-9999em'
                }).show().appendTo('body');
                tmp.find('.selectBox-options').html('<li><a>\u00A0</a></li>');
                var optionHeight = parseInt(tmp.find('.selectBox-options A:first').html('&nbsp;').outerHeight());
                tmp.remove();
                control.height(optionHeight * size);
            }
            this.disableSelection(control);
        } else {
            var label = $('<span class="selectBox-label" />'),
                arrow = $('<span class="selectBox-arrow" />');
            label.attr('class', this.getLabelClass()).html(this.getLabelHtml());
            options = this.getOptions('dropdown');
            options.appendTo('BODY');
            control.data('selectBox-options', options).addClass('selectBox-dropdown').append(label).append(arrow).bind('mousedown.selectBox', function(event) {
                if (1 === event.which) {
                    if (control.hasClass('selectBox-menuShowing')) {
                        self.hideMenus();
                    } else {
                        event.stopPropagation();
                        options.data('selectBox-down-at-x', event.screenX).data('selectBox-down-at-y', event.screenY);
                        self.showMenu();
                    }
                }
            }).bind('keydown.selectBox', function(event) {
                self.handleKeyDown(event);
            }).bind('keypress.selectBox', function(event) {
                self.handleKeyPress(event);
            }).bind('open.selectBox', function(event, triggerData) {
                if (triggerData && triggerData._selectBox === true) {
                    return;
                }
                self.showMenu();
            }).bind('close.selectBox', function(event, triggerData) {
                if (triggerData && triggerData._selectBox === true) {
                    return;
                }
                self.hideMenus();
            }).insertAfter(select);
            var labelWidth = control.width() -
                arrow.outerWidth() -
                (parseInt(label.css('paddingLeft')) || 0) -
                (parseInt(label.css('paddingRight')) || 0);
            label.width(labelWidth);
            this.disableSelection(control);
        }
        select.addClass('selectBox').data('selectBox-control', control).data('selectBox-settings', settings).hide();
    };
    SelectBox.prototype.getOptions = function(type) {
        var options;
        var select = $(this.selectElement);
        var self = this;
        var _getOptions = function(select, options) {
            select.children('OPTION, OPTGROUP').each(function() {
                if ($(this).is('OPTION')) {
                    if ($(this).length > 0) {
                        self.generateOptions($(this), options);
                    } else {
                        options.append('<li>\u00A0</li>');
                    }
                } else {
                    var optgroup = $('<li class="selectBox-optgroup" />');
                    optgroup.text($(this).attr('label'));
                    options.append(optgroup);
                    options = _getOptions($(this), options);
                }
            });
            return options;
        };
        switch (type) {
            case 'inline':
                options = $('<ul class="selectBox-options" />');
                options = _getOptions(select, options);
                options.find('A').bind('mouseover.selectBox', function(event) {
                    self.addHover($(this).parent());
                }).bind('mouseout.selectBox', function(event) {
                    self.removeHover($(this).parent());
                }).bind('mousedown.selectBox', function(event) {
                    if (1 !== event.which) {
                        return
                    }
                    event.preventDefault();
                    if (!select.selectBox('control').hasClass('selectBox-active')) {
                        select.selectBox('control').focus();
                    }
                }).bind('mouseup.selectBox', function(event) {
                    if (1 !== event.which) {
                        return;
                    }
                    self.hideMenus();
                    self.selectOption($(this).parent(), event);
                });
                this.disableSelection(options);
                return options;
            case 'dropdown':
                options = $('<ul class="selectBox-dropdown-menu selectBox-options" />');
                options = _getOptions(select, options);
                options.data('selectBox-select', select).css('display', 'none').appendTo('BODY').find('A').bind('mousedown.selectBox', function(event) {
                    if (event.which === 1) {
                        event.preventDefault();
                        if (event.screenX === options.data('selectBox-down-at-x') && event.screenY === options.data('selectBox-down-at-y')) {
                            options.removeData('selectBox-down-at-x').removeData('selectBox-down-at-y');
                            if (/android/i.test(navigator.userAgent.toLowerCase()) && /chrome/i.test(navigator.userAgent.toLowerCase())) {
                                self.selectOption($(this).parent());
                            }
                            self.hideMenus();
                        }
                    }
                }).bind('mouseup.selectBox', function(event) {
                    if (1 !== event.which) {
                        return;
                    }
                    if (event.screenX === options.data('selectBox-down-at-x') && event.screenY === options.data('selectBox-down-at-y')) {
                        return;
                    } else {
                        options.removeData('selectBox-down-at-x').removeData('selectBox-down-at-y');
                    }
                    self.selectOption($(this).parent());
                    self.hideMenus();
                }).bind('mouseover.selectBox', function(event) {
                    self.addHover($(this).parent());
                }).bind('mouseout.selectBox', function(event) {
                    self.removeHover($(this).parent());
                });
                var classes = select.attr('class') || '';
                if ('' !== classes) {
                    classes = classes.split(' ');
                    for (var i = 0; i < classes.length; i++) {
                        options.addClass(classes[i] + '-selectBox-dropdown-menu');
                    }
                }
                this.disableSelection(options);
                return options;
        }
    };
    SelectBox.prototype.getLabelClass = function() {
        var selected = $(this.selectElement).find('OPTION:selected');
        return ('selectBox-label ' + (selected.attr('class') || '')).replace(/\s+$/, '');
    };
    SelectBox.prototype.getLabelHtml = function() {
        var selected = $(this.selectElement).find('OPTION:selected');
        var labelHtml;
        if (selected.data('icon')) {
            labelHtml = '<i class="fa fa-' + selected.data('icon') + ' fa-fw fa-lg"></i> ' + selected.text();
        } else {
            labelHtml = selected.text();
        }
        return labelHtml || '\u00A0';
    };
    SelectBox.prototype.setLabel = function() {
        var select = $(this.selectElement);
        var control = select.data('selectBox-control');
        if (!control) {
            return;
        }
        control.find('.selectBox-label').attr('class', this.getLabelClass()).html(this.getLabelHtml());
    };
    SelectBox.prototype.destroy = function() {
        var select = $(this.selectElement);
        var control = select.data('selectBox-control');
        if (!control) {
            return;
        }
        var options = control.data('selectBox-options');
        options.remove();
        control.remove();
        select.removeClass('selectBox').removeData('selectBox-control').data('selectBox-control', null).removeData('selectBox-settings').data('selectBox-settings', null).show();
    };
    SelectBox.prototype.refresh = function() {
        var select = $(this.selectElement),
            control = select.data('selectBox-control'),
            type = control.hasClass('selectBox-dropdown') ? 'dropdown' : 'inline',
            options;
        control.data('selectBox-options').remove();
        options = this.getOptions(type);
        control.data('selectBox-options', options);
        switch (type) {
            case 'inline':
                control.append(options);
                break;
            case 'dropdown':
                this.setLabel();
                $("BODY").append(options);
                break;
        }
        if ('dropdown' === type && control.hasClass('selectBox-menuShowing')) {
            this.showMenu();
        }
    };
    SelectBox.prototype.showMenu = function() {
        var self = this,
            select = $(this.selectElement),
            control = select.data('selectBox-control'),
            settings = select.data('selectBox-settings'),
            options = control.data('selectBox-options');
        if (control.hasClass('selectBox-disabled')) {
            return false;
        }
        this.hideMenus();
        var borderBottomWidth = parseInt(control.css('borderBottomWidth')) || 0;
        var borderTopWidth = parseInt(control.css('borderTopWidth')) || 0;
        var pos = control.offset(),
            topPositionCorrelation = (settings.topPositionCorrelation) ? settings.topPositionCorrelation : 0,
            bottomPositionCorrelation = (settings.bottomPositionCorrelation) ? settings.bottomPositionCorrelation : 0,
            optionsHeight = options.outerHeight(),
            controlHeight = control.outerHeight(),
            maxHeight = parseInt(options.css('max-height')),
            scrollPos = $(window).scrollTop(),
            heightToTop = pos.top - scrollPos,
            heightToBottom = $(window).height() - (heightToTop + controlHeight),
            posTop = (heightToTop > heightToBottom) && (settings.keepInViewport == null ? true : settings.keepInViewport),
            width = control.innerWidth() >= options.innerWidth() ? control.innerWidth() + 'px' : 'auto',
            top = posTop ? pos.top - optionsHeight + borderTopWidth + topPositionCorrelation : pos.top + controlHeight - borderBottomWidth - bottomPositionCorrelation;
        if (heightToTop < maxHeight && heightToBottom < maxHeight) {
            if (posTop) {
                var maxHeightDiff = maxHeight - (heightToTop - 5);
                options.css({
                    'max-height': maxHeight - maxHeightDiff + 'px'
                });
                top = top + maxHeightDiff;
            } else {
                var maxHeightDiff = maxHeight - (heightToBottom - 5);
                options.css({
                    'max-height': maxHeight - maxHeightDiff + 'px'
                });
            }
        }
        options.data('posTop', posTop);
        options.width(width).css({
            top: top,
            left: control.offset().left
        }).addClass('selectBox-options selectBox-options-' + (posTop ? 'top' : 'bottom'));
        if (settings.styleClass) {
            options.addClass(settings.styleClass);
        }
        if (select.triggerHandler('beforeopen')) {
            return false;
        }
        var dispatchOpenEvent = function() {
            select.triggerHandler('open', {
                _selectBox: true
            });
        };
        switch (settings.menuTransition) {
            case 'fade':
                options.fadeIn(settings.menuSpeed, dispatchOpenEvent);
                break;
            case 'slide':
                options.slideDown(settings.menuSpeed, dispatchOpenEvent);
                break;
            default:
                options.show(settings.menuSpeed, dispatchOpenEvent);
                break;
        }
        if (!settings.menuSpeed) {
            dispatchOpenEvent();
        }
        var li = options.find('.selectBox-selected:first');
        this.keepOptionInView(li, true);
        this.addHover(li);
        control.addClass('selectBox-menuShowing selectBox-menuShowing-' + (posTop ? 'top' : 'bottom'));
        $(document).bind('mousedown.selectBox', function(event) {
            if (1 === event.which) {
                if ($(event.target).parents().andSelf().hasClass('selectBox-options')) {
                    return;
                }
                self.hideMenus();
            }
        });
    };
    SelectBox.prototype.hideMenus = function() {
        if ($(".selectBox-dropdown-menu:visible").length === 0) {
            return;
        }
        $(document).unbind('mousedown.selectBox');
        $(".selectBox-dropdown-menu").each(function() {
            var options = $(this),
                select = options.data('selectBox-select'),
                control = select.data('selectBox-control'),
                settings = select.data('selectBox-settings'),
                posTop = options.data('posTop');
            if (select.triggerHandler('beforeclose')) {
                return false;
            }
            var dispatchCloseEvent = function() {
                select.triggerHandler('close', {
                    _selectBox: true
                });
            };
            if (settings) {
                switch (settings.menuTransition) {
                    case 'fade':
                        options.fadeOut(settings.menuSpeed, dispatchCloseEvent);
                        break;
                    case 'slide':
                        options.slideUp(settings.menuSpeed, dispatchCloseEvent);
                        break;
                    default:
                        options.hide(settings.menuSpeed, dispatchCloseEvent);
                        break;
                }
                if (!settings.menuSpeed) {
                    dispatchCloseEvent();
                }
                control.removeClass('selectBox-menuShowing selectBox-menuShowing-' + (posTop ? 'top' : 'bottom'));
            } else {
                $(this).hide();
                $(this).triggerHandler('close', {
                    _selectBox: true
                });
                $(this).removeClass('selectBox-menuShowing selectBox-menuShowing-' + (posTop ? 'top' : 'bottom'));
            }
            options.css('max-height', '');
            options.removeClass('selectBox-options-' + (posTop ? 'top' : 'bottom'));
            options.data('posTop', false);
        });
    };
    SelectBox.prototype.selectOption = function(li, event) {
        var select = $(this.selectElement);
        li = $(li);
        var control = select.data('selectBox-control'),
            settings = select.data('selectBox-settings');
        if (control.hasClass('selectBox-disabled')) {
            return false;
        }
        if (0 === li.length || li.hasClass('selectBox-disabled')) {
            return false;
        }
        if (select.attr('multiple')) {
            if (event.shiftKey && control.data('selectBox-last-selected')) {
                li.toggleClass('selectBox-selected');
                var affectedOptions;
                if (li.index() > control.data('selectBox-last-selected').index()) {
                    affectedOptions = li.siblings().slice(control.data('selectBox-last-selected').index(), li.index());
                } else {
                    affectedOptions = li.siblings().slice(li.index(), control.data('selectBox-last-selected').index());
                }
                affectedOptions = affectedOptions.not('.selectBox-optgroup, .selectBox-disabled');
                if (li.hasClass('selectBox-selected')) {
                    affectedOptions.addClass('selectBox-selected');
                } else {
                    affectedOptions.removeClass('selectBox-selected');
                }
            } else if ((this.isMac && event.metaKey) || (!this.isMac && event.ctrlKey)) {
                li.toggleClass('selectBox-selected');
            } else {
                li.siblings().removeClass('selectBox-selected');
                li.addClass('selectBox-selected');
            }
        } else {
            li.siblings().removeClass('selectBox-selected');
            li.addClass('selectBox-selected');
        }
        if (control.hasClass('selectBox-dropdown')) {
            control.find('.selectBox-label').html(li.html());
        }
        var i = 0,
            selection = [];
        if (select.attr('multiple')) {
            control.find('.selectBox-selected A').each(function() {
                selection[i++] = $(this).attr('rel');
            });
        } else {
            selection = li.find('A').attr('rel');
        }
        control.data('selectBox-last-selected', li);
        if (select.val() !== selection) {
            select.val(selection);
            this.setLabel();
            select.trigger('change');
        }
        return true;
    };
    SelectBox.prototype.addHover = function(li) {
        li = $(li);
        var select = $(this.selectElement),
            control = select.data('selectBox-control'),
            options = control.data('selectBox-options');
        options.find('.selectBox-hover').removeClass('selectBox-hover');
        li.addClass('selectBox-hover');
    };
    SelectBox.prototype.getSelectElement = function() {
        return this.selectElement;
    };
    SelectBox.prototype.removeHover = function(li) {
        li = $(li);
        var select = $(this.selectElement),
            control = select.data('selectBox-control'),
            options = control.data('selectBox-options');
        options.find('.selectBox-hover').removeClass('selectBox-hover');
    };
    SelectBox.prototype.keepOptionInView = function(li, center) {
        if (!li || li.length === 0) {
            return;
        }
        var select = $(this.selectElement),
            control = select.data('selectBox-control'),
            options = control.data('selectBox-options'),
            scrollBox = control.hasClass('selectBox-dropdown') ? options : options.parent(),
            top = parseInt(li.offset().top - scrollBox.position().top),
            bottom = parseInt(top + li.outerHeight());
        if (center) {
            scrollBox.scrollTop(li.offset().top - scrollBox.offset().top + scrollBox.scrollTop() -
                (scrollBox.height() / 2));
        } else {
            if (top < 0) {
                scrollBox.scrollTop(li.offset().top - scrollBox.offset().top + scrollBox.scrollTop());
            }
            if (bottom > scrollBox.height()) {
                scrollBox.scrollTop((li.offset().top + li.outerHeight()) - scrollBox.offset().top +
                    scrollBox.scrollTop() - scrollBox.height());
            }
        }
    };
    SelectBox.prototype.handleKeyDown = function(event) {
        var select = $(this.selectElement),
            control = select.data('selectBox-control'),
            options = control.data('selectBox-options'),
            settings = select.data('selectBox-settings'),
            totalOptions = 0,
            i = 0;
        if (control.hasClass('selectBox-disabled')) {
            return;
        }
        switch (event.keyCode) {
            case 8:
                event.preventDefault();
                this.typeSearch = '';
                break;
            case 9:
            case 27:
                this.hideMenus();
                this.removeHover();
                break;
            case 13:
                if (control.hasClass('selectBox-menuShowing')) {
                    this.selectOption(options.find('LI.selectBox-hover:first'), event);
                    if (control.hasClass('selectBox-dropdown')) {
                        this.hideMenus();
                    }
                } else {
                    this.showMenu();
                }
                break;
            case 38:
            case 37:
                event.preventDefault();
                if (control.hasClass('selectBox-menuShowing')) {
                    var prev = options.find('.selectBox-hover').prev('LI');
                    totalOptions = options.find('LI:not(.selectBox-optgroup)').length;
                    i = 0;
                    while (prev.length === 0 || prev.hasClass('selectBox-disabled') || prev.hasClass('selectBox-optgroup')) {
                        prev = prev.prev('LI');
                        if (prev.length === 0) {
                            if (settings.loopOptions) {
                                prev = options.find('LI:last');
                            } else {
                                prev = options.find('LI:first');
                            }
                        }
                        if (++i >= totalOptions) {
                            break;
                        }
                    }
                    this.addHover(prev);
                    this.selectOption(prev, event);
                    this.keepOptionInView(prev);
                } else {
                    this.showMenu();
                }
                break;
            case 40:
            case 39:
                event.preventDefault();
                if (control.hasClass('selectBox-menuShowing')) {
                    var next = options.find('.selectBox-hover').next('LI');
                    totalOptions = options.find('LI:not(.selectBox-optgroup)').length;
                    i = 0;
                    while (0 === next.length || next.hasClass('selectBox-disabled') || next.hasClass('selectBox-optgroup')) {
                        next = next.next('LI');
                        if (next.length === 0) {
                            if (settings.loopOptions) {
                                next = options.find('LI:first');
                            } else {
                                next = options.find('LI:last');
                            }
                        }
                        if (++i >= totalOptions) {
                            break;
                        }
                    }
                    this.addHover(next);
                    this.selectOption(next, event);
                    this.keepOptionInView(next);
                } else {
                    this.showMenu();
                }
                break;
        }
    };
    SelectBox.prototype.handleKeyPress = function(event) {
        var select = $(this.selectElement),
            control = select.data('selectBox-control'),
            options = control.data('selectBox-options'),
            self = this;
        if (control.hasClass('selectBox-disabled')) {
            return;
        }
        switch (event.keyCode) {
            case 9:
            case 27:
            case 13:
            case 38:
            case 37:
            case 40:
            case 39:
                break;
            default:
                if (!control.hasClass('selectBox-menuShowing')) {
                    this.showMenu();
                }
                event.preventDefault();
                clearTimeout(this.typeTimer);
                this.typeSearch += String.fromCharCode(event.charCode || event.keyCode);
                options.find('A').each(function() {
                    if ($(this).text().substr(0, self.typeSearch.length).toLowerCase() === self.typeSearch.toLowerCase()) {
                        self.addHover($(this).parent());
                        self.selectOption($(this).parent(), event);
                        self.keepOptionInView($(this).parent());
                        return false;
                    }
                });
                this.typeTimer = setTimeout(function() {
                    self.typeSearch = '';
                }, 1000);
                break;
        }
    };
    SelectBox.prototype.enable = function() {
        var select = $(this.selectElement);
        select.prop('disabled', false);
        var control = select.data('selectBox-control');
        if (!control) {
            return;
        }
        control.removeClass('selectBox-disabled');
    };
    SelectBox.prototype.disable = function() {
        var select = $(this.selectElement);
        select.prop('disabled', true);
        var control = select.data('selectBox-control');
        if (!control) {
            return;
        }
        control.addClass('selectBox-disabled');
    };
    SelectBox.prototype.setValue = function(value) {
        var select = $(this.selectElement);
        select.val(value);
        value = select.val();
        if (null === value) {
            value = select.children().first().val();
            select.val(value);
        }
        var control = select.data('selectBox-control');
        if (!control) {
            return;
        }
        var settings = select.data('selectBox-settings'),
            options = control.data('selectBox-options');
        this.setLabel();
        options.find('.selectBox-selected').removeClass('selectBox-selected');
        options.find('A').each(function() {
            if (typeof(value) === 'object') {
                for (var i = 0; i < value.length; i++) {
                    if ($(this).attr('rel') == value[i]) {
                        $(this).parent().addClass('selectBox-selected');
                    }
                }
            } else {
                if ($(this).attr('rel') == value) {
                    $(this).parent().addClass('selectBox-selected');
                }
            }
        });
        if (settings.change) {
            settings.change.call(select);
        }
    };
    SelectBox.prototype.disableSelection = function(selector) {
        $(selector).css('MozUserSelect', 'none').bind('selectstart', function(event) {
            event.preventDefault();
        });
    };
    SelectBox.prototype.generateOptions = function(self, options) {
        var li = $('<li />'),
            a = $('<a />');
        li.addClass(self.attr('class'));
        li.data(self.data());
        if (self.data('icon')) {
            a.attr('rel', self.val()).html('<i class="fa fa-' + self.data('icon') + ' fa-fw fa-lg"></i> ' + self.text());
        } else {
            a.attr('rel', self.val()).text(self.text());
        }
        li.append(a);
        if (self.attr('disabled')) {
            li.addClass('selectBox-disabled');
        }
        if (self.attr('selected')) {
            li.addClass('selectBox-selected');
        }
        options.append(li);
    };
    $.extend($.fn, {
        setOptions: function(options) {
            var select = $(this),
                control = select.data('selectBox-control');
            switch (typeof(options)) {
                case 'string':
                    select.html(options);
                    break;
                case 'object':
                    select.html('');
                    for (var i in options) {
                        if (options[i] === null) {
                            continue;
                        }
                        if (typeof(options[i]) === 'object') {
                            var optgroup = $('<optgroup label="' + i + '" />');
                            for (var j in options[i]) {
                                optgroup.append('<option value="' + j + '">' + options[i][j] + '</option>');
                            }
                            select.append(optgroup);
                        } else {
                            var option = $('<option value="' + i + '">' + options[i] + '</option>');
                            select.append(option);
                        }
                    }
                    break;
            }
            if (control) {
                $(this).selectBox('refresh');
            }
        },
        selectBox: function(method, options) {
            var selectBox;
            switch (method) {
                case 'control':
                    return $(this).data('selectBox-control');
                case 'settings':
                    if (!options) {
                        return $(this).data('selectBox-settings');
                    }
                    $(this).each(function() {
                        $(this).data('selectBox-settings', $.extend(true, $(this).data('selectBox-settings'), options));
                    });
                    break;
                case 'options':
                    if (undefined === options) {
                        return $(this).data('selectBox-control').data('selectBox-options');
                    }
                    $(this).each(function() {
                        $(this).setOptions(options);
                    });
                    break;
                case 'value':
                    if (undefined === options) {
                        return $(this).val();
                    }
                    $(this).each(function() {
                        if (selectBox = $(this).data('selectBox')) {
                            selectBox.setValue(options);
                        }
                    });
                    break;
                case 'refresh':
                    $(this).each(function() {
                        if (selectBox = $(this).data('selectBox')) {
                            selectBox.refresh();
                        }
                    });
                    break;
                case 'enable':
                    $(this).each(function() {
                        if (selectBox = $(this).data('selectBox')) {
                            selectBox.enable(this);
                        }
                    });
                    break;
                case 'disable':
                    $(this).each(function() {
                        if (selectBox = $(this).data('selectBox')) {
                            selectBox.disable();
                        }
                    });
                    break;
                case 'destroy':
                    $(this).each(function() {
                        if (selectBox = $(this).data('selectBox')) {
                            selectBox.destroy();
                            $(this).data('selectBox', null);
                        }
                    });
                    break;
                case 'instance':
                    return $(this).data('selectBox');
                default:
                    $(this).each(function(idx, select) {
                        if (!$(select).data('selectBox')) {
                            $(select).data('selectBox', new SelectBox(select, method));
                        }
                    });
                    break;
            }
            return $(this);
        }
    });
})(jQuery);