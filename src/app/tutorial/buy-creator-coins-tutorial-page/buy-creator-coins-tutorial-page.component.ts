import { Component } from "@angular/core";
import { PageLayoutService } from "../../../page-layout.service";

@Component({
  selector: "buy-creator-coins-tutorial-page",
  templateUrl: "./buy-creator-coins-tutorial-page.component.html",
  styleUrls: ["./buy-creator-coins-tutorial-page.component.scss"],
})
export class BuyCreatorCoinsTutorialPageComponent {
  constructor(private pageLayoutService: PageLayoutService) {
    this.pageLayoutService.updateConfig({
      inTutorial: true,
    });
  }
}
