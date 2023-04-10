import { Component, OnInit } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { environment } from "src/environments/environment";
import { BackendApiService, ProfileEntryResponse } from "../../../backend-api.service";
import { GlobalVarsService } from "../../../global-vars.service";

@Component({
  selector: "buy-creator-coins-confirm-tutorial",
  templateUrl: "./buy-creator-coins-confirm-tutorial.component.html",
  styleUrls: ["./buy-creator-coins-confirm-tutorial.component.scss"],
})
export class BuyCreatorCoinsConfirmTutorialComponent implements OnInit {
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
    this.titleService.setTitle(`Buy Creator Coins Tutorial - ${environment.node.name}`);
  }
}
