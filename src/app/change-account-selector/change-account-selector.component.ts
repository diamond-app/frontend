import { Component, Renderer2 } from "@angular/core";
import { Router } from "@angular/router";
import { identity } from "deso-protocol";
import { BsModalService } from "ngx-bootstrap/modal";
import { from } from "rxjs";
import { BackendApiService } from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";

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
    private router: Router
  ) {}

  get userInTutorial() {
    return this.globalVars.userInTutorial(this.globalVars.loggedInUser);
  }

  launchLogoutFlow() {
    from(identity.logout()).subscribe(() => {
      const { alternateUsers } = identity.snapshotSync();
      const users = Object.keys(alternateUsers ?? {});

      this.globalVars.userList = this.globalVars.userList.filter((user) => {
        return users.includes(user?.PublicKeyBase58Check);
      });

      let newActiveUserKey = this.globalVars.userList[0]?.PublicKeyBase58Check;

      if (newActiveUserKey) {
        identity.setActiveUser(newActiveUserKey);
      }

      const newLoggedInUser =
        this.globalVars.userList.find((user) => user?.PublicKeyBase58Check === newActiveUserKey) ?? null;

      this._switchToUser(newLoggedInUser);
    });
  }

  _switchToUser(user) {
    this.globalVars.setLoggedInUser(user);

    // Now we call update everything on the newly logged in user to make sure we have the latest info this user.
    this.globalVars.updateEverything().add(() => {
      this.router.navigate([`/${this.globalVars.RouteNames.BROWSE}`], {
        queryParamsHandling: "merge",
      });
      this.globalVars.isLeftBarMobileOpen = false;
    });
  }
}
