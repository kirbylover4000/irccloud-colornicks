// ==UserScript==
// @name            irccloud-colornicks
// @description     Colors nick names in IRCCloud
// @version         0.8.1
// @author          Alex Vidal, based on http://userscripts.org/scripts/show/88258, based on http://chatlogs.musicbrainz.org/mb_chatlogger.user.js
// @licence         BSD
// @include         https://*.irccloud.com/*
// ==/UserScript==

/*
 * Based on this userscript http://userscripts.org/scripts/show/88258
 * by Lukáš Lalinský
 */

// Hashing and color algorithms borrowed from the chromatabs Firefox extension.

function colornicks() {
    'use strict';

    var _cache = localStorage.colorNicks ? JSON.parse(localStorage.colorNicks) : {};
    var memberList = false;
    var S = 0.8;
    var L = 0.25;

    // create the stylesheet
    var style = document.createElement('style');

    for (var nick in _cache) {
        add_style(nick, _cache[nick]);
    }

    $('body').append(style);

    function clean_nick(nick) {
        // attempts to clean up a nickname
        // by removing alternate characters from the end
        // nc_ becomes nc, avidal` becomes avidal

        nick = nick.toLowerCase();

        // typically ` and _ are used on the end alone
        nick = nick.replace(/[`_]+$/, '');

        // remove |<anything> from the end
        nick = nick.replace(/\|.*$/, '');

        // remove [<anything>] or {<anything>} from the end
        nick = nick.replace(/^(!\[|!\{)(.*)(\[.*\]|\{.*\})$/, '$2');

        return nick;
    }

    function hash(nick) {
        var cleaned = clean_nick(nick);
        var h = 0;

        for(var i = 0; i < cleaned.length; i++) {
            h = cleaned.charCodeAt(i) + (h << 6) + (h << 16) - h;
        }

        return h;

    }

    function get_color(nick) {
        var nickhash = hash(nick);

        // get a positive value for the hue
        var deg = nickhash % 360;
        var h = deg < 0 ? 360 + deg : deg;

        // default L is 50
        var l = 50;

        // half of the hues are too light, for those we
        // decrease lightness
        if(h >= 30 && h <= 210) {
            l = 30;
        }

        // keep saturation above 20
        var s = 20 + Math.abs(nickhash) % 80;

        return "hsl(" + h + "," + s + "%," + l + "%)";

    }

    function add_style(author, color) {
        var cur = $(style).text();
        var attr = "", chat_rule = "", list_rule = "", rule = "", _style = "";

        attr = "[data-name='" + author + "']";
        list_rule = "ul.memberList li.user a.present" + attr;

        rule = "a.author" + attr + ", " + list_rule;
        _style = "color: " + color + " !important;";

        $(style).text(cur + rule + "{" + _style + "}\n");
    }


    function process_message(message) {
        if(message.type == "nickchange") {
            addNick(message["newnick"]); // I'm not sure why, but the dot syntax gives us undefined here.
        } else if(!!message.from) {
            addNick(message.from);
        } else if(!!message.nick) {
            addNick(message.nick);
        } else if(message.type == "channel_init") {
            memberList = true;
            message.members.forEach(function(i) {
                addNick(i.nick);
            });
            memberList = false;
            localStorage.colorNicks = JSON.stringify(_cache);
        } else {
            return;
        }
    }

    function addNick(author) {
        if(!author || _cache[author]) {
            return;
        }

        var color = get_color(author);

        _cache[author] = color;

        if(!memberList) {
            localStorage.colorNicks = JSON.stringify(_cache);
        }

        add_style(author, color);
    }

    window.SESSION.backend.bind('message', process_message);

}

function inject(fn) {
    'use strict';
    /*
     * This function injects a small piece of code into the page as soon
     * as jQuery is ready, and then waits until the backend is ready,
     * tested via the presence of window.SESSION.
     *
     * Once both are ready, we call the plugin function.
     *
     * The end result is your function looks like this on the page:
     * (function() {
     *     function colornicks() {
     *         ...
     *     }
     * })()
     */

    function waitloop(fn) {
        var has_session = typeof(window.SESSION) !== 'undefined';
        var has_jquery = typeof(window.jQuery) !== 'undefined';

        if(has_jquery === false || has_session === false) {
            window.setTimeout(function() { waitloop(fn); }, 100);
            return;
        }

        fn();
    }

    var wrap = "(" + fn.toString() + ")";

    console.log("[CN] Injecting wrapper script.");
    var script = document.createElement('script');
    script.textContent += "(" + waitloop.toString() + ')(' + wrap + ');';
    document.body.appendChild(script);
    console.log("[CN] Done injecting wrapper script.");

}

inject(colornicks);
