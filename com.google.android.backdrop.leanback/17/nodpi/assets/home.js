// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Javascript for eureka home screen. It can be executed by url,
 * "chrome://home" or "chrome://home?remote_url=<url>".
 */

'use_strict';


/**
 * Device info set by web ui.
 */
//var deviceInfo = loadTimeData.getValue('deviceInfo');



/**
 * Base class for all screen types.
 * @param {string} name Screen name used to show and hide DOM elements.
 * @param {!Screen.CommonMembers} common Common members for all screens.
 * @constructor
 */
Screen = function(name, common) {
  /* @type {string} */
  this.name = name;
  /* @protected {!Screen.CommonMembers} */
  this.common = common;
  /* @private {Element} */
  this.mainLayout_ = document.getElementById('main-layout');
};



/**
 * Common members for all screens.
 * @param {!Background} background Background common for all screens.
 * @param {!BannerAd} bannerAd Banner Ad in ready screen.
 * @param {!InfoBox} infoBox Info box in screens.
 * @param {!PingListener} ping Ping listener.
 * @constructor
 */
Screen.CommonMembers = function(background, bannerAd, infoBox, ping) {
  /** @type {boolean} */
  this.firstSetup = false;
  /** @type {Background} */
  this.background = background;
  /** @type {BannerAd} */
  this.bannerAd = bannerAd;
  /** @type {InfoBox} */
  this.infoBox = infoBox;
  /** @type {PingListener} */
  this.ping = ping;
  /** @type {number} */
  this.maxFontSizeOfMainText = window.parseInt(
      window.getComputedStyle(document.getElementById('main-text'), null)
      .getPropertyValue('font-size'));
  /** @type {VideoPlayer} */
  this.welcomeVideo = null;
};


/**
 * Constants for main layout positioning.
 * @private {Object.<string, number>}
 */
Screen.MainLayoutPosition_ = {
  TOP_ORIGINAL: 64,  // Orignal top position.
  TOP_ORIGINAL_KN_TE: 56,  // Orignal top position for kn and te locale.
  BOTTOM_BORDER: 605,  // Border line of bottom position.
  RETRY_INTEVAL: 200,  // Retry interval in milliseconds to adjust the position.
  RETRY_COUNT: 5  // Retry just in cast when all component are not loaded yet.
};


/**
 * Shows the components for this screen, and hides others.
 * @param {!Screen} prevScreen Previous screen.
 * @param {EurekaInfo=} opt_eurekaInfo Eureka setup info.
 */
Screen.prototype.show = function(prevScreen, opt_eurekaInfo) {
  var screenEls = document.querySelectorAll('[data-screen]');
  for (var i = 0; i < screenEls.length; i++) {
    var screenTypes = screenEls[i].dataset.screen.split(',') || [];
    screenEls[i].style.display =
        screenTypes.indexOf(this.name) >= 0 ? 'block' : 'none';
  }
  this.adjustMainLayout_(Screen.MainLayoutPosition_.RETRY_COUNT);
  console.log('Show screen: ' + this.name);
};


/**
 * Adjusts main layout position.
 * @param {number} retryCount Number retry when top has not been changed.
 *     If inner components are loaded slowly, need to retry several times.
 * @private
 */
Screen.prototype.adjustMainLayout_ = function(retryCount) {
  var targetTop = navigator.language == 'kn' || navigator.language == 'te' ?
      Screen.MainLayoutPosition_.TOP_ORIGINAL_KN_TE :
      Screen.MainLayoutPosition_.TOP_ORIGINAL;
  if (this.mainLayout_.offsetHeight + Screen.MainLayoutPosition_.TOP_ORIGINAL >
      Screen.MainLayoutPosition_.BOTTOM_BORDER) {
    targetTop = Screen.MainLayoutPosition_.BOTTOM_BORDER -
        this.mainLayout_.offsetHeight;
  }
  if (this.mainLayout_.offsetTop != targetTop) {
    this.mainLayout_.style.top = '' + targetTop + 'px';
  }
  if (retryCount > 0) {
    window.setTimeout(this.adjustMainLayout_.bind(this, retryCount - 1),
                      Screen.MainLayoutPosition_.RETRY_INTEVAL);
  }
};


/**
 * Adds an element to this screen.
 * @param {Element} element Element of which to add to this screen.
 */
Screen.prototype.addElement = function(element) {
  if (!element.dataset.screen) {
    element.dataset.screen = this.name;
  } else if (element.dataset.screen.indexOf(this.name) < 0) {
    element.dataset.screen += ',' + this.name;
  }
};



