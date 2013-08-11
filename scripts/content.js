/**
* content.js
* 
* Content script injected into artist page
* 
* @author Leonid Yakubov
* 
*/

//Global variables only exist for the life of the page, so they get reset
//each time the page is unloaded.
//Init data
var DEFAULT_LOGIN_STR = "NONE_USER",
	DEFAULT_ARTIST_STR = "NONE_ARTIST",
	login = DEFAULT_LOGIN_STR,
	profileLink = "",
	artist = DEFAULT_ARTIST_STR;
//Links for current page
var thanksLinks = [],
	internalLinks = [],
	externalLinks = [];
//Links for all artist pages
var	allPagesThanksLinks = [],
	allPagesInternalLinks = [],
	allPagesExternalLinks = [];
//Pages
var currentPage = 1,
 	numberOfPages = 0,
 	linksToArtistPages = [];
//Messages
var INIT_DATA_MSG = "initData",
	SAY_THANKS_MSG = "sayThanks",
	ALL_PAGES_DATA_MSG = "allPagesData",
	SAY_THANKS_ALL_PAGES_MSG = "sayThanksAllPages";
//External sites (file sharing)
var mediafire = "mediafire.com",
	rapidshare = "rapidshare.com",
	ifolder = "ifolder.ru",
	letitbit = "letitbit.net",
	fourshared = "4shared.com",
	depositfiles = "depositfiles.com";
var	externalSites = [mediafire, rapidshare, ifolder, letitbit, fourshared, depositfiles];

var _XHRID = 0;
var _XHRCALL = [];

//Initialize script after injection
getInitData();
console.log("Content script initialized");

/**
 * Initiates gathering of all data needed by popup page
 */
function getInitData() {
	console.log("Gathering init data...");
	//Get artist name
	if (artist == DEFAULT_ARTIST_STR) {
		getArtist();
	}
	//Get user login and link to profile page
	if (!isUserLoggedIn()) {
		getLogin();
	}
	//Parse page only if the user is logged in
	//This if statement is separate from previous one as both login and links data should be gathered 
	//when the content script is initialized for the first time (just after injection by background script)
	if (isUserLoggedIn()) {
		//Search posts containing hidden links on current page
		if (thanksLinks.length < 1) {
			thanksLinks = findPostsWithHiddenLinksOnPage(document, location.href);
		}
		//Search visible internal links
		if (internalLinks.length < 1) {
			internalLinks = findInternalLinksOnPage(document, location.href);			
		}
		//Search external links
		if (externalLinks.length < 1) {
			externalLinks = findExternalLinksOnPage(document, location.href);
		}
		//Get number of artist pages during script initialization
		if (numberOfPages == 0) {
			//Update pages counter and get current page number
			getNumberOfArtistPages();
			//Get array of links
			getArrayOfLinksToArtistPages();
		}
		//Parse all pages only if the number of pages is more than 1.
		//If less - we've already parsed current page, no need to send new request
		if (numberOfPages > 1) {
			//Pass all pages in background
			//The found links will are stored in content script, and will be sent to popup script on demand
			if ((allPagesThanksLinks.length == 0) &&
				(allPagesInternalLinks.length == 0) &&
				(allPagesExternalLinks.length == 0)) {
					console.log("\n");
					parseAllArtistPages();
			}
			else {
				//Send already parsed links data to popup
				sendAllPagesDataToPopup();
			}
		}
		else {
			//Set data for all pages (no need to run parseAllPages() function)
			cleanupAllPagesData();
			allPagesThanksLinks = allPagesThanksLinks.concat(thanksLinks);
			allPagesInternalLinks = allPagesInternalLinks.concat(internalLinks);
			allPagesExternalLinks = allPagesExternalLinks.concat(externalLinks);
			//Send updated links data to popup
			sendAllPagesDataToPopup();
		}
	}
}

/**
 * Gets neformat user name.
 * If user is not logged in, the login variable will be containing the default value
 */
