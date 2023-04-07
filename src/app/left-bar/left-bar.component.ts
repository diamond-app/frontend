import { Component, EventEmitter, HostBinding, Input, Output } from "@angular/core";
import { Router } from "@angular/router";
import { identity } from "@deso-core/identity";
import { filter } from "lodash";
import { BsModalService } from "ngx-bootstrap/modal";
import { TrackingService } from "src/app/tracking.service";
import { WelcomeModalComponent } from "src/app/welcome-modal/welcome-modal.component";
import { environment } from "src/environments/environment";
import { AppRoutingModule } from "../app-routing.module";
import { BackendApiService, TutorialStatus } from "../backend-api.service";
import { BuyDesoModalComponent } from "../buy-deso-page/buy-deso-modal/buy-deso-modal.component";
import { FeedCreatePostModalComponent } from "../feed/feed-create-post-modal/feed-create-post-modal.component";
import { GlobalVarsService } from "../global-vars.service";

@Component({
  selector: "left-bar",
  templateUrl: "./left-bar.component.html",
  styleUrls: ["./left-bar.component.sass"],
})
export class LeftBarComponent {
  environment = environment;

  TutorialStatus = TutorialStatus;

  @HostBinding("class") get classes() {
    return !this.isMobile ? "global__nav__flex" : "";
  }

  @Input() isMobile = false;
  @Input() inTutorial: boolean = false;
  @Output() closeMobile = new EventEmitter<boolean>();
  currentRoute: string;
  showMore: boolean = false;

  AppRoutingModule = AppRoutingModule;

  constructor(
    public globalVars: GlobalVarsService,
    private modalService: BsModalService,
    private backendApi: BackendApiService,
    private router: Router,
    private tracking: TrackingService
  ) {}

  openCreatePostModal() {
    if (!this.globalVars.loggedInUser) {
      this.modalService.show(WelcomeModalComponent, { initialState: { triggerAction: "left-rail-create-post" } });
    } else {
      this.modalService.show(FeedCreatePostModalComponent, {
        class: "modal-dialog-centered",
        ignoreBackdropClick: true,
      });
    }
  }

  onCreateBlogPost() {
    if (!this.globalVars.loggedInUser) {
      this.modalService.show(WelcomeModalComponent, { initialState: { triggerAction: "left-rail-create-blog-post" } });
    } else {
      this.router.navigate(["/" + this.globalVars.RouteNames.CREATE_LONG_POST]);
    }
  }

  displayMore(event: any) {
    event.stopPropagation();
    this.showMore = true;
  }

  hideMore() {
    this.showMore = false;
  }

  getHelpMailToAttr(): string {
    const loggedInUser = this.globalVars.loggedInUser;
    const pubKey = loggedInUser?.PublicKeyBase58Check;
    const bodyContent = encodeURIComponent(
      `The below information helps support address your case.\nMy public key: ${pubKey}`
    );
    const body = loggedInUser ? `?body=${bodyContent}` : "";
    return `mailto:${environment.supportEmail}${body}`;
  }

  logHelp(): void {
    this.tracking.log("help : click");
  }

  launchLogoutFlow() {
    const publicKey = this.globalVars.loggedInUser?.PublicKeyBase58Check;
    identity.logout().then((res) => {
      this.globalVars.userList = filter(this.globalVars.userList, (user) => {
        return user.PublicKeyBase58Check !== publicKey;
      });
      if (this.globalVars.userList.length === 0) {
        this.globalVars.setLoggedInUser(null);
      }
      this.globalVars.updateEverything().add(() => {
        this.router.navigate(["/" + this.globalVars.RouteNames.BROWSE]);
      });
    });
  }

  openBuyDeSoModal() {
    this.modalService.show(BuyDesoModalComponent, {
      class: "modal-dialog-centered buy-deso-modal",
      backdrop: "static",
    });
  }

  closeLeftBar() {
    this.closeMobile.emit(true);
  }
}
