import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import { GlobalVarsService } from "../global-vars.service";
import { BackendApiService, NFTEntryResponse, PostEntryResponse } from "../backend-api.service";
import * as _ from "lodash";
import { Router } from "@angular/router";
import { isNumber } from "lodash";
import { ToastrService } from "ngx-toastr";
import { BsModalService } from "ngx-bootstrap/modal";
import { Location } from "@angular/common";
import { BuyDesoModalComponent } from "../buy-deso-page/buy-deso-modal/buy-deso-modal.component";

@Component({
  selector: "place-bid",
  templateUrl: "./place-bid.component.html",
})
export class PlaceBidComponent implements OnInit {
  static PAGE_SIZE = 50;
  static BUFFER_SIZE = 10;
  static WINDOW_VIEWPORT = false;
  static PADDING = 0.5;

  @Input() postHashHex: string;
  @Input() post: PostEntryResponse;
  @Output() closeModal = new EventEmitter<any>();
  @Output() changeTitle = new EventEmitter<string>();

  bidAmountDeSo: number;
  bidAmountUSD: number;
  selectedSerialNumber: NFTEntryResponse = null;
  availableCount: number;
  availableSerialNumbers: NFTEntryResponse[];
  biddableSerialNumbers: NFTEntryResponse[];
  highBid: number = null;
  lowBid: number = null;
  loading = true;
  isSelectingSerialNumber = true;
  saveSelectionDisabled = false;
  showSelectedSerialNumbers = false;
  placingBids: boolean = false;
  errors: string[] = [];
  SN_FIELD = "SerialNumber";
  HIGH_BID_FIELD = "HighestBidAmountNanos";
  MIN_BID_FIELD = "MinBidAmountNanos";
  sortByField = this.SN_FIELD;
  sortByOrder: "desc" | "asc" = "asc";
  minBidCurrency: string = "USD";
  minBidInput: number = 0;

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private modalService: BsModalService,
    private router: Router,
    private toastr: ToastrService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.backendApi
      .GetNFTCollectionSummary(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        this.post.PostHashHex
      )
      .subscribe((res) => {
        this.availableSerialNumbers = _.values(res.SerialNumberToNFTEntryResponse);
        this.availableCount = res.NFTCollectionResponse.PostEntryResponse.NumNFTCopiesForSale;
        this.biddableSerialNumbers = _.orderBy(
          this.availableSerialNumbers.filter(
            (nftEntryResponse) =>
              nftEntryResponse.OwnerPublicKeyBase58Check !== this.globalVars.loggedInUser.PublicKeyBase58Check
          ),
          [this.sortByField],
          [this.sortByOrder]
        );
      })
      .add(() => (this.loading = false));
  }

  updateBidAmountUSD(deSoAmount) {
    this.bidAmountUSD = parseFloat(this.globalVars.nanosToUSDNumber(deSoAmount * 1e9).toFixed(2));
    this.setErrors();
  }

  updateBidAmountDeSo(usdAmount) {
    this.bidAmountDeSo = Math.trunc(this.globalVars.usdToNanosNumber(usdAmount)) / 1e9;
    this.setErrors();
  }

  setErrors(): void {
    this.errors = [];
    if (this.bidAmountDeSo * 1e9 > this.globalVars.loggedInUser.BalanceNanos) {
      this.errors.push(`You do not have ${this.bidAmountDeSo} DESO to fulfill this bid.`);
    }
    if (this.bidAmountDeSo * 1e9 === 0) {
      this.errors.push(`You must bid more than 0 DESO`);
    } else if (this.selectedSerialNumber?.MinBidAmountNanos > this.bidAmountDeSo * 1e9) {
      this.errors.push(
        `Your bid does not meet the minimum bid requirement of ${this.globalVars.nanosToDeSo(
          this.selectedSerialNumber.MinBidAmountNanos
        )} DESO (${this.globalVars.nanosToUSD(this.selectedSerialNumber.MinBidAmountNanos, 2)})`
      );
    }
  }

  placeBid() {
    this.setErrors();
    if (this.errors.length) {
      return;
    }
    this.saveSelectionDisabled = true;
    this.placingBids = true;
    this.backendApi
      .CreateNFTBid(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        this.post.PostHashHex,
        this.selectedSerialNumber.SerialNumber,
        Math.trunc(this.bidAmountDeSo * 1e9),
        this.globalVars.defaultFeeRateNanosPerKB
      )
      .subscribe(
        (res) => {
          if (!this.globalVars.isMobile()) {
            // Hide this modal and open the next one.
            this.closeModal.emit("bid placed");
          } else {
            this.location.back();
          }
          this.showToast();
        },
        (err) => {
          console.error(err);
          this.globalVars._alertError(this.backendApi.parseMessageError(err));
        }
      )
      .add(() => {
        this.placingBids = false;
        this.saveSelectionDisabled = false;
      });
  }

  openBuyDeSoModal() {
    this.modalService.show(BuyDesoModalComponent, {
      class: "modal-dialog-centered buy-deso-modal",
      backdrop: "static",
    });
  }

  navigateToBuyDeSo(): void {
    this.closeModal.emit();
    this.openBuyDeSoModal();
  }

  showToast(): void {
    const link = `/${this.globalVars.RouteNames.NFT}/${this.post.PostHashHex}`;
    this.toastr.show(`Bid placed<a href="${link}" class="toast-link cursor-pointer">View</a>`, null, {
      toastClass: "info-toast",
      enableHtml: true,
      positionClass: "toast-bottom-center",
    });
  }

  saveSelection(): void {
    if (!this.saveSelectionDisabled) {
      this.isSelectingSerialNumber = false;
      this.showSelectedSerialNumbers = true;
      this.changeTitle.emit("Set your bid");
      this.highBid = this.selectedSerialNumber.HighestBidAmountNanos;
      this.lowBid = this.selectedSerialNumber.LowestBidAmountNanos;
      this.setErrors();
    }
  }

  goBackToSerialSelection(): void {
    this.isSelectingSerialNumber = true;
    this.showSelectedSerialNumbers = false;
    this.changeTitle.emit("Choose an edition");
    this.highBid = null;
    this.lowBid = null;
    this.selectedSerialNumber = null;
  }

  selectSerialNumber(idx: number) {
    this.selectedSerialNumber = this.availableSerialNumbers.find((sn) => sn.SerialNumber === idx);
    this.saveSelection();
  }

  deselectSerialNumber() {
    if (this.placingBids) {
      return;
    }
    this.selectedSerialNumber = null;
    this.showSelectedSerialNumbers = false;
    this.highBid = null;
    this.lowBid = null;
    this.setErrors();
  }

  lastPage = null;

  getPage(page: number) {
    if (this.lastPage != null && page > this.lastPage) {
      return [];
    }
    const startIdx = page * PlaceBidComponent.PAGE_SIZE;
    const endIdx = (page + 1) * PlaceBidComponent.PAGE_SIZE;

    return new Promise((resolve, reject) => {
      resolve(this.biddableSerialNumbers.slice(startIdx, Math.min(endIdx, this.biddableSerialNumbers.length)));
    });
  }

  updateBidSort(sortField: string) {
    if (this.sortByField === sortField) {
      this.sortByOrder = this.sortByOrder === "asc" ? "desc" : "asc";
    } else {
      this.sortByOrder = "asc";
    }
    this.sortByField = sortField;
    this.biddableSerialNumbers = _.orderBy(this.biddableSerialNumbers, [this.sortByField], [this.sortByOrder]);
  }

  bidAmountUSDFormatted() {
    return isNumber(this.bidAmountUSD) ? `~${this.globalVars.formatUSD(this.bidAmountUSD, 0)}` : "";
  }

  bidAmountDeSoFormatted() {
    return isNumber(this.bidAmountDeSo) ? `~${this.bidAmountDeSo.toFixed(2)} $DESO` : "";
  }

  bidAmountOtherCurrencyFormatted() {
    if (this.minBidCurrency === "DESO") {
      return this.bidAmountUSDFormatted();
    } else {
      return this.bidAmountDeSoFormatted();
    }
  }

  updateBidAmount(amount: number) {
    if (this.minBidCurrency === "DESO") {
      this.bidAmountDeSo = amount;
      this.updateBidAmountUSD(amount);
    } else {
      this.bidAmountUSD = amount;
      this.updateBidAmountDeSo(amount);
    }
  }
}
