// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Background used by home screen or error screen.
 */

'use_strict';



/**
 * Background of home screen or error screen.
 * @constructor
 */
Background = function() {
  /** @private {!Element} */
  this.debugInfo_ = document.getElementById('debug-info');

  /** @private {number} */
  this.currentBackground_ =
      Math.floor(Math.random() * Background.IMAGES_.length);

  /**
   * The interval id of the periodic rotateBackground_() job.  It is
   * null if the rotateBackground_() job is stopped.
   * @private {?number}
   */
  this.rotateBackgroundIntervalId_ = null;

  /**
   * Invisible image element to pre-load next background.
   * @private {Element}
   */
  this.preloadElement_ = document.createElement('img');
  this.preloadElement_.style.display = 'none';
  document.body.appendChild(this.preloadElement_);
};


/**
 * Default background image.
 * @private {string}
 */
Background.DEFAULT_IMAGE_ =
    'chrome://resources/images/eureka/background_default.png';


/**
 * Array of background images.
 * @private {Array.<string>}
 */
Background.IMAGES_ = [
  './resources/images/eureka/background1.png',
  './resources/images/eureka/background2.png',
  './resources/images/eureka/background3.jpg',
  './resources/images/eureka/background4.png'
];


/**
 * Intervals in milliseconds to change changing background image.
 * @private {number}
 */
Background.CHANGE_INTERVAL_ = 120000;


/**
 * Shows a given background image, or hides if null.
 * @param {?string} url Url of background image.
 */
Background.prototype.showImage = function(url) {
  if (url) {
    // Preloads the image before switching background.
    this.preloadElement_.src = url;
    this.preloadElement_.onload = function() {
      document.body.style['background-image'] = 'url(' + url + ')';
    };
  } else {
    document.body.style['background-image'] = null;
  }
};


/**
 * Changes page background to the next available image.
 * @private
 */
Background.prototype.rotateBackground_ = function() {
  this.currentBackground_++;
  if (this.currentBackground_ >= Background.IMAGES_.length) {
    this.currentBackground_ = 0;
  }
  this.showImage(Background.IMAGES_[this.currentBackground_]);
};


/** @return {string} the URI of the current background image. */
Background.prototype.getCurrentBackground = function() {
  return Background.IMAGES_[this.currentBackground_];
};


/**
 * Resumes background rotation.
 * @return {boolean} True if it shows background actually with this call.
 */
Background.prototype.resume = function() {
  // Only resumes local background if there isn't rotateBackground_()
  // scheduled already.  Otherwise, the background will be updated in the next
  // round.
  if (this.rotateBackgroundIntervalId_ != null) {
    return false;
  }

  this.rotateBackground_();
  // Resumes scheduling rotateBackground_() updates.
  this.rotateBackgroundIntervalId_ = window.setInterval(
      this.rotateBackground_.bind(this),
      Background.CHANGE_INTERVAL_);
  return true;
};


/**
 * Pauses background rotation.
 * @param {boolean=} opt_showDefault Whether or not to replace background image
 *     with the default (uniform grey) image.
 * @return {boolean} True if it hides background actually with this call.
 */
Background.prototype.pause = function(opt_showDefault) {
  if (opt_showDefault) {
    this.showImage(Background.DEFAULT_IMAGE_);
  }
  if (this.rotateBackgroundIntervalId_ == null) {
    return false;
  }

  // Stop rotateBackground_() from being called again until it is explicitly
  // resumed.
  window.clearInterval(this.rotateBackgroundIntervalId_);
  this.rotateBackgroundIntervalId_ = null;
  return true;
};


/**
 * Fills debug info if channel is not in stable channel.
 * @param {!EurekaSetupInfo} eurekaInfo Eureka setup info.
 */
Background.prototype.fillDebugInfo = function(eurekaInfo) {
  // Shows the build version and ip address unless release track is
  // 'stable-channel'.
  if (this.debugInfo_ && eurekaInfo.releaseTrack != 'stable-channel') {
    var text = 'Build=' + eurekaInfo.buildVersion;
    if (eurekaInfo.ipAddress) {
      text = text + ', IP=' + eurekaInfo.ipAddress;
    }
    if (eurekaInfo.releaseTrack) {
      text = text + ', Channel=' + eurekaInfo.releaseTrack;
    }
    this.debugInfo_.innerText = text;
  }
};
