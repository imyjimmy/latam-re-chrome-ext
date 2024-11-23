let currentUrl = document.URL; // 

const CONVERSION_RATE = 4360;

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
  return Math.round(copAmount / CONVERSION_RATE);
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
  while (current && current.parentElement) {
    const parent = current.parentElement;
    const text = parent.textContent.toLowerCase();
    
    // Check if parent contains both a number and currency indicator
    if (text.match(/\d/) && (text.includes('cop') || text.includes('peso'))) {
      return parent;
    }
    current = parent;
  }
  return null;
}

function isCOPAmount(text) {
  const copIndicators = ['cop', 'peso', 'pesos', '$', 'COP'];
  const hasIndicator = copIndicators.some(indicator => 
    text.toLowerCase().includes(indicator)
  );

  const colombianFormat = /\d{1,3}(?:\.\d{3})+(?!\d)/;
  const internationalFormat = /\d{1,3}(?:,\d{3})+(?!\d)/;
  const hasLargeNumber = parseCOPAmount(text) >= 1000000;

  const isCOP = (hasIndicator || colombianFormat.test(text) || internationalFormat.test(text)) && hasLargeNumber;
  // console.log(`isCOP:${text}, ${isCOP}`)

  return isCOP;
}

function hasExistingUSDPrice(container) {
  // Look for elements containing USD prices
  // console.log('USD container: ', container);
  const usdElement = container.querySelector('.displayConsumerPrice');
  return usdElement && usdElement.textContent.includes('USD');
}

function highlightExistingUSDPrice(container) {
  const usdElement = container.querySelector('.displayConsumerPrice');
  if (usdElement && !usdElement.classList.contains('usd-price-highlighted')) {
      usdElement.style.color = '#2E7D32';
      usdElement.style.fontWeight = 'bold';
      usdElement.classList.add('usd-price-highlighted');
  }
}

function processTextNode(node) {
  const text = node.textContent;
  console.log('process text node: ', text)
  console.log('isCOPAmount: ', isCOPAmount(text))
  if (!isCOPAmount(text)) return;

  const copAmount = parseCOPAmount(text);
  if (!copAmount) return;

  // Find the price container
  const container = findPriceContainer(node);
  if (!container) return;

  // instead of price container check sibling DOMs for prices


  // First check if there's an existing USD price
  if (hasExistingUSDPrice(container)) {
      highlightExistingUSDPrice(container);
      return;
  }

  // Only proceed with conversion if there's no existing USD price
  const usdAmount = convertCOPtoUSD(copAmount);
  if (usdAmount >= 1) {
    // Check if conversion already exists
    if (container.querySelector('.cop-usd-conversion')) return;

    // Add the conversion as the last child of the container
    container.appendChild(createUSDElement(usdAmount));
  }
}

function traverseDOM(node) {
  console.log('currentURL: ', currentUrl);
  if (node.nodeType === Node.TEXT_NODE) {
    processTextNode(node);
    return;
  }
  
  if (node.tagName === 'SPAN' && node.classList.contains('cop-usd-conversion')) {
    return;
  }

  for (const child of node.childNodes) {
    traverseDOM(child);
  }
}

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