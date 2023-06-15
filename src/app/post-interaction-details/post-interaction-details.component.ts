import { Component, Input } from "@angular/core";
import { Router } from "@angular/router";
import { BsModalService } from "ngx-bootstrap/modal";
import { PostEntryResponse, AssociationCountsResponse } from "deso-protocol";
import { GlobalVarsService } from "../global-vars.service";
import { DiamondsModalComponent } from "../diamonds-details/diamonds-modal/diamonds-modal.component";
import { ReactionsModalComponent } from "../reactions-details/reactions-modal/reactions-modal.component";
import { RepostsModalComponent } from "../reposts-details/reposts-modal/reposts-modal.component";
import { QuoteRepostsModalComponent } from "../quote-reposts-details/quote-reposts-modal/quote-reposts-modal.component";

@Component({
  selector: "post-interaction-details",
  templateUrl: "./post-interaction-details.component.html",
  styleUrls: ["./post-interaction-details.component.scss"],
})
export class PostInteractionDetailsComponent {
  @Input() post: PostEntryResponse;
  @Input() postReactionCounts: AssociationCountsResponse;
  @Input() reactionsLoading: boolean = false;

  constructor(public globalVars: GlobalVarsService, private modalService: BsModalService, private router: Router) {}

  openInteractionPage(event, pageName: string, component): void {
    event.stopPropagation();
    if (this.globalVars.isMobile()) {
      this.router.navigate(["/" + this.globalVars.RouteNames.POSTS, this.post.PostHashHex, pageName], {
        queryParamsHandling: "merge",
      });
    } else {
      this.modalService.show(component, {
        class: "modal-dialog-centered",
        initialState: { postHashHex: this.post.PostHashHex },
      });
    }
  }

  openDiamondsPage(event): void {
    if (this.post.DiamondCount) {
      this.openInteractionPage(event, this.globalVars.RouteNames.DIAMONDS, DiamondsModalComponent);
    }
  }

  openReactionsPage(event): void {
    if (this.postReactionCounts.Total) {
      this.openInteractionPage(event, this.globalVars.RouteNames.REACTIONS, ReactionsModalComponent);
    }
  }

  openRepostsPage(event): void {
    if (this.post.RepostCount) {
      this.openInteractionPage(event, this.globalVars.RouteNames.REPOSTS, RepostsModalComponent);
    }
  }

  openQuoteRepostsModal(event): void {
    if (this.post.QuoteRepostCount) {
      this.openInteractionPage(event, this.globalVars.RouteNames.QUOTE_REPOSTS, QuoteRepostsModalComponent);
    }
  }
}
