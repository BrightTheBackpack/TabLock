let tablist = {};
let userInfo = {};
let previousActiveTab = null;
let mode = "A";
let thresholdA;
let isChromeFocused = true;

let decayB;
let percentB;
let amountC;
let oldestTabUrl;
let stopwatchStart = Date.now();
userInfo.state = "active";
loadStorageValues();
popupMessageReceiver();

//add firefox compatibility
const getFromStorage = (key) => {
  return new Promise((resolve) => {
    if (typeof browser === "undefined") {
      chrome.storage.local.get(key, resolve);
    } else {
      browser.storage.local.get(key).then(resolve);
    }
  });
};
const sendMessage = (message) => {
  if (typeof browser === "undefined") {
    chrome.runtime.sendMessage(message);
  } else {
    browser.runtime.sendMessage(message);
  }
};
const setToStorage = (data) => {
  return new Promise((resolve) => {
    if (typeof browser === "undefined") {
      chrome.storage.local.set(data, resolve);
    } else {
      browser.storage.local.set(data).then(resolve);
    }
  });
};



//when new tab is created, add it to the tablist
chrome.tabs.onCreated.addListener(function (tab) {
  tablist[tab.id] = {url: tab.url, active: tab.active, lastActive: Date.now(), decayed: false, stopwatch: 0, title: tab.title, favicon: tab.favIconUrl};
  
  a()
  modeAWarningAlert();
    if( mode ==="C"){
    c();
  }

});

initTabList();
chrome.windows.onFocusChanged.addListener((windowId) => {
  isChromeFocused = windowId !== chrome.windows.WINDOW_ID_NONE;
});

//messages from popup and content
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if(request.action === "setStorageValue"){
    setToStorage({[request.key]: request.value}).then(function() {
    });
    
  }
  if(request.action === "getStorageValue"){
    getFromStorage(request.key).then(function(result) {
      sendResponse({value: result[request.key]});
    });
    return true; // Keep the message channel open for sendResponse
  }
  if(request.action === "tabCount"){
    let count = Object.values(tablist).filter(tab=>!tab.ignored).length;
    let ignoredCount = Object.values(tablist).filter(tab=>tab.ignored).length;
    sendResponse({count: count, ignoredCount: ignoredCount});
  }
  if(request.action === "oldestTab"){
    sendResponse({url: oldestTabUrl});
  }
  if (request.action === "tabList") {
    sendResponse({tabList: tablist});
  }
  if( request.action === "closeTab"){
    chrome.tabs.remove(request.tabId, function() {
      delete tablist[request.tabId];
      modeAWarningAlert();
      if(mode === "C"){
        c();
      }
      sendResponse({status: "success"});
    });
    return true; // Keep the message channel open for sendResponse
  }
  if( request.action === "ignoreTab"){
    let totalIgnored = Object.values(tablist).filter(tab => tab.ignored).length;
    if(totalIgnored < 3){
    const tabId = request.tabId;
    tablist[tabId].ignored = true;
    sendResponse({status: "success"});

    }
    sendResponse({status: "too many tabs"});

    
  }
  if(request.action === "unignoreTab"){
    const tabId = request.tabId;
    tablist[tabId].ignored = false;
  
  }
  if(request.action === "closeTab"){
    const tabId = request.tabId;
    chrome.tabs.remove(tabId, function() {
      delete tablist[tabId];
      modeAWarningAlert();
      if(mode === "C"){
        c();
      }
      sendResponse({status: "success"});
    });
  }
  if(request.action === "tick"){
      if((userInfo.state === "active") ) {
    chrome.tabs.query({}, (tabs) => {
      
      for(const tab of tabs){
        if(tablist[tab.id].ignored == true) continue; // skip if tab is not in tablist
        if(tablist[tab.id].active == true){

          tablist[tab.id].stopwatch = 0;
        }else{
          tablist[tab.id].stopwatch += 1;
        }
        if(tablist[tab.id].stopwatch >= (parseInt(decayB) * 60) && (mode === "B")) {
          chrome.tabs.remove(tab.id);
          delete tablist[tab.id];
        }
      }
      
    })
  }
  }
});
userInfo.state = "active";
try{
chrome.idle.setDetectionInterval(30); //set idle detection interval to 30 seconds
chrome.idle.onStateChanged.addListener((newState) => {

    if (newState === "idle" || newState === "locked") {
      userInfo.lastActive = Date.now();
      userInfo.state = newState;
      
    }else{
      userInfo.lastActive = Date.now();
      userInfo.state = newState;

    }
  });

}catch(e){

}

