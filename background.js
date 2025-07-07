console.log("background.js loaded");
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

//when new tab is created, add it to the tablist
chrome.tabs.onCreated.addListener(function (tab) {
  console.log('New Tab Created');
  console.log(tab)
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
    chrome.storage.local.set({[request.key]: request.value}, function() {
      console.log(`Storage value for ${request.key} set to:`, request.value);
    });
    
  }
  if(request.action === "tabCount"){
    console.log("Tab count request received");
    let count = Object.values(tablist).filter(tab=>!tab.ignored).length;
    let ignoredCount = Object.values(tablist).filter(tab=>tab.ignored).length;
    console.log("Current tab count:", count);
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
      console.log("Tab closed:", request.tabId);
      delete tablist[request.tabId];
      modeAWarningAlert();
      sendResponse({status: "success"});
    });
    return true; // Keep the message channel open for sendResponse
  }
  if( request.action === "ignoreTab"){
    let totalIgnored = Object.values(tablist).filter(tab => tab.ignored).length;
    console.log("Total ignored tabs:", totalIgnored);
    console.log(tablist)
    if(totalIgnored < 3){
    const tabId = request.tabId;
    tablist[tabId].ignored = true;
    console.log("Tab ignored:", tabId);
    sendResponse({status: "success"});

    }
    sendResponse({status: "too many tabs"});

    
  }
  if(request.action === "unignoreTab"){
    const tabId = request.tabId;
    tablist[tabId].ignored = false;
  
  }
});


chrome.idle.setDetectionInterval(30); //set idle detection interval to 30 seconds

//alarm to check for tab decay
chrome.alarms.create('checkTabs', {
  delayInMinutes: 1,
  periodInMinutes: 1
});

//listner for user idle
chrome.idle.onStateChanged.addListener((newState) => {
    console.log("state changed to:", newState);

    if (newState === "idle" || newState === "locked") {
      userInfo.lastActive = Date.now();
      userInfo.state = newState;
      
    }else{
      userInfo.lastActive = Date.now();
      userInfo.state = newState;

    }
  });


updateActiveTab();

//alarm to check for tab decay 2.0
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== 'install') {
    return;
  }

  await chrome.alarms.create('checkTabs', {
    delayInMinutes: 1,
    periodInMinutes: 1
  });
});


chrome.alarms.onAlarm.addListener((alarm) => {
  console.log("Alarm triggered:", alarm.name);
  
  if (alarm.name === 'checkTabs') {
    if(mode === "A"){
      a();

    }
    if( mode ==="C"){
      c();
    }
    // console.log("Checking tabs for decay...");
    // let { decayCount, totalTabs } = updateDecay();
    

    //check what percent is decayed, and then sends lock
    //todo: chance percent to variable
    // console.log(`Total tabs: ${totalTabs}`);
    // console.log(`Decayed tabs: ${decayCount}`);
    // if(decayCount/ totalTabs >= (percentB/100)){
    //   console.log("more than 75% tabs decayed");
    //   chrome.storage.local.set({lock: true}, function() {
    //     console.log("Decayed tabs status set to true");
    //     chrome.tabs.query({ active: true }, function(tabs) {
    //       console.log(tabs)
    //       chrome.tabs.sendMessage(tabs[0].id, { action: "lockUpdate", data: true});
    //     });

    //   });
    
    // }

}})

function c() {
  let tabCount = Object.values(tablist).filter(tab => !tab.ignored).length;
  if( tabCount > amountC) {
    chrome.storage.local.set({lock:true}, function() {
      chrome.tabs.query({ active: true }, function(tabs) {
        console.log("Sending lock update to content script");
        chrome.tabs.sendMessage(tabs[0].id, { action: "lockUpdate", data: true });
      });
    });
  }
}
//when tab url changes, update the tablist
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    console.log(tab)
    tablist[tabId].url = tab.url;
    tablist[tabId].lastActive = Date.now();
    tablist[tabId].title = tab.title;
    tablist[tabId].favicon = tab.favIconUrl;
    modeAWarningAlert();
  }
});
//when tab deleted, remove it from the tablist
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  console.log("Tab removed:", tabId);
  delete tablist[tabId];
  modeAWarningAlert();
});