/**
 * Screen for all non-ready screens.
 * @param {string} name Screen name used to show and hide DOM elements.
 * @param {!Screen.CommonMembers} common Common members for all screens.
 * @constructor
 * @extends {Screen}
 */
NotReadyScreen = function(name, common) {
  base(this, name, common);
};
inherits(NotReadyScreen, Screen);


/** @override */
NotReadyScreen.prototype.show = function(prevScreen, opt_eurekaInfo) {
  this.common.ping.stop();
  this.common.bannerAd.stop();
  this.common.infoBox.showDeviceWifi();
  // Subclass decides backgrond resume/pause.
  opt_eurekaInfo && this.common.background.fillDebugInfo(opt_eurekaInfo);
  base(this, 'show', prevScreen, opt_eurekaInfo);
};



/**
 * Message screen.
 * @param {!Screen.CommonMembers} common Common members for all screens.
 * @constructor
 * @extends {NotReadyScreen}
 */
MessageScreen = function(common) {
  base(this, 'message', common);

  /** @private {Element} */
  this.mainText_ = document.getElementById('main-text');
  /** @private {Element} */
  this.subMainText_ = document.getElementById('sub-main-text');
  /** @private {Element} */
  this.txtMessage_ = document.getElementById('txt-message');
  /** @private {Element} */
  this.txtPinCode_ = document.getElementById('txt-pin-code');
};
inherits(MessageScreen, NotReadyScreen);


/**
 * Gets a message code corresponding to eureka setup state.
 * @param {!EurekaSetupInfo} eurekaInfo Eureka setup info.
 * @return {Message.CODE} Corresponding message code.
 */
MessageScreen.prototype.toMessageCode = function(eurekaInfo) {
  if (!eurekaInfo.hasActiveWifiNetwork()) {
    return Message.CODE.SETUP_START;
  }
  switch (eurekaInfo.setupState) {
    case EurekaSetupInfo.SETUP_STATE.SCANNING_WRONG_SSID:
      return Message.CODE.SETUP_WIFI_SSID_ERROR;
    case EurekaSetupInfo.SETUP_STATE.BEING_CONFIGURED_WRONG_PASSWORD:
      return Message.CODE.SETUP_WIFI_PASSWORD_ERROR;
    case EurekaSetupInfo.SETUP_STATE.OBTAINING_IP_ADDRESS_BAD_AP:
    case EurekaSetupInfo.SETUP_STATE.CHECKING_GLOBAL_CONNECTIVITY_BAD_ROUTER:
      return Message.CODE.SETUP_ROUTER_ERROR;
    default:
      return Message.CODE.SETUP_CONNECTING;
  }
};


/** @override */
MessageScreen.prototype.show = function(prevScreen, opt_eurekaInfo) {
  if (!opt_eurekaInfo) {
    return;
  }
  var message = Message.toMessage(this.toMessageCode(opt_eurekaInfo),
                                  opt_eurekaInfo);
  this.mainText_.innerText = message.title;
  this.subMainText_.innerText = message.mainText;
  this.txtMessage_.innerText = message.message;
  this.txtPinCode_.innerText = opt_eurekaInfo.pinCode || '';

  if (this.common.firstSetup) {
    this.common.background.pause();
    this.common.background.showImage(WelcomeScreen.IMAGE_URL.BACKGROUND);
  } else {
    this.common.background.pause(true /* default background image */);
  }
  base(this, 'show', prevScreen, opt_eurekaInfo);
  FitInnerText(this.mainText_, this.common.maxFontSizeOfMainText);
};



/**
 * Base class for all welcome screens.
 * @param {string} name Welcome screen name.
 * @param {!Screen.CommonMembers} common Common members for all screens.
 * @constructor
 * @extends {NotReadyScreen}
 */
WelcomeScreen = function(name, common) {
  base(this, name, common);
};
inherits(WelcomeScreen, NotReadyScreen);


/**
 * Welcome screen image urls
 * @enum {string}
 */
WelcomeScreen.IMAGE_URL = {
  BACKGROUND: 'chrome://resources/images/eureka/welcome_background.png',
  TUTORIAL_WORDFUL: 'chrome://resources/images/eureka/welcome_tutorial.png',
  TUTORIAL_WORDLESS:
      'chrome://resources/images/eureka/welcome_tutorial_wordless.png'
};


/**
 * Prefix of invalid localized strings.
 * @type {string}
 */
WelcomeScreen.INVALID_LOCALE_2_STRING_PREFIX = '(Invalid 2nd locale string)';


