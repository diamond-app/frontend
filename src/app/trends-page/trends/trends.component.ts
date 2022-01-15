import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { BackendApiService } from "../../backend-api.service";
import { AppRoutingModule } from "../../app-routing.module";
import { CanPublicKeyFollowTargetPublicKeyHelper } from "../../../lib/helpers/follows/can_public_key_follow_target_public_key_helper";
import { IAdapter, IDatasource } from "ngx-ui-scroll";
import { Title } from "@angular/platform-browser";
import { InfiniteScroller } from "src/app/infinite-scroller";
import { BsModalService } from "ngx-bootstrap/modal";
import { TradeCreatorModalComponent } from "../../trade-creator-page/trade-creator-modal/trade-creator-modal.component";
import { environment } from "src/environments/environment";
import { RightBarCreatorsComponent, RightBarTabOption } from "../../right-bar-creators/right-bar-creators.component";
import { AltumbaseService } from "../../../lib/services/altumbase/altumbase-service";
import { HttpClient } from "@angular/common/http";

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
  availableTabs = [
    RightBarCreatorsComponent.GAINERS.name,
    RightBarCreatorsComponent.DIAMONDS.name,
    RightBarCreatorsComponent.COMMUNITY.name,
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
    private httpClient: HttpClient
  ) {
    this.appData = globalVars;
    this.altumbaseService = new AltumbaseService(this.httpClient, this.backendApi, this.globalVars);
    this.activeRightTabOption = RightBarCreatorsComponent.chartMap[this.activeTab]
  }

  selectTab(tab: string) {
    this.activeTab = tab;
    const rightTabOption = RightBarCreatorsComponent.chartMap[this.activeTab];
    this.activeRightTabOption = rightTabOption;
    this.selectedOptionWidth = rightTabOption.width + "px";
    this.infiniteScroller.reset();
    this.datasource.adapter.reset();
  }

  getPage(page: number) {
    if (this.lastPage != null && page > this.lastPage) {
      return [];
    }

    const fetchPubKey = this.pagedKeys[page];
    let readerPubKey = "";
    if (this.globalVars.loggedInUser) {
      readerPubKey = this.globalVars.loggedInUser.PublicKeyBase58Check;
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
    } else if (this.activeTab === RightBarCreatorsComponent.COMMUNITY.name) {
      const start = TrendsComponent.PAGE_SIZE * page;
      let end = start + TrendsComponent.PAGE_SIZE;
      if (end > this.globalVars.allCommunityProjectsLeaderboard.length) {
        end = this.globalVars.allCommunityProjectsLeaderboard.length;
      }
      return this.globalVars.allCommunityProjectsLeaderboard.slice(TrendsComponent.PAGE_SIZE * page, end);
    }
  }

  openBuyCreatorCoinModal(event, username: string) {
    event.stopPropagation();
    this.closeModal.emit();
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
