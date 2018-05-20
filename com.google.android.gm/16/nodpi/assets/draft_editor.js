var DIV_BODY = 'div.body';
var GMAIL_SIGNATURE = 'gmail_signature';
/**
 * Caribou whitelist for signature:
 * http://google3/java/com/google/caribou/base/sanitizer/SanitizerSettings.java?l=140&rcl=122663544
 */
var GMAIL_SIGNATURE_ATTR = 'data-smartmail';
var GMAIL_SIGNATURE_SELECTOR = DIV_BODY +
        ' > div[' + GMAIL_SIGNATURE_ATTR + '=\"' + GMAIL_SIGNATURE + '\"]';
var GMAIL_FORWARDED = 'gmail_forwarded';
var CLASS_DRIVE_CHIP = 'gmail_chip gmail_drive_chip';
var DIV_DRIVE_CHIP = 'div.gmail_chip.gmail_drive_chip';
var CLASS_MENTION_CHIP = 'gmail_chip gmail_plusreply';
var SPAN_MENTION_CHIP = 'span.gmail_chip.gmail_plusreply';
var SIGNATURE_HOLDER = 'signature_holder';

var DRIVE_CHIP_DELETE_BUTTON = 'chip_delete_button';
var DRIVE_CHIP_DELETE_RTL_BUTTON = 'chip_delete_button_rtl';
var DRIVE_CHIP_DELETE_BUTTON_ICON = 'chip_delete_button_icon';

var KEYCODE_ENTER = 13;

var INLINE_IMAGE_MAXWIDTH = "288px";

var prevContainerHeight = 0;

/**
 * Returns the {@code <div.body>} element
 * @returns {element} the body
 */
function getBody() {
    return document.body.querySelector(DIV_BODY);
}


/**
 * Returns the innerHTML of {@code <div.body>} element
 * @returns {string} the body's innerHTML
 */
function getBodyInnerHTML() {
    return getBody().innerHTML;
}


/**
 * Calls BodyChangeListener.save() with body.
 */
function save() {
    // Send innerHTML to JS Bridge after wrapping with a div dir='auto' element
    BodyChangeListener.save(
            '<div dir=\'auto\'>' + getBodyInnerHTML() + '</div>');
}

var MentionObserver;
var DriveChipDeletionObserver;
var MentionChipDeletionObserver;

/**
 * Registers a mutation observer to observe any Drive chip deletions
 */
registerDriveChipDeletionObserver = function() {
    var target = document.querySelector(DIV_BODY);
    if (!DriveChipDeletionObserver) {
        DriveChipDeletionObserver = new MutationObserver(function(mutations) {
            if (!DriveChipDeletionListener) {
                return;
            }

            // Check for deleted Drive chips
            var urls = [];
            var tags = [];
            mutations.forEach(function(mutation) {
                var node;
                for (var i = 0; node = mutation.removedNodes[i]; ++i) {
                    if (node.nodeType != Node.ELEMENT_NODE) {
                        continue;
                    }
                    var a;
                    if (node.className == CLASS_DRIVE_CHIP) {
                        // Node is a Drive chip
                        var a = node.querySelector("a");
                    } else if (mutation.target.className == CLASS_DRIVE_CHIP
                             && node.tagName.toLowerCase() == "a") {
                        // Node is the anchor element inside a Drive chip
                        // Note that this can occur when hitting backspace to
                        // delete a Drive chip - the anchor element is deleted
                        // separately from the Drive div.
                        var a = node;
                    }
                    if (a) {
                        var href = a.getAttribute("href");
                        if (href) {
                            urls.push(href);
                        } else {
                            var rel = a.getAttribute("rel");
                            if (rel) {
                                tags.push(rel);
                            }
                        }
                    }
                }
            });
            if (urls.length > 0 || tags.length > 0) {
                var jsUrls = urls.length > 0 ? JSON.stringify(urls) : null;
                var jsTags = tags.length > 0 ? JSON.stringify(tags) : null;
                DriveChipDeletionListener.onDriveChipDeleted(jsUrls, jsTags);
            }
        });
    }
    DriveChipDeletionObserver.observe(target, {childList:true, subtree:true});
};

/**
 * Registers a mutation observer to observe any mentions in the body.
 */
function registerMentionObserver() {
  var target = document.querySelector(DIV_BODY);
  if (!MentionObserver) {
    MentionObserver = new MutationObserver(function(mutations) {
      var range = getRange();
      var mentionToken;
      var chipAncestor;
      mutations.forEach(function(mutation) {
        chipAncestor =
            getChipAncestor(mutation.target, 'SPAN', SPAN_MENTION_CHIP);
        if (chipAncestor == null && range.intersectsNode(mutation.target)) {
          mentionToken = getMentionToken(range);
          (mentionToken != null) ? BodyChangeListener.onMention(mentionToken) :
                                   BodyChangeListener.disableListPopupWindow();
        } else {
          BodyChangeListener.disableListPopupWindow();
        }
      });
    });
  }
  MentionObserver.observe(
      target, {childList: true, characterData: true, subtree: true});
}

/**
 * Registers a mutation observer to observe any mention chip deletions
 * triggered by a backspace after a mention chip
 */
function registerMentionChipDeletionObserver() {
  var target = document.querySelector(DIV_BODY);
  if (!MentionChipDeletionObserver) {
    MentionChipDeletionObserver = new MutationObserver(function(mutations) {
      if (!MentionChipDeletionListener) {
        return;
      }
      // Check for mutated mention chips
      mutations.forEach(function(mutation) {
        var chipAncestor =
            getChipAncestor(mutation.target, 'SPAN', SPAN_MENTION_CHIP);
        if (chipAncestor != null &&
            backspacedAfterNode(mutation.target.nodeValue, mutation.oldValue)) {
          // User backspaced after mention chip; delete chip
          removeMentionChip(chipAncestor);
        }
      });
    });
  }
  MentionChipDeletionObserver.observe(
      target,
      {characterData: true, characterDataOldValue: true, subtree: true});
}

