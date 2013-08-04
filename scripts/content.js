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
 	linksToArtistPages = [],
	artistPagesDocuments = [];
//Messages
var INIT_DATA_MSG = "initData",
	PROCESSING_INTERNAL_MSG = "processingInternal",
	SAY_THANKS_MSG = "sayThanks",
	ALL_PAGES_DATA_MSG = "allPagesData";
//External sites (file sharing)
var mediafire = "mediafire.com",
	rapidshare = "rapidshare.com",
	ifolder = "ifolder.ru",
	letitbit = "letitbit.net",
	depositfiles = "depositfiles.com";
var	externalSites = [mediafire, rapidshare, ifolder, letitbit, depositfiles];
	
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
	//This if clause is separate from previous one as both login and links data should be gathered 
	//when the content script is initialized for the first time (just after injection by background script)
	if (isUserLoggedIn()) {
		//debugger;
		//Search posts containing hidden links on current page
		if (thanksLinks.length < 1) {
			//Cleanup links array
			//thanksLinks.length = 0;
			thanksLinks = findPostsWithHiddenLinksOnPage(document);
		}
		
		//Search visible internal links
		if (internalLinks.length < 1) {
			internalLinks = findInternalLinksOnPage(document);			
		}
		
		//Search external links
		if (externalLinks.length < 1) {
			externalLinks = findExternalLinksOnPage(document);
		}
		
		if (numberOfPages == 0) {
			//Update pages counter and get current page number
			getNumberOfArtistPages();
			//Get array of links
			getArrayOfLinksToArtistPages();
		}
		
		//Passe all pages in background
		//The found links will be stored in content script, and will be sent to popup script on demand
		parseAllArtistPages();
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
	
	console.log("\tArtist: " + artist);
}

/**
 * Searches posts containing hidden links and extracts URL of THanks button for every such post
 * These URLs will be hit by content script. Once thanks button is pressed and the page reloaded, the hidden links become visible
 */
function findPostsWithHiddenLinksOnPage(doc) {
	console.log("Searching posts with hidden links on page: " + doc.URL);
	
	//search posts with hidden links
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
 */
function findInternalLinksOnPage(doc) {
	console.log("Searching internal links on page: " + doc.URL);
	
	//search all visible links 
	var links_xpath = "//a[contains(@href,'deletemp3in24hours.com')]",
		allPosts = doc.evaluate(links_xpath, doc, null, XPathResult.ANY_TYPE, null),
		linkNode = allPosts.iterateNext();
	
	var links = [];
	while (linkNode) {
		console.log("\tFound internal link: " + linkNode.href);
		//Add link to array, later we will download all files using those URLs
		links.push(linkNode.href);
		linkNode = allPosts.iterateNext();
	}
	
	return links;
}

/**
 * Searches external links on current page.
 * These links will be used by popup script to open them in a separate tabs
 */
function findExternalLinksOnPage(doc) {
	console.log("Searching external links on page: " + doc.URL);

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
 * Gets a number of pages for current artist
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


function parseAllArtistPages() {
	//Get pages (hit urls) only if the number of pages is more then 1.
	//If there is only one page - we've already parsed it. 
	if (numberOfPages > 1) {
		console.log("Parsing all pages... ");
		var pagesCounter = numberOfPages;
		var xmlHttp = null;
		for (var i=0; i < linksToArtistPages.length; i++) {
			xmlHttp = new XMLHttpRequest();
			xmlHttp.open("GET", linksToArtistPages[i], true ); //true - async
			xmlHttp.onreadystatechange = function() {
				if (xmlHttp.readyState == 4) {
					if(xmlHttp.status == 200) {
						console.log("Responce from server received");
						
						//debugger;
						//TODO: parse anf log page URL
						
						//Retrieve page
			   			var srvResponseText = xmlHttp.responseText;
			   			
			   			//Create new document
			   			var doc = document.implementation.createHTMLDocument('title');
			   		    doc.documentElement.innerHTML = srvResponseText;
			   		    
			   		    //Parse page:
			   		    //1) Get links to posts with hidden music
			   		    allPagesThanksLinks = findPostsWithHiddenLinksOnPage(doc);
			   		    
			   		    //2) Get external links
			   		    allPagesInternalLinks = findInternalLinksOnPage(doc);		
			   		    
			   		    //3) Get internal links
			   		    allPagesExternalLinks = findExternalLinksOnPage(doc);
			   		    
			   		    //Add page to global array
			   		    artistPagesDocuments.push(doc);
			   		    console.log("\tpagesCounter: " + pagesCounter);
			   		    pagesCounter--;
			   		    
			   		    //Filter links
			   		    //allPagesThanksLinks = allPagesThanksLinks.filter(onlyUnique);
			   		    //allPagesInternalLinks = allPagesInternalLinks.filter(onlyUnique);
			   		    //allPagesExternalLinks = allPagesExternalLinks.filter(onlyUnique);
			   		    
			   		    //Once all artist pages were parsed - send data to popup script
			   			if (pagesCounter == 0) {
			   				//Send updated links data to popup
			   				chrome.runtime.sendMessage({answerMsg: ALL_PAGES_DATA_MSG, 
			   					allPagesPostsWithHiddenLinksCountMsg: allPagesThanksLinks.length,
			   					allPagesInternalLinksMsg: allPagesInternalLinks,
			   					allPagesExternalLinksMsg: allPagesExternalLinks,
			   					numberOFPagesMsg: numberOfPages});
			   			}
					}
				}
			};
			console.log("\tParsing page: " + linksToArtistPages[i]);
			xmlHttp.send(null);
		}
		
		//Perform cleanup
		//linksToArtistPages.length = 0;
	}
	
	
	//if (auto_process) -
	//	hit all links to posts
	// re-parse internal links
	// send all internal and external links to popup
}

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
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
										postsWithHiddenLinksCountMsg: thanksLinks.length,
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