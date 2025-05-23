import { HttpClient } from "@angular/common/http";
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { Router } from "@angular/router";
import { TranslocoService } from "@ngneat/transloco";
import Autolinker from "autolinker";
import * as _ from "lodash";
import { filter } from "lodash";
import { BsModalService } from "ngx-bootstrap/modal";
import { ToastrService } from "ngx-toastr";
import { forkJoin, of } from "rxjs";
import { finalize } from "rxjs/operators";
import { TrackingService } from "src/app/tracking.service";
import { WelcomeModalComponent } from "src/app/welcome-modal/welcome-modal.component";
import { SwalHelper } from "../../../lib/helpers/swal-helper";
import { EmbedUrlParserService } from "../../../lib/services/embed-url-parser-service/embed-url-parser-service";
import { FollowService } from "../../../lib/services/follow/follow.service";
import { SharedDialogs } from "../../../lib/shared-dialogs";
import { AppRoutingModule, RouteNames } from "../../app-routing.module";
import { AssociationReactionValue, AssociationType, BackendApiService } from "../../backend-api.service";
import { GlobalVarsService } from "../../global-vars.service";
import { PlaceBidModalComponent } from "../../place-bid/place-bid-modal/place-bid-modal.component";
import { TradeCreatorModalComponent } from "../../trade-creator-page/trade-creator-modal/trade-creator-modal.component";
import { TransferNftAcceptModalComponent } from "../../transfer-nft-accept/transfer-nft-accept-modal/transfer-nft-accept-modal.component";
import { FeedPostIconRowComponent } from "../feed-post-icon-row/feed-post-icon-row.component";
import { FeedPostImageModalComponent } from "../feed-post-image-modal/feed-post-image-modal.component";
import { NFTEntryResponse, PostAssociationResponse, PostEntryResponse, AssociationCountsResponse } from "deso-protocol";

/**
 * NOTE: This was previously handled by updating the node list in the core repo,
 * but that approach was deprecated and there is not currently an interim
 * solution. This is a temporary solution for the setu team and should not be
 * used by other teams.  Once a new solution is available we should remove this
 * and migrate to whatever that ends up being.
 * @deprecated
 */
const DEPRECATED_CUSTOM_ATTRIBUTIONS = {
  setu_deso: {
    text: "Setu Deso",
    link: "https://web3setu.com",
  },
};

