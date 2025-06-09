console.log("background.js loaded");
let tablist = {};
let userInfo = {};
let previousActiveTab = null;
let mode = false;
chrome.runtime.onMessage.addListener(function (message, sender) {
  if (message.type === "lockUpdate") {
    console.log("Popup says lock is:", message.value);
    mode = message.value;
  }
});

chrome.tabs.query({ }, function (tabs) {
    tabs.forEach(function (tab) {
        tablist[tab.id] = {url: tab.url, active: tab.active};

        if(!tab.active){ 
            console.log("Inactive tab found:", tab.id, tab.url);
        }else{
            previousActiveTab = tab.id;
            console.log("Tab ID:", tab.id, "URL:", tab.url);
            tablist[tab.id].lastActive = Date.now();
            console.log(Date.now(), "Tab last active time set for ID:", tab.id);
        }

    });
    console.log("Tab list initialized:", tablist);
});
chrome.idle.setDetectionInterval(15);
   chrome.alarms.create('checkTabs', {
    delayInMinutes: 1,
    periodInMinutes: 1
  });
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
    console.log("Checking tabs for decay...");
    let decayCount = 0;
    let totalTabs = Object.keys(tablist).length;
    for(const tabId in tablist) {
      console.log(`Checking tab ${tabId}...`);
      const tab = tablist[tabId];
      console.log(`Tab ${tabId} - Active: ${tab.active}, Last Active: ${tab.lastActive}, Current Time: ${Date.now()- 30000}`);
      let isLengthOfTime = tab.lastActive < Date.now() - 3000;//chjange to 1200000
      console.log(isLengthOfTime, !tab.active);
      if (!tab.active && isLengthOfTime) { 
        console.log(`Tab ${tabId} has been inactive for more than 20 minute.`);
        tab.decayed = true;
      }
      if(tab.decayed){
      decayCount++;
    }

    }
 
    if(decayCount > 0){
      console.log(`Total decayed tabs: ${decayCount}`);
    }
    console.log(`Total tabs: ${totalTabs}`);
    if(decayCount/ totalTabs >= 0.75){
      console.log("more than 75% tabs decayed");
      chrome.storage.set({lock: true}, function() {
        console.log("Decayed tabs status set to true");
      });
    
    }

}})