/**
* content.js
* 
* Content script injected into artist page
* 
* @author Leonid Yakubov
* 
*/

//Init data
var DEFAULT_LOGIN_STR = "NONE_USER",
	DEFAULT_ARTIST_STR = "NONE_ARTIST",
	login = DEFAULT_LOGIN_STR,
	profileLink = "",
	artist = DEFAULT_ARTIST_STR;
//Links
var thanksLinks = [],
	internalLinks = [],
	externalLinks = [];
//Pages
var currentPage = 1,
 	pagesNumber = 1;
//Messages
var INIT_DATA_MSG = "initData",
	PROCESSING_INTERNAL_MSG = "processingInternal",
	SAY_THANKS_MSG = "sayThanks";
//External sites (file sharing)
var mediafire = "mediafire.com",
	rapidshare = "rapidshare.com",
	ifolder = "ifolder.ru",
	letitbit = "letitbit.net",
	depositfiles = "depositfiles.com";

var	externallSites = [mediafire, rapidshare, ifolder, letitbit, depositfiles];
	
//Initialize script after injection
getInitData();
console.log("Content script initialized");

/**
 * Initiates gathering of all data needed by popup page
 */
function getInitData() {
	console.log("Gathering init data...");
	
	//Get user login and link to profile page
	if (!isUserLoggedIn()) {
		getLogin();
	}
	//Get artist name
	if (artist == DEFAULT_ARTIST_STR) {
		getArtist();
	}
	//Search links only if user is logged in
	if (isUserLoggedIn()) {
		//Search posts containing hidden links
		if (thanksLinks.length < 1) {
			findPostsWithHiddenLinksOnCurrentPage();			
		}
		//Search visible internal links
		if (internalLinks.length < 1) {
			findInternalLinksOnCurrentPage();			
		}
		//Search external links
		if (externalLinks.length < 1) {
			findExternalLinksOnCurrentPage();
		}
	}
	
	//Update pages counter
	getArtistPagesNumber();
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
	
	console.log("Login: " + login);
	console.log("Link to profile: " + profileLink);
}

/**
 * Checks if user is currently logged in
 * 
 * @returns {Boolean}
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
	
	console.log("Artist: " + artist);
}

/**
 * Searches posts containing hidden links and extracts URL of THanks button for every such post
 * These URLs will be hit by content script. Once thanks button is pressed and the page reloaded, the hidden links become visible
 */
function findPostsWithHiddenLinksOnCurrentPage() {
	console.log("Searching posts with hidden links on current page: " + location.href);
	
	//search posts with hidden links
	var post_xpath = "/html/body/div[2]/div/div/div/*[descendant::*[contains(.,'чтобы увидеть ссылку (нужна регистрация)')]]",
		allpostsWithHiddenLinks = document.evaluate(post_xpath, document, null, XPathResult.ANY_TYPE, null),
		postWithHiddenLinks = allpostsWithHiddenLinks.iterateNext();
	
	//Cleanup links array
	thanksLinks.length = 0;
	
	//add post_thanks links to array
	while (postWithHiddenLinks) {
		console.log("Found post with hidden links: " + postWithHiddenLinks.id);
		
		//Select <a> element containing post-thanks link for a given post node
		var postId = postWithHiddenLinks.id;
		postId = postId.replace(/edit/g, '');
		var aXpath = "//a[@id='post_thanks_button_" + postId + "']";
		var hiddenURLs = document.evaluate(aXpath, document, null, XPathResult.ANY_TYPE, null);
		var hiddenURL = hiddenURLs.iterateNext();
		console.log("Post thanks URL: " + hiddenURL.href);
		thanksLinks.push(hiddenURL.href);
		
		postWithHiddenLinks = allpostsWithHiddenLinks.iterateNext();
	}
}

/**
 * Searches visible internal links on current page.
 * These links will be used by popup script to download music archives from deletemp3in24hours.com storage
 */
function findInternalLinksOnCurrentPage() {
	console.log("Searching internal links on current page: " + location.href);
	
	//search all visible links 
	var links_xpath = "//a[contains(@href,'deletemp3in24hours.com')]",
		allPosts = document.evaluate(links_xpath, document, null, XPathResult.ANY_TYPE, null),
		linkNode = allPosts.iterateNext();
	
	//Cleanup links array
	internalLinks.length = 0;
	
	while (linkNode) {
		console.log("Found internal link: " + linkNode.href);
		//Add link to array, later we will download all files using those URLs
		internalLinks.push(linkNode.href);
		linkNode = allPosts.iterateNext();
	}
}

/**
 * Searches external links on current page.
 * These links will be used by popup script to open them in a separate tabs
 */
