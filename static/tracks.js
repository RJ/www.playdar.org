PlaydarTracks = {
    playlist: {},
    playlistButtonHandler: function (parent) {
        // Get the qid from the parent list item
        var qid = parent.id.replace('qid', '').replace('pl', '');
        var queryItem = document.getElementById('qid' + qid);
        var playlist = document.getElementById('playlist');
        var playlistEmpty = document.getElementById('playlistEmpty');
        if (PlaydarTracks.playlist[qid]) {
            // Remove added class
            queryItem.className = queryItem.className.replace(' added', '').replace('added', '');
            // Remove the track item from the playlist
            var playlistItem = document.getElementById('pl' + qid);
            playlist.removeChild(playlistItem);
            PlaydarTracks.playlist[qid] = false;
            // Show message if empty
            var empty = true;
            for (q in PlaydarTracks.playlist) {
                if (PlaydarTracks.playlist[q] === true) {
                    empty = false;
                }
            }
            if (empty) {
                playlistEmpty.style.display = '';
            }
        } else {
            // Add added class
            queryItem.className += ' added';
            // Copy the track item to the playlist
            var playlistItem = queryItem.cloneNode(true);
            playlistItem.id = 'pl' + qid;
            // Remove open class
            playlistItem.className = playlistItem.className.replace(' open', '').replace('open', '');
            playlist.appendChild(playlistItem);
            PlaydarTracks.playlist[qid] = true;
            // Hide empty message
            playlistEmpty.style.display = 'none';
        }
        var fade = new Fade('playlistTracksTab', '#c0e95b', '#e8f9bb', 15, 20, 0);
        fade.init();
        return false;
    },
    
    trackToggleHandler: function (parent) {
        if (parent.className.match(/open/)) {
            parent.className = parent.className.replace(' open', '').replace('open', '');
        } else {
            parent.className += ' open';
        }
        return false;
    },
    
    resultPlayHandler: function (result) {
        var sid = result.id.replace('sid', '');
        Playdar.player.play_stream(sid);
    },
    
    trackListClickHandler: function (e) {
        var target = Playdar.Util.getTarget(e);
        var parent;
        while (target) {
            if (target) {
                parent = target.parentNode;
                if (target.nodeName == 'A' && target.className == 'playlist') {
                    target.blur();
                    return PlaydarTracks.playlistButtonHandler(parent);
                } else if (target.nodeName == 'A' && target.className == 'track') {
                    target.blur();
                    return PlaydarTracks.trackToggleHandler(parent);
                } else if (target.nodeName == 'TBODY' && target.className.match(/result/)) {
                    PlaydarTracks.resultPlayHandler(target);
                }
            }
            target = parent;
        }
    },
    
    tabList: ['allTracks', 'playlistTracks'],
    tabClickHandler: function (e) {
        var target = Playdar.Util.getTarget(e);
        if (target.nodeName == 'A') {
            target.blur();
            var tabToShow = target.hash.substr(1);
            for (var i = 0; i < PlaydarTracks.tabList.length; i++) {
                if (PlaydarTracks.tabList[i] == tabToShow) {
                    document.getElementById(PlaydarTracks.tabList[i]).style.display = "";
                    document.getElementById(PlaydarTracks.tabList[i] + 'Tab').className = "current";
                } else {
                    document.getElementById(PlaydarTracks.tabList[i]).style.display = "none";
                    document.getElementById(PlaydarTracks.tabList[i] + 'Tab').className = "";
                }
            }
            return false;
        }
    },
    
    setup_playdar: function () {
        Playdar.USE_STATUS_BAR = false;
        Playdar.setup({
            receiverurl: "http://www.playdar.org/demos/playdarauth.html",
            website: "http://www.playdar.org/demos/",
            name: "Playdar Demos"
        });
        Playdar.client.register_listeners({
            onStat: function (response) {
                var queriesStatus = document.getElementById('queriesStatus');
                if (response) {
                    if (!response.authenticated) {
                        queriesStatus.innerHTML = Playdar.client.get_auth_link_html();
                    }
                } else {
                    queriesStatus.innerHTML = "Playdar unavailable.";
                }
            },
            onAuth: function () {
                var queriesStatus = document.getElementById('queriesStatus');
                queriesStatus.innerHTML = "Loading queries…";
                PlaydarTracks.load_queries();
            },
            onAuthClear: function () {
                var queriesStatus = document.getElementById('queriesStatus');
                queriesStatus.innerHTML = Playdar.client.get_auth_link_html();
                queriesStatus.style.display = '';
            },
            onResults: function (response, final_answer) {
                if (final_answer) {
                    var sources = document.getElementById("sources" + response.qid);
                    if (response.results.length) {
                        // Found results
                        var results = PlaydarTracks.build_results_table(response);
                        sources.innerHTML = results;
                    } else {
                        // No results
                        sources.innerHTML = '<p class="sourcesEmpty">No results</p>';
                    }
                }
            }
        });
        soundManager.url = '/static/soundmanager2_flash9.swf';
        soundManager.flashVersion = 9;
        soundManager.onload = function () {
            Playdar.setup_player(soundManager);
            Playdar.client.init();
        };
    },
    
    load_queries: function () {
        Playdar.Util.loadjs(Playdar.client.get_url(
            "list_queries",
            ["PlaydarTracks", "handle_queries"]
        ));
    },
    handle_queries: function (response) {
        var queriesStatus = document.getElementById('queriesStatus');
        if (response.queries.length) {
            queriesStatus.style.display = 'none';
            var queryList = document.getElementById('queries');
            for (var i = 0; i < response.queries.length; i++) {
                // Build the query list
                var result = response.queries[i];
                if (result.query.boffin_tags) {
                    continue;
                }
                var list_item = document.createElement('li');
                list_item.id = "qid" + result.query.qid;
                list_item.innerHTML = 
                '<a href="#playlistTracks" class="playlist">'
                    + '<span class="add">+</span><span class="remove">-</span>'
                + '</a>'
                + '<a href="#" class="track">'
                    + result.query.artist + ' - ' + result.query.track
                + '</a>'
                + '<div class="sources" id="sources' + result.query.qid + '">'
                    + '<p class="sourcesEmpty">Loading results…</p>'
                + '</div>';
                queryList.appendChild(list_item);
                // Get results
                if (Playdar.status_bar) {
                    Playdar.status_bar.increment_requests();
                }
                Playdar.client.get_results(result.query.qid);
            }
        } else {
            queriesStatus.innerHTML = "You haven't queried any tracks yet.";
        }
    },
    
    setResultPlaying: function () {
        var result = document.getElementById('sid' + this.sID);
        result.className = 'result playing';
        
        var trackItem = result.parentNode.parentNode.parentNode;
        trackItem.className += ' playing';
    },
    setResultPaused: function () {
        var result = document.getElementById('sid' + this.sID);
        result.className = 'result paused';
        
        var trackItem = result.parentNode.parentNode.parentNode;
        trackItem.className = trackItem.className.replace(' playing', '').replace('playing', '');
    },
    setResultStopped: function () {
        Playdar.player.stop_all();
        var result = document.getElementById('sid' + this.sID);
        result.className = 'result';
        result.style.backgroundPosition = "0 0";
        
        var progress = document.getElementById('progress' + this.sID);
        progress.innerHTML = "";
        
        var trackItem = result.parentNode.parentNode.parentNode;
        trackItem.className = trackItem.className.replace(' playing', '').replace('playing', '');
    },
    updatePlaybackProgress: function () {
        var result = document.getElementById('sid' + this.sID);
        var progress = document.getElementById('progress' + this.sID);
        // Update the track progress
        progress.innerHTML = Playdar.Util.mmss(Math.round(this.position/1000));
        // Update the playback progress bar
        var duration;
        if (this.readyState == 3) { // loaded/success
            duration = this.duration;
        } else {
            duration = this.durationEstimate;
        }
        var portion_played = this.position / duration;
        result.style.backgroundPosition = Math.round(portion_played * 570) + "px 0";
    },
    
    build_results_table: function (response) {
        var score_cell, result;
        var results = '<table cellspacing="0">';
        for (var i = 0; i < response.results.length; i++) {
            result = response.results[i];
            var sound = Playdar.player.register_stream(result, {
                onplay: PlaydarTracks.setResultPlaying,
                onpause: PlaydarTracks.setResultPaused,
                onresume: PlaydarTracks.setResultPlaying,
                onstop: PlaydarTracks.setResultStopped,
                onfinish: PlaydarTracks.setResultStopped,
                whileplaying: PlaydarTracks.updatePlaybackProgress
            });
            
            if (result.score == 1) {
                score_cell = '<td class="score perfect">★</td>';
            } else {
                score_cell = '<td class="score">' + result.score.toFixed(3) + '</td>';
            }
            results += '<tbody class="result" id="sid' + result.sid + '">'
                + '<tr class="track">'
                    + '<td class="play"><span>▸</span></td>'
                    + '<td class="name">'
                        + result.artist + ' - ' + result.track
                    + '</td>'
                    + '<td class="progress" id="progress' + result.sid + '"></td>'
                    + '<td class="time">' + Playdar.Util.mmss(result.duration) + '</td>'
                + '</tr>'
                + '<tr class="info">'
                    + score_cell
                    + '<td class="source">' + result.source + '</td>'
                    + '<td class="bitrate">' + result.bitrate + ' kbps</td>'
                    + '<td class="size">' + (result.size/1000000).toFixed(1) + 'MB</td>'
                + '</tr>'
            + '</tbody>';
        }
        results += '</table>';
        return results;
    }
};

(function () {
    var queries = document.getElementById('queries');
    queries.onclick = PlaydarTracks.trackListClickHandler;
    
    var playlist = document.getElementById('playlist');
    playlist.onclick = PlaydarTracks.trackListClickHandler;
    
    var tabs = document.getElementById('tabs');
    tabs.onclick = PlaydarTracks.tabClickHandler;
    
    PlaydarTracks.setup_playdar();
})();
