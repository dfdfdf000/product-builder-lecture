(function() {
  var shareButtons = document.querySelectorAll('[data-share-button]');
  if (!shareButtons.length) return;

  function getShareText() {
    var description = document.querySelector('meta[name="description"]');
    return description ? description.getAttribute('content') : '로또 인사이트를 확인해 보세요.';
  }

  function showCopied(button) {
    var originalText = button.getAttribute('data-original-text') || button.textContent;
    button.setAttribute('data-original-text', originalText);
    button.textContent = '링크 복사됨';
    window.setTimeout(function() {
      button.textContent = originalText;
    }, 1600);
  }

  function copyToClipboard(url) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(url).then(function() { return true; }).catch(function() { return false; });
    }

    var textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    var copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (_) {
      copied = false;
    }

    document.body.removeChild(textarea);
    return Promise.resolve(copied);
  }

  shareButtons.forEach(function(button) {
    button.addEventListener('click', function() {
      var url = window.location.href;
      var title = document.title;
      var text = getShareText();

      if (navigator.share) {
        navigator.share({ title: title, text: text, url: url }).catch(function(error) {
          if (error && error.name === 'AbortError') return;
          copyToClipboard(url).then(function(copied) {
            if (copied) showCopied(button);
          });
        });
        return;
      }

      copyToClipboard(url).then(function(copied) {
        if (copied) {
          showCopied(button);
          return;
        }

        var shareUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(url);
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
      });
    });
  });
})();
