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
    $.jPlayer.solutions.flash = function(jplayer, options) {
        this.name = "flash";
        $.jPlayerSolution.call(this, jplayer, options);
        this.options = $.extend(true, {}, this.options, options);
        
        this.internal.flash = $.extend({}, {
            id: this.jplayer.options.idPrefix + "_flash_" + this.jplayer.count,
            jq: undefined,
            swf: this.options.swfPath + (this.options.swfPath.toLowerCase().slice(-4) !== ".swf" ? (this.options.swfPath && this.options.swfPath.slice(-1) !== "/" ? "/" : "") + "jquery.jplayer.swf" : "")
        });
     };
     $.jPlayer.solutions.flash.prototype = {
        version: {
            needFlash: "2.9.0",
            flash: "unknown"
        },
        options: {
            swfPath: "js" // Path to jquery.jplayer.swf. Can be relative, absolute or server root relative.
        },
        format: { // Static Object
            mp3: {
                flashCanPlay: true
            },
            m4a: {
                flashCanPlay: true
            },
            fla: {
                flashCanPlay: true
            },
            rtmpa: {
                flashCanPlay: true
            },
            m4v: {
                flashCanPlay: true
            },
            flv: {
                flashCanPlay: true
            },
            rtmpv: {
                flashCanPlay: true
            }
        },
        init: function() {
            this.available = this._checkForFlash(10.1);
        },
        initUse: function() {
            var self = this;
            
            this.internal.ready = false;
            if(this.used) {
                var htmlObj,
                flashVars = 'jQuery=' + encodeURI(this.jplayer.options.noConflict) + '&id=' + encodeURI(this.jplayer.internal.self.id) + '&vol=' + this.jplayer.options.volume + '&muted=' + this.jplayer.options.muted;

                // Code influenced by SWFObject 2.2: http://code.google.com/p/swfobject/
                // Non IE browsers have an initial Flash size of 1 by 1 otherwise the wmode affected the Flash ready event. 

                if($.jPlayer.browser.msie && (Number($.jPlayer.browser.version) < 9 || $.jPlayer.browser.documentMode < 9)) {
                    var objStr = '<object id="' + this.internal.flash.id + '" classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" width="0" height="0" tabindex="-1"></object>';

                    var paramStr = [
                        '<param name="movie" value="' + this.internal.flash.swf + '" />',
                        '<param name="FlashVars" value="' + flashVars + '" />',
                        '<param name="allowScriptAccess" value="always" />',
                        '<param name="bgcolor" value="' + this.jplayer.options.backgroundColor + '" />',
                        '<param name="wmode" value="' + this.jplayer.options.wmode + '" />'
                    ];

                    htmlObj = document.createElement(objStr);
                    for(var i=0; i < paramStr.length; i++) {
                        htmlObj.appendChild(document.createElement(paramStr[i]));
                    }
                } else {
                    var createParam = function(el, n, v) {
                        var p = document.createElement("param");
                        p.setAttribute("name", n);	
                        p.setAttribute("value", v);
                        el.appendChild(p);
                    };

                    htmlObj = document.createElement("object");
                    htmlObj.setAttribute("id", this.internal.flash.id);
                    htmlObj.setAttribute("name", this.internal.flash.id);
                    htmlObj.setAttribute("data", this.internal.flash.swf);
                    htmlObj.setAttribute("type", "application/x-shockwave-flash");
                    htmlObj.setAttribute("width", "1"); // Non-zero
                    htmlObj.setAttribute("height", "1"); // Non-zero
                    htmlObj.setAttribute("tabindex", "-1");
                    createParam(htmlObj, "flashvars", flashVars);
                    createParam(htmlObj, "allowscriptaccess", "always");
                    createParam(htmlObj, "bgcolor", this.jplayer.options.backgroundColor);
                    createParam(htmlObj, "wmode", this.jplayer.options.wmode);
                }

                this.jplayer.element.append(htmlObj);
                this.internal.flash.jq = $(htmlObj);
                
                this.jplayer.status.playbackRateEnabled = false;
            } else {
                // If Flash is not used, then emulate flash ready() call after 100ms.
                setTimeout( function() {
                    self.internal.ready = true;
                    self.version.flash = "n/a";
                    self.jplayer._checkSolutionsReady();
                }, 100);
            }
        },
        resetGate: function() {
            this.gate = false;
        },
        setAudio: function(media) {
            var self = this;
            this.gate = true;
            try {
                // Always finds a format due to checks in setMedia()
                $.each(this.jplayer.formats, function(priority, format) {
                    if(self.support[format] && media[format]) {
                        switch (format) {
                            case "m4a" :
                            case "fla" :
                                self._getMovie().fl_setAudio_m4a(media[format]);
                                break;
                            case "mp3" :
                                self._getMovie().fl_setAudio_mp3(media[format]);
                                break;
                            case "rtmpa":
                                self._getMovie().fl_setAudio_rtmp(media[format]);
                                break;
                        }
                        self.jplayer.status.src = media[format];
                        self.jplayer.status.format[format] = true;
                        self.jplayer.status.formatType = format;
                        return false;
                    }
                });

                if(this.jplayer.options.preload === 'auto') {
                    this.load();
                    this.jplayer.status.waitForLoad = false;
                }
            } catch(err) { this._flashError(err); }
        },
        setVideo: function(media) {
            var self = this;
            this.gate = true;
            try {
                // Always finds a format due to checks in setMedia()
                $.each(this.jplayer.formats, function(priority, format) {
                    if(self.support[format] && media[format]) {
                        switch (format) {
                            case "m4v" :
                            case "flv" :
                                self._getMovie().fl_setVideo_m4v(media[format]);
                                break;
                            case "rtmpv":
                                self._getMovie().fl_setVideo_rtmp(media[format]);
                                break;		
                        }
                        self.jplayer.status.src = media[format];
                        self.jplayer.status.format[format] = true;
                        self.jplayer.status.formatType = format;
                        return false;
                    }
                });

                if(this.jplayer.options.preload === 'auto') {
                    this.load();
                    this.jplayer.status.waitForLoad = false;
                }
            } catch(err) { this._flashError(err); }
        },
        resetMedia: function() {
            this.internal.flash.jq.css({'width':'0px', 'height':'0px'}); // Must do via CSS as setting attr() to zero causes a jQuery error in IE.
            this.pause(NaN);
        },
        clearMedia: function() {
            try {
                this._getMovie().fl_clearMedia();
            } catch(err) { this._flashError(err); }
        },
        load: function() {
            try {
                this._getMovie().fl_load();
            } catch(err) { this._flashError(err); }
            this.jplayer.status.waitForLoad = false;
        },
        play: function(time) {
            try {
                this._getMovie().fl_play(time);
            } catch(err) { this._flashError(err); }
            this.jplayer.status.waitForLoad = false;
            this._checkWaitForPlay();
        },
        pause: function(time) {
            try {
                this._getMovie().fl_pause(time);
            } catch(err) { this._flashError(err); }
            if(time > 0) { // Avoids a setMedia() followed by stop() or pause(0) hiding the video play button.
                this.jplayer.status.waitForLoad = false;
                this._checkWaitForPlay();
            }
        },
        playHead: function(p) {
            try {
                this._getMovie().fl_play_head(p);
            } catch(err) { this._flashError(err); }
            if(!this.jplayer.status.waitForLoad) {
                this._checkWaitForPlay();
            }
        },
        _checkWaitForPlay: function() {
            if(this.jplayer.status.waitForPlay) {
                this.jplayer.status.waitForPlay = false;
                if(this.jplayer.css.jq.videoPlay !== undefined && this.jplayer.css.jq.videoPlay.length) {
                    this.jplayer.css.jq.videoPlay.hide();
                }
                if(this.jplayer.status.video) {
                    this.jplayer.internal.poster.jq.hide();
                    this.internal.flash.jq.css({'width': this.jplayer.status.width, 'height': this.jplayer.status.height});
                }
            }
        },
        volume: function(v) {
            try {
                this._getMovie().fl_volume(v);
                this.jplayer._updateVolume(v);
                this.jplayer._trigger($.jPlayer.event.volumechange);
            } catch(err) { this._flashError(err); }
        },
        mute: function(m) {
            try {
                this._getMovie().fl_mute(m);
                this.jplayer._updateMute(m);
                this.jplayer._updateVolume(this.jplayer.options.volume);
                this.jplayer._trigger($.jPlayer.event.volumechange);
            } catch(err) { this._flashError(err); }
        },
        /*jslint unused: false*/
        setPlaybackRate: function(value) {
            // Not supported
        },
        setDefaultPlaybackRate: function(value) {
            // Not supported
        },
        /*jslint unused: true*/
        updateSize: function() {
            if(!this.jplayer.status.waitForPlay && this.active && this.jplayer.status.video) {
                this.internal.flash.jq.css({'width': this.jplayer.status.width, 'height': this.jplayer.status.height});
            }
        },
        updateCanPlay: function(format) {
            var self = this;
            self.canPlay[format] = (self.format[format]) ? self.format[format].flashCanPlay && self.available : false;
        },
        updateNativeVideoControls: function() {
            // Not supported
        },
        setFullScreen: function(value) {
            this.jplayer.options.fullScreen = value;
            this.jplayer._setOption("fullWindow", value);
        },
        _getMovie: function() {
            return document[this.internal.flash.id];
        },
        _getFlashPluginVersion: function() {

            // _getFlashPluginVersion() code influenced by:
            // - FlashReplace 1.01: http://code.google.com/p/flashreplace/
            // - SWFObject 2.2: http://code.google.com/p/swfobject/

            var version = 0,
                flash;
            if(window.ActiveXObject) {
                try {
                    flash = new ActiveXObject("ShockwaveFlash.ShockwaveFlash");
                    if (flash) { // flash will return null when ActiveX is disabled
                        var v = flash.GetVariable("$version");
                        if(v) {
                            v = v.split(" ")[1].split(",");
                            version = parseInt(v[0], 10) + "." + parseInt(v[1], 10);
                        }
                    }
                } catch(e) {}
            }
            else if(navigator.plugins && navigator.mimeTypes.length > 0) {
                flash = navigator.plugins["Shockwave Flash"];
                if(flash) {
                    version = navigator.plugins["Shockwave Flash"].description.replace(/.*\s(\d+\.\d+).*/, "$1");
                }
            }
            return version * 1; // Converts to a number
        },
        _checkForFlash: function (version) {
            var flashOk = false;
            if(this._getFlashPluginVersion() >= version) {
                flashOk = true;
            }
            return flashOk;
        },
        jPlayerMsgHandler: function(args) {
            return this.jPlayerFlashEvent(args[0], args[1]);
        },
        jPlayerFlashEvent: function(eventType, status) { // Called from Flash
                if(eventType === $.jPlayer.event.ready) {
                    if(!this.internal.ready) {
                        this.internal.ready = true;
                        this.internal.flash.jq.css({'width':'0px', 'height':'0px'}); // Once Flash generates the ready event, minimise to zero as it is not affected by wmode anymore.

                        this.version.flash = status.version;
                        if(this.version.needFlash !== this.version.flash) {
                            this._error( {
                                type: $.jPlayer.solutions.flash.error.VERSION,
                                context: this.version.flash,
                                message: $.jPlayer.solutions.flash.errorMsg.VERSION + this.version.flash,
                                hint: $.jPlayer.solutions.flash.errorHint.VERSION
                            });
                        }
                        this.jplayer._trigger($.jPlayer.event.repeat); // Trigger the repeat event so its handler can initialize itself with the loop option.
                        this.jplayer._trigger(eventType);
                    } else {
                        // This condition occurs if the Flash is hidden and then shown again.
                        // Firefox also reloads the Flash if the CSS position changes. position:fixed is used for full screen.

                        // Only do this if the Flash is the solution being used at the moment. Affects Media players where both solution may be being used.
                        if(this.gate) {
                            // Send the current status to the Flash now that it is ready (available) again.
                            if(this.jplayer.status.srcSet) {

                                // Need to read original status before issuing the setMedia command.
                                var	currentTime = this.jplayer.status.currentTime,
                                    paused = this.jplayer.status.paused; 

                                this.jplayer.setMedia(this.jplayer.status.media);
                                this.jplayer.volumeWorker(this.jplayer.options.volume);
                                if(currentTime > 0) {
                                    if(paused) {
                                        this.jplayer.pause(currentTime);
                                    } else {
                                        this.jplayer.play(currentTime);
                                    }
                                }
                            }
                            this.jplayer._trigger($.jPlayer.event.flashreset);
                        }
                    }
                }
                if(this.gate) {
                    switch(eventType) {
                        case $.jPlayer.event.progress:
                            this._getFlashStatus(status);
                            this.jplayer._updateInterface();
                            this.jplayer._trigger(eventType);
                            break;
                        case $.jPlayer.event.timeupdate:
                            this._getFlashStatus(status);
                            this.jplayer._updateInterface();
                            this.jplayer._trigger(eventType);
                            break;
                        case $.jPlayer.event.play:
                            this.jplayer._seeked();
                            this.jplayer._updateButtons(true);
                            this.jplayer._trigger(eventType);
                            break;
                        case $.jPlayer.event.pause:
                            this.jplayer._updateButtons(false);
                            this.jplayer._trigger(eventType);
                            break;
                        case $.jPlayer.event.ended:
                            this.jplayer._updateButtons(false);
                            this.jplayer._trigger(eventType);
                            break;
                        case $.jPlayer.event.click:
                            this.jplayer._trigger(eventType); // This could be dealt with by the default
                            break;
                        case $.jPlayer.event.error:
                            this.jplayer.status.waitForLoad = true; // Allows the load operation to try again.
                            this.jplayer.status.waitForPlay = true; // Reset since a play was captured.
                            if(this.jplayer.status.video) {
                                this.internal.flash.jq.css({'width':'0px', 'height':'0px'});
                            }
                            if(this.jplayer._validString(this.status.media.poster)) {
                                this.jplayer.internal.poster.jq.show();
                            }
                            if(this.jplayer.css.jq.videoPlay.length && this.status.video) {
                                this.jplayer.css.jq.videoPlay.show();
                            }
                            if(this.jplayer.status.video) { // Set up for another try. Execute before error event.
                                this.setVideo(this.jplayer.status.media);
                            } else {
                                this.setAudio(this.jplayer.status.media);
                            }
                            this.jplayer._updateButtons(false);
                            this.jplayer._error( {
                                type: $.jPlayer.error.URL,
                                context:status.src,
                                message: $.jPlayer.errorMsg.URL,
                                hint: $.jPlayer.errorHint.URL
                            });
                            break;
                        case $.jPlayer.event.seeking:
                            this.jplayer._seeking();
                            this.jplayer._trigger(eventType);
                            break;
                        case $.jPlayer.event.seeked:
                            this.jplayer._seeked();
                            this.jplayer._trigger(eventType);
                            break;
                        case $.jPlayer.event.ready:
                            // The ready event is handled outside the switch statement.
                            // Captured here otherwise 2 ready events would be generated if the ready event handler used setMedia.
                            break;
                        default:
                            this.jplayer._trigger(eventType);
                    }
                }
                return false;
            },
            _getFlashStatus: function(status) {
                this.jplayer.status.seekPercent = status.seekPercent;
                this.jplayer.status.currentPercentRelative = status.currentPercentRelative;
                this.jplayer.status.currentPercentAbsolute = status.currentPercentAbsolute;
                this.jplayer.status.currentTime = status.currentTime;
                this.jplayer.status.duration = status.duration;
                this.jplayer.status.remaining = status.duration - status.currentTime;

                this.jplayer.status.videoWidth = status.videoWidth;
                this.jplayer.status.videoHeight = status.videoHeight;

                // The Flash does not generate this information in this release
                this.jplayer.status.readyState = 4; // status.readyState;
                this.jplayer.status.networkState = 0; // status.networkState;
                this.jplayer.status.playbackRate = 1; // status.playbackRate;
                this.jplayer.status.ended = false; // status.ended;
            },
            _flashError: function(error) {
                var errorType;
                if(!this.internal.ready) {
                    errorType = "FLASH";
                } else {
                    errorType = "FLASH_DISABLED";
                }
                this._error( {
                    type: $.jPlayer.solutions.flash.error[errorType],
                    context: this.internal.flash.swf,
                    message: $.jPlayer.solutions.flash.errorMsg[errorType] + error.message,
                    hint: $.jPlayer.solutions.flash.errorHint[errorType]
                });
                // Allow the audio player to recover if display:none and then shown again, or with position:fixed on Firefox.
                // This really only affects audio in a media player, as an audio player could easily move the jPlayer element away from such issues.
                this.internal.flash.jq.css({'width':'1px', 'height':'1px'});
            }
     };
     
    $.jPlayer.solutions.flash.error = {
        FLASH: "e_flash",
        FLASH_DISABLED: "e_flash_disabled",
        VERSION: "e_version"
    };

    $.jPlayer.solutions.flash.errorMsg = {
        FLASH: "jPlayer's Flash fallback is not configured correctly, or a command was issued before the jPlayer Ready event. Details: ", // Used in: _flashError()
        FLASH_DISABLED: "jPlayer's Flash fallback has been disabled by the browser due to the CSS rules you have used. Details: ", // Used in: _flashError()
        VERSION: "jPlayer " + $.jPlayer.prototype.version.script + " needs Jplayer.swf version " + $.jPlayer.solutions.flash.prototype.version.needFlash + " but found " // Used in: jPlayerReady()
    };

    $.jPlayer.solutions.flash.errorHint = {
        FLASH: "Check your swfPath option and that Jplayer.swf is there.",
        FLASH_DISABLED: "Check that you have not display:none; the jPlayer entity or any ancestor.",
        VERSION: "Update jPlayer files."
    };
}));