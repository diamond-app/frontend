import { Component, HostListener, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { BsModalService } from "ngx-bootstrap/modal";
import { environment } from "src/environments/environment";
import { FeedComponent } from "../feed/feed.component";
import { GlobalVarsService } from "../global-vars.service";

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

  constructor(public globalVars: GlobalVarsService, private router: Router, private modalService: BsModalService) {}

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
