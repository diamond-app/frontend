// TODO: creator coin buys: no-balance case is kinda dumb, we should have a module telling you to buy deso or
// creator coin

// TODO: creator coin buys: need warning about potential slippage

// TODO: creator coin buys: may need tiptips explaining why total != amount * currentPriceElsewhereOnSite

import { Component, Input, OnInit, ViewChild } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { BackendApiService, TutorialStatus } from "../../backend-api.service";
import { ActivatedRoute, Router } from "@angular/router";
import { CreatorCoinTrade } from "../../../lib/trade-creator-page/creator-coin-trade";
import { RouteNames } from "../../app-routing.module";
import { Observable, Subscription } from "rxjs";
import { BsModalRef, BsModalService } from "ngx-bootstrap/modal";
import { TradeCreatorFormComponent } from "../trade-creator-form/trade-creator-form.component";
import * as introJs from "intro.js/intro.js";
import { TradeCreatorPreviewComponent } from "../trade-creator-preview/trade-creator-preview.component";
import { BuyDesoModalComponent } from "../../buy-deso-page/buy-deso-modal/buy-deso-modal.component";
import { SwalHelper } from "../../../lib/helpers/swal-helper";

@Component({
  selector: "trade-creator",
  templateUrl: "./trade-creator.component.html",
  styleUrls: ["./trade-creator.component.scss"],
})
export class TradeCreatorComponent implements OnInit {
  @ViewChild(TradeCreatorFormComponent, { static: false }) childTradeCreatorFormComponent;
  @ViewChild(TradeCreatorPreviewComponent, { static: false }) childTradeCreatorPreviewComponent;
  @Input() inTutorial: boolean = false;
  @Input() tutorialBuy: boolean;
  @Input() username: string;
  @Input() tradeType: string;
  introJS = introJs();
  TRADE_CREATOR_FORM_SCREEN = "trade_creator_form_screen";
  TRADE_CREATOR_PREVIEW_SCREEN = "trade_creator_preview_screen";
  TRADE_CREATOR_COMPLETE_SCREEN = "trade_creator_complete_screen";
  tabList = [CreatorCoinTrade.BUY_VERB, CreatorCoinTrade.SELL_VERB, CreatorCoinTrade.TRANSFER_VERB];

  router: Router;
  route: ActivatedRoute;
  appData: GlobalVarsService;
  creatorProfile;
  screenToShow: string = this.TRADE_CREATOR_FORM_SCREEN;

  isBuyingCreatorCoin: boolean;

  creatorCoinTrade: CreatorCoinTrade;

  // buy creator coin data
  desoToSell: number;
  expectedCreatorCoinReturnedNanos: number;

  // sell creator coin data
  creatorCoinToSell: number;
  expectedDeSoReturnedNanos: number;

  // show different header text if we're at the "Invest In Yourself" stage of the tutorial
  investInYourself: boolean = false;

  // Hide the warning that users selling their own coin will notify other users
  hideWarning = false;

  buyVerb = CreatorCoinTrade.BUY_VERB;
  sellVerb = CreatorCoinTrade.SELL_VERB;

  skipTutorialExitPrompt = false;
  nextTutorialStepOnExit = false;
  tutorialLoaded = false;
  simulatedTutorialSell = false;
  buyButtonDisabled = false;

  _onSlippageError() {
    this.screenToShow = this.TRADE_CREATOR_FORM_SCREEN;
    this.creatorCoinTrade.showSlippageError = true;
  }

  _onBackButtonClicked() {
    this.screenToShow = this.TRADE_CREATOR_FORM_SCREEN;
    this.hideWarning = true;
  }

  _onPreviewClicked() {
    this.screenToShow = this.TRADE_CREATOR_PREVIEW_SCREEN;
    this.creatorCoinTrade.showSlippageError = false;
  }

