document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.local.get(['savedListing'], function(result) {
    const listing = result.savedListing;
    if (listing) {
      const html = `
        <div class="listing-card">
          ${listing.image ? `<img class="listing-image" src="${listing.image}" alt="Property">` : ''}
          <h3>${listing.title || 'No title available'}</h3>
          <div class="price">${listing.price || 'Price not available'}</div>
          <p>${listing.location || 'Location not available'}</p>
          <div class="details">
            <p>🛏️ Bedrooms: ${listing.bedrooms || 'N/A'}</p>
            <p>🚿 Bathrooms: ${listing.bathrooms || 'N/A'}</p>
            <p>📏 Size: ${listing.size || 'N/A'}</p>
            <p>📍 Neighborhood: ${listing.neighborhood || 'N/A'}</p>
          </div>
          <p>${listing.description || 'No description available'}</p>
        </div>
      `;
      document.getElementById('listing').innerHTML = html;
    } else {
      document.getElementById('listing').innerHTML = 'No listing saved yet. Visit a property page first.';
    }
  });
});