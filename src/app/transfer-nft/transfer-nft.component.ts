import { Location } from "@angular/common";
import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { Router } from "@angular/router";
import * as _ from "lodash";
import { BsModalService } from "ngx-bootstrap/modal";
import { ToastrService } from "ngx-toastr";
import { TrackingService } from "src/app/tracking.service";
import { SwalHelper } from "../../lib/helpers/swal-helper";
import { BackendApiService } from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";
import { NFTEntryResponse, PostEntryResponse, ProfileEntryResponse } from "deso-protocol";
import { isNil } from "lodash";

@Component({
  selector: "transfer-nft",
  templateUrl: "./transfer-nft.component.html",
})
export class TransferNftComponent implements OnInit {
  static PAGE_SIZE = 50;
  static BUFFER_SIZE = 10;
  static WINDOW_VIEWPORT = false;
  static PADDING = 0.5;

  @Input() postHashHex: string;
  @Input() post: PostEntryResponse;
  @Output() closeModal = new EventEmitter<any>();
  @Output() changeTitle = new EventEmitter<string>();

  selectedSerialNumber: NFTEntryResponse = null;
  loading = true;
  transferringNFT: boolean = false;
  isSelectingSerialNumber = true;
  saveSelectionDisabled = false;
  showSelectedSerialNumbers = false;
  transferableSerialNumbers: NFTEntryResponse[];
  SN_FIELD = "SerialNumber";
  LAST_PRICE_FIELD = "LastAcceptedBidAmountNanos";
  sortByField = this.SN_FIELD;
  sortByOrder: "desc" | "asc" = "asc";
  selectedCreator: ProfileEntryResponse;
  unlockableText: string = "";

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private modalService: BsModalService,
    private router: Router,
    private toastr: ToastrService,
    private location: Location,
    private tracking: TrackingService
  ) {}

  ngOnInit(): void {
    this.backendApi
      .GetNFTEntriesForNFTPost(this.globalVars.loggedInUser?.PublicKeyBase58Check, this.post.PostHashHex)
      .subscribe((res) => {
        this.transferableSerialNumbers = _.orderBy(
          res.NFTEntryResponses.filter(
            (nftEntryResponse) =>
              nftEntryResponse.OwnerPublicKeyBase58Check === this.globalVars.loggedInUser?.PublicKeyBase58Check &&
              !nftEntryResponse.IsPending &&
              !nftEntryResponse.IsForSale
          ),
          [this.sortByField],
          [this.sortByOrder]
        );
      })
      .add(() => (this.loading = false));
  }

  transferNFT() {
    this.saveSelectionDisabled = true;
    this.transferringNFT = true;
    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      title: "Transfer NFT",
      html: `You are about to transfer this NFT to ${
        this.selectedCreator?.Username || this.selectedCreator?.PublicKeyBase58Check
      }`,
      showConfirmButton: true,
      showCancelButton: true,
      reverseButtons: true,
      customClass: {
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
      confirmButtonText: "Ok",
      cancelButtonText: "Cancel",
    }).then((res) => {
      if (res.isConfirmed) {
        this.backendApi
          .TransferNFT(
            this.globalVars.loggedInUser?.PublicKeyBase58Check,
            this.selectedCreator?.PublicKeyBase58Check,
            this.post.PostHashHex,
            this.selectedSerialNumber?.SerialNumber,
            this.unlockableText,
            this.globalVars.defaultFeeRateNanosPerKB
          )
          .subscribe(
            (res) => {
              this.tracking.log("nft : transfer", {
                postHashHex: this.post.PostHashHex,
                authorUsername: this.post.ProfileEntryResponse?.Username,
                authorPublicKey: this.post.ProfileEntryResponse?.PublicKeyBase58Check,
                hasText: this.post.Body.length > 0,
                hasImage: (this.post.ImageURLs?.length ?? 0) > 0,
                hasVideo: (this.post.VideoURLs?.length ?? 0) > 0,
                hasEmbed: !!this.post.PostExtraData?.EmbedVideoURL,
                receiverPublicKey: this.selectedCreator?.PublicKeyBase58Check,
                receiverUsername: this.selectedCreator?.Username,
                hasUnlockable: this.post.HasUnlockable,
              });
              if (!this.globalVars.isMobile()) {
                // Hide this modal and open the next one.
                this.closeModal.emit("nft transferred");
              } else {
                this.location.back();
              }
              this.showToast();
            },
            (err) => {
              console.error(err);
              const parsedError = this.backendApi.parseMessageError(err);
              this.globalVars._alertError(parsedError);
              this.tracking.log("nft : transfer", { error: parsedError });
            }
          )
          .add(() => {
            this.transferringNFT = false;
            this.saveSelectionDisabled = false;
          });
      } else {
        this.transferringNFT = false;
        this.saveSelectionDisabled = false;
      }
    });
  }

  showToast(): void {
    const link = `/${this.globalVars.RouteNames.NFT}/${this.post.PostHashHex}`;
    this.toastr.show(`NFT Transferred<a href="${link}" class="toast-link cursor-pointer">View</a>`, null, {
      toastClass: "info-toast",
      enableHtml: true,
      positionClass: "toast-bottom-center",
    });
  }

  saveSelection(): void {
    if (!this.saveSelectionDisabled) {
      this.isSelectingSerialNumber = false;
      this.showSelectedSerialNumbers = true;
      this.changeTitle.emit("Transfer NFT");
    }
  }

  goBackToSerialSelection(): void {
    this.isSelectingSerialNumber = true;
    this.showSelectedSerialNumbers = false;
    this.changeTitle.emit("Choose an edition");
    this.selectedSerialNumber = null;
  }

  selectSerialNumber(serialNumber: NFTEntryResponse) {
    this.selectedSerialNumber = serialNumber;
    this.saveSelection();
  }

  deselectSerialNumber() {
    if (this.transferringNFT) {
      return;
    }
    this.selectedSerialNumber = null;
    this.showSelectedSerialNumbers = false;
  }

  lastPage = null;

  getPage(page: number) {
    if (!isNil(this.lastPage) && page > this.lastPage) {
      return [];
    }
    const startIdx = page * TransferNftComponent.PAGE_SIZE;
    const endIdx = (page + 1) * TransferNftComponent.PAGE_SIZE;

    return new Promise((resolve, reject) => {
      resolve(this.transferableSerialNumbers.slice(startIdx, Math.min(endIdx, this.transferableSerialNumbers.length)));
    });
  }

  updateSort(sortField: string) {
    if (this.sortByField === sortField) {
      this.sortByOrder = this.sortByOrder === "asc" ? "desc" : "asc";
    } else {
      this.sortByOrder = "asc";
    }
    this.sortByField = sortField;
    this.transferableSerialNumbers = _.orderBy(
      this.transferableSerialNumbers,
      [this.sortByField],
      [this.sortByOrder]
    ) as Array<NFTEntryResponse>;
  }

  _selectCreator(selectedCreator: ProfileEntryResponse) {
    this.selectedCreator = selectedCreator;
  }
}
