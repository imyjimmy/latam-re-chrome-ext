const EXCHANGE_API_KEY = '2a6acba9e0132a19904dc0c2'; // Get from https://www.exchangerate-api.com/
const CACHE_DURATION = 86400000; // 24 hours in milliseconds
const DEFAULT_RATE = 4360; // Fallback rate if API fails

const DEFAULT_RATES = {
  'USD': 4360,
  'BTC': 96022,
};

const BASE_CURRENCY = 'COP';

// no access to urls in background.js without tabs permission
// let currentUrl = document.URL; // 

// const baseCurrencyForBaseURL = {
//   'primaverarealtymedellin': 'COP',
//   'casacol': 'COP',
// }

async function fetchUsdCopRate() {
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
				exchangeRate_USD: {
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

async function fetchBtcUsdRate() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const data = await response.json();
    return data.bitcoin?.usd || DEFAULT_RATES.BTC;
  } catch (error) {
    console.error('Error fetching BTC/USD rate:', error);
    return DEFAULT_RATES.BTC;
  }
}

async function fetchExchangeRate() {
	const currency = await chrome.storage.sync.get('selectedCurrency');
	const usdCopRate = await fetchUsdCopRate();

  if (currency.selectedCurrency === 'BTC') {
    const btcUsdRate = await fetchBtcUsdRate();
    const rate = btcUsdRate * usdCopRate; 
    /* 
     96,000 usd / btc * 4360 cop / usd
    usd   cop
    --- * ---
    btc   usd =  cop / btc
    therefore 1 / (cop/btc) = btc / cop
    */
    const timestamp = Date.now();
    
    chrome.storage.local.set({
      [`exchangeRate_BTC`]: { rate, timestamp }
    });
    
    return rate;
  }

  return usdCopRate;
}

async function getExchangeRate(currency = 'USD') {
  // console.log('BG, getExchangeRate: ', currency);
	// Check storage for cached rate
	const data = await chrome.storage.local.get(`exchangeRate_${currency}`);
	const cached = data[`exchangeRate_${currency}`];
	
	if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
		return cached.rate;
	}
	
	// Fetch new rate if cache is empty or expired
	return await fetchExchangeRate();
}

// Listen for installation or update
chrome.runtime.onInstalled.addListener(() => {
	// Set default currency
	chrome.storage.sync.get('selectedCurrency', function(data) {
		if (!data.selectedCurrency) {
			chrome.storage.sync.set({
				selectedCurrency: 'USD'
			});
		}
	});
});

/* Listen for messages from popup */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getExchangeRate') {
    chrome.storage.sync.get('selectedCurrency', async function(data) {
      const currency = data.selectedCurrency || 'USD';
      const rate = await getExchangeRate(currency);
      sendResponse({ rate, currency });
    });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('selectedCurrency', function(data) {
    if (!data.selectedCurrency) {
      chrome.storage.sync.set({ selectedCurrency: 'USD' });
    }
  });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === 'CURRENCY_CHANGED') {
		console.log('Background script received currency change:', message.currency);
		
		// Here you can add any background processing needed
		// For example, updating badge text
		chrome.action.setBadgeText({ text: message.currency });
		
    chrome.storage.sync.set({ selectedCurrency: message.currency });

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'CURRENCY_CHANGED', currency: message.currency });
    });

		// Or trigger other background operations
		//updateCurrencySettings(message.currency);
    fetchExchangeRate(message.currency);
	}
});

function updateCurrencySettings(currency) {
	// Example function to handle currency updates
	// This could include:
	// - Updating extension state
	// - Making API calls
	// - Updating extension badge or icon
	// - Triggering notifications
	console.log('Updating currency settings to:', currency);
	//   BASE_CURRENCY = currency
}

// Fetch rate when extension loads
fetchExchangeRate('USD');