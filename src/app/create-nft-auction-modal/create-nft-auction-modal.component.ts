import { Component, Input } from "@angular/core";
import { BsModalRef } from "ngx-bootstrap/modal";
import { GlobalVarsService } from "../global-vars.service";
import { BackendApiService, NFTEntryResponse, PostEntryResponse } from "../backend-api.service";
import { concatMap, last, map } from "rxjs/operators";
import { of } from "rxjs";
import { Router } from "@angular/router";
import { isNumber } from "lodash";

@Component({
  selector: "create-nft-auction",
  templateUrl: "./create-nft-auction-modal.component.html",
})
export class CreateNftAuctionModalComponent {
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
  minBidInput: number = 0;

  constructor(
    private backendApi: BackendApiService,
    public globalVars: GlobalVarsService,
    public bsModalRef: BsModalRef,
    private router: Router
  ) {}

  updateMinBidAmountUSD(desoAmount) {
    this.minBidAmountUSD = this.globalVars.nanosToUSDNumber(desoAmount * 1e9);
  }

  updateMinBidAmountDESO(usdAmount) {
    this.minBidAmountDESO = Math.trunc(this.globalVars.usdToNanosNumber(usdAmount)) / 1e9;
  }

  minBidAmountUSDFormatted() {
    return isNumber(this.minBidAmountUSD) ? `~${this.globalVars.formatUSD(this.minBidAmountUSD, 0)}` : "";
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

  auctionTotal: number;
  auctionCounter: number = 0;
  createAuction() {
    this.auctionTotal = this.selectedSerialNumbers.filter((res) => res).length;
    this.creatingAuction = true;
    of(...this.selectedSerialNumbers.map((isSelected, index) => (isSelected ? index : -1)))
      .pipe(
        concatMap((val) => {
          if (val >= 0) {
            return this.backendApi
              .UpdateNFT(
                this.globalVars.localNode,
                this.globalVars.loggedInUser.PublicKeyBase58Check,
                this.post.PostHashHex,
                val,
                true,
                this.isBuyNow,
                Math.trunc(this.minBidAmountDESO * 1e9),
                this.globalVars.defaultFeeRateNanosPerKB
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
          this.router.navigate(["/" + this.globalVars.RouteNames.NFT + "/" + this.post.PostHashHex]);
          this.bsModalRef.hide();
        },
        (err) => {
          console.error(err);
          this.globalVars._alertError(this.backendApi.parseMessageError(err));
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

  toggleSelectAll() {
    this.selectAll = !this.selectAll;
    this.mySerialNumbersNotForSale().forEach(
      (nftEntryResponse) => (this.selectedSerialNumbers[nftEntryResponse.SerialNumber] = this.selectAll)
    );
  }

  createAuctionDisabled(): boolean {
    return !this.selectedSerialNumbers.filter((isSelected) => isSelected)?.length;
  }

  selectSerialNumber(idx: number): void {
    this.selectAll = false;
    for (let ii = 0; ii < this.selectedSerialNumbers.length; ii++) {
      this.selectedSerialNumbers[ii] = ii === idx;
    }
  }
}