/** @override */
WelcomeScreen.prototype.show = function(prevScreen, opt_eurekaInfo) {
  this.common.background.pause();
  this.common.background.showImage(WelcomeScreen.IMAGE_URL.BACKGROUND);
  base(this, 'show', prevScreen, opt_eurekaInfo);
};



/**
 * Welcome screen without localized strings.
 * @param {!Screen.CommonMembers} common Common members for all screens.
 * @constructor
 * @extends {WelcomeScreen}
 */
WelcomeScreenWithZeroLocales = function(common) {
  base(this, 'welcome-0', common);

  /** @private {Element} */
  this.imageElement_ = document.getElementById('welcome-wordless-image');
};
inherits(WelcomeScreenWithZeroLocales, WelcomeScreen);


/** @override */
WelcomeScreenWithZeroLocales.prototype.show =
    function(prevScreen, opt_eurekaInfo) {
  if (prevScreen == this || !opt_eurekaInfo) {
    return;
  }
  // Loads image lazily.
  this.imageElement_.src = WelcomeScreen.IMAGE_URL.TUTORIAL_WORDLESS;
  base(this, 'show', prevScreen, opt_eurekaInfo);
};



/**
 * Welcome screen for localized strings of one locale.
 * @param {!Screen.CommonMembers} common Common members for all screens.
 * @constructor
 * @extends {NotReadyScreen}
 */
WelcomeScreenWithOneLocale = function(common) {
  base(this, 'welcome-1', common);

  /** @private {Element} */
  this.mainText_ = document.getElementById('main-text');
  /** @private {Element} */
  this.subMainText_ = document.getElementById('sub-main-text-with-url-link');
  /** @private {Element} */
  this.imageElement_ = document.getElementById('welcome-image');
};
inherits(WelcomeScreenWithOneLocale, WelcomeScreen);


/** @override */
WelcomeScreenWithOneLocale.prototype.show =
    function(prevScreen, opt_eurekaInfo) {
  if (prevScreen == this || !opt_eurekaInfo) {
    return;
  }

  var message = Message.toMessage(Message.CODE.WELCOME, opt_eurekaInfo);
  this.mainText_.innerText = message.title;
  this.subMainText_.innerHTML = message.mainText;
  this.imageElement_.src = WelcomeScreen.IMAGE_URL.TUTORIAL_WORDFUL;
  base(this, 'show', prevScreen, opt_eurekaInfo);
  FitInnerText(this.mainText_, this.common.maxFontSizeOfMainText);
};



/**
 * Welcome screen for localized strings of two locales.
 * @param {!Screen.CommonMembers} common Common members for all screens.
 * @constructor
 * @extends {NotReadyScreen}
 */
WelcomeScreenWithTwoLocales = function(common) {
  base(this, 'welcome-2', common);

  /** @private {Element} */
  this.mainText1_ = document.getElementById('main-text-welcome-2-1');
  /** @private {Element} */
  this.subMainText1_ =
      document.getElementById('sub-main-text-with-url-link-welcome-2-1');
  /** @private {Element} */
  this.mainText2_ = document.getElementById('main-text-welcome-2-2');
  /** @private {Element} */
  this.subMainText2_ =
      document.getElementById('sub-main-text-with-url-link-welcome-2-2');
  /** @private {Element} */
  this.imageElement_ = document.getElementById('welcome-image-welcome-2');
};
inherits(WelcomeScreenWithTwoLocales, WelcomeScreen);


/** @override */
WelcomeScreenWithTwoLocales.prototype.show =
    function(prevScreen, opt_eurekaInfo) {
  if (prevScreen == this || !opt_eurekaInfo) {
    return;
  }

  var message = Message.toMessage(Message.CODE.WELCOME, opt_eurekaInfo);
  this.mainText1_.innerText = message.title;
  this.subMainText1_.innerHTML = message.mainText;

  message = Message.toMessage(Message.CODE.WELCOME, opt_eurekaInfo, true);
  this.mainText2_.innerText = message.title;
  this.subMainText2_.innerHTML = message.mainText;

  this.imageElement_.src = WelcomeScreen.IMAGE_URL.TUTORIAL_WORDFUL;

  base(this, 'show', prevScreen, opt_eurekaInfo);
  FitInnerText(this.mainText1_, 50);
  FitInnerText(this.mainText2_, 50);
};



/**
 * Intermediate waiting for remote screen.
 * @param {!Screen.CommonMembers} common Common members for all screens.
 * @constructor
 * @extends {NotReadyScreen}
 */
PreRemoteScreen = function(common) {
  base(this, 'pre-remote', common);

  /**
   * Last timestamp in milliseconds when it started showing.
   * @private {!number}
   */
  this.lastShowTime_ = null;
};
inherits(PreRemoteScreen, NotReadyScreen);