function getLogin() {
	//var xpath = "/html/body/div[1]/div/div/table[1]/tbody/tr/td[4]/div/strong/a";
	var xpath = "/html/body/div/div/div/table/tbody/tr/td[3]/div/strong/a";
		search = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null),
		result = search.iterateNext();
	if (result != null) {
		login = result.childNodes[0].nodeValue.trim();
		profileLink = result.href;
	}
	console.log("\tLogin: " + login);
	console.log("\tLink to profile: " + profileLink);
}

/**
 * Checks if user is currently logged in
 * 
 * @returns {Boolean} true if user is logged in
 */
function isUserLoggedIn() {
	return login == DEFAULT_LOGIN_STR ? false : true; 
}

/**
 * Gets artist name on current page
 */
function getArtist() {
	//var xpath = "/html/body/div[1]/div/div/table[1]/tbody/tr/td[1]/table/tbody/tr[2]/td/strong"; //with year
	var artist_xpath = "/html/body/div[2]/div/div/div/div/table/tbody/tr[2]/td[2]/div/strong",
		search = document.evaluate(artist_xpath, document, null, XPathResult.ANY_TYPE, null),
		result = search.iterateNext();
	
	if (result != null) {
		artist = result.childNodes[0].nodeValue.trim();
	}
	
	console.log("\tArtist: " + artist);
}

/**
 * Searches posts containing hidden links and extracts URL of Thanks button for every such post
 * These URLs will be hit by content script. Once thanks button is pressed and the page reloaded, the hidden links become visible
 * 
 * @param doc - page document to be parsed
 * @param url - URL of page
 * @returns {Array} - array of post thanks links found on a given page
 */
function findPostsWithHiddenLinksOnPage(doc, url) {
	console.log("Searching posts with hidden links on page: " + url);
	var post_xpath = "/html/body/div[2]/div/div/div/*[descendant::*[contains(.,'чтобы увидеть ссылку (нужна регистрация)')]]",
		allpostsWithHiddenLinks = doc.evaluate(post_xpath, doc, null, XPathResult.ANY_TYPE, null),
		postWithHiddenLinks = allpostsWithHiddenLinks.iterateNext();
	var links = [];
	//add post_thanks links to array
	while (postWithHiddenLinks) {
		console.log("\tFound post with hidden links: " + postWithHiddenLinks.id);
		//Select <a> element containing post-thanks link for a given post node
		var postId = postWithHiddenLinks.id;
		postId = postId.replace(/edit/g, '');
		var aXpath = "//a[@id='post_thanks_button_" + postId + "']";
		var hiddenURLs = doc.evaluate(aXpath, doc, null, XPathResult.ANY_TYPE, null);
		var hiddenURL = hiddenURLs.iterateNext();
		console.log("\tPost thanks URL: " + hiddenURL.href);
		links.push(hiddenURL.href);
		postWithHiddenLinks = allpostsWithHiddenLinks.iterateNext();
	}
	
	return links;
}

/**
 * Searches visible internal links on current page.
 * These links will be used by popup script to download music archives from deletemp3in24hours.com storage
 * 
 * @param doc - page document to be parsed
 * @param url - URL of page
 * @returns {Array} - array of internal neformat music links found on a given page
 */
function findInternalLinksOnPage(doc, url) {
	console.log("Searching internal links on page: " + url);
	var links_xpath = "//a[contains(@href,'deletemp3in24hours.com')]",
		allPosts = doc.evaluate(links_xpath, doc, null, XPathResult.ANY_TYPE, null),
		linkNode = allPosts.iterateNext();
	var links = [];
	while (linkNode) {
		console.log("\tFound internal link: " + linkNode.href);
		links.push(linkNode.href);
		linkNode = allPosts.iterateNext();
	}
	
	return links;
}

/**
 * Searches external links on current page.
 * These links will be used by popup script to open them in a separate tabs
 * 
 * @param doc - page document to be parsed
 * @param url - URL of page
 * @returns {Array} - array of external music links found on a given page
 */
