/**
 * App entry point: wires up screens, navigation, and the service worker.
 */
import { initCapture } from './capture.js';
import { initSend } from './send.js';

const screens = {
  capture: document.getElementById('capture-screen'),
  send: document.getElementById('send-screen'),
};

let sendView;

function show(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.hidden = key !== name;
  }
  if (name === 'send') sendView?.render();
  window.scrollTo(0, 0);
}

function init() {
  const captureView = initCapture();
  sendView = initSend({
    // After a send (and possible clear), refresh the capture list and go back.
    onAfterSend: () => {
      captureView.render();
      show('capture');
    },
  });

  document.getElementById('goto-send-btn').addEventListener('click', () => show('send'));
  document.getElementById('back-btn').addEventListener('click', () => show('capture'));

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
