import { Location } from "@angular/common";
import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output, ViewChild } from "@angular/core";
import { Meta, Title } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { TrackingService } from "src/app/tracking.service";
import { environment } from "src/environments/environment";
import { SwalHelper } from "../../../lib/helpers/swal-helper";
import { BackendApiService, ProfileEntryResponse } from "../../backend-api.service";
import { GlobalVarsService } from "../../global-vars.service";
import { CreatorProfileTopCardComponent } from "../creator-profile-top-card/creator-profile-top-card.component";

@Component({
  selector: "creator-profile-details",
  templateUrl: "./creator-profile-details.component.html",
  styleUrls: ["./creator-profile-details.component.scss"],
})
export class CreatorProfileDetailsComponent implements OnInit {
  @ViewChild(CreatorProfileTopCardComponent, { static: false }) childTopCardComponent;

  static TABS = {
    posts: "Posts",
    // Leaving this one in so old links will direct to the Coin Purchasers tab.
    "creator-coin": "Creator Coin",
    "coin-purchasers": "Creator Coin",
    diamonds: "Diamonds",
    nfts: "NFTs",
    blog: "Blog",
  };
  static TABS_LOOKUP = {
    Posts: "posts",
    "Creator Coin": "creator-coin",
    Diamonds: "diamonds",
    NFTs: "nfts",
    Blog: "blog",
  };
  appData: GlobalVarsService;
  userName: string;
  profile: ProfileEntryResponse;
  activeTab: string;
  loading: boolean;