//alarm to check for tab decay
try{
chrome.alarms.create('checkTabs', {
  delayInMinutes: 1,
  periodInMinutes: 1
});
chrome.alarms.onAlarm.addListener((alarm) => {
  
  if (alarm.name === 'checkTabs') {
    if(mode === "A"){
      a();

    }
    if( mode ==="C"){
      c();
    }


}})

}catch(e){

}

//listner for user idle


updateActiveTab();

//alarm to check for tab decay 2.0
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== 'install') {
    return;
  }

});



function c() {
  let tabCount = Object.values(tablist).filter(tab => !tab.ignored).length;

  if( tabCount > parseInt(amountC)) {

    setToStorage({lock:true}).then(function() {
      chrome.tabs.query({ active: true }, function(tabs) {
        sendMessage(tabs[0].id, { action: "lockUpdate", data: true });
      });
    });
  }
  getFromStorage(['lock']).then(function(result) {
    if(result.lock === true){
      if(tabCount > parseInt(amountC)/2){
        setToStorage({lock:true}).then(function() {
          chrome.tabs.query({ active: true }, function(tabs) {
            sendMessage(tabs[0].id, { action: "lockUpdate", data: true });
          });
        });
      }else{
        chrome.storage.local.set({lock:false}, function() {
          chrome.tabs.query({ active: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "lockUpdate", data: false });
          });
        });
      }
    }
  });
  // else{
 
  //   chrome.tabs.query({ active: true }, function(tabs) {
  //     chrome.tabs.sendMessage(tabs[0].id, { action: "lockUpdate", data: false });
  //   });
  //   chrome.storage.local.set({lock: false}, function() {
  //   });
  // }
}
//when tab url changes, update the tablist
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    tablist[tabId].url = tab.url;
    tablist[tabId].lastActive = Date.now();
    tablist[tabId].title = tab.title;
    tablist[tabId].favicon = tab.favIconUrl;
    modeAWarningAlert();
    if(mode === "C"){
      c();
    }
  }
});
//when tab deleted, remove it from the tablist
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  delete tablist[tabId];
  modeAWarningAlert();
  if(mode === "C"){
    c();
  }
});

function updateDecay() {
  let decayCount = 0;
  let totalTabs = Object.keys(tablist).length;
  for (const tabId in tablist) {
    const tab = tablist[tabId];
    let isLengthOfTime = tab.lastActive < Date.now() - (1000* 60 *decayB); //chjange to 1200000
    if (!tab.active && isLengthOfTime) {
      tab.decayed = true;
    }
    if (tab.decayed) {
      decayCount++;
    }

  }
  return { decayCount, totalTabs };
}

function updateActiveTab() {
  chrome.tabs.onActivated.addListener((activeInfo) => {

    tablist[previousActiveTab].active = false;
    tablist[previousActiveTab].lastActive = Date.now();
    tablist[previousActiveTab].lastActive = Date.now();
    tablist[activeInfo.tabId].active = true;
    tablist[activeInfo.tabId].lastActive = Date.now();
    previousActiveTab = activeInfo.tabId;
    modeAWarningAlert();
    if(mode === "C"){
      c();
    }

  });
}

function loadStorageValues() {
  getFromStorage(['mode', 'thresholdA', 'decayB', 'percentB', 'amountC']).then(function (result) {
    thresholdA = result.thresholdA || 15;
    decayB = result.decayB || 20;
    percentB = result.percentB || 60;
    mode = result.mode || "A";
    amountC = result.amountC || 5;
    if(mode !== "C"){
      setToStorage({lock: false}).then(function() {
        sendMessage(previousActiveTab, { action: "lockUpdate", data: false });
      });
    }
  });
}

