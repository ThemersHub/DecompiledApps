// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Ping notification listener used in home screen.
 */

'use_strict';



/**
 * Ping listener. It accepts only one observer.
 * @constructor
 */
PingListener = function() {
  /** @private {?Function(PingListener.Event)} */
  this.listener_ = null;

  /**
   * The timeout id to enable ping notification.
   * @private {?number}
   */
  this.enablePingTimeout_ = null;
};


/**
 * Ping notification events.
 * @enum {number}
 */
PingListener.Event = {
  STARTED: 0,  // Started listening ping notification
  PING: 1  // Got ping notification
};


/**
 * Duration to disable ping notification.
 * @private {number}
 */
PingListener.DISABLE_DURATION_MS_ = 120000;


/** Starts listening ping notification. */
PingListener.prototype.start = function() {
    //  chrome.send('startPingNotify');
  this.listener_ && this.listener_(PingListener.Event.STARTED);
};


/** Stops listening ping notification. */
PingListener.prototype.stop = function() {
    //  chrome.send('stopPingNotify');
  if (this.enablePingTimeout_) {
    window.clearTimeout(this.enablePingTimeout_);
    this.enablePingTimeout_ = null;
  }
};


/** Got ping notification. */
PingListener.prototype.onPing = function() {
  this.stop();
  this.enablePingTimeout_ = window.setTimeout(
      this.start.bind(this), PingListener.DISABLE_DURATION_MS_);
  this.listener_ && this.listener_(PingListener.Event.PING);
};


/**
 * Sets ping listener.
 * @param {?Function(PingListener.Event)} listener Ping listener.
 */
PingListener.prototype.setListener = function(listener) {
  this.listener_ = listener;
};
