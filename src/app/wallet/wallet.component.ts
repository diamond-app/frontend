import { AfterViewInit, Component, Input, OnDestroy, OnInit } from "@angular/core";
import { GlobalVarsService } from "../global-vars.service";
import { AppRoutingModule, RouteNames } from "../app-routing.module";
import { BackendApiService, BalanceEntryResponse, TutorialStatus } from "../backend-api.service";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { InfiniteScroller } from "../infinite-scroller";
import { IAdapter, IDatasource } from "ngx-ui-scroll";
import { Subscription } from "rxjs";
import { SwalHelper } from "../../lib/helpers/swal-helper";
import { BsModalService } from "ngx-bootstrap/modal";
import * as introJs from "intro.js/intro";
import { environment } from "src/environments/environment";
import { document } from "ngx-bootstrap/utils";
import { CreatorsLeaderboardModalComponent } from "../creators-leaderboard/creators-leaderboard-modal/creators-leaderboard-modal.component";
import { BuyDesoModalComponent } from "../buy-deso-page/buy-deso-modal/buy-deso-modal.component";
import { TransferDesoModalComponent } from "../transfer-deso/transfer-deso-modal/transfer-deso-modal.component";
//import { TranslocoService } from '@ngneat/transloco';

@Component({
  selector: "wallet",
  templateUrl: "./wallet.component.html",
})
export class WalletComponent implements OnInit, OnDestroy, AfterViewInit {
  //constructor(private translocoService: TranslocoService) {}

  static PAGE_SIZE = 20;
  static BUFFER_SIZE = 10;
  static WINDOW_VIEWPORT = true;
  static PADDING = 0.5;

  @Input() inTutorial: boolean;
  // Whether the "buy" button should wiggle to prompt the user to click it
  tutorialWiggle = false;
  introJS = introJs();
  skipTutorialExitPrompt = false;

  globalVars: GlobalVarsService;
  AppRoutingModule = AppRoutingModule;
  hasUnminedCreatorCoins: boolean;
  showTransferredCoins: boolean = false;

  sortedUSDValueFromHighToLow: number = 0;
  sortedPriceFromHighToLow: number = 0;
  sortedUsernameFromHighToLow: number = 0;
  publicKeyIsCopied = false;

  usersYouReceived: BalanceEntryResponse[] = [];
  usersYouPurchased: BalanceEntryResponse[] = [];

  static coinsPurchasedTab: string = "wallet.coins_purchased";
  static coinsReceivedTab: string = "wallet.coins_received";
  tabs = [WalletComponent.coinsPurchasedTab, WalletComponent.coinsReceivedTab];
  activeTab: string = WalletComponent.coinsPurchasedTab;
  tutorialUsername: string;
  tutorialStatus: TutorialStatus;
  TutorialStatus = TutorialStatus;
  balanceEntryToHighlight: BalanceEntryResponse;

  nextButtonText: string;
  tutorialInitiated = false;
  tutorialSkippedBuy = false;
  tutorialSkippable = false;
  addMobileFooter = false;

  constructor(
    private appData: GlobalVarsService,
    private titleService: Title,
    private router: Router,
    private route: ActivatedRoute,
    private backendApi: BackendApiService,
    private modalService: BsModalService
  ) {
    this.globalVars = appData;
    this.route.params.subscribe((params) => {
      if (params.username) {
        this.tutorialUsername = params.username.toLowerCase();
      }
    });
  }

  subscriptions = new Subscription();
  tutorialHeaderText: string = "";
  tutorialStepNumber: number;

