import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output,
  Renderer2,
  ViewChild,
} from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { AppRoutingModule, RouteNames } from "../../app-routing.module";
import { IdentityService } from "../../identity.service";
import { BackendApiService, TutorialStatus } from "../../backend-api.service";
import { Router } from "@angular/router";
import { SwalHelper } from "../../../lib/helpers/swal-helper";
import { BsModalService } from "ngx-bootstrap/modal";
import { environment } from "src/environments/environment";
import { BuyDesoModalComponent } from "../../buy-deso-page/buy-deso-modal/buy-deso-modal.component";

@Component({
  selector: "left-bar-more",
  templateUrl: "./left-bar-more.component.html",
  styleUrls: ["./left-bar-more.component.sass"],
})
export class LeftBarMoreComponent {
  environment = environment;

  TutorialStatus = TutorialStatus;

  @Input() inTutorial: boolean = false;
  @Output() closeMore = new EventEmitter();
  @ViewChild("leftBarMore", { static: true }) leftBarMore: ElementRef;
  currentRoute: string;

  AppRoutingModule = AppRoutingModule;

  constructor(
    public globalVars: GlobalVarsService,
    private modalService: BsModalService,
    private identityService: IdentityService,
    private backendApi: BackendApiService,
    private renderer: Renderer2,
    private router: Router
  ) {
    // document.addEventListener("click", this.offClickHandler.bind(this)); // bind on doc
  }

  ngAfterViewInit() {
    // this._setUpClickOutListener();
  }

  @HostListener("document:click", ["$event"]) onDocumentClick(event) {
    console.log("Here");
    console.log(event.path);
    // this.offClickHandler(event);
  }

  offClickHandler(event: any) {
    if (!this.leftBarMore.nativeElement.contains(event.target)) {
      console.log("Outside");
    }
  }

  _setUpClickOutListener() {
    console.log("Here we are");
    this.renderer.listen("window", "click", (e: any) => {
      console.log("Clicked");
      if (e.path == undefined) {
        if (e.target.offsetParent === this.leftBarMore?.nativeElement) {
          return;
        }
      } else {
        for (var ii = 0; ii < e.path.length; ii++) {
          if (e.path[ii] === this.leftBarMore?.nativeElement) {
            return;
          }
        }
      }
      // If we get here, the user did not click the selector.
      this._exitMore();
    });
  }

  _exitMore() {
    console.log("Time to exit");
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
    this.globalVars.logEvent("help : click");
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
          this.globalVars.logEvent(`tutorial : ${res.isConfirmed ? "start" : "skip"}`);
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