/**
 * Return true if the user tried to delete the last character of the node (i.e.
 * a backspace operation).
 * @param {string} newValue: value of the mutated node
 * @param {string} oldValue: previous value of the node, before mutation
 * @return {boolean} true if backspace occurred, false otherwise
 */
function backspacedAfterNode(newValue, oldValue) {
  return (
      newValue.length == oldValue.length - 1 &&
      newValue == oldValue.substring(0, newValue.length));
}

var BodyMutationObserver;

/**
 * Registers mutation observers to observe any changes to the body
 */
registerMutationObservers = function() {
    var target = document.querySelector(DIV_BODY);
    if (!BodyMutationObserver) {
        BodyMutationObserver = new MutationObserver(function(mutations) {
            BodyChangeListener.onBodyChanged();
            addDirection(mutations);
            updateRangePosition();
            notifyHeightChange();
        });
    }

    var config = {childList:true, characterData: true, subtree: true,
            characterDataOldValue: true};
    BodyMutationObserver.observe(target, config);

    if (isWalletDiscoverEnabled()) {
        WALLET.registerMutationObserver();
    }
    registerDriveChipDeletionObserver();

    if (MENTION_ENABLED) {
      registerMentionObserver();
      registerMentionChipDeletionObserver();
    }
};

/**
 * Unregisters Drive chip deletion mutation observer.
 */
unregisterDriveChipDeletionObserver = function() {
    if (DriveChipDeletionObserver) {
        DriveChipDeletionObserver.disconnect();
    }
};

/**
 * Unregisters mention chip trigger mutation observer.
 */
unregisterMentionObserver = function() {
  if (MentionObserver) {
    MentionObserver.disconnect();
  }
};

/**
 * Unregisters mention chip deletion mutation observer.
 */
unregisterMentionChipDeletionObserver = function() {
  if (MentionChipDeletionObserver) {
    MentionChipDeletionObserver.disconnect();
  }
};

/**
 * Unregisters mutation observers.
 */
unregisterMutationObservers = function() {
    if (BodyMutationObserver) {
        BodyMutationObserver.disconnect();
    }
    if (isWalletDiscoverEnabled()) {
        WALLET.unregisterMutationObserver();
    }
    unregisterDriveChipDeletionObserver();

    if (MENTION_ENABLED) {
      unregisterMentionObserver();
      unregisterMentionChipDeletionObserver();
    }
};

/**
 * Add dir='auto' to new blank lines.
 * @param {Object} mutations array of mutations
 */
function addDirection(mutations) {
    if (!mutations) {
        return;
    }
    var addedNodes;
    var addedNode;
    for (i = 0; i < mutations.length; ++i) {
        addedNodes = mutations[i].addedNodes;
        if (!addedNodes) {
            continue;
        }
        for (j = 0; j < addedNodes.length; ++j) {
            addedNode = addedNodes[j];
            if (addedNode.nodeType == Node.ELEMENT_NODE &&
                    addedNode.tagName == 'DIV' &&
                    !(addedNode.className == CLASS_DRIVE_CHIP
                            || isDeleteButton(addedNode)) &&
                    !addedNode.getAttribute('dir')) {
                addedNode.setAttribute('dir', 'auto');
            }
        }
    }
}

/**
 * Sets the innerHTML of the <code><div.body></code> element
 * @param {string} newBody The html string of the new body.
 */
function setBody(newBody) {
    unregisterDriveChipDeletionObserver();
    getBody().innerHTML = newBody;
    stripRTLDiv();

    addDeleteButtons();
    registerDriveChipDeletionObserver();
}

/**
 * Strips "RTL div".
 * RTL div is the outermost div that has exactly one attribute: dir='auto'
 * This function strip that div tag, but retains its innerHTML. This RTL div
 * is stripped in order to prevent nested RTL divs.
 */
function stripRTLDiv() {
    var body = getBody();

    var children = body.childNodes;
    var attrs;
    if (children && children.length == 1) {
        attrs = children[0].attributes;

        if (attrs && attrs.length == 1
                && children[0].getAttribute('dir') == 'auto') {
            body.innerHTML = children[0].innerHTML;
        }
    }
}

/**
 * Intercept ENTER key to split blockquote regions into two to support inline
 * reply within quoted regions.
 * @param {KeyboardEvent} e The keydown event.
 * @private
 */
onEnterListener = function(e) {
    if (e.keyCode == KEYCODE_ENTER) {
        var selection = window.getSelection();
        if (selection == null || selection.anchorNode == null) {
            return;
        }
        if (!hasScalableAncestor(selection.anchorNode)) {
            return;
        }

        // Enter key deletes the current selection
        if (selection.rangeCount > 0) {
            var range = selection.getRangeAt(0);
            range.deleteContents();
        }

        var newDiv = document.createElement('div');
        newDiv.appendChild(document.createElement('br'));

        e.preventDefault();
        e.stopPropagation();

        insertElementAtSelection(newDiv, selection);
        setCaret(newDiv);
    }
};

/**
 * Handles deletion of the mention chip DOM element and reports its deletion to
 * the Java listener, which removes the corresponding recipient chip from the
 * to: field.
 * @param {node} chip The mention chip
 */
function removeMentionChip(chip) {
  var range = getRange();
  var address = chip.childNodes[0].getAttribute('href').split(':').pop();
  range.selectNode(chip);
  range.deleteContents();
  MentionChipDeletionListener.onMentionChipDeleted(address);
  BodyChangeListener.disableListPopupWindow();
}

/**
 * If the current range is inside a mention, return the mention text. A mention
 * token is a series of characters preceded by a + or @, containing 1 or fewer
 * whitespace characters.
 * @param {Range} range of current selection
 * @private
 * @return {string} mentionToken or null, if no mention is found
 */
