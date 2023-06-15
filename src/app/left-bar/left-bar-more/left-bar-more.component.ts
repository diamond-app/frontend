import { AfterViewInit, Component, EventEmitter, Input, Output, Renderer2, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { BsModalService } from "ngx-bootstrap/modal";
import { TrackingService } from "../../tracking.service";
import { environment } from "../../../environments/environment";
import { AppRoutingModule } from "../../app-routing.module";
import { BackendApiService, TutorialStatus } from "../../backend-api.service";
import { BuyDesoModalComponent } from "../../buy-deso-page/buy-deso-modal/buy-deso-modal.component";
import { GlobalVarsService } from "../../global-vars.service";

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
    const bodyContent = encodeURIComponent(
      `The below information helps support address your case.\nMy public key: ${pubKey} \n`
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
}
