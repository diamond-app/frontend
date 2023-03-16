import { Component, Renderer2 } from "@angular/core";
import { Router } from "@angular/router";
import { identity, User } from "deso-protocol";
import { BsModalService } from "ngx-bootstrap/modal";
import { from } from "rxjs";
import { BackendApiService } from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";
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
    from(identity.logout()).subscribe(() => {
      const { currentUser, alternateUsers } = identity.snapshot();
      const users = Object.keys(alternateUsers ?? {}).concat(currentUser?.publicKey ?? []);

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

      this.globalVars.updateEverything().add(() => {
        if (!this.userInTutorial) {
          this.goHome();
        }
      });
    });
  }

  _switchToUser(user) {
    this.setUser(user);
    this.globalVars.decryptedMessages = null;

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
