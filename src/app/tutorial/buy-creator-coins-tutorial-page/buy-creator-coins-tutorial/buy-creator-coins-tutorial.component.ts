import { LocationStrategy } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { Router } from "@angular/router";
import isNil from "lodash/isNil";
import { environment } from "../../../../environments/environment";
import { SwalHelper } from "../../../../lib/helpers/swal-helper";
import { AppRoutingModule } from "../../../app-routing.module";
import { BackendApiService, TutorialStatus } from "../../../backend-api.service";
import { FeedComponent } from "../../../feed/feed.component";
import { GlobalVarsService } from "../../../global-vars.service";
import { ProfileEntryResponse } from "deso-protocol";

@Component({
  selector: "buy-creator-coins-tutorial",
  templateUrl: "./buy-creator-coins-tutorial.component.html",
  styleUrls: ["./buy-creator-coins-tutorial.component.scss"],
})
export class BuyCreatorCoinsTutorialComponent implements OnInit {
  // Whether the "buy" button should wiggle to prompt the user to click it
  tutorialWiggle = false;
  static PAGE_SIZE = 100;
  static WINDOW_VIEWPORT = true;
  static BUFFER_SIZE = 5;

  AppRoutingModule = AppRoutingModule;
  loading: boolean = true;
  skipTutorialExitPrompt: boolean = false;

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private titleService: Title,
    private locationStrategy: LocationStrategy,
    private router: Router
  ) {}

  hotNewCreatorsToHighlight: ProfileEntryResponse[];

  loggedInUserProfile: ProfileEntryResponse;
  investInYourself: boolean = false;

  // Show instructions to user
  showInstructions: boolean = false;

  followCreators: boolean = false;
  // Count steps in tutorial
  stepCounter = 0;
  // Add a footer on mobile to keep content visible
  addMobileFooter: boolean = false;

  userCanAffordCCBuy: boolean = false;

  ngOnInit() {
    this.addMobileFooter = this.globalVars.isMobile() && window.innerHeight < 575;
    this.titleService.setTitle(`Buy Creator Coins Tutorial - ${environment.node.name}`);
    this.userCanAffordCCBuy = this.globalVars.loggedInUser.BalanceNanos > this.globalVars.usdToNanosNumber(0.1);
  }

  skipTutorialStep() {
    SwalHelper.fire(
      {
        target: this.globalVars.getTargetComponentSelector(),
        title: "Great work! You've completed the tutorial",
        html: `Congratulations on completing the tutorial! Your final stop will be your feed.<br><br>Be sure to give diamonds to creators for posts you enjoy, follow new creators, and buy the creator coin of creators you want to support!`,
        showCancelButton: false,
        customClass: {
          confirmButton: "btn btn-light",
          cancelButton: "btn btn-light no",
        },
        confirmButtonText: "Go to Feed",
        reverseButtons: true,
      },
      false
    ).then((response: any) => {
      this.backendApi
        .UpdateTutorialStatus(
          this.globalVars.localNode,
          this.globalVars.loggedInUser?.PublicKeyBase58Check,
          TutorialStatus.COMPLETE,
          this.globalVars.loggedInUser?.PublicKeyBase58Check,
          true
        )
        .subscribe(() => {
          const signUpRedirect = this.backendApi.GetStorage("signUpRedirect");
          const redirectPath = isNil(signUpRedirect) ? `/${this.globalVars.RouteNames.BROWSE}` : signUpRedirect;
          if (!isNil(signUpRedirect)) {
            this.backendApi.RemoveStorage("signUpRedirect");
          }
          this.router.navigate([redirectPath], {
            queryParams: { feedTab: FeedComponent.FOLLOWING_TAB },
          });
        });
    });
  }
}
