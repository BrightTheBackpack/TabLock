console.log("background.js loaded");
let tablist = {};
let userInfo = {};
let previousActiveTab = null;
let mode = false;
let thresholdA;
let decayB;
let percentB;

loadStorageValues();
popupMessageReceiver();

//when new tab is created, add it to the tablist
chrome.tabs.onCreated.addListener(function (tab) {
  console.log('New Tab Created')
  tablist[tab.id] = {url: tab.url, active: tab.active, lastActive: Date.now(), decayed: false};
  a()
  modeAWarningAlert();
});

initTabList();
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if(request.action === "setStorageValue"){
    chrome.storage.local.set({[request.key]: request.value}, function() {
      console.log(`Storage value for ${request.key} set to:`, request.value);
    });
    
  }
  if(request.action === "tabCount"){
    console.log("Tab count request received");
    let count = Object.keys(tablist).length;
    console.log("Current tab count:", count);
    sendResponse({count: count});
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
    if(!mode){
      a();

    }
    console.log("Checking tabs for decay...");
    let { decayCount, totalTabs } = updateDecay();
    

    //check what percent is decayed, and then sends lock
    //todo: chance percent to variable
    console.log(`Total tabs: ${totalTabs}`);
    console.log(`Decayed tabs: ${decayCount}`);
    if(decayCount/ totalTabs >= (percentB/100)){
      console.log("more than 75% tabs decayed");
      chrome.storage.local.set({lock: true}, function() {
        console.log("Decayed tabs status set to true");
        chrome.tabs.query({ active: true }, function(tabs) {
          console.log(tabs)
          chrome.tabs.sendMessage(tabs[0].id, { action: "lockUpdate", data: true});
        });

      });
    
    }

}})

//when tab url changes, update the tablist
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    tablist[tabId].url = tab.url;
    modeAWarningAlert();
  }
});
//when tab deleted, remove it from the tablist
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  console.log("Tab removed:", tabId);
  delete tablist[tabId];
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
  chrome.storage.local.get(['lock', 'thresholdA', 'decayB', 'percentB'], function (result) {
    thresholdA = result.thresholdA || 15;
    decayB = result.decayB || 20;
    percentB = result.percentB || 60;
    console.log("Threshold A:", thresholdA);
    console.log("Decay B:", decayB);
    console.log("Percent B:", percentB);
  });
}

function popupMessageReceiver() {
  chrome.runtime.onMessage.addListener(function (message, sender) {
    if (message.type === "lockUpdate") {
      console.log("Popup says lock is:", message.value);
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
      tablist[tab.id] = { url: tab.url, active: tab.active, lastActive: Date.now() - (1000) };

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
  console.log(tablist)
    console.log('mode A')
    let totalTabs = Object.keys(tablist).length;
    console.log("Total tabs:", totalTabs, "Threshold A:", thresholdA);
   if(totalTabs >= thresholdA-1){

    modeAWarningAlert();
   }
    while(totalTabs> thresholdA){
      console.log("Current total tabs:", totalTabs);
       const [tabID, oldestTab] = Object.entries(tablist).reduce(
        ([oldestKey, oldestTab], [currentKey, currentTab]) =>
          currentTab.lastActive < oldestTab.lastActive
            ? [currentKey, currentTab]
            : [oldestKey, oldestTab]
        );

      console.log(oldestTab, tabID)
      
      chrome.tabs.remove([parseInt(tabID)])
      delete tablist[tabID];
      totalTabs = Object.keys(tablist).length;

    }
}

function modeAWarningAlert(){
  console.log("modeAWarningAlert called");
  let totalTabs = Object.keys(tablist).length;
  console.log(mode, "modeA")
  console.log("Total tabs:", totalTabs, "Threshold A:", thresholdA);
  if((totalTabs >= thresholdA-1) && !mode){
    chrome.storage.local.set({AWarning : false}, function() {
      console.log("AWarning set to true");
    });
    chrome.storage.local.get(['ADismissed'], function (result) {
      if (result.ADismissed) {
        console.log("AWarning already dismissed, not showing alert");
        return;
      }else{
        const [tabID, oldestTab] = Object.entries(tablist).reduce(
          ([oldestKey, oldestTab], [currentKey, currentTab]) =>
            currentTab.lastActive < oldestTab.lastActive
              ? [currentKey, currentTab]
              : [oldestKey, oldestTab]
        );
        let url = oldestTab.url;
         chrome.tabs.sendMessage(previousActiveTab, { action: "popupAlert", message: `You have ${totalTabs} tabs open!<br> The next tab to close is ${url}` });

      }
    });
  }else{
    chrome.storage.local.set({AWarning : false}, function() {
      console.log("AWarning set to true");
    });
    chrome.storage.local.set({ADismissed: false}, function() {
      console.log("ADismissed set to false");
    });
  }

}