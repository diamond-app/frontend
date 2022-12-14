import { Component, HostListener, Input, OnInit } from "@angular/core";
import { BsModalService } from "ngx-bootstrap/modal";
import { environment } from "src/environments/environment";
import { GlobalVarsService } from "../global-vars.service";

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

  constructor(public globalVars: GlobalVarsService, private modalService: BsModalService) {}

  ngOnInit() {
    this.setMobileBasedOnViewport();
  }

  setMobileBasedOnViewport() {
    this.mobile = this.globalVars.isMobile();
  }
}