function popupMessageReceiver() {
  chrome.runtime.onMessage.addListener(function (message, sender) {
    if (message.type === "modeUpdate") {
      mode = message.value;
      modeAWarningAlert()
      if(mode !== "C"){
        setToStorage({lock: false}).then(function() {
          sendMessage(previousActiveTab, { action: "lockUpdate", data: false });
        });
      
      }
      if(mode==="C"){
        c();
      }
    }
    if (message.type === "settingUpdate") {
      if (message.id === "thresholdA") {
        thresholdA = message.value;
      }
      if (message.id === "decayB") {
        decayB = message.value;
      }
      if (message.id === "percentB") {
        percentB = message.value;
      }
      if( message.id === "amountC") {
        amountC = message.value;
      }
    }

  });
}

function initTabList() {
  chrome.tabs.query({}, function (tabs) {
    tabs.forEach(function (tab) {
      tablist[tab.id] = { url: tab.url, active: tab.active, lastActive: Date.now() - (1000), stopwatch: 0, title: tab.title, favicon: tab.favIconUrl };

      if (!tab.active) {
      } else {
        previousActiveTab = tab.id;
        tablist[tab.id].lastActive = Date.now();
      }

    });
  });
}

// Function to handle tab removal in mode A
function a(){
  if(mode !== "A") return;
    let totalTabs = Object.values(tablist).filter(tab => !tab.ignored).length;
   if(totalTabs >= thresholdA-1){

    modeAWarningAlert();
   }
    while(parseInt(totalTabs)> parseInt(thresholdA)){
      const [tabID, oldestTab] = Object.entries(tablist).reduce(
        ([oldestKey, oldestTab], [currentKey, currentTab]) => {
          if (currentTab.ignored) {
            return [oldestKey, oldestTab]; // skip ignored tabs
          }
          if (!oldestTab || currentTab.lastActive < oldestTab.lastActive) {
            return [currentKey, currentTab];
          }
          return [oldestKey, oldestTab];
        },
        [null, null] 
      );

        oldestTabUrl = oldestTab.url;
      
      chrome.tabs.remove([parseInt(tabID)])
      delete tablist[tabID];
      totalTabs = Object.values(tablist).filter(tab => !tab.ignored).length;

    }
}

function modeAWarningAlert(){
  const [tabID, oldestTab] = Object.entries(tablist).reduce(
    ([oldestKey, oldestTab], [currentKey, currentTab]) => {
      if (currentTab.ignored) {
        return [oldestKey, oldestTab]; // skip ignored tabs
      }
      if (!oldestTab || currentTab.lastActive < oldestTab.lastActive) {
        return [currentKey, currentTab];
      }
      return [oldestKey, oldestTab];
    },
    [null, null] 
  );
  oldestTabUrl = oldestTab.url;
  let totalTabs = Object.values(tablist).filter(tab => !tab.ignored).length;
  if((totalTabs >= thresholdA-1) && mode === "A") {
    setToStorage({AWarning : true}).then(function() {
    });
    getFromStorage(['ADismissed']).then(function (result) {
      if (result.ADismissed) {
        sendMessage(previousActiveTab, { action: "closeAlert" });

        return;
      }else{
        const [tabID, oldestTab] = Object.entries(tablist).reduce(
          ([oldestKey, oldestTab], [currentKey, currentTab]) => {
            if (currentTab.ignored) {
              return [oldestKey, oldestTab]; // skip ignored tabs
            }
            if (!oldestTab || currentTab.lastActive < oldestTab.lastActive) {
              return [currentKey, currentTab];
            }
            return [oldestKey, oldestTab];
          },
          [null, null] 
        );
        let url = oldestTab.url;
         sendMessage(previousActiveTab, { action: "popupAlert", message: `You have ${totalTabs} tabs open!<br> The next tab to close is ${url}` });

      }
    });
  }else{
    setToStorage({AWarning : false}).then(function() {
    });
    setToStorage({ADismissed: false}).then(function() {
    });
    sendMessage(previousActiveTab, { action: "closeAlert" });
  }

}