/**
 * Time interval in milliseconds to wait for the remote home screen. 20 seconds.
 * @private {number}
 */
PreRemoteScreen.REMOTE_HOMESCREEN_DELAY_ = 20000;


/** @override */
PreRemoteScreen.prototype.show = function(prevScreen, opt_eurekaInfo) {
  if (prevScreen != this) {
    this.lastShowTime_ = new Date().getTime();
  }

  this.common.background.resume();
  base(this, 'show', prevScreen, opt_eurekaInfo);
};


/**
 * @return {boolean} Whether it shows longer than
 *     PreRemoteScreen.REMOTE_HOMESCREEN_DELAY_.
 */
PreRemoteScreen.prototype.shownTooLong = function() {
  return this.lastShowTime_ == null ? false :
      (this.lastShowTime_ + PreRemoteScreen.REMOTE_HOMESCREEN_DELAY_ <
       new Date().getTime());
};



/**
 * Base class for all ready screens.
 * @param {string} name Ready screen name.
 * @param {!Screen.CommonMembers} common Common members for all screens.
 * @constructor
 * @extends {Screen}
 */
ReadyScreen = function(name, common) {
  base(this, name, common);
};
inherits(ReadyScreen, Screen);


/**
 * Use extender show count key in localStorage.
 * @private {string}
 */
ReadyScreen.SHOW_EXTENDER_COUNT_ = 'HomeScreen.showExtenderCount';


/**
 * Ready screen image url's.
 * @enum {string}
 */
ReadyScreen.IMAGE_URL = {
  BACKGROUND: 'chrome://resources/images/eureka/background8.jpg',
  NEED_EXTENDER: 'chrome://resources/images/eureka/hdmi_extender.png'
};


/** @override */
ReadyScreen.prototype.show = function(prevScreen, opt_eurekaInfo) {
  var firstBannerUrl = null;
  if (opt_eurekaInfo && opt_eurekaInfo.needExtender) {
    var count = parseInt(
        localStorage.getItem(ReadyScreen.SHOW_EXTENDER_COUNT_));
    if (isNaN(count)) {
      count = 0;
    }
    if (count < 5) {
      localStorage.setItem(ReadyScreen.SHOW_EXTENDER_COUNT_, count + 1);
      firstBannerUrl = ReadyScreen.IMAGE_URL.NEED_EXTENDER;
    }
  }
  this.common.bannerAd.start(firstBannerUrl);
  opt_eurekaInfo && this.common.background.fillDebugInfo(opt_eurekaInfo);
  base(this, 'show', prevScreen, opt_eurekaInfo);
};


/**
 * @return {boolean} Whether it allows remote-screen change.
 */
ReadyScreen.prototype.allowRemote = function() {
  return true;
};



/**
 * Ready screen after first setup.
 * @param {!Screen.CommonMembers} common Common members for all screens.
 * @constructor
 * @extends {ReadyScreen}
 */
ReadyScreenAfterFirstSetup = function(common) {
  base(this, 'ready-1', common);

  /** @private {Element} */
  this.mainText_ = document.getElementById('main-text-ready-1');
  /** @private {Element} */
  this.subMainText_ =
      document.getElementById('sub-main-text-with-url-link-ready-1');

  /**
   * Whether or not to alloe remote screen.
   * @private {boolean}
   */
  this.allowRemote_ = false;

  /**
   * Timestamp in milliseconds to allow remote screen.
   * @private {!number}
   */
  this.allowRemoteTime_ = null;
};
inherits(ReadyScreenAfterFirstSetup, ReadyScreen);


/**
 * Delay in milliseconds to allow remote screen.
 * @private {number}
 */
ReadyScreenAfterFirstSetup.ALLOW_REMOTE_DELAY_ = 1200000;


/** @override */
ReadyScreenAfterFirstSetup.prototype.show =
    function(prevScreen, opt_eurekaInfo) {
  var now = new Date().getTime();
  if (prevScreen == this) {
    // If time elapsed enough, allow remote screen or rotate background image.
    if (this.allowRemoteTime_ != null && this.allowRemoteTime_ < now) {
      if (!this.allowRemote_) {
        console.log('Allow remote screen.');
        this.allowRemote_ = true;
      } else {
        // Remote screen is allowed but not be shown yet. Rotates background
        // image to prevent screen burn-in.
        this.common.background.resume();
      }
    }
    return;
  }

  this.allowRemote_ = false;
  this.allowRemoteTime_ = now + ReadyScreenAfterFirstSetup.ALLOW_REMOTE_DELAY_;

  this.common.background.pause();
  this.common.background.showImage(ReadyScreen.IMAGE_URL.BACKGROUND);

  this.mainText_.innerText = Message.getLocaleString('ReadyToCast');
  this.subMainText_.innerHTML = Message.getLocaleString(
      'GetLatestApps',
      '<span id="learn-url" class="url-link-blue">chromecast.com/learn</span>');

  base(this, 'show', prevScreen, opt_eurekaInfo);
  FitInnerText(this.mainText_, this.common.maxFontSizeOfMainText);
};


