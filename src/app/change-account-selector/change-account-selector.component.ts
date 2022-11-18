import { Component, Renderer2 } from "@angular/core";
import { GlobalVarsService } from "../global-vars.service";
import { BackendApiService, User } from "../backend-api.service";
import { BsModalService } from "ngx-bootstrap/modal";
import { Router } from "@angular/router";
import { IdentityService } from "../identity.service";

@Component({
  selector: "change-account-selector",
  templateUrl: "./change-account-selector.component.html",
  styleUrls: ["./change-account-selector.component.scss"],
})
export class ChangeAccountSelectorComponent {
  selectorOpen: boolean = false;

  constructor(
    public globalVars: GlobalVarsService,
    private renderer: Renderer2,
    private backendApi: BackendApiService,
    private modalService: BsModalService,
    private identityService: IdentityService,
    private router: Router
  ) {}

  get userInTutorial() {
    return this.globalVars.userInTutorial(this.globalVars.loggedInUser);
  }

  launchLogoutFlow() {
    const publicKey = this.globalVars.loggedInUser.PublicKeyBase58Check;

    this.identityService.launch("/logout", { publicKey }).subscribe((res) => {
      const users = Object.keys(res?.users || {});

      if (!users.length) {
        this.globalVars.userList = [];
      } else {
        this.globalVars.userList = this.globalVars.userList.filter((user) => {
          return users.includes(user?.PublicKeyBase58Check);
        });
      }

      let loggedInUser = users?.[0];

      if (this.globalVars.userList.length === 0) {
        loggedInUser = null;
        this.setUser(null);
      }

      this.backendApi.setIdentityServiceUsers(res.users, loggedInUser);
      this.globalVars.updateEverything().add(() => {
        if (!this.userInTutorial) {
          this.goHome();
        }
      });
    });
  }

  _switchToUser(user) {
    this.setUser(user);
    this.globalVars.messageResponse = null;

    // Now we call update everything on the newly logged in user to make sure we have the latest info this user.
    this.globalVars.updateEverything().add(() => {
      if (!this.userInTutorial) {
        this.goHome().then(() => {
          const currentUrl = this.router.url;
          this.router.navigateByUrl(currentUrl);
        });
      }
      this.globalVars.isLeftBarMobileOpen = false;
    });
  }

  private setUser(user: User) {
    this.globalVars.setLoggedInUser(user);
  }

  private goHome() {
    const pageUrl = `/${this.globalVars.RouteNames.BROWSE}`;
    return this.router.navigate([pageUrl]);
  }
}
