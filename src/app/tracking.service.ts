//@ts-strict
import { identify, Identify, init, setUserId, track } from "@amplitude/marketing-analytics-browser";
import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class TrackingService {
  private _window: Window & { heap: any; hj: any } = window as any;

  constructor() {
    if (environment.amplitude.key) {
      init(environment.amplitude.key, window.localStorage.getItem("lastLoggedInUser") ?? undefined, {
        domain: environment.amplitude.domain,
        pageViewTracking: {
          trackHistoryChanges: "pathOnly",
        },
      });
    }

    if (environment.hotjar.hjid) {
      const hotjar = require("../vendor/hotjar-load.js");
      hotjar.load({ hjid: environment.hotjar.hjid });
    }

    if (environment.heap.appId) {
      const heap = require("../vendor/heap-load.js");
      heap.load(environment.heap.appId);
    }
  }

  /**
   * @param event should be in the format of <noun (object/category)> : <present-tense-verb>
   * e.g. "post : like", "signup-button : click", "onboarding-modal : open"
   * @param properties by default we log the current url path. You can pass any
   * additional properties you may want to log here. if status is not explicitly
   * set, we default to "error" if properties.error is set, and default to
   * success if not.
   */
  log(event: string, properties: Record<string, any> = {}) {
    const data: Record<string, any> = {
      path: window.location.pathname,
      ...properties,
    };

    // capture the currently selected feed tab if on the browse page.
    if (window.location.pathname.startsWith("/browse") && typeof data.feedTab === "undefined") {
      data.feedTab = new URLSearchParams(window.location.search).get("feedTab");
    }

    // If the properties object has an error key, we assume the event is an
    // error and we add an `: error` suffix unless it has been added explicitly.
    // This is to make it easier to disambiguate between error and success
    // events in Amplitude.
    let eventName = event;
    if (typeof data.error !== "undefined" && !eventName.endsWith(" : error")) {
      eventName = `${eventName} : error`;
    }

    track(eventName, data);
    this._window.heap.track(eventName, data);
  }

  identifyUser(publicKey?: string, properties: Record<string, any> = {}) {
    const user = new Identify();
    Object.keys(properties ?? {}).forEach((key) => user.set(key, properties[key]));
    identify(user);
    setUserId(publicKey);

    if (this._window.heap) {
      this._window.heap.addUserProperties(properties);
      this._window.heap.identify(publicKey);
    }

    if (this._window.hj) {
      this._window.hj("identify", publicKey, properties);
    }
  }
}
