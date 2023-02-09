import { KeyValue, PlatformLocation } from "@angular/common";
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { TranslocoService } from "@ngneat/transloco";
import { debounce, includes, isNil, round, set } from "lodash";
import { BsModalService } from "ngx-bootstrap/modal";
import { PopoverDirective } from "ngx-bootstrap/popover";
import { TrackingService } from "src/app/tracking.service";
import { WelcomeModalComponent } from "src/app/welcome-modal/welcome-modal.component";
import { SwalHelper } from "../../../lib/helpers/swal-helper";
import { SharedDialogs } from "../../../lib/shared-dialogs";
import {
  AssociationReactionValue,
  AssociationType,
  BackendApiService,
  PostAssociation,
  PostAssociationCountsResponse,
  PostEntryResponse,
} from "../../backend-api.service";
import { CommentModalComponent } from "../../comment-modal/comment-modal.component";
import { ConfettiSvg, GlobalVarsService } from "../../global-vars.service";
import { ReactionsModalComponent } from "../../reactions-details/reactions-modal/reactions-modal.component";
import { finalize } from "rxjs/operators";

@Component({
  selector: "feed-post-icon-row",
  templateUrl: "./feed-post-icon-row.component.html",
  styleUrls: ["./feed-post-icon-row.component.scss"],
})
export class FeedPostIconRowComponent {
  @ViewChild("diamondPopover", { static: false }) diamondPopover: PopoverDirective;

  @Input() post: PostEntryResponse;
  @Input() postContent: PostEntryResponse;
  @Input() parentPost: PostEntryResponse;
  @Input() afterCommentCreatedCallback: any = null;
  @Input() afterRepostCreatedCallback: any = null;
  @Input() hideNumbers: boolean = false;
  // Will need additional inputs if we walk through actions other than diamonds.
  @Input() inTutorial: boolean = false;
  @Input() postReactionCounts: PostAssociationCountsResponse;
  @Input() myReactions: Array<PostAssociation> = [];
  @Input() hideSummary: boolean = false;

  @Output() diamondSent = new EventEmitter();
  @Output() userReacted = new EventEmitter();
  @Output() updateReactionCounts = new EventEmitter<PostAssociationCountsResponse>();
  @Output() updateMyReactions = new EventEmitter<Array<PostAssociation>>();

  sendingRepostRequest = false;

  // Threshold above which user must confirm before sending diamonds
  static DiamondWarningThreshold = 4;

  diamondCount = GlobalVarsService.MAX_DIAMONDS_GIVABLE;
  // Indexes from 0 to diamondCount (used by *ngFor)
  diamondIndexes = Array<number>(this.diamondCount)
    .fill(0)
    .map((x, i) => i);
  // Controls visibility of selectable diamond levels. Initialize to false.
  diamondsVisible = Array<boolean>(this.diamondCount).fill(false);
  // Store timeout functions so that they can be cancelled prematurely
  diamondTimeouts: NodeJS.Timer[] = [];
  // How quickly the diamonds sequentially appear on hover
  diamondAnimationDelay = 50;
  // Whether the diamond drag selector is being dragged
  diamondDragging = false;
  // Which diamond is selected by the drag selector
  diamondIdxDraggedTo = -1;
  // Whether the drag selector is at the bottom of it's bound and in position to cancel a transaction
  diamondDragCancel = false;
  // Boolean for whether or not the div explaining diamonds should be collapsed or not.
  collapseDiamondInfo = true;
  // Boolean for tracking if we are processing a send diamonds event.
  sendingDiamonds = false;
  // Track the diamond selected in the diamond popover.
  diamondSelected: number;
  // Track the diamond that is currently being hovered
  diamondHovered = -1;
  // Track if we've gone past the explainer already. (Don't want to show explainer on start)
  diamondDragLeftExplainer = false;
  // Track if the dragged diamond actually moved, so that we can distinguish between drags and clicks
  diamondDragMoved = false;
  // Track when the drag began, if less than .1 seconds ago, and the drag didn't move, assume it was a click
  diamondDragStarted: Date;

