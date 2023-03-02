function receivePushNotification(event) {
  console.log("[Service Worker] Push Received.");

  //const { image, tag, url, title, text } = event.data.json();

  console.log("Here is the json: ", event.data.json());

  const title = "A brand new notification!";

  const options = {
    //data: url,
    // data: "something you want to send within the notification, such an URL to open",
    //body: text,
    body: "hello",
    // icon: "https://via.placeholder.com/128/ff0000",
    // vibrate: [200, 100, 200],
    tag: "testing",
    // image: image,
    // badge: "https://spyna.it/icons/favicon.ico",
    actions: [{ action: "Detail", title: "View" }]
  };
  //call the method showNotification to show the notification
  event.waitUntil(self.registration.showNotification(title, options));
}
self.addEventListener("push", receivePushNotification);
self.addEventListener("notificationclick", function(event) {
  if (!event.action) {
    return;
  }

  // clients.openWindow(event.action);
});
//
// self.addEventListener("install", function(event) {
//   console.log("Service Worker installing.");
// })
//
// self.addEventListener('activate', function(event) {
//   console.log('Service worker activated');
// });
console.log("Whaddup");
