import { Component, Input, OnInit } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { ActivatedRoute, Router } from "@angular/router";
import { BackendApiService } from "../../backend-api.service";
import { RightBarCreatorsComponent } from "../right-bar-creators.component";
import { HttpClient } from "@angular/common/http";
import { PulseService } from "../../../lib/services/pulse/pulse-service";
import { AltumbaseService } from "../../../lib/services/altumbase/altumbase-service";
import { BithuntService } from "../../../lib/services/bithunt/bithunt-service";

@Component({
  selector: "right-bar-creators-leaderboard",
  templateUrl: "./right-bar-creators-leaderboard.component.html",
  styleUrls: ["./right-bar-creators-leaderboard.component.scss"],
})
export class RightBarCreatorsLeaderboardComponent implements OnInit {
  static MAX_PROFILE_ENTRIES = 10;
  @Input() activeTab: string;

  RightBarCreatorsComponent = RightBarCreatorsComponent;

  constructor(public globalVars: GlobalVarsService, private route: ActivatedRoute, private _router: Router) {}

  ngOnInit() {
    this.globalVars.updateLeaderboard();
  }
  // [routerLink]="['/' + globalVars.RouteNames.USER_PREFIX, profileEntryResponse.Profile.Username]"
  navigateToUser(username: string) {
    this._router.navigate(
        ["/" + this.globalVars.RouteNames.USER_PREFIX, username],
    )
  }

  navigateToHashtag(hashtag: string) {
    this._router.navigate(
      ["/" + this.globalVars.RouteNames.BROWSE + "/" + this.globalVars.RouteNames.TAG, hashtag.substring(1)],
      {
        queryParamsHandling: "merge",
      }
    );
  }
}
