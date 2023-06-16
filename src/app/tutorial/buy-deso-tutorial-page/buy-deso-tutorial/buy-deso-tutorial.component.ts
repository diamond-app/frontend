import { LocationStrategy } from "@angular/common";
import { Component } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { Router } from "@angular/router";
import { BsModalService } from "ngx-bootstrap/modal";
import { BuyDeSoComponent } from "../../../buy-deso-page/buy-deso/buy-deso.component";
import { AppRoutingModule } from "../../../app-routing.module";
import { BackendApiService } from "../../../backend-api.service";
import { BuyDesoModalComponent } from "../../../buy-deso-page/buy-deso-modal/buy-deso-modal.component";
import { GlobalVarsService } from "../../../global-vars.service";

@Component({
  selector: "buy-deso-tutorial",
  templateUrl: "./buy-deso-tutorial.component.html",
  styleUrls: ["./buy-deso-tutorial.component.scss"],
})
export class BuyDesoTutorialComponent {
  // Whether the "buy" button should wiggle to prompt the user to click it
  tutorialWiggle = false;
  static PAGE_SIZE = 100;
  static WINDOW_VIEWPORT = true;
  static BUFFER_SIZE = 5;

  AppRoutingModule = AppRoutingModule;
  loading: boolean = true;
  skipTutorialExitPrompt: boolean = false;

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private titleService: Title,
    private locationStrategy: LocationStrategy,
    private router: Router,
    private modalService: BsModalService
  ) {}

  BuyDeSoComponent = BuyDeSoComponent;

  openBuyDeSoModal(isFiat: boolean) {
    const initialState = {
      activeTabInput: isFiat ? BuyDeSoComponent.BUY_WITH_USD : BuyDeSoComponent.BUY_WITH_MEGASWAP,
    };
    this.modalService.show(BuyDesoModalComponent, {
      class: "modal-dialog-centered buy-deso-modal",
      backdrop: "static",
      initialState,
    });
  }

  skipToNextStep() {
    this.router.navigate([
      `/${this.globalVars.RouteNames.TUTORIAL}/${this.globalVars.RouteNames.INVEST}/${this.globalVars.RouteNames.BUY_CREATOR}`,
    ]);
  }

  initiateIntro() {}

  exitTutorial() {
    this.skipTutorialExitPrompt = true;
    this.skipTutorialExitPrompt = false;
  }

  tutorialCleanUp() {}
}