  initializePage() {
    if (this.inTutorial) {
      this.globalVars.preventBackButton();
      this.tabs = [WalletComponent.coinsPurchasedTab];
      this.tutorialStatus = this.globalVars.loggedInUser?.TutorialStatus;
      switch (this.tutorialStatus) {
        case TutorialStatus.INVEST_OTHERS_BUY: {
          this.tutorialHeaderText = "Sell a Creator";
          this.tutorialStepNumber = 1;
          this.tutorialSkippable = true;
          this.nextButtonText = `Sell ${this.balanceEntryToHighlight.ProfileEntryResponse.Username} coins`;
          break;
        }
        case TutorialStatus.INVEST_OTHERS_SELL: {
          this.tutorialHeaderText = "Sell a Creator";
          this.tutorialStepNumber = 1;
          this.nextButtonText = "Setup your profile";
          break;
        }
        case TutorialStatus.INVEST_SELF: {
          this.tutorialHeaderText = "Invest in Yourself";
          this.tutorialStepNumber = 2;
          this.nextButtonText = "Give a diamond";
          break;
        }
      }
    }
    this.globalVars.loggedInUser.UsersYouHODL.map((balanceEntryResponse: BalanceEntryResponse) => {
      if (balanceEntryResponse.NetBalanceInMempool != 0) {
        this.hasUnminedCreatorCoins = true;
      }
      // If you purchased the coin or the balance entry response if for your creator coin, show it in the purchased tab.
      if (
        balanceEntryResponse.HasPurchased ||
        balanceEntryResponse.HODLerPublicKeyBase58Check === balanceEntryResponse.CreatorPublicKeyBase58Check
      ) {
        this.usersYouPurchased.push(balanceEntryResponse);
      } else {
        this.usersYouReceived.push(balanceEntryResponse);
      }
    });
    this.sortWallet("value");
    this._handleTabClick(WalletComponent.coinsPurchasedTab);
    this.titleService.setTitle(`Wallet - ${environment.node.name}`);
  }

  ngOnInit() {
    if (this.inTutorial) {
      this.addMobileFooter = this.globalVars.isMobile() && window.innerHeight < 550;
      this.balanceEntryToHighlight = this.globalVars.loggedInUser?.UsersYouHODL.find((balanceEntry) => {
        return balanceEntry.ProfileEntryResponse.Username.toLowerCase() === this.tutorialUsername;
      });
      // If the user skipped the purchase, we simulate that purchase here so that there's something to show them
      if (!this.balanceEntryToHighlight) {
        this.backendApi
          .GetSingleProfile(
            this.globalVars.localNode,
            "",
            this.globalVars.loggedInUser.CreatorPurchasedInTutorialUsername
          )
          .subscribe((res) => {
            let balance = this.appData.loggedInUser?.BalanceNanos;
            const jumioDeSoNanos = this.appData.jumioDeSoNanos > 0 ? this.appData.jumioDeSoNanos : 1e8;
            balance = balance > jumioDeSoNanos ? jumioDeSoNanos : balance;
            const percentToBuy = 0.1;
            const nanosSimulatedBought = balance * percentToBuy;
            this.balanceEntryToHighlight = {
              HODLerPublicKeyBase58Check: this.globalVars.loggedInUser.PublicKeyBase58Check,
              CreatorPublicKeyBase58Check: res.Profile.PublicKeyBase58Check,
              HasPurchased: true,
              BalanceNanos: nanosSimulatedBought,
              NetBalanceInMempool: 0,
              ProfileEntryResponse: res.Profile,
            };
            this.usersYouPurchased.push(this.balanceEntryToHighlight);
            this.tutorialSkippedBuy = true;
            this.initializePage();
            this.scrollerReset();
          });
      } else {
        this.initializePage();
      }
    } else {
      this.initializePage();
    }
  }