/** @override */
ReadyScreenAfterFirstSetup.prototype.allowRemote = function() {
  // Doesn't allow remote screen change for better user experience.
  return this.allowRemote_;
};



/**
 * Normal ready screen.
 * @param {!Screen.CommonMembers} common Common members for all screens.
 * @constructor
 * @extends {ReadyScreen}
 */
ReadyScreenNormal = function(common) {
  base(this, 'ready-2', common);
};
inherits(ReadyScreenNormal, ReadyScreen);


/** @override */
ReadyScreenNormal.prototype.show = function(prevScreen, opt_eurekaInfo) {
  if (prevScreen == this) {
    return;
  }

  this.common.ping.setListener(this.onPing_.bind(this));
  this.common.ping.onPing();
  this.common.background.resume();
  base(this, 'show', prevScreen, opt_eurekaInfo);
};


/**
 * Called by ping listener.
 * @param {!PingListener.Event} event Ping event.
 * @private
 */
ReadyScreenNormal.prototype.onPing_ = function(event) {
  switch (event) {
    case PingListener.Event.STARTED:
      this.common.infoBox.showDeviceLink();
      break;
    case PingListener.Event.PING:
      this.common.infoBox.showDeviceWifi();
      break;
    default:
      break;
  }
};



/**
 * Remote screen, for example, IMAX.
 * @param {!Screen.CommonMembers} common Common members for all screens.
 * @constructor
 * @extends {Screen}
 */
RemoteScreen = function(common) {
  base(this, 'remote', common);

  /**
   * Current state of remote screen.
   * @type {RemoteScreen.STATE}
   */
  this.state = RemoteScreen.STATE.UNKONWN;

  /**
   * Interval in milliseconds to retry loading (actually to set state to
   * FAILED because it relies on HomeScreen.prototype.updateScreen_().
   * @private {number}
   */
  this.retryIntevalOnError_ = RemoteScreen.ERROR_BACKOFF_INTERVAL_.INITIAL;

  /**
   * Timer to set state to FAILED after loading error happens.
   * @private {!number}
   */
  this.retryTimeout_ = null;

  /** @private {Element} */
  this.element_ = document.getElementById('remote-background')
      .firstElementChild;
  this.element_.onload = this.onLoad_.bind(this);
  this.element_.onerror = this.onError_.bind(this);
};
inherits(RemoteScreen, Screen);


/** @enum {number} */
RemoteScreen.STATE = {
  UNKNOWN: 0,
  FAILED: 1,
  LOADING: 2,
  READY: 3
};


/**
 * Time intervals in milliseconds to assume loading error in which the state
 * doesn't go to READY.
 * @private {Object.<string, number>}
 */
RemoteScreen.ERROR_INTERVAL_ = {
  AFTER_RELOAD: 10000,
  AFTER_LOAD_COMPLETED: 3000
};


/**
 * Time intervals in milliseconds for retry backoff on error, not to make
 * requests every 10 seconds and not to be blocked by DDOS server.
 * @private {Object.<string, number>}
 */
RemoteScreen.ERROR_BACKOFF_INTERVAL_ = {
  INITIAL: 1000,  // starting from 1 second
  MAX: 15 * 60 * 1000  // up to 15 minutes.
};


/**
 * Called on loading completed.  Load event is more reliable than error event
 * for various errors because of same origin policy.
 * @private
 */
RemoteScreen.prototype.onLoad_ = function() {
  // Treats as error if state doesn't go to READY in given interval.
  window.setTimeout(this.onError_.bind(this),
                    RemoteScreen.ERROR_INTERVAL_.AFTER_LOAD_COMPLETED);
};


/**
 * Called on loading error.
 * @private
 */
