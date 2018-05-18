// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Utility functions for messages, used by home screen and error
 * screen.
 */

'use_strict';



/**
 * Message used when filling the message screen.
 * @param {string} title Title text for page.
 * @param {string=} opt_mainText Message to be shown under title.
 * @param {string=} opt_message Message to be shown above grey line.
 * @constructor
 */
Message = function(title, opt_mainText, opt_message) {
  this.title = title;
  this.mainText = opt_mainText || '';
  this.message = opt_message || '';
};


/**
 * Returns localized string.
 * @param {string} id Message ID.
 * @param {...string} var_args Arguments of message if any.
 * @return {string} Localized string for given message id.
 */
//Message.getLocaleString = loadTimeData.getStringF.bind(loadTimeData);


/**
 * True if text direction of current locale is RTL.
 * @type {boolean}
 */
//Message.isRTL = loadTimeData.getString('textdirection') == 'rtl';


/**
 * Message screen codes.
 * @enum {number}
 */
Message.CODE = {
  NO_MESSAGE: 0,

  ERROR_RENDER_VIEW_GONE: 1,

  WELCOME: 9,
  SETUP_START: 10,
  SETUP_CONNECTING: 11,
  SETUP_WIFI_SSID_ERROR: 12,
  SETUP_WIFI_PASSWORD_ERROR: 13,
  SETUP_ROUTER_ERROR: 14,

  REBOOT_NOW: 20,
  REBOOT_FDR: 21,
  REBOOT_OTA: 22,

  // The following error codes match those in
  // chromium/src/net/base/net_error_list.h
  ERROR_NET_ABORTED: -3,
  ERROR_NET_NAME_NOT_RESOLVED: -105,
  ERROR_NET_INTERNET_DISCONNECTED: -106,

  // Not defined in net_error_list.h but relevant to net errors.
  ERROR_NET_WIFI_DISCONNECTED: -10000
};


/**
 * @param {Messages.CODE} code Message code.
 * @param {EurekaSetupInfo} eurekaInfo Eureka setup info.
 * @param {boolean=} opt_locale2 Whether to read localized strings of 2nd
 *     locale.
 * @return {?Message} Message if message code is set. Otherwise, null.
 */
Message.toMessage = function(code, eurekaInfo, opt_locale2) {
  switch (code) {
    case Message.CODE.ERROR_RENDER_VIEW_GONE:
      return new Message(
          Message.getLocaleString('BrainFreeze'),
          Message.getLocaleString('UnexpectedLapseOfAttention'),
          Message.getLocaleString('RetryPrevious'));
    case Message.CODE.WELCOME:
      // Welcome message must be set to innerHTML, not innerText.
      var setupUrl = '<span id="setup-url" class="url-link">' +
          (eurekaInfo.releaseTrack != 'stable-channel' ?
           'goto.google.com/eureka-setup' :
           'chromecast.com/setup') + '</span>';
      return new Message(
          Message.getLocaleString(opt_locale2 ? 'SetMeUpLocale2' : 'SetMeUp'),
          Message.getLocaleString(opt_locale2 ?
                                  'VisitChromecastSetupLocale2' :
                                  'VisitChromecastSetup',
                                  setupUrl),
          '');
    case Message.CODE.SETUP_START:
      return new Message(
          Message.getLocaleString('SetMeUp'),
          Message.getLocaleString('WaitingInstructions', eurekaInfo.name),
          '');
    case Message.CODE.SETUP_CONNECTING:
      return new Message(
          Message.getLocaleString('Connecting'),
          Message.getLocaleString('ConnectingToNetwork', eurekaInfo.name,
                                  eurekaInfo.ssid),
          '');
    case Message.CODE.SETUP_WIFI_SSID_ERROR:
      return new Message(
          Message.getLocaleString('ReconnectMe'),
          Message.getLocaleString('CantFindNetwork', eurekaInfo.name,
                                  eurekaInfo.ssid),
          Message.getLocaleString(eurekaInfo.usesGoogleCastBranding ?
                                  'CheckYourNetworkGoogleCast' :
                                  'CheckYourNetwork',
                                  eurekaInfo.ssid));
    case Message.CODE.SETUP_WIFI_PASSWORD_ERROR:
      return new Message(
          Message.getLocaleString('ReconnectMe'),
          Message.getLocaleString('CantConnectWifi', eurekaInfo.name,
                                  eurekaInfo.ssid),
          Message.getLocaleString(eurekaInfo.usesGoogleCastBranding ?
                                  'ConfirmWifiPasswordGoogleCast' :
                                  'ConfirmWifiPassword'));
    case Message.CODE.SETUP_ROUTER_ERROR:
      return new Message(
          Message.getLocaleString('ReconnectMe'),
          Message.getLocaleString('CantAccessInternet', eurekaInfo.name,
                                  eurekaInfo.ssid),
          Message.getLocaleString(
              eurekaInfo.usesGoogleCastBranding ?
              'CheckInternetConnectionOrChooseDifferentGoogleCast' :
              'CheckInternetConnectionOrChooseDifferent'));
    case Message.CODE.REBOOT_NOW:
      return new Message(
          Message.getLocaleString('HandOnASec'),
          Message.getLocaleString('RebootMomentarily', eurekaInfo.name));
    case Message.CODE.REBOOT_OTA:
      return new Message(
          Message.getLocaleString('HandOnASec'),
          Message.getLocaleString('RebootOtaUpdate', eurekaInfo.name));
    case Message.CODE.REBOOT_FDR:
      return new Message(
          Message.getLocaleString('HandOnASec'),
          Message.getLocaleString('RebootFactoryReset', eurekaInfo.name),
          Message.getLocaleString('SwitchTvInput'));
    case Message.CODE.ERROR_NET_ABORTED:
      return new Message(
          Message.getLocaleString('BrainFreeze'),
          Message.getLocaleString('Sorry'),
          Message.getLocaleString('ActivityAborted'));
    case Message.CODE.ERROR_NET_NAME_NOT_RESOLVED:
      return new Message(
          Message.getLocaleString('BrainFreeze'),
          Message.getLocaleString('Sorry'),
          Message.getLocaleString('TryAgain'));
    case Message.CODE.ERROR_NET_INTERNET_DISCONNECTED:
      return new Message(
          Message.getLocaleString('BrainFreeze'),
          Message.getLocaleString('CantAccessInternet', eurekaInfo.name,
                                  eurekaInfo.ssid),
          Message.getLocaleString('CheckInternetConnection'));
    case Message.CODE.ERROR_NET_WIFI_DISCONNECTED:
      return new Message(
          Message.getLocaleString('BrainFreeze'),
          Message.getLocaleString('CantConnectWifi', eurekaInfo.name,
                                  eurekaInfo.ssid),
          Message.getLocaleString('CheckWifiRouter'));
    default:
      return new Message('Oops, shouldn\'t be here');
  }
};