function findExternalLinksOnPage(doc, url) {
	console.log("Searching external links on page: " + url);
	var links = [];
	for (var i = 0; i < externalSites.length; i++) {
		  site = externalSites[i];
		  var links_xpath = "//a[contains(@href,'" + site +"')]",
			allLinks = doc.evaluate(links_xpath, doc, null, XPathResult.ANY_TYPE, null),
			linkNode = allLinks.iterateNext();
			while (linkNode) {
				console.log("\tFound external link: " + linkNode.href);
				links.push(linkNode.href);
				linkNode = allLinks.iterateNext();
		}
	}
	
	return links;
}

/**
 * Processes current page by clicking all Thanks buttons, reloading page and searching of all internal links
 * 
 * @param requestMsg - message will be sent back to popup script
 */
function processCurrentPage(requestMsg) {
	//First, click all Thanks buttons for posts containing hidden links
	processHiddenLinks();
	
	//Reload page, append new body, search all internal links
	//Wait 3 seconds until all hidden links were hit
	setTimeout(function() {
		//Now, reload the whole page
		console.log("Reloading page...");
			
		var xmlHttp = new XMLHttpRequest();
		xmlHttp.open("GET", location.href, false); //false - wait for server response
		    
		//Once we've got the response - search for internal links and send them to popup
		xmlHttp.onreadystatechange = function() {
		 	if (xmlHttp.readyState == 4) {
		   		if(xmlHttp.status == 200) {
		   			console.log("Page has been reloaded");
		   			//Re-parse all pages
		   			parseAllArtistPages();
		   			//Retrieve reloaded page and append new body to document
		   			var srvResponseText = xmlHttp.responseText;
		   			var tempBody = document.createElement('body');
		   			tempBody.setAttribute("id", "reloaded");
		   			tempBody.innerHTML = srvResponseText;
		   			document.body = tempBody;
		   			//First search for hidden links again to be sure all Thanks buttons were processed
		   			thanksLinks = thanksLinks.concat(findPostsWithHiddenLinksOnPage(document, location.href));
		   			//Now extract all internal links 
		   			internalLinks = internalLinks.concat(findInternalLinksOnPage(document, location.href));
		   			//Filter links
		   			filterCurrentPageLinks();
		   			//Send updated links data to popup
					chrome.runtime.sendMessage({answerMsg: requestMsg, 
												postsWithHiddenLinksCountMsg: thanksLinks.length,
												internalLinksMsg: internalLinks});
				    }
				}
			};
		    xmlHttp.send(null);
		}, 3000);
}

/**
 * Hits all Thanks URLs - this will make hidden links visible
 */
function processHiddenLinks() {
	//If found - hit 'em all
	if (thanksLinks.length > 0) {
		console.log("thanksLinks.length: " + thanksLinks.length);
		var xmlHttp = null;
		for (var i=0; i < thanksLinks.length; i++) {
			xmlHttp = new XMLHttpRequest();
			xmlHttp.open("GET", thanksLinks[i], true ); //true - async
			xmlHttp.onreadystatechange = function(i) {
				if (xmlHttp.readyState == 4) {
					if(xmlHttp.status == 200) {
						console.log("\tLink hitted");
					}
				}
			};
			console.log("\tHitting link: " + thanksLinks[i]);
			xmlHttp.send(null);
		}
		//Perform cleanup
		thanksLinks.length = 0;
	}
}

/**
 * Removes duplicates in arrays containing current page data
 */
function filterCurrentPageLinks() {
	//Filter links
	thanksLinks = thanksLinks.filter(onlyUnique);
	internalLinks = internalLinks.filter(onlyUnique);
	externalLinks = externalLinks.filter(onlyUnique);
	
	console.log("Current page: posts with hidden links found: " + thanksLinks.length);
	console.log("Current page: internal links found: " + internalLinks.length);
	console.log("Current page: exteranl links found: " + externalLinks.length);
}

/**
 * Gets a number of pages for current artist, sets current page number
 */
