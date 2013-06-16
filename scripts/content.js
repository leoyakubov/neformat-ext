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
var thanksLinks = [];
	internalLinks = [];
	externalLinks = [];
//Messages
var INIT_DATA_MSG = "initData",
	SAY_THANKS_MSG = "sayThanks",
	PROCESSING_INTERNAL_MSG = "processingInternal";
	
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
		findExternalLinksOnCurrentPage();		
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
	
	console.log("Login: " + login);
	console.log("Link to profile: " + profileLink);
}

/**
 * Checks if user is currently logged in
 * 
 * @returns {Boolean}
 */
function isUserLoggedIn() {
	if (login == DEFAULT_LOGIN_STR) {
		return false;
	}
	
	return true;
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
		postNode = allPosts.iterateNext();
	
	//Cleanup links array
	internalLinks.length = 0;
	
	while (postNode) {
		console.log("Found link: " + postNode.href);
		//Add link to array, later we will download all files using those URLs
		internalLinks.push(postNode.href);
		postNode = allPosts.iterateNext();
	}
}

/**
 * Searches external links on current page.
 * These links will be used by popup script to open them in a separate tabs
 */
function findExternalLinksOnCurrentPage() {
	//TODO: Add external sites array
	//TODO: Add code
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
		   			//So, as a current solution we can append a new div element to the current page
		   			//and process the document - now it will contain the old content and also
		   			//the new one after all Thanks buttons were "clicked" - all hidden links now became visible
		    			
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
		   			tempBody.setAttribute("id", "reload");
		   			tempBody.innerHTML = srvResponseText;//.replace(/<script(.|\s)*?\/script>/g, '');
		   			document.body = tempBody;
		   			
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
 * Hit all Thanks URL - this will make hidden links visible
 */
function processHiddenLinks() {
	//If found - hit 'em all
	if (thanksLinks.length > 0) {
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
			xmlHttp.send(null);
			
			//Remove link from array. This is needed to update the corresponding element on popup page
			//Ideally, the array at the end should be empty
			var index = thanksLinks.indexOf(thanksLinks[i]);
			thanksLinks.splice(index, 1);
		}
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
										internalLinksMsg: internalLinks});
		}
		//Handle SAY_THANKS_MSG data request
		if (requestMsg == SAY_THANKS_MSG) {
			//Respond to popup
			chrome.runtime.sendMessage({answerMsg: PROCESSING_INTERNAL_MSG});
			//Process current page
			processPage(requestMsg);
		}
});