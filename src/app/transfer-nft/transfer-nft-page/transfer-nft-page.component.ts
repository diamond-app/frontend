import { Component, OnInit } from "@angular/core";
import { PostEntryResponse } from "deso-protocol";
import { ActivatedRoute, Router } from "@angular/router";
import { GlobalVarsService } from "../../global-vars.service";
import { PageLayoutService } from "../../../page-layout.service";

@Component({
  selector: "transfer-nft-page",
  templateUrl: "./transfer-nft-page.component.html",
  styleUrls: ["./transfer-nft-page.component.scss"],
})
export class TransferNftPageComponent implements OnInit {
  isLeftBarMobileOpen: boolean = false;
  title: string = "Choose an edition";
  postHashHex: string;
  post: PostEntryResponse;

  constructor(
    private globalVars: GlobalVarsService,
    private router: Router,
    public activatedRoute: ActivatedRoute,
    private pageLayoutService: PageLayoutService
  ) {
    this.pageLayoutService.updateConfig({
      simpleTopBar: true,
      showBottomBar: false,
      title: this.title,
    });
  }

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
    this.postHashHex = this.activatedRoute.snapshot.params["postHashHex"];
  }
}