  ngAfterViewInit() {
    this.subscriptions.add(
      this.datasource.adapter.lastVisible$.subscribe((lastVisible) => {
        // Last Item of myItems is Visible => data-padding-forward should be zero.
        const activeHoldings = this.showTransferredCoins ? this.usersYouReceived : this.usersYouPurchased;
        if (activeHoldings.length === 0) {
          this.correctDataPaddingForwardElementHeight(document.getElementById("wallet-scroller"));
          return;
        }
        if (lastVisible.$index === activeHoldings.length - 1 || (this.inTutorial && lastVisible.$index === 0)) {
          this.correctDataPaddingForwardElementHeight(lastVisible.element.parentElement);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  openBuyCreatorCoinsModal() {
    this.modalService.show(CreatorsLeaderboardModalComponent, {
      class: "modal-dialog-centered buy-deso-modal",
    });
  }

  openSendDeSoModal() {
    this.modalService.show(TransferDesoModalComponent, {
      class: "modal-dialog-centered buy-deso-modal",
    });
  }

  openBuyDeSoModal() {
    this.modalService.show(BuyDesoModalComponent, {
      class: "modal-dialog-centered buy-deso-modal",
      backdrop: "static",
    });
  }

  _copyPublicKey() {
    this.globalVars._copyText(this.globalVars.loggedInUser.PublicKeyBase58Check);
    this.publicKeyIsCopied = true;
    setInterval(() => {
      this.publicKeyIsCopied = false;
    }, 1000);
  }

  // Thanks to @brabenetz for the solution on forward padding with the ngx-ui-scroll component.
  // https://github.com/dhilt/ngx-ui-scroll/issues/111#issuecomment-697269318
  correctDataPaddingForwardElementHeight(viewportElement: HTMLElement): void {
    const dataPaddingForwardElement: HTMLElement = viewportElement.querySelector(`[data-padding-forward]`);
    if (dataPaddingForwardElement) {
      dataPaddingForwardElement.setAttribute("style", "height: 0px;");
    }
  }

  // sort by USD value
  sortHodlingsCoins(hodlings: BalanceEntryResponse[], descending: boolean): void {
    this.sortedUsernameFromHighToLow = 0;
    this.sortedPriceFromHighToLow = 0;
    this.sortedUSDValueFromHighToLow = descending ? -1 : 1;
    hodlings.sort((a: BalanceEntryResponse, b: BalanceEntryResponse) => {
      return (
        this.sortedUSDValueFromHighToLow *
        (this.globalVars.desoNanosYouWouldGetIfYouSold(a.BalanceNanos, a.ProfileEntryResponse.CoinEntry) -
          this.globalVars.desoNanosYouWouldGetIfYouSold(b.BalanceNanos, b.ProfileEntryResponse.CoinEntry))
      );
    });
  }

  // sort by coin price
  sortHodlingsPrice(hodlings: BalanceEntryResponse[], descending: boolean): void {
    this.sortedUsernameFromHighToLow = 0;
    this.sortedPriceFromHighToLow = descending ? -1 : 1;
    this.sortedUSDValueFromHighToLow = 0;
    hodlings.sort((a: BalanceEntryResponse, b: BalanceEntryResponse) => {
      return (
        this.sortedPriceFromHighToLow *
        (a.ProfileEntryResponse.CoinEntry.DeSoLockedNanos - b.ProfileEntryResponse.CoinEntry.DeSoLockedNanos)
      );
    });
  }

  // sort by username
  sortHodlingsUsername(hodlings: BalanceEntryResponse[], descending: boolean): void {
    this.sortedUsernameFromHighToLow = descending ? -1 : 1;
    this.sortedPriceFromHighToLow = 0;
    this.sortedUSDValueFromHighToLow = 0;
    hodlings.sort((a: BalanceEntryResponse, b: BalanceEntryResponse) => {
      return (
        this.sortedUsernameFromHighToLow *
        b.ProfileEntryResponse.Username.localeCompare(a.ProfileEntryResponse.Username)
      );
    });
  }

  sortWallet(column: string) {
    let descending: boolean;
    switch (column) {
      case "username":
        // code block
        descending = this.sortedUsernameFromHighToLow !== -1;
        this.sortHodlingsUsername(this.usersYouPurchased, descending);
        this.sortHodlingsUsername(this.usersYouReceived, descending);
        break;
      case "price":
        descending = this.sortedPriceFromHighToLow !== -1;
        this.sortHodlingsPrice(this.usersYouPurchased, descending);
        this.sortHodlingsPrice(this.usersYouReceived, descending);
        break;
      case "value":
        descending = this.sortedUSDValueFromHighToLow !== -1;
        this.sortHodlingsCoins(this.usersYouPurchased, descending);
        this.sortHodlingsCoins(this.usersYouReceived, descending);
        break;
      default:
      // do nothing
    }
    this.scrollerReset();
  }

  totalValue() {
    let result = 0;

    for (const holding of this.globalVars.loggedInUser?.UsersYouHODL || []) {
      result +=
        this.globalVars.desoNanosYouWouldGetIfYouSold(holding.BalanceNanos, holding.ProfileEntryResponse.CoinEntry) ||
        0;
    }

    return result;
  }

  unminedDeSoToolTip() {
    return (
      "Mining in progress. Feel free to transact in the meantime.\n\n" +
      "Mined balance:\n" +
      this.globalVars.nanosToDeSo(this.globalVars.loggedInUser.BalanceNanos, 9) +
      " DeSo.\n\n" +
      "Unmined balance:\n" +
      this.globalVars.nanosToDeSo(this.globalVars.loggedInUser.UnminedBalanceNanos, 9) +
      " DeSo."
    );
  }

  unminedCreatorCoinToolTip(creator: any) {
    return (
      "Mining in progress. Feel free to transact in the meantime.\n\n" +
      "Net unmined transactions:\n" +
      this.globalVars.nanosToDeSo(creator.NetBalanceInMempool, 9) +
      " DeSo.\n\n" +
      "Balance w/unmined transactions:\n" +
      this.globalVars.nanosToDeSo(creator.BalanceNanos, 9) +
      " DeSo.\n\n"
    );
  }

  usernameTruncationLength(): number {
    return this.globalVars.isMobile() ? 14 : 20;
  }

  emptyHodlerListMessage(): string {
    return this.showTransferredCoins
      ? "You haven't received coins from any creators you don't already hold."
      : "You haven't purchased any creator coins yet.";
  }

  _handleTabClick(tab: string) {
    this.showTransferredCoins = tab === WalletComponent.coinsReceivedTab;
    this.lastPage = Math.floor(
      (this.showTransferredCoins ? this.usersYouReceived : this.usersYouPurchased).length / WalletComponent.PAGE_SIZE
    );
    this.activeTab = tab;
    this.scrollerReset();
  }

  scrollerReset() {
    this.infiniteScroller.reset();
    this.datasource.adapter.reset().then(() => {
      if (!this.tutorialInitiated) {
        this.initiateIntro();
        this.tutorialInitiated = true;
      }
      this.datasource.adapter.check();
    });
  }

  isHighlightedCreator(balanceEntryResponse: BalanceEntryResponse): boolean {
    if (!this.inTutorial) {
      return false;
    }
    return (
      balanceEntryResponse.ProfileEntryResponse.Username.toLowerCase() ===
      this.balanceEntryToHighlight.ProfileEntryResponse.Username.toLowerCase()
    );
  }

  tutorialNext(): void {
    if (this.tutorialStatus === TutorialStatus.INVEST_OTHERS_BUY) {
      this.globalVars.logEvent("invest : others : buy : next");
      this.router.navigate([RouteNames.TUTORIAL, RouteNames.INVEST, RouteNames.SELL_CREATOR, this.tutorialUsername]);
    } else if (this.tutorialStatus === TutorialStatus.INVEST_OTHERS_SELL) {
      this.globalVars.logEvent("invest : others : sell : next");
      this.exitTutorial();
      this.router.navigate([RouteNames.TUTORIAL, RouteNames.INVEST, RouteNames.BUY_CREATOR]);
    } else if (this.tutorialStatus === TutorialStatus.INVEST_SELF) {
      this.globalVars.logEvent("invest : self : buy : next");
      SwalHelper.fire({
        target: this.globalVars.getTargetComponentSelector(),
        icon: "info",
        title: `Allow others to invest in your coin?`,
        html: `Click "ok" to allow others to purchase your coin. You should only do this once you've invested the full amount you intend to into your own coin.`,
        showCancelButton: true,
        showConfirmButton: true,
        focusConfirm: true,
        customClass: {
          confirmButton: "btn btn-light",
          cancelButton: "btn btn-light no",
        },
        confirmButtonText: "Not Yet",
        cancelButtonText: "Ok",
        reverseButtons: true,
        allowEscapeKey: false,
        allowOutsideClick: false,
      })
        .then((res: any) => {
          if (res.isDismissed) {
            return this.backendApi
              .UpdateProfile(
                environment.verificationEndpointHostname,
                this.globalVars.localNode,
                this.globalVars.loggedInUser.PublicKeyBase58Check,
                "",
                "",
                "",
                "",
                10 * 100,
                1.25 * 100 * 100,
                false,
                this.globalVars.feeRateDeSoPerKB * 1e9 /*MinFeeRateNanosPerKB*/
              )
              .subscribe(
                () => {
                  this.globalVars.logEvent("set : founder-reward");
                },
                (err) => {
                  console.error(err);
                  const parsedError = this.backendApi.stringifyError(err);
                  this.globalVars.logEvent("set : founder-reward : error", { parsedError });
                }
              );
          } else {
            this.globalVars.logEvent("set : founder-reward : skip");
          }
        })
        .finally(() => this.router.navigate([RouteNames.TUTORIAL, RouteNames.DIAMONDS]));
    }
  }

  lastPage = null;
  infiniteScroller: InfiniteScroller = new InfiniteScroller(
    WalletComponent.PAGE_SIZE,
    this.getPage.bind(this),
    WalletComponent.WINDOW_VIEWPORT,
    WalletComponent.BUFFER_SIZE,
    WalletComponent.PADDING
  );
  datasource: IDatasource<IAdapter<any>> = this.infiniteScroller.getDatasource();

  getPage(page: number) {
    if (this.lastPage != null && page > this.lastPage) {
      return [];
    }
    if (this.inTutorial) {
      this.lastPage = 0;
      return new Promise((resolve, reject) => {
        resolve([this.balanceEntryToHighlight]);
      });
    }
    const startIdx = page * WalletComponent.PAGE_SIZE;
    const endIdx = (page + 1) * WalletComponent.PAGE_SIZE;

    return new Promise((resolve, reject) => {
      resolve(
        this.showTransferredCoins
          ? this.usersYouReceived.slice(startIdx, Math.min(endIdx, this.usersYouReceived.length))
          : this.usersYouPurchased.slice(startIdx, Math.min(endIdx, this.usersYouPurchased.length))
      );
    });
  }

  initiateIntro() {
    setTimeout(() => {
      if (this.tutorialStatus === TutorialStatus.INVEST_OTHERS_BUY) {
        this.sellCreatorIntro();
      } else if (this.tutorialStatus === TutorialStatus.INVEST_OTHERS_SELL) {
        this.afterSellCreatorIntro();
      } else if (this.tutorialStatus === TutorialStatus.INVEST_SELF) {
        this.afterBuyCreatorIntro();
      }
    }, 500);
  }

  afterBuyCreatorIntro() {
    this.introJS = introJs();
    const userCanExit = !this.globalVars.loggedInUser?.MustCompleteTutorial || this.globalVars.loggedInUser?.IsAdmin;
    const tooltipClass = userCanExit ? "tutorial-tooltip" : "tutorial-tooltip tutorial-header-hide";
    const title = 'Invest in Yourself <span class="ml-5px tutorial-header-step">Step 2/4</span>';
    const walletContainerClass = this.globalVars.isMobile() ? ".global__content__inner" : ".global__center__inner";
    this.introJS.setOptions({
      tooltipClass,
      hideNext: false,
      exitOnEsc: false,
      exitOnOverlayClick: false,
      overlayOpacity: 0.8,
      steps: [
        {
          title,
          intro: `Woohoo! You now hold ${this.globalVars.usdYouWouldGetIfYouSoldDisplay(
            this.balanceEntryToHighlight.BalanceNanos,
            this.balanceEntryToHighlight.ProfileEntryResponse.CoinEntry
          )} of your very own $${this.balanceEntryToHighlight.ProfileEntryResponse.Username} coins.`,
          element: document.querySelector(walletContainerClass),
        },
      ],
    });
    this.introJS.oncomplete(() => {
      this.skipTutorialExitPrompt = true;
      this.tutorialNext();
    });
    this.introJS.onexit(() => {
      if (!this.skipTutorialExitPrompt) {
        this.globalVars.skipTutorial(this);
      }
    });
    this.introJS.start();
  }

  sellCreatorIntro() {
    this.introJS = introJs();
    const userCanExit = !this.globalVars.loggedInUser?.MustCompleteTutorial || this.globalVars.loggedInUser?.IsAdmin;
    const tooltipClass = userCanExit ? "tutorial-tooltip" : "tutorial-tooltip tutorial-header-hide";
    const title = 'Sell a Creator <span class="ml-5px tutorial-header-step">Step 1/4</span>';
    const walletContainerClass = this.globalVars.isMobile() ? "#wallet-container" : ".global__center__inner";
    this.introJS.setOptions({
      tooltipClass,
      hideNext: true,
      exitOnEsc: false,
      exitOnOverlayClick: false,
      overlayOpacity: 0.8,
      steps: [
        {
          title,
          intro: "In your wallet you can see which coins you own, and how much they are currently worth.",
          element: document.querySelector(walletContainerClass),
        },
        {
          title,
          intro: `Let's ${this.tutorialSkippedBuy ? "simulate what selling some " : "sell a small amount "}of the $${
            this.balanceEntryToHighlight.ProfileEntryResponse.Username
          } coin you just purchased${
            this.tutorialSkippedBuy ? " would look like" : ""
          }. <br /><br /> <b>Click the elipsis and then "Sell".</b>`,
          element: document.querySelector(".wallet__dropdown-parent > div"),
        },
      ],
    });
    this.introJS.onchange((targetElement) => {
      if (targetElement?.id === "wallet-actions-container") {
        this.tutorialWiggle = true;
      }
    });
    this.introJS.onexit(() => {
      if (!this.skipTutorialExitPrompt) {
        this.globalVars.skipTutorial(this);
      }
    });
    this.introJS.start();
  }

  afterSellCreatorIntro() {
    this.introJS = introJs();
    const userCanExit = !this.globalVars.loggedInUser?.MustCompleteTutorial || this.globalVars.loggedInUser?.IsAdmin;
    const tooltipClass = userCanExit ? "tutorial-tooltip" : "tutorial-tooltip tutorial-header-hide";
    const title = 'Sell a Creator <span class="ml-5px tutorial-header-step">Step 2/6</span>';
    this.introJS.setOptions({
      tooltipClass,
      hideNext: false,
      exitOnEsc: false,
      exitOnOverlayClick: false,
      overlayOpacity: 0.8,
      steps: [
        {
          title,
          intro: `You can now see the updated amount of $${this.balanceEntryToHighlight.ProfileEntryResponse.Username} coin in your wallet.`,
          element: document.querySelector(".global__center__inner"),
        },
      ],
    });
    this.introJS.oncomplete(() => {
      this.skipTutorialExitPrompt = true;
      this.tutorialNext();
    });
    this.introJS.onexit(() => {
      if (!this.skipTutorialExitPrompt) {
        this.globalVars.skipTutorial(this);
      }
    });
    this.introJS.start();
  }

  skipTutorialStep() {
    this.exitTutorial();
    this.globalVars.skipToNextTutorialStep(TutorialStatus.INVEST_OTHERS_SELL, "buy : creator : skip", true);
  }

  tutorialCleanUp() {}

  exitTutorial() {
    if (this.inTutorial) {
      this.skipTutorialExitPrompt = true;
      this.introJS.exit(true);
      this.skipTutorialExitPrompt = false;
    }
  }

  getBlockExplorerLink() {
    return this.globalVars.loggedInUser?.ProfileEntryResponse?.Username
      ? `https://openprosper.com/u/${this.globalVars.loggedInUser.ProfileEntryResponse.Username}/transactions`
      : `https://openprosper.com/pk/${this.globalVars.loggedInUser.PublicKeyBase58Check}/transactions`;
  }
}
