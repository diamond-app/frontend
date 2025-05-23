import { Location } from "@angular/common";
import { ChangeDetectorRef, Component, EventEmitter, Output, ViewChild } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import * as _ from "lodash";
import { BsModalService } from "ngx-bootstrap/modal";
import { ToastrService } from "ngx-toastr";
import { TrackingService } from "src/app/tracking.service";
import { environment } from "src/environments/environment";
import { SwalHelper } from "../../../lib/helpers/swal-helper";
import { RouteNames } from "../../app-routing.module";
import { BackendApiService } from "../../backend-api.service";
import { CloseNftAuctionModalComponent } from "../../close-nft-auction-modal/close-nft-auction-modal.component";
import { FeedPostComponent } from "../../feed/feed-post/feed-post.component";
import { GlobalVarsService } from "../../global-vars.service";
import { NFTBidEntryResponse as NFTBidEntryResponseProtocol, NFTEntryResponse, PostEntryResponse } from "deso-protocol";

interface NFTBidEntryResponse extends NFTBidEntryResponseProtocol {
  selected?: boolean;
}

export class NFTBidData {
  PostEntryResponse: PostEntryResponse;
  NFTEntryResponses: NFTEntryResponse[];
  BidEntryResponses: NFTBidEntryResponse[];
}

@Component({
  selector: "nft-post",
  templateUrl: "./nft-post.component.html",
  styleUrls: ["./nft-post.component.scss"],
})
export class NftPostComponent {
  @ViewChild(FeedPostComponent) feedPost: FeedPostComponent;
  @Output() postLoaded = new EventEmitter();

  nftPost: PostEntryResponse;
  nftPostHashHex: string;
  nftBidData: NFTBidData;
  myBids: NFTBidEntryResponse[];
  availableSerialNumbers: NFTEntryResponse[];
  myAvailableSerialNumbers: NFTEntryResponse[];
  loading = true;
  refreshingBids = true;
  sellNFTDisabled = true;
  showPlaceABid: boolean;
  highBid: number;
  lowBid: number;
  selectedBids: boolean[];
  selectedBid: NFTBidEntryResponse;
  showBidsView: boolean = true;
  selectAllSelected: boolean = false;
  bids: NFTBidEntryResponse[];
  owners: NFTEntryResponse[];

  NftPostComponent = NftPostComponent;

  activeTab = NftPostComponent.THREAD;

  static ALL_BIDS = "tab_selector.all_bids";
  static MY_BIDS = "tab_selector.my_bids";
  static MY_AUCTIONS = "tab_selector.my_auction";
  static OWNERS = "tab_selector.owners";
  static THREAD = "tab_selector.thread";

  tabs = [
    NftPostComponent.THREAD,
    NftPostComponent.ALL_BIDS,
    NftPostComponent.MY_BIDS,
    NftPostComponent.MY_AUCTIONS,
    NftPostComponent.OWNERS,
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private changeRef: ChangeDetectorRef,
    private modalService: BsModalService,
    private titleService: Title,
    public location: Location,
    private toastr: ToastrService,
    private tracking: TrackingService
  ) {
    // This line forces the component to reload when only a url param changes.  Without this, the UiScroll component
    // behaves strangely and can reuse data from a previous post.
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;

    this.route.params.subscribe((params) => {
      this._setStateFromActivatedRoute(route);
    });
  }

  getPost(fetchParents: boolean = true) {
    // Hit the Get Single Post endpoint with specific parameters
    let readerPubKey = "";
    if (this.globalVars.loggedInUser) {
      readerPubKey = this.globalVars.loggedInUser?.PublicKeyBase58Check;
    }
    return this.backendApi.GetSinglePost(
      this.nftPostHashHex /*PostHashHex*/,
      readerPubKey /*ReaderPublicKeyBase58Check*/,
      fetchParents,
      0,
      0,
      this.globalVars.showAdminTools() /*AddGlobalFeedBool*/
    );
  }

