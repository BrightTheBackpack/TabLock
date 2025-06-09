const checkbox = document.getElementById('mode-switch');
const modeA = document.getElementById('classA');
const modeB = document.getElementById('classB');
const settingFields = document.querySelectorAll('.setting-field');
window.onload = function () {
chrome.storage.local.get('lock', function (result) {
    checkbox.checked = !!result.lock; // cast undefined to false if not set
    console.log('Initial lock value from chrome.storage:', result.lock);
    chrome.runtime.sendMessage({ type: "lockUpdate", value: result.lock });
    if (!!result.lock) {
        modeA.style.display = 'none';
        modeB.style.display = 'block';
    } else {
        modeA.style.display = 'block';
        modeB.style.display = 'none';
    }

    });
    
};
for (const field of settingFields) {
    chrome.storage.local.get(field.id, function (result) {
        if (result[field.id] !== undefined) {
            field.value = result[field.id];
            console.log(`Setting ${field.id} loaded with value:`, field.value);
        } else {
            console.warn(`Setting ${field.id} not found in storage, using default value.`);
        }
    });
    field.addEventListener('input', function() {
        const fieldId = this.id;
        const fieldValue = this.value;
        chrome.storage.local.set({ [fieldId]: fieldValue }, function() {
            console.log(`Setting ${fieldId} updated to:`, fieldValue);
            chrome.runtime.sendMessage({ type: "settingUpdate", id: fieldId, value: fieldValue });
        });

    });
}
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
    if(checkbox.checked) {
    modeA.style.display = 'none';
    modeB.style.display = 'block';
    }else{
        modeA.style.display = 'block';
        modeB.style.display = 'none';
    }

    chrome.runtime.sendMessage({ type: "lockUpdate", value: this.checked });

});