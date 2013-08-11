﻿/**
* popup.js
* 
* Popup page script
* 
* @author Leonid Yakubov
* 
*/


// Global variables only exist for the life of the page, so they get reset
// each time the page is unloaded.
//Init data
var login = "",
	DEFAULT_LOGIN_STR = "NONE_USER",
	profileLink = "",
	artist = "";
//Messages
var INIT_DATA_MSG = "initData";
	PROCESSING_INTERNAL_MSG = "processingInternal",
	SAY_THANKS_MSG = "sayThanks",
	ALL_PAGES_DATA_MSG = "allPagesData",
	SAY_THANKS_ALL_PAGES_MSG = "sayThanksAllPages";
//Here we store IDs of all download tabs
var donwloadTabIds = [];
//ID of current tab
var currTabId = -1;
//Flag for about page
var isAboutPageOpened = false;
//All pages data
var isCheckboxEnabled = false;

//Singleton object incapsulating links data
//Default constructor inits data arrays on popup load
function Data() {
	//Init current page data
	this.postsWithHiddenLinksCount = 0;
	this.internalLinks = [],
	this.externalLinks = [];
	//Init all pages data
	this.areAllPagesProcessed = false,
	this.allPagesPostsWithHiddenLinksCount = 0,
	this.allPagesInternalLinks = [],
	this.allPagesExternalLinks = [];
	
	//Setter for current page data
	this.setCurrentPageData = function(hiddenCount, internal, external) {
		this.postsWithHiddenLinksCount = hiddenCount;
		this.internalLinks = internal,
		this.externalLinks = external;
	};
	//Setter for all pages data
	this.setAllPagesData = function(hiddenCount, internal, external) {
		this.allPagesPostsWithHiddenLinksCount = hiddenCount;
		this.allPagesInternalLinks = internal;
		this.allPagesExternalLinks = external;
	};
	//Get posts with hidden links counter depending on checkbox state
	this.getHiddenCount = function() {
		return isCheckboxEnabled ? this.allPagesPostsWithHiddenLinksCount : this.postsWithHiddenLinksCount;
	};
	//Getter internal links depending on checkbox state
	this.getInternal = function() {
		return isCheckboxEnabled ? this.allPagesInternalLinks : this.internalLinks;
	};
	//Getter external links depending on checkbox state
	this.getExternal = function() {
		return isCheckboxEnabled ? this.allPagesExternalLinks : this.externalLinks;
	};
};

//Instantiate data object
var data = new Data();


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
	document.querySelector('#allPagesCheckBox').addEventListener('click', setPagesDataOnCheckboxClick);

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

	//Init current page data
	data.setCurrentPageData(request.postsWithHiddenLinksCountMsg, request.internalLinksMsg, request.externalLinksMsg);

	console.log("Current page: posts with hidden links found: " + data.postsWithHiddenLinksCount);
	console.log("Current page: internal links found: " + data.internalLinks.length);
	console.log("Current page: exteranl links found: " + data.externalLinks.length);
	
	//Finally, set links data
	updateLinksData();
}

/**
 * Sets up links data found on page
 * 
 * @param request - object containing all init data sent by content script to popup
 * 
 * @param setAllPagesData - true if links data from all pages should be set
 */
function updateLinksData() {
	console.log("Updating links data within popup page...");
	
	//Handle posts containing hidden links
	var hiddenCountElem = document.getElementById('foundHidden');
	hiddenCountElem.innerText = data.getHiddenCount();
	if (data.getHiddenCount() > 0) {
		hiddenCountElem.style.color = "Red";
	}
	else {
		hiddenCountElem.style.color = "Black";
	}
	
	//Handle visible internal links 
	var internalCountElem = document.getElementById('foundVisible');
	internalCountElem.innerText = data.getInternal().length;		
	
	//Handle external links 
	var externalCountElem = document.getElementById('foundExternal');
	externalCountElem.innerText = data.getExternal().length;		
	
	/*//Clear status
	var statusMsg = "done!";
	setStatus(statusMsg);*/
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
		document.documentElement.style.overflow = 'hidden';
		aboutPageElem.style.display = "block";
	}
	else {
		aboutPageElem.style.display = "none";
		document.documentElement.style.height = '200px';
	}
	
	//Invert flag
	isAboutPageOpened = !isAboutPageOpened;
}

