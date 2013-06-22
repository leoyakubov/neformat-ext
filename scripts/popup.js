/**
* popup.js
* 
* Popup page script
* 
* @author Leonid Yakubov
* 
*/

//Init data
var login = "",
	DEFAULT_LOGIN_STR = "NONE_USER",
	profileLink = "",
	artist = "";
//Links
var internalLinks = [],
	externalLinks = [];
//Messages
var INIT_DATA_MSG = "initData";
	PROCESSING_INTERNAL_MSG = "processingInternal",
	SAY_THANKS_MSG = "sayThanks";
//Here we store IDs of all download tabs
var donwloadTabIds = [];
//ID of current tab
var currTabId = -1;
//Flag for about page
var isAboutPageOpened = false;

/**
 * Initializes popup page, sends a message to content script to get all data needed
 *  
 */
function initPopup() {
	console.log("Popup initialization...");
	
	//Add click listeners
	document.querySelector('#sayThanks').addEventListener('click', sayThanksForAllPostsWithHiddenLinks);
	document.querySelector('#downloadVisible').addEventListener('click', downloadByInternalLinks);
	document.querySelector('#openExternal').addEventListener('click', openExternalLinks);
	document.querySelector('#aboutLink').addEventListener('click', showAboutPage);

	chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
		currTabId = tabs[0].id;
		console.log("Current tab ID: " + currTabId);
		
		console.log("Sending request to the content script to get init data...");
		chrome.tabs.sendMessage(currTabId,{message: INIT_DATA_MSG}, function (response){
			console.log("Got a response from content script");
			console.log(JSON.stringify(response));
		});
	});
}

/**
 * Sets up all init data like artist name and links found on page to popup
 * 
 * @param request - object containing all init data sent by content script to popup
 */
function handleInitData(request) {
	//Set login and artist
	login = request.loginMsg;
	console.log("User login received from content script:" + login);
	profileLink = request.profileLinkMsg;
	console.log("Profile page link received from content script:" + profileLink);
	artist = request.artistMsg;
	console.log("Artist name received from content script:" + artist);

	//Set login data within popup page
	var loginElement = document.getElementById('userLink');
	if (login == DEFAULT_LOGIN_STR) {
		login = "You are not logged in";
		loginElement.style.color = "Red";
	}
	else {
		//Add handler for profile page link
		document.querySelector('#userLink').addEventListener('click', openProfilePage);
		loginElement.href = profileLink;
	}
	loginElement.innerHTML = login;
	
	//Set artist title
	var artistElement = document.getElementById('artistName');
	artistElement.innerHTML = artist;
		
	//Set correct URLs for external sites
	var lfElement = document.getElementById('lastfm');
	lfElement.href = lfElement.href + artist.replace(/ /g, '+');
	//console.log("Corrected lf URL:" + lfElement.href);
		
	var gsElement = document.getElementById('grooveshark');
	gsElement.href = gsElement.href + artist.replace(/ /g, '+');
	//console.log("Corrected gs URL:" + gsElement.href);
		
	var ytElement = document.getElementById('youtube');
	ytElement.href = ytElement.href + artist.replace(/ /g, '+');
	//console.log("Corrected yt URL:" + ytElement.href);
		
	var rtElement = document.getElementById('rutracker');
	rtElement.href = rtElement.href + artist.replace(/ /g, '%20');
	//console.log("Corrected rt URL:" + rtElement.href);
	
	//Handle posts containing hidden links
	var postsWithHiddenLinks = request.postsWithHiddenLinksMsg;	
	if (postsWithHiddenLinks > 0) {
		console.log("Found posts with hidden links: " + postsWithHiddenLinks);
		var hiddenCountElem = document.getElementById('foundHidden');
		hiddenCountElem.innerText = postsWithHiddenLinks;
		hiddenCountElem.style.color = "Red";
	}
	
	//Handle visible internal links 
	internalLinks = request.internalLinksMsg;
	if (internalLinks.length > 0) {
		console.log("Found internal links: " + internalLinks.length);
		var internalCountElem = document.getElementById('foundVisible');
		internalCountElem.innerText = internalLinks.length;		
	}
	
	//Handle external links 
	externalLinks = request.externalLinksMsg;
	if (externalLinks.length > 0) {
		console.log("Found external links: " + externalLinks.length);
		var externalCountElem = document.getElementById('foundExternal');
		externalCountElem.innerText = externalLinks.length;		
	}
}

