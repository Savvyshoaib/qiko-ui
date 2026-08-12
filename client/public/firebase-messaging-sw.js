/* global importScripts, firebase */
/* Load Firebase from same origin — CSP blocks https://www.gstatic.com/firebasejs/* */
importScripts("/vendor/firebase-app-compat.js");
importScripts("/vendor/firebase-messaging-compat.js");

// Keep aligned with VITE_FIREBASE_* env values.
firebase.initializeApp({
  apiKey: "AIzaSyCwkWTq_BtE93RtAF6KLKx7ZzPd4ODhsVM",
  authDomain: "qiko-7ecf1.firebaseapp.com",
  projectId: "qiko-7ecf1",
  storageBucket: "qiko-7ecf1.firebasestorage.app",
  messagingSenderId: "358481891207",
  appId: "1:358481891207:web:5e926b31464e6409cc8d22",
  measurementId: "G-DL3K97MT3N",
});

const messaging = firebase.messaging();

function broadcastFcmPayload(payload) {
  const data = payload?.data || {};
  const title = payload?.notification?.title || data.title || "Notification";
  const body = payload?.notification?.body || data.body || "";
  const message = {
    type: "idg-sales-fcm",
    payload: { title, body, data },
  };

  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => client.postMessage(message));
  });
}

messaging.onBackgroundMessage((payload) => {
  const data = payload?.data || {};
  const title = payload?.notification?.title || data.title || "Notification";
  const body = payload?.notification?.body || data.body || "";

  broadcastFcmPayload(payload);

  self.registration.showNotification(title, {
    body,
    data,
    icon: "/qiko-icon.png",
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification?.data || {};
  broadcastFcmPayload({
    data,
    notification: { title: event.notification.title, body: event.notification.body },
  });

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow("/");
    })
  );
});
