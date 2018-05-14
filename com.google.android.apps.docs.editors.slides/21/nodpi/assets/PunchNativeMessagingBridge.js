/*
 * ALL COMMENTS in this file must be block comments, "//" comments will break
 * the JS!
 */
window.punchWebViewEventListener = (function() {
  /* Should match punch.viewer.model.Page.LoadState. */
  var LoadState_ = {
    EMPTY: 1,
    LOADED: 2,
    LOADING: 3,
    ERROR: 4
  };

  var dataApi_;
  var serializer_;

  return {
    onApiExported: function(dataApi, webViewControlApi,
        nativeA11yStateListener, webViewNativeMessagingBridgeSerializer) {
      window.PUNCH_WEBVIEW_CONTROL_API = webViewControlApi;
      dataApi_ = dataApi;
      serializer_ = webViewNativeMessagingBridgeSerializer;
      var pageWidth = dataApi_.getPageWidth();
      var pageHeight = dataApi_.getPageHeight();
      window.PresentationWebViewApi.onControlApiReady(dataApi_.getNumSlides(),
          dataApi_.getCurrentSlideIndex(), pageWidth, pageHeight);
      window.PUNCH_WEBVIEW_A11Y_STATE_LISTENER = nativeA11yStateListener;
      window.PresentationWebViewApi.onA11yStateListenerReady();
    },

    onNavigation: function() {
      window.PresentationWebViewApi.onNavigation(
          dataApi_.getCurrentSlideIndex());
    },
    onPreviousPreviewChange: function() {
      if (dataApi_.hasPrevContent()) {
        window.PresentationWebViewApi.onPreviousPreviewChange(
            dataApi_.getPrevContent(), true /* hasPrevContent */);
      } else {
        window.PresentationWebViewApi.onPreviousPreviewChange(
            null, false /* hasPrevContent */);
      }
    },
    onCurrentViewChange: function() {
      window.PresentationWebViewApi.onCurrentViewChange(
          dataApi_.getCurrentContent());
    },
    onNextPreviewChange: function() {
      if (dataApi_.hasNextContent()) {
        window.PresentationWebViewApi.onNextPreviewChange(
            dataApi_.getNextContent(), true /* hasNextContent */);
      } else {
        window.PresentationWebViewApi.onNextPreviewChange(
            null, false /* hasNextContent */);
      }
    },
    onNextNextPreviewChange: function() {
      if (dataApi_.hasNextNextContent()) {
        window.PresentationWebViewApi.onNextNextPreviewChange(
            dataApi_.getNextNextContent());
      } else {
        window.PresentationWebViewApi.onNextNextPreviewChange(null);
      }
    },
    onSlideLoadStateChange: function(slideIndex, loadState) {
      var speakerNotes = '';
      var links = [];
      var videos = [];
      if (loadState == LoadState_.LOADED) {
        if (dataApi_.hasSpeakerNotes(slideIndex)) {
          speakerNotes = dataApi_.getSpeakerNotes(slideIndex);
        }
        links = dataApi_.getHyperlinks(slideIndex);
        videos = dataApi_.getVideos(slideIndex);
      }

      var serializedLinks =
          JSON.stringify(serializer_.serializeHyperlinks(links));
      var serializedVideos =
          JSON.stringify(serializer_.serializeVideos(videos));
      window.PresentationWebViewApi.onSlideLoadStateChange(
          slideIndex, loadState, speakerNotes, serializedLinks,
          serializedVideos, dataApi_.hasErrorWithPartialContent(slideIndex));
    },
    onVideoStateChange: function(index, state) {
      window.PresentationWebViewApi.onVideoStateChange(index, state);
    },
    onVideoLoadError: function(slideIndex, videoIndex, errorReason) {
      window.PresentationWebViewApi.onVideoLoadError(slideIndex, videoIndex, errorReason);
    },
    onVideoLoadSuccess: function(slideIndex, videoIndex) {
      window.PresentationWebViewApi.onVideoLoadSuccess(slideIndex, videoIndex);
    },
    onContentAnimationChange: function(animating) {
      window.PresentationWebViewApi.onContentAnimationChange(animating);
    }
  };
})();

window.punchSlideMarkupWebViewEventListener = (function() {
  return {
    onApiExported: function(slideMarkupControlApi) {
      window.PUNCH_SLIDE_MARKUP_CONTROL_API = slideMarkupControlApi;
      window.SlideMarkupWebViewApi.onControlApiReady();
    }
  };
})();

