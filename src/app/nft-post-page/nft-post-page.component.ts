import { Component } from "@angular/core";
import { GlobalVarsService } from "../global-vars.service";
import { PageLayoutService } from "../../page-layout.service";

@Component({
  selector: "nft-post-page",
  templateUrl: "./nft-post-page.component.html",
  styleUrls: ["./nft-post-page.component.scss"],
})
export class NftPostPageComponent {
  isLeftBarMobileOpen: boolean = false;
  title: string = null;
  constructor(public globalVars: GlobalVarsService, private pageLayoutService: PageLayoutService) {
    this.pageLayoutService.updateConfig({
      simpleTopBar: this.globalVars.isMobile(),
      title: this.title,
    });
  }
}
