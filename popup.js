const checkbox = document.getElementById('mode-switch');
  window.onload = function () {
  chrome.storage.local.get('lock', function (result) {
    checkbox.checked = !!result.lock; // cast undefined to false if not set
    console.log('Initial lock value from chrome.storage:', result.lock);
        chrome.runtime.sendMessage({ type: "lockUpdate", value: result.lock });

  });
  };

  console.log('Checkbox element:', checkbox);
  console.log('Checkbox state on load:', checkbox.checked);

console.log("popup.js loaded");
checkbox.addEventListener('change', function() {
    console.log('Checkbox state changed:', this.checked);
    if (this.checked) {
        console.log('Checkbox is checked');
        chrome.storage.local.set({ lock: true }, function() {
            console.log('Lock is set to true');
              if (chrome.runtime.lastError) {
                    console.error("Storage error:", chrome.runtime.lastError);
                } else {
                    console.log("Storage set successfully:", { lock: checkbox.checked });
                }
        });
    } else {
        chrome.storage.local.set({ lock: false }, function() {
            console.log('Lock is set to false');
        });
    }
    chrome.runtime.sendMessage({ type: "lockUpdate", value: this.checked });

});