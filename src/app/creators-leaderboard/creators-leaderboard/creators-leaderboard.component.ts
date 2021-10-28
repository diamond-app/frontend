import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { BackendApiService } from "../../backend-api.service";
import { AppRoutingModule } from "../../app-routing.module";
import { CanPublicKeyFollowTargetPublicKeyHelper } from "../../../lib/helpers/follows/can_public_key_follow_target_public_key_helper";
import { IAdapter, IDatasource } from "ngx-ui-scroll";
import { Title } from "@angular/platform-browser";
import { InfiniteScroller } from "src/app/infinite-scroller";
import { BsModalService } from "ngx-bootstrap/modal";
import { TradeCreatorComponent } from "../../trade-creator-page/trade-creator/trade-creator.component";
import { environment } from "src/environments/environment";

@Component({
  selector: "creators-leaderboard",
  templateUrl: "./creators-leaderboard.component.html",
  styleUrls: ["./creators-leaderboard.component.scss"],
})
export class CreatorsLeaderboardComponent implements OnInit {
  static PAGE_SIZE = 50;
  static WINDOW_VIEWPORT = false;
  static BUFFER_SIZE = 5;
  @Output() closeModal = new EventEmitter();
  @Input() isModal = false;

  AppRoutingModule = AppRoutingModule;
  appData: GlobalVarsService;
  profileEntryResponses = [];
  isLeftBarMobileOpen = false;
  isLoadingProfilesForFirstTime = false;
  isLoadingMore: boolean = false;
  profilesToShow = [];

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
    private modalService: BsModalService
  ) {
    this.appData = globalVars;
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

    return this.backendApi
      .GetProfiles(
        this.appData.localNode,
        fetchPubKey /*PublicKeyBase58Check*/,
        null /*Username*/,
        null /*UsernamePrefix*/,
        null /*Description*/,
        BackendApiService.GET_PROFILES_ORDER_BY_INFLUENCER_COIN_PRICE /*Order by*/,
        CreatorsLeaderboardComponent.PAGE_SIZE /*NumToFetch*/,
        readerPubKey /*ReaderPublicKeyBase58Check*/,
        "leaderboard" /*ModerationType*/,
        false /*FetchUsersThatHODL*/,
        false /*AddGlobalFeedBool*/
      )
      .toPromise()
      .then(
        (res) => {
          const chunk = res.ProfilesFound;

          // Index 0 means we're done. if the array is empty we're done.
          // subtract one so we don't fetch the last notification twice
          this.pagedKeys[page + 1] = res.NextPublicKey;

          // if the chunk was incomplete or the Index was zero we're done
          if (chunk.length < CreatorsLeaderboardComponent.PAGE_SIZE || this.pagedKeys[page + 1] === "") {
            this.lastPage = page;
          }

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

  openBuyCreatorCoinModal(event, username: string) {
    event.stopPropagation();
    this.closeModal.emit();
    const initialState = { username: username, tradeType: this.globalVars.RouteNames.BUY_CREATOR };
    this.modalService.show(TradeCreatorComponent, {
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
    this.titleService.setTitle(`Buy Creator Coins - ${environment.node.name}`);
  }

  canLoggedInUserFollowTargetPublicKey(targetPubKeyBase58Check) {
    return CanPublicKeyFollowTargetPublicKeyHelper.execute(
      this.appData.loggedInUser.PublicKeyBase58Check,
      targetPubKeyBase58Check
    );
  }

  infiniteScroller: InfiniteScroller = new InfiniteScroller(
    CreatorsLeaderboardComponent.PAGE_SIZE,
    this.getPage.bind(this),
    CreatorsLeaderboardComponent.WINDOW_VIEWPORT,
    CreatorsLeaderboardComponent.BUFFER_SIZE,
    0.5
  );
  datasource: IDatasource<IAdapter<any>> = this.infiniteScroller.getDatasource();
}