function getMentionToken(range) {
  var line;
  // regex for mention pattern: one or two word token, with words separated by
  // space or non-breaking space only
  var pattern = /(?:^|\s)([+@]\S+(?:[^\v\t]\S*)?)$/;
  var result;
  if (range != null && range.collapsed &&
      range.startContainer.nodeValue != null) {
    line = range.startContainer.nodeValue.substring(
        0, range.startOffset + findNextWhitespace());
    result = pattern.exec(line);
    if (result != null && result.length > 1) {
      return result[1];
    }
  }
  return null;
}

/**
 * Autocomplete a mention and set the caret at the end.
 *  @param {string} html of mention chip
 *  @param {int} numCharactersEntered number of characters to replace
 *  @private
 */
function autocompleteMention(html, numCharactersEntered) {
  var range = getRange();
  if (range != null && range.collapsed &&
      range.startContainer.nodeValue != null) {
    range.setEnd(
        range.startContainer, range.startOffset + findNextWhitespace());
    range.setStart(
        range.startContainer, range.endOffset - numCharactersEntered);
    insertMentionChip(html);
    BodyChangeListener.disableListPopupWindow();
  }
}

/**
 * Return distance between caret position and next whitespace character or end
 * of line.
 * @return {int} distance between caret and end of current word
 */
function findNextWhitespace() {
  var range = getRange();
  if (range != null && range.startContainer.nodeValue != null) {
    return range.startContainer.nodeValue.substring(range.startOffset)
        .search(/\s|$/);
  }
}

/**
 * Should be called on load. Sets focus and registers an mutation observer on
 * the <code><div.body></code> element.
 */
onLoad = function() {
    body = document.querySelector(DIV_BODY);

    var images = document.getElementsByTagName('img');
    for (var i = 0; i < images.length; i++) {
      images[i].addEventListener('load', notifyHeightChange);
    }

    body.onpaste = function(e) {
        if (e.clipboardData && e.clipboardData.getData) {
            var htmlPaste = EditWebView.htmlPasteEnabled();
            var clipboardData = htmlPaste ?
                    e.clipboardData.getData('text/html') :
                    e.clipboardData.getData('text/plain');
            if (clipboardData) {
                body.contentEditable = false;
                if (htmlPaste) {
                    EditWebView.sanitizeHtml(clipboardData);
                } else {
                    EditWebView.escapePlainText(clipboardData);
                }
                return false;
            }
        }
        return true;
    };

    body.focus();
    stripRTLDiv();

    body.addEventListener('keydown', onEnterListener);

    // Add X button to drive chips
    addDeleteButtons();

    if (isWalletDiscoverEnabled()) {
        WALLET.init(body);
    }

    registerMutationObservers();

    if (INIT_SIGNATURE) {
        initSignature();
    }

    if (SHOW_ELIDED) {
        expandElidedText();
    }

    if (DomContentListener) {
        DomContentListener.onDomContentLoaded(EditWebView);
    }

    // JS is reporting incorrect height when asked for height immediately after
    // onLoad even though HTML doesn't change. Adding a timeout of 100ms to
    // counter that. Even though HTML has not changed in the meantime, it now
    // reports the correct height.
    setTimeout(notifyHeightChange, 100);
};

/**
 * Reports current height of the webview. Also keeps track of previous
 * height so that we don't unnecessarily report the height if it's
 * same as the previous height.
 */
notifyHeightChange = function() {
  var newContainerHeight = document.body.offsetHeight;
  if (newContainerHeight != prevContainerHeight) {
    prevContainerHeight = newContainerHeight;
    // Update after a timeout to avoid flickering.
    setTimeout(function() {
      EditWebView.updateHeight(
          Math.ceil(newContainerHeight * window.devicePixelRatio));
    }, 0);
  }
};

document.addEventListener("selectionchange", function(event) {
    RichTextStateChangeListener.onRichTextStateChanged(
            document.queryCommandState("bold"),
            document.queryCommandState("italic"),
            document.queryCommandState("underline"),
            document.queryCommandValue("foreColor"),
            document.queryCommandValue("backColor")
    );
    updateRangePosition();
});

document.addEventListener("click", function(e) {
    var target = e.target;

    if (target.className &&
            (isDeleteButton(target) ||
            target.className == DRIVE_CHIP_DELETE_BUTTON_ICON)) {
      var chip = getChipAncestor(target, 'DIV', DIV_DRIVE_CHIP);
      if (chip) {
        chip.remove();
        }
    }
});

/**
 * Adds delete buttons to drive chips.
 * Also, changes position attribute and contentEditable attribute.
 */
function addDeleteButtons() {
    var driveChips = document.querySelectorAll(DIV_DRIVE_CHIP);

    unregisterMutationObservers();

    var newChips = [];
    for (i = 0; i < driveChips.length; ++i) {
        var chip = driveChips[i];
        // check if the chip already has delete button
        if (!hasDeleteButton(chip)) {
            // Make position relative so that the delete button shows correctly
            chip.style.position = 'relative';
            // Make it read-only
            chip.setAttribute('contentEditable', 'false');

            var button = document.createElement('div');
            button.className = DRIVE_CHIP_DELETE_BUTTON;
            var icon = document.createElement('div');
            icon.className = DRIVE_CHIP_DELETE_BUTTON_ICON;
            button.appendChild(icon);

            driveChips[i].appendChild(button);
            newChips.push(chip);
        }
    }

    newChips.forEach(rtlifyDeleteButton);

    registerMutationObservers();
}

/**
 * Returns whether the node has a delete button
 * @param {Node} node to check
 * @return {boolean} whether the node has a delete button
 */
function hasDeleteButton(node) {
    var children = node.childNodes;
    if (!children) {
        return false;
    }
    for (var i = 0; i < children.length; ++i) {
        if (isDeleteButton(children[i])) {
            return true;
        }
    }

    return false;
}

/**
 * Returns whether a node is a Drive chip delete button
 * @param {Node} node to check
 * @return {boolean} whether the node is a delete button for a drive chip
 */
function isDeleteButton(node) {
    return node.classList && (node.classList.contains(DRIVE_CHIP_DELETE_BUTTON)
            || node.classList.contains(DRIVE_CHIP_DELETE_RTL_BUTTON));
}