window.punchQandaWebViewEventListener = (function() {
  var serializer_;

  return {
    onApiExported: function(qandaControlApi,
        qandaNativeMessagingBridgeSerializer, canStartQandaSeries,
        qandaAvailability) {
      serializer_ = qandaNativeMessagingBridgeSerializer;
      window.PUNCH_QANDA_CONTROL_API = qandaControlApi;
      window.QandaWebViewApi.onControlApiReady(
          canStartQandaSeries, qandaAvailability);
    },
    onQuestionUpdate: function(question) {
      var serializedQuestion =
          JSON.stringify(serializer_.serializeQuestion(question));
      window.QandaWebViewApi.onQuestionUpdate(serializedQuestion);
    },
    onQuestionSeriesUpdate: function(series) {
      var serializedQuestionSeries =
          JSON.stringify(serializer_.serializeQuestionSeries(series));
      window.QandaWebViewApi.onQuestionSeriesUpdate(serializedQuestionSeries);
    },
    onGetRecentSeries: function(success, seriesMetadatas) {
      var serializedSeriesMetadatas = null;
      if (seriesMetadatas) {
        serializedSeriesMetadatas = JSON.stringify(
            serializer_.serializeQuestionSeriesMetadatas(seriesMetadatas));
      }
      window.QandaWebViewApi.onGetRecentSeries(
          success, serializedSeriesMetadatas);
    },
    onStartSeries: function(success, startSeriesResponse) {
      var serializedStartSeriesResponse = null;
      if (startSeriesResponse) {
        serializedStartSeriesResponse = JSON.stringify(
            serializer_.serializeStartSeriesResponse(startSeriesResponse));
      }

      window.QandaWebViewApi.onStartSeries(
          success, serializedStartSeriesResponse);
    },
    onPauseSeries: function(success) {
      window.QandaWebViewApi.onPauseSeries(success);
    },
    onResumeSeries: function(success) {
      window.QandaWebViewApi.onResumeSeries(success);
    },
    onSetDomainRestricted: function(success, domainRestrictionPolicy) {
      var serializedPolicy = null;
      if (domainRestrictionPolicy) {
        serializedPolicy = JSON.stringify(
            serializer_.serializeDomainRestrictionPolicy(
                domainRestrictionPolicy));
      }
      window.QandaWebViewApi.onSetDomainRestricted(success, serializedPolicy);
    },
    onQuestionVoteUpdate: function(questions) {
      var serializedQuestions = null;
      if (questions) {
        serializedQuestions = JSON.stringify(serializer_.serializeQuestions(
            questions));
      }
      window.QandaWebViewApi.onQuestionVoteUpdate(serializedQuestions);
    },
    onSortOrderChange: function() {
      window.QandaWebViewApi.onSortOrderChange();
    },
    onGetSortedQuestions: function(questions) {
      var serializedQuestions = null;
      if (questions) {
        serializedQuestions = JSON.stringify(serializer_.serializeQuestions(
            questions));
      }
      window.QandaWebViewApi.onGetSortedQuestions(serializedQuestions);
    }
  };
})();

window.SK_viewerEventListener = (function() {
  return {
    onLoad: function() {
      window.PresentationWebViewApi.onLoad();
    },
    onFirstPageLoad: function() {
      window.PresentationWebViewApi.onFirstPageLoad();
    },
    onAllPagesLoad: function() {
      window.PresentationWebViewApi.onAllPagesLoad();
    },
    onExit: function(opt_pageId) {
      window.PresentationWebViewApi.onExit(opt_pageId ? opt_pageId : null);
    },
    onInitialDisplayPageLoad: function() {
      window.PresentationWebViewApi.onInitialDisplayPageLoad();
    }
  };
})();

/* Wrapper for native screen reader, to pass a11y messages to Java. */
window.SK_nativeScreenReader = (function() {
  return {
    speakMessages: function(messages, queueMode) {
      var messagesArray = [];
      for (var i = 0; i < messages.length; i++) {
        this.addMessageText(messagesArray, messages[i]);
      }
      window.ScreenReaderApi.speakMessages(JSON.stringify(messagesArray));
    },

    stop: function() {
      window.ScreenReaderApi.stop();
    },

    addMessageText: function(messagesArray, message) {
      messagesArray.push(message.text);
      var infoMessages = message.infoMessages;
      for (var i = 0; i < infoMessages.length; i++) {
        addMessageText(messagesArray, infoMessages[i]);
      }
    }
  };
})();

