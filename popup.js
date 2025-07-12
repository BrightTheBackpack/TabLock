const checkbox = document.getElementById('mode-select');
const modeA = document.getElementById('classA');
const modeB = document.getElementById('classB');
const modeC = document.getElementById('classC');
const settingFields = document.querySelectorAll('.setting-field');
const settingsButton = document.getElementById('settings');
const settingsPanel = document.getElementById('settings-panel');
// const submit = document.getElementById('submit');
const dropdown = document.querySelectorAll('.dropdown');
const amountCInput = document.getElementById('amountC')
const closeCInput = document.getElementById('closeC')
settingsButton.addEventListener('click', function () {
    settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
});
getStats();
window.onload = function () {
    chrome.storage.local.get('mode', function (result) {
        if (result.mode === undefined) {
            checkbox.value = "A"; // default to mode A if not set
        } else {
            checkbox.value = result.mode; // cast undefined to false if not set

        }
        chrome.runtime.sendMessage({ type: "lockUpdate", value: result.lock });
        toggleModeDisplay(checkbox.value)

    });

};

for (const dropdownElement of dropdown) {
    dropdownElement.addEventListener('click', function () {
        const content = document.getElementById(this.id + 'Content');
        if (content.style.display === 'block') {
            content.style.display = 'none';
        } else {
            content.style.display = 'block';
        }
    });
}

for (const field of settingFields) {
    chrome.storage.local.get(field.id, function (result) {
        if (result[field.id] !== undefined) {
            field.value = result[field.id];
        } else {
            // console.warn(`Setting ${field.id} not found in storage, using default value.`);
        }
    });
    field.addEventListener('input', function () {

        const fieldId = this.id;
        const fieldValue = this.value;
        let error = handleError(fieldId, fieldValue);
        // let error = true;
        if (error) {
            chrome.storage.local.set({ [fieldId]: fieldValue }, function () {
                chrome.runtime.sendMessage({ type: "settingUpdate", id: fieldId, value: fieldValue });
            });

        }

    });
}

// submit.addEventListener('click', function(event) {
//     event.preventDefault();
//     console.log('Submit button clicked');
//     settingFields.forEach(field => {
//         const fieldId = field.id;
//         const fieldValue = field.value;
//         if(fieldId === 'thresholdA') {
//             if(fieldValue === '' || isNaN(fieldValue) || fieldValue < 0 || fieldValue > 30) {
//                 handleError(fieldId, 'Invalid input for number of tabs: ' + fieldValue);
//                 return;
//             }
//         }
//         if(fieldId === 'decayB') {
//             if(fieldValue === '' || isNaN(fieldValue) || fieldValue < 1 || fieldValue > 30) {
//                 handleError(fieldId, 'Invalid input for inactivity time: ' + fieldValue);
//                 return;
//             }
//         }
//         if(fieldId === 'percentB') {
//             if(fieldValue === '' || isNaN(fieldValue) || fieldValue < 25 || fieldValue > 75) {
//                 handleError(fieldId, 'Invalid input for percent of tabs: ' + fieldValue);
//                 return;
//             }
//         }
//         chrome.storage.local.set({ [fieldId]: fieldValue }, function() {
//             console.log(`Setting ${fieldId} updated to:`, fieldValue);
//             chrome.runtime.sendMessage({ type: "settingUpdate", id: fieldId, value: fieldValue });
//         });
//     });
// })