RemoteScreen.prototype.onError_ = function() {
  console.error('Error on remote screen loading.');
  if (this.retryTimeout_) {
    // Regards old retry.
  } else {
    window.setTimeout(function() {
      if (this.state != RemoteScreen.STATE.READY) {
        console.log('Set remote-screen state to FAILED.');
        this.state = RemoteScreen.STATE.FAILED;
      }
    }.bind(this), this.retryIntevalOnError_);
    this.retryIntevalOnError_ = this.retryIntevalOnError_ * 2;
    if (this.retryIntevalOnError_ > RemoteScreen.ERROR_BACKOFF_INTERVAL_.MAX) {
      this.retryIntevalOnError_ = RemoteScreen.ERROR_BACKOFF_INTERVAL_.MAX;
    }
  }
};


/** Sets state to READY when remote screen loaded successfully. */
RemoteScreen.prototype.setReady = function() {
  this.state = RemoteScreen.STATE.READY;
  this.retryIntevalOnError_ = RemoteScreen.ERROR_BACKOFF_INTERVAL_.INITIAL;
  if (this.retryTimeout_) {
    window.cancelTimeout(this.retryTimeout_);
    this.retryTimeout_ = null;
  }
};


/**
 * Revises url of remote home screen and loads it.
 * @param {string} url Url for remote idle screen.
 */
RemoteScreen.prototype.load = function(url) {
  var currentImage = this.common.background.getCurrentBackground();
  var urlToLoad = url;
  if (urlToLoad.indexOf('?') < 0) {
    urlToLoad += '?';
  } else {
    // We assume all URI with ? have proper query string.  Since we shitelist
    // all apps, we can require their URL to be proper and has no hash tags.
    // i.e, no URL's like http://foo.bar? or http://foo.bar#asdf
    urlToLoad += '&';
  }
  urlToLoad += 'build=' + encodeURIComponent(deviceInfo.buildVersion);
  urlToLoad += '&device=' + encodeURIComponent(deviceInfo.deviceId);
  urlToLoad += '&first-url=' + encodeURIComponent(currentImage);
  if (!deviceInfo.imaxReadyToCastShown) {
    urlToLoad += '&initial-post-setup=1';
  }
  if (EurekaSetupInfo.isDebug()) {
    urlToLoad += '&Debug=true';
  }
  this.reload(urlToLoad);
};


/**
 * Reloads remote screen. If url is not specified, tries with the previous url.
 * @param {string=} opt_url Url for remote idle screen.
 */
RemoteScreen.prototype.reload = function(opt_url) {
  var urlToLoad = opt_url || this.element_.src;
  console.log('Trying to load remote home screen: ' + urlToLoad);
  this.element_.src = urlToLoad;
  this.state = RemoteScreen.STATE.LOADING;
  // Treats as error if state doesn't go to READY in given interval.
  window.setTimeout(this.onError_.bind(this),
                    RemoteScreen.ERROR_INTERVAL_.AFTER_RELOAD);
};


/**
 * Posts the given event to the remote home screen.
 * @param {!Object} message Message to post.
 * @private
 */
RemoteScreen.prototype.postMessage_ = function(message) {
  if (this.element_.contentWindow && this.element_.src) {
    var data = JSON.stringify(message);
    this.element_.contentWindow.postMessage(data, '*');
  }
};


/** @override */
RemoteScreen.prototype.show = function(prevScreen, opt_eurekaInfo) {
  if (!opt_eurekaInfo) {
    return;
  }

  this.postMessage_({
    type: 'EUREKA_INFO',
    eureka_info: opt_eurekaInfo.internalInfo_
  });

  if (prevScreen == this) {
    return;
  }

  // Records that IMAX ready-to-cast screen has been shown.
  if (!deviceInfo.imaxReadyToCastShown) {
    console.log('IMAX ready-to-cast screen is shown.');
    chrome.send('setImaxReadyToCastShown');
  }

  this.common.bannerAd.stop();
  this.common.background.pause();

  this.common.ping.setListener(this.onPing_.bind(this));
  this.common.ping.onPing();
  base(this, 'show', prevScreen, opt_eurekaInfo);
};


/**
 * Called by ping listener.
 * @param {!PingListener.Event} event Ping event.
 * @private
 */
RemoteScreen.prototype.onPing_ = function(event) {
  if (PingListener.Event.PING == event) {
    this.postMessage_({ type: 'PING' });
  }
};



/**
 * Home screen class which is mother of all screens.
 * @param {string=} opt_remoteUrl Url for remote idle screen.
 * @constructor
 */
