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
    $.jPlayer.solutions.aurora = function(jplayer, options) {
        this.name = "aurora";
        $.jPlayerSolution.call(this, jplayer, options);
        
        this.formats = [];
        this.properties = [];
     };
    $.jPlayer.solutions.aurora.prototype = {
        options: {
            formats: "wav" // List the aurora.js codecs being loaded externally. Its core supports "wav". Specify format in jPlayer context. EG., The aac.js codec gives the "m4a" format.
        },
        init: function() {
            var self = this;
            
            // Create Aurora.js formats array
            $.each(this.options.formats.toLowerCase().split(","), function(index1, value1) {
                var format = value1.replace(/^\s+|\s+$/g, ""); //trim
                if(self.jplayer.format[format]) { // Check format is valid.
                    var dupFound = false;
                    $.each(self.formats, function(index2, value2) { // Check for duplicates
                        if(format === value2) {
                            dupFound = true;
                            return false;
                        }
                    });
                    if(!dupFound) {
                        self.formats.push(format);
                    }
                }
            });
            
            this.jplayer.status.playbackRateEnabled = false;
        },
        initUse: function() {
            var self = this;
            
            self.internal.ready = false;
            
            // Ready after 100ms (required to init DOM objects properly)
            setTimeout( function() {
                self.internal.ready = true;
                self.jplayer._checkSolutionsReady();
            }, 100);
        },
        resetGate: function() {
            this.gate = false;
        },
        setAudio: function(media) {
            var self = this;            
            
            this.gate = true;
            // Always finds a format due to checks in setMedia()
            $.each(this.formats, function(priority, format) {
                if(self.support[format] && media[format]) {
                    self.jplayer.status.src = media[format];
                    self.jplayer.status.format[format] = true;
                    self.jplayer.status.formatType = format;
            
                    return false;
                }
            });
            
            this.player = new AV.Player.fromURL(this.jplayer.status.src);
            this._addAuroraEventListeners(this.player);

            if(this.jplayer.options.preload === 'auto') {
                this.load();
                this.jplayer.status.waitForLoad = false;
            }
        },
        setVideo: function() {
            this.jplayer._error( {
                type: $.jPlayer.error.NO_SUPPORT,
                context: "{supplied:'" + this.jplayer.options.supplied + "'}",
                message: $.jPlayer.errorMsg.NO_SUPPORT,
                hint: $.jPlayer.errorHint.NO_SUPPORT
            });
        },
        resetMedia: function() {
            if (this.player) {
                this.player.stop();
            }
        },
        clearMedia: function() {
            // Nothing to clear.
        },
        load: function() {
            if(this.jplayer.status.waitForLoad) {
                this.jplayer.status.waitForLoad = false;
                this.player.preload();
            }
        },
        play: function(time) {
            if (!this.jplayer.status.waitForLoad) {
                if (!isNaN(time)) {
                    this.player.seek(time);
                }
            }
            if (!this.player.playing) {
                this.player.play();
            }
            this.jplayer.status.waitForLoad = false;
            this._checkWaitForPlay();
            
            // No event from the player, update UI now.
            this.jplayer._updateButtons(true);
            this.jplayer._trigger($.jPlayer.event.play);
        },
        pause: function(time) {
            if (!isNaN(time)) {
                this.player.seek(time * 1000);
            }
            this.player.pause();
            
            if(time > 0) { // Avoids a setMedia() followed by stop() or pause(0) hiding the video play button.
                this._checkWaitForPlay();
            }
            
            // No event from the player, update UI now.
            this.jplayer._updateButtons(false);
            this.jplayer._trigger($.jPlayer.event.pause);
        },
        playHead: function(percent) {
            if(this.player.duration > 0) {
                // The seek() sould be in milliseconds, but the only codec that works with seek (aac.js) uses seconds.
                this.player.seek(percent * this.player.duration / 100); // Using seconds
            }
                
            if(!this.jplayer.status.waitForLoad) {
                this._checkWaitForPlay();
            }
        },
        _checkWaitForPlay: function() {
            if(this.jplayer.status.waitForPlay) {
                this.jplayer.status.waitForPlay = false;
            }
        },
        volume: function(v) {
            this.player.volume = v * 100;
            this.jplayer._updateVolume(v);
            this.jplayer._trigger($.jPlayer.event.volumechange);
        },
        mute: function(m) {
            if (m) {
                this.properties.lastvolume = this.player.volume;
                this.player.volume = 0;
                this.jplayer._updateMute(m);
                this.jplayer._updateVolume(this.jplayer.options.volume);
                this.jplayer._trigger($.jPlayer.event.volumechange);
            } else {
                this.player.volume = this.properties.lastvolume;
            }
            this.properties.muted = m;
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
            // Do nothing
        },
        updateCanPlay: function(format) {
            var self = this;
            self.canPlay[format] = ($.inArray(format, self.formats) > -1);
        },
        updateNativeVideoControls: function() {
            // Not supported
        },
        setFullScreen: function(value) {
            this.jplayer.options.fullScreen = value;
            this.jplayer._setOption("fullWindow", value);
        },
        /*jslint unused: false*/
        jPlayerMsgHandler: function(args) {
            // No external message to handle, messages are managed through event listeners.
        },
        /*jslint unused: true*/
        _addAuroraEventListeners : function(player) {
            var self = this;
            //player.preload = this.options.preload;
            //player.muted = this.options.muted;
            player.volume = this.options.volume * 100;

            // Create the event listeners
            player.on("progress", function() {
                if(self.gate) {
                    if(self.internal.cmdsIgnored && this.readyState > 0) { // Detect iOS executed the command
                        self.internal.cmdsIgnored = false;
                    }
                    self._getAuroraStatus(player);
                    self.jplayer._updateInterface();
                    self.jplayer._trigger($.jPlayer.event.progress);
                    // Progress with song duration, we estimate timeupdate need to be triggered too.
                    if (player.duration > 0) {
                        self.jplayer._trigger($.jPlayer.event.timeupdate);
                    }
                }
            }, false);
            player.on("ready", function() {
                if(self.gate) {
                    self.jplayer._trigger($.jPlayer.event.loadeddata);
                }
            }, false);
            player.on("duration", function() {
                if(self.gate) {
                    self._getAuroraStatus(player);
                    self.jplayer._updateInterface();
                    self.jplayer._trigger($.jPlayer.event.durationchange);
                }
            }, false);
            player.on("end", function() {
                if(self.gate) {
                    // Order of the next few commands are important. Change the time and then pause.
                    self.jplayer._updateButtons(false);
                    self._getAuroraStatus(player, true);
                    self.jplayer._updateInterface();
                    self.jplayer._trigger($.jPlayer.event.ended);
                }
            }, false);
            player.on("error", function() {
                if(self.gate) {
                    self.jplayer._updateButtons(false);
                    self.jplayer._seeked();
                    if(self.jplayer.status.srcSet) { // Deals with case of clearMedia() causing an error event.
                        self.jplayer.status.waitForLoad = true; // Allows the load operation to try again.
                        self.jplayer.status.waitForPlay = true; // Reset since a play was captured.
                        if(self.jplayer._validString(self.jplayer.status.media.poster) && !self.jplayer.status.nativeVideoControls) {
                            self.jplayer.internal.poster.jq.show();
                        }
                        if(self.jplayer.css.jq.videoPlay !== undefined && self.jplayer.css.jq.videoPlay.length) {
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
        },
        _getAuroraStatus: function(player, override) {
            var ct = 0, cpa = 0, sp = 0, cpr = 0;

            this.jplayer.status.duration = player.duration / 1000;

            ct = player.currentTime / 1000;
            cpa = (this.jplayer.status.duration > 0) ? 100 * ct / this.jplayer.status.duration : 0;
            if(player.buffered > 0) {
                sp = (this.jplayer.status.duration > 0) ? (player.buffered * this.jplayer.status.duration) / this.jplayer.status.duration : 100;
                cpr = (this.jplayer.status.duration > 0) ? ct / (player.buffered * this.jplayer.status.duration) : 0;
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

            this.jplayer.status.readyState = 4; // status.readyState;
            this.jplayer.status.networkState = 0; // status.networkState;
            this.jplayer.status.playbackRate = 1; // status.playbackRate;
            this.jplayer.status.ended = false; // status.ended;
        }
    };
}));