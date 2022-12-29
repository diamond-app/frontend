//@ts-strict
import {
  Identify,
  identify,
  init as amplitudeInit,
  setUserId,
  track as amplitudeTrack,
} from "@amplitude/analytics-browser";
import { Injectable, isDevMode } from "@angular/core";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class TrackingService {
  private _window: Window & { heap: any; hj: any; hjLoad: (opts: any) => void } = window as any;


  constructor() {
    if (isDevMode()) return;
    amplitudeInit(environment.amplitude.key, undefined, {
      domain: environment.amplitude.domain,
    });
    const hotjar = require("../vendor/hotjar-load.js")
    hotjar.load({ hjid: environment.hotjar.hjid });
    const heap = require("../vendor/heap-load.js")
    heap.load(environment.heap.appId);
  }

  log(event: string, properties: Record<string, any> = {}) {
    Object.assign(properties, { path: window.location.pathname });

    if (isDevMode()) {
      console.log("trackingLogEvent->", event, properties);
      return;
    }

    amplitudeTrack(event, properties);
    this._window.heap.track(event, properties);
  }

  identityUser(publicKey: string, properties: Record<string, any> = {}) {
    if (isDevMode()) {
      console.log("trackingIdentityUser->", publicKey, properties);
      return;
    }

    const user = new Identify();
    Object.keys(properties ?? {}).forEach((key) => user.set(key, properties[key]));
    identify(user);
    this._window.heap.addUserProperties(properties);
    this._window.heap.identify(publicKey);
    setUserId(publicKey);
    this._window.hj("identify", publicKey, properties);
  }
}
