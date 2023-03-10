import { AfterViewInit, Component, EventEmitter, Input, Output, Renderer2, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { BsModalService } from "ngx-bootstrap/modal";
import { TrackingService } from "src/app/tracking.service";
import { environment } from "src/environments/environment";
import { SwalHelper } from "../../../lib/helpers/swal-helper";
import { AppRoutingModule, RouteNames } from "../../app-routing.module";
import { BackendApiService, TutorialStatus } from "../../backend-api.service";
import { BuyDesoModalComponent } from "../../buy-deso-page/buy-deso-modal/buy-deso-modal.component";
import { GlobalVarsService } from "../../global-vars.service";
import { IdentityService } from "../../identity.service";
import { SettingsComponent } from "../../settings/settings.component";

@Component({
  selector: "left-bar-more",
  templateUrl: "./left-bar-more.component.html",
  styleUrls: ["./left-bar-more.component.sass"],
})
export class LeftBarMoreComponent implements AfterViewInit {
  environment = environment;

  TutorialStatus = TutorialStatus;

  @Input() inTutorial: boolean = false;
  @Input() closeLeftBar?: () => void;
  @Output() closeMore = new EventEmitter();
  @ViewChild("more") more;
  currentRoute: string;

  AppRoutingModule = AppRoutingModule;

  constructor(
    public globalVars: GlobalVarsService,
    private modalService: BsModalService,
    private identityService: IdentityService,
    private backendApi: BackendApiService,
    private renderer: Renderer2,
    private router: Router,
    private tracking: TrackingService
  ) {}

  ngAfterViewInit() {
    this._setUpClickOutListener();
  }

  _setUpClickOutListener() {
    this.renderer.listen("window", "click", (e: any) => {
      if (e.path == undefined) {
        if (e.target.offsetParent === this.more?.nativeElement) {
          return;
        }
      } else {
        for (var ii = 0; ii < e.path.length; ii++) {
          if (e.path[ii] === this.more?.nativeElement) {
            return;
          }
        }
      }
      // If we get here, the user did not click the selector.
      this._exitMore();
    });
  }

  _exitMore() {
    this.closeMore.emit();
  }

  openSettings(event) {
    event.stopPropagation();
    this.router.navigate(["/" + this.globalVars.RouteNames.SETTINGS], {
      queryParamsHandling: "merge",
    });
  }

  getHelpMailToAttr(): string {
    const loggedInUser = this.globalVars.loggedInUser;
    const pubKey = loggedInUser?.PublicKeyBase58Check;
    const btcAddress = this.identityService.identityServiceUsers[pubKey]?.btcDepositAddress;
    const bodyContent = encodeURIComponent(
      `The below information helps support address your case.\nMy public key: ${pubKey} \nMy BTC Address: ${btcAddress}`
    );
    const body = loggedInUser ? `?body=${bodyContent}` : "";
    return `mailto:${environment.supportEmail}${body}`;
  }

  logHelp(): void {
    this.tracking.log("help : click");
  }

  openBuyDeSoModal() {
    this.modalService.show(BuyDesoModalComponent, {
      class: "modal-dialog-centered buy-deso-modal",
      backdrop: "static",
    });
  }

  startTutorial(): void {
    if (this.inTutorial) {
      return;
    }
    // If the user hes less than 1/100th of a deso they need more deso for the tutorial.
    if (this.globalVars.loggedInUser?.BalanceNanos < 1e7) {
      SwalHelper.fire({
        target: this.globalVars.getTargetComponentSelector(),
        icon: "info",
        title: `You need 0.01 $DESO to complete the tutorial`,
        showConfirmButton: true,
        focusConfirm: true,
        customClass: {
          confirmButton: "btn btn-light",
        },
        confirmButtonText: "Buy $DESO",
      }).then((res) => {
        if (res.isConfirmed) {
          this.openBuyDeSoModal();
        }
      });
      return;
    }

    if (this.globalVars.userInTutorial(this.globalVars.loggedInUser)) {
      this.globalVars.navigateToCurrentStepInTutorial(this.globalVars.loggedInUser);
      return;
    }
    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      title: "Tutorial",
      html: `Learn how ${environment.node.name} works!`,
      showConfirmButton: true,
      // Only show skip option to admins and users who do not need to complete tutorial
      showCancelButton: !!this.globalVars.loggedInUser?.IsAdmin || !this.globalVars.loggedInUser?.MustCompleteTutorial,
      customClass: {
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
      reverseButtons: true,
      confirmButtonText: "Start Tutorial",
      cancelButtonText: "Cancel",
    }).then((res) => {
      this.closeMore.emit();
      this.backendApi
        .StartOrSkipTutorial(
          this.globalVars.localNode,
          this.globalVars.loggedInUser?.PublicKeyBase58Check,
          !res.isConfirmed /* if it's not confirmed, skip tutorial*/
        )
        .subscribe((response) => {
          this.tracking.log(`tutorial : ${res.isConfirmed ? "start" : "skip"}`);
          // Auto update logged in user's tutorial status - we don't need to fetch it via get users stateless right now.
          this.globalVars.loggedInUser.TutorialStatus = res.isConfirmed
            ? TutorialStatus.STARTED
            : TutorialStatus.SKIPPED;
          if (res.isConfirmed) {
            this.router.navigate([RouteNames.TUTORIAL, RouteNames.INVEST, RouteNames.BUY_DESO]);
          }
        });
    });
  }
}
