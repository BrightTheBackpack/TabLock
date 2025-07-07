console.log("content.js loaded");
// lockScreen()

let locked;
let isLocked = false;
let locker;
//get lock status
chrome.storage.local.get(['lock'], function (result) {
    locked = result.lock || false;
    console.log("Lock state on content script load:", locked);
    if (locked) {
        startLocker();
        tabSelector();
    }
});
//listen for lock updates
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("msg received")
  if (request.action === "lockUpdate") {
    console.log("Lock update received:", request.value);
    if(request.value == true){
      startLocker();
      tabSelector();
    }

  }
  if(request.action === "popupAlert") {
    console.log("popupAlert received with message:", request.message);
    popupAlert(request.message);
  }
  if(request.action === "closeAlert")
    {
      if(document.getElementById('popup-alert')) {
        document.body.removeChild(document.getElementById('popup-alert'));
      }
    }
});
function tabSelector(){
  const menu = document.createElement('div');
  menu.id = 'tab-selector';
  menu.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: white;
    border: 1px solid black;
    // z-index: 999999999;
    height: 80vh;
    overflow-y: auto;
    width: 60vh;
    // color: black;
    // background-color: rgba(255, 255, 255, 0.9);
  `;

  chrome.runtime.sendMessage({action: "tabList"}, function(response) {
    let tablist = response.tabList;
    for (const tabId in tablist) {
            console.log("Tab:", tabId);
            const tab = tablist[tabId];
            const tabElement = document.createElement('div');
            tabElement.style.cssText = `
            position: relative;

            display: flex; 
            align-items: center; 
            // padding: 5px; 
            // border-bottom: 1px solid #ccc;
            z-index: 9999999999;
            height: 90px;

            `;
            const tabFavicon = document.createElement('div');
            tabFavicon.style.cssText = `
            margin-right: 10px;
            display: flex;
            margin-left: 10px;
            `
            tabFavicon.innerHTML = tab.favicon ? `<img src="${tab.favicon}" alt="Favicon" style="width: 48px; height: px;">` : `<img src="https://hc-cdn.hel1.your-objectstorage.com/s/v3/ad157342caedf0c547f2eafc9227436444ec8295_language_129dp_1f1f1f.png" alt="Favicon" style="width: 48px; height: 48px;">`;
            const tabTitle = tab.title ? tab.title : 'No title';
            const tabUrl = tab.url ? tab.url : 'No URL';
            const tabTime = tab.stopwatch ? `Inactivity: ${Math.floor(tab.stopwatch/60)} minutes` : 'Inactivity: 0 minutes';
            const block = document.createElement('div');

            block.innerHTML = `<div class="tab-title" style="overflow: hidden; white-space: nowrap;"> ${tabTitle}</div> <div class="tab-url" style="overflow:hidden;"> ${tabUrl}</div> `;
            block.style.cssText = `
            flex: 3;
            // height: 32px;
            overflow: hidden;
            padding-right: 10px;

            `
            const time = document.createElement('div');
            time.style.cssText = `
            flex: 1;
            `
            time.innerHTML = `<div class="tab-time"> ${tabTime}</div>`;
             
            const close = document.createElement('button');
            close.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="800px" height="800px" viewBox="0 0 24 24" fill="none">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z" fill="#0F1729"/>
            </svg>
            `
            close.style.cssText = `
                background-color: transparent;
                border: none;
                flex: 0.25;
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
                chrome.runtime.sendMessage({ action: "closeTab", tabId: parseInt(tabId) }, function(response) {
                    console.log("Tab closed:", response);
                    getStats();
                });
            };
            tabElement.appendChild(tabFavicon);
            tabElement.appendChild(block); 
            tabElement.appendChild(time);
            tabElement.appendChild(close);

        menu.appendChild(tabElement);
    }

    document.body.appendChild(menu);
  });
}
// popupAlert("You have 14 tabs open!<br> Once you exceed 15 tabs, the extension will begin automatically closing your least recently used tab <br> The next tab to close is temptab.temptabe.com/temp/temp1346asdgh12345678sdfgasdfdfgf");
function popupAlert(message) {
  //ik this is a pain to look at but wutever
  console.log("popupAlert called with message:", message);
  //insert icons


  const alert = document.createElement('div');
  alert.id = 'popup-alert';
  if( document.getElementById('popup-alert')) {
    document.body.removeChild(document.getElementById('popup-alert'));
  }
  alert.style.cssText = `
  display: flex;
  background-color: rgba(255, 255, 255, 0.8);
  position: fixed;
  border-radius: 10px;
  z-index: 999999999;
  top: 5%;
  right: 5%;
  padding: 20px;
  pointer-events: none;
  width: 25%;
  overflow: hidden;
  font-family: Arial, sans-serif;
  font-size: 1.2rem;
  `
  //alert styles
  alert.style.display = 'flex';
  alert.style.backgroundColor = 'rgba(255, 255 , 255, 0.8)';
  alert.style.position = 'fixed';
  alert.style.borderRadius = '10px';
  alert.style.zIndex = '999999999';
  alert.style.top = '5%';
  alert.style.right = '5%'; 
  alert.style.padding = '20px';

  const text = document.createElement('p');
  //text styles
  text.style.color = 'black';
  text.style.fontSize = '1.2rem';
  text.style.textAlign = 'center';
  text.style.whiteSpace = 'pre-wrap'; // This preserves newlines and spaces
  text.innerHTML = message;
  text.style.margin = '20px';
  alert.appendChild(text)

  const closeButton = document.createElement('div');
  closeButton.innerHTML = `
   <svg xmlns="http://www.w3.org/2000/svg" width="800px" height="800px" viewBox="0 0 24 24" fill="none">
<path fill-rule="evenodd" clip-rule="evenodd" d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z" fill="#0F1729"/>
</svg>
  `
  closeButton.style.cssText = `
    position: relative;
    top: 10px;
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
  closeButton.onclick = () => {
    document.body.removeChild(alert);
    setStorageValue('ADismissed', true);
  };
  //close button styles
  alert.appendChild(closeButton);
  document.body.appendChild(alert);


}

//lock the screen
function lockScreen(){
  const existing = document.getElementById('lock-screen');
  if (existing) return;

  const lockScreen = document.createElement('div');
  lockScreen.id = 'lock-screen';
  lockScreen.style = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(255, 255, 255, 0.8);
    z-index: 99;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: all;
  `;
  lockScreen.innerHTML = `<h1 style="color:black;font-size:2rem;">🔒 Locked</h1>`;
  document.body.appendChild(lockScreen);

}
function unlockScreen() {
  const lockScreen = document.getElementById('lock-screen');
  if (lockScreen) {
    lockScreen.remove();
  }
}

//start interval that keeps locking the screen
function startLocker() {
  if (!locker) {
    locker = setInterval(() => {
      lockScreen();
    }, 10);
    isLocked = true;
  }
}

//stop the interval
//todo make it unlock
function stopLocker() {
  if (locker) {
    clearInterval(locker);
    unlockScreen();
    locker = null;
    isLocked = false;
  }
}

function setStorageValue(key, value){
  chrome.runtime.sendMessage({action: "setStorageValue", key: key, value: value}, function(response) {
    console.log("Storage value set:", response);
  });
}
function getStorageValue(key, callback){
  chrome.runtime.sendMessage({action: "getStorageValue", key: key}, function(response) {
    console.log("Storage value retrieved:", response);
    callback(response);
  });
}