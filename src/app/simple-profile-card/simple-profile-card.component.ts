import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Router } from "@angular/router";
import { BsModalService } from "ngx-bootstrap/modal";
import { TrackingService } from "src/app/tracking.service";
import { WelcomeModalComponent } from "src/app/welcome-modal/welcome-modal.component";
import { ProfileEntryResponse } from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";
import { TradeCreatorModalComponent } from "../trade-creator-page/trade-creator-modal/trade-creator-modal.component";

@Component({
  selector: "simple-profile-card",
  templateUrl: "./simple-profile-card.component.html",
})
export class SimpleProfileCardComponent {
  @Input() profile: ProfileEntryResponse;
  @Input() diamondLevel = -1;
  @Input() showHeartIcon = false;
  @Input() showRepostIcon = false;
  @Input() containerModalRef: any = null;
  @Input() singleColumn = false;
  @Input() hideFollowLink = false;
  @Input() isBold = true;
  @Input() inTutorial: boolean = false;
  @Input() followButtonOppositeSide: boolean = false;
  @Input() showTutorialBuy: boolean = false;
  @Input() showTutorialFollow: boolean = false;
  @Input() tutorialBuySelf: boolean = false;
  // Whether the "buy" button should wiggle to prompt the user to click it
  @Input() tutorialWiggle = false;
  @Output() exitTutorial = new EventEmitter<any>();
  @Output() onboardingFollowCreator = new EventEmitter<boolean>();
  tutorialFollowing = false;

  constructor(
    public globalVars: GlobalVarsService,
    private router: Router,
    private modalService: BsModalService,
    private tracking: TrackingService
  ) {}

  onboardingFollow() {
    this.tutorialFollowing = !this.tutorialFollowing;
    this.onboardingFollowCreator.emit(this.tutorialFollowing);
  }
  counter(num: number) {
    return Array(num);
  }

  onClick() {
    if (this.inTutorial) {
      return;
    }
    if (this.containerModalRef !== null) {
      this.containerModalRef.hide();
    }
    if (!this.profile.Username) {
      return;
    }
    this.router.navigate(["/" + this.globalVars.RouteNames.USER_PREFIX, this.profile.Username], {
      queryParamsHandling: "merge",
    });
  }

  onBuyClicked() {
    this.tracking.log("buy : creator : select");
    this.router.navigate(
      [
        this.globalVars.RouteNames.TUTORIAL,
        this.globalVars.RouteNames.INVEST,
        this.globalVars.RouteNames.BUY_CREATOR,
        this.profile.Username,
      ],
      { queryParamsHandling: "merge" }
    );
  }

  followCreator(event) {
    this.exitTutorial.emit();
    this.tracking.log("buy : creator : select");
    event.stopPropagation();
    const initialState = {
      username: this.profile.Username,
      tradeType: this.globalVars.RouteNames.BUY_CREATOR,
      inTutorial: this.inTutorial,
      tutorialBuy: this.showTutorialBuy,
    };
    this.modalService.show(TradeCreatorModalComponent, {
      class: "modal-dialog-centered buy-deso-modal buy-deso-tutorial-modal",
      initialState,
    });
  }

  // Replace newlines with spaces
  truncateProfileDescription(profileDescription: string): string {
    return profileDescription.replace(/(?:\r\n|\r|\n)/g, " ");
  }

  openBuyCreatorCoinModal(event) {
    this.exitTutorial.emit();
    this.tracking.log("buy : creator : select");
    event.stopPropagation();

    if (!this.globalVars.loggedInUser) {
      this.modalService.show(WelcomeModalComponent);
      return;
    }

    const initialState = {
      username: this.profile.Username,
      tradeType: this.globalVars.RouteNames.BUY_CREATOR,
      inTutorial: this.inTutorial,
      tutorialBuy: this.showTutorialBuy,
    };
    const dialogClass =
      this.inTutorial && this.globalVars.isMobile() && window.innerHeight < 765
        ? ""
        : "modal-dialog-centered buy-deso-modal buy-deso-tutorial-modal";
    this.modalService.show(TradeCreatorModalComponent, {
      class: dialogClass,
      initialState,
    });
  }
}
