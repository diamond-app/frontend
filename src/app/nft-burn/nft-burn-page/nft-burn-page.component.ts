import { Component, Input, OnInit } from "@angular/core";
import { NFTEntryResponse, PostEntryResponse } from "../../backend-api.service";
import { ActivatedRoute, Router } from "@angular/router";
import { GlobalVarsService } from "../../global-vars.service";

@Component({
  selector: "nft-burn-modal",
  templateUrl: "./nft-burn-page.component.html",
  styleUrls: ["./nft-burn-page.component.scss"],
})
export class NftBurnPageComponent implements OnInit {
  isLeftBarMobileOpen: boolean = false;
  title: string = "Choose an edition";
  postHashHex: string;
  post: PostEntryResponse;
  burnNFTEntryResponses: NFTEntryResponse[];

  constructor(private globalVars: GlobalVarsService, private router: Router, public activatedRoute: ActivatedRoute) {}

  ngOnInit(): void {
    const state = window.history.state;
    // If the state is lost, redirect back to the post found in the url params.
    if (!state?.post) {
      this.router.navigate([
        "/" + this.globalVars.RouteNames.NFT + "/" + this.activatedRoute.snapshot.params["postHashHex"],
      ]);
      return;
    }
    this.post = state.post;
    this.burnNFTEntryResponses = state.burnNFTEntryResponses;
    this.postHashHex = this.activatedRoute.snapshot.params["postHashHex"];
  }
}
