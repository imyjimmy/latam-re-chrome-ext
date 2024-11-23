## Use multiple files in chrome ext

// manifest.json
{
  "manifest_version": 3,
  "name": "COP to USD Converter",
  "version": "1.0",
  "description": "Automatically converts Colombian Peso (COP) amounts to USD",
  "permissions": ["activeTab", "scripting"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": [
      "areaUtils.js",
      "content.js"
    ]
  }]
}

// areaUtils.js
const areaUtils = {
    findAreaInText(text) {
        // Your area utility code here
    },
    isValidAreaNode(node) {
        // Your validation code here
    }
    // ... other utility functions
};

// content.js
// The utils object is available because areaUtils.js loads first
function processTextNode(node) {
    if (areaUtils.isValidAreaNode(node)) {
        // ... rest of your code
    }
}