  choosingReaction = false;
  debouncedToggleSelectReactionFunction: (show: boolean) => void;
  allowedReactions = Object.values(AssociationReactionValue) as Array<AssociationReactionValue>;
  reactionsVisible = Array<boolean>(this.allowedReactions.length).fill(false);
  reactionTimeouts: NodeJS.Timer[] = [];
  processedReaction: AssociationReactionValue | null = null;
  private readonly reactionAnimationDelay = 50;
  private readonly toggleReactionsDebounceTime = 50;

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private platformLocation: PlatformLocation,
    private ref: ChangeDetectorRef,
    private modalService: BsModalService,
    private translocoService: TranslocoService,
    private tracking: TrackingService
  ) {
    this.debouncedToggleSelectReactionFunction = debounce(
      this.toggleSelectReaction.bind(this),
      this.toggleReactionsDebounceTime
    );
  }

  diamondDraggedText() {
    const textKey = !this.diamondDragMoved
      ? "feed_post_icon_row.slide"
      : this.diamondDragCancel
      ? "feed_post_icon_row.release_to_cancel"
      : "feed_post_icon_row.slide_to_cancel";
    return this.translocoService.translate(textKey);
  }

  toggleSelectReaction(show: boolean) {
    if (!this.choosingReaction && show) {
      for (let idx = 0; idx < this.allowedReactions.length; idx++) {
        this.reactionTimeouts[idx] = setTimeout(() => {
          this.reactionsVisible[idx] = true;
          this.ref.detectChanges();
        }, idx * this.reactionAnimationDelay);
      }
    } else if (this.choosingReaction && !show) {
      for (let idx = 0; idx < this.allowedReactions.length; idx++) {
        clearTimeout(this.reactionTimeouts[idx]);
        this.reactionsVisible[idx] = false;
      }
      this.ref.detectChanges();
    }

    this.choosingReaction = show;
    this.ref.detectChanges();
  }

  // Initiate mobile drag, have diamonds appear
  startDrag() {
    this.globalVars.userIsDragging = true;
    this.diamondDragMoved = false;
    this.diamondDragStarted = new Date();
    this.diamondDragging = true;
    this.addDiamondSelection({ type: "initiateDrag" });
    this.ref.detectChanges();
  }

  // Calculate where the drag box has been dragged to, make updates accordingly
  duringDrag(event) {
    // If this event was triggered, the user moved the drag box, and we assume it's not a click.
    this.diamondDragMoved = true;
    // Establish a margin to the left and right in order to improve reachability
    const pageMargin = window.innerWidth * 0.15;
    // The width of the page minus the margins
    const selectableWidth = window.innerWidth - 2 * pageMargin;
    // If the selector is in the left margin, choose the first option
    if (event.pointerPosition.x < pageMargin) {
      this.diamondIdxDraggedTo = 0;
      // If the selector is in the right margin, choose the last option
    } else if (event.pointerPosition.x > selectableWidth + pageMargin) {
      this.diamondIdxDraggedTo = this.diamondCount;
    } else {
      // If the selector is in the middle, calculate what % of the middle it has been dragged to, assign a diamond value
      this.diamondIdxDraggedTo = round(((event.pointerPosition.x - pageMargin) / selectableWidth) * this.diamondCount);
    }
    // If the selector has been dragged out of the right margin, enable the helper text
    // (we don't want every drag event to start with the helper text enabled)
    if (this.diamondIdxDraggedTo != this.diamondCount) {
      this.diamondDragLeftExplainer = true;
    }
    // If the drag box is at the alloted lower boundry or below, set confirm status to true
    this.diamondDragCancel = event.distance.y > 30;
    this.ref.detectChanges();
  }

  // Triggered on end of a touch. If we determine this was a "click" event, send 1 diamond. Otherwise nothing
  dragClick(event) {
    const now = new Date();
    // If the drag box wasn't moved and less than 200ms have transpired since the start of the tap,
    // assume this was a click and send 1 diamond
    if (!this.diamondDragMoved) {
      if (now.getTime() - this.diamondDragStarted.getTime() < 200) {
        // Prevent touch event from propagating
        event.preventDefault();
        this.sendOneDiamond(event, true);
      }
      // If the diamond drag box wasn't moved, we need to reset these variables.
      // If it was moved, the endDrag fn will do it.
      this.resetDragVariables();
    }
    this.ref.detectChanges();
  }

  // End dragging procedure. Triggered when the dragged element is released
  endDrag(event) {
    // Stop the drag event so that the slider isn't visible during transaction load
    this.diamondDragging = false;
    // If the drag box is not in the "cancel" position, and the selected diamond makes sense, send diamonds
    if (!this.diamondDragCancel && this.diamondIdxDraggedTo > -1 && this.diamondIdxDraggedTo < this.diamondCount) {
      this.onDiamondSelected(null, this.diamondIdxDraggedTo);
    }
    // Reset drag-related variables
    this.resetDragVariables();
    // Move the drag box back to it's original position
    event.source._dragRef.reset();
    this.ref.detectChanges();
  }

  resetDragVariables() {
    this.globalVars.userIsDragging = false;
    this.diamondDragCancel = false;
    this.diamondDragging = false;
    this.diamondIdxDraggedTo = -1;
    this.diamondDragMoved = false;
    this.diamondDragLeftExplainer = false;
    this.ref.detectChanges();
  }

  _preventNonLoggedInUserActions(action: string) {
    this.tracking.log(`post : ${action}`, {
      postHashHex: this.postContent.PostHashHex,
      authorUsername: this.postContent.ProfileEntryResponse?.Username,
      authorPublicKey: this.postContent.ProfileEntryResponse?.PublicKeyBase58Check,
    });
    this.modalService.show(WelcomeModalComponent, { initialState: { triggerAction: action } });
  }

  userHasReposted(): boolean {
    return this.postContent.PostEntryReaderState && this.postContent.PostEntryReaderState.RepostedByReader;
  }

  _repost(event: any) {
    if (this.inTutorial) {
      return;
    }
    // Prevent the post from navigating.
    event.stopPropagation();

    // If the user isn't logged in, alert them.
    if (!this.globalVars.loggedInUser) {
      return this._preventNonLoggedInUserActions("repost");
    } else if (this.globalVars && !this.globalVars.doesLoggedInUserHaveProfile()) {
      this.tracking.log("alert : repost : profile");
      SharedDialogs.showCreateProfileToPostDialog(this.router);
      return;
    }
    if (!this.postContent.PostEntryReaderState) {
      this.postContent.PostEntryReaderState = {};
    }

    this.sendingRepostRequest = true;
    this.ref.detectChanges();
    this.backendApi
      .SubmitPost(
        this.globalVars.localNode,
        this.globalVars.loggedInUser?.PublicKeyBase58Check,
        this.postContent.PostEntryReaderState.RepostPostHashHex || "" /*PostHashHexToModify*/,
        "" /*ParentPostHashHex*/,
        "" /*Title*/,
        {},
        this.postContent.PostHashHex,
        {},
        "" /*Sub*/,
        false /*IsHidden*/,
        // What should the fee rate be for this?
        this.globalVars.feeRateDeSoPerKB * 1e9 /*feeRateNanosPerKB*/
      )
      .subscribe(
        (response) => {
          this.tracking.log("post : repost");
          // Only set the RepostPostHashHex if this is the first time a user is reposting a post.
          if (!this.postContent.PostEntryReaderState.RepostPostHashHex) {
            this.postContent.PostEntryReaderState.RepostPostHashHex = response.PostHashHex;
          }
          this.postContent.RepostCount += 1;
          this.postContent.PostEntryReaderState.RepostedByReader = true;
          this.sendingRepostRequest = false;
          this.ref.detectChanges();
        },
        (err) => {
          console.error(err);
          this.sendingRepostRequest = false;
          const parsedError = this.backendApi.parsePostError(err);
          this.tracking.log("post : repost", { error: err });
          this.globalVars._alertError(parsedError);
          this.ref.detectChanges();
        }
      );
  }

  _undoRepost(event: any) {
    if (this.inTutorial) {
      return;
    }
    // Prevent the post from navigating.
    event.stopPropagation();

    // If the user isn't logged in, alert them.
    if (this.globalVars.loggedInUser == null) {
      return this._preventNonLoggedInUserActions("undo repost");
    }
    this.sendingRepostRequest = true;

    this.ref.detectChanges();
    this.backendApi
      .SubmitPost(
        this.globalVars.localNode,
        this.globalVars.loggedInUser?.PublicKeyBase58Check,
        this.postContent.PostEntryReaderState.RepostPostHashHex || "" /*PostHashHexToModify*/,
        "" /*ParentPostHashHex*/,
        "" /*Title*/,
        {} /*BodyObj*/,
        this.postContent.PostHashHex,
        {},
        "" /*Sub*/,
        true /*IsHidden*/,
        // What should the fee rate be for this?
        this.globalVars.feeRateDeSoPerKB * 1e9 /*feeRateNanosPerKB*/
      )
      .subscribe(
        (response) => {
          this.tracking.log("post : unrepost");
          this.postContent.RepostCount--;
          this.postContent.PostEntryReaderState.RepostedByReader = false;
          this.sendingRepostRequest = false;
          this.ref.detectChanges();
        },
        (err) => {
          console.error(err);
          this.sendingRepostRequest = false;
          const parsedError = this.backendApi.parsePostError(err);
          this.tracking.log("post : unrepost", { error: parsedError });
          this.globalVars._alertError(parsedError);
          this.ref.detectChanges();
        }
      );
  }

  openModal(event, isQuote: boolean = false) {
    if (this.inTutorial) {
      return;
    }

    if (!isNil(event)) {
      // Prevent the post navigation click from occurring.
      event.stopPropagation();
    }

    if (!this.globalVars.loggedInUser) {
      this.modalService.show(WelcomeModalComponent, { initialState: { triggerAction: "comment" } });
    } else if (!this.globalVars.doesLoggedInUserHaveProfile()) {
      // Check if the user has a profile.
      this.tracking.log("alert : reply : profile");
      SharedDialogs.showCreateProfileToPostDialog(this.router);
    } else {
      const initialState = {
        // If we are quoting a post, make sure we pass the content so we don't repost a repost.
        parentPost: this.postContent,
        afterCommentCreatedCallback: isQuote ? this.afterRepostCreatedCallback : this.afterCommentCreatedCallback,
        isQuote,
      };

      // If the user has an account and a profile, open the modal so they can comment.
      this.modalService.show(CommentModalComponent, {
        class: "modal-dialog-centered",
        initialState,
        ignoreBackdropClick: true,
        keyboard: false,
      });
    }
  }

  copyPostLinkToClipboard(event) {
    this.tracking.log("post : share", {
      postHashHex: this.postContent.PostHashHex,
      authorUsername: this.postContent.ProfileEntryResponse?.Username,
      authorPublicKey: this.postContent.ProfileEntryResponse?.PublicKeyBase58Check,
    });

    // Prevent the post from navigating.
    event.stopPropagation();

    this.globalVars._copyText(this._getPostUrl());
  }

  tooltipDetectChanges() {
    setTimeout(() => {
      this.ref.detectChanges();
    }, 50);
  }

  onTimestampClickHandler(event) {
    if (this.inTutorial) {
      return;
    }
    this.tracking.log("post : share", {
      postHashHex: this.postContent.PostHashHex,
      authorUsername: this.postContent.ProfileEntryResponse?.Username,
      authorPublicKey: this.postContent.ProfileEntryResponse?.PublicKeyBase58Check,
    });

    // Prevent the post from navigating.
    event.stopPropagation();

    //condition to check whether middle mouse btn is clicked
    if (event.which == 2) {
      window.open(this._getPostUrl(), "_blank");
    }
  }

  // this is a bit of a hacky solution, not sure what the right way to do this is
  //
  // this solution is from https://stackoverflow.com/questions/41447305/how-to-get-an-absolute-url-by-a-route-name-in-angular-2
  // which got its answer from https://stackoverflow.com/questions/38485171/angular-2-access-base-href
  // but the angular docs say not to use PlatformLocation https://angular.io/api/common/PlatformLocation
  // maybe we should just use window.location.href instead...
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

  toggleExplainer(event) {
    event.stopPropagation();
    this.collapseDiamondInfo = !this.collapseDiamondInfo;
    this.ref.detectChanges();
  }

  sendDiamonds(diamonds: number, skipCelebration: boolean = false): Promise<void> {
    this.sendingDiamonds = true;
    return this.backendApi
      .SendDiamonds(
        this.globalVars.localNode,
        this.globalVars.loggedInUser?.PublicKeyBase58Check,
        this.postContent.PosterPublicKeyBase58Check,
        this.postContent.PostHashHex,
        diamonds,
        this.globalVars.feeRateDeSoPerKB * 1e9,
        this.inTutorial
      )
      .toPromise()
      .then(
        (res) => {
          this.sendingDiamonds = false;
          this.diamondSent.emit();
          this.tracking.log("diamond: send", {
            postHashHex: this.postContent.PostHashHex,
            authorUsername: this.postContent.ProfileEntryResponse?.Username,
            authorPublicKey: this.postContent.PosterPublicKeyBase58Check,
            diamondLevel: diamonds,
          });
          this.diamondSelected = diamonds;
          this.postContent.DiamondCount += diamonds - this.getCurrentDiamondLevel();
          set(this.postContent, "PostEntryReaderState.DiamondLevelBestowed", diamonds);
          if (!skipCelebration) {
            // Celebrate when the SendDiamonds call completes
            this.globalVars.celebrate([ConfettiSvg.DIAMOND]);
          }
          this.globalVars.updateEverything(res.TxnHashHex, this.sendDiamondsSuccess, this.sendDiamondsFailure, this);
          this.ref.detectChanges();
        },
        (err) => {
          if (err.status === 0) {
            return this.globalVars._alertError("DeSo is under heavy load. Please try again in one minute.");
          }
          this.sendingDiamonds = false;
          const parsedError = this.backendApi.parseProfileError(err);
          this.tracking.log("diamonds: send", { error: parsedError });
          this.globalVars._alertError(parsedError);
        }
      );
  }

  sendDiamondsSuccess(comp: FeedPostIconRowComponent) {
    comp.sendingDiamonds = false;
  }

  sendDiamondsFailure(comp: FeedPostIconRowComponent) {
    comp.sendingDiamonds = false;
    comp.globalVars._alertError("Transaction broadcast successfully but read node timeout exceeded. Please refresh.");
    this.ref.detectChanges();
  }

  getPost(postHashHex) {
    // Hit the Get Single Post endpoint with specific parameters
    let readerPubKey = "";
    if (this.globalVars.loggedInUser) {
      readerPubKey = this.globalVars.loggedInUser?.PublicKeyBase58Check;
    }
    return this.backendApi.GetSinglePost(
      this.globalVars.localNode,
      postHashHex /*PostHashHex*/,
      readerPubKey /*ReaderPublicKeyBase58Check*/,
      false,
      0,
      0,
      this.globalVars.showAdminTools() /*AddGlobalFeedBool*/
    );
  }

  popoverOpenClickHandler = (e: Event) => {
    const popoverElement = document.getElementById("diamond-popover");
    if (popoverElement && e.target !== popoverElement && !popoverElement.contains(e.target as any)) {
      e.stopPropagation();
    }
    this.ref.detectChanges();
  };

  async sendOneDiamond(event: any, fromDragEvent: boolean) {
    // Disable diamond selection if diamonds are being sent
    if (this.sendingDiamonds) {
      return;
    }

    // Block user from selecting diamond level below already gifted amount
    if (this.getCurrentDiamondLevel() > 0) {
      return;
    }

    // Don't trigger diamond purchases on tap on tablet
    if (event && event.pointerType === "touch" && !fromDragEvent && !this.inTutorial) {
      event.stopPropagation();
      return;
    }

    // If triggered from mobile, stop propagation
    if (fromDragEvent) {
      event.stopPropagation();
    }

    this.onDiamondSelected(event, 0);
  }

  addDiamondSelection(event) {
    // Need to make sure hover event doesn't trigger on child elements
    if (event?.type === "initiateDrag" || event.target.id === "diamond-button") {
      for (let idx = 0; idx < this.diamondCount; idx++) {
        this.diamondTimeouts[idx] = setTimeout(() => {
          this.diamondsVisible[idx] = true;
          this.ref.detectChanges();
        }, idx * this.diamondAnimationDelay);
      }
    }
  }

  setDiamondHovered(diamondIndex) {
    this.diamondHovered = diamondIndex;
    this.ref.detectChanges();
  }

  setCollapseDiamondInfo(collapseVal) {
    this.collapseDiamondInfo = collapseVal;
    this.ref.detectChanges();
  }

  removeDiamondSelection() {
    for (let idx = 0; idx < this.diamondCount; idx++) {
      clearTimeout(this.diamondTimeouts[idx]);
      this.diamondsVisible[idx] = false;
    }
    this.ref.detectChanges();
  }

  async onDiamondSelected(event: any, index: number): Promise<void> {
    if (!this.globalVars.loggedInUser) {
      this.modalService.show(WelcomeModalComponent, { initialState: { triggerAction: "diamond" } });
      return;
    }
    // Disable diamond selection if diamonds are being sent
    if (this.sendingDiamonds) {
      return;
    }

    if (event && event.pointerType === "touch" && includes(event.target.classList, "reaction-icon")) {
      event.stopPropagation();
      return;
    }

    // Block user from selecting diamond level below already gifted amount
    if (index < this.getCurrentDiamondLevel()) {
      return;
    }

    if (
      this.postContent.PostEntryReaderState?.DiamondLevelBestowed &&
      index + 1 <= this.postContent.PostEntryReaderState.DiamondLevelBestowed
    ) {
      this.globalVars._alertError("You cannot downgrade a diamond");
      return;
    }
    this.diamondSelected = index + 1;
    if (event) {
      event.stopPropagation();
    }
    if (this.diamondSelected > FeedPostIconRowComponent.DiamondWarningThreshold) {
      SwalHelper.fire({
        target: this.globalVars.getTargetComponentSelector(),
        icon: "info",
        title: `Sending ${this.diamondSelected} diamonds to @${this.postContent.ProfileEntryResponse?.Username}`,
        html: `Clicking confirm will send ${this.globalVars.getUSDForDiamond(this.diamondSelected)} to @${
          this.postContent.ProfileEntryResponse?.Username
        }`,
        showCancelButton: true,
        showConfirmButton: true,
        focusConfirm: true,
        customClass: {
          confirmButton: "btn btn-light",
          cancelButton: "btn btn-light no",
        },
        confirmButtonText: "Confirm",
        cancelButtonText: "Cancel",
        reverseButtons: true,
      }).then(async (res: any) => {
        if (res.isConfirmed) {
          await this.sendDiamonds(this.diamondSelected);
        }
      });
    } else {
      await this.sendDiamonds(this.diamondSelected);
    }
  }

  getCurrentDiamondLevel(): number {
    return this.postContent.PostEntryReaderState?.DiamondLevelBestowed || 0;
  }

  getPopoverContainerClass() {
    const mobileClass = this.globalVars.isMobile() ? "diamond-popover-container-mobile " : "";
    return "diamond-popover-container " + mobileClass;
  }

  handleRepostClick(event) {
    event.stopPropagation();
    this.ref.detectChanges();
  }

  openReactionsDetails(event) {
    event.stopPropagation();

    this.openInteractionPage(event, this.globalVars.RouteNames.REACTIONS, ReactionsModalComponent);
  }

  private openInteractionPage(event, pageName: string, component): void {
    event.stopPropagation();
    if (this.globalVars.isMobile()) {
      this.router.navigate(["/" + this.globalVars.RouteNames.POSTS, this.post.PostHashHex, pageName], {
        queryParamsHandling: "merge",
      });
    } else {
      this.modalService.show(component, {
        class: "modal-dialog-centered",
        initialState: { postHashHex: this.post.PostHashHex },
      });
    }
  }

  sendReaction(value: AssociationReactionValue = this.allowedReactions[0], event?: Event) {
    if (this.processedReaction) {
      event.preventDefault();
      return;
    }

    this.processedReaction = value;
    this.ref.detectChanges();

    event && event.stopPropagation();

    const existingReaction = this.hasUserReacted(value);

    // Update counts locally without waiting for a response to immediately show the result to the user
    this.updateReactionCounts.emit({
      Total: existingReaction ? this.postReactionCounts.Total - 1 : this.postReactionCounts.Total + 1,
      Counts: {
        ...this.postReactionCounts.Counts,
        [value]: existingReaction
          ? this.postReactionCounts.Counts[value] - 1
          : this.postReactionCounts.Counts[value] + 1,
      },
    });

    // Update reactions locally without waiting for a response to immediately show the result to the user
    this.updateMyReactions.emit(
      existingReaction
        ? this.myReactions.filter((e) => e.AssociationValue !== value)
        : [
            ...this.myReactions,
            { AssociationType: AssociationType.reaction, AssociationValue: value } as PostAssociation,
          ]
    );

    const $request = existingReaction
      ? this.backendApi.DeletePostAssociation(
          this.globalVars.localNode,
          this.globalVars.loggedInUser?.PublicKeyBase58Check,
          existingReaction.AssociationID
        )
      : this.backendApi.CreatePostAssociation(
          this.globalVars.localNode,
          this.globalVars.loggedInUser?.PublicKeyBase58Check,
          this.post.PostHashHex,
          AssociationType.reaction,
          value
        );

    $request
      .pipe(
        finalize(() => {
          this.processedReaction = null;
          this.ref.detectChanges();
        })
      )
      .subscribe(
        () => {
          this.userReacted.emit();
        },
        (err) => {
          console.error(err);
          this.sendingRepostRequest = false;
          const parsedError = this.backendApi.parsePostError(err);
          this.tracking.log("post : react", { error: err });
          this.globalVars._alertError(parsedError);
          this.ref.detectChanges();
        }
      );
  }

  hasUserReacted(value: AssociationReactionValue) {
    return this.myReactions.find((e) => e.AssociationValue === value);
  }

  sortReactionsByCount(
    a: KeyValue<AssociationReactionValue, number>,
    b: KeyValue<AssociationReactionValue, number>
  ): number {
    return a.value > b.value ? -1 : 1;
  }
}