function getNumberOfArtistPages() {
	//Search pages element on current page 
	var pages_xpath = "/html/body/div/div/div/table[4]/tbody/tr/td[2]/div/table/tbody/tr/td",
		allPages = document.evaluate(pages_xpath, document, null, XPathResult.ANY_TYPE, null),
		pageNode = allPages.iterateNext();
	
	if (pageNode) {
		var currentPageStr = pageNode.innerText.replace(/Страница /g, '');  
		var pos = currentPageStr.indexOf(" ");
		currentPageStr = currentPageStr.substring(0, pos);
		currentPage = parseInt(currentPageStr, 10);
		
		var regex = new RegExp("Страница " + currentPage + " из ", "g");
		var pagesCnt = pageNode.innerText.replace(regex, '');
		numberOfPages = parseInt(pagesCnt, 10);
	}
	//In case of only 1 page there is no pages element
	//Thus, we initialize it with value of 1
	if (numberOfPages == 0) {
		numberOfPages++;
	}
	console.log("Current page: " + currentPage);
	console.log("Found pages: " + numberOfPages);
}

/**
 * Gets an array of URLs to artist pages
 */
function getArrayOfLinksToArtistPages() {
	//Clean up
	linksToArtistPages.length = 0;
	linksToArtistPages = [location.href];
	//Set the URL of the first page
	if (currentPage != 1) {
		var regex = new RegExp("-" + currentPage + ".html", "g"),
		urlStr = location.href.replace(regex, ".html");
		linksToArtistPages[0] = urlStr;
	}
	console.log("All pages:");
	console.log("\t" + linksToArtistPages[0]);
	for (var i=2; i <= numberOfPages; i++) {
		var pageUrl = linksToArtistPages[0];
		pageUrl = pageUrl.replace(/.html/g, "-" + i + ".html");
		linksToArtistPages.push(pageUrl);
		console.log("\t" + pageUrl);
	}
}

/**
 * Gets page from the server, parses it setting all data to arrays. This method is called within 
 * another method iterating through all artist pages. Once the last responce received from the server,
 * all found data is sent to popup script  
 * 
 * @param url- page URL
 */
function parsePage(url) {
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.open("GET", url, true ); //true - async
	xmlHttp.onreadystatechange = function(xhrid) {
		return function() {
			if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
				//Workaround for Chrome bug when the xmlHttp.readyState == 4 fires multiple times
				//see https://github.com/madrobby/zepto/commit/8e84f2e52a007b0f1fea740c49d5e669adc3a3dc
				//http://bernardosilva.com.br/bug/ajax/solution.html
				console.log("Responce from server received");
				if (_XHRCALL[xhrid] !== true) {
					return;
				}
				_XHRCALL[xhrid] = null;
				console.log("xhrid: " + xhrid);
				
				//Retrieve page
	   			var srvResponseText = xmlHttp.responseText;
	   			//Create new document
	   			var doc = document.implementation.createHTMLDocument('title');
	   		    doc.documentElement.innerHTML = srvResponseText;
	   		    //Parse page:
	   		    //1) Get links to posts with hidden music
	   		    allPagesThanksLinks = allPagesThanksLinks.concat(findPostsWithHiddenLinksOnPage(doc, url));
	   		    //2) Get external links
	   		    allPagesInternalLinks = allPagesInternalLinks.concat(findInternalLinksOnPage(doc, url));		
	   		    //3) Get internal links
	   		    allPagesExternalLinks = allPagesExternalLinks.concat(findExternalLinksOnPage(doc, url));
		   		    
	   		    console.log("\tpagesLeft: " + --pagesLeft);
	   		    //Once all artist pages were parsed - send data to popup script
	   			if (pagesLeft == 0) {
	   				sendAllPagesDataToPopup();
	   			}
			}
		};
	}(_XHRID);
	_XHRCALL[_XHRID] = true;
	_XHRID++;
	
	xmlHttp.send(null);
}

/**
 * Parses all artits pages. All hard work is done by parsePage(url) method
 */
function parseAllArtistPages() {
		console.log("Parsing all pages... ");
		cleanupAllPagesData();
		pagesLeft = numberOfPages;
		for (var i=0; i < linksToArtistPages.length; i++) {
			parsePage(linksToArtistPages[i]);
			console.log("\tParsing page: " + linksToArtistPages[i]);
		}
}

