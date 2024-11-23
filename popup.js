document.addEventListener('DOMContentLoaded', function() {
    // Load saved preference
    chrome.storage.sync.get('selectedCurrency', function(data) {
      const currency = data.selectedCurrency || 'USD';
      document.querySelector(`input[value="${currency}"]`).checked = true;
    });
  
    // Add change handlers for radio buttons
    document.querySelectorAll('input[name="currency"]').forEach(radio => {
      radio.addEventListener('change', function(event) {
        const selectedCurrency = event.target.value;
        
        // Save preference
        chrome.storage.sync.set({
          selectedCurrency: selectedCurrency
        }, function() {
            console.log('Currency preference saved:', selectedCurrency);

            // Notify the background script
            chrome.runtime.sendMessage({
            type: 'CURRENCY_CHANGED',
            currency: selectedCurrency
          });
        });
      });
    });
  });