import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { TrackingService } from "src/app/tracking.service";
import { GlobalVarsService } from "../../global-vars.service";
import { RightBarCreatorsComponent } from "../right-bar-creators.component";

@Component({
  selector: "right-bar-creators-leaderboard",
  templateUrl: "./right-bar-creators-leaderboard.component.html",
  styleUrls: ["./right-bar-creators-leaderboard.component.scss"],
})
export class RightBarCreatorsLeaderboardComponent implements OnInit {
  static MAX_PROFILE_ENTRIES = 10;
  @Input() activeTab: string;

  RightBarCreatorsComponent = RightBarCreatorsComponent;

  constructor(
    public globalVars: GlobalVarsService,
    private route: ActivatedRoute,
    private _router: Router,
    private tracking: TrackingService
  ) {}

  ngOnInit() {
    this.globalVars.updateLeaderboard();
  }
  navigateToUser(username: string) {
    this._router.navigate(["/" + this.globalVars.RouteNames.USER_PREFIX, username]);
  }

  navigateToHashtag(hashtag: string) {
    this.tracking.log("right-rail-hashtag : click", {
      hashtag: hashtag,
    });
    this._router.navigate(
      ["/" + this.globalVars.RouteNames.BROWSE + "/" + this.globalVars.RouteNames.TAG, hashtag.substring(1)],
      {
        queryParamsHandling: "merge",
      }
    );
  }
}
