import { Location } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Router } from "@angular/router";
import { isNumber } from "lodash";
import { BsModalService } from "ngx-bootstrap/modal";
import { ToastrService } from "ngx-toastr";
import { TrackingService } from "src/app/tracking.service";
import { BackendApiService } from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";
import { NFTEntryResponse, PostEntryResponse } from "deso-protocol";

@Component({
  selector: "transfer-nft-accept",
  templateUrl: "./transfer-nft-accept.component.html",
})
export class TransferNftAcceptComponent {
  static PAGE_SIZE = 50;
  static BUFFER_SIZE = 10;
  static WINDOW_VIEWPORT = false;
  static PADDING = 0.5;

  @Input() postHashHex: string;
  @Input() post: PostEntryResponse;
  @Input() transferNFTEntryResponses: NFTEntryResponse[];
  @Output() closeModal = new EventEmitter<any>();
  @Output() changeTitle = new EventEmitter<string>();

  bidAmountDeSo: number;
  bidAmountUSD: number;
  selectedSerialNumber: NFTEntryResponse = null;
  highBid: number = null;
  lowBid: number = null;
  loading = false;
  isSelectingSerialNumber = true;
  saveSelectionDisabled = false;
  showSelectedSerialNumbers = false;
  acceptingTransfer: boolean = false;
  errors: string[] = [];
  minBidCurrency: string = "USD";
  minBidInput: number = 0;
  transferringUser: string;

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private modalService: BsModalService,
    private router: Router,
    private toastr: ToastrService,
    private location: Location,
    private tracking: TrackingService
  ) {}

  acceptTransfer() {
    this.saveSelectionDisabled = true;
    this.acceptingTransfer = true;
    this.backendApi
      .AcceptNFTTransfer(
        this.globalVars.loggedInUser?.PublicKeyBase58Check,
        this.post.PostHashHex,
        this.selectedSerialNumber.SerialNumber
      )
      .subscribe(
        (res) => {
          this.tracking.log("nft : accept", {
            postHashHex: this.post.PostHashHex,
            authorUsername: this.post.ProfileEntryResponse?.Username,
            authorPublicKey: this.post.ProfileEntryResponse?.PublicKeyBase58Check,
            hasText: this.post.Body.length > 0,
            hasImage: (this.post.ImageURLs?.length ?? 0) > 0,
            hasVideo: (this.post.VideoURLs?.length ?? 0) > 0,
            hasEmbed: !!this.post.PostExtraData?.EmbedVideoURL,
            hasUnlockable: this.post.HasUnlockable,
          });
          if (!this.globalVars.isMobile()) {
            // Hide this modal and open the next one.
            this.closeModal.emit("transfer accepted");
          } else {
            this.location.back();
          }
          this.toastr.show("Your transfer was completed", null, {
            toastClass: "info-toast",
            positionClass: "toast-bottom-center",
          });
        },
        (err) => {
          console.error(err);
          this.tracking.log("nft : accept", {
            error: err.error?.error,
          });
        }
      )
      .add(() => {
        this.acceptingTransfer = false;
        this.saveSelectionDisabled = false;
      });
  }

  saveSelection(): void {
    if (!this.saveSelectionDisabled) {
      this.isSelectingSerialNumber = false;
      this.showSelectedSerialNumbers = true;
      this.changeTitle.emit("Confirm Transfer");
      this.highBid = this.selectedSerialNumber.HighestBidAmountNanos;
      this.lowBid = this.selectedSerialNumber.LowestBidAmountNanos;
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

  selectSerialNumber(serialNumber: NFTEntryResponse) {
    this.selectedSerialNumber = serialNumber;
    this.backendApi.GetSingleProfile(this.selectedSerialNumber.LastOwnerPublicKeyBase58Check, "").subscribe((res) => {
      if (res && !res.IsBlacklisted) {
        this.transferringUser = res.Profile?.Username;
      }
    });
    this.saveSelection();
  }

  bidAmountUSDFormatted() {
    return isNumber(this.bidAmountUSD) ? `~${this.globalVars.formatUSD(this.bidAmountUSD, 0)}` : "";
  }

  bidAmountDeSoFormatted() {
    return isNumber(this.bidAmountDeSo) ? `~${this.bidAmountDeSo.toFixed(2)} $DESO` : "";
  }
}
