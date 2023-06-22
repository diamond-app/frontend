import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import cloneDeep from "lodash/cloneDeep";

interface PageLayoutConfig {
  hideSidebar: boolean;
  simpleTopBar: boolean;
  title: string;
  showPostButton: boolean;
  showBottomBar: boolean;
  inTutorial: boolean;
  onlyContent: boolean;
}

@Injectable({
  providedIn: "root",
})
export class PageLayoutService {
  private readonly defaultConfig: PageLayoutConfig = {
    hideSidebar: false,
    simpleTopBar: false,
    title: "",
    showPostButton: false,
    showBottomBar: true,
    inTutorial: false,
    onlyContent: false,
  };

  private config$: BehaviorSubject<PageLayoutConfig> = new BehaviorSubject<PageLayoutConfig>(this.defaultConfig);

  constructor() {
    this.config$.next(cloneDeep(this.defaultConfig));
  }

  get pageLayoutConfig() {
    return this.config$.asObservable();
  }

  updateConfig(options: Partial<PageLayoutConfig> = {}) {
    const defaultCopy = cloneDeep(this.defaultConfig);

    this.config$.next({
      ...defaultCopy,
      ...options,
    });
  }
}