/**
 * Sends a message to content script to process all posts containing hidden links and re-parse page(s) for all visible internal links
 */
function sayThanksForAllPostsWithHiddenLinks() {
	chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
		var currTabId = tabs[0].id;
		console.log("Current tab ID: " + currTabId);
		
		//Send message to process all pages or just current one regarding the checkbox state
		var msg = isCheckboxEnabled ? SAY_THANKS_ALL_PAGES_MSG : SAY_THANKS_MSG;
		console.log("Sending request to the content script to click all thanks buttons...");
		
		chrome.tabs.sendMessage(currTabId,{message: msg}, function (response){
			console.log("Links received after page refresh");
		});
	});
}

/**
 * Starts download process of all visible internal links once user clicks on corresponding button on popup page
 */
function downloadByInternalLinks() {
	var url = "";
	var links = data.getInternal();
	for (var i=0; i < links.length; i++) {
		url = links[i];
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
	var links = data.getExternal();
	for (var i=0; i < links.length; i++) {
		url = links[i];
		chrome.tabs.create({url: url, active: false});
	}
}

/** 
 * Sets message within a status bar
 * 
 * @param msg - string to be set within status bar
 */
function setStatus(msg) {
	var countElem = document.getElementById('statusBar');
	countElem.innerText = "Status: " + msg;
}

function setPagesDataOnCheckboxClick() {
	var checkBoxElem = document.getElementById('allPagesCheckBox');
	isCheckboxEnabled = checkBoxElem.checked;
	
	//areAllPagesProcessed = true;
	var linksLabelElem = document.getElementById('linksLabel');
	
	//Check if script has all page data
	if (!data.areAllPagesProcessed) {
		return;
	}
		
	//Show data for all pages
	if (isCheckboxEnabled) {
		console.log("Showing all pages data");
		linksLabelElem.innerText = "All pages";
	}
	//Show data for current page
	else {
		console.log("Showing current page data");
		linksLabelElem.innerText = "Current page";
	}
	
	updateLinksData();
}

function handleUpdatedLinksData(request) {
	console.log("Setting all pages data");
	
	//Set updated data for current page
	data.postsWithHiddenLinksCount = request.postsWithHiddenLinksCountMsg;	
	data.internalLinks = request.internalLinksMsg;

	console.log("Current page: posts with hidden links found: " + data.postsWithHiddenLinksCount);
	console.log("Current page: internal links found: " + data.internalLinks.length);
	console.log("Current page: exteranl links found: " + data.externalLinks.length);
	
	updateLinksData();
	
	//Clear status
	var statusMsg = "done!";
	setStatus(statusMsg);
}

function handleAllPagesData(request) {
	console.log("Setting all pages data");
	
	//Just store data related to all artist pages
	//The UI will be updated by a separate function on user's click
	data.areAllPagesProcessed = true;
	data.allPagesPostsWithHiddenLinksCount = request.allPagesPostsWithHiddenLinksCountMsg;
	data.allPagesInternalLinks = request.allPagesInternalLinksMsg;
	data.allPagesExternalLinks = request.allPagesExternalLinksMsg;
	
	console.log("All pages: posts with hidden links found: " + data.allPagesPostsWithHiddenLinksCount);
	console.log("All pages: internal links found: " + data.allPagesInternalLinks.length);
	console.log("All pages: exteranl links found: " + data.allPagesExternalLinks.length);
	
	//Set status
	var numOfPages = request.numberOfPagesMsg;
	var statusMsg = numOfPages + " pages parsed";
	setStatus(statusMsg);
	
	updateLinksData();
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
			
			//TODO Add switch statement here
			//Handle every message by a separate function
			if (requestMsg == INIT_DATA_MSG) {
				handleInitData(request);
			}
			if (requestMsg == PROCESSING_INTERNAL_MSG) {
				var statusMsg = "processing...";
				setStatus(statusMsg);
			}
			if (requestMsg == SAY_THANKS_MSG) {
				handleUpdatedLinksData(request);
			}
			if (requestMsg == ALL_PAGES_DATA_MSG) {
				handleAllPagesData(request);
			}
});