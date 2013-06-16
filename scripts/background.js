/**
* background.js
* 
* Background page script
* 
* @author Leonid Yakubov
* 
*/

//Neformat forum URL
var forumUrl = "neformat.com.ua/forum/";
//Neformat sub-forums
var	distorted = "distorted-unit",
	emo = "emo",
	metalcore = "metalcore",
	hardcore = "hardcore",
	crust = "crust",
	thrash_zone = "thrash-zone",
	grind = "grind",
	punk_rock = "punk-rock",
	rock = "rock",
	psychedelic_experience = "psychedelic-experience",
	classic_rock = "classic-rock",
	post_punk_gothic = "post-punk-gothic",
	rock_n_roll = "rock-n-roll",
	metal = "metal",
	electronic = "electronic",
	dark_electronics = "dark-electronics",
	intelligent_electronics = "intelligent-electronics",
	downtempo = "downtempo",
	hardcore_techno = "hardcore-techno",
	bass_based_breakbeat_electronics = "bass-based-breakbeat-electronics",
	jazz_blues = "jazz-blues",
	hip_hop = "hip-hop",
	instrumental_hip_hop = "instrumental-hip-hop",
	other = "other",
	folk_country_ethnic = "folk-country-ethnic",
	classical = "classical",
	ska_reggae = "ska-reggae",
	cabaret = "cabaret",
	alternative = "alternative";

var subForums = [distorted, emo, metalcore, hardcore, crust, thrash_zone, 
                 grind, punk_rock, rock, psychedelic_experience, 
                 classic_rock, post_punk_gothic, rock_n_roll, metal,
                 electronic, dark_electronics, intelligent_electronics,
                 downtempo, hardcore_techno, bass_based_breakbeat_electronics,
                 jazz_blues, hip_hop, instrumental_hip_hop, other,
                 folk_country_ethnic, classical, ska_reggae, cabaret, alternative];

console.log("Background initialized");


/**
 * Checks if this is a correct artist page URL
 * e.g. http://www.neformat.com.ua/forum/distorted-unit/5967-kyuss.html
 * 
 * @param url - url of a visited page
 * @returns {Boolean}
 */
function isAValidUrl(url) {
	//TODO Replace this mess with a correct artist page URL pattern
	//Check first if this is a neformat forum page
	if (url.indexOf(forumUrl) < 0) {
		console.log("This is not a Neformat forum page");
		return false;
	}
	
	//Get URL suffix after forum part
	//http://www.neformat.com.ua/forum/distorted-unit/917-isis.html
	//Here distorted-unit/917-isis.html is the suffix
	var urlSuffix = url.substring(url.indexOf(forumUrl) + 1); // +1 "/" symbol
	
	//Check if suffix is not empty and ends with html extension
	var isCorrectUrlSuffix = urlSuffix.length > 0 && (urlSuffix.indexOf("html") > -1);
	
	//Check if this is a tags page
	//tags page e.g. http://www.neformat.com.ua/forum/tags/post-metal.html
	var tagsPattern = /tags/i;
	var isTagsPage = tagsPattern.test(urlSuffix);

	//Check if this is not an index page
	//index page e.g. http://www.neformat.com.ua/forum/distorted-unit/index3.html
	var indexPattern = /index(\d+)/i;
	var isIndexPage = indexPattern.test(urlSuffix);
	
	//Check if url suffix is correct and this is not an index or tags page 
	var isCorrectPage = isCorrectUrlSuffix && !isTagsPage && !isIndexPage;
	
	if (!isCorrectPage) {
		return false;
	}
	
	//Finally, traverse through all allowed sub-forums and check if url contains any of them
	for (var i=0; i<subForums.length; i++) {
		if (urlSuffix.indexOf(subForums[i]) > -1) {
			console.log("A valid artist page detected!");
			return true;
		}
	}
	
	console.log("This is not a valid artist page");
	
	return false;
}

/**
 * Sets up an page action and injects content script into a given tab page
 * 
 * @param tabId
 * @param tab
 */
function setUpPageAction(tabId, tab) {
	//Show extension icon
	chrome.pageAction.show(tabId);
	console.log("Set up an icon for the tab with id " + tabId);
	
	//Insert content script into page
	chrome.tabs.executeScript(tabId, {file: "scripts/content.js"});
	console.log("Injected content script into a page with id " + tabId);
}

//Listens for any changes to the URL of any tab
chrome.tabs.onUpdated.addListener(
		function (tabId, changeInfo, tab){
			if(changeInfo.status == 'complete'){
				console.log("=======================");
				console.log("Page loaded, URL: " + tab.url);
				console.log("tabId: " + tabId);
				
				//Check if the page URL is correct artist URL
				if (isAValidUrl(tab.url)) {
					setUpPageAction(tabId, tab);					
				}
			}
});