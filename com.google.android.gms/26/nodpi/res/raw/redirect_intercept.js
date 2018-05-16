(function() {
  var lastAjaxMethod = null;

  var original = {
    submit: HTMLFormElement.prototype.submit,
    open: XMLHttpRequest.prototype.open,
    send: XMLHttpRequest.prototype.send
  };

  var intercept = {
    submit: function(e) {
      var form = e ? e.target : this;
      processForm(form);
      return original.submit.call(form);
    },
    open: function(method, url, async, user, password) {
      lastAjaxMethod = method;
      original.open.call(this, method, url, async, user, password);
    },
    send: function(body) {
      comGoogleAndroidWalletInterceptor.send(lastAjaxMethod, body);
      lastAjaxMethod = null;
      original.send.call(this, body);
    }
  };

  var processForm = function(f) {
    var jsonArr = [];
    for (i = 0; i < f.elements.length; i++) {
      jsonArr.push({
        name: f.elements[i].name,
        value: f.elements[i].value,
        type: f.elements[i].type
      });
    }

    var method = f.attributes['method'] === undefined ?
        null :
        f.attributes['method'].nodeValue;

    comGoogleAndroidWalletInterceptor.submit(method, JSON.stringify(jsonArr));
  };

  HTMLFormElement.prototype.submit = intercept.submit;
  window.addEventListener('submit', intercept.submit, true /* useCapture */);
  XMLHttpRequest.prototype.open = intercept.open;
  XMLHttpRequest.prototype.send = intercept.send;
})();
