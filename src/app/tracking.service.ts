//@ts-strict
import { identify, Identify, init, setUserId, track } from "@amplitude/marketing-analytics-browser";
import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { parseQueryParams } from "src/lib/helpers/query-param-helpers";

@Injectable({
  providedIn: "root",
})
export class TrackingService {
  private _window: Window & { heap: any; hj: any; hjLoad: (opts: any) => void } = window as any;

  constructor() {
    if (environment.amplitude.key) {
      init(environment.amplitude.key, window.localStorage.getItem("lastLoggedInUser") ?? undefined, {
        domain: environment.amplitude.domain,

        // NOTE: uncomment to see detailed logs for each event that is fired in the console
        logLevel: 4,

        pageViewTracking: {
          trackHistoryChanges: "pathOnly",
        },
      });
    }

    if (environment.hotjar.hjid) {
      this._window.hjLoad({ hjid: environment.hotjar.hjid });
    }

    if (environment.heap.appId) {
      this._window.heap.load(environment.heap.appId);
    }
  }

  /**
   * @param event should be in the format of <noun (object/category)> : <present-tense-verb>
   * e.g. "post : like", "signup-button : click", "onboarding-modal : open"
   * @param properties by default we log the current url path, query params, and
   * if the user is logged in. Pass any context specific properties you may want to
   * log here.
   */
  log(event: string, properties: Record<string, any> = {}) {
    const payload = {
      isLoggedIn: !!localStorage.getItem("lastLoggedInUser"),
      path: window.location.pathname,
      ...parseQueryParams(),
      ...properties,
    };

    track(event, payload);
    this._window.heap.track(event, payload);
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
