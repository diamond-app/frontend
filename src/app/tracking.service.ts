//@ts-strict
import {
  Identify,
  identify,
  init as amplitudeInit,
  setUserId,
  track as amplitudeTrack,
} from "@amplitude/analytics-browser";
import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class TrackingService {
  private _window: Window & { heap: any; hj: any; hjLoad: (opts: any) => void } = window as any;

  constructor() {
    amplitudeInit(environment.amplitude.key, undefined, {
      domain: environment.amplitude.domain,
    });
    this._window.hjLoad({ hjid: environment.hotjar.hjid });
    this._window.heap.load(environment.heap.appId);
  }

  log(event: string, properties: Record<string, any> = {}) {
    Object.assign(properties, { path: window.location.pathname });
    amplitudeTrack(event, properties);
    this._window.heap.track(event, properties);
  }

  identityUser(publicKey: string, properties: Record<string, any> = {}) {
    const user = new Identify();
    Object.keys(properties ?? {}).forEach((key) => user.set(key, properties[key]));
    identify(user);
    this._window.heap.addUserProperties(properties);
    this._window.heap.identify(publicKey);
    setUserId(publicKey);
    this._window.hj("identify", publicKey, properties);
  }
}