/**
 * Returns whether a node is a mention chip
 * @param {Node} node to check
 * @return {boolean} whether the node is a mention chip
 */
function isMentionChip(node) {
  return node.class && node.class == CLASS_MENTION_CHIP;
}

/**
 * Notifies that range has changed
 */
function updateRangePosition() {
    // Using setTimeout to avoid flicker.
    // setTimeout() causes at least 4ms delay, which seems to skip flickering.
    window.setTimeout(function() {
        var selection = window.getSelection();
        var range = selection.getRangeAt(0);
        var boundingRect;
        var cloneRange = range.cloneRange();
        cloneRange.setStart(selection.focusNode, selection.focusOffset);
        cloneRange.setEnd(selection.focusNode, selection.focusOffset);
        var rects = cloneRange.getClientRects();
        // rects.length is 0 when focusNode is an element node.
        if (rects.length == 0) {
            // Find the closest element node that we can get the
            // boundingClientRect from.
            boundingRect = findElementNodeFrom(selection.focusNode)
                    .getBoundingClientRect();
            // But it is not good enough, the div could be the whole body.
            // A too big scroll rectangle would not allow scrolling.
            // Now, find if there is bounding rect at the focusOffset of
            // focusNode.
            if (selection.focusNode.nodeType == Node.ELEMENT_NODE) {
                var node =
                        selection.focusNode.childNodes[selection.focusOffset];
                if (node && node.nodeType == Node.ELEMENT_NODE
                        && node.getClientRects().length > 0) {
                    boundingRect = node.getBoundingClientRect();
                }
            }
        } else if (rects.length == 1) {
            // This is needed instead of using getBoundingClientRect().
            // See b/33416019
            boundingRect = rects[0];
        } else {
            boundingRect = cloneRange.getBoundingClientRect();
        }

        EditWebView.updateRangePosition(
                boundingRect.left, boundingRect.top,
                boundingRect.right, boundingRect.bottom);
    });
}

document.addEventListener('DOMContentLoaded', onLoad);

/**
 * Expands the elided text.
 */
function expandElidedText() {
    var elided = document.body.querySelector("div.elided_text");
    var body = document.body.querySelector(DIV_BODY);

    var signature = document.body.querySelector(GMAIL_SIGNATURE_SELECTOR);

    var expandedBody = "<div>" + body.innerHTML;
    if (!signature) {
        // Add a line break as long as there is no signature. If there is a
        // signature, it's wrapped around a <div> which shows as a block
        // already.
        expandedBody += "<br>";
    }
    expandedBody += elided.innerHTML + "</div>";
    setBody(expandedBody);

    // TODO(b/26780177): maintain selection
    body.focus();

    notifyHeightChange();
}

/**
 * Notifies that range has changed when an imaged is loaded.
 */
imageOnLoad = function() {
    notifyHeightChange();
    // Adding a timeout to update the range position after the height change is
    // reported and webview has updated the layout. A more robust approach would
    // be to fire an event when webview layout has changed and register a
    // listener to call updateRangePosition() but the current approach suffices
    // for now.
    setTimeout(updateRangePosition, 200);
};

/**
 * Sets the elided text.
 * @param {string} elidedText
 */
function setElidedText(elidedText) {
    var elided = document.body.querySelector("div.elided_text");
    elided.innerHTML = elidedText;
}

/**
 * Inserts an image with the given url.
 * @param {string} url string of the image
 */
function insertImage(url) {
    var range = getRange();
    if (range) {
        range.deleteContents();

        var endBr = document.createElement('br');
        var img = document.createElement('img');
        img.style.maxWidth = INLINE_IMAGE_MAXWIDTH;
        img.style.height = "auto";
        img.addEventListener('load', imageOnLoad);

        range.insertNode(endBr);
        if (!isBlankLine(endBr.nextSibling)) {
            range.insertNode(document.createElement('br'));
        }
        range.insertNode(img);
        if (!isBlankLine(img.previousSibling)) {
            range.insertNode(document.createElement('br'));
        }

        setCaretBefore(endBr.nextSibling || endBr);
        // When an image is load, it will scroll to the caret position. We want
        // to ensure it happens after the caret is correctly set.
        // Setting img.src will start loading the image. Hence, we put it after
        // setCaretBefore().
        img.src = url;
    } else {
        var html = "<br><img src='" + url
                + "' style='max-width: " + INLINE_IMAGE_MAXWIDTH
                + "; height: auto;'><br><br>";
        document.execCommand('insertHTML', false, html);
    }
}

/**
 * Inserts a drive chip with the given html.
 * @param {string} html string of the chip
 */
function insertDriveChip(html) {
  // The latter <br> tag needs to be wrapped with a <div> to make sure
  // that user can set the cursor to the end of the chip. Otherwise, it
  // causes http://b/29584269#comment8
  var chipHtml = '<br>' + html + '<div><br></div>';
  insertChip(chipHtml, 'div', DIV_DRIVE_CHIP);
}

/**
 * Appends Drive chip(s) with the given html.
 * @param {string} html string of the chip(s)
 * @return {node} Added chip
 */
function appendDriveChips(html) {
  return appendChips(html);
}

/**
 * Inserts a mention chip with the given html.
 * @param {string} html string of the chip
 */
function insertMentionChip(html) {
  insertChip(html, 'span', SPAN_MENTION_CHIP);
}

/**
 * Inserts a chip with the given html.
 * @param {string} html string of the chip
 * @param {string} tag div or span
 * @param {string} divType DIV_DRIVE_CHIP or SPAN_MENTION_CHIP
 */
