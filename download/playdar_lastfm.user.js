// ==UserScript==
// @name          Playdar_Last.fm
// @namespace     http://www.playdar.org/
// @description	  Add Playdar links to Last.fm sites
// @include       http://www.last.fm/*
// @include       http://www.lastfm.jp/*
// @include       http://www.lastfm.de/*
// @include       http://www.lastfm.pt/*
// @include       http://www.lastfm.pl/*
// @include       http://www.lastfm.co.kr/*
// @include       http://www.lastfm.es/*
// @include       http://www.lastfm.fr/*
// @include       http://www.lastfm.it/*
// @include       http://www.lastfm.ru/*
// @include       http://www.lastfm.no/*
// @include       http://www.lastfm.com.tr/*
// @include       http://www.lastfm.fi/*
// @include       http://www.lastfm.se/*
// @include       http://www.lastfm.nl/*
// @include       http://www.lastfm.dk/*
// @include       http://www.lastfm.at/*
// @include       http://www.lastfm.ch/*
// @include       http://www.lastfm.com.br/*
// ==/UserScript==

function load_script (url) {
    // Load the playdar.js
    var s = document.createElement('script');
    s.src = url;
    document.getElementsByTagName("head")[0].appendChild(s);
}
var playdar_web_host = "www.playdar.org";
// same js is served, this is jsut for log-grepping ease.
load_script('http://' + playdar_web_host + '/static/playdar.js?greasemonkey');
load_script('http://' + playdar_web_host + '/static/soundmanager2-nodebug-jsmin.js?greasemonkey');

function GM_wait() {
    Playdar = unsafeWindow.Playdar;
    soundManager = unsafeWindow.soundManager;
    if (typeof Playdar == 'undefined' || typeof soundManager == 'undefined') {
        window.setTimeout(GM_wait, 100); 
    } else { 
        setup_playdar();
    }
}
GM_wait(); // wait for playdar.js to load.

function setup_playdar () {
    Playdar.setup({
        name: "Last.fm Greasemonkey",
        website: "http://www.playdar.org/demos/"
    });
    Playdar.client.register_listener('onAuth', function () {
        insert_play_buttons();
    });
    soundManager.url = 'http://' + playdar_web_host + '/static/soundmanager2_flash9.swf';
    soundManager.flashVersion = 9;
    soundManager.onload = function () {
        Playdar.setup_player(soundManager);
        Playdar.client.init();
    };
};

function insert_play_buttons () {
    // set up a handler for resolved content
    function results_handler (response, finalanswer) {
        if (finalanswer) {
            var element = document.getElementById(response.qid);
            element.style.backgroundImage = 'none';
            if (response.results.length) {
                // generate tooltip with details:
                var tt = "Sources: ";
                for (var i = 0; i < response.results.length; i++) {
                    var result = response.results[i];
                    tt += result.source + "/" + result.bitrate + "kbps/" + Playdar.Util.mmss(result.duration) + " ";
                }
                // update status element:
                element.style.backgroundColor = "#0a0";
                // Just link to the source, too much flash spam:
                var sid = response.results[0].sid;
                element.innerHTML = "&nbsp;<a href=\"" + Playdar.client.get_stream_url(sid) + "\" title=\"" + tt + "\" style=\"color: #fff;\">" + response.results.length + "</a>&nbsp;";
                Playdar.player.register_stream(response.results[0]);
                unsafeWindow.Event.observe(element, 'click', function (e) {
                    e.stop();
                    Playdar.player.play_stream(sid);
                });
            } else {
                element.style.backgroundColor = "#c00";
                element.innerHTML = '&nbsp;X&nbsp;';
            }
        }
    }
    resolve_links(results_handler);
}

function resolve_links (results_handler) {
    var links = unsafeWindow.$$('a');
    var link_regex = new RegExp(/^\/music\/([^+][^\/]*)\/([^+][^\/]*)\/([^+][^\/]*)/);
    var tracks = {};
    for (var i = 0; i < links.length; i++) {
        // Only match links in the /music path
        var path = links[i].pathname;
        if (path.substr(0, 7) != "/music/") {
            continue;
        }
        // Only match track links
        var urlparts = link_regex.exec(path);
        if (!urlparts) {
            continue;
        }
        // Don't match image links
        var first_child = links[i].firstChild;
        if (first_child.nodeName == "IMG") {
            continue;
        }
        var next_sibling = first_child.nextSibling;
        if (first_child.nodeName == "#text" && next_sibling && next_sibling.nodeName == "IMG") {
            continue;
        }
        // Replace + with space
        var artist = decodeURIComponent(decodeURIComponent(urlparts[1]).replace(/\+/g, " "));
        var track  = decodeURIComponent(decodeURIComponent(urlparts[3]).replace(/\+/g, " "));
        
        // Only match tracks once
        if (tracks[artist] && tracks[artist][track]) {
            continue;
        }
        tracks[artist] = tracks[artist] || {};
        tracks[artist][track] = true;
        resolve(links[i], artist, track, results_handler);
    }
}

function start_status (qid, link) {
    var status = document.createElement('span');
    status.id = qid;
    status.style.cssFloat = "right";
    status.style.display = "block";
    status.style.border = 0;
    status.style.margin = "0 5px 0 0";
    status.style.backgroundRepeat = "no-repeat";
    status.style.backgroundImage = 'url("http://' + playdar_web_host + '/static/spinner_10px.gif")';
    status.style.color = "#fff";
    status.style.width = "13px";
    status.style.height = "13px";
    status.style.textAlign = "center";
    status.style.fontSize = "9px";
    status.innerHTML = "&nbsp; &nbsp;";
    
    var parent = link.parentNode;
    parent.insertBefore(status, parent.firstChild);
}

function resolve (link, artist, track, results_handler) {
    var qid = Playdar.Util.generate_uuid();
    // add a "searching..." status :
    start_status(qid, link);
    // register results handler and resolve for this qid
    Playdar.client.register_results_handler(results_handler, qid);
    Playdar.client.resolve(artist, "", track, qid);
}