  _onTradeExecuted() {
    if (!this.inTutorial) {
      this.screenToShow = this.TRADE_CREATOR_COMPLETE_SCREEN;
    } else {
      this.exitTutorial();
      this.bsModalRef.hide();
      if (this.globalVars.loggedInUser.TutorialStatus === TutorialStatus.INVEST_OTHERS_BUY) {
        this.router.navigate([
          RouteNames.TUTORIAL,
          RouteNames.WALLET,
          this.globalVars.loggedInUser?.CreatorPurchasedInTutorialUsername,
        ]);
      } else if (this.globalVars.loggedInUser.TutorialStatus === TutorialStatus.INVEST_OTHERS_SELL) {
        this.router.navigate([
          RouteNames.TUTORIAL,
          RouteNames.WALLET,
          this.globalVars.loggedInUser?.CreatorPurchasedInTutorialUsername,
        ]);
        window.location.reload();
      } else if (this.globalVars.loggedInUser.TutorialStatus === TutorialStatus.INVEST_SELF) {
        this.router.navigate([RouteNames.TUTORIAL, RouteNames.WALLET, this.creatorProfile?.Username]);
      }
    }
  }

  readyForDisplay() {
    return (
      this.creatorProfile &&
      // USD calculations don't work correctly until we have the exchange rate
      this.appData.nanosPerUSDExchangeRate &&
      // Need to make sure the USD exchange rate is actually loaded, not a random default
      this.appData.nanosPerUSDExchangeRate != GlobalVarsService.DEFAULT_NANOS_PER_USD_EXCHANGE_RATE &&
      (!this.inTutorial || this.tutorialLoaded)
    );
  }

  _handleTabClick(tab: string) {
    // Reset the creator coin trade as needed.
    this.creatorCoinTrade.amount.reset();
    this.creatorCoinTrade.clearAllFields();
    this.creatorCoinTrade.setTradeType(tab);
    this.creatorCoinTrade.selectedCurrency = this.creatorCoinTrade.defaultCurrency();

    // Reset us back to the form page.
    this.screenToShow = this.TRADE_CREATOR_FORM_SCREEN;
    this.childTradeCreatorFormComponent.initializeForm();
    // After warning the user about selling their own coin the first time, hide the warning
    if (this.creatorCoinTrade.tradeType === CreatorCoinTrade.SELL_VERB) {
      this.hideWarning = true;
    }
  }

  _setStateFromActivatedRoute(route) {
    // get the username of the creator
    let creatorUsername = this.username;
    let tradeType = this.tradeType;
    if (!this.creatorProfile || creatorUsername != this.creatorProfile?.Username) {
      this._getCreatorProfile(creatorUsername);
    }

    switch (tradeType) {
      case this.appData.RouteNames.TRANSFER_CREATOR: {
        this.creatorCoinTrade.isBuyingCreatorCoin = false;
        this.creatorCoinTrade.tradeType = CreatorCoinTrade.TRANSFER_VERB;
        break;
      }
      case this.appData.RouteNames.BUY_CREATOR: {
        this.creatorCoinTrade.isBuyingCreatorCoin = true;
        this.creatorCoinTrade.tradeType = CreatorCoinTrade.BUY_VERB;
        break;
      }
      case this.appData.RouteNames.SELL_CREATOR: {
        this.creatorCoinTrade.isBuyingCreatorCoin = false;
        this.creatorCoinTrade.tradeType = CreatorCoinTrade.SELL_VERB;
        break;
      }
      default: {
        console.error(`unexpected path in _setStateFromActivatedRoute: ${tradeType}`);
        // TODO: creator coin buys: rollbar
      }
    }
  }

  _getCreatorProfile(creatorUsername): Subscription {
    let readerPubKey = "";
    if (this.globalVars.loggedInUser) {
      readerPubKey = this.globalVars.loggedInUser.PublicKeyBase58Check;
    }
    return this.backendApi.GetSingleProfile(this.globalVars.localNode, "", creatorUsername).subscribe(
      (response) => {
        if (!response || !response.Profile) {
          this.router.navigateByUrl("/" + this.appData.RouteNames.NOT_FOUND, { skipLocationChange: true });
          return;
        }
        let profile = response.Profile;
        this.creatorCoinTrade.creatorProfile = profile;
        this.creatorProfile = profile;
      },
      (err) => {
        console.error(err);
        console.log("This profile was not found. It either does not exist or it was deleted."); // this.backendApi.parsePostError(err)
      }
    );
  }

  constructor(
    private globalVars: GlobalVarsService,
    private _route: ActivatedRoute,
    private _router: Router,
    private backendApi: BackendApiService,
    public bsModalRef: BsModalRef,
    private modalService: BsModalService
  ) {
    this.appData = globalVars;
    this.router = _router;
    this.route = _route;
  }