function insertChip(html, tag, divType) {
  var range = getRange();
  var endNode;
  var chip;
  if (range && range.startContainer &&
      range.startContainer.isContentEditable !== false &&
      !getChipAncestor(range.startContainer, tag, divType)) {
    var temp = document.createElement(tag);
    temp.innerHTML = html;
    var children = temp.childNodes;
    chip = temp.querySelector(divType);
    range.deleteContents();
    endNode = temp.lastChild;
    for (var i = children.length - 1; i >= 0; --i) {
      range.insertNode(children[i]);
    }
    // Move the selection to the end
    setCaretAfter(endNode);
  } else {
    chip = appendChips(html);
  }
  if (divType == DIV_DRIVE_CHIP) {
    trimDriveChip(chip);
    rtlifyDeleteButton(chip);
  }
}

/**
 * Returns chip.
 * @param {node} node to check
 * @param {string} tag div or span
 * @param {string} divType DIV_DRIVE_CHIP or SPAN_MENTION_CHIP
 * @returns {node} Ancestor chip node
 */
function getChipAncestor(node, tag, divType) {
  return findHighestAncestorByTagAndClassName(
      node, tag,
      divType === DIV_DRIVE_CHIP ? CLASS_DRIVE_CHIP : CLASS_MENTION_CHIP);
}

/**
 * Adjusts drive chip's style if it's in an RTL element.
 * Namely, it replaces the delete button's style with the RTL version
 * @param {element} driveChip drive chip element that contains the delete button
 */
function rtlifyDeleteButton(driveChip) {
    var button = driveChip.querySelector('.' + DRIVE_CHIP_DELETE_BUTTON);
    if (button) {
        var direction = window.getComputedStyle(button).direction;
        if (direction == "rtl") {
            button.classList.remove(DRIVE_CHIP_DELETE_BUTTON);
            button.classList.add(DRIVE_CHIP_DELETE_RTL_BUTTON);
        }
    }
}

/**
 * Appends chip(s) with the given html.
 * @param {string} html string of the chip(s)
 * @return {node} Added chip
 */
function appendChips(html) {
  // The latter <br> tag needs to be wrapped with a <div> to make sure
  // that user can set the cursor to the end of the chip. Otherwise, it
  // causes http://b/29584269#comment8
  var temp = document.createElement('div');
  temp.innerHTML = html;
  var children = temp.childNodes;
  var chip = children[1];
  var body = getBody();
  for (var i = children.length - 1; i >= 0; --i) {
    body.appendChild(children[i]);
  }
  return chip;
}

/**
 * Trims a br tag from the front of a drive chip if necessary.
 * If there is a blank line before the chip was inserted, then it removes the
 * br tag from the front of the chip.
 * @param {node} chip Drive chip
 */
function trimDriveChip(chip) {
    if (!chip) {
        return;
    }
    var previous = chip.previousSibling;
    if (!previous) {
        return;
    }

    var prevPrev = previous.previousSibling;

    if (isBlankLine(prevPrev)) {
        previous.remove();
    }
}

/**
 * Returns whether the node is a blank node.
 * A br tag will be considered a blank line. A div tag with one br tag as its
 * only child will also be considered as a blank line.
 * @param {node} node to check
 * @return {boolean} True if it is considered a blank line. False otherwise.
 */
function isBlankLine(node) {
    if (!node) {
        return false;
    }

    if (node.nodeType == Node.ELEMENT_NODE) {
        if (node.tagName == 'BR') {
            return true;
        }
        if (node.tagName == 'DIV') {
            if (node.childNodes.length == 1
                    && node.childNodes[0].nodeType == Node.ELEMENT_NODE
                    && node.childNodes[0].tagName == 'BR') {
                return true;
            }
        }
    }
    return false;
}

/**
 * Updates placeholder Drive chips using urlMapString if possible, and then
 * gets all of the Drive chip URLs.
 * @param {string} urlMapString JSON map of save to Drive tags to Drive URLs
 * @return {Array} an array of urls of Drive chips
 */
function getDriveChipUrls(urlMapString) {
    var urlMap = JSON.parse(urlMapString);
    var urls = [];
    var chipData = document.querySelectorAll(DIV_DRIVE_CHIP + " > a");

    if (chipData) {
        for (var i = 0; i < chipData.length; ++i) {
            var href = chipData[i].getAttribute("href");
            if (href) {
                urls.push(href);
            } else {
                var rel = chipData[i].getAttribute("rel");
                if (rel && urlMap[rel]) {
                    urls.push(urlMap[rel]);
                    chipData[i].setAttribute("href", urlMap[rel]);
                    chipData[i].removeAttribute("rel");
                }
            }
        }
    }
    return JSON.stringify(urls);
}

/**
 * Initialize signature from div.signature_holder. It appends the signature to
 * the body if the body doesn't already have the signature
 */
function initSignature() {
    var signatureNode = document.body.querySelector(GMAIL_SIGNATURE_SELECTOR);
    var signatureHolder
            = document.body.querySelector('div.' + SIGNATURE_HOLDER);
    if (!signatureNode && signatureHolder.innerHTML != '') {
        setSignature(signatureHolder.innerHTML);
    }
}

/**
 * Sets new signature. If there is an old signature, the old signature is
 * trimmed and then new signature is appended.
 * @param {string} signature new signature
 */
function setSignature(signature) {
    var body = document.body.querySelector(DIV_BODY);

    if (!body.innerHTML.trim() && signature) {
        // The body should have two blank lines above signature
        body.innerHTML = '<br><br>';
    }

    var signatureNode = document.body.querySelector(GMAIL_SIGNATURE_SELECTOR);
    unregisterMutationObservers();
    // Create the signature node, if needed
    if (!signatureNode) {
        signatureNode = document.createElement('div');
        signatureNode.setAttribute(GMAIL_SIGNATURE_ATTR, GMAIL_SIGNATURE);
        body.appendChild(signatureNode);
    }

    // Strip old signature.
    var signatureInnerHTML = signatureNode.innerHTML;
    var signatureHolder
            = document.body.querySelector('div.' + SIGNATURE_HOLDER);
    var oldSignature = signatureHolder.innerHTML;
    var oldSignatureIndex = signatureInnerHTML.lastIndexOf(oldSignature);

    if (oldSignatureIndex >= 0 &&
            oldSignatureIndex
                    == signatureInnerHTML.length - oldSignature.length) {
        signatureNode.innerHTML
                = signatureInnerHTML.substring(0, oldSignatureIndex);
    }

    // Append new signature.
    signatureNode.innerHTML += signature;
    // Update div.signature_holder
    signatureHolder.innerHTML = signature;

    notifyHeightChange();

    // If the signature node is empty, then delete it
    if (!signatureNode.innerHTML.trim()) {
        body.removeChild(signatureNode);

        var bodyInnerHTML = body.innerHTML.trim();
        // If the body is basically empty after we remove the signature, then
        // make it completely empty (to show the hint)
        if (!bodyInnerHTML || bodyInnerHTML == '<br>') {
            body.innerHTML = '';
        }
    }

    registerMutationObservers();
}