  refreshPosts() {
    // Fetch the post entry
    this.getPost().subscribe(
      (res) => {
        if (!res || !res.PostFound) {
          this.router.navigateByUrl("/" + this.globalVars.RouteNames.NOT_FOUND, { skipLocationChange: true });
          return;
        }
        if (!res.PostFound.IsNFT) {
          const postHashHex = res.PostFound.PostHashHex;
          SwalHelper.fire({
            target: this.globalVars.getTargetComponentSelector(),
            html: "This post is not an NFT",
            showConfirmButton: true,
            showCancelButton: true,
            customClass: {
              confirmButton: "btn btn-light",
              cancelButton: "btn btn-light no",
            },
            confirmButtonText: "View Post",
            cancelButtonText: "Go back",
            reverseButtons: true,
          }).then((res) => {
            if (res.isConfirmed) {
              this.router.navigate(["/" + RouteNames.POSTS + "/" + postHashHex]);
              return;
            }
            this.location.back();
          });
          return;
        }
        // Set current post
        this.nftPost = res.PostFound;
        this.postLoaded.emit(
          `${this.globalVars.addOwnershipApostrophe(this.nftPost.ProfileEntryResponse?.Username || this.nftPost.PosterPublicKeyBase58Check)} NFT`
        );
        this.titleService.setTitle(this.nftPost.ProfileEntryResponse?.Username || this.nftPost.PosterPublicKeyBase58Check + ` on ${environment.node.name}`);
        this._handleTabClick(this.activeTab);
        this.loading = false;
        this.refreshBidData();
      },
      (err) => {
        // TODO: post threads: rollbar
        console.error(err);
        this.router.navigateByUrl("/" + this.globalVars.RouteNames.NOT_FOUND, { skipLocationChange: true });
        this.loading = false;
      }
    );
  }

  refreshBidData() {
    this.refreshingBids = true;
    return this.backendApi
      .GetNFTBidsForNFTPost(this.globalVars.loggedInUser?.PublicKeyBase58Check, this.nftPost.PostHashHex)
      .subscribe(
        (res) => {
          this.nftBidData = res as NFTBidData;
          if (!this.nftBidData.BidEntryResponses) {
            this.nftBidData.BidEntryResponses = [];
          }
          this.availableSerialNumbers = this.nftBidData.NFTEntryResponses.filter(
            (nftEntryResponse) => nftEntryResponse.IsForSale
          );
          this.myAvailableSerialNumbers = this.availableSerialNumbers.filter(
            (nftEntryResponse) =>
              nftEntryResponse.OwnerPublicKeyBase58Check === this.globalVars.loggedInUser?.PublicKeyBase58Check
          );
          if (!this.myAvailableSerialNumbers.length) {
            this.tabs = this.tabs.filter((t) => t !== NftPostComponent.MY_AUCTIONS);
            this.activeTab = this.activeTab === NftPostComponent.MY_AUCTIONS ? this.tabs[0] : this.activeTab;
          }
          this.myBids = this.nftBidData.BidEntryResponses.filter(
            (bidEntry) => bidEntry.PublicKeyBase58Check === this.globalVars.loggedInUser?.PublicKeyBase58Check
          );
          if (!this.myBids.length) {
            this.tabs = this.tabs.filter((t) => t !== NftPostComponent.MY_BIDS);
            this.activeTab = this.activeTab === NftPostComponent.MY_BIDS ? this.tabs[0] : this.activeTab;
          }
          this.showPlaceABid = !!(this.availableSerialNumbers.length - this.myAvailableSerialNumbers.length);
          this.highBid = _.maxBy(this.nftBidData.NFTEntryResponses, "HighestBidAmountNanos").HighestBidAmountNanos;
          this.lowBid = _.minBy(this.nftBidData.NFTEntryResponses, "LowestBidAmountNanos").LowestBidAmountNanos;
          this.owners = this.nftBidData.NFTEntryResponses;
        },
        (err) => {
          console.error(err);
          this.globalVars._alertError(err);
        }
      )
      .add(() => {
        this._handleTabClick(this.activeTab);
        this.loading = false;
        this.refreshingBids = false;
      });
  }

