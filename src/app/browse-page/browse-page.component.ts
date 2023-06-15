import { Component, HostListener, OnInit } from "@angular/core";
import { environment } from "../../environments/environment";
import { FeedComponent } from "../feed/feed.component";
import { GlobalVarsService } from "../global-vars.service";
import { PageLayoutService } from "../../page-layout.service";

@Component({
  selector: "browse-page",
  templateUrl: "./browse-page.component.html",
  styleUrls: ["./browse-page.component.sass"],
})
export class BrowsePageComponent implements OnInit {
  FeedComponent = FeedComponent;
  environment = environment;

  activeTab: string = FeedComponent.GLOBAL_TAB;
  isLeftBarMobileOpen = false;
  mobile = false;

  constructor(public globalVars: GlobalVarsService, private pageLayoutService: PageLayoutService) {
    this.pageLayoutService.updateConfig();
  }

  setMobileBasedOnViewport() {
    this.mobile = this.globalVars.isMobile();
  }

  @HostListener("window:resize")
  onResize() {
    this.setMobileBasedOnViewport();
  }

  ngOnInit() {
    this.setMobileBasedOnViewport();
  }
}
