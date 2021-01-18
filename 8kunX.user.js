// ==UserScript==
// @name        8KunX
// @version     2021.01.18.01
// @description Small userscript to improve 8kun
// @icon        https://raw.githubusercontent.com/SlippingGitty/8KunX/2-0_pure/images/logo2.png
// @namespace   https://github.com/SlippingGitty/8KunX/tree/2-0
// @updateURL   https://github.com/SlippingGitty/8KunX/raw/2-0_pure/8kun-x.meta.js
// @downloadURL https://github.com/SlippingGitty/8KunX/blob/2-0_pure/8kun-x.user.js
// @grant       none

// @require     https://code.jquery.com/ui/1.11.2/jquery-ui.min.js
// @require     https://github.com/alexei/sprintf.js/raw/master/src/sprintf.js
// @require     https://raw.githubusercontent.com/rmm5t/jquery-timeago/master/jquery.timeago.js
// @require     https://raw.githubusercontent.com/samsonjs/strftime/master/strftime.js

// @match       *://8kun.top/*
// @match       *://sys.8kun.top/*
// @match       *://media.8kun.top/*
// @exclude     *.json
// @exclude     *.txt
// ==/UserScript==

/*Contributors
** tux3
** Zaphkiel
** varemenos
** 7185
** anonish
** Pashe
** SlippingGitty
*/