/**
 * Opens user profile page in a separate tab
 */
function openProfilePage() {
	chrome.tabs.create({url: profileLink});
}

/**
 * Opens about page
 */
function showAboutPage() {	
	var aboutPageElem = document.getElementById('aboutPopup');
	
	if (!isAboutPageOpened) {
		var extNameElem = document.getElementById('extName');
		extNameElem.innerText = chrome.runtime.getManifest().name + " v." + chrome.runtime.getManifest().version;
		aboutPageElem.style.display = "block";
	}
	else {
		aboutPageElem.style.display = "none";
		//TODO Revert body height
	}
	
	//Invert flag
	isAboutPageOpened = !isAboutPageOpened;
}

/**
 * Sends a message to content script to process all posts containing hidden links and re-parse page for all visible internal links
 */
function sayThanksForAllPostsWithHiddenLinks() {
	chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
		var currTabId = tabs[0].id;
		console.log("Current tab ID: " + currTabId);

		console.log("Sending request to the content script to click all thanks buttons...");
		chrome.tabs.sendMessage(currTabId,{message: SAY_THANKS_MSG}, function (response){
			console.log("Links received after page refresh");
		});
	});
}

/**
 * Starts download process of all visible internal links once user clicks on corresponding button on popup page
 */
function downloadByInternalLinks() {
	var url = "";
	for (var i=0; i < internalLinks.length; i++) {
		url = internalLinks[i];
		chrome.tabs.create({url: url, active: false}, function(tab) {
			donwloadTabIds.push(tab.id);
		});
	}
}

/**
 * Opens every external link in a separate tab
 */
function openExternalLinks() {
	var url = "";
	for (var i=0; i < externalLinks.length; i++) {
		url = externalLinks[i];
		chrome.tabs.create({url: url, active: false});
	}
}

/**
 * Updates popup page elements after processing all posts with hidden links
 * 
 * @param request - object received from content script containing internal visible links
 */
function handleUpdatedLinksData(request) {
	//Handle visible internal links 
	var postsWithHiddenLinks = request.postsWithHiddenLinksMsg;
	console.log("Found posts with hidden links: " + postsWithHiddenLinks);
	var hiddenCountElem = document.getElementById('foundHidden');
	hiddenCountElem.innerText = postsWithHiddenLinks;
	
	if (postsWithHiddenLinks == 0) {
		hiddenCountElem.style.color = "Black";
	}
	
	//Handle posts with hidden links
	internalLinks = request.internalLinksMsg;
	console.log("Found internal inks: " + internalLinks.length);
	var internalCountElem = document.getElementById('foundVisible');
	internalCountElem.innerText = internalLinks.length;
	
	//Clear status
	var statusMsg = "Done!";
	setStatus(statusMsg);
}

/** Sets message within a status bar
 * @param msg - string to be set within status bar
 */
function setStatus(msg) {
	var countElem = document.getElementById('statusBar');
	countElem.innerText = msg;
}

//Fires up when popup page has been loaded
document.addEventListener('DOMContentLoaded', function() {
	initPopup();
});

//Listens to income messages
chrome.extension.onMessage.addListener(
	function(request, sender, sendMessage) {
			console.log("Popup script has received a message: " + request.answerMsg);
			var requestMsg = request.answerMsg;
			
			//Handle every message by a separate function
			if (requestMsg == INIT_DATA_MSG) {
				handleInitData(request);
			}
			if (requestMsg == PROCESSING_INTERNAL_MSG) {
				var statusMsg = "Processing...";
				setStatus(statusMsg);
			}
			if (requestMsg == SAY_THANKS_MSG) {
				handleUpdatedLinksData(request);
			}
});