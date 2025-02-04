let currentUrl = document.URL; // 
let pageType = null; // these will be determined by the url
let priceFn = null;

let currentExchangeRate = null;
let currency = null;

// util.js
let convertArea = null;

/* initial exchange rate fetching */
async function getExchangeRate() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getExchangeRate' });
    console.log('EXCHANGE RATE: ', response);
    currentExchangeRate = response.rate;
    currency = response.currency;
    return response.rate
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    currentExchangeRate = 4360; // Fallback to default rate
  }
}

// Listen for currency changes from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CURRENCY_CHANGED') {
    getExchangeRate().then(res => {
      priceFn(document.body, pageType);
    }); // Fetch new rate when currency changes
    console.log('exchange rate: ', currentExchangeRate)
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

function convertCOPtoBTC(copAmt) {
  return (copAmt / currentExchangeRate).toFixed(3);
}

function convertCOPtoUSD(copAmount) {
  return Math.round(copAmount / currentExchangeRate);
}

function createBTCElement(btcAmt) {
  const span = document.createElement('span');
  span.textContent = ` (${btcAmt} BTC)`;
  span.style.color = '#F7931A';
  span.style.fontWeight = 'bold';
  span.className = 'cop-btc-conversion';
  return span;
}

function createUSDElement(usdAmount) {
  const span = document.createElement('span');
  span.textContent = ` (${formatUSD(usdAmount)} USD)`;
  span.style.color = '#2E7D32';
  span.style.fontWeight = 'bold';
  span.className = 'cop-usd-conversion';
  return span;
}

function DOMConvertCurrency(container, priceData) {
  if (currency === 'USD') { 
    let usdAmount = convertCOPtoUSD(priceData.value);
    parseUtils.removeSpans(container, 'cop-btc-conversion')
    if (container.querySelector('.cop-usd-conversion') === null) {
      container.appendChild(createUSDElement(usdAmount));
    }
  } else if (currency === 'BTC') {
    console.log('currency is btc, priceData: ', priceData)
    let btcAmt = convertCOPtoBTC(priceData.value);
    parseUtils.removeSpans(container, 'cop-usd-conversion')
    if (container.querySelector('.cop-btc-conversion') === null) {
      container.appendChild(createBTCElement(btcAmt))
    }
  }
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

/** optionally turn this off--use our own conversion rate */
function highlightExistingUSDPrice(container) {
  // const usdElement = container.querySelector('.displayConsumerPrice');
  // if (usdElement && !usdElement.classList.contains('usd-price-highlighted')) {
  //     usdElement.style.color = '#2E7D32';
  //     usdElement.style.fontWeight = 'bold';
  //     usdElement.classList.add('usd-price-highlighted');
  // }
}

// substitute listing prices for following sites
const listingPriceFn = {
  'primaverarealtymedellin': (rootNode, pageType = 'LISTINGS') => {
    console.log('PRIMAVERA, pageType:', pageType, 'currency: ', currency);

    // TEST UTILS FN
    // convertArea = areaUtils.convertArea;
    // console.log('sq area test')
    // const areaInSqMeters = 100;
    // const areaInSqFeet = convertArea(areaInSqMeters);
    // console.log(`${areaInSqMeters} sq meters = ${areaInSqFeet} sq feet`);

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

      DOMConvertCurrency(container, priceData)
      
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
  
      DOMConvertCurrency(container, priceData);

      return priceData;
    });
  },
  'nomadbarrio': (rootNode, pageType = 'LISTINGS') => {
    const priceContainers = Array.from(rootNode.querySelectorAll('.bubble-element.Text'))
      .filter(el => {
        const text = el.textContent.trim();
        return text.startsWith('$') && !text.includes('US$') && !text.includes('(');
      });

    if (!priceContainers.length) return [];

    return Array.from(priceContainers).map(container => {
      const priceData = {
        symbol: '',
        formattedValue: '',
        value: 0,
        currency: '',
        raw: ''
      };
  
      const valueElement = container.textContent.trim();
      if (valueElement) {
        priceData.raw = valueElement;

        const match = valueElement.match(/\s*\$?([\d.,]+)/); // nomadbarrio COP prices don't have 'COP' prefix
        if (match) { 
          priceData.currency = 'COP';
          priceData.formattedValue = valueElement
          priceData.value = parseFloat(match[1].replace(/[.,]/g, ''));
        }
      }
      DOMConvertCurrency(container, priceData);
      return priceData;
    });
  }
}

/* A page is either the home page, the listings page or is the individual property page 
  HOME
  LISTINGS
  PROPERTY
*/
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
  'casacol': (pathName) => pathName === 'properties' ? 'PROPERTY' : 'LISTINGS',
  'nomadbarrio': (pathName) => 'LISTINGS',
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

  pageType = pageTypeFn[baseUrl](pathName);
  //console.log('loading listingPriceFn')
  priceFn = listingPriceFn[baseUrl];
  let priceData = priceFn(document.body, pageType);
  
  // Watch for dynamic content changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // mutation.addedNodes.forEach((node) => {
      //   if (node.nodeType === Node.ELEMENT_NODE) {
      //     priceFn(node, pageType);
      //   }
      // });
      // everytime a mutation is detected, run the price fn on the entire document
      priceData = priceFn(document.body, pageType);
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();

// testing use of fn in utils.js
(() => {
  // document.addEventListener('DOMContentLoaded', () => {
    // convertArea = areaUtils.convertArea;
    // console.log('DOMCONTENTLOADED')
    // const areaInSqMeters = 100;
    // const areaInSqFeet = convertArea(areaInSqMeters);
    // console.log(`${areaInSqMeters} sq meters = ${areaInSqFeet} sq feet`);
  // });
})();