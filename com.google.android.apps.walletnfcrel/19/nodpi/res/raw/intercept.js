/* NOTE: Adding line style comments to the javascript file will break injection
 * as loadUrl seems to strip out newlines. Thus, a line comment will comment out
 *  everything in the file
 * after it.
 */
(function() {
  var original = {submit: HTMLFormElement.prototype.submit};

  var intercept = {
    submit: function(e) {
      var form = e ? e.target : this;
      processForm(form);
      return original.submit.call(form);
    },
    prompt: function() {
      var name = 'threeDSAuthResultForEdyApp';
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        var index = scripts[i].innerHTML.indexOf(name);
        if (index < 0) continue;
        var prompt_params =
            scripts[i].innerHTML.substr(index + 1 + name.length);
        var start = prompt_params.indexOf('{');
        var length = prompt_params.indexOf(')') - start - 1;
        var jsonObj = prompt_params.substr(start, length);
        comGoogleAndroidPayInterceptor.submit('prompt', jsonObj);
      }
    }
  };

  var processForm = function(f) {
    var jsonObj = {};
    for (i = 0; i < f.elements.length; i++) {
      jsonObj[f.elements[i].name] = f.elements[i].value;
    }
    var method =
        f.attributes['method'] ? f.attributes['method'].nodeValue : null;
    comGoogleAndroidPayInterceptor.submit(method, JSON.stringify(jsonObj));
  };

  HTMLFormElement.prototype.submit = intercept.submit;
  intercept.prompt();
  window.addEventListener('submit', intercept.submit, true /* useCapture */);
})();
