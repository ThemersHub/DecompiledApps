/**
 * This is checked by draft_editor.js for whether to register our
 * MutationObserver.
 */
const WALLET_DISCOVER = true;

let WALLET = (function() {
  /**
   * Class name for span elements containing money amounts, used while green
   * underlines are to be enabled.
   */
  const MONEY_CLASS_NAME = 'money';

  let rootNode;
  let mutationObserver;
  /**
   * @type {Array<Array<number>>}
   */
  let keywordHashSequences = [];
  /**
   * A Set of all text nodes known to contain keywords.
   * @type {!Set<!Node>}
   */
  let textNodesWithKeywords = new Set();

  /**
   * A set of all span.money elements created to wrap money amounts.
   * @type {!Set<!Element>}
   */
  let spanMoneyElements = new Set();

  /**
   * A Set of all nodes collected by the mutation event listener but which
   * have not yet been processed.
   * @type {!Set<!Node>}
   */
  let unprocessedTextNodes = new Set();

  let isDiscoverVisible = false;

  /**
   * Whether nodes should be processed on the next mutation event. This boolean
   * is required because the trigger to process mutations happens in the
   * textInput event, which occurs before any mutations have happened.
   * @type {boolean}
   */
  let shouldProcessNodes = false;

  /**
   * MutationObserver callback which performs all operations necessary to
   * detect money amounts in the email draft and decorate them with green
   * underlines to surface the Wallet attachments feature.
   * @param {Array<MutationRecord>} mutations The latest mutations reported by
   *     the MutationObserver
   */
  function processMutations(mutations) {
    if (keywordHashSequences.length == 0) {
      return;
    }

    let changedOrAddedTextNodes = new Set();
    let removedTextNodes = new Set();

    for (let mutation of mutations) {
      if (mutation.type === 'characterData') {
        changedOrAddedTextNodes.add(mutation.target);
      } else if (mutation.type === 'childList') {
        collectAllTextNodes(mutation.addedNodes, changedOrAddedTextNodes);
        collectAllTextNodes(mutation.removedNodes, removedTextNodes);
      }
    }

    // Keep accounting for number of text nodes which contain keywords
    for (let textNode of changedOrAddedTextNodes.values()) {
      if (textNodeContainsKeywords(textNode)) {
        textNodesWithKeywords.add(textNode);
      } else {
        textNodesWithKeywords.delete(textNode);
      }
      unprocessedTextNodes.add(textNode);
    }
    for (let removedTextNode of removedTextNodes.values()) {
      if (textNodeContainsKeywords(removedTextNode)) {
        textNodesWithKeywords.delete(removedTextNode);
      }
      unprocessedTextNodes.delete(removedTextNode);
    }

    // This isn't totally critical but keeps the set from growing
    // without bound.
    spanMoneyElements = filterSet(spanMoneyElements, isDescendantOfRoot);
    textNodesWithKeywords =
        filterSet(textNodesWithKeywords, isDescendantOfRoot);
    unprocessedTextNodes = filterSet(unprocessedTextNodes, isDescendantOfRoot);

    if (shouldProcessNodes) {

      // Node processing can trigger another processing cycle under some edge
      // cases. There's no chance for infinite recursion, but it does mean
      // we need to set this boolean here.
      shouldProcessNodes = false;

      try {
        // Unregister our MutationObserver so we don't trigger
        // ourselves into an infinite recursion.
        walletImpl.unregisterMutationObserver();
        processUnprocessedNodes();
      } catch (err) {
        console.log(err);
      } finally {
        walletImpl.registerMutationObserver();
      }
    }
    updateAllSpanMoneyElementStates();
  }

  function processUnprocessedNodes() {
    unprocessedTextNodes.forEach(node => {
      if (node.parentNode) {
        decorateMoneyAmounts(node.parentNode);
      }
    });
    unprocessedTextNodes.clear();
  }

  /**
   * Creates a new set containing elements matching the predicate function.
   * @param {!Set<?>} set ES6 set
   * @param {!function(?):boolean} predicate Predicate function to test on each
   *     value of the set.
   * @return {!Set<?>}
   */
  function filterSet(set, predicate) {
    const newSet = new Set();

    set.forEach(value => {
      if (predicate(value)) {
        newSet.add(value);
      }
    });

    return newSet;
  }

  function onMoneyAmountClicked(e) {
    if (e.target === null
        || e.target.className !== MONEY_CLASS_NAME
        || !e.target.hasAttribute('uline')) {
      return;
    }

    let spanMoneyElement = e.target;
    let parsedMoneyAmount = walletImpl.findMoney(spanMoneyElement.innerText);
    if (parsedMoneyAmount) {
      let micros = parsedMoneyAmount.micros;
      let rect = getClientRect(spanMoneyElement);
      EditWebView.onMoneyAmountClicked(
          micros, rect.left, rect.top, rect.right, rect.bottom);
    }
  }

  function getClientRect(element) {
    // On some versions of WebView, getBoundingClientRect() might return an
    // empty DOMRect. See b/33416019
    if (element.getClientRects().length == 1) {
      return element.getClientRects()[0];
    } else {
      return element.getBoundingClientRect();
    }
  }

  /**
   * Collects all text nodes in a node list, including descendant text nodes of
   * elements in the list.
   * @param {NodeList} nodeList A list of nodes from which to collect text nodes
   * @param {Set<Node>} outSet A Set in which to store the collected nodes
   */
  function collectAllTextNodes(nodeList, outSet) {
    if (!nodeList) {
      return;
    }
    for (let node of nodeList) {
      if (node.nodeType === Node.TEXT_NODE) {
        outSet.add(node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        collectAllTextNodes(node.childNodes, outSet);
      }
    }
  }

  /**
   * Returns true if the given text node contains keywords.
   * @param {Node} textNode A text node
   * @return {boolean} true if the given text node contains a keyword
   */
  function textNodeContainsKeywords(textNode) {
    let wholeWordHashes = textNode.nodeValue
        .split(/[^\w]/)
        .filter(part => part.length > 0)
        .map(word => word.toLowerCase())
        .map(lcWord => walletImpl.javaStringHashCode(lcWord));
    for (let keywordHashSequence of keywordHashSequences) {
      if (arrayContains(wholeWordHashes, keywordHashSequence, 0)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Tests whether a sub-array appears in a larger array.
   * @param {Array} array The array which might contain a given smaller array
   * @param {Array} subArray The sub-array to search for in the larger array
   * @param {number} fromIndex The index within the larger array to start from
   * @return {boolean} true if subArray was found in array
   */
  function arrayContains(array, subArray, fromIndex) {
    if (subArray.length > 0) {
      let maybeResultIndex = array.indexOf(subArray[0], fromIndex);
      if (maybeResultIndex >= 0) {
        for (let i = 1; i < subArray.length; i++) {
          if (i + maybeResultIndex === array.length) {
            return false;
          } else if (subArray[i] !== array[maybeResultIndex + i]) {
            return arrayContains(array, subArray, maybeResultIndex + 1);
          }
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Schedules node processing when next mutation is observed. Used because
   * the trigger for when nodes should be processed happens in textInput and
   * keydown events, which happen before the mutation has occured.
   */
  function processNodesOnNextMutation() {
    shouldProcessNodes = true;
  }

  /**
   * Returns true if second parameter is a descendant of the first parameter.
   * @param {Node} possibleAncestor The node which would be the ancestor
   * @param {Node} node The node which would be the descendant
   * @return {boolean} true if node is a descendant of possibleAncestor
   */
  function isDescendant(possibleAncestor, node) {
    if (!node.parentNode) {
      return false;
    } else if (node.parentNode === possibleAncestor) {
      return true;
    } else {
      return isDescendant(possibleAncestor, node.parentNode);
    }
  }

  /**
   * @param {!Node} node Any DOM node.
   * @return {boolean} Whether the given node is a descendant of the node
   *     being watched by this Wallet module.
   */
  function isDescendantOfRoot(node) {
    return isDescendant(rootNode, node);
  }

  /**
   * Decorates money amounts in the given node's child text nodes.
   * @param {Node} node A node containing text nodes
   */
  function decorateMoneyAmounts(node) {
    if (node.className === MONEY_CLASS_NAME) {
      node = node.parentNode;
    }
    removeSpanMoneyDecorations(node);
    decorateMoneyAmountsInChildNodeList(node.firstChild);
  }

  /**
   * Recursively processes a linked list of an element node's children,
   * decorating money amounts.
   * @param {Node} childNode A child of an element node. When called initially
   *     (i.e. not recursively), it should be given the first child of an
   *     element node.
   */
  function decorateMoneyAmountsInChildNodeList(childNode) {
    if (childNode === null) {
      return;
    } else if (childNode.nodeType !== Node.TEXT_NODE) {
      decorateMoneyAmountsInChildNodeList(childNode.nextSibling);
      return;
    }

    let parsedMoneyAmount = walletImpl.findMoney(childNode.nodeValue);
    if (parsedMoneyAmount === null) {
      decorateMoneyAmountsInChildNodeList(childNode.nextSibling);
      return;
    }

    let moneyText = parsedMoneyAmount.text;
    let moneyIndex = parsedMoneyAmount.index;

    // Preserve caret if necessary
    let sel = window.getSelection();
    let caretOffset = -1;
    if (sel.anchorNode === childNode) {
      caretOffset = sel.anchorOffset;
    }

    let moneyTextNode = childNode;
    if (moneyIndex > 0) {
      moneyTextNode = moneyTextNode.splitText(moneyIndex);
    }
    moneyTextNode.splitText(moneyText.length);
    let spanMoneyElement = wrapInSpanMoney(moneyTextNode);
    moneyTextNode.parentNode.replaceChild(spanMoneyElement, moneyTextNode);

    // Restore caret if necessary
    if (caretOffset > moneyIndex + moneyText.length) {
      let newOffset = caretOffset - (moneyIndex + moneyText.length);
      walletImpl.setCaret(spanMoneyElement.nextSibling, newOffset);
    } else if (caretOffset > moneyIndex) {
      let newOffset = caretOffset - moneyIndex;
      walletImpl.setCaret(spanMoneyElement.firstChild, newOffset);
    } else if (caretOffset >= 0 && spanMoneyElement.previousSibling) {
      walletImpl.setCaret(spanMoneyElement.previousSibling, caretOffset);
    }

    // Continue on the tail
    decorateMoneyAmountsInChildNodeList(spanMoneyElement.nextSibling);
  }

  /**
   * Wraps a text node representing a money amount (e.g. "$10") in a
   * <code>span.money</code> node.
   * @param {Node} moneyTextNode The money amount text node to wrap
   * @return {Element} The wrapped <code>span</code> element
   */
  function wrapInSpanMoney(moneyTextNode) {
    let spanMoneyElement = document.createElement('span');
    spanMoneyElement.className = MONEY_CLASS_NAME;
    spanMoneyElement.innerText = moneyTextNode.nodeValue;
    spanMoneyElements.add(spanMoneyElement);
    return spanMoneyElement;
  }

  /**
   * Removes span.money decorations among a given node's child nodes.
   * @param {Node} node A node which might have span.money child nodes
   */
  function removeSpanMoneyDecorations(node) {
    let sel = window.getSelection();
    let caretNode = sel.anchorNode;
    let caretOffset = sel.anchorOffset;
    let spanMoneyElementRemoved = false;

    for (let childNode of node.childNodes) {
      if (childNode.className === MONEY_CLASS_NAME) {
        let spanMoneyElement = childNode;
        while (spanMoneyElement.firstChild) {
          node.insertBefore(spanMoneyElement.firstChild, spanMoneyElement);
        }
        node.removeChild(spanMoneyElement);
        spanMoneyElementRemoved = true;
      }
    }
    if (spanMoneyElementRemoved) {
      walletImpl.setCaret(caretNode, caretOffset);
      node.normalize();
    }
  }

  /**
   * Updates money class decorations on all span.money elements.
   */
  function updateAllSpanMoneyElementStates() {
    spanMoneyElements.forEach(updateSpanMoneyElementState);
  }

  /**
   * Updates money class decoration on span.money element based on whether
   * keywords are present and the discover feature is currently enabled.
   * @param {!Element} spanMoneyElement
   */
  function updateSpanMoneyElementState(spanMoneyElement) {
    // Spans are active if the contents exactly match our target regex:
    // Active: <span>$10.32</span>
    // Inactive: <span>$10.32abc</span>
    const text = spanMoneyElement.textContent;
    const match = walletImpl.findMoney(text);
    const isActiveSpanMoneyElement = match && match.text === text;

    if (isDiscoverVisible && textNodesWithKeywords.size > 0 &&
        isActiveSpanMoneyElement) {
      EditWebView.onMoneyAmountUnderlined();
      spanMoneyElement.setAttribute('uline', '');
    } else {
      spanMoneyElement.removeAttribute('uline');
    }
  }

  function onTextInput(event) {
    const inputString = event.data;
    if (!inputString) {
      return;
    }

    // It's possible for the textInput event string to be more than one char
    // (e.g. double tapping spacebar => '. ')
    const lastChar = inputString[inputString.length - 1];
    if (lastChar === ' ' || lastChar === '\n') {
      processNodesOnNextMutation();
    }
  }

  function onKeyUp(event) {
    let runner = window.getSelection().anchorNode;
    while (runner) {
      if (runner.className === MONEY_CLASS_NAME) {
        // Typically span money element states are updated in processMutations.
        // This handles the edge case where some languages have character
        // inputs which don't immediately result in a mutation (e.g. Japanese)
        updateSpanMoneyElementState(runner);
        return;
      }
      runner = runner.parentNode;
    }
  }

  /**
   * Handles blur event on container node. Nodes are typically processed on
   * particular triggers (e.g. space and line break) to sidestep IME keyboard
   * issues, but this leaves out a few edge cases (e.g. money amount is the
   * last thing entered) which is handled by the blur event.
   */
  function onBlur() {
    processUnprocessedNodes();
  }

  // TODO(bcsf): This is too US-centric. We need to eventually be able to
  // support other denominations, periods as digit grouping, commas as
  // decimal mark, etc.
  const MONEY_PATTERN =
    // Dollar amount $10
    '\\$([\\d,]*)' +

    // Cents if it exists $10.52
    '(\\.(\\d{1,2}))?' +

    // Exclude non punctuation.
    '(?=' +

        // Whitespace or end of string
        '\\s|$|&nbsp;|' +

        // Punctuation marks which can optionally follow the matched
        // dollar amount. These have a lookahead to ensure values
        // like $10.32.a and $10.abc are not matched.
        '[\\.|\\,|\\:|\\;|\\!|\\\'|\\"|\\?]+(?=\\s|$|&nbsp;)' +
    ')';

  const MONEY_REGEX = new RegExp(MONEY_PATTERN);

  let walletImpl = {
    isFeatureEnabled: true,

    // visible for testing
    findMoney: function(text) {
      let match = text.match(MONEY_REGEX);
      if (match) {
        let intPart = 0;
        let fracPart = 0;
        if (match[1]) {
          intPart = parseInt(match[1].replace(',', ''));
        }
        if (match[3]) {
          fracPart = parseInt(match[3]);
          if (match[3].length == 1) {
            fracPart *= 10;
          }
        }
        // Need to restrict to amounts less than $10,000
        if (intPart < 10000) {
          let micros = intPart * 1000000 + fracPart * 10000;
          if (micros > 0) {
            return {
              'text': match[0],
              'index': match.index,
              'micros': micros,
            };
          }
        }
      }
      return null;
    },

    /**
     * Performs the hash identical to that in java.lang.String#hashCode().
     * @param {string} str the string to hash
     * @return {number} a 32-bit hash of the given string
     */
    // visible for testing
    javaStringHashCode: function(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
          hash = 31 * hash + str.charCodeAt(i);
          // Ensure 32-bit signed integer.
          hash = hash & hash;
      }
      return hash;
    },

    /**
     * Initializes our state model of the email body. If there's already content
     * in the body (e.g. if there was a screen orientation or if the user's
     * continuing a draft), this will do a full pass to index the existing
     * content in the body.
     *
     * @param {Node} bodyNode The root body node to be targeted for observation
     */
    init: function(bodyNode) {
      if (!walletImpl.isFeatureEnabled) {
        return;
      }
      rootNode = bodyNode;

      spanMoneyElements.clear();
      textNodesWithKeywords.clear();
      mutationObserver = new MutationObserver(processMutations);

      // TODO(b/34745239): Scan the whole draft for money. It's not a guarantee
      // the draft was composed in an Android client.

      rootNode.querySelectorAll('span.money').forEach(node => {
        spanMoneyElements.add(node);
      });

      let walk = document.createTreeWalker(
          rootNode,
          NodeFilter.SHOW_TEXT,
          { acceptNode:
              function(textNode) {
                return textNodeContainsKeywords(textNode)
                    ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
              }
          },
          false /* entityReferenceExpansion */);
      let textNode;
      while (textNode = walk.nextNode()) {
        textNodesWithKeywords.add(textNode);
      }

      updateAllSpanMoneyElementStates();
      rootNode.addEventListener('click', onMoneyAmountClicked);
      rootNode.addEventListener('textInput', onTextInput);
      rootNode.addEventListener('keyup', onKeyUp);
      rootNode.addEventListener('blur', onBlur);
    },

    /**
     * Registers our MutationObserver.
     */
    registerMutationObserver: function() {
      if (mutationObserver && walletImpl.isFeatureEnabled) {
        let config = {childList: true, characterData: true, subtree: true};
        mutationObserver.observe(rootNode, config);
      }
    },

    /**
     * Unregisters our MutationObserver.
     */
    unregisterMutationObserver: function() {
      if (mutationObserver) {
        mutationObserver.disconnect();
      }
    },

    /**
     * Sets the keyword sequences which should activate the discoverability
     * green underline.
     * @param {Array<Array<number>>} keywordHashes The new array of keyword hash
     *     sequences.
     */
    setKeywordHashSequences: function(keywordHashes) {
      keywordHashSequences = keywordHashes;
    },

    /**
     * Sets the selection caret.
     * @param {Node} node The node where the caret belongs
     * @param {number} offset The offset within the node where the caret belongs
     */
    // Visible for testing
    setCaret: function(node, offset) {
      let sel = window.getSelection();
      if (sel.anchorNode === node
          && sel.anchorOffset === offset
          && sel.isCollapsed) {
        // Nothing to do
        return;
      }
      let range = document.createRange();
      range.setStart(node, offset);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      range.detach();
    },

    setDiscoverVisibility: function(isVisible) {
      isDiscoverVisible = isVisible;
      updateAllSpanMoneyElementStates();
    }
  };

  return walletImpl;
})();

WALLET.setKeywordHashSequences(WALLET_DISCOVER_KEYWORD_HASHES);
