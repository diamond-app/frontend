import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { BsModalService } from "ngx-bootstrap/modal";
import { of } from "rxjs";
import { map, switchMap, takeWhile } from "rxjs/operators";
import { environment } from "../../environments/environment";
import { BackendApiService, ProfileEntryResponse } from "../backend-api.service";
import { BuyDesoModalComponent } from "../buy-deso-page/buy-deso-modal/buy-deso-modal.component";
import { GlobalVarsService } from "../global-vars.service";

export class RightBarTabOption {
  name: string;
  width: number;
  poweredBy: {
    name: string;
    link: string;
  };
}

@Component({
  selector: "right-bar-creators",
  templateUrl: "./right-bar-creators.component.html",
  styleUrls: ["./right-bar-creators.component.sass"],
})
export class RightBarCreatorsComponent implements OnInit {
  @Input() inTutorial: boolean = false;
  isDestroyed: boolean = false;
  earningsProfile?: ProfileEntryResponse;

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private router: Router,
    private route: ActivatedRoute,
    private modalService: BsModalService
  ) {
    route.params
      .pipe(
        takeWhile(() => !this.isDestroyed),
        switchMap(({ username }) => {
          // NOTE: If we are viewing another profile we show earnings for that
          // profile. Otherwise, we show earnings for the currently logged in
          // user (or nothing in case there is no logged in user)
          if (
            username &&
            router.url.startsWith(`/u/${username}`) &&
            username !== this.globalVars.loggedInUser?.ProfileEntryResponse.Username
          ) {
            return this.backendApi
              .GetSingleProfile(this.globalVars.localNode, "", username)
              .pipe(map((res) => res.Profile));
          } else {
            return of(this.globalVars.loggedInUser?.ProfileEntryResponse);
          }
        })
      )
      .subscribe((profile) => {
        this.earningsProfile = profile;
      });
  }

  activeTab: string;
  selectedOptionWidth: string;
  activeRightTabOption: RightBarTabOption;
  RightBarCreatorsComponent = RightBarCreatorsComponent;
  static RightBarTabKey = "RightBarTab";

  static GAINERS: RightBarTabOption = {
    name: "right_bar.creators.top_daily_gainers",
    width: 175,
    poweredBy: { name: "Altumbase", link: `https://altumbase.com/tools?${environment.node.name}` },
  };
  static DIAMONDS: RightBarTabOption = {
    name: "right_bar.creators.top_daily_diamond_creators",
    width: 275,
    poweredBy: { name: "Altumbase", link: `https://altumbase.com/tools?${environment.node.name}` },
  };
  static COMMUNITY: RightBarTabOption = {
    name: "right_bar.creators.top_community_projects",
    width: 225,
    poweredBy: { name: "BitHunt", link: "https://bithunt.com" },
  };
  static HASHTAGS: RightBarTabOption = {
    name: "Top Daily Hashtags",
    width: 225,
    poweredBy: { name: "Open Prosper", link: "https://openprosper.com" },
  };

  static ALL_TIME: RightBarTabOption = {
    name: "right_bar.creators.top_creators_alltime",
    width: 210,
    poweredBy: null,
  };

  static chartMap = {
    [RightBarCreatorsComponent.GAINERS.name]: RightBarCreatorsComponent.GAINERS,
    [RightBarCreatorsComponent.DIAMONDS.name]: RightBarCreatorsComponent.DIAMONDS,
    [RightBarCreatorsComponent.COMMUNITY.name]: RightBarCreatorsComponent.COMMUNITY,
    [RightBarCreatorsComponent.ALL_TIME.name]: RightBarCreatorsComponent.ALL_TIME,
    [RightBarCreatorsComponent.HASHTAGS.name]: RightBarCreatorsComponent.HASHTAGS,
  };

  ngOnInit() {
    const defaultTab = this.backendApi.GetStorage(RightBarCreatorsComponent.RightBarTabKey);
    this.activeTab =
      defaultTab in RightBarCreatorsComponent.chartMap ? defaultTab : RightBarCreatorsComponent.HASHTAGS.name;
    this.selectTab(true);
  }

  switchCreatorTab(tabName: string, event) {
    event.stopPropagation();
    this.activeTab = tabName;
    document.getElementById("trendsActionsButton").click();
    this.selectTab();
  }
  selectTab(skipStorage: boolean = false) {
    const rightTabOption = RightBarCreatorsComponent.chartMap[this.activeTab];
    this.activeRightTabOption = rightTabOption;
    this.selectedOptionWidth = rightTabOption.width + "px";
    if (!skipStorage) {
      this.backendApi.SetStorage(RightBarCreatorsComponent.RightBarTabKey, this.activeTab);
    }
  }
  openBuyCloutModal() {
    this.modalService.show(BuyDesoModalComponent, {
      class: "modal-dialog-centered buy-deso-modal",
      backdrop: "static",
    });
  }

  ngOnDestroy() {
    this.isDestroyed = true;
  }
}
