console.log("content.js loaded");
// lockScreen()

let locked;
let isLocked = false;

chrome.storage.local.get(['lock'], function (result) {
    locked = result.lock || false;
    console.log("Lock state on content script load:", locked);
    if (locked) {
        startLocker();
    }
});

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
    z-index: 999999999;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: all;
  `;
  lockScreen.innerHTML = `<h1 style="color:black;font-size:2rem;">🔒 Locked</h1>`;
  document.body.appendChild(lockScreen);

}

function startLocker() {
  if (!locker) {
    locker = setInterval(() => {
      lockScreen();
    }, 1000);
    isLocked = true;
  }
}

function stopLocker() {
  if (locker) {
    clearInterval(locker);
    locker = null;
    isLocked = false;
  }
}