console.log("content.js loaded");



 if (alarm.name === 'checkLock') {
      chrome.storage.local.get('lock', (result)=> {
        console.log(result)
      })
    }

async function onTabVisible() {
    console.log("Tab is now visible");
    await chrome.storage.local.get(['lock'], (result) => {
        console.log(result)
    });
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    onTabVisible();
  }
});

// Optional: also trigger on load if already visible
if (document.visibilityState === "visible") {
  onTabVisible();
}
//also later make it so it auto deletes after a certain time