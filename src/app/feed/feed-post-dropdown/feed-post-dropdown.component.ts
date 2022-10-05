import { PlatformLocation } from "@angular/common";
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import * as _ from "lodash";
import { BsDropdownDirective } from "ngx-bootstrap/dropdown";
import { BsModalService } from "ngx-bootstrap/modal";
import { ToastrService } from "ngx-toastr";
import RouteNamesService from "src/app/route-names.service";
import { environment } from "../../../environments/environment";
import { SwalHelper } from "../../../lib/helpers/swal-helper";
import { FollowService } from "../../../lib/services/follow/follow.service";
import { BackendApiService, NFTEntryResponse, PostEntryResponse } from "../../backend-api.service";
import { CreateNftAuctionModalComponent } from "../../create-nft-auction-modal/create-nft-auction-modal.component";
import { GlobalVarsService } from "../../global-vars.service";
import { NftBurnModalComponent } from "../../nft-burn/nft-burn-modal/nft-burn-modal.component";
import { TransferNftModalComponent } from "../../transfer-nft/transfer-nft-modal/transfer-nft-modal.component";
import { PostMultiplierComponent } from "./post-multiplier/post-multiplier.component";

const RouteNames = RouteNamesService;
@Component({
  selector: "feed-post-dropdown",
  templateUrl: "./feed-post-dropdown.component.html",
  styleUrls: ["./feed-post-dropdown.component.sass"],
})
export class FeedPostDropdownComponent implements OnInit {
  @Input() post: PostEntryResponse;
  @Input() postContent: PostEntryResponse;
  @Input() nftEntryResponses: NFTEntryResponse[];
  @Input() disableTooltip?: boolean;
  @Output() postHidden = new EventEmitter();
  @Output() userBlocked = new EventEmitter();
  @Output() toggleGlobalFeed = new EventEmitter();
  @Output() togglePostPin = new EventEmitter();
  @Output() toggleBlogPin = new EventEmitter();
  @Output() pauseVideos = new EventEmitter();

  @ViewChild(BsDropdownDirective) dropdown: BsDropdownDirective;