/**
 * Initializes selection to the end of the body (or right before the signature
 * if there is a signature).
 */
function initSelection() {
    if (isSelectionInitialized()) {
        // if initialized already, do nothing
        return;
    }
    var signature = document.body.querySelector(GMAIL_SIGNATURE_SELECTOR);
    if (signature) {
        var node;
        var prevSibling = signature.previousSibling;
        if (isBreakTag(prevSibling)) {
            var prevPrevSibling = prevSibling.previousSibling;
            if (isBreakTag(prevPrevSibling)) {
                // Two line breaks before the signature.
                node = prevPrevSibling;
            } else {
                // One line break before the signature.
                node = prevSibling;
            }
        } else {
            // No line breaks before the signature
            node = signature;
        }
        setCaretBefore(node);
    } else {
        // No signature. Just set it to end of the body
        setCaretEnd();
    }
}

/**
 * Returns if the selection has been initialized.
 * @returns {boolean} whether the selection has been initialized
 */
function isSelectionInitialized() {
    var sel = window.getSelection();
    // Multiple ranges? Initialized
    if (sel.rangeCount > 1) {
        return true;
    }
    var range = sel.getRangeAt(0);
    // Not collapsed range? Initialized
    if (!range.collapsed) {
        return true;
    }
    // Range not at the beginning or at the end? Initialized
    if (range.startOffset != 0
            && range.endOffset != range.startContainer.length) {
        return true;
    }
    return false;
}

/**
 * Expands selection to include all of driveChip
 * @param {Object} selection Selection to expand
 * @param {Object} driveChip Drive chip node to include
 */
function selectDriveChip(selection, driveChip) {
    var range = document.createRange();
    range.selectNode(driveChip);
    selection.addRange(range);
}

/**
 * Adapted from goog.editor.plugins.Blockquote.prototype.splitQuotedBlockW3C_.
 * It splits parentNode at the position specified by cursorNode and offset.
 * @param {!Node} cursorNode The node containing the split position.
 * @param {number} offset The offset within the cursorNode indicating the split
 *     position.
 * @param {!Node} parentNode The topmost node that will be split.
 * @return {!Array.<!Node>} first half and second half after split.
 * @private
 */
function split(cursorNode, offset, parentNode) {
    var secondHalf, textNodeToRemove;

    // There are two special conditions that we account for here.
    //
    // 1. Whenever the cursor is after (one<BR>|) or just before a BR element
    //    (one|<BR>) and the user presses enter, the second quoted block starts
    //    with a BR which appears to the user as an extra newline. This stems
    //    from the fact that we create two text nodes as our split boundaries
    //    and the BR becomes a part of the second half because of this.
    //
    // 2. When the cursor is at the end of a text node with no siblings and
    //    the user presses enter, the second blockquote might contain an
    //    empty subtree that ends in a 0 length text node. We account for that
    //    as a post-splitting operation.
    if (cursorNode.nodeType == Node.TEXT_NODE) {
        if (offset == cursorNode.length) {
            var siblingNode = cursorNode.nextSibling;

            // This accounts for the condition where the cursor appears at the
            // end of a text node and right before the BR eg: one|<BR>. We
            // ensure that we split on the BR in that case.
            if (siblingNode && siblingNode.tagName == 'BR') {
                // NOTE(paulyagng): In the case where the cursorNode is a top
                // level element (parentNode == cursorNode), parentNode will not
                // be an ancestor of siblingNode. We need to update it here;
                // otherwise, the input aprameter we provide to
                // goog.editor.node.splitDomTreeAt below will be incorrect. See
                // b/28368859 for more detail.
                if (parentNode == cursorNode) {
                    parentNode = siblingNode;
                }
                cursorNode = siblingNode;
                // This might be null but splitDomTreeAt accounts for the null
                // case.
                secondHalf = siblingNode.nextSibling;
            } else {
                textNodeToRemove = cursorNode.splitText(offset);
                secondHalf = textNodeToRemove;
            }
        } else {
            secondHalf = cursorNode.splitText(offset);
        }
    } else if (cursorNode.tagName == 'BR') {
        // This might be null but splitDomTreeAt accounts for the null case.
        secondHalf = cursorNode.nextSibling;
    } else {
        // The selection is in a line that is empty. Create two empty text nodes
        // to split between.
        cursorNode = insertEmptyTextNodeBeforeRange();
        secondHalf = insertEmptyTextNodeBeforeRange();
    }

    secondHalf = splitDomTreeAt(cursorNode, secondHalf, parentNode);
    if (secondHalf) {
        insertSiblingAfter(secondHalf, parentNode);
    }

    // We need to account for the condition where the second blockquote
    // might contain an empty DOM tree. This arises from trying to split
    // at the end of an empty text node. We resolve this by walking up the tree
    // till we either reach the blockquote or till we hit a node with more
    // than one child. The resulting node is then removed from the DOM.
    if (textNodeToRemove) {
        findAndRemoveSingleChildAncestor(textNodeToRemove, secondHalf);
    }
    return [parentNode, secondHalf];
}

/**
 * Inserts an empty text node before current selected range.
 * @return {!Node} The empty text node.
 * @private
 */
