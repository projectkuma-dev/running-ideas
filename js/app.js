/**
 * App entry point: wires up screens, navigation, and the service worker.
 */
import { initCapture } from './capture.js';
import { initSend } from './send.js';
import { initHistory } from './history.js';

const screens = {
  capture: document.getElementById('capture-screen'),
  send: document.getElementById('send-screen'),
  history: document.getElementById('history-screen'),
};

let sendView;
let historyView;

function show(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.hidden = key !== name;
  }
  if (name === 'send') sendView?.render();
  if (name === 'history') historyView?.render();
  window.scrollTo(0, 0);
}

function init() {
  const captureView = initCapture();
  sendView = initSend({
    // After a send, refresh the capture list and go back.
    onAfterSend: () => {
      captureView.render();
      show('capture');
    },
  });
  historyView = initHistory();

  document.getElementById('goto-send-btn').addEventListener('click', () => show('send'));
  document.getElementById('back-btn').addEventListener('click', () => show('capture'));
  document.getElementById('goto-history-btn').addEventListener('click', () => show('history'));
  document.getElementById('history-back-btn').addEventListener('click', () => show('capture'));

  show('capture');
  registerServiceWorker();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js')
      .catch((err) => console.warn('Service worker registration failed:', err));
  });
}

init();
