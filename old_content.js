// content.js
const CONVERSION_RATE = 4360; // COP to USD rate (you'll want to update this or fetch it dynamically)

function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0, // Changed from 2 to 0
    maximumFractionDigits: 0  // Changed from 2 to 0
  }).format(amount);
}

function parseCOPAmount(text) {
  // Remove any currency symbols, text, and whitespace
  let cleanText = text.replace(/[^0-9.,]/g, '')
    .trim();

  // Handle Colombian format (dots for thousands)
  if (cleanText.includes('.') && !cleanText.includes(',')) {
    cleanText = cleanText.replace(/\./g, '');
  }
  
  // Handle international format (commas for thousands)
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
  span.textContent = ` (${formatUSD(usdAmount)})`;
  span.style.color = '#2E7D32';
  span.style.fontWeight = 'bold';
  return span;
}

function isCOPAmount(text) {
  // Check for explicit COP mentions
  const copIndicators = ['cop', 'peso', 'pesos', '$', 'COP'];
  const hasIndicator = copIndicators.some(indicator => 
    text.toLowerCase().includes(indicator)
  );

  // Look for Colombian number format patterns
  const colombianFormat = /\d{1,3}(?:\.\d{3})+(?!\d)/;
  const internationalFormat = /\d{1,3}(?:,\d{3})+(?!\d)/;
  
  // Large numbers (typically property prices are in millions of pesos)
  const hasLargeNumber = parseCOPAmount(text) >= 1000000;

  return (hasIndicator || colombianFormat.test(text) || internationalFormat.test(text)) && hasLargeNumber;
}

function processTextNode(node) {
  const text = node.textContent;
  if (!isCOPAmount(text)) return;

  const copAmount = parseCOPAmount(text);
  if (!copAmount) return;

  const usdAmount = convertCOPtoUSD(copAmount);
  
  // Only proceed if we have a reasonable USD amount
  if (usdAmount >= 1) {
    const parent = node.parentElement;
    // Don't add conversion if it's already there
    if (!parent.textContent.includes('USD')) {
      parent.appendChild(createUSDElement(usdAmount));
    }
  }
}

function traverseDOM(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    processTextNode(node);
    return;
  }
  
  // Skip if this is a USD conversion we added
  if (node.tagName === 'SPAN' && node.textContent.includes('USD')) {
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