HomeScreen = function(opt_remoteUrl) {
  /** @type {!Screen.CommonMembers} */
  this.common = new Screen.CommonMembers(new Background(), new BannerAd(),
                                         new InfoBox(), new PingListener());
  /** @private {!MessageScreen} */
  this.messageScreen_ = new MessageScreen(this.common);
  /** @private {!WelcomeScreen} */
  this.welcomeScreen_ = new WelcomeScreenWithZeroLocales(this.common);
  /** @private {!PreRemoteScreen} */
  this.preRemoteScreen_ = new PreRemoteScreen(this.common);
  /** @private {!ReadyScreen} */
  this.readyScreen_ = new ReadyScreenNormal(this.common);
  /** @private {RemoteScreen} */
  this.remoteScreen_ = null;

  /** @private {!Screen} */
  this.currentScreen_ = this.preRemoteScreen_;

  // Loads remote url if wifi has been configured. Otherwise, does as normal.
  EurekaSetupInfo.fetch(this.loadRemoteUrl_.bind(this, opt_remoteUrl));
  window.setInterval(this.fetchEurekaSetupInfo.bind(this),
                     HomeScreen.UPDATE_SCREEN_INTERVAL_);
};


/**
 * Error code option in url.
 * @type {string}
 */
HomeScreen.REMOTE_URL_OPTION = '?remote_url=';


/**
 * Home screen web ui name.
 * @type {string}
 */
HomeScreen.WEBUI_NAME = 'home_web_ui_';


/**
 * Home screen update interval in milliseconds. 10 seconds.
 * @private {number}
 */
HomeScreen.UPDATE_SCREEN_INTERVAL_ = 10000;


/**
 * Checks if wifi has been configured. If so, tries to start remote screen.
 * Otherwise, shows message screen by updating screen normally.
 * @param {string} url Url for remote idle screen.
 * @param {!EurekaSetupInfo} eurekaInfo Eureka setup info.
 * @private
 */
HomeScreen.prototype.loadRemoteUrl_ = function(url, eurekaInfo) {
  this.common.firstSetup = eurekaInfo.isFirstSetup();
  if (this.common.firstSetup) {
    // Chooses proper welcome & ready screen.
    var locale2Str = Message.getLocaleString('SetMeUpLocale2');
    if (locale2Str &&
        !StartsWith(locale2Str, WelcomeScreen.INVALID_LOCALE_2_STRING_PREFIX)) {
      // Localized strings for 2nd locale are defined.
      this.welcomeScreen_ = new WelcomeScreenWithTwoLocales(this.common);
    } else if (eurekaInfo.locale) {
      // Factory locale is defined.
      this.welcomeScreen_ = new WelcomeScreenWithOneLocale(this.common);
    }
    this.readyScreen_ = new ReadyScreenAfterFirstSetup(this.common);
    // Shows set-me-up screen with welcome background video.
    this.startWelcomeBackgroundVideo_(eurekaInfo);
  } else if (!url) {
    // Remote url is not specified. Shows local idle screen.
    this.updateScreen_(eurekaInfo);
    return;
  } else {
    // Shows current (pre-remote) screen.
    this.currentScreen_.show();
  }
  // Initializes remote screen and loads remote url.
  this.remoteScreen_ = new RemoteScreen(this.common);
  this.remoteScreen_.load(url);
};


/**
 * Starts background video for welcome and first setup screens.
 * @param {!EurekaSetupInfo} eurekaInfo Eureka setup info.
 * @private
 */
HomeScreen.prototype.startWelcomeBackgroundVideo_ = function(eurekaInfo) {
  // TODO(byungchul): Disabled for performance issue which cannot start
  // video playing immediately because of RSA key generation.
  if (false) {
    var videoElement = document.createElement('video');
    videoElement.id = 'welcome-video';
    this.common.welcomeVideo = new VideoPlayer(
        videoElement, 'http://localhost:8008/setup/welcome-video',
        'video/mp4; codecs="avc1.4d4028"', 6);
    this.common.welcomeVideo.start();
    document.body.appendChild(videoElement);
  }
  this.updateScreen_(eurekaInfo);
};


/** Fetches eureka info and updates screen according to it. */
HomeScreen.prototype.fetchEurekaSetupInfo = function() {
  EurekaSetupInfo.fetch(this.updateScreen_.bind(this));
};


/** Callback called for webui of eureka info changed notification. */
HomeScreen.prototype.onEurekaInfoChanged = function() {
  if (this.currentScreen_ == this.preRemoteScreen_) {
    console.log('Ignoring onEurekaInfoChange in pre-remote screen');
    return;
  }
  this.fetchEurekaSetupInfo();
};


/**
 * Update screen according to given eureka setup info.
 * @param {!EurekaSetupInfo} eurekaInfo Eureka setup info.
 * @private
 */
