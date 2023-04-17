import { Component, Input, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { TranslocoService } from "@ngneat/transloco";
import { filter, isNumber } from "lodash";
import { BsModalRef } from "ngx-bootstrap/modal";
import { of } from "rxjs";
import { concatMap, last, map } from "rxjs/operators";
import { TrackingService } from "src/app/tracking.service";
import { BackendApiService } from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";
import { NFTEntryResponse, PostEntryResponse } from "deso-protocol";

@Component({
  selector: "create-nft-auction",
  templateUrl: "./create-nft-auction-modal.component.html",
})
export class CreateNftAuctionModalComponent implements OnInit {
  @Input() postHashHex: string;
  @Input() post: PostEntryResponse;
  @Input() nftEntryResponses: NFTEntryResponse[];
  loading = false;
  minBidAmountUSD: number;
  minBidAmountDESO: number;
  selectedSerialNumbers: boolean[] = [];
  selectAll: boolean = false;
  creatingAuction: boolean = false;
  isBuyNow: boolean = false;
  minBidCurrency: string = "USD";
  buyNowCurrency: string = "USD";
  minBidInput: number = 0;
  buyNowInput: number = 0;
  buyNowPriceUSD: number = 0;
  buyNowPriceDESO: number = 0;

  constructor(
    private backendApi: BackendApiService,
    public globalVars: GlobalVarsService,
    public bsModalRef: BsModalRef,
    private router: Router,
    private translocoService: TranslocoService,
    private tracking: TrackingService
  ) {}

  ngOnInit() {
    this.initializeSelectedSerialNumbers();
  }

  updateMinBidAmountUSD(desoAmount) {
    this.minBidAmountUSD = this.globalVars.nanosToUSDNumber(desoAmount * 1e9);
  }

  updateMinBidAmountDESO(usdAmount) {
    this.minBidAmountDESO = Math.trunc(this.globalVars.usdToNanosNumber(usdAmount)) / 1e9;
  }

  minBidAmountUSDFormatted() {
    return isNumber(this.minBidAmountUSD) ? `~${this.globalVars.formatUSD(this.minBidAmountUSD, 0)}` : "";
  }

  buyNowPriceUSDFormatted() {
    return isNumber(this.buyNowPriceUSD) ? `~${this.globalVars.formatUSD(this.buyNowPriceUSD, 0)}` : "";
  }

  updateBuyNowPrice(amount: number) {
    if (this.buyNowCurrency === "DESO") {
      this.buyNowPriceDESO = amount;
      this.updateBuyNowPriceUSD(amount);
    } else {
      this.buyNowPriceUSD = amount;
      this.updateBuyNowPriceDESO(amount);
    }
  }

  updateBuyNowPriceUSD(desoAmount): void {
    this.buyNowPriceUSD = this.globalVars.nanosToUSDNumber(desoAmount * 1e9);
  }

  updateBuyNowPriceDESO(usdAmount): void {
    this.buyNowPriceDESO = Math.trunc(this.globalVars.usdToNanosNumber(usdAmount)) / 1e9;
  }

  updateBuyNowStatus(isBuyNow: boolean): void {
    if (!isBuyNow) {
      this.buyNowPriceDESO = 0;
      this.buyNowPriceUSD = 0;
    }
  }

  updateMinBidAmount(amount: number) {
    if (this.minBidCurrency === "DESO") {
      this.minBidAmountDESO = amount;
      this.updateMinBidAmountUSD(amount);
    } else {
      this.minBidAmountUSD = amount;
      this.updateMinBidAmountDESO(amount);
    }
  }

  createAuctionText() {
    const textKey = this.creatingAuction
      ? "create_nft_auction_modal.creating_auction"
      : "create_nft_auction_modal.create_auction";
    return this.translocoService.translate(textKey);
  }

  auctionTotal: number;
  auctionCounter: number = 0;
  createAuction() {
    this.auctionTotal = this.selectedSerialNumbers.filter((res) => res).length;
    this.creatingAuction = true;
    of(
      ...filter(
        this.selectedSerialNumbers.map((isSelected, index) => (isSelected ? index : -1)),
        (index) => index >= 0
      )
    )
      .pipe(
        concatMap((val) => {
          if (val >= 0) {
            return this.backendApi
              .UpdateNFT(
                this.globalVars.loggedInUser?.PublicKeyBase58Check,
                this.post.PostHashHex,
                val + 1,
                true,
                Math.trunc(this.minBidAmountDESO * 1e9),
                this.isBuyNow,
                Math.trunc(this.buyNowPriceDESO * 1e9)
              )
              .pipe(
                map((res) => {
                  this.auctionCounter++;
                  return res;
                })
              );
          } else {
            return of("");
          }
        })
      )
      .pipe(last((res) => res))
      .subscribe(
        (res) => {
          this.tracking.log("nft-auction : create", {
            postHashHex: this.post.PostHashHex,
            authorUsername: this.post.ProfileEntryResponse?.Username,
            authorPublicKey: this.post.ProfileEntryResponse?.PublicKeyBase58Check,
            hasText: this.post.Body.length > 0,
            hasImage: (this.post.ImageURLs?.length ?? 0) > 0,
            hasVideo: (this.post.VideoURLs?.length ?? 0) > 0,
            hasEmbed: !!this.post.PostExtraData?.EmbedVideoURL,
            hasUnlockable: this.post.HasUnlockable,
          });
          this.bsModalRef.hide();
          this.router.navigate(["/" + this.globalVars.RouteNames.NFT + "/" + this.post.PostHashHex]);
        },
        (err) => {
          console.error(err);
          const parsedError = this.backendApi.parseMessageError(err);
          this.globalVars._alertError(parsedError);
          this.tracking.log("nft-auction : create", { error: parsedError });
        }
      )
      .add(() => (this.creatingAuction = false));
  }

  mySerialNumbersNotForSale(): NFTEntryResponse[] {
    return this.nftEntryResponses.filter(
      (nftEntryResponse) =>
        !nftEntryResponse.IsForSale &&
        nftEntryResponse.OwnerPublicKeyBase58Check === this.globalVars.loggedInUser?.PublicKeyBase58Check
    );
  }

  toggleSelectAll(event) {
    event.stopPropagation();
    const selectedNFTs = this.selectedSerialNumbers.filter((serialNumber) => serialNumber);
    const selectAll = selectedNFTs.length !== this.mySerialNumbersNotForSale().length;
    this.mySerialNumbersNotForSale().forEach(
      (nftEntryResponse) => (this.selectedSerialNumbers[nftEntryResponse.SerialNumber - 1] = selectAll)
    );
  }

  createAuctionDisabled(): boolean {
    return !this.selectedSerialNumbers.filter((isSelected) => isSelected)?.length;
  }

  initializeSelectedSerialNumbers() {
    this.selectedSerialNumbers = [];
    for (let ii = 0; ii < this.nftEntryResponses.length; ii++) {
      this.selectedSerialNumbers.push(false);
    }
  }

  selectSerialNumber(idx: number): void {
    this.selectedSerialNumbers[idx - 1] = !this.selectedSerialNumbers[idx - 1];
  }
}
