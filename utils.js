// utils.js
const areaUtils = {
  findAreaInText(text) {
    // Your area utility code here
  },
  /** Given a DOM node, determines if it represents an area in sq meters */
  isValidAreaNode(node) {
    // Your validation code here
  },
  // ... other utility functions
  convertArea(squareMeters) {
    return squareMeters * 10.764;  // 1 sq meter = 10.764 sq feet
  }
};

const parseUtils = {
  removeSpans(container, target) {
    const spans = container.getElementsByClassName(target);
    while (spans.length > 0) {
      spans[0].remove();
    }
  }
}