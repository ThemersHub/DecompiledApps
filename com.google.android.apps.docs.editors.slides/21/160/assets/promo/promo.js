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
  adjustImageForScreen(screenTarget, 'main_image');
  adjustImageForScreen(screenTarget, 'promo_icon');
  adjustImageForScreen(screenTarget, 'background');
  adjustTextForScreen(screenTarget, 'first-line');
  adjustTextForScreen(screenTarget, 'second-line');
  adjustTextForScreen(screenTarget, 'third-line');
}

/**
 * Changes the image sources to match the screen target, and set dimensions.
 * @param {string} target One of 'mdpi', 'hdpi' or 'large'.
 * @param {string} className of img elements to adjust
 * @private
 */
function adjustImageForScreen(target, className) {
  if (!target) {
    return;
  }

  target = target.toLowerCase();
  if (window.noLargeImage && target == 'large') {
    target = 'hdpi';
  }

  var imageWidth = (target == 'large') ? 519 : window.innerWidth - 20;
  var imageHeight = (target == 'large') ? 308 : imageWidth;
  var imgTags = document.getElementsByClassName(className);
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
 * Changes text font size to match the screen target.
 * @param {string} target One of 'mdpi', 'hdpi' or 'large'.
 * @param {string} className of text elements to adjust
 * @private
 */
function adjustTextForScreen(target, className) {
  if (!target) {
    return;
  }

  target = target.toLowerCase();
  var elements = document.getElementsByClassName(className);
  for (var element, i = 0; element = elements[i]; i++) {
    element.className = element.className + ' ' + className + '-' + target;
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
