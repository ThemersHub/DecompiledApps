/**
 * Translates the page by placing values from the i18n translation file
 * into the placeholders (elements with matching @code{id}).
 * @param {string} lang The language to use.
 */
function i18nize(lang) {
  if (!i18n) {
    // The i18n.js file can't be found, we have no translations at all.
    return;
  }

  translateToLanguage(lang);
}

/**
 * Translates the page by placing values from the i18n translation file
 * into the placeholders (elements with matching @code{id}).
 * @param {string} lang The language to use. If undefined, will use 'default'.
 * @private
 */
function translateToLanguage(lang) {
  var defaultStrings = i18n['default'] || {};

  if (lang && lang.length >= 2) {
    // get strings for exact language or fallback on non-country specific.
    var strings = i18n[lang] || i18n[lang.substring(0, 2)];
  }

  if (!strings) {
    var strings = defaultStrings;
  }

  for (msgId in defaultStrings) {
    var target = document.getElementById(msgId);
    if (target) {
      target.textContent = strings[msgId] || defaultStrings[msgId];
    }
  }
}

/** Exports the button text for the positive and close button */
function exportButtonTexts() {
  var positiveButton = document.querySelector('.positive_button');
  var closeButton = document.querySelector('.close_button');

  var positiveButtonText =
      (positiveButton == null ? null : positiveButton.textContent);
  var closeButtonText =
      (closeButton == null ? null : closeButton.textContent);

  if (window.stringExporter) {
    window.stringExporter.exportButtonTexts(positiveButtonText,
        closeButtonText);
  }
}

/** Gathers and exports all the text to be read when TalkBack is on. */
function exportTextForTalkBack() {
  var texts = document.querySelectorAll('.text');
  var pageText = '';
  for (var i = 0, text; text = texts[i]; i++) {
    pageText += text.textContent + '\n';
  }

  if (window.welcomeReader) {
    window.welcomeReader.exportText(pageText);
  }
}