function insertEmptyTextNodeBeforeRange() {
    var range = getRange();
    var textNode = document.createTextNode('');
    range.insertNode(textNode);
    return textNode;
}

/**
 * Gets current selection range.
 * @return {Range} the current range or null if there is no selection.
 * @private
 */
function getRange() {
    var selection = window.getSelection();
    if (!selection || selection.rangeCount == 0) {
        return null;
    }
    return selection.getRangeAt(0);
}


/**
 * Finds the top level blockquote element:
 * one that is direct child of draft container.
 * @param {!Node} node The node whose ancestors are to be searched.
 * @return {?Node} The found node, or null if not found.
 * @private
 */
function findTopLevelBlockQuote(node) {
    var body = document.querySelector(DIV_BODY);
    return getAncestor(node, function(node) {
        return node.parentNode == body;
    }, true /* opt_includeNode */);
}

/**
 * Walks up the DOM hierarchy returning the node or first ancestor that has
 * nodeType equal to Node.ELEMENT_NODE.
 * matcher function.
 *
 * @param {!Node} node The DOM node to start with.
 * @return {?Node} The found node, or null if not found.
 */
function findElementNodeFrom(node) {
    if (node == null){
        return null;
    }
    if (node.nodeType == Node.ELEMENT_NODE) {
        return node;
    }
    return findElementNodeFrom(node.parentNode);
}

/**
 * @param {!Node} element The element to check.
 * @return {boolean} True if the given element has a scalable ancestor.
 * @private
 */
function hasScalableAncestor(element) {
    // Regular blockquote case
    var node = findHighestAncestorByTagAndClassName(element, 'BLOCKQUOTE');
    if (node != null) {
        return true;
    }

    // Check if quoted text is for Forward
    var forwardNode = findHighestAncestorByTagAndClassName(
                    element, 'DIV', 'gmail_forwarded');
    return forwardNode != null;
}

/**
 * Find the highest ancestor with specified tag name and class name.
 * @param {!Node} node The node whose ancestors are to be searched.
 * @param {string} tag The tag name to match.
 * @param {string=} opt_className The class name to match.
 * @return {Node} The found node, or null if not found.
 * @private
 */
function findHighestAncestorByTagAndClassName(node, tag, opt_className) {
    return findHighestAncestor(node, function(node) {
        return node.tagName == tag && (
            !opt_className || node.className == opt_className);
    });
}

/**
 * Find the highest ancestor that passes the matcher function.
 * @param {!Node} node The node whose ancestors are to be searched.
 * @param {function(Node) : boolean} matcher A function that returns true if
 *    the passed in node matches the desired criteria.
 * @return {Node} The found node, or null if not found.
 * @private
 */
function findHighestAncestor(node, matcher) {
    var ancestor = null;
    var searchResult;
    while (searchResult = getAncestor(node, matcher)) {
        ancestor = searchResult;
        node = searchResult;
    }
    return ancestor;
}

/**
 * Walks up the DOM hierarchy returning the first ancestor that passes the
 * matcher function.
 * Forked from goog.dom.getAncestor.
 * @param {Node} element The DOM node to start with.
 * @param {function(Node) : boolean} matcher A function that returns true if the
 *     passed node matches the desired criteria.
 * @param {boolean=} opt_includeNode If true, the node itself is included in
 *     the search (the first call to the matcher will pass startElement as
 *     the node to test).
 * @param {number=} opt_maxSearchSteps Maximum number of levels to search up the
 *     dom.
 * @return {Node} DOM node that matched the matcher, or null if there was
 *     no match.
 */
function getAncestor(element, matcher, opt_includeNode, opt_maxSearchSteps) {
    if (!opt_includeNode) {
        element = element.parentNode;
    }
    var steps = 0;
    while (element &&
            (opt_maxSearchSteps == null || steps <= opt_maxSearchSteps)) {
        if (matcher(element)) {
            return element;
        }
        element = element.parentNode;
        steps++;
    }
    // Reached the root of the DOM without a match
    return null;
}

/**
 * Inserts provided element into position specified by selection. The element
 * will be added right under draft container.
 * @param {!Element} node The element to insert.
 * @param {!Selection} selection
 * @private
 */
function insertElementAtSelection(node, selection) {
    var anchorNode = selection.anchorNode;
    if (!anchorNode) {
        // Don't expect to happen.
        return;
    }
    var ancestor = findTopLevelBlockQuote(anchorNode);
    if (ancestor) {
        var twoHalves = split(anchorNode, selection.anchorOffset, ancestor);
        insertSiblingAfter(node, twoHalves[0]);
        // TODO (b/30075191) Doesn't delete selection if length > 0.
    }
}

/**
 * Walks up the DOM hierarchy returning the first ancestor that passes the
 * matcher function.
 * Forked from goog.dom.getAncestor
 * @param {Node} element The DOM node to start with.
 * @param {function(Node) : boolean} matcher A function that returns true if the
 *     passed node matches the desired criteria.
 * @param {boolean=} opt_includeNode If true, the node itself is included in
 *     the search (the first call to the matcher will pass startElement as
 *     the node to test).
 * @param {number=} opt_maxSearchSteps Maximum number of levels to search up the
 *     dom.
 * @return {Node} DOM node that matched the matcher, or null if there was
 *     no match.
 */
function getAncestor(
        element, matcher, opt_includeNode, opt_maxSearchSteps) {
    if (!opt_includeNode) {
        element = element.parentNode;
    }
    var steps = 0;
    while (element &&
            (opt_maxSearchSteps == null || steps <= opt_maxSearchSteps)) {
        if (matcher(element)) {
            return element;
        }
        element = element.parentNode;
        steps++;
    }
    // Reached the root of the DOM without a match
    return null;
}

/**
 * Splits off a subtree.
 * Forked from goog.editor.node.splitDomTreeAt
 * @param {!Node} currentNode The starting splitting point.
 * @param {Node=} opt_secondHalf The initial leftmost leaf the new subtree.
 *     If null, siblings after currentNode will be placed in the subtree, but
 *     no additional node will be.
 * @param {Node=} opt_root The top of the tree where splitting stops at.
 * @return {!Node} The new subtree.
 */
