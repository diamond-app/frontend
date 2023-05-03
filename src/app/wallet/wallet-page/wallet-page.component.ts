import { Component } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { PageLayoutService } from "../../../page-layout.service";

@Component({
  selector: "wallet-page",
  templateUrl: "./wallet-page.component.html",
  styleUrls: ["./wallet-page.component.scss"],
})
export class WalletPageComponent {
  constructor(public globalVars: GlobalVarsService, private pageLayoutService: PageLayoutService) {
    this.pageLayoutService.updateConfig({
      hideSidebar: true,
    });
  }
}
