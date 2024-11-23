let currentUrl = document.URL; // 

// content.js
let currentExchangeRate = null;

async function initializeExchangeRate() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getExchangeRate' });
    currentExchangeRate = response.rate;
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    currentExchangeRate = 4360; // Fallback to default rate
  }
}

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
  return current.parentElement;
}

function isCOPAmount(text) {
  // First check if it's USD
  const usdIndicators = ['usd', 'dollar', 'dollars', 'us$', 'u.s.', 'USD'];
  const isUSD = usdIndicators.some(indicator => 
    text.toLowerCase().includes(indicator)
  );

  if (isUSD) {
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

  const isCOP = (hasIndicator || colombianFormat.test(text) || internationalFormat.test(text));
  
  return isCOP;
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

function processTextNode(node) {
  const text = node.textContent;
  if (text === " $165,000,000 ") {
    console.log('process text node: ', text) // COP $770,000
    console.log('isCOPAmount: ', isCOPAmount(text))
  }

  if (!isCOPAmount(text)) return;
  const copAmount = parseCOPAmount(text);
  console.log('copamt: ', text, isCOPAmount(text), copAmount)
  if (!copAmount) return;

  // Find the price container
  const container = findPriceContainer(node);
  console.log('container:', container)
  if (!container) { 
    console.log('price container not found'); // should never get here
  }

  // instead of price container check sibling DOMs for prices

  // First check if there's an existing USD price
  // if (hasExistingUSDPrice(container)) {
  //     highlightExistingUSDPrice(container);
  //     return;
  // }

  // Only proceed with conversion if there's no existing USD price
  const usdAmount = convertCOPtoUSD(copAmount);
  console.log('usdAmt:', usdAmount);
  if (usdAmount >= 1) {
    // Check if conversion already exists
    console.log('container:', container)
    if (container.querySelector('.cop-usd-conversion')) { console.log('existing .cop-usd-conversion'); return };

    // Add the conversion as the last child of the container
    container.appendChild(createUSDElement(usdAmount));
  }
}

function traverseDOM(node) {
  // console.log('currentURL: ', currentUrl);
  if (node.nodeType === Node.TEXT_NODE) {
    processTextNode(node);
    return;
  }
  
  if (node.tagName === 'SPAN' && node.classList.contains('cop-usd-conversion')) {
    console.log('cop-usd-conversion found, return')
    return;
  }

  for (const child of node.childNodes) {
    traverseDOM(child);
  }
}

(async function() {
  await initializeExchangeRate();

  // Initial conversion
  traverseDOM(document.body);

  // Watch for dynamic content changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          traverseDOM(node);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();