  // emits the UserUnblocked event
  @Output() userUnblocked = new EventEmitter();

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private location: Location,
    private titleService: Title,
    private meta: Meta,
    private tracking: TrackingService
  ) {
    this.route.params.subscribe((params) => {
      this.userName = params.username;
      this._refreshContent();
    });
    this.route.queryParams.subscribe((params) => {
      this.activeTab =
        params.tab && params.tab in CreatorProfileDetailsComponent.TABS
          ? CreatorProfileDetailsComponent.TABS[params.tab]
          : "Posts";
    });
  }

  ngOnInit() {
    this.titleService.setTitle(this.userName + ` on ${environment.node.name}`);
  }

  userBlocked() {
    this.childTopCardComponent._unfollowIfBlocked();
  }
  unblockUser() {
    this.unblock();
  }

  coinsInCirculation() {
    return this.profile.CoinEntry.CoinsInCirculationNanos / 1e9;
  }

  usdMarketCap() {
    return this.globalVars.abbreviateNumber(
      this.globalVars.nanosToUSDNumber(this.coinsInCirculation() * this.profile.CoinPriceDeSoNanos),
      2,
      true
    );
  }

  totalUSDLocked() {
    return this.globalVars.abbreviateNumber(
      this.globalVars.nanosToUSDNumber(this.profile.CoinEntry.DeSoLockedNanos),
      2,
      true
    );
  }

  unblock() {
    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      title: "Unblock user",
      html: `This user will appear in your feed and on your threads again`,
      showCancelButton: true,
      customClass: {
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
      reverseButtons: true,
    }).then((response: any) => {
      this.userUnblocked.emit(this.profile.PublicKeyBase58Check);
      if (response.isConfirmed) {
        delete this.globalVars.loggedInUser.BlockedPubKeys[this.profile.PublicKeyBase58Check];
        this.backendApi
          .BlockPublicKey(
            this.globalVars.localNode,
            this.globalVars.loggedInUser?.PublicKeyBase58Check,
            this.profile.PublicKeyBase58Check,
            true /* unblock */
          )
          .subscribe(
            () => {
              this.tracking.log("profile : unblock", {
                username: this.profile.Username,
                publicKey: this.profile.PublicKeyBase58Check,
                isVerified: this.profile.IsVerified,
              });
            },
            (err) => {
              console.log(err);
              const parsedError = this.backendApi.stringifyError(err);
              this.tracking.log("profile : unblock", { error: parsedError });
              this.globalVars._alertError(parsedError);
            }
          );
      }
    });
  }

  _isLoggedInUserFollowing() {
    if (!this.appData.loggedInUser?.PublicKeysBase58CheckFollowedByUser) {
      return false;
    }

    return this.appData.loggedInUser.PublicKeysBase58CheckFollowedByUser.includes(this.profile.PublicKeyBase58Check);
  }

  blockUser() {
    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      title: "Block user?",
      html: `This will hide all comments from this user on your posts as well as hide them from your view on other threads.`,
      showCancelButton: true,
      customClass: {
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
      reverseButtons: true,
    }).then((response: any) => {
      if (response.isConfirmed) {
        this.globalVars.loggedInUser.BlockedPubKeys[this.profile.PublicKeyBase58Check] = {};
        Promise.all([
          this.backendApi
            .BlockPublicKey(
              this.globalVars.localNode,
              this.globalVars.loggedInUser?.PublicKeyBase58Check,
              this.profile.PublicKeyBase58Check
            )
            .subscribe(
              () => {
                this.tracking.log("profile : block", {
                  username: this.profile.Username,
                  publicKey: this.profile.PublicKeyBase58Check,
                  isVerified: this.profile.IsVerified,
                });
              },
              (err) => {
                console.error(err);
                const parsedError = this.backendApi.stringifyError(err);
                this.tracking.log("profile : block", { error: parsedError });
                this.globalVars._alertError(parsedError);
              }
            ),
          // Unfollow this profile if we are currently following it.
          this.childTopCardComponent._unfollowIfBlocked(),
        ]);
      }
    });
  }

  _refreshContent() {
    if (this.loading) {
      return;
    }

    let readerPubKey = "";
    if (this.globalVars.loggedInUser) {
      readerPubKey = this.globalVars.loggedInUser?.PublicKeyBase58Check;
    }

    this.loading = true;
    this.backendApi.GetSingleProfile(this.globalVars.localNode, "", this.userName).subscribe(
      (res) => {
        if (!res || res.IsBlacklisted) {
          this.loading = false;
          this.router.navigateByUrl("/" + this.appData.RouteNames.NOT_FOUND, { skipLocationChange: true });
          return;
        }
        this.profile = res.Profile;
        this.setMetaTags();
        this.loading = false;
      },
      (_) => {
        this.loading = false;
      }
    );
  }

  setMetaTags() {
    this.meta.updateTag({
      property: "og:title",
      content: `${this.profile?.Username}'s Profile on Diamond`,
    });
    this.meta.updateTag({ property: "og:description", content: this.profile?.Description });
    if (this.profile.ExtraData?.NFTProfilePictureUrl && this.profile.ExtraData?.NFTProfilePictureUrl.length > 0) {
      this.meta.updateTag({ property: "og:image", content: this.profile.ExtraData?.NFTProfilePictureUrl });
    } else if (this.profile.ExtraData?.LargeProfilePicURL && this.profile.ExtraData?.LargeProfilePicURL.length > 0) {
      this.meta.updateTag({ property: "og:image", content: this.profile.ExtraData?.LargeProfilePicURL });
    } else {
      this.meta.updateTag({
        property: "og:image",
        content: `https://${this.globalVars.localNode}/api/v0/get-single-profile-picture/${this.profile.PublicKeyBase58Check}`,
      });
    }
  }

  _handleTabClick(tabName: string) {
    this.activeTab = tabName;
    // Update query params to reflect current tab
    const urlTree = this.router.createUrlTree([], {
      queryParams: { tab: CreatorProfileDetailsComponent.TABS_LOOKUP[tabName] || "posts" },
      queryParamsHandling: "merge",
      preserveFragment: true,
    });
    this.location.go(urlTree.toString());
  }

  tweetToClaimLink() {
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      `Claiming my account on ${environment.node.url.replace("https://", "")} 💎🙌\n\n${environment.node.url}/u/${
        this.userName
      }?public_key=${this.globalVars.loggedInUser?.PublicKeyBase58Check}\n\n@desoprotocol #deso`
    )}`;
  }

  showProfileAsReserved() {
    return this.profile.IsReserved && !this.profile.IsVerified;
  }

  isPubKeyBalanceless(): boolean {
    return (
      !this.globalVars.loggedInUser?.ProfileEntryResponse?.Username &&
      this.globalVars.loggedInUser?.UsersYouHODL?.length === 0
    );
  }
}
