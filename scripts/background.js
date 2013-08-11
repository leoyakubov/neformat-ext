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
 * @param url - URL of the visited page
 * @returns {Boolean}
 */
function isAValidUrl(url) {
	//Check first if this is a neformat forum page
	if (url.indexOf(forumUrl) < 0) {
		console.log("This is not a Neformat forum page");
		return false;
	}
	
	//Get URL suffix after forum part
	//http://www.neformat.com.ua/forum/distorted-unit/917-isis.html
	//Here distorted-unit/917-isis.html is the suffix
	var urlSuffix = url.substring(url.indexOf(forumUrl) + 1); // +1 "/" symbol
	
	//Finally, traverse through all allowed sub-forums and check if the page URL contains any of them
	for (var i=0; i<subForums.length; i++) {
		if (urlSuffix.indexOf(subForums[i]) > -1) {
			//Artist URL pattern
			var pattern = /(\d+)(\-)([\-\w]+)([\-?\d]*)(.html)/i;
			var isCorrectArtistPage = pattern.test(urlSuffix);
			
			if (isCorrectArtistPage) {				
				console.log("A valid artist page detected!");
				return true;
			}
			
			//Break even if suffix has not matched as a part of a valid artist URL
			break; 
		}
	}
	console.log("This is not a valid artist page");
	
	return false;
}

/**
 * Sets up an page action and injects content script into a given tab page
 * 
 * @param tabId
 */
function setUpPageAction(tabId) {
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
				
				if (isAValidUrl(tab.url)) {
					setUpPageAction(tabId);					
				}
			}
});