function handleError(id, fieldValue) {
    if (id === 'thresholdA') {
        if (fieldValue === '' || isNaN(fieldValue) || fieldValue <= 5 || fieldValue > 60) {
            displayError(id, 'Invalid input for number of tabs: ' + fieldValue);
            return false;
        } else {
            displayError(id, ''); // Clear error message if input is valid
        }
    }
    if (id === 'decayB') {
        if (fieldValue === '' || isNaN(fieldValue) || fieldValue < 1 || fieldValue > 30) {
            displayError(id, 'Invalid input for inactivity time: ' + fieldValue);
            return false;
        } else {
            displayError(id, ''); // Clear error message if input is valid
        }
    }
    if (id === 'percentB') {
        if (fieldValue === '' || isNaN(fieldValue) || fieldValue < 25 || fieldValue > 75) {
            displayError(id, 'Invalid input for percent of tabs: ' + fieldValue);
            return false;
        } else {
            displayError(id, ''); // Clear error message if input is valid
        }
    }
    if (id === 'amountC') {
        if (fieldValue === '' || isNaN(fieldValue) || fieldValue < 2 || fieldValue > 60) {
            displayError(id, 'Invalid input for number of tabs to lock: ' + fieldValue);
            return false;
        } else {
            if(amountC < closeCInput.value){
                displayError(id, 'Must be higher than unlock tab amount+ ' + fieldValue)
                return false
            }
            displayError(id, ''); // Clear error message if input is valid
        }
    }
    if (id=== 'closeC') {
        if (fieldValue === '' || isNaN(fieldValue) || fieldValue < 2 || fieldValue > 60) {
            displayError(id, 'Invalid input for number of tabs for unlock: ' + fieldValue);
            return false;
        } else {
            if(fieldValue > amountCInput.value){
                displayError(id, 'Must be lower than lock amount: ' + fieldValue);
                return false;
            }else{
                displayError(id, ''); // Clear error message if input is valid

            }
        } 
    }
    return true;
}
function displayError(id, error) {
    const field = document.getElementById(id + "Error");
    field.textContent = error;
}

console.log("popup.js loaded");
checkbox.addEventListener('change', function () {
    toggleModeDisplay(this.value);


    chrome.runtime.sendMessage({ type: "modeUpdate", value: this.value });

});

function toggleModeDisplay(mode) {
    if (mode == "A") {
        chrome.storage.local.set({ "mode": "A" }, function () {

        });
        modeA.style.display = 'block';
        modeB.style.display = 'none';
        modeC.style.display = 'none';
    } if (mode == "B") {

        chrome.storage.local.set({ "mode": "B" }, function () {
        });
        modeA.style.display = 'none';
        modeB.style.display = 'block';
        modeC.style.display = 'none';
    } if (mode == "C") {
        chrome.storage.local.set({ "mode": "C" }, function () {
        });
        modeA.style.display = 'none';
        modeB.style.display = 'none';
        modeC.style.display = 'block';
    }
}

