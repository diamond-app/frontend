import { Component, OnInit } from "@angular/core";
import { GlobalVarsService } from "../../../global-vars.service";
import { BackendApiService, ProfileEntryResponse, TutorialStatus } from "../../../backend-api.service";
import { AppRoutingModule, RouteNames } from "../../../app-routing.module";
import { Title } from "@angular/platform-browser";
import * as introJs from "intro.js/intro.js";
import { LocationStrategy } from "@angular/common";
import { environment } from "src/environments/environment";
import { Router } from "@angular/router";

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
    private locationStrategy: LocationStrategy,
    private router: Router
  ) {}

  topCreatorsToHighlight: ProfileEntryResponse[];
  upAndComingCreatorsToHighlight: ProfileEntryResponse[];

  loggedInUserProfile: ProfileEntryResponse;
  investInYourself: boolean = false;

  // Show instructions to user
  showInstructions: boolean = false;

  followCreators: boolean = false;
  // Count steps in tutorial
  stepCounter = 0;

  ngOnInit() {
    // this.isLoadingProfilesForFirstTime = true;
    this.globalVars.preventBackButton();
    this.titleService.setTitle(`Buy Creator Coins Tutorial - ${environment.node.name}`);
    // If the user just completed their profile, we instruct them to buy their own coin.
    if (this.globalVars.loggedInUser?.TutorialStatus === TutorialStatus.INVEST_OTHERS_SELL) {
      this.loggedInUserProfile = this.globalVars.loggedInUser?.ProfileEntryResponse;
      this.investInYourself = true;
      this.loading = false;
      this.initiateIntro();
      return;
    } else if (this.globalVars.loggedInUser?.TutorialStatus === TutorialStatus.INVEST_SELF) {
      this.followCreators = true;
    }
    this.backendApi
      .GetTutorialCreators(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        this.followCreators ? 9 : 3
      )
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
      if (this.followCreators) {
        this.followCreatorsIntro();
      }
      else if (!this.investInYourself) {
        this.investInOthersIntro();
      } else {
        this.investInYourselfIntro();
      }
    }, 100);
  }

  tutorialEndFollowStep() {
    this.backendApi
      .UpdateTutorialStatus(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        TutorialStatus.FOLLOW_CREATORS
      )
      .subscribe((res) => {
        this.router.navigate([RouteNames.TUTORIAL, RouteNames.DIAMONDS]);
      });
  }

  investInOthersIntro() {
    const userCanExit = !this.globalVars.loggedInUser?.MustCompleteTutorial || this.globalVars.loggedInUser?.IsAdmin;
    const tooltipClass = userCanExit ? "tutorial-tooltip" : "tutorial-tooltip tutorial-header-hide";
    const title = 'Invest in a Creator <span class="ml-5px tutorial-header-step">Step 2/6</span>';
    this.introJS.setOptions({
      tooltipClass,
      hideNext: false,
      exitOnEsc: false,
      exitOnOverlayClick: userCanExit,
      overlayOpacity: 0.8,
      steps: [
        {
          title,
          intro: `Many creators on ${environment.node.name} have a coin that you can buy and sell.`,
          position: "bottom",
        },
        {
          title,
          intro:
            "Prices go up when people buy, or when cashflows go to the coin. Prices go down when people sell. <br /><br />Coins can also give you access to exclusive content, events, and much more...",
          position: "bottom",
        },
        {
          title,
          intro:
            'Let\'s walk through what an investment would look like. <br /><br />Click "Done" below.<br /><br />Then, <b>click the "View" button</b> next to the creator you want to preview investing in.',
          position: "bottom",
        },
      ],
    });
    this.introJS.oncomplete(() => {
      this.skipTutorialExitPrompt = true;
      this.showInstructions = true;
      this.tutorialWiggle = true;
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
    const title = 'Invest in Yourself <span class="ml-5px tutorial-header-step">Step 3/6</span>';
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

  followCreatorsIntro() {
    const userCanExit = !this.globalVars.loggedInUser?.MustCompleteTutorial || this.globalVars.loggedInUser?.IsAdmin;
    let tooltipClass = userCanExit ? "tutorial-tooltip" : "tutorial-tooltip tutorial-header-hide";
    if (this.globalVars.isMobile()) {
      tooltipClass = tooltipClass + " tutorial-tooltip-right";
    };
    const title = 'Follow Creators <span class="ml-5px tutorial-header-step">Step 4/6</span>';
    this.introJS.setOptions({
      tooltipClass,
      hideNext: false,
      exitOnEsc: false,
      exitOnOverlayClick: userCanExit,
      overlayOpacity: 0.8,
      steps: [
        {
          title,
          intro: `There are lots of fantastic creators to follow on ${environment.node.name}!<br/><br/> Click "Done", then choose some to follow on the next screen.<br/><br/>When you're done choosing who to follow <b>click the "Next" button on the following screen</b>`,
        },
      ],
    });
    this.introJS.oncomplete(() => {
      this.skipTutorialExitPrompt = true;
      this.showInstructions = true;
      this.tutorialWiggle = true;
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