  openBuyCloutModal() {
    this.bsModalRef.hide();
    this.modalService.show(BuyDesoModalComponent, {
      class: "modal-dialog-centered buy-deso-modal",
      backdrop: "static",
    });
  }

  ngOnInit() {
    this.creatorCoinTrade = new CreatorCoinTrade(this.appData);
    if (!this.inTutorial) {
      this._setStateFromActivatedRoute(this.route);
      this.route.params.subscribe((params) => {
        this._setStateFromActivatedRoute(this.route);
      });
    } else {
      this.buyButtonDisabled = true;
      this.screenToShow = this.TRADE_CREATOR_PREVIEW_SCREEN;
      this.creatorCoinTrade.isBuyingCreatorCoin = !!this.tutorialBuy;
      this.creatorCoinTrade.tradeType = !!this.tutorialBuy ? CreatorCoinTrade.BUY_VERB : CreatorCoinTrade.SELL_VERB;
      this._getCreatorProfile(this.username).add(() => {
        this.investInYourself =
          this.globalVars.loggedInUser?.ProfileEntryResponse?.Username ===
          this.creatorCoinTrade.creatorProfile?.Username;
        if (this.creatorCoinTrade.isBuyingCreatorCoin) {
          this.setUpBuyTutorial();
        } else {
          this.setUpSellTutorial();
        }
      });
    }
  }

  setUpBuyTutorial(): void {
    let balance = this.appData.loggedInUser?.BalanceNanos;
    const jumioDeSoNanos = this.appData.jumioDeSoNanos > 0 ? this.appData.jumioDeSoNanos : 1e8;
    balance = balance > jumioDeSoNanos ? jumioDeSoNanos : balance;
    const percentToBuy = 0.1;
    this.creatorCoinTrade.desoToSell = (balance * percentToBuy) / 1e9;
    this.getBuyOrSellObservable().subscribe(
      (response) => {
        this.creatorCoinTrade.expectedCreatorCoinReturnedNanos = response.ExpectedCreatorCoinReturnedNanos || 0;
        this.creatorCoinTrade.expectedFounderRewardNanos = response.FounderRewardGeneratedNanos || 0;
        this.initiateIntro();
      },
      (err) => {
        console.error(err);
        this.appData._alertError(this.backendApi.parseProfileError(err));
      }
    );
  }

  setUpSellTutorial(): void {
    const hodlings = this.globalVars.loggedInUser?.UsersYouHODL;
    if (!hodlings) {
      // some error and return?
      return;
    }
    let creatorCoinsPurchasedInTutorial = this.globalVars.loggedInUser?.CreatorCoinsPurchasedInTutorial;
    // Sell 5% of coins purchased in buy step.
    this.creatorCoinTrade.creatorCoinToSell = (creatorCoinsPurchasedInTutorial * 0.05) / 1e9;
    if (!creatorCoinsPurchasedInTutorial) {
      creatorCoinsPurchasedInTutorial = 10000000;
      this.creatorCoinTrade.creatorCoinToSell = creatorCoinsPurchasedInTutorial / 1e9;
      this.simulatedTutorialSell = true;
      this.creatorCoinTrade.expectedDeSoReturnedNanos = creatorCoinsPurchasedInTutorial || 0;
      this.initiateIntro();
    } else {
      this.getBuyOrSellObservable().subscribe(
        (response) => {
          this.creatorCoinTrade.expectedDeSoReturnedNanos = response.ExpectedDeSoReturnedNanos || 0;
          this.initiateIntro();
        },
        (err) => {
          console.error(err);
          this.appData._alertError(this.backendApi.parseProfileError(err));
        }
      );
    }
  }

  getBuyOrSellObservable(): Observable<any> {
    return this.backendApi.BuyOrSellCreatorCoin(
      this.appData.localNode,
      this.appData.loggedInUser.PublicKeyBase58Check /*UpdaterPublicKeyBase58Check*/,
      this.creatorCoinTrade.creatorProfile?.PublicKeyBase58Check /*CreatorPublicKeyBase58Check*/,
      this.creatorCoinTrade.operationType() /*OperationType*/,
      this.creatorCoinTrade.desoToSell * 1e9 /*DeSoToSellNanos*/,
      this.creatorCoinTrade.creatorCoinToSell * 1e9 /*CreatorCoinToSellNanos*/,
      0 /*DeSoToAddNanos*/,
      0 /*MinDeSoExpectedNanos*/,
      0 /*MinCreatorCoinExpectedNanos*/,
      this.appData.feeRateDeSoPerKB * 1e9 /*feeRateNanosPerKB*/,
      false
    );
  }