  _setStateFromActivatedRoute(route) {
    if (this.nftPostHashHex !== route.snapshot.params.postHashHex) {
      // get the username of the target user (user whose followers / following we're obtaining)
      this.nftPostHashHex = route.snapshot.params.postHashHex;

      // it's important that we call this here and not in ngOnInit. Angular does not reload components when only a param changes.
      // We are responsible for refreshing the components.
      // if the user is on a thread page and clicks on a comment, the nftPostHashHex will change, but angular won't "load a new
      // page" and re-render the whole component using the new post hash. instead, angular will
      // continue using the current component and merely change the URL. so we need to explictly
      // refresh the posts every time the route changes.
      this.loading = true;
      this.refreshPosts();
    }
  }

  isPostBlocked(post: any): boolean {
    return this.globalVars.hasUserBlockedCreator(post.PosterPublicKeyBase58Check);
  }

  afterUserBlocked(blockedPubKey: any) {
    this.globalVars.loggedInUser.BlockedPubKeys[blockedPubKey] = {};
  }

  afterNftBidPlaced() {
    this.refreshBidData();
  }

  sellNFT(): void {
    if (this.sellNFTDisabled) {
      return;
    }
    this.router.navigate(["/" + RouteNames.SELL_NFT + "/" + this.nftPost.PostHashHex], {
      queryParamsHandling: "merge",
      state: {
        post: this.nftPost,
        nftEntries: this.nftBidData.NFTEntryResponses,
        selectedBidEntries: this.nftBidData.BidEntryResponses.filter((bidEntry) => bidEntry.selected),
      },
    });
  }

  checkSelectedBidEntries(bidEntry: NFTBidEntryResponse): void {
    this.selectAllSelected = false;
    if (bidEntry.selected) {
      // De-select any bid entries for the same serial number.
      this.nftBidData.BidEntryResponses.forEach((bidEntryResponse) => {
        if (
          bidEntryResponse.SerialNumber === bidEntry.SerialNumber &&
          bidEntry !== bidEntryResponse &&
          bidEntryResponse.selected
        ) {
          bidEntryResponse.selected = false;
        }
      });
    }
    // enabled / disable the Sell NFT button based on the count of bid entries that are selected.
    this.sellNFTDisabled = !this.nftBidData.BidEntryResponses.filter((bidEntryResponse) => bidEntryResponse.selected)
      ?.length;
  }

  selectBidEntry(bidEntry: NFTBidEntryResponse): void {
    this.bids.forEach((bidEntry) => (bidEntry.selected = false));
    bidEntry.selected = true;
    this.sellNFTDisabled = false;
  }

  closeAuction(): void {
    this.tracking.log("nft-close-auction-button : click");
    const closeNftAuctionModalDetails = this.modalService.show(CloseNftAuctionModalComponent, {
      class: "modal-dialog-centered modal-dialog-thin",
      initialState: {
        post: this.nftPost,
        myAvailableSerialNumbers: this.myAvailableSerialNumbers,
      },
    });
    const onHiddenEvent = closeNftAuctionModalDetails.onHidden;
    onHiddenEvent.subscribe((response) => {
      if (response === "auction cancelled") {
        this.toastr.show("Your auction was closed", null, {
          toastClass: "info-toast",
          positionClass: "toast-bottom-center",
        });
        this.refreshBidData();
        this.feedPost.getNFTEntries();
      }
    });
  }

  userOwnsSerialNumber(serialNumber: number): boolean {
    const loggedInPubKey = this.globalVars.loggedInUser?.PublicKeyBase58Check;
    return !!this.nftBidData.NFTEntryResponses.filter(
      (nftEntryResponse) =>
        nftEntryResponse.SerialNumber === serialNumber && nftEntryResponse.OwnerPublicKeyBase58Check === loggedInPubKey
    ).length;
  }

