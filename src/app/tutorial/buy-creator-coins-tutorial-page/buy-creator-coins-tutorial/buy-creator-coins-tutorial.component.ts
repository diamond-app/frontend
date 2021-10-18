import { Component, OnInit } from "@angular/core";
import { GlobalVarsService } from "../../../global-vars.service";
import { BackendApiService, ProfileEntryResponse, TutorialStatus } from "../../../backend-api.service";
import { AppRoutingModule } from "../../../app-routing.module";
import { Title } from "@angular/platform-browser";
import * as introJs from "intro.js/intro.js";
import { LocationStrategy } from "@angular/common";
import { environment } from "src/environments/environment";

@Component({
  selector: "buy-creator-coins-tutorial",
  templateUrl: "./buy-creator-coins-tutorial.component.html",
  styleUrls: ["./buy-creator-coins-tutorial.component.scss"],
})
export class BuyCreatorCoinsTutorialComponent implements OnInit {
  introJS = introJs();
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
    private locationStrategy: LocationStrategy
  ) {}

  topCreatorsToHighlight: ProfileEntryResponse[];
  upAndComingCreatorsToHighlight: ProfileEntryResponse[];

  loggedInUserProfile: ProfileEntryResponse;
  investInYourself: boolean = false;

  // Count steps in tutorial
  stepCounter = 0;

  ngOnInit() {
    // this.isLoadingProfilesForFirstTime = true;
    this.globalVars.preventBackButton();
    this.titleService.setTitle(`Buy Creator Coins Tutorial - ${environment.node.name}`);
    // If the user just completed their profile, we instruct them to buy their own coin.
    if (this.globalVars.loggedInUser?.TutorialStatus === TutorialStatus.CREATE_PROFILE) {
      this.loggedInUserProfile = this.globalVars.loggedInUser?.ProfileEntryResponse;
      this.investInYourself = true;
      this.loading = false;
      this.initiateIntro();
      return;
    }
    this.backendApi
      .GetTutorialCreators(this.globalVars.localNode, this.globalVars.loggedInUser.PublicKeyBase58Check, 3)
      .subscribe(
        (res: {
          WellKnownProfileEntryResponses: ProfileEntryResponse[];
          UpAndComingProfileEntryResponses: ProfileEntryResponse[];
        }) => {
          // Do not let users select themselves in the "Invest In Others" step.
          if (res.WellKnownProfileEntryResponses?.length) {
            this.topCreatorsToHighlight = res.WellKnownProfileEntryResponses.filter(
              (profile) => profile.PublicKeyBase58Check !== this.globalVars.loggedInUser?.PublicKeyBase58Check
            );
          }

          if (res.UpAndComingProfileEntryResponses?.length) {
            this.upAndComingCreatorsToHighlight = res.UpAndComingProfileEntryResponses.filter(
              (profile) => profile.PublicKeyBase58Check !== this.globalVars.loggedInUser?.PublicKeyBase58Check
            );
          }
          this.loading = false;
          this.initiateIntro();
        },
        (err) => {
          console.error(err);
        }
      );
  }

  initiateIntro() {
    setTimeout(() => {
      if (!this.investInYourself) {
        this.investInOthersIntro();
      } else {
        this.investInYourselfIntro();
      }
    }, 100);
  }

  investInOthersIntro() {
    const userCanExit = !this.globalVars.loggedInUser?.MustCompleteTutorial || this.globalVars.loggedInUser?.IsAdmin;
    const tooltipClass = userCanExit ? "tutorial-tooltip" : "tutorial-tooltip tutorial-header-hide";
    const title = 'Invest in a Creator <span class="ml-5px tutorial-header-step">Step 1/6</span>';
    this.introJS.setOptions({
      tooltipClass,
      hideNext: true,
      exitOnEsc: false,
      exitOnOverlayClick: userCanExit,
      overlayOpacity: 0.8,
      steps: [
        {
          title,
          intro: `Welcome to ${environment.node.name}!<br /><br />Let's start by learning how to invest in creators.`,
        },
        {
          title,
          intro: `Many creators on ${environment.node.name} have a coin that you can buy and sell.`,
          element: document.querySelector("#creator-coins-holder"),
          position: "bottom",
        },
        {
          title,
          intro:
            "Prices go up when people buy, or when cashflows go to the coin. Prices go down when people sell. <br /><br />Coins can also give you access to exclusive content, events, and much more...",
          element: document.querySelector("#creator-coins-holder"),
          position: "bottom",
        },
        {
          title,
          intro:
            'Let\'s choose a creator to invest in! <br /><br /><b>Click the "Buy" button above</b> next to the creator you want to invest in.',
          element: document.querySelector("#creator-coins-holder"),
          position: "bottom",
        },
      ],
    });
    this.introJS.onchange((targetElement) => {
      this.stepCounter += 1;
      if (this.stepCounter >= 3) {
        this.tutorialWiggle = true;
      }
    });
    this.introJS.onbeforeexit(() => {
      if (!this.skipTutorialExitPrompt) {
        this.globalVars.skipTutorial(this);
      }
    });
    this.introJS.start();
  }

  investInYourselfIntro() {
    const userCanExit = !this.globalVars.loggedInUser?.MustCompleteTutorial || this.globalVars.loggedInUser?.IsAdmin;
    let tooltipClass = userCanExit ? "tutorial-tooltip" : "tutorial-tooltip tutorial-header-hide";
    if (this.globalVars.isMobile()) {
      tooltipClass = tooltipClass + " tutorial-tooltip-right";
    };
    const title = 'Invest in Yourself <span class="ml-5px tutorial-header-step">Step 4/6</span>';
    this.introJS.setOptions({
      tooltipClass,
      hideNext: true,
      exitOnEsc: false,
      exitOnOverlayClick: userCanExit,
      overlayOpacity: 0.8,
      steps: [
        {
          title,
          intro: `You can have a coin too!<br /><br />Now that you have a profile, we can set up your coin.`,
          element: document.querySelector("#tutorial-invest-in-self-holder"),
        },
        {
          title,
          intro: '<b>Click "Buy" to invest in yourself!</b>',
          element: document.querySelector(".primary-button"),
        },
      ],
    });
    this.introJS.onbeforeexit(() => {
      if (!this.skipTutorialExitPrompt) {
        this.globalVars.skipTutorial(this);
      }
    });
    this.introJS.start();
    window.scrollTo(0, 0);
  }

  exitTutorial() {
    this.skipTutorialExitPrompt = true;
    this.introJS.exit(true);
    this.skipTutorialExitPrompt = false;
  }

  tutorialCleanUp() {}
}