  showSharePost: boolean = false;
  showUnfollowUser: boolean = false;

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private modalService: BsModalService,
    private platformLocation: PlatformLocation,
    public ref: ChangeDetectorRef,
    private followService: FollowService,
    private toastr: ToastrService
  ) {
    if (!!navigator.share) {
      this.showSharePost = true;
    }
  }

  ngOnInit() {
    this.showUnfollowUser = this.followService._isLoggedInUserFollowing(
      this.postContent.ProfileEntryResponse.PublicKeyBase58Check
    );
  }

  reportPost(): void {
    this.globalVars.logEvent("post : report-content");
    window.open(
      `https://desoreporting.aidaform.com/content?ReporterPublicKey=${this.globalVars.loggedInUser?.PublicKeyBase58Check}&PostHash=${this.post.PostHashHex}&ReportedAccountPublicKey=${this.post?.PosterPublicKeyBase58Check}&ReportedAccountUsername=${this.post?.ProfileEntryResponse?.Username}`
    );
  }

  dropdownClicked(event) {
    this.ref.detectChanges();
    event.stopPropagation();
  }

  dropNFT() {
    // Get the latest drop so that we can update it.
    this.backendApi
      .AdminGetNFTDrop(this.globalVars.localNode, this.globalVars.loggedInUser.PublicKeyBase58Check, -1 /*DropNumber*/)
      .subscribe(
        (res: any) => {
          if (res.DropEntry.DropTstampNanos == 0) {
            this.globalVars._alertError("There are no drops. Make one in the admin NFT tab.");
            return;
          }

          let currentTime = new Date();
          if (res.DropEntry.DropTstampNanos / 1e6 < currentTime.getTime()) {
            SwalHelper.fire({
              target: this.globalVars.getTargetComponentSelector(),
              html:
                `The latest drop has already dropped.  Add this NFT to the active drop? ` +
                `If you would like to make a new drop, make one in the NFT admin tab first.`,
              showCancelButton: true,
              showConfirmButton: true,
              focusConfirm: true,
              customClass: {
                confirmButton: "btn btn-light",
                cancelButton: "btn btn-light no",
              },
              confirmButtonText: "Yes",
              cancelButtonText: "No",
              reverseButtons: true,
            }).then(async (alertRes: any) => {
              if (alertRes.isConfirmed) {
                this.addNFTToLatestDrop(res.DropEntry, this.post.PostHashHex);
              }
            });
            return;
          }

          this.addNFTToLatestDrop(res.DropEntry, this.post.PostHashHex);
        },
        (error) => {
          this.globalVars._alertError(error.error.error);
        }
      );
  }

  addNFTToLatestDrop(latestDrop: any, postHash: string) {
    this.backendApi
      .AdminUpdateNFTDrop(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        latestDrop.DropNumber,
        latestDrop.DropTstampNanos,
        latestDrop.IsActive /*IsActive*/,
        postHash /*NFTHashHexToAdd*/,
        "" /*NFTHashHexToRemove*/
      )
      .subscribe(
        (res: any) => {
          this.globalVars._alertSuccess("Successfully added NFT to drop #" + latestDrop.DropNumber.toString());
        },
        (error) => {
          this.globalVars._alertError(error.error.error);
        }
      );
  }

  showBlockUserDropdownItem() {
    if (!this.globalVars.loggedInUser) {
      return false;
    }

    // User shouldn't be able to block themselves
    return (
      this.globalVars.loggedInUser?.PublicKeyBase58Check !== this.post.PosterPublicKeyBase58Check &&
      !this.globalVars.hasUserBlockedCreator(this.post.PosterPublicKeyBase58Check)
    );
  }

  showHidePostDropdownItem() {
    if (!this.globalVars.loggedInUser) {
      return false;
    }

    const loggedInUserPostedThis =
      this.globalVars.loggedInUser.PublicKeyBase58Check === this.post.PosterPublicKeyBase58Check;
    const loggedInUserIsParamUpdater =
      this.globalVars.paramUpdaters && this.globalVars.paramUpdaters[this.globalVars.loggedInUser.PublicKeyBase58Check];

    return loggedInUserPostedThis || loggedInUserIsParamUpdater;
  }

  globalFeedEligible(): boolean {
    return this.globalVars.showAdminTools();
  }

  showAddToGlobalFeedDropdownItem(): boolean {
    return this.globalFeedEligible() && !this.post.InGlobalFeed;
  }

  showRemoveFromGlobalFeedDropdownItem(): boolean {
    return this.globalFeedEligible() && this.post.InGlobalFeed;
  }

  showPinPostToGlobalFeedDropdownItem(): boolean {
    return this.globalFeedEligible() && !this.post.IsPinned;
  }

  showUnpinPostFromGlobalFeedDropdownItem(): boolean {
    return this.globalFeedEligible() && this.post.IsPinned;
  }

  showCreateNFTAuction(): boolean {
    return (
      this.post.IsNFT &&
      !!this.nftEntryResponses?.filter(
        (nftEntryResponse) =>
          !nftEntryResponse.IsForSale &&
          nftEntryResponse.OwnerPublicKeyBase58Check === this.globalVars.loggedInUser?.PublicKeyBase58Check
      )?.length
    );
  }

  showTransferNFT(): boolean {
    return (
      this.post.IsNFT &&
      !!this.nftEntryResponses?.filter(
        (nftEntryResponse) =>
          !nftEntryResponse.IsPending &&
          !nftEntryResponse.IsForSale &&
          nftEntryResponse.OwnerPublicKeyBase58Check === this.globalVars.loggedInUser?.PublicKeyBase58Check
      )?.length
    );
  }

  showBurnNFT(): boolean {
    return (
      this.post.IsNFT &&
      !!this.nftEntryResponses?.filter(
        (nftEntryResponse) =>
          !nftEntryResponse.IsForSale &&
          nftEntryResponse.OwnerPublicKeyBase58Check === this.globalVars.loggedInUser?.PublicKeyBase58Check
      )?.length
    );
  }

  showMakeNFTProfilePic(): boolean {
    return (
      this.post.IsNFT &&
      this.post?.ImageURLs &&
      this.post.ImageURLs.length > 0 &&
      this.post.ImageURLs[0] !== "" &&
      !!this.nftEntryResponses?.filter(
        (nftEntryResponse) =>
          !nftEntryResponse.IsForSale &&
          nftEntryResponse.OwnerPublicKeyBase58Check === this.globalVars.loggedInUser?.PublicKeyBase58Check
      )?.length
    );
  }

  hidePost() {
    this.postHidden.emit();
  }

  blockUser() {
    this.userBlocked.emit();
  }

  unfollowUser(event) {
    event.stopPropagation();
    this.followService._toggleFollow(false, this.post.PosterPublicKeyBase58Check);
  }

  addMultiplier() {
    this.modalService.show(PostMultiplierComponent, {
      class: "modal-dialog-centered buy-deso-modal",
      initialState: { post: this.post },
    });
  }

  _addPostToGlobalFeed(event: any) {
    this.toggleGlobalFeed.emit(event);
  }

  _pinPostToGlobalFeed(event: any) {
    this.togglePostPin.emit(event);
    this.post.IsPinned = !this.post.IsPinned;
    this.dropdown.hide();
  }

  canPinPost() {
    return (
      this.post.PosterPublicKeyBase58Check === this.globalVars.loggedInUser?.PublicKeyBase58Check &&
      this.post?.PostExtraData?.BlogDeltaRtfFormat !== "" &&
      (!this.post?.PostExtraData?.BlogPostIsPinned || this.post?.PostExtraData?.BlogPostIsPinned === "false")
    );
  }

  canUnpinPost() {
    return (
      this.post.PosterPublicKeyBase58Check === this.globalVars.loggedInUser?.PublicKeyBase58Check &&
      this.post?.PostExtraData?.BlogPostIsPinned === "true"
    );
  }

  pinBlogPostToProfile(event: any, isPinned: boolean) {
    event.stopPropagation();
    const postExtraData = this.post.PostExtraData;
    postExtraData["BlogPostIsPinned"] = isPinned.toString();

    this.backendApi
      .SubmitPost(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        this.post.PostHashHex /*PostHashHexToModify*/,
        "" /*ParentPostHashHex*/,
        "" /*Title*/,
        {
          Body: this.post.Body,
          ImageURLs: this.post.ImageURLs ? this.post.ImageURLs : [],
        } /*BodyObj*/,
        "" /*RepostedPostHashHex*/,
        postExtraData /*PostExtraData*/,
        "" /*Sub*/,
        false /*IsHidden*/,
        this.globalVars.defaultFeeRateNanosPerKB /*MinFeeRateNanosPerKB*/,
        false
      )
      .toPromise()
      .then((res) => {
        this.globalVars._alertSuccess(`Successfully ${isPinned ? "pinned" : "unpinned"} post`);
        return this.globalVars.waitForTransaction(res.TxnHashHex);
      })
      .then(() => {
        if (isPinned) {
          this.updateBlogPostPinnedSuccess();
        } else {
          this.updateBlogPostUnpinnedSuccess();
        }
      });
  }

  updateBlogPostPinnedSuccess() {
    this.toggleBlogPin.emit({ postHashHex: this.post.PostHashHex, isPinned: true });
  }

  updateBlogPostUnpinnedSuccess() {
    this.toggleBlogPin.emit({ postHashHex: this.post.PostHashHex, isPinned: false });
  }

  hidePinnedPost(event) {
    event.stopPropagation();
    this.backendApi.SetStorage("dismissedPinnedPostHashHex", this.post.PostHashHex);
    this.globalVars.followFeedPosts.shift();
    this.globalVars.hotFeedPosts.shift();
  }

  copyPostLinkToClipboard(event) {
    this.globalVars.logEvent("post : share");

    // Prevent the post from navigating.
    event.stopPropagation();

    this.globalVars._copyText(this._getPostUrl());

    this.dropdown.hide();
  }

  sharePostUrl(event): void {
    this.globalVars.logEvent("post : webapishare");

    // Prevent the post from navigating.
    event.stopPropagation();

    try {
      navigator.share({ url: this._getPostUrl() });
    } catch (err) {
      console.error("Share failed:", err.message);
    }
  }

  _getPostUrl() {
    const pathArray = this.postContent.PostExtraData?.BlogDeltaRtfFormat
      ? [
          "/" +
            this.globalVars.RouteNames.USER_PREFIX +
            "/" +
            this.postContent.ProfileEntryResponse.Username +
            "/" +
            this.globalVars.RouteNames.BLOG +
            "/" +
            this.postContent.PostExtraData.BlogTitleSlug,
        ]
      : [
          "/" + (this.postContent.IsNFT ? this.globalVars.RouteNames.NFT : this.globalVars.RouteNames.POSTS),
          this.postContent.PostHashHex,
        ];
    // need to preserve the curent query params for our dev env to work
    const currentQueryParams = this.activatedRoute.snapshot.queryParams;

    const path = this.router.createUrlTree(pathArray, { queryParams: currentQueryParams }).toString();
    const origin = (this.platformLocation as any).location.origin;

    return origin + path;
  }

  openMintNftPage(event, component): void {
    event.stopPropagation();
    this.router.navigate(["/" + RouteNames.MINT_NFT + "/" + this.postContent.PostHashHex], {
      queryParamsHandling: "merge",
    });
  }

  openCreateNFTAuctionModal(event): void {
    const modalDetails = this.modalService.show(CreateNftAuctionModalComponent, {
      class: "modal-dialog-centered",
      initialState: { post: this.post, nftEntryResponses: this.nftEntryResponses },
    });
    this.pauseVideos.emit(true);
    const onHideEvent = modalDetails.onHide;
    onHideEvent.subscribe((response) => {
      this.pauseVideos.emit(false);
    });
  }

  makeNFTProfilePic(event): void {
    this.backendApi
      .UpdateProfile(
        environment.verificationEndpointHostname,
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        "",
        "",
        "",
        "",
        this.globalVars.loggedInUser.ProfileEntryResponse.CoinEntry.CreatorBasisPoints,
        1.25 * 100 * 100,
        false,
        this.globalVars.feeRateDeSoPerKB * 1e9 /*MinFeeRateNanosPerKB*/,
        {
          NFTProfilePicturePostHashHex: this.post.PostHashHex,
          NFTProfilePictureUrl: this.post.ImageURLs[0],
        }
      )
      .subscribe(() => {
        this.toastr.show("Your profile picture was updated", null, {
          toastClass: "info-toast",
          positionClass: "toast-bottom-center",
        });
      });
  }

  openTransferNFTModal(event): void {
    if (!this.globalVars.isMobile()) {
      this.pauseVideos.emit(true);
      const modalDetails = this.modalService.show(TransferNftModalComponent, {
        class: "modal-dialog-centered modal-lg",
        initialState: { post: this.post, postHashHex: this.post.PostHashHex },
      });
      const onHideEvent = modalDetails.onHide;
      onHideEvent.subscribe((response) => {
        if (response === "nft transferred") {
          // emit something to feed-post component to refresh.
        }
        this.pauseVideos.emit(false);
      });
    } else {
      this.router.navigate(["/" + RouteNames.TRANSFER_NFT + "/" + this.postContent.PostHashHex], {
        queryParamsHandling: "merge",
        state: {
          post: this.postContent,
          postHashHex: this.postContent.PostHashHex,
        },
      });
    }
  }

  openBurnNFTModal(event): void {
    this.pauseVideos.emit(true);
    const burnNFTEntryResponses = _.filter(this.nftEntryResponses, (nftEntryResponse: NFTEntryResponse) => {
      return (
        !nftEntryResponse.IsForSale &&
        nftEntryResponse.OwnerPublicKeyBase58Check === this.globalVars.loggedInUser?.PublicKeyBase58Check
      );
    });
    if (!this.globalVars.isMobile()) {
      const modalDetails = this.modalService.show(NftBurnModalComponent, {
        class: "modal-dialog-centered modal-lg",
        initialState: { post: this.post, postHashHex: this.post.PostHashHex, burnNFTEntryResponses },
      });
      const onHideEvent = modalDetails.onHide;
      onHideEvent.subscribe((response) => {
        this.pauseVideos.emit(false);
        if (response === "nft burned") {
          // emit something to feed-post component to refresh.
        }
      });
    } else {
      this.router.navigate(["/" + RouteNames.BURN_NFT + "/" + this.postContent.PostHashHex], {
        queryParamsHandling: "merge",
        state: {
          post: this.postContent,
          postHashHex: this.postContent.PostHashHex,
          burnNFTEntryResponses,
        },
      });
    }
  }
}
