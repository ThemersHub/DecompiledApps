// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Info box animation used by home screen.
 */

'use_strict';



/**
 * Info box shown in ready screen.
 * @constructor
 */
InfoBox = function() {
  /** @private {Element} */
  this.deviceWifiBox_ = document.getElementById('device-wifi-box');
  /** @private {Element} */
  this.deviceLinkBox_ = document.getElementById('device-link-box');
  if (this.deviceLinkBox_) {
      //    document.getElementById('app-link').innerText =
      //        Message.getLocaleString('FindApps');
  }
  /** @private {Element} */
  this.deviceOnlyBox_ = document.getElementById('device-only-box');

  /**
   * Timeout value to show device-only-box triggered by showDeviceLink().
   * @private {?number}
   */
  this.showDeviceOnlyTimeout_ = null;

  /** @private {!Array.<Element>} */
  this.deviceNames_ = Array.prototype.slice.call(
      document.getElementsByClassName('device-name'));

  /** @private {!Element} */
  this.castIcon_ = document.getElementById('cast-icon');
  /** @private {!Element} */
  this.wifiBox_ = document.getElementById('wifi-box');
  /** @private {!Element} */
  this.wifiSignal_ = document.getElementById('wifi-signal');
  /** @private {!Element} */
  this.wifiSsid_ = document.getElementById('wifi-ssid');

  /** @private {Element} */
  this.time_ = document.getElementById('time');
};


/**
 * Timeout interval in milliseconds to show device-only-box after
 * device-link-box.
 * @private {number}
 */
InfoBox.SHOWING_DEVICE_ONLY_INTERVAL_MS_ = 30000;


/**
 * @param {string} timezone Current timezone ID.
 * @private
 */
InfoBox.prototype.updateDateTime_ = function(timezone, timeFormat) {
  if (timezone) {
    var d = new Date();
    // If NTP didn't set the time yet, hide it.
    if (d.getFullYear() >= 2013) {
      // TODO(byungchul): Passing timezone info is a workaround. ICU timezone
      // lib checks symlink info only of /etc/localtime, but doesn't follow
      // symlink if it is also a symlink. In eureka, symlink graph is
      // "/etc/localtime" -> "/data/share/chrome/localtime" -> zoneinfo.
      // So, renderer process has null default timezone unfortunately.
      // Fix uprv_tzname() in third_party/icu/source/common/putil.c.
      var options = { hour: 'numeric', minute: 'numeric', timeZone: timezone,
        hour12: (timeFormat != 2) };
      var timeString = d.toLocaleTimeString(navigator.language, options);
      // Remove AM/PM from locales which have it.
      timeString = timeString.replace(/.M/g, '');
      this.time_.innerText = timeString;
      return;
    }
  }
  this.time_.innerText = '';
};


/**
 * Updates the infomation.
 * @param {EurekaSetupInfo} eurekaInfo Eureka setup info.
 * @param {boolean=} opt_showOff Whether to show OFF or ON icons.
 */
InfoBox.prototype.update = function(eurekaInfo, opt_showOff) {
  var showOff = opt_showOff || !eurekaInfo.connected;
  //this.castIcon_.src = showOff ?
  //    'chrome://resources/images/eureka/cast_icon_off.png' :
  //    'chrome://resources/images/eureka/cast_icon_on.png';
  // Sets device name for all elements of class "device-name".
  //this.deviceNames_.forEach(function(e) { e.innerText = eurekaInfo.name; });
  this.time_ &&
      this.updateDateTime_(eurekaInfo.timezone, eurekaInfo.timeFormat);
  if (eurekaInfo.hasActiveWifiNetwork()) {
    this.wifiSsid_.innerText = eurekaInfo.ssid;
    // Changes wifi icon according to signal level.
    //var wifiSignalImg = showOff ?
    //    'chrome://resources/images/eureka/wifi_0.png' :
    //    ('chrome://resources/images/eureka/wifi_' + eurekaInfo.signalLevel +
    //     '.png');
    //if (this.wifiSignal_.src != wifiSignalImg) {
    //  this.wifiSignal_.src = wifiSignalImg;
    // }
    this.wifiBox_.style.display = '-webkit-box';
  } else {
    this.wifiBox_.style.display = 'none';
  }
};


/** Shows device-wifi-box and hides others. */
InfoBox.prototype.showDeviceWifi = function() {
  this.cancelShowingDeviceOnly_();
  this.deviceWifiBox_ && (this.deviceWifiBox_.style.display = '-webkit-box');
  this.deviceLinkBox_ && (this.deviceLinkBox_.style.display = 'none');
  this.deviceOnlyBox_ && (this.deviceOnlyBox_.style.display = 'none');
};


/** Shows device-link-box and hides others. */
InfoBox.prototype.showDeviceLink = function() {
  this.scheduleShowingDeviceOnly_();
  this.deviceWifiBox_ && (this.deviceWifiBox_.style.display = 'none');
  this.deviceLinkBox_ && (this.deviceLinkBox_.style.display = '-webkit-box');
  this.deviceOnlyBox_ && (this.deviceOnlyBox_.style.display = 'none');
};


/** Shows device-only-box and hides others. */
InfoBox.prototype.showDeviceOnly = function() {
  this.cancelShowingDeviceOnly_();
  this.deviceWifiBox_ && (this.deviceWifiBox_.style.display = 'none');
  this.deviceLinkBox_ && (this.deviceLinkBox_.style.display = 'none');
  this.deviceOnlyBox_ && (this.deviceOnlyBox_.style.display = '-webkit-box');
};


/**
 * Cancels showing device-only-box scheduled by previous showDeviceLink().
 * @private
 */
InfoBox.prototype.cancelShowingDeviceOnly_ = function() {
  if (this.showDeviceOnlyTimeout_) {
    window.clearTimeout(this.showDeviceOnlyTimeout_);
    this.showDeviceOnlyTimeout_ = null;
  }
};


/**
 * Schedules showing device-only-box.
 * @private
 */
InfoBox.prototype.scheduleShowingDeviceOnly_ = function() {
  this.cancelShowingDeviceOnly_();
  this.showDeviceOnlyTimeout_ = window.setTimeout(
      this.showDeviceOnly.bind(this), InfoBox.SHOWING_DEVICE_ONLY_INTERVAL_MS_);
};
