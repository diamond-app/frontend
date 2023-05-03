import { Component } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { PageLayoutService } from "../../../page-layout.service";

@Component({
  selector: "sell-nft-page",
  templateUrl: "./sell-nft-page.component.html",
  styleUrls: ["./sell-nft-page.component.scss"],
})
export class SellNftPageComponent {
  isLeftBarMobileOpen: boolean = false;
  title: string = null;

  constructor(public globalVars: GlobalVarsService, private pageLayoutService: PageLayoutService) {
    this.pageLayoutService.updateConfig({
      onlyContent: true,
      showBottomBar: false,
      simpleTopBar: this.globalVars.isMobile(),
      title: "Sell an NFT",
    });
  }
}
