let currentUrl = document.URL; // 

// content.js
let currentExchangeRate = null;

/* initial exchange rate fetching */
async function getExchangeRate() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getExchangeRate' });
    console.log('EXCHANGE RATE: ', response.rate);
    currentExchangeRate = response.rate;
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    currentExchangeRate = 4360; // Fallback to default rate
  }
}

// Listen for currency changes from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CURRENCY_CHANGED') {
    console.log('CONTENT.JS: currency changed')
    getExchangeRate(); // Fetch new rate when currency changes
  }
});

function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function parseCOPAmount(text) {
  let cleanText = text.replace(/[^0-9.,]/g, '')
    .trim();

  if (cleanText.includes('.') && !cleanText.includes(',')) {
    cleanText = cleanText.replace(/\./g, '');
  }
  
  if (cleanText.includes(',')) {
    cleanText = cleanText.replace(/,/g, '');
  }

  const amount = parseFloat(cleanText);
  return isNaN(amount) ? null : amount;
}

function convertCOPtoUSD(copAmount) {
  return Math.round(copAmount / currentExchangeRate);
}

function createUSDElement(usdAmount) {
  const span = document.createElement('span');
  span.textContent = ` (${formatUSD(usdAmount)} USD)`;
  span.style.color = '#2E7D32';
  span.style.fontWeight = 'bold';
  span.className = 'cop-usd-conversion';
  return span;
}

function findPriceContainer(node) {
  // Walk up the DOM tree to find a container that has both price and currency
  let current = node;
  let levelsUp = 0;
  const MAX_LEVELS = 3;

  while (current && current.parentElement && levelsUp < MAX_LEVELS) {
    const parent = current.parentElement;
    const text = parent.textContent.toLowerCase();
    
    // Check if parent contains both a number and currency indicator
    if (text.match(/\d/) && (text.includes('cop') || text.includes('peso'))) {
      return parent;
    }
    current = parent;
    levelsUp++;
  }
  return node.parentElement;
}

function isCOPAmount(text) {
  // First check if it's USD
  const usdIndicators = ['usd', 'dollar', 'dollars', 'us$', 'u.s.', 'USD'];
  const isUSD = usdIndicators.some(indicator => 
    text.toLowerCase().includes(indicator)
  );

  const sqFtIndicator = ['sq ft'];
  const isSqFt = sqFtIndicator.some(indicator => text.toLowerCase().includes(indicator));

  if (isUSD || isSqFt) {
    return false;
  }

  // Common non-monetary contexts to exclude
  const excludePatterns = [
    /nit:\s*\d/i,           // NIT numbers
    /\d+\s*#\s*\d/,         // Address formats
    /@/,                    // Emails
    /tel[éef]fono/i,        // Phone numbers
    /\d{3,4}\s*-\s*\d/      // Various ID formats
  ];

  if (excludePatterns.some(pattern => pattern.test(text))) {
    return false;
  }

  // More precise COP indicator matching using word boundaries
  const copIndicators = [
    /\bcop\b/i,
    /\bpeso\b/i,
    /\bpesos\b/i,
    /\$/, 
    /\bCOP\b/
  ];
  
  const hasIndicator = copIndicators.some(pattern => 
    pattern.test(text)
  );

  // Updated regex to better match monetary amounts
  const colombianFormat = /(?:^\$?\s*|\s+)\d{1,3}(?:\.\d{3}){1,3}(?!\d)/;
  const internationalFormat = /(?:^\$?\s*|\s+)\d{1,3}(?:,\d{3}){1,3}(?!\d)/;

  return hasIndicator && (colombianFormat.test(text) || internationalFormat.test(text));
}

// function hasExistingUSDPrice(container) {
  // Look for elements containing USD prices
  // console.log('USD container: ', container);
  // const usdElement = container.querySelector('.displayConsumerPrice');
  // return usdElement && usdElement.textContent.includes('USD');
// }

/** optionally turn this off--use our own conversion rate */
function highlightExistingUSDPrice(container) {
  // const usdElement = container.querySelector('.displayConsumerPrice');
  // if (usdElement && !usdElement.classList.contains('usd-price-highlighted')) {
  //     usdElement.style.color = '#2E7D32';
  //     usdElement.style.fontWeight = 'bold';
  //     usdElement.classList.add('usd-price-highlighted');
  // }
}