function getStats() {
    chrome.runtime.sendMessage({ action: "tabCount" }, function (response) {
        console.log("Tab count response:", response);
        const countElement = document.getElementById('count');
        countElement.textContent = (response.count || '0') + ', + ' + (response.ignoredCount || '0') + ' ignored';
    });
    chrome.runtime.sendMessage({ action: "oldestTab" }, function (response) {
        console.log("Oldest tab response:", response);
        const oldestTabElement = document.getElementById('oldest-tab');
        if (response.url) {
            oldestTabElement.textContent = response.url;
        }
    });
    chrome.runtime.sendMessage({ action: "tabList" }, function (response) {
        let tabList = response.tabList || {};
        const tablistContent = document.getElementById('tabListContent');
        tablistContent.innerHTML = ''; // Clear previous content
        for (const tabId in tabList) {
            const tab = tabList[tabId];
            const tabElement = document.createElement('div');
            tabElement.style.cssText = `
            display: flex; 
            align-items: center; 
            border-bottom: 1px solid #ccc;
            height: fit-content;
            `;
            const tabFavicon = document.createElement('div');
            tabFavicon.style.cssText = `
            margin-right: 10px;
            display: flex;
            
            `
            tabFavicon.innerHTML = tab.favicon ? `<img src="${tab.favicon}" alt="Favicon" style="width: 32px; height: 32px;">` : `<img src="https://hc-cdn.hel1.your-objectstorage.com/s/v3/ad157342caedf0c547f2eafc9227436444ec8295_language_129dp_1f1f1f.png" alt="Favicon" style="width: 48px; height: 48px;">`;
            const tabTitle = tab.title ? tab.title : 'No title';
            const tabUrl = tab.url ? tab.url : 'No URL';
            const tabTime = tab.stopwatch ? `Inactivity: ${Math.floor(tab.stopwatch / 60)} minutes` : 'Inactivity: 0 minutes';
            const block = document.createElement('div');

            block.innerHTML = `<div class="tab-title" style="overflow: hidden; white-space: nowrap;"> ${tabTitle}</div> <div class="tab-url" style="overflow:hidden;"> ${tabUrl}</div> `;
            block.style.cssText = `
            flex: 5;
            height: 64px;
            overflow: hidden;
            padding-right: 10px;
            font-size: 12px;

            `
            const time = document.createElement('div');
            time.style.cssText = `
            flex: 0.1;
            font-size: 10px;
            `
            time.innerHTML = `<div class="tab-time"> ${tabTime}</div>`;

            const close = document.createElement('button');
            close.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="#ffffff" style="filter: invert(1);">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z" fill="#0F1729"/>
            </svg>
            `
            close.style.cssText = `
                background-color: transparent;
                border: none;
                color: white;
                flex: 0.1;
                // top: 10px;
                right: 15px;
                cursor: pointer;
                width: 24px;
                height: 24px;
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 5px;
                pointer-events: all;
            `;
            close.onclick = () => {
                chrome.runtime.sendMessage({ action: "closeTab", tabId: parseInt(tabId) }, function (response) {
                    getStats();
                });
            };
            const ignore = document.createElement('button');
            ignore.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 16 16" fill="#ffffff" style="filter: invert(1);">
<path fill-rule="evenodd" clip-rule="evenodd" d="M0 8L3.07945 4.30466C4.29638 2.84434 6.09909 2 8 2C9.90091 2 11.7036 2.84434 12.9206 4.30466L16 8L12.9206 11.6953C11.7036 13.1557 9.90091 14 8 14C6.09909 14 4.29638 13.1557 3.07945 11.6953L0 8ZM8 11C9.65685 11 11 9.65685 11 8C11 6.34315 9.65685 5 8 5C6.34315 5 5 6.34315 5 8C5 9.65685 6.34315 11 8 11Z" fill="#000000"/>
</svg>`;
            ignore.style.cssText = `
            flex: 0.25;
            background-color: transparent;
            border: none;
            cursor: pointer;
            color: white;
            width: 24px;
            height: 24px;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 5px;
            
            pointer-events: all;
            `;
            ignore.onclick = () => {
                chrome.runtime.sendMessage({ action: "ignoreTab", tabId: parseInt(tabId) }, function (response) {
                    if (response.status === "too many tabs") {
                        alert("You can only ignore up to 4 tabs.");
                    }
                    getStats();

                });
            };



            tabElement.append(tabFavicon)
            tabElement.append(block);
            tabElement.append(time);
            tabElement.append(ignore);
            tabElement.append(close);
            if (tabList[tabId].ignored) {
                tabElement.style.backgroundColor = 'rgb(6, 6, 8)'; // Light grey for ignored tabs
                ignore.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 16 16" fill="none">
<path fill-rule="evenodd" clip-rule="evenodd" d="M16 16H13L10.8368 13.3376C9.96488 13.7682 8.99592 14 8 14C6.09909 14 4.29638 13.1557 3.07945 11.6953L0 8L3.07945 4.30466C3.14989 4.22013 3.22229 4.13767 3.29656 4.05731L0 0H3L16 16ZM5.35254 6.58774C5.12755 7.00862 5 7.48941 5 8C5 9.65685 6.34315 11 8 11C8.29178 11 8.57383 10.9583 8.84053 10.8807L5.35254 6.58774Z" fill="#000000"/>
<path d="M16 8L14.2278 10.1266L7.63351 2.01048C7.75518 2.00351 7.87739 2 8 2C9.90091 2 11.7036 2.84434 12.9206 4.30466L16 8Z" fill="#000000"/>
</svg>`
                ignore.onclick = () => {
                    chrome.runtime.sendMessage({ action: "unignoreTab", tabId: parseInt(tabId) }, function (response) {
                        getStats();
                    });
                };
                setTimeout(() => {
                    tablistContent.appendChild(tabElement);
                }, 10); // Adjust the delay as needed

            } else {
                tablistContent.appendChild(tabElement);

            }
        }

    })
}