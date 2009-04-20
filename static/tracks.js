PlaydarTracks = {
    playlist: {},
    playdarStatus: document.getElementById('playdarStatus'),
    queriesStatus: document.getElementById('queriesStatus'),
    tagCloudStatus: document.getElementById('tagCloudStatus'),
    tagResults: {},
    
    tagContainer: document.getElementById('tags'),
    tagListContainer: document.getElementById('tagList'),
    queriesContainer: document.getElementById('queries'),
    playlistContainer: document.getElementById('playlist'),
    
    playlistButtonHandler: function (parent) {
        // Get the qid from the parent list item
        var qid = parent.id.replace('qid', '').replace('pl', '');
        var queryItem = document.getElementById('qid' + qid);
        var playlistEmpty = document.getElementById('playlistEmpty');
        if (PlaydarTracks.playlist[qid]) {
            // Remove added class
            queryItem.className = queryItem.className.replace(' added', '').replace('added', '');
            // Remove the track item from the playlist
            var playlistItem = document.getElementById('pl' + qid);
            PlaydarTracks.playlistContainer.removeChild(playlistItem);
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
            PlaydarTracks.playlistContainer.appendChild(playlistItem);
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
                } else if (target.nodeName == 'A' && target.className == 'item') {
                    target.blur();
                    return PlaydarTracks.trackToggleHandler(parent);
                } else if (target.nodeName == 'TBODY' && target.className.match(/result/)) {
                    PlaydarTracks.resultPlayHandler(target);
                }
            }
            target = parent;
        }
    },
    
    tabList: ['allTracks', 'playlistTracks', 'tagCloud'],
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
    
    handle_tagcloud: function (response) {
        if (response.results.length) {
            var content = [];
            var minFontSize = 12;
            var maxFontSize = 60;
            var maxLog = Math.log(101)-Math.log(1);
            for (var i = 0; i < response.results.length; i++) {
                var result = response.results[i];
                var percent = Math.max(Math.round(result.score * 100), 1);
                if (percent == 1) {
                    break;
                }
                var weight = (Math.log(percent)-Math.log(1))/maxLog;
                var fontSize = minFontSize + Math.round((maxFontSize-minFontSize)*weight);
                var marginRight = Math.round(fontSize/2) + "px";
                var marginBottom = Math.round(fontSize/4) + "px";
                content.push("<a href='#' style='font-size: " + fontSize + "px; margin: 0 " + marginRight + " " + marginBottom + " 0;'>" + result.name + "</a>");
            }
            PlaydarTracks.tagContainer.innerHTML = content.join(' ');
            PlaydarTracks.tagCloudStatus.style.display = "none";
        } else {
            PlaydarTracks.tagCloudStatus.innerHTML = "No tags found.";
        }
    },
    tag_click_handler: function (tag) {
        if (PlaydarTracks.tagResults[tag]) {
            PlaydarTracks.show_tag_list();
            PlaydarTracks.tagResults[tag].className += " open";
        } else {
            PlaydarTracks.tagCloudStatus.innerHTML = "Loading tag results…";
            PlaydarTracks.tagCloudStatus.style.display = "";
            Playdar.boffin.get_tag_rql(tag);
        }
        return false;
    },
    container_click_handler: function (e) {
        var target = Playdar.Util.getTarget(e);
        while (target) {
            if (target && target.nodeName == 'A') {
                target.className = 'selected';
                return PlaydarTracks.tag_click_handler(target.innerHTML);
            }
            target = target.parentNode;
        }
    },
    handle_rql: function (response) {
        PlaydarTracks.build_tag_results_list(response);
    },
    
    load_queries: function () {
        Playdar.Util.loadjs(Playdar.client.get_url(
            "list_queries",
            ["PlaydarTracks", "handle_queries"]
        ));
    },
    show_tag_list: function () {
        PlaydarTracks.tagContainer.style.display = 'none';
        PlaydarTracks.tagCloudStatus.innerHTML = "<a href='#' onclick='return PlaydarTracks.show_tag_cloud();'>Show Tags</a>";
        PlaydarTracks.tagCloudStatus.style.display = '';
        PlaydarTracks.tagListContainer.style.display = '';
        return false;
    },
    show_tag_cloud: function () {
        PlaydarTracks.tagContainer.style.display = '';
        PlaydarTracks.tagCloudStatus.style.display = 'none';
        PlaydarTracks.tagListContainer.style.display = 'none';
        return false;
    },
    build_tag_results_list: function (response) {
        var title = response.query.boffin_rql.replace('tag:', '');
        var list_item = document.createElement('li');
        var results = '';
        if (response.results.length) {
            results = PlaydarTracks.build_results_table(response);
        }
        list_item.className = 'open tag';
        list_item.id = "qid" + response.query.qid;
        list_item.innerHTML = 
        '<a href="#" class="item">'
            + title
        + '</a>'
        + '<div class="sources" id="sources' + response.query.qid + '">'
            + results
        + '</div>';
        PlaydarTracks.tagListContainer.appendChild(list_item);
        PlaydarTracks.tagResults[title] = list_item;
        PlaydarTracks.show_tag_list();
    },
    build_results_list: function (results) {
        if (results.length) {
            var track_results = false;
            for (var i = 0; i < results.length; i++) {
                // Build the query list
                var result = results[i];
                // Duck type check for boffin queries
                if (result.query.boffin_tags || result.query.boffin_rql) {
                    continue;
                }
                track_results = true;
                var title = result.query.artist + ' - ' + result.query.track;
                var list_item = document.createElement('li');
                list_item.id = "qid" + result.query.qid;
                list_item.innerHTML = 
                '<a href="#playlistTracks" class="playlist">'
                    + '<span class="add">+</span><span class="remove">-</span>'
                + '</a>'
                + '<a href="#" class="item">'
                    + title
                + '</a>'
                + '<div class="sources" id="sources' + result.query.qid + '">'
                    + '<p class="sourcesEmpty">Loading results…</p>'
                + '</div>';
                PlaydarTracks.queriesContainer.appendChild(list_item);
                // Get results
                if (Playdar.status_bar) {
                    Playdar.status_bar.increment_requests();
                }
                Playdar.client.get_results(result.query.qid);
            }
            if (track_results) {
                PlaydarTracks.queriesStatus.style.display = 'none';
                return true;
            }
        }
        PlaydarTracks.queriesStatus.innerHTML = "You haven't queried any tracks yet.";
    },
    handle_queries: function (response) {
        PlaydarTracks.build_results_list(response.queries);
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
            
            if (result.score < 0) {
                score_cell = '<td class="score">&nbsp;</td>';
            } else if (result.score == 1) {
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
                if (response) {
                    if (!response.authenticated) {
                        PlaydarTracks.playdarStatus.innerHTML = Playdar.client.get_auth_link_html();
                    }
                } else {
                    PlaydarTracks.playdarStatus.innerHTML = "Playdar unavailable.";
                }
            },
            onAuth: function () {
                PlaydarTracks.playdarStatus.style.display = 'none';
                PlaydarTracks.queriesStatus.innerHTML = "Loading queries…";
                PlaydarTracks.load_queries();
                PlaydarTracks.tagCloudStatus.innerHTML = "Loading tag cloud…";
                Playdar.boffin.get_tagcloud();
            },
            onAuthClear: function () {
                PlaydarTracks.playdarStatus.innerHTML = Playdar.client.get_auth_link_html();
                PlaydarTracks.playdarStatus.style.display = '';
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
            },
            onRQL: function (response, final_answer) {
                if (final_answer) {
                    PlaydarTracks.handle_rql(response);
                }
            },
            onTagCloud: function (response, final_answer) {
                if (final_answer) {
                    PlaydarTracks.handle_tagcloud(response);
                }
            }
        });
        soundManager.url = '/static/soundmanager2_flash9.swf';
        soundManager.flashVersion = 9;
        soundManager.onload = function () {
            Playdar.setup_player(soundManager);
            Playdar.client.init();
        };
    }
};

(function () {
    PlaydarTracks.tagContainer.onclick = PlaydarTracks.container_click_handler;
    
    PlaydarTracks.tagListContainer.onclick = PlaydarTracks.trackListClickHandler;
    PlaydarTracks.queriesContainer.onclick = PlaydarTracks.trackListClickHandler;
    PlaydarTracks.playlistContainer.onclick = PlaydarTracks.trackListClickHandler;
    
    var tabs = document.getElementById('tabs');
    tabs.onclick = PlaydarTracks.tabClickHandler;
    
    PlaydarTracks.setup_playdar();
})();
