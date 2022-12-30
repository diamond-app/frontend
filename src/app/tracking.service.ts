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
   * @param properties by default we log the current url path, and if the user
   * is onboarding. You can pass any additional properties you may want to log
   * here. if status is not explicitly set, we default to "error" if
   * properties.error is set, and default to success if not.
   */
  log(event: string, properties: Record<string, any> = {}) {
    const data: Record<string, any> = {
      // common props we log with every event
      path: window.location.pathname,
      // isOnboarding: this.globalVars.userSigningUp,
      ...properties,
    };

    data.status = data.status ?? (!!data.error ? "error" : "success");

    // capture the currently selected feed tab if on the browse page.
    if (window.location.pathname.startsWith("/browse")) {
      data.feedTab = window.localStorage.getItem("mostRecentFeedTab");
    }

    track(event, data);
    this._window.heap.track(event, data);
  }

  identityUser(publicKey?: string, properties: Record<string, any> = {}) {
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