  _handleTabClick(tabName: string): void {
    this.activeTab = tabName;
    this.showBidsView =
      tabName === NftPostComponent.ALL_BIDS ||
      tabName === NftPostComponent.MY_BIDS ||
      tabName === NftPostComponent.MY_AUCTIONS;
    if (this.activeTab === NftPostComponent.ALL_BIDS) {
      this.bids = this.nftBidData.BidEntryResponses.filter(
        (bidEntry) => bidEntry.BidAmountNanos <= bidEntry.BidderBalanceNanos
      );
    } else if (this.activeTab === NftPostComponent.MY_BIDS) {
      this.bids = this.nftBidData.BidEntryResponses.filter(
        (bidEntry) => bidEntry.PublicKeyBase58Check === this.globalVars.loggedInUser?.PublicKeyBase58Check
      );
    } else if (this.activeTab === NftPostComponent.MY_AUCTIONS) {
      const serialNumbers = this.myAvailableSerialNumbers?.map((nftEntryResponse) => nftEntryResponse.SerialNumber);
      this.bids = this.nftBidData.BidEntryResponses.filter(
        (bidEntry) =>
          (serialNumbers.includes(bidEntry.SerialNumber) || bidEntry.SerialNumber === 0) &&
          bidEntry.BidAmountNanos <= bidEntry.BidderBalanceNanos
      );
    }
    if (this.showBidsView) {
      this.sortBids(this.sortByField, this.sortDescending);
    } else if (this.activeTab === NftPostComponent.OWNERS) {
      this.sortNftEntries(this.sortByField, this.sortDescending);
    }
  }

  static SORT_BY_PRICE = "PRICE";
  static SORT_BY_USERNAME = "USERNAME";
  static SORT_BY_EDITION = "EDITION";
  sortByField = NftPostComponent.SORT_BY_PRICE;
  sortDescending = true;

  sortBids(attribute: string = NftPostComponent.SORT_BY_PRICE, descending: boolean = true): void {
    if (!this.bids?.length) {
      return;
    }
    const sortDescending = descending ? -1 : 1;
    this.bids.sort((a, b) => {
      const bidDiff = this.compareBidAmount(a, b);
      const serialNumDiff = this.compareSerialNumber(a, b);
      const usernameDiff = this.compareUsername(a, b);
      if (attribute === NftPostComponent.SORT_BY_PRICE) {
        return sortDescending * bidDiff || serialNumDiff || usernameDiff;
      } else if (attribute === NftPostComponent.SORT_BY_USERNAME) {
        return sortDescending * usernameDiff || bidDiff || serialNumDiff;
      } else if (attribute === NftPostComponent.SORT_BY_EDITION) {
        return sortDescending * serialNumDiff || bidDiff || usernameDiff;
      }
    });
  }

  handleColumnHeaderClick(header: string): void {
    if (this.sortByField === header) {
      this.sortDescending = !this.sortDescending;
    } else {
      this.sortDescending = false;
    }
    this.sortByField = header;
    this.sortBids(header, this.sortDescending);
    this.sortNftEntries(header, this.sortDescending);
  }

  compareBidAmount(a: NFTBidEntryResponse, b: NFTBidEntryResponse): number {
    return a.BidAmountNanos - b.BidAmountNanos;
  }
  compareSerialNumber(a: NFTBidEntryResponse | NFTEntryResponse, b: NFTBidEntryResponse | NFTEntryResponse): number {
    return a.SerialNumber - b.SerialNumber;
  }
  compareUsername(a: NFTBidEntryResponse, b: NFTBidEntryResponse): number {
    const aUsername = a.ProfileEntryResponse?.Username || a.PublicKeyBase58Check;
    const bUsername = b.ProfileEntryResponse?.Username || b.PublicKeyBase58Check;
    if (aUsername < bUsername) {
      return -1;
    }
    if (bUsername < aUsername) {
      return 1;
    }
    return 0;
  }

