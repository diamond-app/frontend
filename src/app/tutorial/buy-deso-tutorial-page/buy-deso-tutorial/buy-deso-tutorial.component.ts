import { Component, OnInit } from "@angular/core";
import { GlobalVarsService } from "../../../global-vars.service";
import { BackendApiService, ProfileEntryResponse, TutorialStatus } from "../../../backend-api.service";
import { AppRoutingModule, RouteNames } from "../../../app-routing.module";
import { Title } from "@angular/platform-browser";
import * as introJs from "intro.js/intro.js";
import { includes, shuffle } from "lodash";
import { LocationStrategy } from "@angular/common";
import { environment } from "src/environments/environment";
import { Router } from "@angular/router";
import { map } from "rxjs/operators";
import { BuyDesoModalComponent } from "../../../buy-deso-page/buy-deso-modal/buy-deso-modal.component";
import { BsModalService } from "ngx-bootstrap/modal";
import { BuyDeSoComponent } from "src/app/buy-deso-page/buy-deso/buy-deso.component";

@Component({
  selector: "buy-deso-tutorial",
  templateUrl: "./buy-deso-tutorial.component.html",
  styleUrls: ["./buy-deso-tutorial.component.scss"],
})
export class BuyDesoTutorialComponent implements OnInit {
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
    private router: Router,
    private modalService: BsModalService
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

  BuyDeSoComponent = BuyDeSoComponent;

  ngOnInit() {}

  openBuyDeSoModal(isFiat: boolean) {
    const initialState = {
      activeTabInput: isFiat ? this.BuyDeSoComponent.BUY_WITH_USD : this.BuyDeSoComponent.BUY_WITH_BTC,
    };
    this.modalService.show(BuyDesoModalComponent, {
      class: "modal-dialog-centered buy-deso-modal",
      backdrop: "static",
      initialState,
    });
  }

  skipToNextStep() {
    this.router.navigate([
      `/${this.globalVars.RouteNames.TUTORIAL}/${this.globalVars.RouteNames.INVEST}/${this.globalVars.RouteNames.BUY_CREATOR}`,
    ]);
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
        this.globalVars.updateEverything().add(() => {
          this.router.navigate([RouteNames.TUTORIAL, RouteNames.INVEST, RouteNames.BUY_CREATOR]);
        });
      });
  }

  investInOthersIntro() {
    const userCanExit = !this.globalVars.loggedInUser?.MustCompleteTutorial || this.globalVars.loggedInUser?.IsAdmin;
    let tooltipClass = userCanExit ? "tutorial-tooltip" : "tutorial-tooltip tutorial-header-hide";
    if (this.globalVars.isMobile()) {
      tooltipClass = tooltipClass + " tutorial-tooltip-right";
    }
    const title = 'Invest in a Creator <span class="ml-5px tutorial-header-step">Step 3/6</span>';
    this.introJS.setOptions({
      tooltipClass,
      hideNext: true,
      exitOnEsc: false,
      exitOnOverlayClick: false,
      overlayOpacity: 0.8,
      steps: [
        {
          title,
          intro: `Many creators on ${environment.node.name} have a coin that you can buy and sell.`,
          position: "bottom",
          element: document.querySelector("#creator-coins-holder"),
        },
        {
          title,
          intro: "Prices go up when people buy, and down when people sell.",
          position: "bottom",
          element: document.querySelector("#creator-coins-holder"),
        },
        {
          title,
          intro: "Coins can also give you cashflows, access to exclusive content, events, and much more.",
          position: "bottom",
          element: document.querySelector("#creator-coins-holder"),
        },
        {
          title,
          intro: `Click "Buy" to take a look at at ${this.globalVars.addOwnershipApostrophe(
            this.hotNewCreatorsToHighlight[0].Username
          )} coin. <b>This won't use real money.</b>`,
          position: "bottom",
          element: document.querySelector(".primary-button"),
        },
      ],
    });
    this.introJS.onchange((targetElement) => {
      if (includes(targetElement.classList, "primary-button")) {
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
    }
    const title = 'Invest in Yourself <span class="ml-5px tutorial-header-step">Step 4/6</span>';
    this.introJS.setOptions({
      tooltipClass,
      hideNext: true,
      exitOnEsc: false,
      exitOnOverlayClick: false,
      overlayOpacity: 0.8,
      steps: [
        {
          title,
          intro: `You can have a coin too!`,
          element: document.querySelector("#creator-coins-holder"),
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
    const title = 'Follow Creators <span class="ml-5px tutorial-header-step">Step 2/6</span>';
    this.introJS.setOptions({
      tooltipClass,
      hideNext: false,
      exitOnEsc: false,
      exitOnOverlayClick: false,
      overlayOpacity: 0.8,
      steps: [
        {
          title,
          intro: `You can follow creators just like on Twitter and Instagram. <br/><br/>Let's follow some creators now!`,
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

  skipFollowStep() {
    this.globalVars.skipToNextTutorialStep(TutorialStatus.FOLLOW_CREATORS, "follow : creators : skip");
  }

  skipBuyCreatorsStep() {
    this.exitTutorial();
    this.globalVars.skipToNextTutorialStep(TutorialStatus.INVEST_OTHERS_SELL, "buy : creator : skip", true);
  }

  skipBuySelfStep() {
    this.exitTutorial();
    this.globalVars.skipToNextTutorialStep(TutorialStatus.INVEST_SELF, "invest : self : buy : skip");
  }

  exitTutorial() {
    this.skipTutorialExitPrompt = true;
    this.introJS.exit(true);
    this.skipTutorialExitPrompt = false;
  }

  tutorialCleanUp() {}
}
