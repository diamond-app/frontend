import { Component } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { PageLayoutService } from "../../../page-layout.service";

@Component({
  selector: "wallet-tutorial-page",
  templateUrl: "./wallet-tutorial-page.component.html",
  styleUrls: ["./wallet-tutorial-page.component.scss"],
})
export class WalletTutorialPageComponent {
  constructor(public globalVars: GlobalVarsService, private pageLayoutService: PageLayoutService) {
    this.pageLayoutService.updateConfig({
      inTutorial: true,
    });
  }
}
