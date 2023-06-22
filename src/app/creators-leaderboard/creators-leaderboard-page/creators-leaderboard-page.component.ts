import { Component } from "@angular/core";
import { PageLayoutService } from "../../../page-layout.service";

@Component({
  selector: "app-creators-leaderboard-page",
  templateUrl: "./creators-leaderboard-page.component.html",
  styleUrls: ["./creators-leaderboard-page.component.scss"],
})
export class CreatorsLeaderboardPageComponent {
  isLeftBarMobileOpen: boolean = false;

  constructor(private pageLayoutService: PageLayoutService) {
    this.pageLayoutService.updateConfig({
      hideSidebar: true,
    });
  }
}
