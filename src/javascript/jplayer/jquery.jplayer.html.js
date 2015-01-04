(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['jquery'], factory); // jQuery Switch
		// define(['zepto'], factory); // Zepto Switch
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('jquery')); // jQuery Switch
		//factory(require('zepto')); // Zepto Switch
	} else {
		// Browser globals
		if(root.jQuery) { // Use jQuery if available
			factory(root.jQuery);
		} else { // Otherwise, use Zepto
			factory(root.Zepto);
		}
	}
}(this, function ($, undefined) {
    $.jPlayer.solutions.html = function(jplayer, options) {
        this.name = "html";
        $.jPlayerSolution.call(this, jplayer, options);
        this.options = $.extend(true, {}, this.options, options);
        
        this.htmlElement = {}; // DOM elements created by jPlayer
        this.audio = {};
        this.video = {};
        this.internal.audio = $.extend({}, {
            id: this.jplayer.options.idPrefix + "_audio_" + this.jplayer.count,
            jq: undefined
        });
        this.internal.video = $.extend({}, {
            id: this.jplayer.options.idPrefix + "_video_" + this.jplayer.count,
            jq: undefined
        });
     };
     
    $.jPlayer.solutions.html.nativeFeatures = {
        init: function() {
            /* Fullscreen function naming influenced by W3C naming.
             * No support for: Mozilla Proposal: https://wiki.mozilla.org/Gecko:FullScreenAPI
             */

            var d = document,
                v = d.createElement('video'),
                spec = {
                    // http://www.w3.org/TR/fullscreen/
                    w3c: [
                        'fullscreenEnabled',
                        'fullscreenElement',
                        'requestFullscreen',
                        'exitFullscreen',
                        'fullscreenchange',
                        'fullscreenerror'
                    ],
                    // https://developer.mozilla.org/en-US/docs/DOM/Using_fullscreen_mode
                    moz: [
                        'mozFullScreenEnabled',
                        'mozFullScreenElement',
                        'mozRequestFullScreen',
                        'mozCancelFullScreen',
                        'mozfullscreenchange',
                        'mozfullscreenerror'
                    ],
                    // http://developer.apple.com/library/safari/#documentation/WebKit/Reference/ElementClassRef/Element/Element.html
                    // http://developer.apple.com/library/safari/#documentation/UserExperience/Reference/DocumentAdditionsReference/DocumentAdditions/DocumentAdditions.html
                    webkit: [
                        '',
                        'webkitCurrentFullScreenElement',
                        'webkitRequestFullScreen',
                        'webkitCancelFullScreen',
                        'webkitfullscreenchange',
                        ''
                    ],
                    // http://developer.apple.com/library/safari/#documentation/AudioVideo/Reference/HTMLVideoElementClassReference/HTMLVideoElement/HTMLVideoElement.html
                    // https://developer.apple.com/library/safari/samplecode/HTML5VideoEventFlow/Listings/events_js.html#//apple_ref/doc/uid/DTS40010085-events_js-DontLinkElementID_5
                    // Events: 'webkitbeginfullscreen' and 'webkitendfullscreen'
                    webkitVideo: [
                        'webkitSupportsFullscreen',
                        'webkitDisplayingFullscreen',
                        'webkitEnterFullscreen',
                        'webkitExitFullscreen',
                        '',
                        ''
                    ],
                    ms: [
                        '',
                        'msFullscreenElement',
                        'msRequestFullscreen',
                        'msExitFullscreen',
                        'MSFullscreenChange',
                        'MSFullscreenError'
                    ]
                },
                specOrder = [
                    'w3c',
                    'moz',
                    'webkit',
                    'webkitVideo',
                    'ms'
                ],
                fs, i, il;

            this.fullscreen = fs = {
                support: {
                    w3c: !!d[spec.w3c[0]],
                    moz: !!d[spec.moz[0]],
                    webkit: typeof d[spec.webkit[3]] === 'function',
                    webkitVideo: typeof v[spec.webkitVideo[2]] === 'function',
                    ms: typeof v[spec.ms[2]] === 'function'
                },
                used: {}
            };

            // Store the name of the spec being used and as a handy boolean.
            for(i = 0, il = specOrder.length; i < il; i++) {
                var n = specOrder[i];
                if(fs.support[n]) {
                    fs.spec = n;
                    fs.used[n] = true;
                    break;
                }
            }

            if(fs.spec) {
                var s = spec[fs.spec];
                fs.api = {
                    fullscreenEnabled: true,
                    fullscreenElement: function(elem) {
                        elem = elem ? elem : d; // Video element required for webkitVideo
                        return elem[s[1]];
                    },
                    requestFullscreen: function(elem) {
                        return elem[s[2]](); // Chrome and Opera want parameter (Element.ALLOW_KEYBOARD_INPUT) but Safari fails if flag used.
                    },
                    exitFullscreen: function(elem) {
                        elem = elem ? elem : d; // Video element required for webkitVideo
                        return elem[s[3]]();
                    }
                };
                fs.event = {
                    fullscreenchange: s[4],
                    fullscreenerror: s[5]
                };
            } else {
                fs.api = {
                    fullscreenEnabled: false,
                    fullscreenElement: function() {
                        return null;
                    },
                    requestFullscreen: function() {},
                    exitFullscreen: function() {}
                };
                fs.event = {};
            }
        }
    };
    $.jPlayer.solutions.html.nativeFeatures.init();
     
    $.jPlayer.solutions.html.prototype = {
        options: {
        },
        init: function() {
            // Generate the required media elements
            this.audio.available = false;
            if(this.jplayer.require.audio) { // If a supplied format is audio
                this.htmlElement.audio = document.createElement('audio');
                this.htmlElement.audio.id = this.internal.audio.id;
                this.audio.available = !!this.htmlElement.audio.canPlayType && this._testCanPlayType(this.htmlElement.audio); // Test is for IE9 on Win Server 2008.
            }
            this.video.available = false;
            if(this.jplayer.require.video) { // If a supplied format is video
                this.htmlElement.video = document.createElement('video');
                this.htmlElement.video.id = this.internal.video.id;
                this.video.available = !!this.htmlElement.video.canPlayType && this._testCanPlayType(this.htmlElement.video); // Test is for IE9 on Win Server 2008.
            }
            
            // A fix for Android where older (2.3) and even some 4.x devices fail to work when changing the *audio* SRC and then playing immediately.
            this.androidFix = {
                setMedia: false, // True when media set
                play: false, // True when a progress event will instruct the media to play
                pause: false, // True when a progress event will instruct the media to pause at a time.
                time: NaN // The play(time) parameter
            };
            
            // Create event handlers if native fullscreen is supported
            if($.jPlayer.solutions.html.nativeFeatures.fullscreen.api.fullscreenEnabled) {
                this._fullscreenAddEventListeners();
            }
        },
        initUse: function() {
            var self = this;
            
            self.internal.ready = false;
            if(this.used) {
                // Setup playbackRate ability before using _addHtmlEventListeners()
                if (this.jplayer.status.playbackRateEnabled) {
                    this.jplayer.status.playbackRateEnabled = this._testPlaybackRate('audio');
                }
            
                // The HTML Audio handlers
                if(this.audio.available) {
                    this._addHtmlEventListeners(this.htmlElement.audio, this.audio);
                    this.jplayer.element.append(this.htmlElement.audio);
                    this.internal.audio.jq = $("#" + this.internal.audio.id);
                }

                // The HTML Video handlers
                if(this.video.available) {
                    this._addHtmlEventListeners(this.htmlElement.video, this.video);
                    this.jplayer.element.append(this.htmlElement.video);
                    this.internal.video.jq = $("#" + this.internal.video.id);
                    if(this.jplayer.status.nativeVideoControls) {
                        this.internal.video.jq.css({'width': this.jplayer.status.width, 'height': this.jplayer.status.height});
                    } else {
                        this.internal.video.jq.css({'width':'0px', 'height':'0px'}); // Using size 0x0 since a .hide() causes issues in iOS
                    }
                    this.internal.video.jq.bind("click.jPlayer", function() {
                        self.jplayer._trigger($.jPlayer.event.click);
                    });
                }
            }
            
            // Ready after 100ms (required to init DOM objects properly)
            setTimeout( function() {
                self.internal.ready = true;
                self.jplayer._checkSolutionsReady();
            }, 100);
        },
        resetGate: function() {
            this.audio.gate = false;
            this.video.gate = false;
        },
        initMedia: function(media) {
            // Remove any existing track elements
            var $media = $(this.htmlElement.media).empty();

            // Create any track elements given with the media, as an Array of track Objects.
            $.each(media.track || [], function(i,v) {
                var track = document.createElement('track');
                track.setAttribute("kind", v.kind ? v.kind : "");
                track.setAttribute("src", v.src ? v.src : "");
                track.setAttribute("srclang", v.srclang ? v.srclang : "");
                track.setAttribute("label", v.label ? v.label : "");
                if(v.def) {
                    track.setAttribute("default", v.def);
                }
                $media.append(track);
            });

            this.htmlElement.media.src = this.jplayer.status.src;

            if(this.options.preload !== 'none') {
                this.load(); // See function for comments
            }
            this.jplayer._trigger($.jPlayer.event.timeupdate); // The flash generates this event for its solution.
        },
        setFormat: function(media) {
            var self = this;
            // Always finds a format due to checks in setMedia()
            $.each(this.jplayer.formats, function(priority, format) {
                if(self.support[format] && media[format]) {
                    self.jplayer.status.src = media[format];
                    self.jplayer.status.format[format] = true;
                    self.jplayer.status.formatType = format;
                    return false;
                }
            });
        },
        setAudio: function(media) {
            this.audio.gate = true;
            this.setFormat(media);
            this.htmlElement.media = this.htmlElement.audio;
            this.initMedia(media);
            
            // Setup the Android Fix - Only for HTML audio.
            if($.jPlayer.platform.android) {
                this.androidFix.setMedia = true;
            }
        },
        setVideo: function(media) {
            this.video.gate = true;
            this.setFormat(media);
            if(this.jplayer.status.nativeVideoControls) {
                this.htmlElement.video.poster = this._validString(media.poster) ? media.poster : "";
            }
            this.htmlElement.media = this.htmlElement.video;
            this.initMedia(media);
        },
        resetMedia: function() {
            // Clear the Android Fix.
            this.androidFix.setMedia = false;
            this.androidFix.play = false;
            this.androidFix.pause = false;
        
            if(this.htmlElement.media) {
                if(this.htmlElement.media.id === this.internal.video.id && !this.jplayer.status.nativeVideoControls) {
                    this.internal.video.jq.css({'width':'0px', 'height':'0px'});
                }
                this.htmlElement.media.pause();
            }
        },
        clearMedia: function() {
            if(this.htmlElement.media) {
                this.htmlElement.media.src = "about:blank";
                // The following load() is only required for Firefox 3.6 (PowerMacs).
                // Recent HTMl5 browsers only require the src change. Due to changes in W3C spec and load() effect.
                this.htmlElement.media.load(); // Stops an old, "in progress" download from continuing the download. Triggers the loadstart, error and emptied events, due to the empty src. Also an abort event if a download was in progress.
            }
        },
        load: function() {
            // This function remains to allow the early HTML5 browsers to work, such as Firefox 3.6
            // A change in the W3C spec for the media.load() command means that this is no longer necessary.
            // This command should be removed and actually causes minor undesirable effects on some browsers. Such as loading the whole file and not only the metadata.
            if(this.jplayer.status.waitForLoad) {
                this.jplayer.status.waitForLoad = false;
                this.htmlElement.media.load();
            }
            clearTimeout(this.jplayer.internal.htmlDlyCmdId);
        },
        play: function(time) {
            var self = this,
                media = this.htmlElement.media;

            this.androidFix.pause = false; // Cancel the pause fix.

            this.load(); // Loads if required and clears any delayed commands.

            // Setup the Android Fix.
            if(this.androidFix.setMedia) {
                this.androidFix.play = true;
                this.androidFix.time = time;

            } else if(!isNaN(time)) {

                // Attempt to play it, since iOS has been ignoring commands
                if(this.jplayer.internal.cmdsIgnored) {
                    media.play();
                }

                try {
                    // !media.seekable is for old HTML5 browsers, like Firefox 3.6.
                    // Checking seekable.length is important for iOS6 to work with setMedia().play(time)
                    if(!media.seekable || typeof media.seekable === "object" && media.seekable.length > 0) {
                        media.currentTime = time;
                        media.play();
                    } else {
                        throw 1;
                    }
                } catch(err) {
                    this.jplayer.internal.htmlDlyCmdId = setTimeout(function() {
                        self.play(time);
                    }, 250);
                    return; // Cancel execution and wait for the delayed command.
                }
            } else {
                media.play();
            }
            this._checkWaitForPlay();
        },
        pause: function(time) {
            var self = this,
                media = this.htmlElement.media;

            this.androidFix.play = false; // Cancel the play fix.

            if(time > 0) { // We do not want the stop() command, which does pause(0), causing a load operation.
                this.load(); // Loads if required and clears any delayed commands.
            } else {
                clearTimeout(this.internal.htmlDlyCmdId);
            }

            // Order of these commands is important for Safari (Win) and IE9. Pause then change currentTime.
            media.pause();

            // Setup the Android Fix.
            if(this.androidFix.setMedia) {
                this.androidFix.pause = true;
                this.androidFix.time = time;

            } else if(!isNaN(time)) {
                try {
                    if(!media.seekable || typeof media.seekable === "object" && media.seekable.length > 0) {
                        media.currentTime = time;
                    } else {
                        throw 1;
                    }
                } catch(err) {
                    this.jplayer.internal.htmlDlyCmdId = setTimeout(function() {
                        self.pause(time);
                    }, 250);
                    return; // Cancel execution and wait for the delayed command.
                }
            }
            if(time > 0) { // Avoids a setMedia() followed by stop() or pause(0) hiding the video play button.
                this._checkWaitForPlay();
            }
        },
        playHead: function(percent) {
            var self = this,
                media = this.htmlElement.media;

            this.load(); // Loads if required and clears any delayed commands.

            // This playHead() method needs a refactor to apply the android fix.

            try {
                if(typeof media.seekable === "object" && media.seekable.length > 0) {
                    media.currentTime = percent * media.seekable.end(media.seekable.length-1) / 100;
                } else if(media.duration > 0 && !isNaN(media.duration)) {
                    media.currentTime = percent * media.duration / 100;
                } else {
                    throw "e";
                }
            } catch(err) {
                this.jplayer.internal.htmlDlyCmdId = setTimeout(function() {
                    self.playHead(percent);
                }, 250);
                return; // Cancel execution and wait for the delayed command.
            }
            if(!this.jplayer.status.waitForLoad) {
                this._checkWaitForPlay();
            }
        },
        mute: function(muted) {
            this._setProperty('muted', muted);
            // The HTML solution generates mutedevent event from the media element itself, no need to trigger it manually here.
        },
        volume: function(v) {
            this._setProperty('volume', v);
            // The HTML solution generates volumechange event from the media element itself, no need to trigger it manually here.
        },
        setPlaybackRate: function(value) {
            this._setProperty('playbackRate', value);
        },
        setDefaultPlaybackRate: function(value) {
            this._setProperty('defaultPlaybackRate', value);
        },
        updateSize: function() {
            if(!this.jplayer.status.waitForPlay && this.active && this.jplayer.status.video || this.video.available && this.used && this.jplayer.status.nativeVideoControls) {
                this.internal.video.jq.css({'width': this.jplayer.status.width, 'height': this.jplayer.status.height});
            }
        },
        updateCanPlay: function(format) {
            var self = this;
            self.canPlay[format] = self[self.jplayer.format[format].media].available && "" !== self.htmlElement[self.jplayer.format[format].media].canPlayType(self.jplayer.format[format].codec);
        },
        updateNativeVideoControls: function() {
            if(this.video.available) {
                // Turn the HTML Video controls on/off
                this.htmlElement.video.controls = this.jplayer.status.nativeVideoControls;
                // Show/hide the jPlayer GUI.
                this.jplayer._updateAutohide();
                // For when option changed. The poster image is not updated, as it is dealt with in setMedia(). Acceptable degradation since seriously doubt these options will change on the fly. Can again review later.
                if(this.jplayer.status.nativeVideoControls && this.jplayer.require.video) {
                    this.jplayer.internal.poster.jq.hide();
                    this.internal.video.jq.css({'width': this.jplayer.status.width, 'height': this.jplayer.status.height});
                } else if(this.jplayer.status.waitForPlay && this.jplayer.status.video) {
                    this.internal.poster.jq.show();
                    this.internal.video.jq.css({'width': '0px', 'height': '0px'});
                }
            }
        },
        setFullScreen: function(value) {
            var wkv = $.jPlayer.solutions.html.nativeFeatures.fullscreen.used.webkitVideo;
            if(!wkv || wkv && !this.jplayer.status.waitForPlay) {
                if(!wkv) { // No sensible way to unset option on these devices.
                    this.jplayer.options.fullScreen = value;
                }
                if(value) {
                    this._requestFullscreen();
                } else {
                    this._exitFullscreen();
                }
                if(!wkv) {
                    this.jplayer._setOption("fullWindow", value);
                }
            }
        },
        /*jslint unused: false*/
        jPlayerMsgHandler: function(args) {
            // No external message to handle, messages are managed through event listeners.
        },
        /*jslint unused: true*/
        _checkWaitForPlay: function() {
            if(this.jplayer.status.waitForPlay) {
                this.jplayer.status.waitForPlay = false;
                if(this.jplayer.css.jq.videoPlay !== undefined && this.jplayer.css.jq.videoPlay.length) {
                    this.jplayer.css.jq.videoPlay.hide();
                }
                if(this.jplayer.status.video) {
                    this.jplayer.internal.poster.jq.hide();
                    this.internal.video.jq.css({'width': this.jplayer.status.width, 'height': this.jplayer.status.height});
                }
            }
        },
        _setProperty: function(property, value) {
            if(this.audio.available) {
                this.htmlElement.audio[property] = value;
            }
            if(this.video.available) {
                this.htmlElement.video[property] = value;
            }
        },
        _testCanPlayType: function(elem) {
            // IE9 on Win Server 2008 did not implement canPlayType(), but it has the property.
            try {
                elem.canPlayType(this.jplayer.format.mp3.codec); // The type is irrelevant.
                return true;
            } catch(err) {
                return false;
            }
        },
        _testPlaybackRate: function(type) {
            // type: String 'audio' or 'video'
            var el, rate = 0.5;
            type = typeof type === 'string' ? type : 'audio';
            el = document.createElement(type);
            // Wrapping in a try/catch, just in case older HTML5 browsers throw and error.
            try {
                if('playbackRate' in el) {
                    el.playbackRate = rate;
                    return el.playbackRate === rate;
                } else {
                    return false;
                }
            } catch(err) {
                return false;
            }
        },
        _addHtmlEventListeners: function(mediaElement, entity) {
            var self = this;
            mediaElement.preload = this.jplayer.options.preload;
            mediaElement.muted = this.jplayer.options.muted;
            mediaElement.volume = this.jplayer.options.volume;

            if(this.jplayer.status.playbackRateEnabled) {
                mediaElement.defaultPlaybackRate = this.jplayer.options.defaultPlaybackRate;
                mediaElement.playbackRate = this.jplayer.options.playbackRate;
            }

            // Create the event listeners
            // Only want the active entity to affect jPlayer and bubble events.
            // Using entity.gate so that object is referenced and gate property always current
            
            mediaElement.addEventListener("progress", function() {
                if(entity.gate) {
                    if(self.jplayer.internal.cmdsIgnored && this.jplayer.readyState > 0) { // Detect iOS executed the command
                        self.jplayer.internal.cmdsIgnored = false;
                    }
                    self._getHtmlStatus(mediaElement);
                    self.jplayer._updateInterface();
                    self.jplayer._trigger($.jPlayer.event.progress);
                }
            }, false);
            mediaElement.addEventListener("loadeddata", function() {
                if(entity.gate) {
                    self.androidFix.setMedia = false; // Disable the fix after the first progress event.
                    if(self.androidFix.play) { // Play Android audio - performing the fix.
                        self.androidFix.play = false;
                        self.jplayer.play(self.androidFix.time);
                    }
                    if(self.androidFix.pause) { // Pause Android audio at time - performing the fix.
                        self.androidFix.pause = false;
                        self.jplayer.pause(self.androidFix.time);
                    }
                    self.jplayer._trigger($.jPlayer.event.loadeddata);
                }
            }, false);
            mediaElement.addEventListener("timeupdate", function() {
                if(entity.gate) {
                    self._getHtmlStatus(mediaElement);
                    self.jplayer._updateInterface();
                    self.jplayer._trigger($.jPlayer.event.timeupdate);
                }
            }, false);
            mediaElement.addEventListener("durationchange", function() {
                if(entity.gate) {
                    self._getHtmlStatus(mediaElement);
                    self.jplayer._updateInterface();
                    self.jplayer._trigger($.jPlayer.event.durationchange);
                }
            }, false);
            mediaElement.addEventListener("play", function() {
                if(entity.gate) {
                    self.jplayer._updateButtons(true);
                    self._checkWaitForPlay(); // So the native controls update this variable and puts the hidden interface in the correct state. Affects toggling native controls.
                    self.jplayer._trigger($.jPlayer.event.play);
                }
            }, false);
            mediaElement.addEventListener("playing", function() {
                if(entity.gate) {
                    self.jplayer._updateButtons(true);
                    self.jplayer._seeked();
                    self.jplayer._trigger($.jPlayer.event.playing);
                }
            }, false);
            mediaElement.addEventListener("pause", function() {
                if(entity.gate) {
                    self.jplayer._updateButtons(false);
                    self.jplayer._trigger($.jPlayer.event.pause);
                }
            }, false);
            mediaElement.addEventListener("waiting", function() {
                if(entity.gate) {
                    self.jplayer._seeking();
                    self.jplayer._trigger($.jPlayer.event.waiting);
                }
            }, false);
            mediaElement.addEventListener("seeking", function() {
                if(entity.gate) {
                    self.jplayer._seeking();
                    self.jplayer._trigger($.jPlayer.event.seeking);
                }
            }, false);
            mediaElement.addEventListener("seeked", function() {
                if(entity.gate) {
                    self.jplayer._seeked();
                    self.jplayer._trigger($.jPlayer.event.seeked);
                }
            }, false);
            mediaElement.addEventListener("volumechange", function() {
                if(entity.gate) {
                    // Read the values back from the element as the Blackberry PlayBook shares the volume with the physical buttons master volume control.
                    // However, when tested 6th July 2011, those buttons do not generate an event. The physical play/pause button does though.
                    self.jplayer.options.volume = mediaElement.volume;
                    self.jplayer.options.muted = mediaElement.muted;
                    self.jplayer._updateMute();
                    self.jplayer._updateVolume();
                    self.jplayer._trigger($.jPlayer.event.volumechange);
                }
            }, false);
            mediaElement.addEventListener("ratechange", function() {
                if(entity.gate) {
                    self.jplayer.options.defaultPlaybackRate = mediaElement.defaultPlaybackRate;
                    self.jplayer.options.playbackRate = mediaElement.playbackRate;
                    self.jplayer._updatePlaybackRate();
                    self.jplayer._trigger($.jPlayer.event.ratechange);
                }
            }, false);
            mediaElement.addEventListener("suspend", function() { // Seems to be the only way of capturing that the iOS4 browser did not actually play the media from the page code. ie., It needs a user gesture.
                if(entity.gate) {
                    self.jplayer._seeked();
                    self.jplayer._trigger($.jPlayer.event.suspend);
                }
            }, false);
            mediaElement.addEventListener("ended", function() {
                if(entity.gate) {
                    // Order of the next few commands are important. Change the time and then pause.
                    // Solves a bug in Firefox, where issuing pause 1st causes the media to play from the start. ie., The pause is ignored.
                    if(!$.jPlayer.browser.webkit) { // Chrome crashes if you do this in conjunction with a setMedia command in an ended event handler. ie., The playlist demo.
                        self.htmlElement.media.currentTime = 0; // Safari does not care about this command. ie., It works with or without this line. (Both Safari and Chrome are Webkit.)
                    }
                    self.htmlElement.media.pause(); // Pause otherwise a click on the progress bar will play from that point, when it shouldn't, since it stopped playback.
                    self.jplayer._updateButtons(false);
                    self._getHtmlStatus(mediaElement, true); // With override true. Otherwise Chrome leaves progress at full.
                    self.jplayer._updateInterface();
                    self.jplayer._trigger($.jPlayer.event.ended);
                }
            }, false);
            mediaElement.addEventListener("error", function() {
                if(entity.gate) {
                    self.jplayer._updateButtons(false);
                    self.jplayer._seeked();
                    if(self.jplayer.status.srcSet) { // Deals with case of clearMedia() causing an error event.
                        clearTimeout(self.jplayer.internal.htmlDlyCmdId); // Clears any delayed commands used in the HTML solution.
                        self.jplayer.status.waitForLoad = true; // Allows the load operation to try again.
                        self.jplayer.status.waitForPlay = true; // Reset since a play was captured.
                        if(self.jplayer.status.video && !self.jplayer.status.nativeVideoControls) {
                            self.internal.video.jq.css({'width':'0px', 'height':'0px'});
                        }
                        if(self._validString(self.jplayer.status.media.poster) && !self.jplayer.status.nativeVideoControls) {
                            self.jplayer.internal.poster.jq.show();
                        }
                        if(self.jplayer.css.jq.videoPlay.length) {
                            self.jplayer.css.jq.videoPlay.show();
                        }
                        self.jplayer._error( {
                            type: $.jPlayer.error.URL,
                            context: self.jplayer.status.src, // this.src shows absolute urls. Want context to show the url given.
                            message: $.jPlayer.errorMsg.URL,
                            hint: $.jPlayer.errorHint.URL
                        });
                    }
                }
            }, false);
            // Create all the other event listeners that bubble up to a jPlayer event from html, without being used by jPlayer.
            $.each($.jPlayer.htmlEvent, function(i, eventType) {
                mediaElement.addEventListener(this, function() {
                    if(entity.gate) {
                        self.jplayer._trigger($.jPlayer.event[eventType]);
                    }
                }, false);
            });
        },
        _getHtmlStatus: function(media, override) {
            var ct = 0, cpa = 0, sp = 0, cpr = 0;

            // Fixes the duration bug in iOS, where the durationchange event occurs when media.duration is not always correct.
            // Fixes the initial duration bug in BB OS7, where the media.duration is infinity and displays as NaN:NaN due to Date() using inifity.
            if(isFinite(media.duration)) {
                this.jplayer.status.duration = media.duration;
            }

            ct = media.currentTime;
            cpa = (this.jplayer.status.duration > 0) ? 100 * ct / this.jplayer.status.duration : 0;
            if((typeof media.seekable === "object") && (media.seekable.length > 0)) {
                sp = (this.jplayer.status.duration > 0) ? 100 * media.seekable.end(media.seekable.length-1) / this.jplayer.status.duration : 100;
                cpr = (this.jplayer.status.duration > 0) ? 100 * media.currentTime / media.seekable.end(media.seekable.length-1) : 0; // Duration conditional for iOS duration bug. ie., seekable.end is a NaN in that case.
            } else {
                sp = 100;
                cpr = cpa;
            }
            
            if(override) {
                ct = 0;
                cpr = 0;
                cpa = 0;
            }

            this.jplayer.status.seekPercent = sp;
            this.jplayer.status.currentPercentRelative = cpr;
            this.jplayer.status.currentPercentAbsolute = cpa;
            this.jplayer.status.currentTime = ct;

            this.jplayer.status.remaining = this.jplayer.status.duration - this.jplayer.status.currentTime;

            this.jplayer.status.videoWidth = media.videoWidth;
            this.jplayer.status.videoHeight = media.videoHeight;

            this.jplayer.status.readyState = media.readyState;
            this.jplayer.status.networkState = media.networkState;
            this.jplayer.status.playbackRate = media.playbackRate;
            this.jplayer.status.ended = media.ended;
        },
        _fullscreenAddEventListeners: function() {
            var self = this,
                fs = $.jPlayer.solutions.html.nativeFeatures.fullscreen;

            if(fs.api.fullscreenEnabled) {
                if(fs.event.fullscreenchange) {
                    // Create the event handler function and store it for removal.
                    if(typeof this.internal.fullscreenchangeHandler !== 'function') {
                        this.internal.fullscreenchangeHandler = function() {
                            self._fullscreenchange();
                        };
                    }
                    document.addEventListener(fs.event.fullscreenchange, this.internal.fullscreenchangeHandler, false);
                }
                // No point creating handler for fullscreenerror.
                // Either logic avoids fullscreen occurring (w3c/moz), or their is no event on the browser (webkit).
            }
        },
        _fullscreenRemoveEventListeners: function() {
            var fs = $.jPlayer.solutions.html.nativeFeatures.fullscreen;
            if(this.internal.fullscreenchangeHandler) {
                document.removeEventListener(fs.event.fullscreenchange, this.internal.fullscreenchangeHandler, false);
            }
        },
        _fullscreenchange: function() {
            // If nothing is fullscreen, then we cannot be in fullscreen mode.
            if(this.jplayer.options.fullScreen && !$.jPlayer.solutions.html.nativeFeatures.fullscreen.api.fullscreenElement()) {
                this.jplayer._setOption("fullScreen", false);
            }
        },
        _requestFullscreen: function() {
            // Either the container or the jPlayer div
            var e = this.jplayer.ancestorJq.length ? this.jplayer.ancestorJq[0] : this.jplayer.element[0],
                fs = $.jPlayer.solutions.html.nativeFeatures.fullscreen;

            // This method needs the video element. For iOS and Android.
            if(fs.used.webkitVideo) {
                e = this.htmlElement.video;
            }

            if(fs.api.fullscreenEnabled) {
                fs.api.requestFullscreen(e);
            }
        },
        _exitFullscreen: function() {

            var fs = $.jPlayer.solutions.html.nativeFeatures.fullscreen,
                e;

            // This method needs the video element. For iOS and Android.
            if(fs.used.webkitVideo) {
                e = this.htmlElement.video;
            }

            if(fs.api.fullscreenEnabled) {
                fs.api.exitFullscreen(e);
            }
        }
    };
}));