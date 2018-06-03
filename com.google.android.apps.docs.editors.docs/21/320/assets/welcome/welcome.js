/**
 * Other JS files can hook into the onLoad method by adding their onLoad
 * functions to this array.
 */
var onLoadHandlers = [];

/**
 * The previous screen target we adjusted the layout for.
 */
var lastTarget = null;

/**
 * Adjusts the layout of some elements (e.g. img) to the screen dimensions.
 * @param {string} screenTarget One of 'mdpi', 'hdpi' or 'large'. If not
 *     given, the value given in the previous invocation will be used.
 */
function adjustLayout(screenTarget) {
  if (!screenTarget) {
    screenTarget = lastTarget;
  }
  lastTarget = screenTarget;
  adjustForScreen(screenTarget);
}

/**
 * Changes the image sources to match the screen target, and set dimensions.
 * @param {string} target One of 'mdpi', 'hdpi' or 'large'.
 * @private
 */
function adjustForScreen(target) {
  if (!target) {
    return;
  }

  target = target.toLowerCase();
  var imageWidth = (target == 'large') ? 519 : window.innerWidth - 20;
  var imageHeight = (target == 'large') ? 308 : imageWidth;
  var imgTags = document.getElementsByTagName('img');
  for (var img, i = 0; img = imgTags[i]; i++) {
    var src = img.src;
    // replace the img placeholders, e.g. page1-x.jpg into page1-hdpi.jpg
    img.src = src.replace(/(-[^-]*)?\.(?!.*[/])/g, '-' + target + '.');
    if (img.className == 'main_image') {
      img.style.width = img.style.maxWidth = imageWidth + 'px';
      img.style.height = img.style.maxHeight = imageHeight + 'px';
    }
  }
}

/**
 * The function to indicate to Java code that the Page has finished loading.
 */
function onPageLoaded() {
  if (window.pageLoadListener) {
    window.pageLoadListener.onPageLoaded();
  }
}

/** Standard onload hook. */
window.onload = function() {
  window.windowLoadListener.onWindowLoaded();
  for (var i = 0; i < onLoadHandlers.length; i++) {
    onLoadHandlers[i]();
  }
};

/** Standard onresize hook: adjust layout based on query parameters */
window.onresize = function() {
  adjustLayout();
};
