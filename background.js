let tablist = {};
let userInfo = {};
let previousActiveTab = null;
let mode = "A";
let thresholdA;
let isChromeFocused = true;

let decayB;
let percentB;
let amountC;
let closeC;
let oldestTabUrl;
let stopwatchStart = Date.now();
userInfo.state = "active";
loadStorageValues();
popupMessageReceiver();

//when new tab is created, add it to the tablist
chrome.tabs.onCreated.addListener(function (tab) {
  tablist[tab.id] = { url: tab.url, active: tab.active, lastActive: Date.now(), decayed: false, stopwatch: 0, title: tab.title, favicon: tab.favIconUrl };

  a()
  modeAWarningAlert();
  if (mode === "C") {
    c();
  }

});

initTabList();
chrome.windows.onFocusChanged.addListener((windowId) => {
  isChromeFocused = windowId !== chrome.windows.WINDOW_ID_NONE;
});

//messages from popup and content
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "setStorageValue") {
    chrome.storage.local.set({ [request.key]: request.value }, function () {
    });

  }
  if (request.action === "getStorageValue") {
    chrome.storage.local.get([request.key], function (result) {
      sendResponse({ value: result[request.key] });
    });
    return true; // Keep the message channel open for sendResponse
  }
  if (request.action === "tabCount") {
    let count = Object.values(tablist).filter(tab => !tab.ignored).length;
    let ignoredCount = Object.values(tablist).filter(tab => tab.ignored).length;
    sendResponse({ count: count, ignoredCount: ignoredCount });
  }
  if (request.action === "oldestTab") {
    sendResponse({ url: oldestTabUrl });
  }
  if (request.action === "tabList") {
    sendResponse({ tabList: tablist });
  }
  if (request.action === "closeTab") {
    sendAlert('test')

    chrome.tabs.remove(request.tabId, function () {
      delete tablist[request.tabId];
      modeAWarningAlert();
      if (mode === "C") {
        c();
      }
      sendResponse({ status: "success" });
    });
    return true; // Keep the message channel open for sendResponse
  }
  if (request.action === "ignoreTab") {
    let totalIgnored = Object.values(tablist).filter(tab => tab.ignored).length;
    if (totalIgnored < 4) {
      const tabId = request.tabId;
      tablist[tabId].ignored = true;
      sendResponse({ status: "success" });

    }
    sendResponse({ status: "too many tabs" });


  }
  if (request.action === "unignoreTab") {
    const tabId = request.tabId;
    tablist[tabId].ignored = false;

  }
  if (request.action === "closeTab") {
    const tabId = request.tabId;
    sendAlert('test')

    chrome.tabs.remove(tabId, function () {
      delete tablist[tabId];
      
      modeAWarningAlert();
      if (mode === "C") {
        c();
      }
      sendResponse({ status: "success" });
    });
  }
  if (request.action === "tick") {
    if ((userInfo.state === "active")) {
      chrome.tabs.query({}, (tabs) => {

        for (const tab of tabs) {
          if (tablist[tab.id].ignored == true) continue; // skip if tab is not in tablist
          if (tablist[tab.id].active == true) {

            tablist[tab.id].stopwatch = 0;
          } else {
            tablist[tab.id].stopwatch += 1;
          }
          if (tablist[tab.id].stopwatch >= (parseInt(decayB) * 60) && (mode === "B")) {
            sendAlert('test')

            chrome.tabs.remove(tab.id);
            delete tablist[tab.id];
          }
        }

      })
    }
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

  if (newState === "idle" || newState === "locked") {
    userInfo.lastActive = Date.now();
    userInfo.state = newState;

  } else {
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

  if (alarm.name === 'checkTabs') {
    if (mode === "A") {
      a();

    }
    if (mode === "C") {
      c();
    }


  }
})

function c() {
  let tabCount = Object.values(tablist).filter(tab => !tab.ignored).length;

  if (tabCount > parseInt(amountC)) {

    chrome.storage.local.set({ lock: true }, function () {
      chrome.tabs.query({ active: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "lockUpdate", data: true });
      });
    });
  }
  chrome.storage.local.get(['lock'], function (result) {
    if (result.lock === true) {
      if (tabCount > parseInt(amountC) / 2) {
        chrome.storage.local.set({ lock: true }, function () {
          chrome.tabs.query({ active: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "lockUpdate", data: true });
          });
        });
      } else {
        chrome.storage.local.set({ lock: false }, function () {
          chrome.tabs.query({ active: true }, function (tabs) {
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
    if (mode === "C") {
      c();
    }
  }
});
//when tab deleted, remove it from the tablist
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {

  delete tablist[tabId];
  modeAWarningAlert();
  if (mode === "C") {
    c();
  }
});

function updateDecay() {
  let decayCount = 0;
  let totalTabs = Object.keys(tablist).length;
  for (const tabId in tablist) {
    const tab = tablist[tabId];
    let isLengthOfTime = tab.lastActive < Date.now() - (1000 * 60 * decayB); //chjange to 1200000
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
    if (mode === "C") {
      c();
    }

  });
}

function loadStorageValues() {
  chrome.storage.local.get(['mode', 'thresholdA', 'decayB', 'percentB', 'amountC'], function (result) {
    thresholdA = result.thresholdA || 15;
    decayB = result.decayB || 20;
    percentB = result.percentB || 60;
    mode = result.mode || "A";
    amountC = result.amountC || 5;
    if (mode !== "C") {
      chrome.storage.local.set({ lock: false }, function () {
        chrome.tabs.sendMessage(previousActiveTab, { action: "lockUpdate", data: false });
      });
    }
  });
}

function popupMessageReceiver() {
  chrome.runtime.onMessage.addListener(function (message, sender) {
    if (message.type === "modeUpdate") {
      mode = message.value;
      modeAWarningAlert()
      if (mode !== "C") {
        chrome.storage.local.set({ lock: false }, function () {
          chrome.tabs.sendMessage(previousActiveTab, { action: "lockUpdate", data: false });
        });

      }
      if (mode === "C") {
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
      if (message.id === "amountC") {
        amountC = message.value;
      }
      if (message.id === "closeC"){
        closeC = message.value;
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
function a() {
  if (mode !== "A") return;
  let totalTabs = Object.values(tablist).filter(tab => !tab.ignored).length;
  if (totalTabs >= thresholdA - 1) {

    modeAWarningAlert();
  }
  while (parseInt(totalTabs) > parseInt(thresholdA)) {
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
    sendAlert('test')

    chrome.tabs.remove([parseInt(tabID)])
    delete tablist[tabID];
    totalTabs = Object.values(tablist).filter(tab => !tab.ignored).length;

  }
}

function modeAWarningAlert() {
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
  if ((totalTabs >= thresholdA - 1) && mode === "A") {
    chrome.storage.local.set({ AWarning: true }, function () {
    });
    chrome.storage.local.get(['ADismissed'], function (result) {
      if (result.ADismissed) {
        chrome.tabs.sendMessage(previousActiveTab, { action: "closeAlert" });

        return;
      } else {
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
  } else {
    chrome.storage.local.set({ AWarning: false }, function () {
    });
    chrome.storage.local.set({ ADismissed: false }, function () {
    });
    chrome.tabs.sendMessage(previousActiveTab, { action: "closeAlert" });
  }

}
function sendAlert(message){
  console.log("sending alert")
  chrome.tabs.sendMessage(previousActiveTab, { action: 'alert', message: message})
}