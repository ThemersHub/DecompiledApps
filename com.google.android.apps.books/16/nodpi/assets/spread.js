
// Ultimately, this js code should probably move to google3 but for now this file allows
// faster iterations.

// Keep in sync with WebViewHtmlDisplayView!
var DOUBLE_TAP_DELAY_MS = 300;

var UNKNOWN_IMAGES_COUNT = -1;

/**
 * Stores all the extra per iframe properties we need.
 */
var IFrameProps = function() {

    /** The frame to which the properties are attached. */
    this.iframe = null;

    /*
     * The number of images that are still not loaded, or UNKNOWN_IMAGES_COUNT.
     */
    this.imagesToLoadCount = UNKNOWN_IMAGES_COUNT;

};

// Stores various properties we need per iframe.
var gIFrameProps = [new IFrameProps(), new IFrameProps()];

// Returns the properties attached to the iframe of the given id.
getIFrameProps = function(iframeId) {
    var index = (iframeId == 'IFRAME0') ? 0 : 1;
    return gIFrameProps[index];
}

// Sets the src and style.cssText of the iframe with the given frameId.
// Sets backgroundStyle on the style.cssText of the div with the
// given backgroundDivId.
setupPage = function(frameId, sourceUrl, style, backgroundStyle, backgroundDivId) {
    spreadBridge.logD("setupPage frameId: " + frameId + " sourceUrl: " + sourceUrl);

    var iProps = getIFrameProps(frameId);
    iProps.imagesToLoadCount = UNKNOWN_IMAGES_COUNT;

    if (iProps.iframe == null) {
        iProps.iframe = document.getElementById(frameId);
    }

    var iframe = iProps.iframe;
    // Remove the handlers before changing the src or taps will crash the WebView on L.
    removeEventHandlers(getEventTargetForIFrame(iframe));
    iframe.src = sourceUrl;
    iframe.style.cssText = style;

    if (backgroundStyle != "") {
        var fitWidthDiv = document.getElementById(backgroundDivId);
        fitWidthDiv.style.cssText = backgroundStyle;
    }
};

// Waits until all the images in the iframe are loaded before notifying the bridge that the
// content is ready (onFrameLoaded).
// This is called after the whole page has been loaded so the count of images should be accurate
// (see WebViewHtmlDisplayView#buildJsNode).
function onIframeContentLoaded(frameWin) {
    var frameDoc = frameWin.document;
    var frameUrl = frameDoc.URL;
    var frameEl = frameWin.frameElement;
    var frameId = frameEl.id;

    var iProps = getIFrameProps(frameId);
    iProps.imagesToLoadCount = 0;

    var onImageCompleted = function(evt) {
        iProps.imagesToLoadCount--;
        if (iProps.imagesToLoadCount <= 0) {
            spreadBridge.onFrameLoaded(frameUrl);
        }
    };

    var images = frameDoc.images;
    var imgCount = 0;
    if (images != null && images.length > 0) {
        imgCount = images.length;
        for (var ii = 0; ii < imgCount; ii++) {
            var img = images[ii];
            // Chrome occasionally drops the error event.
            // hasValidSrc is an attempt to mitigate such misses.
            // https://stackoverflow.com/q/17636397/
            // TOODO(morrita): Report this back. See b/62447659.
            var hasValidSrc = img.src && 0 < img.src.length;
            if (!img.complete && hasValidSrc) {
                iProps.imagesToLoadCount++;
                img.addEventListener("load", onImageCompleted);
                img.addEventListener("error", onImageCompleted);
            }
        }
    }

    spreadBridge.logD("onIframeContentLoaded " + iProps.imagesToLoadCount + "/" + imgCount
        + " need loading");

    if (iProps.imagesToLoadCount <= 0) {
        spreadBridge.onFrameLoaded(frameUrl);
    }
}

function bootstrapIframe(frameWin, needsAdjustment) {
    frameWin.addEventListener('load', function() {
        var frameDoc = frameWin.document;
        if (needsAdjustment) {
            var pg = spreadBridge.getPagination(frameDoc.URL);
            var firstChild = frameDoc.body.firstChild;
            engine.adjustPage(frameDoc, firstChild, pg);
        }

        onIframeContentLoaded(frameWin);
    }, false);
}

function activateMediaElement(iframeId, elementId, classes) {
    var iframe = document.getElementById(iframeId);
    if (iframe) {
        engine.activateMediaElement(iframe.contentDocument, elementId, classes);
    } else {
        engine.clearActivatedMediaElement();
    }
}

function handleStart(event) {
    // Note that the publisher script can call event.stopPropagation and we won't receive it.
    // The values seem to be in css pixels and will need to be multiplied by the density.
    // For the iframes, they are also relative to the top left...
    spreadBridge.onTouchStart(event.touches.length);
}

var sLastTapUpMs = -1;

// Offers basic detection of double taps.
function handleEnd(event) {
    var now = Date.now();
    var touchesCount = event.touches.length;

    if (touchesCount > 0 || ((now - sLastTapUpMs) > DOUBLE_TAP_DELAY_MS)) {
        sLastTapUpMs = now;
    } else {
        sLastTapUpMs = -1;
        event.preventDefault();
        event.stopPropagation();
        var touch = event.changedTouches[0];
        spreadBridge.onDoubleTap(Math.round(touch.screenX), Math.round(touch.screenY));
    }
}

function removeEventHandlers(target) {
    target.removeEventListener("touchstart", handleStart, false);
    target.removeEventListener("touchend", handleEnd, false);
}

function addEventHandlers(target) {
    target.addEventListener("touchstart", handleStart, false);
    target.addEventListener("touchend", handleEnd, false);
}

function getEventTargetForIFrame(iframe) {
    return iframe.contentWindow;
}

function findAnchor(el) {
    for (; el.parentNode; el = el.parentNode) {
        if (el.tagName == "A") {
            return el;
        }
    }

    return null;
}

function clickedHandler(event) {
    event.preventDefault();
    event.stopPropagation();
    var el = findAnchor(event.target);
    if (el) {
        var href = el.getAttribute("href");
        if (href != null && href.length > 0) {
            spreadBridge.onLinkClicked(href);
            return;
        }
    } // no else

    spreadBridge.onSingleTap(Math.round(event.screenX), Math.round(event.screenY));
}

function setupIFrameHandlers(iframeId) {
    var iframe = document.getElementById(iframeId);

    iframe.addEventListener('load', function() {
        addEventHandlers(getEventTargetForIFrame(iframe));

        // Install an explicit click handler as the WebViewClient gets no callback for local
        // anchors (eg: href="#GBS.PA11"), and then handle all the clicks because this can fire
        // after onSingleTapConfirmed (b/25294966).
        iframe.contentDocument.addEventListener("click", clickedHandler);
    });
}

// fixedlayout and animating parameters will be used later.
function initializeSpread(doc, iframeIds, fixedLayout, animating) {
    for (var i = 0; i < iframeIds.length; i++) {
        setupIFrameHandlers(iframeIds[i]);
    }

    addEventHandlers(doc);
    spreadBridge.onJsApiReady();
}