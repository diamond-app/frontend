function receivePushNotification(event) {
  console.log("[Service Worker] Push Received.");

  //const { image, tag, url, title, text } = event.data.json();

  // const notificationText = event.data.text();
  const title = "A brand new notification!";

  const options = {
    //data: url,
    data: "something you want to send within the notification, such an URL to open"
    //body: text,
    body: "hello",
    //icon: image,
    vibrate: [200, 100, 200],
    //tag: tag,
    //image: image,
    badge: "https://spyna.it/icons/favicon.ico",
    actions: [{ action: "Detail", title: "View", icon: "https://via.placeholder.com/128/ff0000" }]
  };
  //call the method showNotification to show the notification
  event.waitUntil(self.registration.showNotification(title, options));
}
self.addEventListener("push", receivePushNotification);
//
// self.addEventListener("install", function(event) {
//   console.log("Service Worker installing.");
// })
//
// self.addEventListener('activate', function(event) {
//   console.log('Service worker activated');
// });
console.log("Whaddup");
