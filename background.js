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
});

initTabList();


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




function updateDecay() {
  let decayCount = 0;
  let totalTabs = Object.keys(tablist).length;
  for (const tabId in tablist) {
    console.log(`Checking tab ${tabId}...`);
    const tab = tablist[tabId];
    console.log(`Tab ${tabId} - Active: ${tab.active}, Last Active: ${tab.lastActive}, Current Time Threshold: ${Date.now() - (1000* 60 *decayB)}`);
    let isLengthOfTime = tab.lastActive < Date.now() - (1000* 60 *decayB); //chjange to 1200000
    console.log(isLengthOfTime, !tab.active);
    if (!tab.active && isLengthOfTime) {
      console.log(`Tab ${tabId} has been inactive for more than the alloted time.`);
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
    console.log('mode A')
    let totalTabs = Object.keys(tablist).length;
    console.log("Total tabs:", totalTabs, "Threshold A:", thresholdA);
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