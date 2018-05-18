var initSwg = function(pageNonce) {
  (window.AMP = window.AMP || []).push(function(AMP) {
    var callbackId = 1;

    var callbacks = {};

    AMP.viewer.setMessageDeliverer(function(name, data, awaitResponse) {
      return new Promise(function(resolve) {
        postMessageToWebView(name, data, resolve);
      });
    }, window.document.location + '//' + window.document.host);

    function getResponse(responseNonce) {
      if (window.webViewAmpBridge.getResponse.toString() ===
          'function () { [native code] }') {
        return window.webViewAmpBridge.getResponse(responseNonce);
      } else {
        return null;
      }
    }

    function sendMessage(pageNonce, name, data, callback) {
      if (window.webViewAmpBridge.sendMessage.toString() ===
          'function () { [native code] }') {
        return window.webViewAmpBridge.sendMessage(
            pageNonce, name, data, callback);
      } else {
        return null;
      }
    }

    function postMessageToWebView(name, data, callback) {
      var myCallbackId = callbackId++;
      var nonceJson = sendMessage(
          pageNonce, name, JSON.stringify(data),
          callback ? myCallbackId : null);
      var nonces = JSON.parse(nonceJson);
      var callbackNonce = nonces['callbackNonce'];
      var responseNonce = nonces['responseNonce'];
      if (callback) {
        callbacks[myCallbackId] = function(receivedNonce) {
          if (callbackNonce === receivedNonce) {
            var responseArguments = JSON.parse(getResponse(responseNonce));
            callback.apply(null, responseArguments);
            delete callbacks[myCallbackId];
          }
        };
      }
    }

    window.receiveCallback = function(myCallbackId, callbackNonce) {
      callbacks[myCallbackId].call(null, callbackNonce);
    };
  });
};