function splitDomTreeAt(currentNode, opt_secondHalf, opt_root) {
    var parent;
    while (currentNode != opt_root && (parent = currentNode.parentNode)) {
        opt_secondHalf = getSecondHalfOfNode(
                parent, currentNode, opt_secondHalf);
        currentNode = parent;
    }
    return /** @type {!Node} */ (opt_secondHalf);
}

/**
 * Creates a clone of node, moving all children after startNode to it.
 * When firstChild is not null or undefined, it is also appended to the clone
 * as the first child.
 * Forked from goog.editor.node.getSecondHalfOfNode_.
 * @param {!Node} node The node to clone.
 * @param {!Node} startNode All siblings after this node will be moved to the
 *     clone.
 * @param {Node|undefined} firstChild The first child of the new cloned element.
 * @return {!Node} The cloned node that now contains the children after
 *     startNode.
 * @private
 */
function getSecondHalfOfNode(node, startNode, firstChild) {
    var secondHalf = /** @type {!Node} */ (node.cloneNode(false));
    while (startNode.nextSibling) {
        secondHalf.appendChild(startNode.nextSibling);
    }
    if (firstChild) {
        secondHalf.insertBefore(firstChild, secondHalf.firstChild);
    }
    return secondHalf;
}

/**
 * Find highest single child ancestor with
 * findHighestSingleChildAncestor and remove it.
 * @param {!Node} node The node whose ancestors are to be searched.
 * @param {Node} root The root node to stop the search at.
 * @private
 */
function findAndRemoveSingleChildAncestor(node, root) {
    var ancestor = findHighestSingleChildAncestor(node, root);
    removeNode(ancestor || node);
}

/**
 * Find the highest ancestor that has no branches on the path between it and the
 * given node.
 * @param {!Node} node The node whose ancestors are to be searched.
 * @param {Node} root The root node to stop the search at.
 * @return {!Node} The found node, or the original node.
 * @private
 */
function findHighestSingleChildAncestor(node, root) {
    var ancestor;
    var parentNode = node.parentNode;
    while (parentNode && parentNode != root &&
            parentNode.childNodes.length == 1) {
        ancestor = parentNode;
        parentNode = parentNode.parentNode;
    }
    return ancestor ? ancestor : node;
}

/**
 * Removes a node from its parent.
 * Forked from goog.dom.removeNode
 * @param {Node} node The node to remove.
 * @return {Node} The node removed if removed; else, null.
 * @private
 */
function removeNode(node) {
    return node && node.parentNode ? node.parentNode.removeChild(node) : null;
}

/**
 * Sets selection at the beginning of the node
 * @param {Node} node to set selection on
 * @private
 */
function setCaret(node) {
    var range = document.createRange();
    range.setStart(node, 0);
    range.collapse(true);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    range.detach();
}

/**
 * Sets the caret right before the given node.
 * @param {Node} node Caret will be set before this Node
 */
function setCaretBefore(node) {
    var range = document.createRange();
    range.setStartBefore(node);
    range.setEndBefore(node);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    range.detach();
}

/**
 * Sets the caret right after the given node.
 * @param {Node} node Caret will be set after this Node
 */
function setCaretAfter(node) {
    var range = document.createRange();
    var sel = window.getSelection();
    range.setStartAfter(node);
    range.setEndAfter(node);
    sel.removeAllRanges();
    sel.addRange(range);
    range.detach();
}

/**
 * Sets the caret to the end of the body (after the signature even if the
 * signature exists).
 */
function setCaretEnd() {
    var range = document.createRange();
    var node = document.querySelector(DIV_BODY);
    var offset = node.childNodes.length;
    range.setStart(node, offset);
    range.setEnd(node, offset);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    range.detach();
}

/**
 * Checks if the given node is a {@code <BR>} tag
 * @param {Node} node Node to check
 * @return {boolean} whether the given node is a {@code <BR>} tag
 */
function isBreakTag(node) {
    return node
            && node instanceof Element
            && node['tagName'] === "BR";
}

/**
 * Inserts a new node after an existing reference node (i.e. as the next
 * sibling). If the reference node has no parent, then does nothing.
 * Forked from goog.dom.insertSiblingAfter.
 * @param {Node} newNode Node to insert.
 * @param {Node} refNode Reference node to insert after.
 * @private
 */
function insertSiblingAfter(newNode, refNode) {
    if (refNode.parentNode) {
        refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
    }
}

/**
 * Inserts a sanitized html callback from EditWebView.
 * @param {string} html - the sanitized html
 */
function insertSanitizedHtml(html) {
    document.body.querySelector(DIV_BODY).contentEditable = true;
    if (html) {
        document.execCommand('insertHTML', false, html);
    }
}

/**
 * Sets the Wallet discoverability green underlines visibility.
 * @param {boolean} visible true if the green underlines are to be visible.
 */
function setWalletDiscoverVisibility(visible) {
  if (isWalletDiscoverEnabled()) {
    WALLET.setDiscoverVisibility(visible);
  }
}

/**
 * Determines if WALLET_DISCOVER is enabled.
 * @return {boolean} true if WALLET_DISCOVER (green underline) is enabled and if
 *     the Chrome version is advanced enough for the JS code in wa_discover.js
 * @private
 */
function isWalletDiscoverEnabled() {
    return getChromeMajorVersion(navigator.userAgent) >= 41
            && typeof WALLET_DISCOVER !== 'undefined'
            && WALLET_DISCOVER;
}

/**
 * Gets the Chrome major version.
 * @param {string} userAgent the user agent (i.e. navigator.userAgent)
 * @return {number} the Chrome major version based on the user agent
 * @private
 */
function getChromeMajorVersion(userAgent) {
  var match = userAgent.match(/Chrome\/(\d+)\./);
  if (match) {
    return parseInt(match[1]);
  } else {
    return -1;
  }
}
