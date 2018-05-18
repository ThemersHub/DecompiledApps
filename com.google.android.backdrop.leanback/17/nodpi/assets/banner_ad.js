// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Banner image animation used by home screen.
 */

'use_strict';



/**
 * Banner ad class.
 * @constructor
 */
BannerAd = function() {
  /** @private {Element} */
  this.container_ = document.getElementById('banner-image');
  /** @private {number} */
  this.currentBanner_ = 0;
  /** @private {number} */
  this.failCount_ = 0;
  /** @private {number} */
  this.showCount_ = 0;
  /** @private {number} */
  this.timeout_ = 0;
  /** @private {BannserAd.STATES_} */
  this.state_ = BannerAd.STATES_.STOPPED;

  /**
   * If set, it is the url of the first banner image to use.
   * @private {?string}
   */
  this.firstImage_ = null;

  this.container_.addEventListener('webkitTransitionEnd',
                                   this.transitionEnd_.bind(this));
};


/**
 * Array of banner images.
 * @private {Array.<string>}
 */
BannerAd.BANNERS_ = [
  'http://www.gstatic.com/eureka/images/ei/1.png',
  'http://www.gstatic.com/eureka/images/ei/2.png',
  'http://www.gstatic.com/eureka/images/ei/3.png',
  'http://www.gstatic.com/eureka/images/ei/4.png',
  'http://www.gstatic.com/eureka/images/ei/5.png',
  'http://www.gstatic.com/eureka/images/ei/6.png',
  'http://www.gstatic.com/eureka/images/ei/7.png',
  'http://www.gstatic.com/eureka/images/ei/8.png',
  'http://www.gstatic.com/eureka/images/ei/9.png',
  'http://www.gstatic.com/eureka/images/ei/10.png'
];


/**
 * Banner states.
 * @enum {number}
 * @private
 */
BannerAd.STATES_ = {
  STOPPED: 0,
  SHOWN: 1,
  HIDDEN: 2
};


/**
 * Time to display each banner for.
 * @private {number}
 */
BannerAd.DISPLAY_DURATION_MS_ = 60000;


/**
 * Number of images to show in each cycle.
 * @private {number}
 */
BannerAd.IMAGE_SHOW_COUNT_ = 1;


/**
 * Callback when a banner transition ends.
 * @private
 */
BannerAd.prototype.transitionEnd_ = function() {
  if (this.state_ == BannerAd.STATES_.HIDDEN &&
      this.showCount_ < BannerAd.IMAGE_SHOW_COUNT_) {
    this.show_();
  }
};


/**
 * Callback for image async load success.
 * Once image is loaded, replace the current image in DOM.
 * @param {Event} event
 * @private
 */
BannerAd.prototype.imageLoadSuccess_ = function(event) {
  ++this.showCount_;
  if (this.state_ != BannerAd.STATES_.STOPPED) {
    this.state_ = BannerAd.STATES_.SHOWN;
    this.container_.replaceChild(event.target,
                                 this.container_.firstElementChild);
    this.container_.style.bottom = 0;
    if (this.timeout_) {
      clearTimeout(this.timeout_);
    }
    this.timeout_ = window.setTimeout(this.hide_.bind(this, true),
                                      BannerAd.DISPLAY_DURATION_MS_);
  }
};


/**
 * Callback for when async image load fails.
 * If image load fails, try to load next image until all image urls exhausted.
 * @private
 */
BannerAd.prototype.imageLoadFailure_ = function() {
  if (this.state_ != BannerAd.STATES_.STOPPED) {
    if (++this.failCount_ <= BannerAd.BANNERS_.length) {
      this.show_();
    }
  }
};


/**
 * Load next banner image asynchronously and show the image.
 * Image is shown by aligning the container bottom to the screen.
 * @private
 */
BannerAd.prototype.show_ = function() {
  var image = new Image();
  if (this.firstImage_) {
    image.src = this.firstImage_;
    this.firstImage_ = null;
  } else {
    this.currentBanner_++;
    if (this.currentBanner_ >= BannerAd.BANNERS_.length) {
      this.currentBanner_ = 0;
    }
    image.src = BannerAd.BANNERS_[this.currentBanner_];
  }
  image.onload = this.imageLoadSuccess_.bind(this);
  image.onerror = this.imageLoadFailure_.bind(this);
};


/**
 * Hides the banner image and schedule to show the next one until we have shown
 * maxShowCount_ images.
 * Image is hidden by moving the bottom to -720px which ensures that the image
 * is beyond the visible region on the screen.
 * @param {boolean} reschedule True to show the next image.
 * @private
 */
BannerAd.prototype.hide_ = function(reschedule) {
  if (reschedule) {
    this.state_ = BannerAd.STATES_.HIDDEN;
  } else {
    this.state_ = BannerAd.STATES_.STOPPED;
  }
  this.container_.style.bottom = '-720px';
  if (this.timeout_) {
    clearTimeout(this.timeout_);
    this.timeout_ = 0;
  }
};


/**
 * Begin the banner ad showing loop.
 * @param {string=} opt_firstBannerUrl Url of first banner to be displayed.
 */
BannerAd.prototype.start = function(opt_firstBannerUrl) {
  if (this.state_ != BannerAd.STATES_.STOPPED) {
    return;
  }
  this.state_ = BannerAd.STATES_.HIDDEN;
  this.currentBanner_ = Math.floor(Math.random() * BannerAd.BANNERS_.length);
  this.firstImage_ = opt_firstBannerUrl;
  this.showCount_ = 0;
  this.failCount_ = 0;
  this.show_();
};


/**
 * Stops the banner add showing loop.
 */
BannerAd.prototype.stop = function() {
  this.hide_(false);
  if (this.timeout_) {
    clearTimeount(this.timeout_);
    this.timeout_ = 0;
  }
};