function chxErrorHandler(e, section) {
	console.error(e);
	console.trace();
	
	var rptObj = { //Chrome needs this
		name:          e?(e.name||"unknown"):"VERY unknown",
		msg:           e?(e.message||"unknown"):"VERY unknown",
		file:          e?((e.fileName||"unknown").split("/").slice(-1).join("")):"VERY unknown",
		line:          e?(e.lineNumber||"?"):"???",
		col:           e?(e.columnNumber||"?"):"???",
		section:       (section||"unknown"),
		scriptName:    (GM_info&&GM_info.script)?(GM_info.script.name||"unknown"):"VERY unknown",
		scriptVersion: (GM_info&&GM_info.script)?(GM_info.script.version||"unknown"):"VERY unknown",
		gmVersion:     (GM_info&&GM_info.version)?(GM_info.version||"unknown"):"VERY unknown",
		activePage:    window?(window.active_page||"unknown"):"VERY unknown",
		browser:       (window&&window.navigator)?((window.navigator.userAgent||"unknown").match(/(Chrom\S*|\S*fox\/\S*|Ice\S*)/gi)||["unknown"]).join(", "):"VERY unknown",
		userAgent:     (window&&window.navigator)?(window.navigator.userAgent||"unknown"):"VERY unknown",
		location:      (window&&window.location)?(window.location.href||"unknown"):"VERY unknown",
		stack:         e?((e.stack||"unknown").replace(/file:[^ \n]*\//g, "file:").replace(/^/gm, "  ")):"VERY unknown",
	};
	
	console.error(sprintf(
		"8kunX experienced an error. Please include the following information with your report:\n"+
		"[code]%s in %s/%s @ L%s C%s: %s\n\nVersion: %s (2-0_pure@%s)\nGreasemonkey: %s\nActive page: %s\nBrowser: %s\nUser agent: %s\nLocation: %s\nStack:\n%s[/code]",
		rptObj.name, rptObj.file, rptObj.section, rptObj.line, rptObj.col, rptObj.msg,
		rptObj.scriptName, rptObj.scriptVersion,
		rptObj.gmVersion,
		rptObj.activePage,
		rptObj.browser,
		rptObj.userAgent,
		rptObj.location,
		rptObj.stack
	));
	
	alert("8kunX experienced an error. Check the console for details (typically F12).");
}

try {
////////////////
//GLOBAL VARIABLES
////////////////
//Constants
var bumpLimit = 300;

//Initializations
var thisThread;
var cachedPages = null;
var galleryImages;
var galleryImageIndex;

//Dynamic
var isMod = (window.location.pathname.split("/")[1]=="mod.php");
var thisBoard = isMod?window.location.href.split("/")[4]:window.location.pathname.split("/")[1];
try {thisThread = parseInt(window.location.href.match(/([0-9]+)\.html/)[1]);} catch (e) {thisThread = -1;}
var thisBoardAnonName;
var thisBoardSettings;

////////////////
//SETTINGS
////////////////
var settingsMenu = window.document.createElement('div');

if (window.Options) {
	var tab = window.Options.add_tab('8kunX', 'times', '8kunX');
	$(settingsMenu).appendTo(tab.content);
}

settingsMenu.innerHTML = sprintf('<span style="font-size:8pt;">8kunX %s pure</span>', GM_info.script.version)
+ '<div style="overflow:auto;height:100%;">' //General
+ '<label><input type="checkbox" name="catalogLinks">' + 'Force catalog links' + '</label><br>'
+ '<label><input type="checkbox" name="revealImageSpoilers">' + 'Reveal image spoilers' + '</label><br>'
+ '<label><input type="checkbox" name="hideNoFilePosts">' + 'Hide posts without files' + '</label><br>'
+ '<label><input type="checkbox" name="keyboardShortcutsEnabled">' + 'Enable keyboard shortcuts' + '</label><br>'
+ '<hr>' //How information is displayed
+ '<label><input type="checkbox" name="reverseImageSearch">' + 'Add reverse image search links' + '</label><br>'
+ '<label><input type="checkbox" name="parseTimestampImage">' + 'Guess original download date of imageboard-style filenames' + '</label><br>'
+ '<label><input type="checkbox" name="precisePages">' + 'Increase page indicator precision' + '</label><br>'
+ '<label><input type="checkbox" name="failToCatalogPages">' + 'Get thread page from catalog.html if thread is not in threads.json' + '</label><br>'
+ '<label>' + 'Mascot URL(s) (pipe separated):<br />' + '<input type="text" name="mascotUrl" style="width: 30em"></label><br>'
+ '<label>' + '<a href="http://strftime.net/">Date format</a>:<br />' + '<input type="text" name="dateFormat" style="width:30em"></label><br>'
+ '<label><input type="checkbox" name="localTime">' + 'Use local time' + '</label><br>'
+ '<hr>' //Filters
+ '<h3>Filters</h3>'
+ '<table style="text-align:center;">'
+ '<tr><th>Field</th><th title="Regular expressions seperated with &quot;````&quot;. Boards may be specified like this: &quot;fag```a,b,c&quot;, which will filter &quot;fag&quot; on /a/, /b/, and /c/">Regex</th><th title="Recursive: If this is checked, replies to filtered posts will also be removed">R</th><th title="Stubs: If this is not checked, filtered posts will be removed completely">S</th><th title="All: If this is checked, all posts of this type will be removed, ignoring regex">A</th></tr>'

+ '<tr><td class="chx_FilterField">Tripcode</td><td><input type="text" name="filterTripsRegex" style="width:25em"></td><td><input type="checkbox" name="filterTripsRecursive"></td><td><input type="checkbox" name="filterTripsStubs"></td><td><input type="checkbox" name="filterTrips"></td></tr>'

+ '<tr><td class="chx_FilterField">Name</td><td><input type="text" name="filterNamesRegex" style="width:25em"></td><td><input type="checkbox" name="filterNamesRecursive"></td><td><input type="checkbox" name="filterNamesStubs"></td><td><input type="checkbox" name="filterNames"></td></tr>'

+ '<tr><td class="chx_FilterField">Body</td><td><input type="text" name="filterBodyRegex" style="width:25em"></td><td><input type="checkbox" name="filterBodyRecursive"></td><td><input type="checkbox" name="filterBodyStubs"></td><td><input type="checkbox" name="filterBody"></td></tr>'

+ '<tr><td class="chx_FilterField">Email</td><td><input type="text" name="filterEmailRegex" style="width:25em"></td><td><input type="checkbox" name="filterEmailRecursive"></td><td><input type="checkbox" name="filterEmailStubs"></td><td><input type="checkbox" name="filterEmail"></td></tr>'

+ '<tr><td class="chx_FilterField">Subject</td><td><input type="text" name="filterSubjectRegex" style="width:25em"></td><td><input type="checkbox" name="filterSubjectRecursive"></td><td><input type="checkbox" name="filterSubjectStubs"></td><td><input type="checkbox" name="filterSubject"></td></tr>'

+ '<tr><td class="chx_FilterField">Flag</td><td><input type="text" name="filterFlagRegex" style="width:25em"></td><td><input type="checkbox" name="filterFlagRecursive"></td><td><input type="checkbox" name="filterFlagStubs"></td><td><input type="checkbox" name="filterFlag"></td></tr>'

+ '</table>'
+ '<hr>' //Other shit
+ '<button id="chx_purgeDeadFavorites">' + 'Clean favorites' + '</button>'
+ '</div>';

$(settingsMenu).find(".chx_FilterField").css("text-align", "right");
$(settingsMenu).find('input').css("max-width", "100%");


var defaultSettings = {
	'precisePages': true,
	'failToCatalogPages': false,
	'catalogLinks': true,
	'revealImageSpoilers': false,
	'reverseImageSearch': true,
	'parseTimestampImage': true,
	'localTime': true,
	'dateFormat':"",
	'mascotUrl':"",
	'keyboardShortcutsEnabled': true,
	'filterDefaultRegex': '',
	'filterDefaultRecursive': true,
	'filterDefaultStubs': false,
	'filterDefault': false,
	'hideNoFilePosts': false,
};

function getSetting(key) {
	if (localStorage.getItem("chx_"+key)) {
		return JSON.parse(localStorage.getItem("chx_"+key));
	} else {
		try {
			var keyMatch = key.match(/filter([A-Z][a-z]*)([A-Z][a-z]*)?/);
			if (!keyMatch) {
				return defaultSettings[key];
			} else {
				return defaultSettings["filterDefault"+(keyMatch.hasOwnProperty(2)?keyMatch[2]:"")];
			}
		} catch(e) {console.error(e);}
	}
}

function setSetting(key, value) {
	localStorage.setItem("chx_"+key, JSON.stringify(value));
}

function refreshSettings() {
	var settingsItems = settingsMenu.getElementsByTagName("input");
	for (var i in settingsItems) {
		if (!settingsItems.hasOwnProperty(i)) {continue;}
		var control = settingsItems[i];
		if (!control.name) {continue;}
		
		switch (control.type) {
			case "checkbox":
				control.checked = getSetting(control.name);
				break;
			default:
				control.value = getSetting(control.name);
				break;
		}
	}
}

function setupControl(control) {
	switch (control.type) {
		case "checkbox":
			$(control).on("change", function () {
				setSetting(this.name, this.checked);
			});
			break;
		default:
			$(control).on("input", function () {
				setSetting(this.name, this.value);
			});
			break;
	}
}

////////////////
//GENERAL FUNCTIONS
////////////////
function isOnCatalog() {
	return window.active_page === "catalog";
}

function isOnThread() {
	return window.active_page === "thread";
}

function printf() { //alexei et al, 3BSD
	var key = arguments[0], cache = sprintf.cache;
	if (!(cache[key] && cache.hasOwnProperty(key))) {
		cache[key] = sprintf.parse(key);
	}
	console.log(sprintf.format.call(null, cache[key], arguments));
}

function getThreadPage(threadId, boardId, cached) { //Pashe, WTFPL
	if ((!cached) || (cachedPages === null)) {
		$.ajax({
			url: "/" + boardId + "/threads.json",
			async: false,
			dataType: "json",
			success: function (response) {cachedPages = response;}
		});
	}
	
	return calcThreadPage(cachedPages, threadId);
}

function calcThreadPage(pages, threadId) { //Pashe, WTFPL
	var threadPage = -1;
	var precisePages = getSetting("precisePages");
	
	for (var pageIdx in pages) {
		if (!pages.hasOwnProperty(pageIdx)) {continue;}
		if (threadPage != -1) {break;}
		var threads = pages[pageIdx].threads;
		
		for (var threadIdx in threads) {
			if (!threads.hasOwnProperty(threadIdx)) {continue;}
			if (threadPage != -1) {break;}
			
			if (threads[threadIdx].no == threadId) {
				if (!precisePages) {
					threadPage = pages[pageIdx].page+1;
				} else {
					threadPage = ((pages[pageIdx].page+1)+(threadIdx/threads.length)).toFixed(2);
				}
				break;
			}
		}
	}
	return threadPage;
}

function getThreadLastModified(threadId, boardId, cached) { //Pashe, WTFPL
	if ((!cached) || (cachedPages === null)) {
		$.ajax({
			url: "/" + boardId + "/threads.json",
			async: false,
			dataType: "json",
			success: function (response) {cachedPages = response;}
		});
	}
	
	return calcThreadLastModified(cachedPages, threadId);
}

function calcThreadLastModified(pages, threadId) { //Pashe, WTFPL
	var threadLastModified = -1;
	
	for (var pageIdx in pages) {
		if (!pages.hasOwnProperty(pageIdx)) {continue;}
		if (threadLastModified != -1) {break;}
		var threads = pages[pageIdx].threads;
		
		for (var threadIdx in threads) {
			if (!threads.hasOwnProperty(threadIdx)) {continue;}
			if (threadLastModified != -1) {break;}
			
			if (threads[threadIdx].no == threadId) {
				threadLastModified = pages[pageIdx]["threads"][threadIdx]["last_modified"];
				break;
			}
		}
	}
	return threadLastModified;
}

function getThreadPosts() { //Pashe, WTFPL
	return $(".post").length;
}

function getThreadImages() { //Pashe, WTFPL
	return $(".post-image").length;
}

function getFileExtension(filename) { //Pashe, WTFPL
	if (filename.match(/\.([a-z0-9]+)(&loop.*)?$/i) !== null) {
		return filename.match(/\.([a-z0-9]+)(&loop.*)?$/i)[1];
	} else if (filename.match(/https?:\/\/(www\.)?youtube.com/)) {
		return 'Youtube';
	} else {
		return sprintf("unknown: %s", filename);
	}
}

function isImage(fileExtension) { //Pashe, WTFPL
	return ($.inArray(fileExtension, ["jpg", "jpeg", "gif", "png"]) !== -1);
}

function isVideo(fileExtension) { //Pashe, WTFPL
	return ($.inArray(fileExtension, ["webm", "mp4"]) !== -1);
}

function updateBoardSettings(response) { //Pashe, WTFPL
	thisBoardSettings = response;
	
	thisBoardAnonName = thisBoardSettings.anonymous;
	bumpLimit = thisBoardSettings.reply_limit;
}

////////////////
//MENU BAR
////////////////
function updateMenuStats() { //Pashe, WTFPL
	var nPosts = getThreadPosts(thisThread, thisBoard, false);
	
	$.ajax({
		url: "/settings.php?board="+thisBoard,
		async: true,
		cache: true,
		dataType: "json",
		success: function (response) {
			updateBoardSettings(response);
		}
	});
	
	if (nPosts >= bumpLimit) {nPosts = sprintf('<span style="color:#f00;font-weight:bold;">%d</span>', nPosts);}
	
	$("#chx_menuPosts").html(nPosts);
	$("#chx_menuImages").html(getThreadImages(thisThread, thisBoard, false));
	
	$.ajax({
		url: "/" + thisBoard + "/threads.json",
		async: true,
		dataType: "json",
		success: function (response) {
			cachedPages = response;
			
			var nPage = calcThreadPage(response, thisThread);
			if (nPage < 1) {
				nPage = "<span style='opacity:0.5'>3+</span>";
				
				if (getSetting("failToCatalogPages")) {
					$.ajax({
						url: "/" + thisBoard + "/catalog.html",
						async: false,
						dataType: "html",
						success: function (response) {
							var pageArray = [];
							
							$(response).find("div.thread").each(function() {
								$this = $(this);
								
								var threadId = parseInt($this.children("a").attr("href").match(/([0-9]+).html$/)[1]);
								var page = parseInt($this.find("strong").text().match(/P: ([0-9]+)/)[1]);
								
								pageArray[threadId] = page;
							});
							
							if (pageArray.hasOwnProperty(thisThread)) {nPage = pageArray[thisThread];}
						}
					});
				}
			}
			
			$("#chx_menuPage").html(nPage);
		}
	});
	
}

////////////////
//KEYBOARD SHORTCUTS
////////////////
function reloadPage() { //Pashe, WTFPL
	if (isOnThread()) {
		window.$('#update_thread').click();
		updateMenuStats();
	} else {
		document.location.reload();
	}
}

function showQR() { //Pashe, WTFPL
	window.$(window).trigger('cite');
	$("#quick-reply textarea").focus();
}

function toggleExpandAll() { //Tux et al, MIT
	var shrink = window.$('#shrink-all-images a');
	if (shrink.length) {
		shrink.click();
	} else {
		window.$('#expand-all-images a').click();
	}
}

function goToCatalog() { //Pashe, WTFPL
	if (isOnCatalog()) {return;}
	window.location = sprintf("/%s/catalog.html", thisBoard);
}

////////////////
//REVERSE IMAGE SEARCH
////////////////
var RISProviders = {
	"google": {
		"urlFormat" : "https://www.google.com/searchbyimage?image_url=%s",
		"name"      : "Google"
	},
	"iqdb": {
		"urlFormat" : "http://iqdb.org/?url=%s",
		"name"      : "iqdb"
	},
	"saucenao": {
		"urlFormat" : "https://saucenao.com/search.php?db=999&url=%s",
		"name"      : "SauceNAO"
	},
	"tineye": {
		"urlFormat" : "https://www.tineye.com/search/?url=%s",
		"name"      : "TinEye"
	},
	"harrylu": {
		"urlFormat" : "https://iqdb.harry.lu/?url=%s",
		"name"      : "Harry.lu (e621)",
		"shortName" : "E"
	},
	"karmadecay": {
		"urlFormat" : "http://karmadecay.com/%s",
		"name"      : "Karma Decay"
	},
};

var RISProvidersBoards = {
	"##ALL": ["google", "iqdb", "saucenao", "tineye", "karmadecay"],
	"furry": ["harrylu"],
};

function addRISLinks(image) { //Pashe, 7185, WTFPL
	var thisBoardRISProviders = (RISProvidersBoards["##ALL"].concat(RISProvidersBoards[thisBoard]||[]));
	for (var providerIdx in thisBoardRISProviders) {
		providerIdx = thisBoardRISProviders[providerIdx];
		if (!RISProviders.hasOwnProperty(providerIdx)) {continue;}
		var provider = RISProviders[providerIdx];
		
		try {
			var RISUrl;
			if (!image.src.match(/\/spoiler.png$/)) {
				RISUrl = sprintf(provider.urlFormat, image.src);
			} else {
				RISUrl = sprintf(provider.urlFormat, image.parentNode.href);
			}
			
			var RISLink = $('<a class="chx_RISLink"></a>');
			RISLink.attr("href", RISUrl);
			RISLink.attr("title", provider.name);
			RISLink.attr("target", "_blank");
			RISLink.css("font-size", "8pt");
			RISLink.css("margin-left", "2pt");
			RISLink.text(sprintf("[%s]", provider.shortName||provider.name[0].toUpperCase()));
			
			RISLink.appendTo(image.parentNode.parentNode.getElementsByClassName("fileinfo")[0]);
		} catch (e) {}
	}
}

////////////////
//NOTIFICATIONS
////////////////
function notifyReplies() {
	/*
	* taken from https://github.com/ctrlcctrlv/8chan/blob/master/js/show-own-posts.js
	*
	* Released under the MIT license
	* Copyright (c) 2014 Marcin Labanowski <marcin@6irc.net>
	*/
	
	var thread = $(this).parents('[id^="thread_"]').first();
	if (!thread.length) {thread = $(this);}
	
	var ownPosts = JSON.parse(window.localStorage.own_posts || '{}');
	
	$(this).find('div.body:first a:not([rel="nofollow"])').each(function() {
		var postID = $(this).text().match(/^>>(\d+)$/);
		
		if (postID !== null && postID.hasOwnProperty(1)) {
			postID = postID[1];
		} else {
			return;
		}
		
		if (ownPosts[thisBoard] && ownPosts[thisBoard].indexOf(postID) !== -1) {
			var replyPost = $(this).closest("div.post");
			var replyUser = (replyPost.find(".name").text()+replyPost.find(".trip").text());
			var replyBody = replyPost.find(".body").text();
			var replyImage = replyPost.find(".post-image").first().attr('src');
			
			new Notification(replyUser+" replied to your post", {body:replyBody,icon:replyImage});
		}
	});
}

////////////////
//GALLERY
////////////////
var fileExtensionStyles = {
	"jpg":  {"background-color": "#0f0", "color": "#000"}, "jpeg": {"background-color": "#0f0", "color": "#000"},
	"png":  {"background-color": "#00f", "color": "#fff"},
	"webm": {"background-color": "#f00", "color": "#000"}, "mp4": {"background-color": "#a00", "color": "#000"},
	"gif": {"background-color": "#ff0", "color": "#000"},
};

function refreshGalleryImages() { //Pashe, 7185, WTFPL
	galleryImages = [];
	
	$("img.post-image").each(function() {
		var metadata = $(this).parent("a").siblings(".fileinfo").children(".unimportant").text().replace(/[()]/g, '').split(", ");
		if (!this.src.match(/\/deleted.png$/)) {
			galleryImages.push({
				"thumbnail":  this.src,
				"full":       this.parentNode.href,
				"fileSize":   metadata[0],
				"resolution": metadata[1],
				"aspect":     metadata[2],
				"origName":   metadata[3],
			});
		}
	});
}

function openGallery() { //Pashe, WTFPL
	refreshGalleryImages();
	
	var galleryHolder = $("<div id='chx_gallery'></div>");
	galleryHolder.appendTo($("body"));
	
	galleryHolder.css({
		"background-color": "rgba(0,0,0,0.8)",
		"overflow":         "auto",
		"z-index":          "101",
		"position":         "fixed",
		"left":             "0",
		"top":              "0",
		"width":            "100%",
		"height":           "100%"
	});
	
	galleryHolder.click(function(e) {
		if(e.target == this) $(this).remove();
	});
	
	for (var i in galleryImages) {
		if (!galleryImages.hasOwnProperty(i)) {continue;}
		var image = galleryImages[i];
		var fileExtension = getFileExtension(image.full);
		
		var thumbHolder = $('<div class="chx_galleryThumbHolder"></div>');
		var thumbLink = $(sprintf('<a class="chx_galleryThumbLink" href="%s"></a>', image.full));
		var thumbImage = $(sprintf('<img class="chx_galleryThumbImage" src="%s" />', image.thumbnail));
		var metadataSpan = $(sprintf('<span class="chx_galleryThumbMetadata">%s</span>', fileExtension));
		
		thumbImage.css({
			"max-height": "128px",
			"max-width":  "128px",
			"margin":     "auto auto auto auto",
			"display":    "block"
		});
		
		thumbHolder.css({
			"padding":    "0pt 0pt 0pt 0pt",
			"height":     "155px",
			"width":      "128px",
			"overflow":   "hidden",
			"float":      "left",
			"text-align": "center",
			"color":      "#fff"
		});
		
		if (fileExtensionStyles.hasOwnProperty(fileExtension)) {
			metadataSpan.css(fileExtensionStyles[fileExtension]).css({"padding": "0pt 5pt 2pt 5pt", "border-radius": "2pt", "font-weight": "bolder"});
		}
		
		thumbImage.appendTo(thumbLink);
		thumbLink.appendTo(thumbHolder);
		metadataSpan.appendTo(thumbHolder);
		thumbHolder.appendTo(galleryHolder);
		
		thumbLink.click(i, function(e) {
			e.preventDefault();
			expandGalleryImage(parseInt(e.data));
		});
	}
}

function closeGallery() { //Pashe, WTFPL
	if ($("#chx_galleryExpandedImageHolder").length) {
		$("#chx_galleryExpandedImageHolder").remove();
	} else {
		$("#chx_gallery").remove();
	}
}

function toggleGallery() { //Pashe, WTFPL
	if ($("#chx_gallery").length) {
		closeGallery();
	} else {
		openGallery();
	}
}

function expandGalleryImage(index) { //Pashe, WTFPL
	galleryImageIndex = index;
	var expandedImage;
	var image = galleryImages[index].full;
	var imageHolder = $('<div id="chx_galleryExpandedImageHolder"></div>');
	var fileExtension = getFileExtension(image);
	
	if (isImage(fileExtension)) {
		expandedImage = $(sprintf('<img class="chx_galleryExpandedImage" src="%s" />', image));
		expandedImage.css({
			"max-height": "98%",
			"max-width":  "100%",
			"margin":     "auto auto auto auto",
			"display":    "block"
		});
	} else if (isVideo(fileExtension)) {
		image = image.match(/player\.php\?v=([^&]*[a-f0-9]+\.[a-z0-9]+).*/i)[1];
		expandedImage = $(sprintf('<video class="chx_galleryExpandedImage" src="%s" autoplay controls></video>', image));
		expandedImage.css({
			"max-height": "98%",
			"max-width":  "100%",
			"margin":     "auto auto auto auto",
			"display":    "block"
		});
	} else {
		expandedImage = $(sprintf('<iframe class="chx_galleryExpandedImage" src="%s"></iframe>', image));
		expandedImage.css({
			"max-height": "98%",
			"max-width":  "100%",
			"height":     "98%",
			"width":      "100%",
			"margin":     "auto auto auto auto",
			"display":    "block"
		});
	}
	
	imageHolder.css({
		"background-color": "rgba(0,0,0,0.8)",
		"overflow":         "auto",
		"z-index":          "102",
		"position":         "fixed",
		"left":             "0",
		"top":              "0",
		"width":            "100%",
		"height":           "100%"
	});
	
	imageHolder.appendTo($("body"));
	expandedImage.appendTo(imageHolder);
	imageHolder.click(function(e) {
		if(e.target == this) $(this).remove();
	});
}

function jogExpandedGalleryImage(steps) {
	if ($("#chx_galleryExpandedImageHolder").length && galleryImages.hasOwnProperty(galleryImageIndex+steps)) {
		$("#chx_galleryExpandedImageHolder").remove();
		expandGalleryImage(galleryImageIndex+steps);
	}
}

////////////////
//FILTERS
////////////////
function hidePost(post, recursive, stubs) { //Pashe, WTFPL
	if (!stubs) {
		post.jqObj.hide();
		post.jqObj.next("br").remove();
	} else {
		window.$("#reply_"+post.no).find(".post-hide-link").trigger("click");
	}
	
	if (recursive && post.ment.length) {
		for (var i in post.ment) {
			if (!post.ment.hasOwnProperty(i)) {continue;}
			
			if (!stubs) {
				$("#reply_"+post.ment[i]).hide();
				$("#reply_"+post.ment[i]).next("br").remove();
			} else {
				window.$("#reply_"+post.ment[i]).find(".post-hide-link").trigger("click");
			}
		}
	}
}

function runFilter() { //Pashe, WTFPL
	var $this = $(this);
	
	var thisPost = {
		trip:  $this.find("span.trip").text(),
		name:  $this.find("span.name").text(),
		body:  $this.find("div.body").text(),
		email: $this.find("a.email").attr("href"),
		sub:   $this.find("span.subject").text(),
		flag:  $this.find("img.flag").attr("title"),

		cap:   $this.find("span.capcode").text(),
		ment:  $this.find(".mentioned").text().length?$this.find(".mentioned").text().replace(/>>/g, "").replace(/ $/, "").split(" "):[],
		
		// date:  $this.find("time").attr("datetime"),
		no:    $this.find("a.post_no").first().next().text(),
		
		jqObj: $this,
		// stdObj: this,
	};
	
	if (thisPost.trip == "!!tKlE5XtNKE") {
		$this.find("span.trip").after($(' <span class="capcode" title="Green is my pepper; I shall not want."><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAFo9M/3AAADgUlEQVQ4y2VTbUyTVxS+VZaYqMtcHFHjZCEbsgwR2jS0EKCLSJnMSoGy0toKFUvpB/TjpX37SfuuDChSJlTHqiIBqTJF14JMous0hERj5uIPib+XLCbLsvhj/tig58y+Vea28+e55z7POffce88hhnYBWTf9aTGyi/H5oxxidYqhN65AgohkONmJsR/7UqFkK5KW3Pc2uFtK0KYqxsC1I5mY3mjbdBpP3dUQYjhfe6adKk11aAtWgzfV24lJJ3xumZCCbkwEgcQxHpFtyv6IYg6AdVAE5HUzqHkl3pnmv05FtD+Pzh79I733xW1JhjSPHP6zc1wF1C0tMBc9EFp2QexhFMOLlsPEINmfpSvNp3y28rVuXyXQ9jIwh8uh53oT9sw07yU7Xh5hE7wPDlkxnsjd8VjJ24WOuEr8EAczpKm3hvMCOFNL4UnyX6Of2Uh9ffHbodGGkZNJGp2t+c+iTxh/mpt9/Cgj8sw1o93fAENJLQwndCmbpwC/XLYlWPKEQyjqnlJj17VWmHg0A4pRIXy78h2MLbkz76iXFJY7nFXY0V8NrqsKVIcE4LksTTEJxdP1OixqPrroCvCOfAomqgjs56tTzJx6ZV1gqih4QnWVgd1XgZ3qfeiI1a72XpGOZcj8PNKwdYvWJd6HXjn3qSp7G2q6uL//77rGOdW/fN+5puGRW67fZqeCtQOSd7iJCzL+Ky50r4NFZkFKiC5yaGPaUQTLiuwx+dLns/pfKXc9aiyl2H/HjOM/MOgIiZEO1+BQRIIDicZz3tvynWwj3VRuYDMdc1bm0DH5T3RcifbpxjXn9Gfgnm8B5no70KMycE3UgW9CBgM3jqeiD4IYvR/C/sX2g+vltqkLj3R6qpA+24q2sxowTirAGtfAV/fPoOeSBRv7+GD6RgbhpBci35vx5KIG+260/ZPARHZuNTZz5x1GITr1glWbpwKsQ2LwTcrByohAz/DBEhGB40JNynu1HgNx5YrvinovG9xRnJeVxuN7cg6Z67jPe4xlSOsESL1oSzoggm6LEIw0H6ivP0HntGTNn2jC4IJy2X+pbhebQLrlLc7LQt7Q5O2565QWodMgBLr/ILjdlUh9/CF28XKQsvKw+3I1Oi7W/BIYrCpMB/gna9kPIK+NN5G+udkr274NdB+8i/b9uRYeIbtFWVmnSzkbF0o2bT7wSsfNzmPxb3jllxw700zlAAAAAElFTkSuQmCC" style="width:16px;height:16px;" /> 8kunX</span>'));
		return;
	}
	
	if (isMod) {return;}
	
	if (getSetting("hideNoFilePosts") && (!$this.find("div.file").length)) {
		hidePost(thisPost, false, false);
		return;
	}
	
	var filterTypes = {
		trip: "Trips",
		name: "Names",
		body: "Body",
		email: "Email",
		sub: "Subject",
		flag: "Flag",
	};
	
	for (var i in filterTypes) {
		if (!filterTypes.hasOwnProperty(i) || !thisPost[i]) {continue;}
		
		var filterType = filterTypes[i];
		var filterField = thisPost[i];
		
		var filterHideAll = getSetting(sprintf("filter%s", filterType));
		var filterRecursive = getSetting(sprintf("filter%sRecursive", filterType));
		var filterStubs = getSetting(sprintf("filter%sStubs", filterType));
		var filterRegex = getSetting(sprintf("filter%sRegex", filterType));
		
		if ((filterHideAll && filterType !== "Names") && filterField.length) {
			hidePost(thisPost, filterRecursive, filterStubs);
		} else if ((thisBoardAnonName !== undefined) && (filterHideAll && filterType === "Names") && (filterField !== thisBoardAnonName)) {
			hidePost(thisPost, filterRecursive, filterStubs);
		} else if (filterRegex) {
			filterRegex = filterRegex.split('````');
			for (var i in filterRegex) {
				var thisRegex;
				var thisRegexStr = filterRegex[i].split("```")[0];
				
				if (filterRegex[i].split("```").length > 1) {
					var thisRegexBoards = filterRegex[i].split("```")[1].split(",");
					for (var i in thisRegexBoards) {
						if (thisBoard.match(RegExp(thisRegexBoards[i])) !== null) {
							thisRegex = new RegExp(thisRegexStr);
							if (filterField.match(thisRegex)) {hidePost(thisPost, filterRecursive, filterStubs);}
						}
					}
				} else {
					thisRegex = new RegExp(thisRegexStr);
					if (filterField.match(thisRegex)) {hidePost(thisPost, filterRecursive, filterStubs);}
				}
			}
		}
	}
}

////////////////
//INIT FUNCTIONS
////////////////
function initSettings() {
	refreshSettings();
	var settingsItems = settingsMenu.getElementsByTagName("input");
	for (var i in settingsItems) {
		if (!settingsItems.hasOwnProperty(i)) {continue;}
		setupControl(settingsItems[i]);
	}
}

function initMenu() { //Pashe, WTFPL
	var menu = window.document.getElementsByClassName("boardlist")[0];
	var $menu = $(menu);
	
	// [data-description="0"] - home, boards
	// [data-description="1"] - pinned boards (/b/, /meta/, /int/)
	// [data-description="2"] - twitter
	// [data-description="3"] - top boards
	
	$('[data-description="1"], [data-description="2"]').hide();
	$(".boardlist.bottom").find('[data-description="0"], [data-description="2"], .favorite-boards').hide(); //Hide stuff that's at the top already
	$(".boardlist.bottom").find('[data-description="1"]').show(); //Show pinned boards at the bottom
	$(".boardlist.bottom").find('.favorite-boards').next().hide(); //Hide the watchlist link at the bottom
	
	if ((!$(".boardlist.bottom").find('[data-description="3"]').length) && ($(".boardlist.bottom").find('[data-description="1"]').length)) {
		var topBoardsLinks = [];

		$.ajax("/boards-top20.json", {
			async: true,
			cache: true,
			success: function(response) {
				for (var x in response) {
					topBoardsLinks.push(sprintf(
						'<a href="/%s/" title="%s &bull; %s &bull; %s">%s</a>',
						response[x].uri,
						response[x].title,
						response[x].subtitle,
						response[x].tags.join("/"),
						response[x].uri
					));
				}
				$(".boardlist.bottom").find('[data-description="1"]').after(sprintf(' <span class="chx_topBoards">[ %s ]</span>', topBoardsLinks.slice(0,15).join(" / ")));
			}
		});
	}
	
	if (getSetting('catalogLinks') && !isOnCatalog()) {
		$('.favorite-boards a').each(function () {
			$(this).attr("href", $(this).attr("href")+"/catalog.html");
		});
	}
	
	if (isOnThread()) {
		$('#update_secs').remove();
		
		var updateNode = $("<span></span>");
		updateNode.attr("id", "update_secs");
		updateNode.css("font-family", "'Source Code Pro', monospace");
		updateNode.css("padding-left", "3pt");
		updateNode.attr("title","Update thread");
		updateNode.click(function() {$('#update_thread').click();});
		updateNode.appendTo($menu);
		
		var statsNode = $("<span></span>");
		statsNode.html(
			 '<span title="Posts" id="chx_menuPosts">---</span> / '
			+'<span title="Images" id="chx_menuImages">---</span> / '
			+'<span title="Page" id="chx_menuPage">---</span>'
		);
		statsNode.attr("id", "menuStats");
		statsNode.css("padding-left", "3pt");
		statsNode.appendTo($menu);
		
		updateMenuStats();
		
		var galleryButton = $('<a href="javascript:void(0)" title="Gallery"><i class="fa fa-th-large chx_menuGalleryButton"></i></a>');
		var menuButtonHolder = $('span.sub[data-description=0]').first();
		
		menuButtonHolder.html(function() {return this.innerHTML.replace("]", " / ");});
		
		galleryButton.appendTo(menuButtonHolder);
		menuButtonHolder.html(function() {return this.innerHTML + " ]";});
		
		$(".chx_menuGalleryButton").on("click", toggleGallery); //galleryButton isn't the same as $(".chx_menuGalleryButton") after appending the ] to menuButtonHolder.
	}
}

function initRevealImageSpoilers() { //Tux et al, MIT
	if (!getSetting('revealImageSpoilers')) {return;}
	
	$('.post-image').each(function() {
		var pic;
		if ($(this)[0].tagName == "IMG") {
			pic = $(this);
		} else if ($(this)[0].tagName == "CANVAS") {
			pic = $(this).next();
		} else {return;}
		
		var picUrl = pic.attr("src");
		if (picUrl.indexOf('spoiler.png') >= 0) {
			pic.attr("src", $(this).parent().attr("href"));
			pic.addClass("chx_unspoileredImage");
			
			pic.css({
				"width":      "auto",
				"height":     "auto",
				"max-width":  "255px",
				"max-height": "255px",
			});
		}
	});
}

function initKeyboardShortcuts() { //Pashe, heavily influenced by Tux et al, WTFPL
	if (!getSetting("keyboardShortcutsEnabled")) {return;}
	
	$(document).keydown(function(e) {
		if (e.keyCode == 27) {
			$('#quick-reply').remove();
			closeGallery();
		}
		
		if (e.target.nodeName == "INPUT" || e.target.nodeName == "TEXTAREA") {return;}
		if ((!e.ctrlKey) && (!e.metaKey)) {
			switch (e.keyCode) {
				case 82:
					reloadPage();
					break;
				case 81:
					showQR();
					e.preventDefault();
					break;
				case 71:
					toggleGallery();
					break;
				case 69:
					toggleExpandAll();
					break;
				case 67:
					goToCatalog();
					break;
				case 39:
					jogExpandedGalleryImage(+1);
					break;
				case 37:
					jogExpandedGalleryImage(-1);
					break;
			}
		}
	});
}

function initCatalog() { //Pashe, WTFPL
	if (!isOnCatalog()) {return;}
	
	//addCatalogPages
	if (getSetting("precisePages")) { 
		$(".thread").each(function (e, ele) {
			var threadId = $(ele).html().match(/<a href=".*\/([0-9]+).html?">/)[1];
			var threadPage = getThreadPage(threadId, thisBoard, true);
			
			if (threadPage < 1) {return;}
			
			$(ele).find("strong").first().html(function(e, html) {
				return html.replace(/P: [0-9]+/, ("P: " + threadPage));
			});
		});
	};
	
	//Last Modified
	$(".thread").each(function (e, ele) {
			var $this = $(this);
			var threadId = $this.html().match(/\/res\/([0-9]+).html?">/)[1];
			var threadPage = getThreadPage(threadId, thisBoard, true);
			
			var timestamp = getThreadLastModified(threadId, thisBoard, true);
			if (timestamp == -1) {return;}
			var lmDate  = new Date(timestamp * 1000);
			
			var lmTimeElement = $('<span class="chx_catalogLMTStamp"></span>');
			lmTimeElement.attr("title", lmDate.toGMTString());
			lmTimeElement.attr("data-timestamp", timestamp);
			lmTimeElement.attr("data-isotime", lmDate.toISOString());
			lmTimeElement.html("<br>" + $.timeago(timestamp * 1000));
			lmTimeElement.appendTo($this.find("strong").first());
		});
	
	//highlightCatalogAutosage
	$.ajax({
		url: "/settings.php?board="+thisBoard,
		async: true,
		cache: true,
		dataType: "json",
		success: function (response) {
			updateBoardSettings(response);
			
			$(".replies").each(function (e, ele) {
				var eReplies = $(ele).html().match(/R: ([0-9]+)/)[1];
				if (eReplies>bumpLimit) {
					$(ele).html(function(e, html) {
						return html.replace(/R: ([0-9]+)/, "<span style='color:#f00;'>R: $1</span>");
					});
				}
			});
		}
	});
	
	//setCatalogImageSize
	var catalogStorage = JSON.parse(localStorage.catalog);
	if (!catalogStorage.image_size) {
		catalogStorage.image_size = "large";
		localStorage.catalog = JSON.stringify(catalogStorage);
		
		$(".grid-li").removeClass("grid-size-vsmall");
		$(".grid-li").removeClass("grid-size-small");
		$(".grid-li").removeClass("grid-size-large");
		$(".grid-li").addClass("grid-size-" + catalogStorage.image_size);
		$("#image_size").val(catalogStorage.image_size);
	}
	
	//addCatalogNullImagePlaceholders
	$("img[src=''], img[src='/static/no-file.png']").attr("src", "data:image/svg+xml;base64,PHN2ZyB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgaGVpZ2h0PSIyMDAiIHdpZHRoPSIyMDAiIHZlcnNpb249IjEuMSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCwtODYwKSI+PHRleHQgc3R5bGU9ImxldHRlci1zcGFjaW5nOjBweDt0ZXh0LWFuY2hvcjptaWRkbGU7d29yZC1zcGFjaW5nOjBweDt0ZXh0LWFsaWduOmNlbnRlcjsiIHhtbDpzcGFjZT0icHJlc2VydmUiIGZvbnQtc2l6ZT0iNjRweCIgeT0iOTMwIiB4PSI5NSIgZm9udC1mYW1pbHk9IidBZG9iZSBDbGVhbiBVSScsIHNhbnMtc2VyaWYiIGxpbmUtaGVpZ2h0PSIxMjUlIiBmaWxsPSIjMDAwMDAwIj48dHNwYW4geD0iOTUiIHk9IjkyOSI+Tm88L3RzcGFuPjx0c3BhbiB4PSI5NSIgeT0iMTAxMCI+SW1hZ2U8L3RzcGFuPjwvdGV4dD48L2c+PC9zdmc+");
}

function initRISLinks() { //Pashe, 7185, WTFPL
	if (!getSetting("reverseImageSearch")) {return;}
	$("img.post-image").each(function() {addRISLinks(this);});
}

function initParseTimestampImage() { //Pashe, WTFPL
	//if (!getSetting("parseTimestampImage")) {break;}
	try {
		var minTimestamp = new Date(1985,1).valueOf();
		var maxTimestamp = Date.now()+(24*60*60*1000);
		
		$("p.fileinfo > span.unimportant > a:link").each(function() {
			var $this = $(this);
			var filename = $this.text();
			
			if (!filename.match(/^([0-9]{9,13})[^a-zA-Z0-9]?.*$/)) {return;}
			var timestamp = parseInt(filename.match(/^([0-9]{9,13})[^a-zA-Z0-9]?.*$/)[1]);
			
			if (timestamp < minTimestamp) {timestamp *= 1000;}
			if ((timestamp < minTimestamp) || (timestamp > maxTimestamp)) {return;}
			
			var fileDate = new Date(timestamp);
			
			var fileTimeElement = $('<span class="chx_PTIStamp"></span>');
			fileTimeElement.attr("title", fileDate.toGMTString());
			fileTimeElement.attr("data-timestamp", timestamp);
			fileTimeElement.attr("data-isotime", fileDate.toISOString());
			fileTimeElement.text(", " + $.timeago(timestamp) + ")");
			fileTimeElement.appendTo($this.parent());
			
			$this.parent().html(function(e, html) {
				return html.replace(")", "");
			});
		});
	} catch (e) {}
}

function initNotifications() {
	Notification.requestPermission();
}

function initMascot() { //Pashe, based on an anonymous contribution, WTFPL
	if (!getSetting("mascotUrl")) {return;}
	
	var mascotUrls = getSetting("mascotUrl").split("|");
	var mascotUrl = mascotUrls[Math.floor((Math.random()*mascotUrls.length))];
	
	$("head").append(
		"<style>" +
		"	form[name=postcontrols] {"+
		"		margin-right: 22%;"+
		"	}"+
		"	div.delete{"+
		"		padding-right: 6%;"+
		"	}"+
		"	div.styles {"+
		"		float: left;"+
		"	}"+
		"	div#chx_mascot img {"+
		"		display: block;"+
		"		position: fixed;"+
		"		bottom: 0pt;"+
		"		right: 0pt;"+
		"		left: auto;"+
		"		max-width: 25%;"+
		"		max-height: 100%;"+
		"		opacity: 0.8;"+
		"		z-index: -100;"+
		"		pointer-events: none;"+
		"	}"+
		"</style>"
	);
	
	var mascotHolder = $('<div id="chx_mascot"></div>');
	var mascotImage = $('<img></img>');
	var hostElement = $("body").first();
	
	mascotImage.attr("src", mascotUrl);
	
	mascotImage.appendTo(mascotHolder);
	mascotHolder.appendTo(hostElement);
	
	if (isOnCatalog()) {mascotImage.css("z-index", "-100");}
}

function initpurgeDeadFavorites() { //Pashe, WTFPL
	$("#chx_purgeDeadFavorites").click(function() {
		console.log("Working...");
		var originalText = $("#chx_purgeDeadFavorites").text();
		$("#chx_purgeDeadFavorites").text("Working...");
		$("#chx_purgeDeadFavorites").prop("disabled", true);
		var boards;
		$.ajax({
				url: "/boards.json",
				async: false,
				dataType: "json",
				success: function (response) {boards = response;}
		});	
		var boardsURIs = [];
		var favorites = JSON.parse(localStorage.favorites);

		for (var x in boards) {
			if (!boards.hasOwnProperty(x)) {continue;}
			boardsURIs.push(boards[x].uri);
		}
		
		if (boardsURIs.length > 0) {
			for (var i=0; i<favorites.length; i++) {
				var board = favorites[i];
				if (($.inArray(board, boardsURIs) == -1)) {
					$.ajax({
						url: "/" + board + "/",
						async: false,
						statusCode: {404: function() {
							unfavorite(board);
							console.log("Purge board /" + board + "/");
						}},
						success: function () {console.log("Keep unlisted board /" + board + "/");},
						type: "HEAD"
					});
				} else {
					console.log("Keep listed board /" + board + "/");
				}
			}
		}
		console.log("Done");
		$("#chx_purgeDeadFavorites").text(originalText + " - done");
		$("#chx_purgeDeadFavorites").prop("disabled", false);
	});
}

function initDefaultSettings() { //Pashe, WTFPL
	if (window.localStorage.color_ids === undefined) window.localStorage.color_ids = true;
	if (window.localStorage.videohover === undefined) window.localStorage.videohover = true;
	if (window.localStorage.useInlining === undefined) window.localStorage.useInlining = true;
	if (window.localStorage.catalogImageHover === undefined) window.localStorage.catalogImageHover = true;
	if (window.localStorage.imageHover === undefined) window.localStorage.imageHover = true;
}

function initFavicon() { //Pashe, WTFPL
	var faviconUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAFo9M/3AAAAAXNSR0IArs4c6QAAAeNJREFUOMu9kk1IVGEUhp/3jj8zukiYIGkh6iftwzZGaw1EqJW5KAxsvhmFgta1DGpRGTF35g5EURBGQRuJqG21iCKIaOUVCqHdYIU/k849LXIMEymCenbncM7hvO85sIF6fTgv6GELfb44qc0gFz6wwN4D4Hxo7MRmi/PhQ+BIU1++NKSkvpjALoAmM3tsCp7H0eShHec4Xzzs8uEFAPXnouZF1b8BYHyIK4UekDW2aVpU/Q3YsTiautc9Wezcm6tkMkHpOEmyP45+6vh7UttTJpfrPJ89MLJWfT27sK3A5fc8NXgFdifbP/xFzoezwPAPnzQWlwszAPty0e666h/lfGiNbZ0vvgANSDphZlfMdDlojO4ev5nGgpla22pbYjZo0sn5SuGinC9Ng50BMEt1zFf8Z/4rv7W6e/xqR6q15RFoYIuZcG0uKpxVI+714VEZgya1S3pWy6zcTpbalSGZWCe439xaq85dP10D6PXFMaG7wLvA+fCc86VEUlnirbBZzEZal9PLGdWXCGy0hbWuRjNAEGhp47vScj5cAdK19Zbswo2J6raz58ujmF0Cun5RfyuuZifkfJgDIuArsmlLgk8SQ8jaMavG0dToH5noThUPktIwiVYV8HKunH/SePx/ynf5T8EXjP2zGwAAAABJRU5ErkJggg==";
	$('<link></link>').attr("rel", "shortcut icon").attr("href", faviconUrl).appendTo($("head").first());
}

function initFlagIcons() { //Anon from >>>/tech/60489, presumably WTFPL or similar
	if (!$("#user_flag").length) {return;}
	
	var board = window.location.pathname.replace(/^\/([^/]+).*?$/, "$1");
	var custom_flag_url = window.location.origin + '/static/custom-flags/' + board + '/';
	var dropdown_options = document.getElementById('user_flag').childNodes;

	if (!dropdown_options || !dropdown_options.length) return;

	for (var i = 0; i < dropdown_options.length; i++) {
			var opt = dropdown_options[i];
			opt.style.paddingLeft = '20px';
			if (opt.value)
					opt.style.background = 'no-repeat left center url(' + custom_flag_url + opt.value + '.png)';
	}
}

function initFormattedTime() { //Pashe, WTFPL
	if (!getSetting("dateFormat")) {return;}
	
	$("time").text(function() {
		//%Y-%m-%d %H:%M:%S is nice
		
		var $this = $(this);
		
		var thisDate = new Date($this.attr("datetime"));
		
		if (getSetting("localTime")) {
			return strftime(getSetting("dateFormat"), thisDate);
		} else {
			return strftimeUTC(getSetting("dateFormat"), thisDate);
		}
	});
}

function initFilter() { //Pashe, WTFPL	
	$(".reply").each(runFilter);
	
	$.ajax({
		url: "/settings.php?board="+thisBoard,
		async: true,
		cache: true,
		dataType: "json",
		success: function (response) {
			updateBoardSettings(response);
			
			$(".reply").each(runFilter);
		}
	});
}

////////////////
//INIT CALLS
////////////////
$(window.document).ready(function() { try {
	initSettings();
	initDefaultSettings();
	initMenu();
	initCatalog();
	initFilter();
	initFormattedTime();
	initMascot();
	initRevealImageSpoilers();
	initRISLinks();
	initParseTimestampImage();
	initNotifications();
	initFlagIcons();
	initKeyboardShortcuts();
	initpurgeDeadFavorites();
	initFavicon();
} catch(e) {chxErrorHandler(e, "ready");}});

////////////////
//EVENT HANDLER FUNCTIONS
////////////////
function onNewPostRISLinks(post) { //Pashe, 7185, WTFPL
	$("#"+$(post).attr("id")+" img.post-image").each(function() {addRISLinks(this);}); 
}

function onNewPostNotifications(post) {
	var $post = $(post);
	if ($post.is('div.post.reply')) {
		$post.each(notifyReplies);
	} else {
		$post.find('div.post.reply').each(notifyReplies);
	}
}

function onNewPostFormattedTime() {
	initFormattedTime();
}

function onNewPostFilter(post) { //Pashe, WTFPL
	$(post).each(runFilter);
}

function intervalMenu() {
	updateMenuStats();
}

////////////////
//EVENT HANDLERS
////////////////
if (window.jQuery) {
	window.$(document).on('new_post', function (e, post) { try {
		onNewPostRISLinks(post);
		onNewPostNotifications(post);
		onNewPostFormattedTime();
		onNewPostFilter(post);
	} catch(e) {chxErrorHandler(e, "newpost");}});

	setInterval(intervalMenu, (1.5*60*1000));
}
} catch(e) {chxErrorHandler(e, "global");}

/* ---------------------------------ADDITIONS---------------------------------- */

////////////////
//HIDE DISCLAMERS (From sn0w)
////////////////
(function() {
    'use strict';
    $('.disclaimer-8kun').hide()
    $('section.col-12.col.box.description:nth-of-type(3)').hide()
    $('div.col-5.col:nth-of-type(3)').hide()
    $('p.unimportant:nth-of-type(2)').hide()
    $('p.unimportant:nth-of-type(3)').hide()
    $('p.unimportant:nth-of-type(4)').hide()

    var el, els = document.getElementsByTagName('*');
    var node, nodes;
    for (var i=0, iLen=els.length; i<iLen; i++) {
      el = els[i];
      if (el.tagName.toLowerCase() != 'script') {
        nodes = el.childNodes;
      } else {
        nodes = [];
      }
      for (var j=0, jLen=nodes.length; j<jLen; j++) {
          node = nodes[j];
          if (node.nodeType == 3) {
              node.data = node.data.replace('        ____________________________        ', '');
          }
      }
    }
  
})();


////////////////
//CHANGE LOGO
////////////////
let lookup_table = {
	'https://media.8kun.top/static/8kun-logo/8kun-logo-color.png': ' data:image/png;base64,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',
};

for (let image of document.getElementsByTagName('img')) {
	for (let query in lookup_table) {
		if (image.src == query) {
			image.src = lookup_table[query];
		}
	}
}

////////////////
//CHANGE FAVCON
////////////////
window.addEventListener('load', function() {
    var favicon = document.querySelector('link[rel~="icon"]');
    var clone = favicon.cloneNode(!0);
    clone.href = " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAMUExURQAAAAABAPXBAwAAAHrc0ScAAAAEdFJOU////wBAKqn0AAAACXBIWXMAAA7DAAAOwwHHb6hkAAAARElEQVQoU5WOUQoAIAhD1d3/zs0pQfZTIm6+xDSMeAPunraEwCOCtsXSZLbAVNWVEGhNYs4L6GkP3jvuX2jHHWd8A2ABQ1MCaSrpRPcAAAAASUVORK5CYII=";
    favicon.parentNode.removeChild(favicon);
    document.head.appendChild(clone);
}, false);

