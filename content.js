console.log("content.js loaded");
// lockScreen()

let locked;
let isLocked = false;

//get lock status
chrome.storage.local.get(['lock'], function (result) {
    locked = result.lock || false;
    console.log("Lock state on content script load:", locked);
    if (locked) {
        startLocker();
    }
});
//listen for lock updates
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "lockUpdate") {
    if(request.value == true){
      startLocker();
    } 
   
  }
});


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
    z-index: 999999999;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: all;
  `;
  lockScreen.innerHTML = `<h1 style="color:black;font-size:2rem;">🔒 Locked</h1>`;
  document.body.appendChild(lockScreen);

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
    locker = null;
    isLocked = false;
  }
}