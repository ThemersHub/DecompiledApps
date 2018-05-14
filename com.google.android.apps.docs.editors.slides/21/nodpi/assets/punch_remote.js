/**
 * Once all of the page resources have loaded, wait for a repaint before
 * signaling the pageLoadListener that the WebView content is loaded.
 */
window.onload = function() {
  var signalDiv = document.getElementById('initial-load-signal');
  signalDiv.addEventListener('webkitAnimationStart', function(event) {
    pageLoadListener.onPageLoaded(parseInt(signalDiv.innerHTML));
  }, false);

  window.requestAnimationFrame(function() {
    /* Runs this before the next repaint. */
    window.requestAnimationFrame(function() {
      /* Runs this after the repaint. */
      window.setTimeout(function() {
        /* Sets the css class to trigger the animation on the div */
        signalDiv.className = 'initial-load';
      }, 0);
    });
  });
};
