import { Component } from "@angular/core";
import { PageLayoutService } from "../../page-layout.service";

@Component({
  selector: "creator-profile-page",
  templateUrl: "./creator-profile-page.component.html",
  styleUrls: ["./creator-profile-page.component.scss"],
})
export class CreatorProfilePageComponent {
  constructor(private pageLayoutService: PageLayoutService) {
    this.pageLayoutService.updateConfig({
      showPostButton: true,
    });
  }
}