export interface DecryptedNFTEntryResponse extends NFTEntryResponse {
  DecryptedUnlockableText?: string;
}

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

    if (post.IsNFT && post.ProfileEntryResponse?.Username) {
      this.frozenNFTTooltip = `This NFT is permanently frozen by @${post.ProfileEntryResponse.Username} on the DeSo blockchain`;
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
    public ref: ChangeDetectorRef,
    private router: Router,
    private modalService: BsModalService,
    private sanitizer: DomSanitizer,
    private toastr: ToastrService,
    private followService: FollowService,
    private translocoService: TranslocoService,
    private http: HttpClient,
    public tracking: TrackingService
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

  @Input() keepVideoPaused = false;

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

  @Output() toggleBlogPin = new EventEmitter();

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
  decryptableNFTEntryResponses: DecryptedNFTEntryResponse[];
  isFollowing: boolean;
  showReadMoreRollup = false;
  showRestOfPost = false;
  videoURL: string;
  livepeerVideo: boolean = false;
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
  imageLoaded: boolean = false;
  embedLoaded: boolean = false;
  postReactionCounts: AssociationCountsResponse = {
    Counts: {},
    Total: 0,
  };
  myReactions: Array<PostAssociationResponse> = [];
  reactionsLoaded: boolean = false;
  pollPost: boolean = false;

  unlockableTooltip =
    "This NFT will come with content that's encrypted and only unlockable by the winning bidder. Note that if an NFT is being resold, it is not guaranteed that the new unlockable will be the same original unlockable.";
  mOfNNFTTooltip =
    "Each NFT can have multiple editions, each of which has its own unique serial number. This shows how many editions are currently on sale and how many there are in total. Generally, editions with lower serial numbers are more valuable.";

  frozenNFTTooltip = `This NFT is permanently frozen on the DeSo blockchain`;

  attribution: { link: string; text: string };

  linkPreviewUrl: string = "";

  getNFTEntries() {
    this.backendApi
      .GetNFTEntriesForNFTPost(this.globalVars.loggedInUser?.PublicKeyBase58Check, this.postContent.PostHashHex)
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

  // Detects whether this post was created on another social media site.
  // If so, don't display any tags/hashtags, etc.
  postFromOtherSocialMedia(): boolean {
    let postBody = this.postContent.Body;
    const lines = postBody.split("\n");
    const attributionSearchText = "Posted via @setu_deso";
    return lines[lines.length - 1].startsWith(attributionSearchText);
  }

  postContentBodyFn() {
    let postBody = this.postContent.Body;

    // The ideal way to add attribution for a post is to have the node specified in the get-app-state nodes
    // list, and reference the node by its display name in the Node field of PostExtraData
    if (
      typeof this.postContent.PostExtraData?.Node !== "undefined" &&
      this.globalVars.nodes[this.postContent.PostExtraData?.Node]
    ) {
      const node = this.globalVars.nodes[this.postContent.PostExtraData?.Node];
      this.attribution = {
        text: node.Name,
        link: node.URL,
      };
    }

    const lines = postBody.split("\n");
    const attributionSearchText = "Posted via @";
    if (lines[lines.length - 1].startsWith(attributionSearchText)) {
      // remove attribution text from the end of the post body, if it exists.
      postBody = lines.slice(0, lines.length - 2).join("\n");

      // In the case where we have an attribution added to the end of a post, and we did not find
      // a node in the recognized nodes list, we fallback to using the @mention text and linking it
      // to the corresponding profile page.
      const attributionText = lines[lines.length - 1].slice(attributionSearchText.length);
      if (!this.attribution) {
        this.attribution = DEPRECATED_CUSTOM_ATTRIBUTIONS[attributionText] ?? {
          link: `/u/${attributionText}`,
          text: attributionText,
        };
      }
    }

    if (!this.showRestOfPost && this.hasReadMoreRollup && postBody.length > GlobalVarsService.MAX_POST_LENGTH) {
      // NOTE: We first spread the string into an array since this will account
      // for unicode multi-codepoint characters like emojis. Just using
      // substring will potentially break a string in the middle of a
      // "surrogate-pair" and render something unexpected in its place. This is
      // still a relatively naive approach, but it should do the right thing in
      // almost all cases.
      // https://dmitripavlutin.com/what-every-javascript-developer-should-know-about-unicode/#length-and-surrogate-pairs
      const chars = [...postBody].slice(0, GlobalVarsService.MAX_POST_LENGTH);
      this.showReadMoreRollup = true;
      return `${chars.join("")}...`;
    } else {
      return postBody;
    }
  }

  toggleShowRestOfPost(event) {
    event.stopPropagation();
    this.showRestOfPost = true;
    this.ref.detectChanges();
  }

  ngOnInit() {
    if (!this.post.RepostCount) {
      this.post.RepostCount = 0;
    }
    this.setEmbedURLForPostContent();
    this.setURLForVideoContent();
    this.extractURLsFromPost();

    this.pollPost = !!this.postContent.PostExtraData.PollOptions;

    if (this.showNFTDetails && this.postContent.IsNFT && !this.nftEntryResponses?.length) {
      this.getNFTEntries();
    }
    this.isFollowing = this.followService._isLoggedInUserFollowing(
      this.postContent.ProfileEntryResponse?.PublicKeyBase58Check
    );

    this.getUserReactions();
  }

  extractURLsFromPost() {
    const urls = Autolinker.parse(this.postContent.Body, {});
    if (urls.length > 0) {
      let url = urls[0].getMatchedText();
      if (!url.startsWith("http")) {
        url = "https://" + url;
      }
      this.linkPreviewUrl = url;
    }
  }

  showLinkPreview() {
    return (
      this.linkPreviewUrl &&
      this.linkPreviewUrl !== "" &&
      (!this.postContent?.ImageURLs || this.postContent?.ImageURLs?.length === 0) &&
      (!this.postContent?.VideoURLs || this.postContent?.VideoURLs?.length === 0) &&
      (!this.postContent.PostExtraData?.EmbedVideoURL || this.postContent.PostExtraData["EmbedVideoURL"] === "") &&
      // Exclude quote reposts
      !(this.post?.RepostedPostEntryResponse && this.post.Body !== "") &&
      // Exclude reposts of quote reposts
      !(this.post?.RepostedPostEntryResponse && this.post?.RepostedPostEntryResponse?.RepostedPostEntryResponse)
    );
  }

  imageLoadedEvent() {
    this.imageLoaded = true;
    this.ref.detectChanges();
  }

  embedLoadedEvent() {
    this.embedLoaded = true;
    this.ref.detectChanges();
  }

  openBuyCreatorCoinModal(event, username: string) {
    event.stopPropagation();

    if (!this.globalVars.loggedInUser) {
      this.modalService.show(WelcomeModalComponent, { initialState: { triggerAction: "buy-cc" } });
      return;
    }

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

    this.tracking.log("post : click", {
      isAuthorVerified: this.postContent.ProfileEntryResponse?.IsVerified,
      authorUsername: this.postContent.ProfileEntryResponse?.Username,
      authorPublicKey: this.postContent.ProfileEntryResponse?.PublicKeyBase58Check || this.postContent.PosterPublicKeyBase58Check,
      isReply: !!this.parentPost,
      postHashHex: this.postContent.PostHashHex,
    });

    let postRouteTree = [
      "/" + (this.postContent.IsNFT ? this.globalVars.RouteNames.NFT : this.globalVars.RouteNames.POSTS),
      this.postContent.PostHashHex,
    ];

    if (this.postContent.PostExtraData?.BlogDeltaRtfFormat) {
      postRouteTree = [
        "/" + this.globalVars.RouteNames.USER_PREFIX,
        this.postContent.ProfileEntryResponse.Username,
        this.globalVars.RouteNames.BLOG,
        this.postContent.PostExtraData.BlogTitleSlug,
      ];
    }

    // identify ctrl+click (or) cmd+clik and opens feed in new tab
    if (event.ctrlKey) {
      const url = this.router.serializeUrl(
        this.router.createUrlTree(postRouteTree, {
          queryParamsHandling: "merge",
        })
      );
      window.open(url, "_blank");
      // don't navigate after new tab is opened
      return true;
    }

    this.router.navigate(postRouteTree, {
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
            this.globalVars.loggedInUser?.PublicKeyBase58Check,
            this._post.PostHashHex /*PostHashHexToModify*/,
            "" /*ParentPostHashHex*/,
            { Body: this._post.Body, ImageURLs: this._post.ImageURLs, VideoURLs: this._post.VideoURLs } /*BodyObj*/,
            this._post.RepostedPostEntryResponse?.PostHashHex || "",
            {},
            true /*IsHidden*/
          )
          .subscribe(
            (response) => {
              this.tracking.log("post : hide");
              this.postDeleted.emit(response.PostEntryResponse);
            },
            (e) => {
              console.error(e);
              const parsedError = this.backendApi.parseErrorMessage(e);
              this.tracking.log("post : hide", { error: parsedError });
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
          .BlockPublicKey(this.globalVars.loggedInUser?.PublicKeyBase58Check, this.post.PosterPublicKeyBase58Check)
          .subscribe(
            () => {
              this.tracking.log("profile : block", {
                username: this.post.ProfileEntryResponse?.Username,
                publicKey: this.post.PosterPublicKeyBase58Check,
                isVerified: this.post.ProfileEntryResponse?.IsVerified,
              });
              this.globalVars.loggedInUser.BlockedPubKeys[this.post.PosterPublicKeyBase58Check] = {};
              this.userBlocked.emit(this.post.PosterPublicKeyBase58Check);
            },
            (err) => {
              console.error(err);
              const parsedError = this.backendApi.stringifyError(err);
              this.tracking.log("profile : block", { error: parsedError });
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

  toggleBlogPinnedStatus(pinnedPostHashHex) {
    this.toggleBlogPin.emit(pinnedPostHashHex);
  }

  _addPostToGlobalFeed(event: any) {
    // Prevent the post from navigating.
    event.stopPropagation();

    this.addingPostToGlobalFeed = true;
    const postHashHex = this.post.PostHashHex;
    const inGlobalFeed = this.post.InGlobalFeed;
    this.backendApi
      .AdminUpdateGlobalFeed(postHashHex, inGlobalFeed /*RemoveFromGlobalFeed*/)
      .subscribe(
        (res) => {
          this.post.InGlobalFeed = !this.post.InGlobalFeed;
          this.post.InHotFeed = !this.post.InHotFeed;
          this.tracking.log("admin: add-post-to-global-feed", {
            postHashHex,
            userPublicKeyBase58Check: this.globalVars.loggedInUser?.PublicKeyBase58Check,
            username: this.globalVars.loggedInUser?.ProfileEntryResponse?.Username,
          });
          this.ref.detectChanges();
        },
        (e) => {
          console.error(e);
          this.globalVars._alertError(e);
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
      .AdminPinPost(postHashHex, isPostPinned)
      .subscribe(
        (res) => {
          this._post.IsPinned = isPostPinned;
          this.tracking.log("admin: pin-post-to-global-feed", {
            postHashHex,
            userPublicKeyBase58Check: this.globalVars.loggedInUser?.PublicKeyBase58Check,
            username: this.globalVars.loggedInUser?.ProfileEntryResponse?.Username,
          });
          this.ref.detectChanges();
        },
        (e) => {
          console.error(e);
          this.globalVars._alertError(e);
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

  isCloudflareVideo(videoUrl: String): boolean {
    return videoUrl.split("/").length > 2 && videoUrl.split("/")[2] === "iframe.videodelivery.net";
  }

  // Check if it's a mypinata video. Used by NFTz
  isPinataVideo(videoUrl: String): boolean {
    return videoUrl.indexOf(".mypinata.cloud/ipfs/") > -1;
  }

  getCloudflareVideoId(videoUrl: String): String {
    const cloudflareVideoId = videoUrl.split("/").pop();
    return cloudflareVideoId;
  }

  setURLForVideoContent(): void {
    if (this.postContent.VideoURLs && this.postContent.VideoURLs.length > 0) {
      if (this.isCloudflareVideo(this.postContent.VideoURLs[0])) {
        const cloudflareVideoId = this.getCloudflareVideoId(this.postContent.VideoURLs[0]);
        this.videoURL = `https://videos.deso.org/${cloudflareVideoId}.mp4`;
        return;
      }
      if (this.isPinataVideo(this.postContent.VideoURLs[0])) {
        this.videoURL = this.postContent.VideoURLs[0];
        return;
      }
      this.livepeerVideo = true;
      this.videoURL = this.postContent.VideoURLs[0] + "&autoPlay=false";
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
        const videoContainerHeightPerc = videoPlayerWidth / videoPlayerHeight / this.sourceVideoAspectRatio;
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
        nftEntryResponse.OwnerPublicKeyBase58Check === this.globalVars.loggedInUser?.PublicKeyBase58Check &&
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
    event.stopPropagation();
    this.tracking.log("nft-buy-button : click");
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
          [
            "/" +
              this.globalVars.RouteNames.USER_PREFIX +
              "/" +
              this.globalVars.loggedInUser.ProfileEntryResponse.Username,
          ],
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

  getUserReactions() {
    this.reactionsLoaded = false;

    return forkJoin([this.getPostReactionCounts(), this.getMyReactions()])
      .pipe(
        finalize(() => {
          this.reactionsLoaded = true;
          this.ref.detectChanges();
        })
      )
      .subscribe(([counts, reactions]) => {
        this.postReactionCounts = counts;
        this.myReactions = reactions.Associations;
      });
  }

  private getPostReactionCounts() {
    return this.backendApi.GetPostAssociationsCounts(
      this.postContent,
      AssociationType.reaction,
      Object.values(AssociationReactionValue)
    );
  }

  private getMyReactions() {
    const key = this.globalVars.loggedInUser?.PublicKeyBase58Check;

    if (!key) {
      // Skip requesting my reactions if user is not logged in
      return of({ Associations: [] });
    }

    return this.backendApi.GetPostAssociations(
      this.postContent.PostHashHex,
      AssociationType.reaction,
      this.globalVars.loggedInUser?.PublicKeyBase58Check,
      Object.values(AssociationReactionValue)
    );
  }

  updateReactionCounts(counts: AssociationCountsResponse) {
    this.postReactionCounts = counts;
    this.ref.detectChanges();
  }

  updateMyReactions(reactions: Array<PostAssociationResponse>) {
    this.myReactions = reactions;
    this.ref.detectChanges();
  }
}
