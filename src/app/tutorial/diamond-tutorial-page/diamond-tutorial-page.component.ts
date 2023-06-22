import { Component } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { PageLayoutService } from "../../../page-layout.service";

@Component({
  selector: "diamond-tutorial-page",
  templateUrl: "./diamond-tutorial-page.component.html",
  styleUrls: ["./diamond-tutorial-page.component.scss"],
})
export class DiamondTutorialPageComponent {
  constructor(public globalVars: GlobalVarsService, private pageLayoutService: PageLayoutService) {
    this.pageLayoutService.updateConfig({
      inTutorial: true,
    });
  }
}