  sortNftEntries(attribute: string, descending: boolean = true): void {
    if (!this.owners?.length) {
      return;
    }
    const sortDescending = descending ? -1 : 1;
    this.owners.sort((a, b) => {
      const lastAcceptedBidDiff = this.compareLastAcceptedBidAmount(a, b);
      const serialNumDiff = this.compareSerialNumber(a, b);
      const usernameDiff = this.compareNFTEntryUsername(a, b);
      if (attribute === NftPostComponent.SORT_BY_PRICE) {
        return sortDescending * lastAcceptedBidDiff || serialNumDiff || usernameDiff;
      } else if (attribute === NftPostComponent.SORT_BY_USERNAME) {
        return sortDescending * usernameDiff || lastAcceptedBidDiff || serialNumDiff;
      } else if (attribute === NftPostComponent.SORT_BY_EDITION) {
        return sortDescending * serialNumDiff || lastAcceptedBidDiff || usernameDiff;
      }
    });
  }

  compareLastAcceptedBidAmount(a: NFTEntryResponse, b: NFTEntryResponse): number {
    return a.LastAcceptedBidAmountNanos - b.LastAcceptedBidAmountNanos;
  }
  compareNFTEntryUsername(a: NFTEntryResponse, b: NFTEntryResponse): number {
    const aUsername = a.ProfileEntryResponse?.Username || a.OwnerPublicKeyBase58Check;
    const bUsername = b.ProfileEntryResponse?.Username || b.OwnerPublicKeyBase58Check;
    if (aUsername < bUsername) {
      return -1;
    }
    if (bUsername < aUsername) {
      return 1;
    }
    return 0;
  }

  selectHighestBids(): void {
    // If all highest are already selected, deselect all
    if (this.selectAllSelected) {
      this.bids.forEach((bid) => {
        bid.selected = false;
      });
      this.selectAllSelected = false;
      this.sellNFTDisabled = true;
    } else {
      let highestNFTMap: { [k: number]: NFTBidEntryResponse } = {};
      this.bids.forEach((bid) => {
        const highestBid = highestNFTMap[bid.SerialNumber];
        if (
          (!highestBid || highestBid.BidAmountNanos < bid.BidAmountNanos) &&
          bid.BidderBalanceNanos >= bid.BidAmountNanos
        ) {
          highestNFTMap[bid.SerialNumber] = bid;
        }
      });
      this.bids.forEach((bid) => {
        const highestBid = highestNFTMap[bid.SerialNumber];
        bid.selected =
          highestBid.PublicKeyBase58Check === bid.PublicKeyBase58Check &&
          highestBid.BidAmountNanos === bid.BidAmountNanos &&
          highestBid.SerialNumber === bid.SerialNumber;
        if (this.nftPost.NumNFTCopies === 1 && bid.selected) {
          this.selectedBid = highestBid;
        }
      });
      this.sellNFTDisabled = false;
      this.selectAllSelected = true;
    }
  }

  cancelBid(bidEntry: NFTBidEntryResponse): void {
    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      title: "Cancel Bid",
      html: `Are you sure you'd like to cancel this bid?`,
      showCancelButton: true,
      customClass: {
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
      reverseButtons: true,
    }).then((res) => {
      if (res.isConfirmed) {
        this.backendApi
          .CreateNFTBid(
            this.globalVars.loggedInUser?.PublicKeyBase58Check,
            this.nftPost.PostHashHex,
            bidEntry.SerialNumber,
            0
          )
          .subscribe(
            (res) => {
              this.refreshBidData();
              this.toastr.show("Your bid was cancelled", null, {
                toastClass: "info-toast",
                positionClass: "toast-bottom-center",
              });
            },
            (err) => {
              console.error(err);
            }
          );
      }
    });
  }

  reloadingThread = false;
  incrementCommentCounter(): void {
    this.nftPost.CommentCount += 1;
    setTimeout(() => (this.reloadingThread = true));
    setTimeout(() => (this.reloadingThread = false));
  }
}
