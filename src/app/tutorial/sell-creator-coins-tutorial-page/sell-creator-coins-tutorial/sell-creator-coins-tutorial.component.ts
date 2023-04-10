import { Component, OnInit } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { environment } from "src/environments/environment";
import { BackendApiService, ProfileEntryResponse } from "../../../backend-api.service";
import { GlobalVarsService } from "../../../global-vars.service";

@Component({
  selector: "sell-creator-coins-tutorial",
  templateUrl: "./sell-creator-coins-tutorial.component.html",
  styleUrls: ["./sell-creator-coins-tutorial.component.scss"],
})
export class SellCreatorCoinsTutorialComponent implements OnInit {
  username: string;
  profile: ProfileEntryResponse;
  loading: boolean = true;

  constructor(
    private globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private titleService: Title,
    private route: ActivatedRoute
  ) {
    this.route.params.subscribe((params) => {
      this.username = params.username;
      this.backendApi.GetSingleProfile("", params.username).subscribe((res) => {
        // How do we want to handle the profile not found or blacklisted case in the tutorial?
        if (!res || res.IsBlacklisted) {
          this.loading = false;
          return;
        }
        this.profile = res.Profile;
        this.loading = false;
      });
    });
  }

  ngOnInit() {
    this.titleService.setTitle(`Sell Creator Coins Tutorial - ${environment.node.name}`);
  }
}
