Playdar = function (auth_details, handlers) {
    // Setup auth
    this.auth_details = auth_details;
    // Setup handlers
    this.register_handlers(Playdar.DefaultHandlers);
    this.register_handlers(handlers);
    // Register the instance
    this.uuid = Playdar.generate_uuid();
    Playdar.last = this;
    Playdar.instances[this.uuid] = Playdar.last;
};

Playdar.last = null;
Playdar.instances = {};
Playdar.create = function (auth_details, handlers) {
    return new Playdar(auth_details, handlers);
};

Playdar.status_bar = null;

Playdar.DefaultHandlers = {
    auth: function () {
        // Playdar authorised
    },
    stat: function (detected) {
        if (detected) {
            // Playdar detected
        } else {
            // Playdar not found
        }
    },
    results: function (response, final_answer) {
        if (final_answer) {
            if (response.results.length) {
                // Found results
            } else {
                // No results
            }
        } else {
            // Still polling
        }
    }
};

Playdar.prototype = {
    auth_details: null,
    lib_version: "0.3.4",
    server_root: "localhost",
    server_port: "8888",
    stat_timeout: 2000,
    web_host: "http://www.playdar.org",
    progress_bar_width: 200,
    auth_popup_name: "PD_auth",
    auth_popup_size: {
        'w': 500,
        'h': 260
    },
    
    handlers: {},
    register_handler: function (handler_name, callback) {
        if (!callback) {
            var callback = function () {};
        }
        var that = this;
        this.handlers[handler_name] = function () { return callback.apply(that, arguments); };
    },
    register_handlers: function (handlers) {
        if (!handlers) {
            return;
        }
        for (handler in handlers) {
            this.register_handler(handler, handlers[handler]);
        }
        return true;
    },
    // Custom search result handlers can be bound to a specific qid
    results_handlers: {},
    register_results_handler: function (handler, qid) {
        if (qid) {
            this.results_handlers[qid] = handler;
        } else {
            this.register_handler('results', handler);
        }
    },
    
    // INIT / STAT / AUTH
    
    auth_token: false,
    init: function () {
        if (!this.auth_token) {
            this.auth_token = Playdar.getcookie('auth');
        }
        this.stat();
    },
    
    stat_response: false,
    stat: function () {
        var that = this;
        setTimeout(function () {
            that.check_stat_timeout();
        }, this.stat_timeout);
        Playdar.loadjs(this.get_url("stat", "handle_stat"));
    },
    check_stat_timeout: function () {
        if (!this.stat_response || this.stat_response.name != "playdar") {
            this.handlers.stat(false);
        }
    },
    handle_stat: function (response) {
        // console.dir(response);
        this.stat_response = response;
        if (response.authenticated) {
            this.detected_version = response.version;
            this.handlers.auth();
        } else if (this.auth_token) {
            this.clear_auth();
        }
        this.stat_detected();
        this.handlers.stat(true);
    },
    clear_auth: function () {
        this.auth_token = false;
        Playdar.deletecookie('auth');
    },
    stat_detected: function () {
        this.show_detected_message();
    },
    show_detected_message: function () {
        var logo = '<img src="' + this.web_host + '/static/playdar_logo_16x16.png" width="16" height="16" style="vertical-align: middle; float: left; margin: 0 5px 0 0; border: 0;" />';
        var message = logo;
        if (this.auth_token) {
            message += ' <a href="' + this.get_base_url() + '" target="_blank">Playdar Settings</a>';
        } else if (this.manual_auth) {
            var input_id = "manualAuth_" + this.uuid;
            message += '<input type="text" id="' + input_id + '" />'
                        + ' <input type="submit" value="Auth" onclick="'
                            + this.jsonp_callback('manual_auth_callback') + '(\'' + input_id + '\');'
                            + 'return false;'
                        + '" />';
        } else if (this.auth_details) {
            message += '<a href="' + this.get_auth_url()
                         + '" target="' + this.auth_popup_name
                         + '" onclick="return ' + this.jsonp_callback('start_auth') + '();">Authorise Playdar</a>';
        }
        this.show_status(message);
    },
    get_auth_url: function () {
        return this.get_base_url("/auth_1/?" + Playdar.toQueryString(this.auth_details));
    },
    auth_popup: null,
    manual_auth: false,
    start_auth: function () {
        if (this.auth_popup === null || this.auth_popup.closed) {
            this.auth_popup = window.open(
                this.get_auth_url(),
                this.auth_popup_name,
                this.get_auth_popup_options()
            );
        } else {
            this.auth_popup.focus();
        }
        if (!this.auth_details.receiverurl) {
            // Show manual auth form
            this.manual_auth = true;
            this.show_detected_message();
        }
        return false;
    },
    get_auth_popup_options: function () {
        var popup_location = this.get_auth_popup_location();
        return [
            "left=" + popup_location.x,
            "top=" + popup_location.y,
            "width=" + this.auth_popup_size.w,
            "height=" + this.auth_popup_size.h,
            "location=yes",
            "toolbar=no",
            "menubar=yes",
            "status=yes",
            "resizable=yes",
            "scrollbars=yes"
        ].join(',');
    },
    get_auth_popup_location: function () {
        var window_location = Playdar.get_window_location();
        var window_size = Playdar.get_window_size();
        return {
            'x': Math.max(0, window_location.x + (window_size.w - this.auth_popup_size.w) / 2),
            'y': Math.max(0, window_location.y + (window_size.h - this.auth_popup_size.h) / 2)
        };
    },
    
    auth_callback: function (token) {
        Playdar.setcookie('auth', token, 365);
        if (this.auth_popup !== null && !this.auth_popup.closed) {
            this.auth_popup.close();
        }
        this.auth_token = token;
        this.manual_auth = false;
        this.stat();
    },
    manual_auth_callback: function (input_id) {
        var input = document.getElementById(input_id);
        if (input && input.value) {
            this.auth_callback(input.value);
        }
    },
    
    // CONTENT RESOLUTION
    
    resolve_qids: [],
    last_qid: "",
    request_count: 0,
    pending_count: 0,
    success_count: 0,
    poll_counts: {},
    resolve: function (art, alb, trk, qid) {
        params = {
            artist: art,
            album: alb,
            track: trk
        };
        if (typeof qid !== 'undefined') {
            params.qid = qid;
        }
        this.increment_requests();
        Playdar.loadjs(this.get_url("resolve", "handle_resolution", params));
    },
    handle_resolution: function (response) {
        // console.dir(response);
        this.last_qid = response.qid;
        this.resolve_qids.push(this.last_qid);
        this.get_results(response.qid);
    },
    increment_requests: function () {
        this.request_count++;
        this.pending_count++;
        this.show_resolution_status();
    },
    show_resolution_status: function () {
        if (this.query_count) {
            var status = "Resolved: " + this.success_count + "/" + this.request_count;
            if (this.pending_count) {
                status += ' <img src="' + this.web_host + '/static/spinner_10px.gif" width="10" height="10" style="vertical-align: middle; margin: -2px 2px 0 2px"/> ' + this.pending_count;
            }
            this.query_count.innerHTML = status;
        }
    },
    
    // poll results for a query id
    get_results: function (qid) {
        Playdar.loadjs(this.get_url("get_results", "handle_results", {
            qid: qid
        }));
    },
    handle_results: function (response) {
        // console.dir(response);
        // figure out if we should re-poll, or if the query is solved/failed:
        var that = this;
        var final_answer = that.should_stop_polling(response);
        if (!final_answer) {
            setTimeout(function () {
                that.get_results(response.qid);
            }, response.refresh_interval);
        }
        
        that.call_results_handler(response, final_answer);
        
        if (final_answer) {
            that.pending_count--;
            if (response.results.length) {
                that.success_count++;
            }
        }
        
        that.show_resolution_status();
    },
    should_stop_polling: function (response) {
        // Stop if we've exceeded our refresh limit
        if (response.refresh_interval <= 0) {
            return true;
        }
        // Stop if the query is solved
        if (response.query.solved == true) {
            return true;
        }
        // Stop if we've got a perfect match
        if (response.results.length && response.results[0].score == 1.0) {
            return true;
        }
        // Stop if we've exceeded 4 poll requests
        if (!this.poll_counts[response.qid]) {
            this.poll_counts[response.qid] = 0;
        }
        if (++this.poll_counts[response.qid] >= 4) {
            return true;
        }
        return false;
    },
    call_results_handler: function (response, final_answer) {
        if (response.qid && this.results_handlers[response.qid]) {
            // try a custom handler registered for this query id
            this.results_handlers[response.qid](response, final_answer);
        } else {
            // fall back to standard handler
            this.handlers.results(response, final_answer);
        }
    },
    get_last_results: function () {
        if (this.last_qid) {
            this.increment_requests();
            this.get_results(this.last_qid);
        }
    },
    
    // SOUNDMANAGER 2 WRAPPERS
    
    results: {},
    nowplayingid: null,
    register_stream: function (result, options) {
        if (!this.soundmanager) {
            return false;
        }
        
        // Register result
        this.results[result.sid] = result;
        
        if (!options) {
            var options = {};
        }
        options.id = result.sid;
        options.url = this.get_stream_url(result.sid);
        var that = this;
        options.whileplaying = function () {
            if (that.progress) {
                // Update the track progress
                that.track_elapsed.innerHTML = Playdar.mmss(Math.round(this.position/1000));
                // Update the playback progress bar
                var duration;
                if (this.readyState == 3) { // loaded/success
                    duration = this.duration;
                } else {
                    duration = this.durationEstimate;
                }
                var portion_played = this.position/duration;
                that.playhead.style.width = Math.round(portion_played*that.progress_bar_width) + "px";
            }
        };
        options.whileloading = function () {
            if (that.progress) {
                // Update the loading progress bar
                var buffered = this.bytesLoaded/this.bytesTotal;
                that.bufferhead.style.width = Math.round(buffered*that.progress_bar_width) + "px";
            }
        };
        var sound = this.soundmanager.createSound(options);
    },
    play_stream: function (sid) {
        if (!this.soundmanager) {
            return false;
        }
        var sound = this.soundmanager.getSoundById(sid);
        if (this.nowplayingid != sid && sound.playState == 0) {
            this.stop_all();
            // Initialise the track progress
            this.track_elapsed.innerHTML = Playdar.mmss(0);
            // Update the track link
            this.track_link.href = this.get_stream_url(this.results[sid].sid);
            this.track_link.title = this.results[sid].source;
            this.track_name.innerHTML = this.results[sid].track;
            this.artist_name.innerHTML = this.results[sid].artist;
            // Update the track duration
            this.track_duration.innerHTML = Playdar.mmss(this.results[sid].duration);
            // Show progress bar
            this.progress.style.visibility = "visible";
            
            this.nowplayingid = sid;
        }
        
        sound.togglePause();
        return sound;
    },
    stop_all: function () {
        if (this.soundmanager) {
            this.soundmanager.stopAll();
        }
        if (this.progress) {
            this.progress.style.visibility = "hidden";
        }
        if (this.track_name) {
            this.track_name.innerHTML = "";
        }
    },
    
    // UTILITY FUNCTIONS
    
    get_base_url: function (path) {
        var url = "http://" + this.server_root + ":" + this.server_port;
        if (path) {
            url += path;
        }
        return url;
    },
    
    // build an api url for playdar requests
    get_url: function (method, jsonp, options) {
        if (!options) {
            options = {};
        }
        options.method = method;
        options.jsonp = this.jsonp_callback(jsonp);
        if (this.auth_token) {
            options.auth = this.auth_token;
        }
        // console.dir(options);
        return this.get_base_url("/api/?" + Playdar.toQueryString(options));
    },
    
    // turn a source id into a stream url
    get_stream_url: function (sid) {
        return this.get_base_url("/sid/" + sid);
    },
    
    // build the jsonp callback string
    jsonp_callback: function (callback) {
        return "Playdar.instances['" + this.uuid + "']." + callback;
    },
    
    list_results: function (response) {
        for (var i = 0; i < response.results.length; i++) {
            console.log(response.results[i].name);
        }
    },
    
    // STATUS BAR
    
    show_status: function (text, bg, colour) {
        var that = this;
        if (!bg) {
            var bg = "cbdab1";
        }
        if (!colour) {
            var colour = "517e09";
        }
        
        if (!Playdar.status_bar) {
            /* Left column */
            var left_col = document.createElement("td");
            left_col.style.padding = "7px";
            left_col.style.width = "300px";
            // Status
            var status = document.createElement("p");
            status.style.margin = "0";
            // - Status message
            this.status_message = document.createElement("span");
            status.appendChild(this.status_message);
            left_col.appendChild(status);
            
            /* Middle column */
            var middle_col = document.createElement("td");
            middle_col.style.padding = "7px";
            middle_col.style.textAlign = "center";
            // Playback row
            var playback_row = document.createElement("tr");
            // - Now playing track
            var track_title = document.createElement("p");
            track_title.style.margin = "0";
            this.track_link = document.createElement("a");
            this.track_link.style.textDecoration = "none";
            this.track_name = document.createElement("strong");
            this.track_name.style.margin = "0 5px";
            this.track_name.style.color = "#3e6206";
            this.artist_name = document.createElement("span");
            this.artist_name.style.textTransform = "uppercase";
            this.artist_name.style.color = "#5d8a0e";
            this.track_link.appendChild(this.track_name);
            this.track_link.appendChild(this.artist_name);
            track_title.appendChild(this.track_link);
            middle_col.appendChild(track_title);
            
            // L: - Time elapsed
            this.track_elapsed = document.createElement("td");
            this.track_elapsed.style.verticalAlign = "middle";
            playback_row.appendChild(this.track_elapsed);
            // M: Bar column
            var progress_cell = document.createElement("td");
            progress_cell.style.padding = "0 5px";
            progress_cell.style.verticalAlign = "middle";
            // Bar container
            var progress_bar = document.createElement("div");
            progress_bar.style.width = this.progress_bar_width + "px";
            progress_bar.style.height = "9px";
            progress_bar.style.border = "1px solid #517e09";
            progress_bar.style.background = "#fff";
            progress_bar.style.position = "relative";
            // - Buffer progress
            this.bufferhead = document.createElement("div");
            this.bufferhead.style.position = "absolute";
            this.bufferhead.style.width = 0;
            this.bufferhead.style.height = "9px";
            this.bufferhead.style.background = "#e1f1c5";
            progress_bar.appendChild(this.bufferhead);
            // - Playback progress
            this.playhead = document.createElement("div");
            this.playhead.style.position = "absolute";
            this.playhead.style.width = 0;
            this.playhead.style.height = "9px";
            this.playhead.style.background = "#98be3d";
            progress_bar.appendChild(this.playhead);
            // Click to toggle pause
            progress_bar.onclick = function () {
                if (that.nowplayingid) {
                    that.play_stream(that.nowplayingid);
                }
            };
            progress_cell.appendChild(progress_bar);
            playback_row.appendChild(progress_cell);
            // R: - Track duration
            this.track_duration = document.createElement("td");
            this.track_duration.style.verticalAlign = "middle";
            playback_row.appendChild(this.track_duration);
            // - Playback Progress table
            this.progress = document.createElement("table");
            this.progress.setAttribute('cellpadding', 0);
            this.progress.setAttribute('cellspacing', 0);
            this.progress.setAttribute('border', 0);
            // this.progress.style.cssFloat = "right";
            this.progress.style.margin = "0 auto";
            this.progress.style.color = "#517e09";
            this.progress.style.font = 'normal 10px/16px "Verdana", sans-serif';
            this.progress.style.visibility = "hidden";
            var playback_tbody = document.createElement("tbody");
            playback_tbody.appendChild(playback_row);
            this.progress.appendChild(playback_tbody);
            middle_col.appendChild(this.progress);
            
            /* Right column */
            right_col = document.createElement("td");
            right_col.style.padding = "7px";
            right_col.style.width = "300px";
            right_col.style.textAlign = "right";
            // - Query count
            this.query_count = document.createElement("span");
            right_col.appendChild(this.query_count);
            
            /* Build status bar structure */
            // Bar row
            Playdar.status_bar = document.createElement("tr");
            Playdar.status_bar.appendChild(left_col);
            Playdar.status_bar.appendChild(middle_col);
            Playdar.status_bar.appendChild(right_col);
            // Bar tbody
            this.status_tbody = document.createElement("tbody");
            this.status_tbody.appendChild(Playdar.status_bar);
            // Bar table
            this.status_table = document.createElement("table");
            this.status_table.setAttribute('cellpadding', 0);
            this.status_table.setAttribute('cellspacing', 0);
            this.status_table.setAttribute('border', 0);
            this.status_table.style.position = 'fixed';
            this.status_table.style.bottom = 0;
            this.status_table.style.left = 0;
            this.status_table.style.width = '100%';
            this.status_table.style.height = '31px';
            this.status_table.style.borderTop = '1px solid #bbb';
            this.status_table.style.font = 'normal 10px/16px "Verdana", sans-serif';
            this.status_table.appendChild(this.status_tbody);
            document.body.appendChild(this.status_table);
            
            /* Adjust the page bottom margin to fit status bar */
            var marginBottom = document.body.style.marginBottom;
            if (!marginBottom) {
                var css = document.defaultView.getComputedStyle(document.body, null);
                if (css) {
                    marginBottom = css.marginBottom;
                }
            }
            document.body.style.marginBottom = (marginBottom.replace('px', '') - 0) + 31 + 'px';
        }
        
        this.status_message.innerHTML = text;
        this.status_table.style.color = "#" + colour;
        this.status_table.style.background = '#' + bg;
    }
};

