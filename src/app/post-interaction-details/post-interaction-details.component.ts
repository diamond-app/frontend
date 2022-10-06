import { Component, Input } from "@angular/core";
import { Router } from "@angular/router";
import { BsModalService } from "ngx-bootstrap/modal";
import { PostEntryResponse } from "src/app/backend-api.service";
import { DiamondsModalComponent } from "src/app/diamonds-details/diamonds-modal/diamonds-modal.component";
import { GlobalVarsService } from "src/app/global-vars.service";
import { LikesModalComponent } from "src/app/likes-details/likes-modal/likes-modal.component";
import { QuoteRepostsModalComponent } from "src/app/quote-reposts-details/quote-reposts-modal/quote-reposts-modal.component";
import { RepostsModalComponent } from "src/app/reposts-details/reposts-modal/reposts-modal.component";

@Component({
  selector: "post-interaction-details",
  templateUrl: "./post-interaction-details.component.html",
  styleUrls: ["./post-interaction-details.component.scss"],
})
export class PostInteractionDetailsComponent {
  @Input() post: PostEntryResponse;

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

  openLikesPage(event): void {
    if (this.post.LikeCount) {
      this.openInteractionPage(event, this.globalVars.RouteNames.LIKES, LikesModalComponent);
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