  initiateIntro() {
    this.tutorialLoaded = true;
    setTimeout(() => {
      if (this.creatorCoinTrade.tradeType === this.buyVerb && !this.investInYourself) {
        this.buyCreatorIntro();
      } else if (this.creatorCoinTrade.tradeType === this.sellVerb) {
        this.sellCreatorIntro();
      } else if (this.creatorCoinTrade.tradeType === this.buyVerb && this.investInYourself) {
        this.buySelfIntro();
      }
    }, 250);
  }

  buySelfIntro() {
    // Set up the amounts we allow the user to choose from to buy
    let balance = this.appData.loggedInUser?.BalanceNanos;
    const jumioDeSoNanos = this.appData.jumioDeSoNanos > 0 ? this.appData.jumioDeSoNanos : 1e8;
    balance = balance > jumioDeSoNanos ? jumioDeSoNanos : balance;
    const maxAmt = this.globalVars.usdToNanosNumber(5);
    const largeOption = balance > maxAmt ? maxAmt : balance * 0.3;
    const smallOption = Math.max(largeOption * 0.1, balance * 0.05);
    const largeOptionUsd = this.globalVars.nanosToUSD(largeOption, 2);
    const smallOptionUsd = this.globalVars.nanosToUSD(smallOption, 2);

    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      title: `Buy your own coin`,
      html: `Even you have a creator coin! Choose the amount you want to invest in yourself below:`,
      showCancelButton: false,
      showDenyButton: true,
      showConfirmButton: true,
      focusConfirm: true,
      customClass: {
        confirmButton: "btn primary-button narrow-button d-flex justify-content-center align-items-center",
        denyButton: "btn light-primary-button narrow-button d-flex justify-content-center align-items-center",
      },
      confirmButtonText: largeOptionUsd,
      denyButtonText: smallOptionUsd,
      reverseButtons: true,
      allowEscapeKey: false,
      allowOutsideClick: false,
    }).then((res: any) => {
      console.log(res);
      if (res.isConfirmed) {
        this.creatorCoinTrade.desoToSell = largeOption / 1e9;
      } else if (res.isDenied) {
        this.creatorCoinTrade.desoToSell = smallOption / 1e9;
      }
      this.introJS = introJs();
      const userCanExit = !this.globalVars.loggedInUser?.MustCompleteTutorial || this.globalVars.loggedInUser?.IsAdmin;
      const tooltipClass = userCanExit ? "tutorial-tooltip" : "tutorial-tooltip tutorial-header-hide";
      const title = 'Invest in a Yourself <span class="ml-5px tutorial-header-step">Step 4/6</span>';
      this.introJS.setOptions({
        tooltipClass,
        hideNext: true,
        exitOnEsc: false,
        exitOnOverlayClick: userCanExit,
        overlayOpacity: 0.8,
        steps: [
          {
            title,
            intro: `Let's invest in yourself by purchasing $${this.creatorCoinTrade
              .assetToSellAmountInUsd()
              .toFixed(2)} ${this.creatorCoinTrade.creatorProfile?.Username} coins`,
            element: document.querySelector("#tutorial-amount-purchasing"),
          },
          {
            title,
            intro: '<b>Click "Confirm Buy" to make the investment.</b>',
            element: document.querySelector("#tutorial-confirm-buy"),
          },
        ],
      });
      this.introJS.onexit(() => {
        if (!this.skipTutorialExitPrompt) {
          this.globalVars.skipTutorial(this);
        }
      });
      // The "Confirm Buy" element we are targetting is a child of the modal element. We can't update the child component
      // to appear above the "content window" created by intro.js because it is in a different stack context (due to being
      // the child of an element with an already set z-index). There is no way around this, so the alternative I've
      // implemented here is to overwrite clicking on the intro.js window itself to trigger the same "Confirm Buy" response.
      // Please forgive me.
      this.introJS.onchange((targetElement) => {
        if (targetElement?.id === "tutorial-confirm-buy" && this.creatorCoinTrade.desoToSell !== 0) {
          this.buyButtonDisabled = false;
          const element = document.getElementsByClassName("introjs-fixedTooltip")[0];
          element.addEventListener("click", () => this.childTradeCreatorPreviewComponent._tradeCreatorCoin());
          // @ts-ignore
          element.style.cssText += "cursor:pointer;";
        } else {
          this.buyButtonDisabled = true;
          const element = document.getElementsByClassName("introjs-fixedTooltip")[0];
          if (element) {
            element.removeEventListener("click", () => this.childTradeCreatorPreviewComponent._tradeCreatorCoin());
          }
        }
      });
      setTimeout(() => {
        this.introJS.start();
      }, 50);
    });
  }

  buyCreatorIntro() {
    this.introJS = introJs();
    const userCanExit = !this.globalVars.loggedInUser?.MustCompleteTutorial || this.globalVars.loggedInUser?.IsAdmin;
    const tooltipClass = userCanExit ? "tutorial-tooltip" : "tutorial-tooltip tutorial-header-hide";
    const title = 'Invest in a Creator <span class="ml-5px tutorial-header-step">Step 1/6</span>';
    this.introJS.setOptions({
      tooltipClass,
      hideNext: false,
      doneLabel: "Skip",
      exitOnEsc: false,
      exitOnOverlayClick: userCanExit,
      overlayOpacity: 0.8,
      steps: [
        {
          title,
          intro: "You can invest directly in your favorite creators by buying their coin.",
          element: document.querySelector(".buy-deso__container"),
        },
        {
          title,
          intro: `This investment would be for $${this.creatorCoinTrade
            .assetToSellAmountInUsd()
            .toFixed(2)} in ${this.globalVars.addOwnershipApostrophe(
            this.creatorCoinTrade.creatorProfile?.Username
          )} coin`,
          element: document.querySelector("#tutorial-amount-purchasing"),
        },
        {
          title,
          intro: `<b>Click "Confirm Buy"</b> if you are interested in making this investment.<br/><br/><b>Click "Skip" below</b> to go to the next step without investing.`,
          element: document.querySelector("#tutorial-confirm-buy"),
        },
      ],
    });
    this.introJS.oncomplete(() => {
      this.skipTutorialExitPrompt = true;
      this.nextTutorialStepOnExit = true;
    });
    this.introJS.onexit(() => {
      if (!this.skipTutorialExitPrompt) {
        this.globalVars.skipTutorial(this);
      }
      if (this.nextTutorialStepOnExit) {
        this.bsModalRef.hide();
        this.backendApi
          .UpdateTutorialStatus(
            this.globalVars.localNode,
            this.globalVars.loggedInUser.PublicKeyBase58Check,
            TutorialStatus.INVEST_OTHERS_BUY,
            this.creatorCoinTrade.creatorProfile.PublicKeyBase58Check,
            true
          )
          .subscribe(() => {
            this.globalVars.logEvent("invest : others : buy : skip");
            this.globalVars.updateEverything().add(() => {
              this.router.navigate([
                RouteNames.TUTORIAL,
                RouteNames.WALLET,
                this.globalVars.loggedInUser?.CreatorPurchasedInTutorialUsername,
              ]);
            });
          });
      }
    });
    // The "Confirm Buy" element we are targetting is a child of the modal element. We can't update the child component
    // to appear above the "content window" created by intro.js because it is in a different stack context (due to being
    // the child of an element with an already set z-index). There is no way around this, so the alternative I've
    // implemented here is to overwrite clicking on the intro.js window itself to trigger the same "Confirm Buy" response.
    // Please forgive me.
    this.introJS.onchange((targetElement) => {
      if (targetElement?.id === "tutorial-confirm-buy") {
        this.buyButtonDisabled = false;
        const element = document.getElementsByClassName("introjs-fixedTooltip")[0];
        element.addEventListener("click", () => this.childTradeCreatorPreviewComponent._tradeCreatorCoin());
        // @ts-ignore
        element.style.cssText += "cursor:pointer;";
      } else {
        this.buyButtonDisabled = true;
        const element = document.getElementsByClassName("introjs-fixedTooltip")[0];
        if (element) {
          element.removeEventListener("click", () => this.childTradeCreatorPreviewComponent._tradeCreatorCoin());
        }
      }
    });
    this.introJS.start();
  }

  sellCreatorIntro() {
    this.introJS = introJs();
    const userCanExit = !this.globalVars.loggedInUser?.MustCompleteTutorial || this.globalVars.loggedInUser?.IsAdmin;
    const tooltipClass = userCanExit ? "tutorial-tooltip" : "tutorial-tooltip tutorial-header-hide";
    const title = 'Sell a Creator <span class="ml-5px tutorial-header-step">Step 2/6</span>';
    this.introJS.setOptions({
      tooltipClass,
      hideNext: false,
      doneLabel: "Skip",
      exitOnEsc: false,
      exitOnOverlayClick: userCanExit,
      overlayOpacity: 0.8,
      steps: [
        {
          title,
          intro: "When a creator's coin goes up in value you can sell.",
          element: document.querySelector(".buy-deso__container"),
        },
        {
          title,
          intro: `${
            this.simulatedTutorialSell
              ? "Let's simulate selling some of the"
              : "Let's sell a small amount of the"
          } $${this.creatorCoinTrade.creatorProfile?.Username} coin you just bought.`,
          element: document.querySelector("#tutorial-amount-selling"),
        },
        {
          title,
          intro: `${
            this.simulatedTutorialSell
              ? `The confirm sell button would complete the transaction to sell the $${this.creatorCoinTrade.creatorProfile?.Username} coin`
              : `<b>Click "Confirm Sell"</b> to sell some of your $${this.creatorCoinTrade.creatorProfile?.Username} coin.`
          }<br/><br/><b>Click "Skip" below to continue.</b>`,
          element: document.querySelector("#tutorial-confirm-buy"),
        },
      ],
    });
    this.introJS.oncomplete(() => {
      this.skipTutorialExitPrompt = true;
      this.nextTutorialStepOnExit = true;
    });
    this.introJS.onexit(() => {
      if (!this.skipTutorialExitPrompt) {
        this.globalVars.skipTutorial(this);
      }
      if (this.nextTutorialStepOnExit) {
        this.bsModalRef.hide();
        this.backendApi
          .UpdateTutorialStatus(
            this.globalVars.localNode,
            this.globalVars.loggedInUser.PublicKeyBase58Check,
            TutorialStatus.INVEST_OTHERS_SELL
          )
          .subscribe(() => {
            this.globalVars.logEvent("invest : others : sell : skip");
            this.globalVars.updateEverything().add(() => {
              this.router.navigate([
                RouteNames.TUTORIAL,
                RouteNames.WALLET,
                this.globalVars.loggedInUser?.CreatorPurchasedInTutorialUsername,
              ]);
              window.location.reload();
            });
          });
      }
    });
    // The "Confirm Buy" element we are targetting is a child of the modal element. We can't update the child component
    // to appear above the "content window" created by intro.js because it is in a different stack context (due to being
    // the child of an element with an already set z-index). There is no way around this, so the alternative I've
    // implemented here is to overwrite clicking on the intro.js window itself to trigger the same "Confirm Buy" response.
    // Please forgive me.
    this.introJS.onchange((targetElement) => {
      if (!this.simulatedTutorialSell) {
        this.buyButtonDisabled = false;
        if (targetElement?.id === "tutorial-confirm-buy") {
          const element = document.getElementsByClassName("introjs-fixedTooltip")[0];
          element.addEventListener("click", () => this.childTradeCreatorPreviewComponent._tradeCreatorCoin());
          // @ts-ignore
          element.style.cssText += "cursor:pointer;";
        } else {
          this.buyButtonDisabled = true;
          const element = document.getElementsByClassName("introjs-fixedTooltip")[0];
          if (element) {
            element.removeEventListener("click", () => this.childTradeCreatorPreviewComponent._tradeCreatorCoin());
          }
        }
      }
    });
    this.introJS.start();
  }
  tutorialCleanUp() {
    this.bsModalRef.hide();
  }
  exitTutorial() {
    if (this.inTutorial) {
      this.skipTutorialExitPrompt = true;
      this.introJS.exit(true);
      this.skipTutorialExitPrompt = false;
    }
  }
}
