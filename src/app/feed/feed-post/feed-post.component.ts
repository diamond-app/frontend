import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { BackendApiService, NFTEntryResponse, PostEntryResponse } from "../../backend-api.service";
import { AppRoutingModule, RouteNames } from "../../app-routing.module";
import { Router } from "@angular/router";
import { SwalHelper } from "../../../lib/helpers/swal-helper";
import { FeedPostImageModalComponent } from "../feed-post-image-modal/feed-post-image-modal.component";
import { BsModalService } from "ngx-bootstrap/modal";
import { DomSanitizer } from "@angular/platform-browser";
import * as _ from "lodash";
import { EmbedUrlParserService } from "../../../lib/services/embed-url-parser-service/embed-url-parser-service";
import { SharedDialogs } from "../../../lib/shared-dialogs";
import { PlaceBidModalComponent } from "../../place-bid/place-bid-modal/place-bid-modal.component";
import { TradeCreatorModalComponent } from "../../trade-creator-page/trade-creator-modal/trade-creator-modal.component";
import { LikesModalComponent } from "../../likes-details/likes-modal/likes-modal.component";
import { DiamondsModalComponent } from "../../diamonds-details/diamonds-modal/diamonds-modal.component";
import { QuoteRepostsModalComponent } from "../../quote-reposts-details/quote-reposts-modal/quote-reposts-modal.component";
import { RepostsModalComponent } from "../../reposts-details/reposts-modal/reposts-modal.component";
import { ToastrService } from "ngx-toastr";
import { TransferNftAcceptModalComponent } from "../../transfer-nft-accept/transfer-nft-accept-modal/transfer-nft-accept-modal.component";
import { FollowService } from "../../../lib/services/follow/follow.service";
import { TranslocoService } from "@ngneat/transloco";
import { FeedPostIconRowComponent } from "../feed-post-icon-row/feed-post-icon-row.component";
import { CloudflareStreamService } from "../../../lib/services/stream/cloudflare-stream-service";
import { environment } from "../../../environments/environment";
import { filter } from "lodash";

@Component({
  selector: "feed-post",
  templateUrl: "./feed-post.component.html",
  styleUrls: ["./feed-post.component.scss"],
})
export class FeedPostComponent implements OnInit {
  @Input() isOnThreadPage;
  @Input() hasReadMoreRollup = true;
  @Input()
  get post(): PostEntryResponse {
    return this._post;
  }
  set post(post: PostEntryResponse) {
    // When setting the post, we need to consider repost behavior.
    // If a post is a reposting another post (without a quote), then use the reposted post as the post content.
    // If a post is quoting another post, then we use the quoted post as the quoted content.
    this._post = post;
    if (this.isRepost(post)) {
      this.postContent = post.RepostedPostEntryResponse;
      this.reposterProfile = post.ProfileEntryResponse;
      if (this.isQuotedRepost(post.RepostedPostEntryResponse)) {
        this.quotedContent = this.postContent.RepostedPostEntryResponse;
      }
    } else if (this.isQuotedRepost(post)) {
      this.postContent = post;
      this.quotedContent = post.RepostedPostEntryResponse;
    } else {
      this.postContent = post;
    }

    setTimeout(() => {
      this.ref.detectChanges();
    }, 0);
  }

  @Input() set blocked(value: boolean) {
    this._blocked = value;
    this.ref.detectChanges();
  }
  get blocked() {
    return this._blocked;
  }

