/**
 * Loads YouTube player and controls video playback according to provided
 * parameters from Java through NativeVideoBridge.
 */

/**
 * Video playback parameters.
 */
var params = null;

/**
 * Instance of the player.
 */
var player = null;

/**
 * Loads video parameters from Java.
 */
function fetchParams() {
  params = {
    mediaId: NativeVideoBridge.getMediaId(),
    mute: NativeVideoBridge.getMute(),
    volume: NativeVideoBridge.getVolume(),
    loop: NativeVideoBridge.getLoop(),
    startSeconds: NativeVideoBridge.getStartSeconds(),
    endSeconds: NativeVideoBridge.getEndSeconds()
  };
}

/**
 * Loads YouTube API.
 */
function loadPlayer() {
  var tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

/**
 * Called when YouTube player API is ready to use. Initializes our player.
 */
function onYouTubeIframeAPIReady() {
  playerParams = {
    height: '100%',
    width: '100%',
    videoId: params.mediaId,
    playerVars: {rel: 0, showinfo: 0, modestbranding: 1},
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  };

  if (params.startSeconds != -1) {
    playerParams.start = params.startSeconds;
  }

  if (params.endSeconds != -1) {
    playerParams.end = params.endSeconds;
  }

  player = new YT.Player('player', playerParams);
}

/**
 * Sets volume when player is ready.
 */
function onPlayerReady(event) {
  if (params.volume != -1) {
    event.target.setVolume(params.volume);
  }

  if (params.mute) {
    event.target.mute();
  }

  event.target.playVideo();
}

/**
 * Observes when playback ended to restart it if loop parameter is set. Also
 * observes if the player started buffering and calls Java to show the player
 * view.
 */
function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.ENDED) {
    if (params.loop) {
      if (params.startSeconds > 0) {
        event.target.seekTo(startSeconds, true /* allowSeekAhead */);
      } else {
        event.target.Play();
      }
    }
  } else if (event.data == YT.PlayerState.BUFFERING) {
    NativeVideoBridge.onVideoLoadStarted();
  }
}

window.onload = function() {
  fetchParams();
  loadPlayer();
};