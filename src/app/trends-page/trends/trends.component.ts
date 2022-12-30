import { HttpClient } from "@angular/common/http";
import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { Router } from "@angular/router";
import { BsModalService } from "ngx-bootstrap/modal";
import { IAdapter, IDatasource } from "ngx-ui-scroll";
import { InfiniteScroller } from "src/app/infinite-scroller";
import { WelcomeModalComponent } from "src/app/welcome-modal/welcome-modal.component";
import { environment } from "src/environments/environment";
import { CanPublicKeyFollowTargetPublicKeyHelper } from "../../../lib/helpers/follows/can_public_key_follow_target_public_key_helper";
import { AltumbaseService } from "../../../lib/services/altumbase/altumbase-service";
import { OpenProsperService } from "../../../lib/services/openProsper/openprosper-service";
import { HashtagResponse } from "../../../lib/services/pulse/pulse-service";
import { AppRoutingModule } from "../../app-routing.module";
import { BackendApiService } from "../../backend-api.service";
import { GlobalVarsService } from "../../global-vars.service";
import { RightBarCreatorsComponent, RightBarTabOption } from "../../right-bar-creators/right-bar-creators.component";
import { TradeCreatorModalComponent } from "../../trade-creator-page/trade-creator-modal/trade-creator-modal.component";

@Component({
  selector: "trends",
  templateUrl: "./trends.component.html",
  styleUrls: ["./trends.component.scss"],
})
export class TrendsComponent implements OnInit {
  static PAGE_SIZE = 50;
  static WINDOW_VIEWPORT = false;
  static BUFFER_SIZE = 5;
  @Output() closeModal = new EventEmitter();
  @Input() isModal = false;

  AppRoutingModule = AppRoutingModule;
  appData: GlobalVarsService;
  altumbaseService: AltumbaseService;
  profileEntryResponses = [];
  isLeftBarMobileOpen = false;
  isLoadingProfilesForFirstTime = false;
  isLoadingMore: boolean = false;
  profilesToShow = [];
  RightBarCreatorsComponent = RightBarCreatorsComponent;
  activeTab: string = RightBarCreatorsComponent.GAINERS.name;
  activeRightTabOption: RightBarTabOption;
  selectedOptionWidth: string;
  hashtagLeaderboard: HashtagResponse[] = [];
  availableTabs = [
    RightBarCreatorsComponent.GAINERS.name,
    RightBarCreatorsComponent.HASHTAGS.name,
    RightBarCreatorsComponent.DIAMONDS.name,
  ];

  // FIME: Replace with real value
  fakeNumHodlers = Math.ceil(Math.random() * 1000) + 1000;

  // stores a mapping of page number to public key to fetch
  pagedKeys = {
    0: "",
  };

