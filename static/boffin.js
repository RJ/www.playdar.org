PlaydarBoffin = {
    container: document.getElementById('tagCloud'),
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
                content.push("<span style='font-size: " + fontSize + "px; margin: 0 " + marginRight + " " + marginBottom + " 0;'>" + result.name + "</span>");
            }
            PlaydarBoffin.container.innerHTML = content.join(' ');
        } else {
            PlaydarBoffin.container.innerHTML = "<p>No tags found</p>";
        }
    },
    setup_playdar: function () {
        Playdar.setup({
            receiverurl: "http://playdar/demos/playdarauth.html",
            website: "http://playdar/demos/",
            name: "Playdar Demos"
        });
        Playdar.client.register_listeners({
            onStat: function (response) {
                if (response) {
                    if (!response.authenticated) {
                        PlaydarBoffin.container.innerHTML = "<p>" + Playdar.client.get_auth_link_html() + "</p>";
                    }
                } else {
                    PlaydarBoffin.container.innerHTML = "<p>Playdar unavailable.</p>";
                }
            },
            onAuth: function () {
                PlaydarBoffin.container.innerHTML = "<p>Loading tag cloud…</p>";
                Playdar.boffin.get_tagcloud();
            },
            onAuthClear: function () {
                PlaydarBoffin.container.innerHTML = "<p>" + Playdar.client.get_auth_link_html() + "</p>";
            },
            onTagCloud: PlaydarBoffin.handle_tagcloud
        });
        new Playdar.Boffin();
        soundManager.url = '/static/soundmanager2_flash9.swf';
        soundManager.flashVersion = 9;
        soundManager.onload = function () {
            Playdar.setup_player(soundManager);
            Playdar.client.init();
        };
    }
};
(function () {
    PlaydarBoffin.setup_playdar();
})();