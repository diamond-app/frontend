import { Component, HostListener, Input, OnInit } from "@angular/core";
import { environment } from "src/environments/environment";
import { GlobalVarsService } from "../global-vars.service";
import { PageLayoutService } from "../../page-layout.service";

@Component({
  selector: "app-page",
  templateUrl: "./page.component.html",
  styleUrls: ["./page.component.scss"],
})
export class PageComponent implements OnInit {
  @Input() hideSidebar: boolean = false;
  @Input() simpleTopBar: boolean = false;
  @Input() title: string = null;
  @Input() showPostButton = false;
  @Input() showBottomBar = true;
  @Input() inTutorial: boolean = false;
  @Input() onlyContent: boolean = false;
  mobile = false;
  environment = environment;

  @HostListener("window:resize") onResize() {
    this.setMobileBasedOnViewport();
  }

  constructor(public globalVars: GlobalVarsService, private pageLayoutService: PageLayoutService) {
    this.pageLayoutService.pageLayoutConfig.subscribe((res) => {
      this.hideSidebar = res.hideSidebar;
      this.simpleTopBar = res.simpleTopBar;
      this.title = res.title;
      this.showPostButton = res.showPostButton;
      this.showBottomBar = res.showBottomBar;
      this.inTutorial = res.inTutorial;
      this.onlyContent = res.onlyContent;
    });
  }

  ngOnInit() {
    this.setMobileBasedOnViewport();
  }

  setMobileBasedOnViewport() {
    this.mobile = this.globalVars.isMobile();
  }
}
