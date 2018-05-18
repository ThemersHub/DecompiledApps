// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Utility functions used by home screen and error screen.
 */

'use_strict';


/**
 * @param {string} source
 * @param {string} prefix
 * @return {boolean} Whether |source| starts with |prefix|.
 */
function StartsWith(source, prefix) {
  return source.length >= prefix.length &&
      source.slice(0, prefix.length) == prefix;
}


/**
 * Fits the inner text in the container to show it correctly without overflow.
 * @param {Element} elem Dom container element to fit the inner text.
 * @param {number} maxFontSize Maximum font size.
 */
function FitInnerText(elem, maxFontSize) {
  var parentWidth = elem.parentNode.offsetWidth;
  // For kn and ml locale, need more space not to crop last character.
  var needMoreSpace = navigator.language == 'kn' || navigator.language == 'ml';
  if (needMoreSpace) {
    elem.style.width = undefined;
    parentWidth -= 10;
  }
  var fontSize = maxFontSize;
  elem.style.fontSize = '' + fontSize + 'px';
  while (parentWidth < elem.offsetWidth) {
    --fontSize;
    elem.style.fontSize = '' + fontSize + 'px';
  }
  if (needMoreSpace) {
    elem.style.width = '' + (elem.offsetWidth + 10) + 'px';
  }
}
