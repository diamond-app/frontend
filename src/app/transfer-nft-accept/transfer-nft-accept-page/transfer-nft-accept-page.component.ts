import { Component, Input, OnInit } from "@angular/core";
import { NFTEntryResponse, PostEntryResponse } from "../../backend-api.service";
import { ActivatedRoute, Router } from "@angular/router";
import { GlobalVarsService } from "../../global-vars.service";

@Component({
  selector: "transfer-nft-accept-modal",
  templateUrl: "./transfer-nft-accept-page.component.html",
  styleUrls: ["./transfer-nft-accept-page.component.scss"],
})
export class TransferNftAcceptPageComponent implements OnInit {
  isLeftBarMobileOpen: boolean = false;
  title: string = "Choose an edition";
  postHashHex: string;
  post: PostEntryResponse;
  transferNFTEntryResponses: NFTEntryResponse[];

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
    this.transferNFTEntryResponses = state.transferNFTEntryResponses;
    this.postHashHex = this.activatedRoute.snapshot.params["postHashHex"];
  }
}
