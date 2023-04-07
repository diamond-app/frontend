import { Component, Input } from "@angular/core";
import { BsModalRef, BsModalService } from "ngx-bootstrap/modal";
import { of } from "rxjs";
import { concatMap, last, map } from "rxjs/operators";
import { TrackingService } from "src/app/tracking.service";
import { BackendApiService, NFTEntryResponse, PostEntryResponse } from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";

@Component({
  selector: "close-nft-auction-modal",
  templateUrl: "./close-nft-auction-modal.component.html",
})
export class CloseNftAuctionModalComponent {
  @Input() post: PostEntryResponse;
  @Input() myAvailableSerialNumbers: NFTEntryResponse[];

  closingAuction: boolean = false;

  constructor(
    public bsModalRef: BsModalRef,
    private modalService: BsModalService,
    private backendApi: BackendApiService,
    private globalVars: GlobalVarsService,
    private tracking: TrackingService
  ) {}

  auctionTotal: number;
  auctionCounter: number = 0;
  closeAuction(): void {
    this.closingAuction = true;
    this.auctionTotal = this.myAvailableSerialNumbers.length;
    of(...this.myAvailableSerialNumbers)
      .pipe(
        concatMap((nftEntry) => {
          return this.backendApi
            .UpdateNFT(
              this.globalVars.loggedInUser?.PublicKeyBase58Check,
              this.post.PostHashHex,
              nftEntry.SerialNumber,
              false,
              nftEntry.MinBidAmountNanos,
              false,
              0
            )
            .pipe(
              map((res) => {
                this.auctionCounter++;
                return res;
              })
            );
        })
      )
      .pipe(last((res) => res))
      .subscribe(
        (res) => {
          this.tracking.log("nft-auction : close", {
            postHashHex: this.post.PostHashHex,
            authorUsername: this.post.ProfileEntryResponse?.Username,
            authorPublicKey: this.post.ProfileEntryResponse?.PublicKeyBase58Check,
            hasText: this.post.Body.length > 0,
            hasImage: (this.post.ImageURLs?.length ?? 0) > 0,
            hasVideo: (this.post.VideoURLs?.length ?? 0) > 0,
            hasEmbed: !!this.post.PostExtraData?.EmbedVideoURL,
            hasUnlockable: this.post.HasUnlockable,
          });
          // Hide this modal and open the next one.
          this.bsModalRef.hide();
          this.modalService.setDismissReason("auction cancelled");
        },
        (err) => {
          console.error(err);
          const parsedError = this.backendApi.parseMessageError(err);
          this.globalVars._alertError(this.backendApi.parseMessageError(err));
          this.tracking.log("nft-auction : close", {
            error: parsedError,
          });
        }
      )
      .add(() => (this.closingAuction = false));
  }
}
