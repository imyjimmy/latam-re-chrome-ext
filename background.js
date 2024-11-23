// chrome.action.onClicked.addListener((tab) => {
// 	if (tab.url.includes('primaverarealtymedellin.com')) {
// 	  chrome.scripting.executeScript({
// 		target: { tabId: tab.id },
// 		function: scrapeListingInfo
// 	  });
// 	}
//   });

// background.js - Modified to open new tab instead of popup
chrome.action.onClicked.addListener((tab) => {
	chrome.tabs.create({
	  url: 'listing.html'
	});
  });
  