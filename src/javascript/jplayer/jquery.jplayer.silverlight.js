/*
    jquery.jplayer.silverlight.js
    Silverlight solution plugin for jPlayer
    
    silverlightmediaelement.xap file from mediaelement.js plugin is required to work
    https://github.com/johndyer/mediaelement/raw/master/build/silverlightmediaelement.xap
*/
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
    $.jPlayer.solutions.silverlight = function(jplayer, options) {
        this.name = "silverlight";
        $.jPlayerSolution.call(this, jplayer, options);
        this.options = $.extend(true, {}, this.options, options);
        
        this.internal.silverlight = $.extend({}, {
            id: this.jplayer.options.idPrefix + "_silverlight_" + this.jplayer.count,
            jq: undefined,
            xap: this.options.xapPath + (this.options.xapPath.toLowerCase().slice(-4) !== ".xap" ? (this.options.xapPath && this.options.xapPath.slice(-1) !== "/" ? "/" : "") + "silverlightmediaelement.xap" : "")
        });
     };
     $.jPlayer.solutions.silverlight.prototype = {
        version: {
            // We cannot check silverlightmediaelement.xap version as version info is not passed in javascript callback (fork?) 
            needSilverlight: "1.0.0.0",
            silverlight: "unknown"
        },
        options: {
            xapPath: "js" // Path to silverlightmediaelement.xap. Can be relative, absolute or server root relative.
        },
        format: { // Static Object
            mp3: {
                canPlay: true
            },
            wav: {
                canPlay: true
            },
            wma: {
                canPlay: true
            },
            wmv: {
                canPlay: true
            },
            m4v: {
                canPlay: true
            }
        },
        init: function() {
            this.available = this._checkForSilverlight("3.0.0.0");
        },
        initUse: function() {
            var self = this;
            
            this.internal.ready = false;
            if(this.used) {
                var silverlightVars = [
                    'id=' + encodeURI(this.jplayer.internal.self.id),
                    'jsinitfunction=' + "$.jPlayer.solutions.silverlight.initPlugin",
                    'jscallbackfunction=' + "$.jPlayer.solutions.silverlight.fireEvent",
                    'preload=' + this.jplayer.options.preload,
                    'controls' + this.jplayer.options.nativeVideoControls,
                    'smoothing' + this.jplayer.options.smoothPlayBar,
                    'startvolume=' + (!this.jplayer.options.muted) ? this.jplayer.options.volume : 0
                ];
                
                var createParam = function(el, n, v) {
                    var p = document.createElement("param");
                    p.setAttribute("name", n);	
                    p.setAttribute("value", v);
                    el.appendChild(p);
                };

                var htmlObj = document.createElement("object");
                htmlObj.setAttribute("data", "data:application/x-silverlight-2,");
                htmlObj.setAttribute("id", this.internal.silverlight.id);
                htmlObj.setAttribute("width", "1");
                htmlObj.setAttribute("height", "1");
                htmlObj.setAttribute("tabindex", "-1");
                createParam(htmlObj, "source", this.internal.silverlight.xap);
                createParam(htmlObj, "initParams", silverlightVars.join(','));
                createParam(htmlObj, "allowScriptAccess", "always");
                createParam(htmlObj, "minRuntimeVersion", "3.0.0.0");
                createParam(htmlObj, "autoUpgrade", "true");
                createParam(htmlObj, "bgcolor", this.jplayer.options.backgroundColor);
                createParam(htmlObj, "wmode", this.jplayer.options.wmode);

                this.jplayer.element.append(htmlObj);
                this.internal.silverlight.jq = $(htmlObj);
                
                this.jplayer.status.playbackRateEnabled = false;
            } else {
                // If Silverlight is not used, then emulate silverlight ready() call after 100ms.
                setTimeout( function() {
                    self.internal.ready = true;
                    self.version.silverlight = "n/a";
                    self.jplayer._checkSolutionsReady();
                }, 100);
            }
        },
        resetGate: function() {
            this.gate = false;
        },
        setAudio: function(media) {
            this._setMedia(media);
        },
        setVideo: function(media) {
            this._setMedia(media);
        },
        _setMedia: function(media) {
            var self = this;
            this.gate = true;
            try {
                // Always finds a format due to checks in setMedia()
                $.each(this.jplayer.formats, function(priority, format) {
                    if(self.support[format] && media[format]) {
                        self._getApi().setSrc(media[format]);
                        
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
            } catch(err) { this._silverlightError(err); }
        },
        resetMedia: function() {
            this.internal.silverlight.jq.css({'width':'0px', 'height':'0px'}); // Must do via CSS as setting attr() to zero causes a jQuery error in IE.
            this.stop();
        },
        clearMedia: function() {
            
        },
        load: function() {
            try {
                this._getApi().loadMedia();
            } catch(err) { this._silverlightError(err); }
            this.jplayer.status.waitForLoad = false;
        },
        play: function(time) {
            try {
                this._getApi().playMedia();
                if (time) {
                    this._getApi().setCurrentTime(time);
                }
            } catch(err) { this._silverlightError(err); }
            this.jplayer.status.waitForLoad = false;
            this._checkWaitForPlay();
        },
        pause: function(time) {
            try {
                if (time) {
                    this._getApi().setCurrentTime(time);
                }
                this._getApi().pauseMedia();
            } catch(err) { this._silverlightError(err); }
        },
        stop: function() {
            try {
                this._getApi().stopMedia();
            } catch(err) { this._silverlightError(err); }
            this.jplayer.status.waitForLoad = true;
        },
        playHead: function(p) {
            this.play(p * this.jplayer.status.duration / 100);
        },
        _checkWaitForPlay: function() {
            if(this.jplayer.status.waitForPlay) {
                this.jplayer.status.waitForPlay = false;
                if(this.jplayer.css.jq.videoPlay !== undefined && this.jplayer.css.jq.videoPlay.length) {
                    this.jplayer.css.jq.videoPlay.hide();
                }
                if(this.jplayer.status.video) {
                    this.jplayer.internal.poster.jq.hide();
                    this.internal.silverlight.jq.css({'width': this.jplayer.status.width, 'height': this.jplayer.status.height});
                }
            }
        },
        volume: function(v) {
            try {
                this._getApi().setVolume(v);
                this.jplayer._updateVolume(v);
                this.jplayer._trigger($.jPlayer.event.volumechange);
            } catch(err) { this._silverlightError(err); }
        },
        mute: function(m) {
            try {
                this._getApi().setMuted(m);
                this.jplayer._updateMute(m);
                this.jplayer._updateVolume(this.jplayer.options.volume);
                this.jplayer._trigger($.jPlayer.event.volumechange);
            } catch(err) { this._silverlightError(err); }
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
                this.internal.silverlight.jq.css({'width': this.jplayer.status.width, 'height': this.jplayer.status.height});
            }
        },
        updateCanPlay: function(format) {
            var self = this;
            self.canPlay[format] = (self.format[format]) ? self.format[format].canPlay && self.available : false;
        },
        updateNativeVideoControls: function() {
            // Not supported
        },
        setFullScreen: function(value) {
            this.jplayer.options.fullScreen = value;
            this.jplayer._setOption("fullWindow", value);
            /*try {
                this._getApi().setFullscreen(value);
            } catch(err) { this._silverlightError(err); }*/
        },
        _getMovie: function() {
            return document[this.internal.silverlight.id];
        },
        _getApi: function() {
            return this._getMovie().Content.MediaElementJS;
        },
        _getSilverlightPluginVersion: function() {

            // _getSilverlightPluginVersion() code influenced by:
            // - http://www.silverlightversion.com/

            var v = [0,0,0,0],
                silverlight;
            if(window.ActiveXObject) {
                try {
                    silverlight = new ActiveXObject("AgControl.AgControl");
                    if (silverlight) { // silverlight will return null when ActiveX is disabled
                        var loopMatch = function(ax, v, i, n) {
                            while(ax.isVersionSupported(v[0]+ "."+ v[1] + "." + v[2] + "." + v[3])){
                                v[i]+=n;
                            }
                            v[i] -= n;
                        };
                        loopMatch(silverlight, v, 0, 1);
                        loopMatch(silverlight, v, 1, 1);
                        loopMatch(silverlight, v, 2, 10000);
                        loopMatch(silverlight, v, 2, 1000);
                        loopMatch(silverlight, v, 2, 100);
                        loopMatch(silverlight, v, 2, 10);
                        loopMatch(silverlight, v, 2, 1);
                        loopMatch(silverlight, v, 3, 1);
                    }
                } catch(e) {}
            }
            else if(navigator.plugins && navigator.mimeTypes.length > 0) {
                silverlight = navigator.plugins["Silverlight Plug-In"];
                if(silverlight) {
                    v = silverlight.description.replace(/.*\s(\d+\.\d+\.\d+\.\d+).*/, "$1").split('.');
                }
            }
            return v;
        },
        _checkForSilverlight: function (version) {
            var slOk = false;
            var v = version.split('.');
            var slv = this._getSilverlightPluginVersion();
            
            for (var i = 0; i < slv.length; ++i) {
                if (v.length === i) {
                    slOk = true;
                    break;
                }

                if (slv[i] === v[i]) {
                    continue;
                }
                else if (slv[i] > v[i]) {
                    slOk = true;
                    break;
                }
                else {
                    break;
                }
            }
            return slOk;
        },
        jPlayerMsgHandler: function(args) {
            return this.jPlayerSilverlightEvent(args[0], args[1]);
        },
        jPlayerSilverlightEvent: function(eventType, status) { // Called from Silverlight
                if(this.gate) {
                    switch(eventType) {
                        case "progress":
                        case "timeupdate":
                            this._getSilverlightStatus(status);
                            this.jplayer._updateInterface();
                            this.jplayer._trigger($.jPlayer.event[eventType]);
                            break;
                        case "play":
                            this.jplayer._seeked();
                            this.jplayer._updateButtons(true);
                            this.jplayer._trigger($.jPlayer.event[eventType]);
                            break;
                        case "pause":
                        case "paused":
                            this.jplayer._updateButtons(false);
                            this.jplayer._trigger($.jPlayer.event.pause);
                            break;
                        case "ended":
                            this.jplayer._updateButtons(false);
                            this.jplayer._trigger($.jPlayer.event[eventType]);
                            break;
                        case "click":
                            this.jplayer._trigger($.jPlayer.event[eventType]); // This could be dealt with by the default
                            break;
                        case "seeking":
                            this.jplayer._seeking();
                            this.jplayer._trigger($.jPlayer.event[eventType]);
                            break;
                        case "seeked":
                            this.jplayer._seeked();
                            this.jplayer._trigger($.jPlayer.event[eventType]);
                            break;
                        case "ready":
                            // The ready event is handled outside the switch statement.
                            // Captured here otherwise 2 ready events would be generated if the ready event handler used setMedia.
                            break;
                        case "loadstart":
                            break;
                        case "loadedmetadata":
                            break;
                        case "loadeddata":
                            break;
                        case "canplay":
                            break;
                        case "playing":
                            break;
                        default:
                            // Default is an error (because of exception e.ToString() in SilverlightMediaElement)
                            this.jplayer.status.waitForLoad = true; // Allows the load operation to try again.
                            this.jplayer.status.waitForPlay = true; // Reset since a play was captured.
                            if(this.jplayer.status.video) {
                                this.internal.silverlight.jq.css({'width':'0px', 'height':'0px'});
                            }
                            if(this.jplayer._validString(this.jplayer.status.media.poster)) {
                                this.jplayer.internal.poster.jq.show();
                            }
                            if(this.jplayer.css.jq.videoPlay.length && this.jplayer.status.video) {
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
                                context:eventType,
                                message: $.jPlayer.errorMsg.URL,
                                hint: $.jPlayer.errorHint.URL
                            });
                    }
                }
                return false;
            },
            _getSilverlightStatus: function(status) {
                var cpa = 0, sp = 0, cpr = 0;
                this.jplayer.status.currentTime = status.currentTime;
                if (this.jplayer.status.duration !== status.duration) {
                    this.jplayer.status.duration = status.duration;
                    this.jplayer._trigger($.jPlayer.event.durationchange);
                }
                
                if (this.options.volume !== status.volume) {
                    this.options.volume = status.volume;
                    this.jplayer._trigger($.jPlayer.event.volumechange);
                }
            
                cpa = (this.jplayer.status.duration > 0) ? 100 * this.jplayer.status.currentTime / this.jplayer.status.duration : 0;
                sp = (this.jplayer.status.duration > 0) ? (100 * this.jplayer.status.duration) / this.jplayer.status.duration : 100;
                cpr = (this.jplayer.status.duration > 0) ? this.jplayer.status.currentTime / (100 * this.jplayer.status.duration) : 0;
                
                this.jplayer.status.seekPercent = sp;
                this.jplayer.status.currentPercentRelative = cpr;
                this.jplayer.status.currentPercentAbsolute = cpa;
                this.jplayer.status.remaining = this.jplayer.status.duration - this.jplayer.status.currentTime;
                
                this.jplayer.status.readyState = 4;
                this.jplayer.status.networkState = 0;
                this.jplayer.status.playbackRate = 1;
                if (this.jplayer.status.ended !== status.ended) {
                    this.jplayer._trigger($.jPlayer.event.ended);
                    this.jplayer.status.ended = status.ended;
                }
            },
            _silverlightError: function(error) {
                var errorType;
                if(!this.internal.ready) {
                    errorType = "SILVERLIGHT";
                } else {
                    errorType = "SILVERLIGHT_DISABLED";
                }
                this.jplayer._error( {
                    type: $.jPlayer.solutions.silverlight.error[errorType],
                    context: this.internal.silverlight.xap,
                    message: $.jPlayer.solutions.silverlight.errorMsg[errorType] + error.message,
                    hint: $.jPlayer.solutions.silverlight.errorHint[errorType]
                });
                // Allow the audio player to recover if display:none and then shown again, or with position:fixed on Firefox.
                // This really only affects audio in a media player, as an audio player could easily move the jPlayer element away from such issues.
                this.internal.silverlight.jq.css({'width':'1px', 'height':'1px'});
            }
    };
    
    $.jPlayer.solutions.silverlight.initPlugin = function(id) {
        var jp = $("#" + id).data('jPlayer');
        jp.internal.ready = true;
        jp._trigger($.jPlayer.event.ready);
     };
     
     $.jPlayer.solutions.silverlight.fireEvent = function(id, name, status) {
        var jp = $("#" + id).data('jPlayer');
        jp.jPlayerMsgHandler(name, status);
     };
     
    $.jPlayer.solutions.silverlight.error = {
        SILVERLIGHT: "e_silverlight",
        SILVERLIGHT_DISABLED: "e_silverlight_disabled",
        VERSION: "e_version"
    };

    $.jPlayer.solutions.silverlight.errorMsg = {
        SILVERLIGHT: "jPlayer's Silverlight fallback is not configured correctly, or a command was issued before the jPlayer Ready event. Details: ",
        SILVERLIGHT_DISABLED: "jPlayer's Silverlight fallback has been disabled by the browser due to the CSS rules you have used. Details: ",
        VERSION: "jPlayer " + $.jPlayer.prototype.version.script + " needs silverlightmediaelement.xap version " + $.jPlayer.solutions.silverlight.prototype.version.needSilverlight + " but found "
    };

    $.jPlayer.solutions.silverlight.errorHint = {
        SILVERLIGHT: "Check your xapPath option and that silverlightmediaelement.xap is there.",
        SILVERLIGHT_DISABLED: "Check that you have not display:none; the jPlayer entity or any ancestor.",
        VERSION: "Update jPlayer files."
    };
}));