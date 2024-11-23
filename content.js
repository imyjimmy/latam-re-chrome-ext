function scrapeListingInfo() {
  const firstListing = document.querySelector('.wpsight-listing-archive');
  
  if (firstListing) {
    const listingData = {
      title: firstListing.querySelector('.entry-title a')?.textContent?.trim(),
      price: firstListing.querySelector('.wpsight-listing-price')?.textContent?.trim(),
      location: firstListing.querySelector('.wpsight-listing-meta')?.textContent?.trim(),
      image: firstListing.querySelector('.wpsight-listing-thumbnail img')?.src,
      description: firstListing.querySelector('.wpsight-listing-description')?.textContent?.trim(),
      // Additional details
      bedrooms: firstListing.querySelector('.listing-details-1 .listing-details-value')?.textContent?.trim(),
      bathrooms: firstListing.querySelector('.listing-details-2 .listing-details-value')?.textContent?.trim(),
      size: firstListing.querySelector('.listing-details-4 .listing-details-value')?.textContent?.trim(),
      neighborhood: firstListing.querySelector('.listing-details-8 .listing-details-value')?.textContent?.trim(),
      // Contact information
      contactUrl: 'https://primaverarealtymedellin.com/contact-primavera-realty-medellin/'
    };
    
    chrome.storage.local.set({ 'savedListing': listingData });
  }
}

// Run when page loads
scrapeListingInfo();