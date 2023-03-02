function receivePushNotification(event) {
  console.log("[Service Worker] Push Received.");

  const { tag, text, action, title, icon } = event.data.json();

  console.log("Here is the json: ", event.data.json());

  const options = {
    body: text,
    icon: icon,
    badge: "/assets/diamond/icon-192.png",
    tag: tag,
    actions: [{ action: action, title: "View" }]
  };
  //call the method showNotification to show the notification
  event.waitUntil(self.registration.showNotification(title, options));
}
self.addEventListener("push", receivePushNotification);
self.addEventListener("notificationclick", function(event) {
  if (!event.action) {
    return;
  }

  console.log("Here is the action: ", event.action);

  clients.openWindow(event.action);
});
console.log("Service Worker Loaded");