  @Input() set videoPaused(value: boolean) {
    if (value) {
      this.pauseVideo();
    } else {
      this.resumeVideo();
    }
  }

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private ref: ChangeDetectorRef,
    private router: Router,
    private modalService: BsModalService,
    private sanitizer: DomSanitizer,
    private toastr: ToastrService,
    private followService: FollowService,
    private translocoService: TranslocoService,
    private streamService: CloudflareStreamService
  ) {
    // Change detection on posts is a very expensive process so we detach and perform
    // the computation manually with ref.detectChanges().
    ref.detach();
  }

  // Got this from https://code.habd.as/jhabdas/xanthippe/src/branch/master/lib/xanthippe.js#L8
  // Other regexes:
  //   - https://stackoverflow.com/questions/7150652/regex-valid-twitter-mention/8975426
  //   - https://github.com/regexhq/mentions-regex
  static MENTIONS_REGEX = /\B\@([\w\-]+)/gim;

  // The max video duration in seconds that will trigger an auto-play, muted, looped, no-visible control video
  static AUTOPLAY_LOOP_SEC_THRESHOLD = 12;

  @Input() isNFTListSummary = false;
  @Input() showIconRow = true;
  @Input() showAdminRow = false;
  @Input() contentShouldLinkToThread: boolean;

  @Input() afterCommentCreatedCallback: any = null;
  @Input() afterRepostCreatedCallback: any = null;
  @Input() showReplyingToContent: any = null;
  @Input() parentPost;
  @Input() isParentPostInThread = false;
  @Input() showThreadConnectionLine = false;
  @Input() showLeftSelectedBorder = false;
  @Input() showInteractionDetails = false;
  @Input() isQuotedContent: boolean = false;

  @Input() showDropdown = true;
  @Input() hideFollowLink = false;

  @Input() includePaddingOnPost = false;

  @Input() showQuotedContent = true;
  @Input() hoverable = true;
  @Input() cardStyle: boolean = false;

  @Input() showReplyingTo = false;
  @Input() nftCollectionHighBid = 0;
  @Input() nftCollectionLowBid = 0;
  @Input() isForSaleOnly: boolean = false;
  nftLastAcceptedBidAmountNanos: number;
  nftMinBidAmountNanos: number;
  nftBuyNowPriceNanos: number;

  @Input() showNFTDetails = false;
  @Input() showExpandedNFTDetails = false;
  @Input() setBorder = false;
  @Input() showAvailableSerialNumbers = false;

  @Input() profilePublicKeyBase58Check: string = "";

  // If the post is shown in a modal, this is used to hide the modal on post click.
  @Input() containerModalRef: any = null;

  @Input() inTutorial: boolean = false;

  // If this is a pending NFT post that still needs to be accepted by the user
  @Input() acceptNFT: boolean = false;

  // Determines whether this is part of a comment thread. It controls the left
  // padding applies to threaded comments.
  @Input() isThreaded = false;

  // Determines whether the comment has the vertical line connecting a single
  // thread. We use a different prop for this since the last node of a thread
  // does not have the vertical line. It only has the left padding.
  @Input() hasThreadIndicator = false;

  @Input() isThreadChild = false;

  // emits the PostEntryResponse
  @Output() postDeleted = new EventEmitter();

  // emits the UserBlocked event
  @Output() userBlocked = new EventEmitter();

  // emits the nftBidPLaced event
  @Output() nftBidPlaced = new EventEmitter();

  // emits diamondSent event
  @Output() diamondSent = new EventEmitter();

  // tells parent component to pause all videos while transaction is going on
  @Output() pauseAllVideos = new EventEmitter();

  @ViewChild(FeedPostIconRowComponent, { static: false }) childFeedPostIconRowComponent;
  @ViewChild("videoContainer") videoContainerDiv: ElementRef;
  @ViewChild("videoIframe") videoIFrame: ElementRef;

  AppRoutingModule = AppRoutingModule;
  addingPostToGlobalFeed = false;
  repost: any;
  postContent: any;
  reposterProfile: any;
  _post: any;
  pinningPost = false;
  hidingPost = false;
  quotedContent: any;
  _blocked: boolean;
  constructedEmbedURL: any;

  showPlaceABid: boolean;
  highBid: number = null;
  lowBid: number = null;
  availableSerialNumbers: NFTEntryResponse[];
  myAvailableSerialNumbers: NFTEntryResponse[];
  mySerialNumbersNotForSale: NFTEntryResponse[];
  serialNumbersDisplay: string;
  nftEntryResponses: NFTEntryResponse[];
  decryptableNFTEntryResponses: NFTEntryResponse[];
  isFollowing: boolean;
  showReadMoreRollup = false;
  videoURL: string;
  showVideoControls = false;
  // Height of video window, used for overlay to be clicked on to disable autoplay, enable controls and volume
  videoOverlayContainerHeight = "0px";
  // Height of the video container window. Will expand when short videos have a narrow aspect ratio.
  videoContainerHeight = "100%";
  sourceVideoAspectRatio: number;
  videoAutoPlaying = false;
  // If the user is buying an NFT, pause all videos. Track it here so that once the buy is complete we can resume the autoplay
  videoTemporarilyPaused = false;
  streamPlayer: any;

  unlockableTooltip =
    "This NFT will come with content that's encrypted and only unlockable by the winning bidder. Note that if an NFT is being resold, it is not guaranteed that the new unlockable will be the same original unlockable.";
  mOfNNFTTooltip =
    "Each NFT can have multiple editions, each of which has its own unique serial number. This shows how many editions are currently on sale and how many there are in total. Generally, editions with lower serial numbers are more valuable.";

  getNFTEntries() {
    this.backendApi
      .GetNFTEntriesForNFTPost(
        this.globalVars.localNode,
        this.globalVars.loggedInUser?.PublicKeyBase58Check,
        this.postContent.PostHashHex
      )
      .subscribe((res) => {
        this.nftEntryResponses = res.NFTEntryResponses;
        this.nftEntryResponses.sort((a, b) => a.SerialNumber - b.SerialNumber);
        this.decryptableNFTEntryResponses = this.nftEntryResponses.filter(
          (sn) =>
            sn.OwnerPublicKeyBase58Check === this.globalVars.loggedInUser?.PublicKeyBase58Check &&
            sn.EncryptedUnlockableText &&
            sn.LastOwnerPublicKeyBase58Check
        );
        if (this.decryptableNFTEntryResponses.length) {
          this.backendApi
            .DecryptUnlockableTexts(
              this.globalVars.loggedInUser?.PublicKeyBase58Check,
              this.decryptableNFTEntryResponses
            )
            .subscribe((res) => (this.decryptableNFTEntryResponses = res));
        }
        this.availableSerialNumbers = this.nftEntryResponses.filter((nftEntryResponse) => nftEntryResponse.IsForSale);
        const profileSerialNumbers = this.nftEntryResponses.filter(
          (serialNumber) =>
            serialNumber.OwnerPublicKeyBase58Check === this.profilePublicKeyBase58Check &&
            (!this.isForSaleOnly || serialNumber.IsForSale)
        );
        this.serialNumbersDisplay =
          profileSerialNumbers
            .map((serialNumber) => `#${serialNumber.SerialNumber}`)
            .slice(0, 5)
            .join(", ") + (profileSerialNumbers.length > 5 ? "..." : "");
        this.mySerialNumbersNotForSale = this.nftEntryResponses.filter(
          (nftEntryResponse) =>
            !nftEntryResponse.IsForSale &&
            nftEntryResponse.OwnerPublicKeyBase58Check === this.globalVars.loggedInUser?.PublicKeyBase58Check
        );
        this.myAvailableSerialNumbers = this.availableSerialNumbers.filter(
          (nftEntryResponse) =>
            nftEntryResponse.OwnerPublicKeyBase58Check === this.globalVars.loggedInUser?.PublicKeyBase58Check
        );
        this.showPlaceABid = !!(this.availableSerialNumbers.length - this.myAvailableSerialNumbers.length);
        this.ref.detectChanges();
        this.highBid = _.maxBy(this.availableSerialNumbers, "HighestBidAmountNanos")?.HighestBidAmountNanos || 0;
        const lowestBidObject = _.minBy(this.availableSerialNumbers, (availableSerialNumber) => {
          return Math.max(availableSerialNumber?.HighestBidAmountNanos, availableSerialNumber?.MinBidAmountNanos);
        });
        this.lowBid = Math.max(lowestBidObject?.HighestBidAmountNanos || 0, lowestBidObject?.MinBidAmountNanos || 0);
        if (this.nftEntryResponses.length === 1) {
          const nftEntryResponse = this.nftEntryResponses[0];
          this.nftLastAcceptedBidAmountNanos = nftEntryResponse.LastAcceptedBidAmountNanos;
          if (nftEntryResponse.MinBidAmountNanos > 0) {
            this.nftMinBidAmountNanos = nftEntryResponse.MinBidAmountNanos;
          }
          if (nftEntryResponse.BuyNowPriceNanos > 0 && nftEntryResponse.IsBuyNow) {
            this.nftBuyNowPriceNanos = nftEntryResponse.BuyNowPriceNanos;
          }
        } else if (this.nftEntryResponses.length > 1) {
          const buyNowNFTs = filter(this.availableSerialNumbers, (SN) => SN.BuyNowPriceNanos > 0);
          if (buyNowNFTs.length > 0) {
            this.nftBuyNowPriceNanos = _.minBy(buyNowNFTs, "BuyNowPriceNanos")?.BuyNowPriceNanos || 0;
          }
        }
        this.ref.detectChanges();
      });
  }

  ngOnInit() {
    if (!this.post.RepostCount) {
      this.post.RepostCount = 0;
    }
    this.setEmbedURLForPostContent();
    this.setURLForVideoContent();
    if (this.showNFTDetails && this.postContent.IsNFT && !this.nftEntryResponses?.length) {
      this.getNFTEntries();
    }
    this.isFollowing = this.followService._isLoggedInUserFollowing(
      this.postContent.ProfileEntryResponse?.PublicKeyBase58Check
    );
    // We only allow showing long form content on the post detail page. We truncate it everywhere else with
    // a read more link to the detail.
    if (this.hasReadMoreRollup && this.postContent.Body.length > GlobalVarsService.MAX_POST_LENGTH) {
      // NOTE: We first spread the string into an array since this will account
      // for unicode multi-codepoint characters like emojis. Just using
      // substring will potentially break a string in the middle of a
      // "surrogate-pair" and render something unexpected in its place. This is
      // still a relatively naive approach, but it should do the right thing in
      // almost all cases.
      // https://dmitripavlutin.com/what-every-javascript-developer-should-know-about-unicode/#length-and-surrogate-pairs
      const chars = [...this.postContent.Body].slice(0, GlobalVarsService.MAX_POST_LENGTH);
      this.postContent.Body = `${chars.join("")}...`;
      this.showReadMoreRollup = true;
    }
  }

  openBuyCreatorCoinModal(event, username: string) {
    event.stopPropagation();
    const initialState = { username, tradeType: this.globalVars.RouteNames.BUY_CREATOR };
    this.modalService.show(TradeCreatorModalComponent, {
      class: "modal-dialog-centered buy-deso-modal",
      initialState,
    });
  }

  onPostClicked(event) {
    if (this.inTutorial) {
      return;
    }
    if (this.containerModalRef !== null) {
      this.containerModalRef.hide();
    }

    // if we shouldn't be navigating the user to a new page, just return
    if (!this.contentShouldLinkToThread) {
      return true;
    }

    // don't navigate if the user is selecting text
    // from https://stackoverflow.com/questions/31982407/prevent-onclick-event-when-selecting-text
    const selection = window.getSelection();
    if (selection.toString().length !== 0) {
      return true;
    }

    // don't navigate if the user clicked a link
    if (event.target.tagName.toLowerCase() === "a") {
      return true;
    }

    const route = this.postContent.IsNFT ? this.globalVars.RouteNames.NFT : this.globalVars.RouteNames.POSTS;

    // identify ctrl+click (or) cmd+clik and opens feed in new tab
    if (event.ctrlKey) {
      const url = this.router.serializeUrl(
        this.router.createUrlTree(["/" + route, this.postContent.PostHashHex], {
          queryParamsHandling: "merge",
        })
      );
      window.open(url, "_blank");
      // don't navigate after new tab is opened
      return true;
    }

    this.router.navigate(["/" + route, this.postContent.PostHashHex], {
      queryParamsHandling: "merge",
    });
  }

  isRepost(post: any): boolean {
    return post.Body === "" && (!post.ImageURLs || post.ImageURLs?.length === 0) && post.RepostedPostEntryResponse;
  }

  isQuotedRepost(post: any): boolean {
    return (post.Body !== "" || post.ImageURLs?.length > 0) && post.RepostedPostEntryResponse;
  }

  isRegularPost(post: any): boolean {
    return !this.isRepost(post) && !this.isQuotedRepost(post);
  }

  openImgModal(event, imageURL) {
    event.stopPropagation();
    this.modalService.show(FeedPostImageModalComponent, {
      class: "modal-dialog-centered modal-lg",
      initialState: {
        imageURL,
      },
    });
  }

  openInteractionPage(event, pageName: string, component): void {
    event.stopPropagation();
    if (this.globalVars.isMobile()) {
      this.router.navigate(["/" + this.globalVars.RouteNames.POSTS, this.postContent.PostHashHex, pageName], {
        queryParamsHandling: "merge",
      });
    } else {
      this.modalService.show(component, {
        class: "modal-dialog-centered",
        initialState: { postHashHex: this.post.PostHashHex },
      });
    }
  }

  openDiamondsPage(event): void {
    if (this.postContent.DiamondCount) {
      this.openInteractionPage(event, this.globalVars.RouteNames.DIAMONDS, DiamondsModalComponent);
    }
  }

  openLikesPage(event): void {
    if (this.postContent.LikeCount) {
      this.openInteractionPage(event, this.globalVars.RouteNames.LIKES, LikesModalComponent);
    }
  }

  openRepostsPage(event): void {
    if (this.postContent.RecloutCount) {
      this.openInteractionPage(event, this.globalVars.RouteNames.REPOSTS, RepostsModalComponent);
    }
  }

  openQuoteRepostsModal(event): void {
    if (this.postContent.QuoteRepostCount) {
      this.openInteractionPage(event, this.globalVars.RouteNames.QUOTE_REPOSTS, QuoteRepostsModalComponent);
    }
  }

  getHotnessScore() {
    return Math.round(this.post.HotnessScore / 1e7) / 100;
  }

  hidePost() {
    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      title: "Hide post?",
      html: `This can’t be undone. The post will be removed from your profile, from search results, and from the feeds of anyone who follows you.`,
      showCancelButton: true,
      customClass: {
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
      reverseButtons: true,
    }).then((response: any) => {
      if (response.isConfirmed) {
        if (this.isOnThreadPage) {
          // On the thread page we keep the element in the dom, but re-render it
          // with the generic "Post removed by author" message.
          this.post.IsHidden = true;
        } else {
          // Hide the post in the UI immediately, even before the delete goes thru, to give
          // the user some indication that his delete is happening. This is a little janky.
          // For example, on the feed, the border around the post is applied by an outer element,
          // so the border will remain (and the UI will look a bit off) until the delete goes thru,
          // we emit the delete event, and the parent removes the outer element/border from the UI.
          this.hidingPost = true;
        }
        // Note: This is a rare instance where I needed to call detectChanges(). Angular wasn't
        // picking up the changes until I called this explicitly. IDK why.
        this.ref.detectChanges();
        this.backendApi
          .SubmitPost(
            this.globalVars.localNode,
            this.globalVars.loggedInUser.PublicKeyBase58Check,
            this._post.PostHashHex /*PostHashHexToModify*/,
            "" /*ParentPostHashHex*/,
            "" /*Title*/,
            { Body: this._post.Body, ImageURLs: this._post.ImageURLs, VideoURLs: this._post.VideoURLs } /*BodyObj*/,
            this._post.RepostedPostEntryResponse?.PostHashHex || "",
            {},
            "" /*Sub*/,
            true /*IsHidden*/,
            this.globalVars.feeRateDeSoPerKB * 1e9 /*feeRateNanosPerKB*/
          )
          .subscribe(
            (response) => {
              this.globalVars.logEvent("post : hide");
              this.postDeleted.emit(response.PostEntryResponse);
            },
            (err) => {
              console.error(err);
              const parsedError = this.backendApi.parsePostError(err);
              this.globalVars.logEvent("post : hide : error", { parsedError });
              this.globalVars._alertError(parsedError);
            }
          );
      }
    });
  }

  blockUser() {
    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      title: "Block user?",
      html: `This will hide all comments from this user on your posts as well as hide them from your view on your feed and other threads.`,
      showCancelButton: true,
      customClass: {
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
      reverseButtons: true,
    }).then((response: any) => {
      if (response.isConfirmed) {
        this.backendApi
          .BlockPublicKey(
            this.globalVars.localNode,
            this.globalVars.loggedInUser.PublicKeyBase58Check,
            this.post.PosterPublicKeyBase58Check
          )
          .subscribe(
            () => {
              this.globalVars.logEvent("user : block");
              this.globalVars.loggedInUser.BlockedPubKeys[this.post.PosterPublicKeyBase58Check] = {};
              this.userBlocked.emit(this.post.PosterPublicKeyBase58Check);
            },
            (err) => {
              console.error(err);
              const parsedError = this.backendApi.stringifyError(err);
              this.globalVars.logEvent("user : block : error", { parsedError });
              this.globalVars._alertError(parsedError);
            }
          );
      }
    });
  }

  _numToFourChars(numToConvert: number) {
    let abbrev = numToConvert.toFixed(2);
    const hasDecimal = abbrev.split(".").length == 2;
    if (hasDecimal) {
      // If it has a decimal and is <1000, there are three cases to consider.
      if (abbrev.length <= 4) {
        return abbrev;
      }
      if (abbrev.length == 5) {
        return numToConvert.toFixed(1);
      }
      if (abbrev.length == 6) {
        return numToConvert.toFixed();
      }
    }

    // If we get here, the number should not show a decimal in the UI.
    abbrev = numToConvert.toFixed();
    if (abbrev.length <= 3) {
      return abbrev;
    }

    abbrev = (numToConvert / 1e3).toFixed() + "K";
    if (abbrev.length <= 4) {
      return abbrev;
    }

    abbrev = (numToConvert / 1e6).toFixed() + "M";
    if (abbrev.length <= 4) {
      return abbrev;
    }

    abbrev = (numToConvert / 1e9).toFixed() + "B";
    if (abbrev.length <= 4) {
      return abbrev;
    }
  }

  _addPostToGlobalFeed(event: any) {
    // Prevent the post from navigating.
    event.stopPropagation();

    this.addingPostToGlobalFeed = true;
    const postHashHex = this.post.PostHashHex;
    const inGlobalFeed = this.post.InGlobalFeed;
    this.backendApi
      .AdminUpdateGlobalFeed(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        postHashHex,
        inGlobalFeed /*RemoveFromGlobalFeed*/
      )
      .subscribe(
        (res) => {
          this.post.InGlobalFeed = !this.post.InGlobalFeed;
          this.post.InHotFeed = !this.post.InHotFeed;
          this.globalVars.logEvent("admin: add-post-to-global-feed", {
            postHashHex,
            userPublicKeyBase58Check: this.globalVars.loggedInUser?.PublicKeyBase58Check,
            username: this.globalVars.loggedInUser?.ProfileEntryResponse?.Username,
          });
          this.ref.detectChanges();
        },
        (err) => {
          this.globalVars._alertError(JSON.stringify(err.error));
        }
      )
      .add(() => {
        this.addingPostToGlobalFeed = false;
        this.ref.detectChanges();
      });
  }

  _pinPostToGlobalFeed(event: any) {
    // Prevent the post from navigating.
    event.stopPropagation();

    this.pinningPost = true;
    const postHashHex = this._post.PostHashHex;
    const isPostPinned = this._post.IsPinned;
    this.backendApi
      .AdminPinPost(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        postHashHex,
        isPostPinned
      )
      .subscribe(
        (res) => {
          this._post.IsPinned = isPostPinned;
          this.globalVars.logEvent("admin: pin-post-to-global-feed", {
            postHashHex,
            userPublicKeyBase58Check: this.globalVars.loggedInUser?.PublicKeyBase58Check,
            username: this.globalVars.loggedInUser?.ProfileEntryResponse?.Username,
          });
          this.ref.detectChanges();
        },
        (err) => {
          this.globalVars._alertError(JSON.stringify(err.error));
        }
      )
      .add(() => {
        this.pinningPost = false;
        this.ref.detectChanges();
      });
  }

  setEmbedURLForPostContent(): void {
    EmbedUrlParserService.getEmbedURL(
      this.backendApi,
      this.globalVars,
      this.postContent.PostExtraData["EmbedVideoURL"]
    ).subscribe((res) => (this.constructedEmbedURL = res));
  }

  setURLForVideoContent(): void {
    if (this.postContent.VideoURLs && this.postContent.VideoURLs.length > 0) {
      const videoId = this.streamService.extractVideoID(this.postContent.VideoURLs[0]);
      if (videoId != "") {
        this.backendApi.GetVideoStatus(environment.uploadVideoHostname, videoId).subscribe((res) => {
          if (res?.Duration && _.isNumber(res?.Duration)) {
            this.videoURL =
              res?.Duration > FeedPostComponent.AUTOPLAY_LOOP_SEC_THRESHOLD
                ? this.postContent.VideoURLs[0]
                : this.postContent.VideoURLs[0] + "?autoplay=true&muted=true&loop=true&controls=false";
            if (res?.Dimensions && res?.Dimensions?.height && res?.Dimensions?.width) {
              this.sourceVideoAspectRatio = res.Dimensions.width / res.Dimensions.height;
            }
            this.showVideoControls = res?.Duration > FeedPostComponent.AUTOPLAY_LOOP_SEC_THRESHOLD;
            this.ref.detectChanges();
            this.initializeStream();
            this.setVideoControllerHeight(20);
          }
        });
      }
    }
  }

  // Create a player object for the video.
  initializeStream() {
    this.streamPlayer = Stream(this.videoIFrame.nativeElement);
  }

  // Check to see if video is loaded. If it is, set the video container height to the same size as the video;
  setVideoControllerHeight(retries: number) {
    const videoPlayerHeight = this.videoContainerDiv?.nativeElement?.offsetHeight;
    const videoPlayerWidth = this.videoContainerDiv?.nativeElement?.offsetWidth;
    if (videoPlayerHeight > 0) {
      // If the source video has a narrower aspect ratio than our default player, adjust the player width to snugly fit the content
      if (videoPlayerWidth / videoPlayerHeight > this.sourceVideoAspectRatio) {
        const videoContainerHeightPerc = (videoPlayerWidth / videoPlayerHeight) / this.sourceVideoAspectRatio;
        this.videoContainerHeight = (videoContainerHeightPerc * videoPlayerHeight).toFixed(2) + "px";
        this.videoOverlayContainerHeight = this.videoContainerHeight;
      } else {
        // Set height of overlay
        this.videoOverlayContainerHeight = `${videoPlayerHeight}px`;
      }

      // If autoplay doesn't immediately occur, add controls to the video
      // (This happens in Safari on iOS during low-power mode)

      this.streamPlayer.addEventListener("canplay", () => {
        this.streamPlayer.addEventListener("play", () => {
          if (!this.videoAutoPlaying) {
            this.videoAutoPlaying = true;
          }
        });
        setTimeout(() => {
          // If after a delay the video hasn't started autoplaying, we can assume that the browser is blocking autoplay.
          // In this instance, we should show video controls to the user.
          if (!this.videoAutoPlaying) {
            this.streamPlayer.controls = true;
            this.videoAutoPlaying = true;
            this.showVideoControls = true;
            this.ref.detectChanges();
          }
        }, 300);
      });

      this.ref.detectChanges();
    } else if (videoPlayerHeight === 0 && retries > 0) {
      setTimeout(() => {
        this.setVideoControllerHeight(retries - 1);
      }, 100);
    }
  }

  addVideoControls(event): void {
    event.stopPropagation();
    if (this.videoURL) {
      this.videoURL = this.postContent.VideoURLs[0] + "?autoplay=true&muted=true&loop=true&controls=true";
      this.showVideoControls = true;
      this.ref.detectChanges();
    }
  }

  emitPause(isPaused: boolean) {
    if (isPaused) {
      this.pauseVideo();
    } else {
      this.resumeVideo();
    }
    this.pauseAllVideos.emit(isPaused);
  }

  resumeVideo(): void {
    if (
      this.postContent.VideoURLs &&
      this.postContent.VideoURLs.length > 0 &&
      this.videoTemporarilyPaused &&
      this.streamPlayer
    ) {
      this.streamPlayer.play();
    }
  }

  pauseVideo(): void {
    if (this.postContent.VideoURLs && this.postContent.VideoURLs.length > 0 && this.streamPlayer) {
      this.videoTemporarilyPaused = !this.showVideoControls;
      this.streamPlayer.pause();
    }
  }

  getEmbedHeight(): number {
    return EmbedUrlParserService.getEmbedHeight(this.postContent.PostExtraData["EmbedVideoURL"]);
  }

  getEmbedWidth(): string {
    return EmbedUrlParserService.getEmbedWidth(this.postContent.PostExtraData["EmbedVideoURL"]);
  }

  // Vimeo iframes have a lot of spacing on top and bottom on mobile.
  setNegativeMargins(link: string, globalVars: GlobalVarsService) {
    return globalVars.isMobile() && EmbedUrlParserService.isVimeoLink(link);
  }

  mapImageURLs(imgURL: string): string {
    if (imgURL.startsWith("https://i.imgur.com")) {
      return imgURL.replace("https://i.imgur.com", "https://images.bitclout.com/i.imgur.com");
    }
    return imgURL;
  }

  acceptTransfer(event) {
    event.stopPropagation();
    const transferNFTEntryResponses = _.filter(this.nftEntryResponses, (nftEntryResponse: NFTEntryResponse) => {
      return (
        nftEntryResponse.OwnerPublicKeyBase58Check === this.globalVars.loggedInUser.PublicKeyBase58Check &&
        nftEntryResponse.IsPending
      );
    });
    if (!this.globalVars.isMobile()) {
      this.modalService.show(TransferNftAcceptModalComponent, {
        class: "modal-dialog-centered modal-lg",
        initialState: {
          post: this.postContent,
          transferNFTEntryResponses,
        },
      });
    } else {
      this.router.navigate(["/" + RouteNames.TRANSFER_NFT_ACCEPT + "/" + this.postContent.PostHashHex], {
        queryParamsHandling: "merge",
        state: {
          post: this.postContent,
          postHashHex: this.postContent.PostHashHex,
          transferNFTEntryResponses,
        },
      });
    }
  }

  openPlaceBidModal(event: any) {
    if (!this.globalVars.loggedInUser?.ProfileEntryResponse) {
      if (_.isNil(this.globalVars.loggedInUser)) {
        this.backendApi.SetStorage(
          "signUpRedirect",
          `/${this.globalVars.RouteNames.NFT}/${this.postContent.PostHashHex}`
        );
      }
      SharedDialogs.showCreateProfileToPerformActionDialog(this.router, "buy this NFT", this.globalVars);
      return;
    }
    event.stopPropagation();
    if (!this.globalVars.isMobile()) {
      const modalDetails = this.modalService.show(PlaceBidModalComponent, {
        class: "modal-dialog-centered modal-lg",
        initialState: { post: this.postContent },
      });
      const onHideEvent = modalDetails.onHide;
      onHideEvent.subscribe((response) => {
        if (response === "bid placed") {
          this.getNFTEntries();
          this.nftBidPlaced.emit();
        } else if (response === "nft purchased") {
          this.showAfterPurchaseModal();
          this.getNFTEntries();
          this.nftBidPlaced.emit();
        }
        this.emitPause(false);
      });
    } else {
      this.router.navigate(["/" + RouteNames.BID_NFT + "/" + this.postContent.PostHashHex], {
        queryParamsHandling: "merge",
        state: {
          post: this.postContent,
          postHashHex: this.postContent.PostHashHex,
        },
      });
    }
    this.emitPause(true);
  }

  showUnlockableContent = false;
  tooltipDetectChanges() {
    setTimeout(() => {
      this.ref.detectChanges();
    }, 50);
  }

  showAfterPurchaseModal(): void {
    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      title: "NFT Purchased",
      html: "",
      showDenyButton: true,
      showConfirmButton: true,
      customClass: {
        confirmButton: "btn btn-light no",
        denyButton: "btn btn-light",
      },
      confirmButtonText: "See Your Gallery",
      denyButtonText: "Leave a Comment",
    }).then((res: any) => {
      if (res.isConfirmed) {
        this.router.navigate(
          ["/" + this.globalVars.RouteNames.USER_PREFIX + "/" + this.globalVars.loggedInUser.ProfileEntryResponse.Username],
          {
            queryParams: {
              nftTab: "my_gallery",
              tab: "nfts",
            },
            queryParamsHandling: "merge",
          }
        );
      } else if (res.isDenied) {
        this.childFeedPostIconRowComponent.openModal(null, false);
      }
    });
  }

  showUnlockableText() {
    const textKey = this.decryptableNFTEntryResponses?.length
      ? this.showUnlockableContent
        ? "feed_post.hide_unlockable"
        : "feed_post.show_unlockable"
      : "feed_post.unlockable_content";
    return this.translocoService.translate(textKey);
  }

  toggleShowUnlockableContent(): void {
    if (!this.decryptableNFTEntryResponses?.length) {
      return;
    }
    this.showUnlockableContent = !this.showUnlockableContent;
    this.ref.detectChanges();
  }
  showmOfNNFTTooltip = false;
  toggleShowMOfNNFTTooltip(): void {
    this.showmOfNNFTTooltip = !this.showmOfNNFTTooltip;
  }

  getRouterLink(val: any): any {
    return this.inTutorial ? [] : val;
  }
}