  // tracks if we've reached the end of all notifications
  lastPage = null;

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private titleService: Title,
    private modalService: BsModalService,
    private httpClient: HttpClient,
    private _router: Router
  ) {
    this.appData = globalVars;
    this.altumbaseService = new AltumbaseService(this.httpClient, this.backendApi, this.globalVars);
    this.activeRightTabOption = RightBarCreatorsComponent.chartMap[this.activeTab];
  }

  selectTab(tab: string) {
    this.activeTab = tab;
    const rightTabOption = RightBarCreatorsComponent.chartMap[this.activeTab];
    this.activeRightTabOption = rightTabOption;
    this.selectedOptionWidth = rightTabOption.width + "px";
    this.infiniteScroller.reset();
    this.datasource.adapter.reset();
    if (this.activeTab === RightBarCreatorsComponent.HASHTAGS.name) {
      const openProsperService = new OpenProsperService(this.httpClient);
      return openProsperService
        .getTrendingHashtagsPage()
        .toPromise()
        .then((res) => {
          this.hashtagLeaderboard = res;
        });
    }
  }

  getPage(page: number) {
    if (this.lastPage != null && page > this.lastPage) {
      return [];
    }

    const fetchPubKey = this.pagedKeys[page];
    let readerPubKey = "";
    if (this.globalVars.loggedInUser) {
      readerPubKey = this.globalVars.loggedInUser?.PublicKeyBase58Check;
    }
    this.isLoadingMore = true;
    if (this.activeTab === RightBarCreatorsComponent.GAINERS.name) {
      return this.altumbaseService
        .getDeSoLockedPage(page + 1, TrendsComponent.PAGE_SIZE, false)
        .toPromise()
        .then(
          (res) => {
            const chunk = res;

            // Index 0 means we're done. if the array is empty we're done.
            // subtract one so we don't fetch the last notification twice
            this.pagedKeys[page + 1] = res.NextPublicKey;

            // if the chunk was incomplete or the Index was zero we're done
            // if (chunk.length < Trends2Component.PAGE_SIZE || this.pagedKeys[page + 1] === "") {
            //   this.lastPage = page;
            // }

            return chunk;
          },
          (err) => {
            console.error(this.backendApi.stringifyError(err));
          }
        )
        .finally(() => {
          this.isLoadingMore = false;
          // We successfully loaded some profiles, so we're no longer loading for the first time
          this.isLoadingProfilesForFirstTime = false;
        });
    } else if (this.activeTab === RightBarCreatorsComponent.DIAMONDS.name) {
      return this.altumbaseService
        .getDiamondsReceivedPage(page + 1, TrendsComponent.PAGE_SIZE, false)
        .toPromise()
        .then(
          (res) => {
            const chunk = res;

            // Index 0 means we're done. if the array is empty we're done.
            // subtract one so we don't fetch the last notification twice
            this.pagedKeys[page + 1] = res.NextPublicKey;

            // if the chunk was incomplete or the Index was zero we're done
            // if (chunk.length < Trends2Component.PAGE_SIZE || this.pagedKeys[page + 1] === "") {
            //   this.lastPage = page;
            // }

            return chunk;
          },
          (err) => {
            console.error(this.backendApi.stringifyError(err));
          }
        )
        .finally(() => {
          this.isLoadingMore = false;
          // We successfully loaded some profiles, so we're no longer loading for the first time
          this.isLoadingProfilesForFirstTime = false;
        });
    }
  }

  openBuyCreatorCoinModal(event, username: string) {
    event.stopPropagation();
    this.closeModal.emit();

    if (!this.globalVars.loggedInUser) {
      this.modalService.show(WelcomeModalComponent, { initialState: { triggerAction: "buy-cc" } });
      return;
    }

    const initialState = { username: username, tradeType: this.globalVars.RouteNames.BUY_CREATOR };
    this.modalService.show(TradeCreatorModalComponent, {
      class: "modal-dialog-centered buy-deso-modal",
      initialState,
    });
  }

  refreshData() {
    this.isLoadingProfilesForFirstTime = true;
    this.infiniteScroller.reset();
    this.datasource.adapter.reset();
  }

  navigateToHashtag(hashtag: string) {
    this._router.navigate(
      ["/" + this.globalVars.RouteNames.BROWSE + "/" + this.globalVars.RouteNames.TAG, hashtag.substring(1)],
      {
        queryParamsHandling: "merge",
      }
    );
  }

  ngOnInit() {
    this.isLoadingProfilesForFirstTime = true;
    this.titleService.setTitle(`Trends - ${environment.node.name}`);
  }

  canLoggedInUserFollowTargetPublicKey(targetPubKeyBase58Check) {
    return CanPublicKeyFollowTargetPublicKeyHelper.execute(
      this.appData.loggedInUser.PublicKeyBase58Check,
      targetPubKeyBase58Check
    );
  }

  infiniteScroller: InfiniteScroller = new InfiniteScroller(
    TrendsComponent.PAGE_SIZE,
    this.getPage.bind(this),
    TrendsComponent.WINDOW_VIEWPORT,
    TrendsComponent.BUFFER_SIZE,
    0.5
  );
  datasource: IDatasource<IAdapter<any>> = this.infiniteScroller.getDatasource();
}
