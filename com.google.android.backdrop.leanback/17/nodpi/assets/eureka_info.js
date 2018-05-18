// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Utility function to fetch eureka info, used by home screen
 * and error screen.
 */

'use_strict';



/**
 * Eureka setup info. Defines subset of eureka_info received from the device
 * and some useful manipulating functions.
 * @param {Object} eurekaInfo Info received from the device.
 * @constructor
 */
EurekaSetupInfo = function(eurekaInfo) {
  this.internalInfo_ = eurekaInfo;

  /** @type {EurekaSetupInfo.SETUP_STATE} */
  this.setupState = this.internalInfo_.setup_state ||
      EurekaSetupInfo.SETUP_STATE.UNKNOWN;
  /** @type {string} */
  this.ssid = this.internalInfo_.ssid || '';
  /** @type {string} */
  this.name = this.internalInfo_.name;
  /** @type {string} */
  this.ipAddress = this.internalInfo_.ip_address;
  /** @type {boolean} */
  this.hasUpdate = this.internalInfo_.has_update || false;
  /** @type {string} */
  this.releaseTrack = this.internalInfo_.release_track;
  /** @type {string} */
  this.buildVersion = this.internalInfo_.build_version;
  /** @type {string} */
  this.pinCode = this.internalInfo_.pin_code;
  /** @type {string} */
  this.timezone = this.internalInfo_.timezone;
  /** @type {string} */
  this.locale = this.internalInfo_.locale;
  /** @type {boolean} */
  this.usesGoogleCastBranding =
      this.internalInfo_.uses_google_cast_branding || false;
  this.timeFormat = this.internalInfo_.time_format;

  /** type {boolean} */
  this.needExtender = false;

  /**
   * Wifi signal level [0, 4] considering noise level together.
   * @type {number}
   */
  this.signalLevel = 0;
  if ('signal_level' in this.internalInfo_) {
    if ('noise_level' in this.internalInfo_) {
      var snr = this.internalInfo_.signal_level -
          this.internalInfo_.noise_level;
      this.needExtender = (snr < 15 && this.internalInfo_.noise_level >= -90);
    }
    this.signalLevel = EurekaSetupInfo.calculateSignalLevel_(
        this.internalInfo_.signal_level, 5);
  }
};


/**
 * Enum for setup state in eureka info.
 * @enum {number}
 */
EurekaSetupInfo.SETUP_STATE = {
  UNKNOWN: 0,

  /** Configured once but disconnected for now. */
  DISCONNECTED: 10,
  /** An external client fetched eureka_info in hotspot mode. */
  DISCONNECTED_EXTERNAL_CLIENT_ACCESSED: 11,

  /** Scanning wifi networks. */
  SCANNING: 20,
  /** Cannot find given wifi network. */
  SCANNING_WRONG_SSID: 21,

  /** Being configured. */
  BEING_CONFIGURED: 30,
  /** Maybe wrong password. */
  BEING_CONFIGURED_WRONG_PASSWORD: 31,

  /** Obtaing ip address. */
  OBTAINING_IP_ADDRESS: 40,
  /** AP doesn't send DHCP info. */
  OBTAINING_IP_ADDRESS_BAD_AP: 41,

  /** Checking global connectivity. */
  CHECKING_GLOBAL_CONNECTIVITY: 50,
  /** Cannot connect globally. */
  CHECKING_GLOBAL_CONNECTIVITY_BAD_ROUTER: 51,

  /** Connected. */
  CONNECTED: 60,
  /** Connected but wifi config is not saved yet. */
  CONNECTED_NOT_WIFI_SAVED: 61
};


/**
 * Calculates the level of the signal. This should be used any time a signal
 * is being shown. It is based on Android WifiManager.calculateSignalLevel().
 * @param {number} rssi The power of the signal measured in RSSI.
 * @param {number} numLevels The number of levels to consider in the calculated
 *     level.
 * @return {number} A level of the signal, given in the range of 0 to
 *     numLevels-1 (both inclusive).
 * @private
 * @see https://cs.corp.google.com/#aosp-master/frameworks/base/wifi/java/android/net/wifi/WifiManager.java&q=calculateSignalLevel
 */
EurekaSetupInfo.calculateSignalLevel_ = function(rssi, numLevels) {
  var maxRssi = -55;
  var minRssi = -100;
  if (rssi <= minRssi) {
    return 0;
  } else if (rssi >= maxRssi) {
    return numLevels - 1;
  } else {
    var inputRange = maxRssi - minRssi;
    var outputRange = numLevels - 1;
    return Math.floor((rssi - minRssi) * outputRange / inputRange);
  }
};


/**
 * Eureka setup information url.
 * @private
 */
EurekaSetupInfo.EUREKA_INFO_URL_ = 'http://127.0.0.1:8008/setup/eureka_info';


/**
 * Query key for debug in current window.location.
 * @private
 */
EurekaSetupInfo.DEBUG_OPTION_ = 'eureka_info=';


/**
 * @return {boolean} Whether current window is under debug.
 */
EurekaSetupInfo.isDebug = function() {
  return window.location.search.length > 0 &&
      // First char must be '?', so debugIndex must be >0.
      window.location.search.indexOf(EurekaSetupInfo.DEBUG_OPTION_) > 0;
};


/**
 * Fetches eureka info and calls callback with it.
 * @param {Function(EurekaSetupInfo)} callback Callback called when new eureka
 *     info fetched successfully.
 */
EurekaSetupInfo.fetch = function(callback) {
  // Check if current url has query string for debug.
  if (EurekaSetupInfo.isDebug()) {
    var debugIndex = window.location.search.indexOf(
        EurekaSetupInfo.DEBUG_OPTION_);
    var eurekaInfo = new EurekaSetupInfo(JSON.parse(decodeURIComponent(
        window.location.search.substr(
            debugIndex + EurekaSetupInfo.DEBUG_OPTION_.length))));
    callback(eurekaInfo);
    return;
  }

  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = (function() {
    if (xhr.readyState == 4) {  // Response is available.
      var eurekaInfo = new EurekaSetupInfo(JSON.parse(xhr.responseText));
      callback(eurekaInfo);
    }
  });
  xhr.open('GET', EurekaSetupInfo.EUREKA_INFO_URL_);
  xhr.send();
};


/**
 * @return {boolean} Whether internet is connected and TOS has been accepted.
 */
EurekaSetupInfo.prototype.connected = function() {
  return this.internalInfo_.connected &&
      // If tos_accepted doesn't exist, it means TOS accepted.
      (this.internalInfo_.tos_accepted == undefined ||
       this.internalInfo_.tos_accepted);
};


/**
 * @return {boolean} Whether wifi network is active, i.e. associating or
 *     connected.
 */
EurekaSetupInfo.prototype.hasActiveWifiNetwork = function() {
  return !!this.ssid && this.setupState >= EurekaSetupInfo.SETUP_STATE.SCANNING;
};


/**
 * @return {boolean} Whether this is the first setup.
 */
EurekaSetupInfo.prototype.isFirstSetup = function() {
  return this.internalInfo_.first_setup ||
      // Wifi not configured and TOS not accepted.
      (!this.ssid && !this.connected());
};