HomeScreen.prototype.updateScreen_ = function(eurekaInfo) {
  /** @type {!Screen} */
  var newScreen = this.readyScreen_;
  if (eurekaInfo.connected()) {
    if (eurekaInfo.setupState ==
        EurekaSetupInfo.SETUP_STATE.CONNECTED_NOT_WIFI_SAVED) {
      // Internet is connected, but setup is not completed yet.
      newScreen = this.messageScreen_;
      if (this.remoteScreen_ &&
          this.remoteScreen_.state == RemoteScreen.STATE.FAILED) {
        // Loads remote screen to show remote screen immediately after setup.
        console.log('Loads remote screen before setup is completed.');
        this.remoteScreen_.reload();
      }
    } else if (!this.remoteScreen_) {
      // Shows ready screen.
    } else if (this.currentScreen_ == this.readyScreen_ &&
               !this.readyScreen_.allowRemote()) {
      // Keeps showing ready screen for 20 mins.
    } else if (this.remoteScreen_.state == RemoteScreen.STATE.READY) {
      newScreen = this.remoteScreen_;
    } else if (this.currentScreen_ == this.preRemoteScreen_ &&
               this.preRemoteScreen_.shownTooLong()) {
      console.error('Remote screen doesn\'t seem working.');
      chrome.send('recordAction', ['IdleScreen.Error.LoadingRemoteScreen']);
    } else {
      // If ready screen is already being shown or it is after first-setup,
      // don't change it to pre-remote.
      if (this.currentScreen_ != this.readyScreen_ &&
          !this.common.firstSetup) {
        newScreen = this.preRemoteScreen_;
      }
      // Reloads remote screen if it failed due to no connection.
      if (this.remoteScreen_.state == RemoteScreen.STATE.FAILED) {
        this.remoteScreen_.reload();
      } else {
        console.log('Remote screen is not ready yet. Wait more: ' +
                    newScreen.name);
      }
    }
  } else if (this.common.firstSetup && !eurekaInfo.hasActiveWifiNetwork() &&
      eurekaInfo.setupState <
      EurekaSetupInfo.SETUP_STATE.DISCONNECTED_EXTERNAL_CLIENT_ACCESSED) {
    newScreen = this.welcomeScreen_;
  } else {
    newScreen = this.messageScreen_;
  }
  newScreen.show(this.currentScreen_, eurekaInfo);
  this.common.infoBox.update(eurekaInfo, newScreen != this.readyScreen_);
  this.currentScreen_ = newScreen;
};


/** Records the fact that the remote background is ready. */
HomeScreen.prototype.switchToRemoteHomeScreen = function() {
  this.remoteScreen_ && this.remoteScreen_.setReady();
  console.log('Remote screen is ready: current_screen=' +
              this.currentScreen_.name);
  // Remote screen will be shown at next eureka info if current screen is
  // ready or pre-ready.
  this.fetchEurekaSetupInfo();
};


/** Reverts to local screen. */
HomeScreen.prototype.revertToLocalHomeScreen = function() {
  this.remoteScreen_ && (this.remoteScreen_.state = RemoteScreen.STATE.FAILED);
  console.log('Revert to local screen: current_screen=' +
              this.currentScreen_.name);
  this.fetchEurekaSetupInfo();
};



var homeScreen = undefined;

window.addEventListener('load', function() {
  document.getElementsByTagName('body')[0].lang = navigator.language;
  if (StartsWith(window.location.search, HomeScreen.REMOTE_URL_OPTION)) {
    var remoteUrl = decodeURIComponent(
        window.location.search.slice(HomeScreen.REMOTE_URL_OPTION.length));
    homeScreen = new HomeScreen(remoteUrl);
  } else {
    homeScreen = new HomeScreen();
  }
});

window.addEventListener('message', function(event) {
  console.log('data [' + event.data + ']');

  var messageObj = JSON.parse(event.data);
  if (messageObj.type == 'REMOTE_WINDOW') {
    switch (messageObj.status) {
      case 'LOADED':
        // When the remote home screen is loaded, switch to the remote
        // home screen.
        homeScreen.switchToRemoteHomeScreen();
        break;

      case 'OFFLINE':
        // The remote background signals that it cannot access the IMAX server
        // (requests to the IMAX server fails).  Reverts to local background
        // when this happens.
        homeScreen.revertToLocalHomeScreen();
        break;

      default:
        console.error('Unexpected status from the remote background.');
        break;
    }
  }
});

/**
cr.define(HomeScreen.WEBUI_NAME, function() {
  return {
    eurekaInfoChangedCallback: function() {
      homeScreen && homeScreen.onEurekaInfoChanged();
    },
    pingNotifyCallback: function() {
      homeScreen && homeScreen.common.ping.onPing();
    }
  };
});
*/

