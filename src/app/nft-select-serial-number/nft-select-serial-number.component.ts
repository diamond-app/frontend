import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";
import { GlobalVarsService } from "../global-vars.service";
import { BackendApiService, NFTEntryResponse } from "../backend-api.service";
import * as _ from "lodash";
import { Location } from "@angular/common";
import { ToastrService } from "ngx-toastr";

@Component({
  selector: "nft-select-serial-number",
  templateUrl: "./nft-select-serial-number.component.html",
})
export class NftSelectSerialNumberComponent implements OnInit {
  static PAGE_SIZE = 50;
  static BUFFER_SIZE = 10;
  static WINDOW_VIEWPORT = false;
  static PADDING = 0.5;

  @Input() serialNumbers: NFTEntryResponse[];
  @Input() showBuyNowButton: boolean = false;
  @Input() postHashHex: string;
  @Output() serialNumberSelected = new EventEmitter<NFTEntryResponse>();
  @Output() closeModal = new EventEmitter<any>();

  SN_FIELD = "SerialNumber";
  HIGH_BID_FIELD = "HighestBidAmountNanos";
  MIN_BID_FIELD = "MinBidAmountNanos";
  selectedSerialNumber: NFTEntryResponse = null;
  sortedSerialNumbers: NFTEntryResponse[];
  sortByField = this.SN_FIELD;
  sortByOrder: "desc" | "asc" = "desc";
  buyingNow: boolean = false;

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private location: Location,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.updateBidSort(this.SN_FIELD);
  }

  selectSerialNumber(idx: number) {
    if (this.buyingNow) {
      return;
    }
    this.selectedSerialNumber = this.serialNumbers.find((sn) => sn.SerialNumber === idx);
    this.serialNumberSelected.emit(this.selectedSerialNumber);
  }

  updateBidSort(sortField: string) {
    if (this.sortByField === sortField) {
      this.sortByOrder = this.sortByOrder === "asc" ? "desc" : "asc";
    } else {
      this.sortByOrder = "asc";
    }
    this.sortByField = sortField;
    this.sortedSerialNumbers = _.orderBy(this.serialNumbers, [this.sortByField], [this.sortByOrder]);
  }

  buyNow(nft: NFTEntryResponse, event: Event) {
    if (!nft.IsBuyNow || this.buyingNow) {
      return;
    }
    debugger;
    event.stopPropagation();
    this.buyingNow = true;
    this.backendApi
      .CreateNFTBid(
        this.globalVars.localNode,
        this.globalVars.loggedInUser?.PublicKeyBase58Check,
        this.postHashHex,
        nft.SerialNumber,
        nft.MinBidAmountNanos,
        this.globalVars.defaultFeeRateNanosPerKB
      )
      .subscribe(
        (res) => {
          if (!this.globalVars.isMobile()) {
            // Hide this modal and open the next one.
            this.closeModal.emit("nft purchased");
          } else {
            this.location.back();
          }
          this.showToast(nft.SerialNumber);
        },
        (err) => {
          console.error(err);
          this.globalVars._alertError(this.backendApi.parseMessageError(err));
        }
      )
      .add(() => {
        this.buyingNow = false;
      });
  }

  showToast(serialNumber: number): void {
    const link = `/${this.globalVars.RouteNames.NFT}/${this.postHashHex}`;
    this.toastr.show(
      `SerialNumber #${serialNumber} Purchased<a href="${link}" class="toast-link cursor-pointer">View</a>`,
      null,
      {
        toastClass: "info-toast",
        enableHtml: true,
        positionClass: "toast-bottom-center",
      }
    );
  }
}
