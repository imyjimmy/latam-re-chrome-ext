const EXCHANGE_API_KEY = '2a6acba9e0132a19904dc0c2'; // Get from https://www.exchangerate-api.com/
const CACHE_DURATION = 86400000; // 24 hours in milliseconds
const DEFAULT_RATE = 4360; // Fallback rate if API fails

async function fetchExchangeRate() {
	try {
		const response = await fetch(
			`https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/pair/USD/COP`
		);
		const data = await response.json();
		
		if (data.result === 'success') {
			const rate = data.conversion_rate;
			const timestamp = Date.now();
			
			// Store in Chrome's storage
			chrome.storage.local.set({
				exchangeRate: {
					rate: rate,
					timestamp: timestamp
				}
			});
			
			return rate;
		}
	} catch (error) {
		console.error('Error fetching exchange rate:', error);
	}
	
	// Return default rate if API call fails
	return DEFAULT_RATE;
}

async function getExchangeRate() {
	// Check storage for cached rate
	const data = await chrome.storage.local.get('exchangeRate');
	const cached = data.exchangeRate;
	
	if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
		return cached.rate;
	}
	
	// Fetch new rate if cache is empty or expired
	return await fetchExchangeRate();
}

// Listen for requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'getExchangeRate') {
		getExchangeRate().then(rate => sendResponse({ rate: rate }));
		return true; // Required for async response
	}
});

// Listen for requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'getExchangeRate') {
		getExchangeRate().then(rate => sendResponse({ rate: rate }));
		return true; // Required for async response
	}
});

// Fetch rate when extension loads
fetchExchangeRate();