document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.local.get(['savedListing'], function(result) {
      const listing = result.savedListing;
      if (listing) {
        const html = `
          <div class="listing-card">
            ${listing.image ? `<img class="listing-image" src="${listing.image}" alt="Property">` : ''}
            <h2>${listing.title || 'No title available'}</h2>
            <div class="price">${listing.price || 'Price not available'}</div>
            <p>${listing.location || 'Location not available'}</p>
            <div class="details">
              <div class="detail-item">
                <p><span>&#128716;</span> Bedrooms: ${listing.bedrooms || 'N/A'}</p>
              </div>
              <div class="detail-item">
                <p><span>&#128703;</span> Bathrooms: ${listing.bathrooms || 'N/A'}</p>
              </div>
              <div class="detail-item">
                <p><span>&#128207;</span> Size: ${listing.size || 'N/A'}</p>
              </div>
              <div class="detail-item">
                <p><span>&#128205;</span> Neighborhood: ${listing.neighborhood || 'N/A'}</p>
              </div>
            </div>
            <div class="description">
              <h3>Description</h3>
              <p>${listing.description || 'No description available'}</p>
            </div>
            <div class="contact-section">
                <a href="${listing.contactUrl}" class="contact-button" target="_blank">Contact Primavera Realty</a>
            </div>
          </div>
        `;
        document.getElementById('listing').innerHTML = html;
      } else {
        document.getElementById('listing').innerHTML = 'No listing saved yet. Visit a property page first.';
      }
    });
  });
  