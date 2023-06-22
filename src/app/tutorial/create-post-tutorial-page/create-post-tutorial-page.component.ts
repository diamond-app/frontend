import { Component } from "@angular/core";
import { PageLayoutService } from "../../../page-layout.service";

@Component({
  selector: "create-post-tutorial-page",
  templateUrl: "./create-post-tutorial-page.component.html",
  styleUrls: ["./create-post-tutorial-page.component.scss"],
})
export class CreatePostTutorialPageComponent {
  constructor(private pageLayoutService: PageLayoutService) {
    this.pageLayoutService.updateConfig({
      inTutorial: true,
    });
  }
}
