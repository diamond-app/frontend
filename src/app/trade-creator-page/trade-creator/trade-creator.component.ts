// TODO: creator coin buys: no-balance case is kinda dumb, we should have a module telling you to buy deso or
// creator coin

// TODO: creator coin buys: need warning about potential slippage

// TODO: creator coin buys: may need tiptips explaining why total != amount * currentPriceElsewhereOnSite

import { Component, Input, OnInit, Output, ViewChild, EventEmitter } from "@angular/core";
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
import { FeedComponent } from "../../feed/feed.component";
import { isNil } from "lodash";

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
  @Output() hideModal = new EventEmitter<any>();
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
      this.hideModal.emit();
      SwalHelper.fire({
        target: this.globalVars.getTargetComponentSelector(),
        title: "Success!",
        html: `You can now track all of your investments in your wallet OR go to your feed`,
        showCancelButton: true,
        customClass: {
          confirmButton: "btn btn-light",
          cancelButton: "btn btn-light no",
        },
        confirmButtonText: "Go to Feed",
        cancelButtonText: "View Wallet",
        reverseButtons: true,
      }).then((response: any) => {
        this.backendApi
          .UpdateTutorialStatus(
            this.globalVars.localNode,
            this.globalVars.loggedInUser.PublicKeyBase58Check,
            TutorialStatus.COMPLETE,
            this.globalVars.loggedInUser.PublicKeyBase58Check,
            true
          )
          .subscribe(() => {
            if (response.isConfirmed) {
              const signUpRedirect = this.backendApi.GetStorage("signUpRedirect");
              const redirectPath = isNil(signUpRedirect) ? `/${this.globalVars.RouteNames.BROWSE}` : signUpRedirect;
              if (!isNil(signUpRedirect)) {
                this.backendApi.RemoveStorage("signUpRedirect");
              }
              this.router.navigate([redirectPath], {
                queryParams: { feedTab: FeedComponent.FOLLOWING_TAB },
              });
            } else {
              this.router.navigate(["/" + this.globalVars.RouteNames.WALLET]);
            }
          });
      });
    }
  }

  readyForDisplay() {
    return (
      this.creatorProfile &&
      // USD calculations don't work correctly until we have the exchange rate
      this.appData.nanosPerUSDExchangeRate &&
      // Need to make sure the USD exchange rate is actually loaded, not a random default
      this.appData.nanosPerUSDExchangeRate != GlobalVarsService.DEFAULT_NANOS_PER_USD_EXCHANGE_RATE
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
    private modalService: BsModalService
  ) {
    this.appData = globalVars;
    this.router = _router;
    this.route = _route;
  }

  openBuyDeSoModal() {
    this.hideModal.emit();
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
      // this.screenToShow = this.TRADE_CREATOR_PREVIEW_SCREEN;
      this.creatorCoinTrade.isBuyingCreatorCoin = true;
      this.creatorCoinTrade.tradeType = CreatorCoinTrade.BUY_VERB;
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
    const amount = this.globalVars.usdToNanosNumber(0.1);
    this.creatorCoinTrade.desoToSell = amount / 1e9;
    this.getBuyOrSellObservable().subscribe(
      (response) => {
        this.creatorCoinTrade.expectedCreatorCoinReturnedNanos = response.ExpectedCreatorCoinReturnedNanos || 0;
        this.creatorCoinTrade.expectedFounderRewardNanos = response.FounderRewardGeneratedNanos || 0;
      },
      (err) => {
        if (!this.inTutorial) {
          console.error(err);
          this.appData._alertError(this.backendApi.parseProfileError(err));
        }
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
    } else {
      this.getBuyOrSellObservable().subscribe(
        (response) => {
          this.creatorCoinTrade.expectedDeSoReturnedNanos = response.ExpectedDeSoReturnedNanos || 0;
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

  buyCreatorTutorialComplete() {
    this.backendApi
      .UpdateTutorialStatus(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        TutorialStatus.INVEST_OTHERS_BUY,
        this.creatorCoinTrade.creatorProfile.PublicKeyBase58Check,
        true
      )
      .subscribe(() => {
        this.globalVars.logEvent("buy : creator : select");
        this.globalVars.updateEverything().add(() => {
          this.hideModal.emit();
          this.router.navigate([
            RouteNames.TUTORIAL,
            RouteNames.WALLET,
            this.globalVars.loggedInUser?.CreatorPurchasedInTutorialUsername,
          ]);
        });
      });
  }

  sellCreatorTutorialComplete() {
    this.backendApi
      .UpdateTutorialStatus(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        TutorialStatus.INVEST_OTHERS_SELL,
        this.creatorCoinTrade.creatorProfile.PublicKeyBase58Check,
        true
      )
      .subscribe(() => {
        this.globalVars.logEvent("invest : others : sell : next");
        this.globalVars.updateEverything().add(() => {
          this.hideModal.emit();
          this.router.navigate([
            RouteNames.TUTORIAL,
            RouteNames.WALLET,
            this.globalVars.loggedInUser?.CreatorPurchasedInTutorialUsername,
          ]);
          window.location.reload();
        });
      });
  }
}
