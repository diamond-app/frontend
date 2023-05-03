import { Component } from "@angular/core";
import { PageLayoutService } from "../../../page-layout.service";

@Component({
  selector: "buy-creator-coins-tutorial-page",
  templateUrl: "./buy-deso-tutorial-page.component.html",
  styleUrls: ["./buy-deso-tutorial-page.component.scss"],
})
export class BuyDesoTutorialPageComponent {
  constructor(private pageLayoutService: PageLayoutService) {
    this.pageLayoutService.updateConfig({
      inTutorial: true,
    });
  }
}