function updateDecay() {
  let decayCount = 0;
  let totalTabs = Object.keys(tablist).length;
  for (const tabId in tablist) {
    const tab = tablist[tabId];
    let isLengthOfTime = tab.lastActive < Date.now() - (1000* 60 *decayB); //chjange to 1200000
    console.log(isLengthOfTime, !tab.active);
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
    console.log("tab deactivated:", previousActiveTab);
    previousActiveTab = activeInfo.tabId;
    console.log("Tab activated:", activeInfo.tabId);
    modeAWarningAlert();

  });
}

function loadStorageValues() {
  chrome.storage.local.get(['mode', 'thresholdA', 'decayB', 'percentB', 'amountC'], function (result) {
    thresholdA = result.thresholdA || 15;
    decayB = result.decayB || 20;
    percentB = result.percentB || 60;
    mode = result.mode || "A";
    amountC = result.amountC || 5;
    console.log("Threshold A:", thresholdA);
    console.log("Decay B:", decayB);
    console.log("Percent B:", percentB);
    console.log("Amount C:", amountC);
  });
}

function popupMessageReceiver() {
  chrome.runtime.onMessage.addListener(function (message, sender) {
    if (message.type === "modeUpdate") {
      console.log("Popup says mode is:", message.value);
      mode = message.value;
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
      console.log(`Setting ${message.id} updated to:`, message.value, " in back ground.js");
    }

  });
}

function initTabList() {
  chrome.tabs.query({}, function (tabs) {
    tabs.forEach(function (tab) {
      tablist[tab.id] = { url: tab.url, active: tab.active, lastActive: Date.now() - (1000), stopwatch: 0, title: tab.title, favicon: tab.favIconUrl };

      if (!tab.active) {
        console.log("Inactive tab found:", tab.id, tab.url);
      } else {
        previousActiveTab = tab.id;
        console.log("Tab ID:", tab.id, "URL:", tab.url);
        tablist[tab.id].lastActive = Date.now();
        console.log(Date.now(), "Tab last active time set for ID:", tab.id);
      }

    });
    console.log("Tab list initialized:", tablist);
  });
}

// Function to handle tab removal in mode A
function a(){
  if(mode !== "A") return;
  console.log(tablist)
    console.log('mode A')
    let totalTabs = Object.values(tablist).filter(tab => !tab.ignored).length;
    console.log("Total tabs:", parseInt(totalTabs), "Threshold A:", parseInt(thresholdA));
   if(totalTabs >= thresholdA-1){

    modeAWarningAlert();
   }
    while(parseInt(totalTabs)> parseInt(thresholdA)){
      console.log("Current total tabs:", totalTabs);
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
      console.log(oldestTab, tabID)
      
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
    chrome.storage.local.set({AWarning : false}, function() {
    });
    chrome.storage.local.get(['ADismissed'], function (result) {
      if (result.ADismissed) {
        chrome.tabs.sendMessage(previousActiveTab, { action: "closeAlert" });

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
         chrome.tabs.sendMessage(previousActiveTab, { action: "popupAlert", message: `You have ${totalTabs} tabs open!<br> The next tab to close is ${url}` });

      }
    });
  }else{
    chrome.storage.local.set({AWarning : false}, function() {
    });
    chrome.storage.local.set({ADismissed: false}, function() {
    });
    chrome.tabs.sendMessage(previousActiveTab, { action: "closeAlert" });
  }

}

setInterval(() => {
  if((userInfo.state === "active") && isChromeFocused) {
    console.log("User is active, resetting stopwatches");
    chrome.tabs.query({}, (tabs) => {
      
      for(const tab of tabs){
        // console.log("checking tab:", tab.url, " active?:", tablist[tab.id].stopwatch)
        if(!tablist[tab.id].ignored) continue; // skip if tab is not in tablist
        if(tablist[tab.id].active == true){
          // console.log("checking tab:", tab, " active?:", tab.active)

          tablist[tab.id].stopwatch = 0;
        }else{
          tablist[tab.id].stopwatch += 1;
        }
        if(tablist[tab.id].stopwatch >= (decayB/60) && (mode === "B")) {
          console.log("Tab has been inactive for 10 minutes, removing:", tab.id);
          chrome.tabs.remove(tab.id);
          delete tablist[tab.id];
        }
      }
      
    })
  }


}, 1000)