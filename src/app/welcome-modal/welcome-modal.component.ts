//@ts-strict
import { AfterViewInit, Component, OnDestroy } from "@angular/core";
import { BsModalRef } from "ngx-bootstrap/modal";
import { first } from "rxjs/operators";
import { GlobalVarsService } from "src/app/global-vars.service";

@Component({
  selector: "app-welcome-modal",
  templateUrl: "./welcome-modal.component.html",
  styleUrls: ["./welcome-modal.component.scss"],
})
export class WelcomeModalComponent implements AfterViewInit, OnDestroy {
  private didLaunchIdentityFlow: boolean = false;

  constructor(public bsModalRef: BsModalRef, private globalVars: GlobalVarsService) {}

  ngAfterViewInit() {
    this.globalVars.logEvent("onboarding : open");
  }

  ngOnDestroy() {
    if (!this.didLaunchIdentityFlow) {
      this.globalVars.logEvent("onboarding : close : no-identity");
    }
  }

  login() {
    this.didLaunchIdentityFlow = true;
    this.globalVars.logEvent("onboarding : identity");
    this.bsModalRef.hide();
    this.globalVars
      .launchLoginFlow()
      .pipe(first())
      .subscribe((res) => {
        if (res.signedUp || res.phoneNumberSuccess) {
          this.globalVars.logEvent(`onboarding : signup${res.phoneNumberSuccess ? " : phoneSuccess" : ""}`);
        } else {
          this.globalVars.logEvent(`onboarding : login${res.phoneNumberSuccess ? " : phoneSuccess" : ""}`);
        }
      });
  }
}