/* Wrapper for accessibility state, to let JS know whether a11y is enabled. */
window.SK_nativeAccessibilityState = (function() {
  return {
    isEnabled: function() {
      return window.ScreenReaderApi.isEnabled();
    }
  };
})();

/* Wrapper for fatal error notifier. */
window.SK_fatalErrorNotifier = (function() {
  return {
    notify: function(errorMessage) {
      window.FatalErrorNotifier.onFatalError(errorMessage);
    }
  };
})();

/**
 * Wrapper for native url provider bridge, handles communication in both
 * directions between the Java PageUrlProviderBridge and the Js PageUrlProvider.
 */
window.SK_pageUrlProvider = (function() {
  var pageUrlListener_;

  return {
    onListenerExported: function(pageUrlListener) {
      pageUrlListener_ = pageUrlListener;
      window.PageUrlProviderBridge.onListenerReady();
    },

    requestPageUrl: function(pageId, isLowPriority) {
      window.PageUrlProviderBridge.requestPageUrl(pageId, isLowPriority);
    },

    onPageUrlResponse: function(pageId, pageUrl) {
      pageUrlListener_.onPageUrlResponse(pageId, pageUrl);
    },

    onPageUrlError: function(pageId) {
      pageUrlListener_.onPageUrlError(pageId);
    },

    onComplete: function() {
      pageUrlListener_.onComplete();
    }
  };
})();

/*
 * Do not define SK_impressionRecorder or SK_sessionInvariants if there isn’t an
 * ImpressionsBridge object bound on the WebView.
 */
if (window.ImpressionsBridge) {
  /**
   * Handle impressions reported from JS.
   */
  window.SK_impressionRecorder = (function() {
    return {
      recordImpression: function(
          eventCode, entryPoint, serializedJsBridgeMessage) {
        window.ImpressionsBridge.recordImpression(eventCode, entryPoint,
            serializedJsBridgeMessage);
      }
    };
  })();

  /**
   * Set session invariants from JS.
   */
  window.SK_sessionInvariants = (function() {
    return {
      setJsSessionInvariants: function(jobset, serializedDocsAppLoadInvariants,
          serializedDocsEditorInvariants) {
        window.ImpressionsBridge.setJsSessionInvariants(jobset,
            serializedDocsAppLoadInvariants, serializedDocsEditorInvariants);
      }
    };
  })();
}

/**
 * Renders the soy template and sends the resulting HTML back into native code.
 */
window.viewerTemplateApi = (function() {
  return {
    renderHtml: function(viewerJsUris, title, startIndex, canEdit, canComment,
        forcePageLoadErrors, headHtml, flagDataJson, isRtl, locale) {
      var html = window.SK_renderViewer(viewerJsUris, title, startIndex, canEdit,
          canComment, forcePageLoadErrors, headHtml, flagDataJson, isRtl,
          locale);
      window.SoyBridge.onHtmlRendered(html);
    }
  };
})();

/*
 * Do not define SK_viewerDataApi if there isn’t a ViewerDataApiBridge
 * object bound on the WebView.
 */
if (window.ViewerDataApiBridge) {
  window.SK_viewerDataApi = (function() {
    var callback_;

    return {
      requestViewerModel: function(callback) {
        if (this.callback_) {
          throw Error('Only a single request allowed');
        }
        this.callback_ = callback;
        window.ViewerDataApiBridge.onCallbackReady();
      },

      getDisplayUrl: function(pageId) {
        return window.ViewerDataApiBridge.getDisplayUrl();
      },

      getDocumentTitle: function() {
        return window.ViewerDataApiBridge.getDocumentTitle();
      },

      isServerData: function() {
        return false;
      },

      onViewerModelResponse: function(serializedViewerModel) {
        this.callback_(serializedViewerModel);
      },

      getHasCommentAccess: function() {
        return window.ViewerDataApiBridge.hasCommentAccess();
      },

      getSlidePageCount: function() {
        return window.ViewerDataApiBridge.getSlidePageCount();
      }
    };
  })();
}
