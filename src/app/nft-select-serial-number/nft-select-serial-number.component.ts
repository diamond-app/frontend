import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from "@angular/core";
import { GlobalVarsService } from "../global-vars.service";
import { BackendApiService, NFTEntryResponse } from "../backend-api.service";
import * as _ from "lodash";
import { Location } from "@angular/common";
import { ToastrService } from "ngx-toastr";

@Component({
  selector: "nft-select-serial-number",
  templateUrl: "./nft-select-serial-number.component.html",
})
export class NftSelectSerialNumberComponent implements OnInit, OnChanges {
  static PAGE_SIZE = 50;
  static BUFFER_SIZE = 10;
  static WINDOW_VIEWPORT = false;
  static PADDING = 0.5;

  @Input() serialNumbers: NFTEntryResponse[];
  // Which columns should be included. The string value determines what the column should be labeled
  @Input() columns: { high?: string; min?: string, buyNow?: string } = { high: "Highest Bid", min: "Min Bid Amount" };
  @Input() postHashHex: string;
  @Input() nftCreatorPublicKeyBase58Check: string;
  @Output() serialNumberSelected = new EventEmitter<NFTEntryResponse>();
  @Output() closeModal = new EventEmitter<any>();

  SN_FIELD = "SerialNumber";
  HIGH_BID_FIELD = "HighestBidAmountNanos";
  MIN_BID_FIELD = "MinBidAmountNanos";
  BUY_NOW_PRICE_FIELD = "BuyNowPriceNanos";
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
    if ("buyNow" in this.columns) {
      this.sortByField = this.BUY_NOW_PRICE_FIELD;
      this.sortByOrder = "asc";
      this.sortedSerialNumbers = _.orderBy(
        this.serialNumbers,
        [this.BUY_NOW_PRICE_FIELD, this.SN_FIELD],
        [this.sortByOrder, this.sortByOrder]
      );
    } else {
      this.updateBidSort(this.SN_FIELD);
    }
  }

  // Update data when serialNumbers input changes
  ngOnChanges() {
    this.sortByOrder = this.sortByOrder === "desc" ? "asc" : "desc";
    this.updateBidSort(this.SN_FIELD);
  }

  includeColumn(columnKey: string) {
    return columnKey in this.columns;
  }

  columnCount() {
    const subtraction = "secondaryIndicator" in this.columns ? 1 : 0
    return Object.keys(this.columns).length - subtraction;
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

  showToast(serialNumber: number): void {
    const link = `/${this.globalVars.RouteNames.NFT}/${this.postHashHex}`;
    this.toastr.show(
      `SerialNumber #${serialNumber} Purchased<a href="${link}" class="toast-link cursor-pointer">View</a>`,
      null,
      {
        toastClass: "info-toast",
        enableHtml: true,
        positionClass: "toast-bottom-center",
        disableTimeOut: "extendedTimeOut",
      }
    );
  }
}