function findExternalLinksOnCurrentPage() {
	//Cleanup links array
	externalLinks.length = 0;
	for (var i = 0; i < externallSites.length; i++) {
		  site = externallSites[i];
		  var links_xpath = "//a[contains(@href,'" + site +"')]",
			allLinks = document.evaluate(links_xpath, document, null, XPathResult.ANY_TYPE, null),
			linkNode = allLinks.iterateNext();

			while (linkNode) {
				console.log("Found external link: " + linkNode.href);
				externalLinks.push(linkNode.href);
				linkNode = allLinks.iterateNext();
		}
	}
}

/**
 * Processes current page by clicking all Thanks buttons, reloading page and searching of all internal links on current page
 * 
 * @param requestMsg - message will be sent back to popup script
 */
function processPage(requestMsg) {
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
		    		
		   			//NOTE: After parsing the response text into XML document no exceptions occured, 
		   			//but we were unable to find any links by using document.evaluate() method,
		   			//since the retrieved document is not a valid XML document
		   			//So, as a current solution we can append a new body element to the current page
		   			//and process the document - now it will contain the updated content 
		   			//after all Thanks buttons were "clicked" - all hidden links now became visible
		    			
		   			/*var srvResponse = null;
		   			try {
		  				var parser = new DOMParser();
		   				srvResponse = parser.parseFromString(srvResponseText, "application/xhtml+xml");
		   			} catch(err){
		   				console.log("There was a problem parsing the xml:\n" + err.message);
		   			}*/
		   			
		   			//Retrieve page
		   			var srvResponseText = xmlHttp.responseText;
		   			var tempBody = document.createElement('body');
		   			tempBody.setAttribute("id", "reloaded");
		   			tempBody.innerHTML = srvResponseText;//.replace(/<script(.|\s)*?\/script>/g, '');
		   			document.body = tempBody;
		   			
		   			//First search for hidden links again to be sure all Thanks buttons were processed
		   			findPostsWithHiddenLinksOnCurrentPage();
		   			
		   			//Now extract all internal links 
		   			findInternalLinksOnCurrentPage();
		   			
		   			//Send updated links data to popup
					chrome.runtime.sendMessage({answerMsg: requestMsg, 
												postsWithHiddenLinksMsg: thanksLinks.length,
												internalLinksMsg: internalLinks});
				    }
				}
			};
		    xmlHttp.send(null);
		}, 3000);
}

/**
 * Hits all Thanks URL - this will make hidden links visible
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
						console.log("Link hitted: " + thanksLinks[i]);
					}
				}
			};
			console.log("Hitting link: " + thanksLinks[i]);
			xmlHttp.send(null);
		}
		
		//Perform cleanup
		thanksLinks.length = 0;
	}
}

/**
 * Gets a number of pages for current artist
 */
function getArtistPagesNumber() {
	//debugger;
	//search pages element on current page 
	var pages_xpath = "/html/body/div/div/div/table[4]/tbody/tr/td[2]/div/table/tbody/tr/td",
		allPages = document.evaluate(pages_xpath, document, null, XPathResult.ANY_TYPE, null),
		pageNode = allPages.iterateNext();
	
	while (pageNode) {
		var currentPageStr = pageNode.innerText.replace(/Страница /g, '');  
		var pos = currentPageStr.indexOf(" ");
		currentPageStr = currentPageStr.substring(0, pos);
		currentPage = parseInt(currentPageStr, 10);
		
		var regex = new RegExp("Страница " + currentPage + " из ", "g");
		var pagesCnt = pageNode.innerText.replace(regex, '');
		pagesNumber = parseInt(pagesCnt, 10);
		
		break;
	}
	
	console.log("Current page: " + currentPage);
	console.log("Found pages: " + pagesNumber);
}

//TODO Finish this
function getArrayOfLinksToArtistPages() {
	var links = [location.href];
	console.log("All pages:");
	for (var i=2; i <= pagesNumber; i++) {
		var pageUrl = location.href;
		pageUrl = pageUrl.replace(/.html/g, "-" + i + ".html");
		console.log(pageUrl);
	}
}

//Listens to income messages
chrome.runtime.onMessage.addListener(
	function(request, sender, sendMessage) {
		var requestMsg = request.message;
		console.log("Content-script has received a message: " + requestMsg);
		
		//Handle INIT_DATA_MSG request
		if (requestMsg == INIT_DATA_MSG) {
			getInitData();
			//Send initial data to popup
			chrome.runtime.sendMessage({answerMsg: requestMsg, 
										loginMsg: login, 
										profileLinkMsg: profileLink, 
										artistMsg: artist,
										postsWithHiddenLinksMsg: thanksLinks.length,
										internalLinksMsg: internalLinks,
										externalLinksMsg: externalLinks});
		}
		//Handle SAY_THANKS_MSG data request
		if (requestMsg == SAY_THANKS_MSG) {
			//Respond to popup
			chrome.runtime.sendMessage({answerMsg: PROCESSING_INTERNAL_MSG});
			//Process current page
			processPage(requestMsg);
		}
});