/**
 * Performs clenaup of all pages arrays
 */
function cleanupAllPagesData() {
	//Perform cleanup
	allPagesThanksLinks.length = 0;
	allPagesInternalLinks.length = 0;
	allPagesExternalLinks.length = 0;
}

/**
 * Utility method used to filter array by selectiong only unique elements
 */
function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

/**
 * Sends all pages data to popup script.
 * Before sending removes duplicates from data arrays.
 */
function sendAllPagesDataToPopup() {
	//Filter links
	allPagesThanksLinks = allPagesThanksLinks.filter(onlyUnique);
	allPagesInternalLinks = allPagesInternalLinks.filter(onlyUnique);
	allPagesExternalLinks = allPagesExternalLinks.filter(onlyUnique);
	console.log("All pages: posts containing hidden links found: " + allPagesThanksLinks.length);
	console.log("All pages: internal links found: " + allPagesInternalLinks.length);
	console.log("All pages: exteranl links found: " + allPagesExternalLinks.length);
	
	//Send updated links data to popup
	chrome.runtime.sendMessage({answerMsg: ALL_PAGES_DATA_MSG, 
		allPagesPostsWithHiddenLinksCountMsg: allPagesThanksLinks.length,
		allPagesInternalLinksMsg: allPagesInternalLinks,
		allPagesExternalLinksMsg: allPagesExternalLinks,
		numberOfPagesMsg: numberOfPages});
}

/**
 * Processes every artist page by clicking all Thanks buttons, reloading page and searching of all internal links
 */
function processAllPages() {
	//First, click all Thanks buttons for posts containing hidden links
	processHiddenLinksOnAllPages();
	
	//Reload page, append new body, search all internal links
	//Wait 3 seconds until all hidden links were hit
	setTimeout(function() {
		//First, re-parse current page
		processCurrentPage(SAY_THANKS_MSG);
		//Now re-parse all pages and send updated data to popup
		parseAllArtistPages();
	}, 3000);
}

/**
 * Hits all Thanks URLs within all artist pages - this will make hidden links visible
 */
function processHiddenLinksOnAllPages() {
	//If found - hit 'em all
	if (allPagesThanksLinks.length > 0) {
		console.log("allPagesThanksLinks.length: " + allPagesThanksLinks.length);
		var xmlHttp = null;
		for (var i=0; i < allPagesThanksLinks.length; i++) {
			xmlHttp = new XMLHttpRequest();
			xmlHttp.open("GET", allPagesThanksLinks[i], true ); //true - async
			xmlHttp.onreadystatechange = function() {
				if (xmlHttp.readyState == 4) {
					if(xmlHttp.status == 200) {
						console.log("\tLink hitted");
					}
				}
			};
			console.log("\tHitting link: " + allPagesThanksLinks[i]);
			xmlHttp.send(null);
		}
		//Perform cleanup
		allPagesThanksLinks.length = 0;
	}
}

//Listens to income messages
chrome.runtime.onMessage.addListener(
	function(request, sender, sendMessage) {
		var requestMsg = request.message;
		console.log("Content-script has received a message: " + requestMsg);
		
		//Handle message
		switch (requestMsg)
		{
		case INIT_DATA_MSG:
			getInitData();
			//Filter links
   			filterCurrentPageLinks();
			//Send initial data to popup
			chrome.runtime.sendMessage({answerMsg: requestMsg, 
										loginMsg: login, 
										profileLinkMsg: profileLink, 
										artistMsg: artist,
										postsWithHiddenLinksCountMsg: thanksLinks.length,
										internalLinksMsg: internalLinks,
										externalLinksMsg: externalLinks});
			break;
		case SAY_THANKS_MSG:
			//Process current page
			processCurrentPage(requestMsg);
			break;
		case SAY_THANKS_ALL_PAGES_MSG:
			//Process all page
			processAllPages();
			break;
		}
});