// claude dec 2, 2024
// primaverarealty
function convertListingPrices(rootNode) {
  const priceContainers = rootNode.querySelectorAll('.wpsight-listing-price');
  if (!priceContainers.length) return [];

  return Array.from(priceContainers).map(container => {
    const priceData = {
      symbol: '',
      formattedValue: '',
      value: 0,
      currency: '',
      raw: ''
    };
    
    priceData.raw = container.textContent.trim();

    const symbolElement = container.querySelector('.listing-price-symbol');
    if (symbolElement) {
      priceData.symbol = symbolElement.textContent?.trim() || 
                        symbolElement.innerText?.trim() || 
                        symbolElement.innerHTML?.trim() || '';
    }

    const priceElement = container.querySelector('.listing-price-value');
    if (priceElement) {
      // Try multiple ways to get the formatted text
      priceData.formattedValue = priceElement.childNodes[0]?.nodeValue?.trim() || 
                                priceElement.innerHTML?.trim() ||
                                priceElement.innerText?.trim() ||
                                '';
                                
      // Get the numeric value from the content attribute
      priceData.value = parseFloat(priceElement.getAttribute('content') || '0');
    }

    const currencyMeta = container.querySelector('meta[itemprop="priceCurrency"]');
    if (currencyMeta) {
      priceData.currency = currencyMeta.getAttribute('content') || '';
    }

    let usdAmount = convertCOPtoUSD(priceData.value);
    container.appendChild(createUSDElement(usdAmount));
    return priceData;
  });
}

// substitute listing prices for following sites
const listingPriceFn = {
  'primaverarealtymedellin': (rootNode, pageType = 'LISTINGS') => {
    console.log('pageType:', pageType);

    const priceContainers = rootNode.querySelectorAll('.wpsight-listing-price');
    if (!priceContainers.length) return [];

    return Array.from(priceContainers).map(container => {
      const priceData = {
        symbol: '',
        formattedValue: '',
        value: 0,
        currency: '',
        raw: ''
      };
      
      priceData.raw = container.textContent.trim();

      const symbolElement = container.querySelector('.listing-price-symbol');
      if (symbolElement) {
        priceData.symbol = symbolElement.textContent?.trim() || 
                          symbolElement.innerText?.trim() || 
                          symbolElement.innerHTML?.trim() || '';
      }

      const priceElement = container.querySelector('.listing-price-value');
      if (priceElement) {
        // Try multiple ways to get the formatted text
        priceData.formattedValue = priceElement.childNodes[0]?.nodeValue?.trim() || 
                                  priceElement.innerHTML?.trim() ||
                                  priceElement.innerText?.trim() ||
                                  '';
                                  
        // Get the numeric value from the content attribute
        priceData.value = parseFloat(priceElement.getAttribute('content') || '0');
      }

      const currencyMeta = container.querySelector('meta[itemprop="priceCurrency"]');
      if (currencyMeta) {
        priceData.currency = currencyMeta.getAttribute('content') || '';
      }

      let usdAmount = convertCOPtoUSD(priceData.value);
      container.appendChild(createUSDElement(usdAmount));
      return priceData;
    });
  },
  'casacol': (rootNode, pageType = 'LISTINGS') => {
    console.log('pageType:', pageType);

    const priceContainers = rootNode.querySelectorAll('.component__content--default');
    if (!priceContainers.length) return [];
  
    return Array.from(priceContainers).map(container => {
      const priceData = {
        symbol: '',
        formattedValue: '',
        value: 0,
        currency: '',
        raw: ''
      };
  
      const valueElement = container.querySelector('.component__content-value');
      if (valueElement) {
        const text = Array.from(valueElement.childNodes)
          .filter(node => node.nodeType === 3)
          .map(node => node.nodeValue?.trim())
          .join('');
  
        priceData.raw = text;
        
        // Extract currency and value
        const match = text.match(/(COP)\s*\$?([\d.,]+)/);
        if (match) {
          priceData.currency = match[1];
          priceData.formattedValue = match[2];
          priceData.value = parseFloat(match[2].replace(/[.,]/g, ''));
        }
      }
  
      let usdAmount = convertCOPtoUSD(priceData.value);

      if (container.querySelector('.cop-usd-conversion') === null) {
        container.appendChild(createUSDElement(usdAmount));
      }
      return priceData;
    });
  }
}

/* A page either has listings or is the individual property page */
const pageTypeFn = { 
  'primaverarealtymedellin': (pathName) => { 
    // pathName === 'property' ? 'PROPERTY': 'LISTINGS'
    switch (pathName) {
      case 'property':
        return 'PROPERTY'
      case '':
        return 'HOME'
      default:
        return 'LISTINGS'
    }
  },
  'casacol': (pathName) => pathName === 'properties' ? 'PROPERTY' : 'LISTINGS'
}

function getBaseURL(url) {
  //return url.split("//")[1].split(".com")[0];
  return url.replace(/^https?:\/\//, '')  // Remove protocol
          .split('/')[0]                  // Remove paths
          .split('.')                     // Split by dots
          .slice(-2)[0];
}

function getUrlProperties(url) {
  let splitUrl = url.replace(/^https?:\/\//, '').split('/')

  return { 
    baseUrl: splitUrl[0].split('.').slice(-2)[0], 
    pathName: splitUrl[1], // properties or property
  }
}

(async function() {
  await getExchangeRate();

  let { baseUrl, pathName } = getUrlProperties(currentUrl)
  
  console.log('Base Url:', baseUrl);

  let pageType = pageTypeFn[baseUrl](pathName);
  const priceFn = listingPriceFn[baseUrl];
  let priceData = priceFn(document.body, pageType);
  console.log(priceData);
  
  // Watch for dynamic content changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          priceFn(node, pageType);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();