/*
Based on: Math.uuid.js
Version: 1.3
Latest version:   http://www.broofa.com/Tools/Math.uuid.js
Information:      http://www.broofa.com/blog/?p=151
Contact:          robert@broofa.com
----
Copyright (c) 2008, Robert Kieffer
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
    * Neither the name of Robert Kieffer nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
Playdar.generate_uuid = function () {
    // Private array of chars to use
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    var uuid = [];
    var rnd = Math.random;
    
    // rfc4122, version 4 form
    var r;
    
    // rfc4122 requires these characters
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    uuid[14] = '4';
    
    // Fill in random data.  At i==19 set the high bits of clock sequence as
    // per rfc4122, sec. 4.1.5
    for (var i = 0; i < 36; i++) {
        if (!uuid[i]) {
            r = 0 | rnd()*16;
            uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r & 0xf];
        }
    }
    return uuid.join('');
};

Playdar.toQueryString = function (params) {
    function toQueryPair(key, value) {
        if (value === null) {
            return key;
        }
        return key + '=' + encodeURIComponent(value);
    }
    
    var results = [];
    for (key in params) {
        var values = params[key];
        key = encodeURIComponent(key);
        
        if (Object.prototype.toString.call(values) == '[object Array]') {
            for (i = 0; i < values.length; i++) {
                results.push(toQueryPair(key, values[i]));
            }
        } else {
            results.push(toQueryPair(key, values));
        }
    }
    return results.join('&');
};

// format secs -> mm:ss helper.
Playdar.mmss = function (secs) {
    var s = secs % 60;
    if (s < 10) {
        s = "0" + s;
    }
    return Math.floor(secs/60) + ":" + s;
};
    
Playdar.loadjs = function (url) {
   var s = document.createElement("script");
   s.src = url;
   document.getElementsByTagName("head")[0].appendChild(s);
   // console.info('loadjs:', url);
};

Playdar.setcookie = function (name, value, days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        var expires = "; expires=" + date.toGMTString();
    } else {
        var expires = "";
    }
    document.cookie = "PD_" + name + "=" + value + expires + "; path=/";
};
Playdar.getcookie = function (name) {
    var namekey = "PD_" + name + "=";
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length;i++) {
        var c = cookies[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1, c.length);
        }
        if (c.indexOf(namekey) == 0) {
            return c.substring(namekey.length, c.length);
        }
    }
    return null;
};
Playdar.deletecookie = function (name) {
    Playdar.setcookie(name, "", -1);
};
Playdar.get_window_location = function () {
    var location = {};
    if (window.screenLeft) {
        location.x = window.screenLeft || 0;
        location.y = window.screenTop || 0;
    } else {
        location.x = window.screenX || 0;
        location.y = window.screenY || 0;
    }
    return location;
};
Playdar.get_window_size = function () {
    return {
        'w': (window && window.innerWidth) || 
             (document && document.documentElement && document.documentElement.clientWidth) || 
             (document && document.body && document.body.clientWidth) || 
             0,
        'h': (window && window.innerHeight) || 
             (document && document.documentElement && document.documentElement.clientHeight) || 
             (document && document.body && document.body.clientHeight) || 
             0
    };
};