//@ts-strict
import { AfterViewInit, Component, OnDestroy } from "@angular/core";
import { BsModalRef } from "ngx-bootstrap/modal";
import { first } from "rxjs/operators";
import { GlobalVarsService } from "src/app/global-vars.service";
import { TrackingService } from "src/app/tracking.service";

@Component({
  selector: "app-welcome-modal",
  templateUrl: "./welcome-modal.component.html",
  styleUrls: ["./welcome-modal.component.scss"],
})
export class WelcomeModalComponent implements AfterViewInit, OnDestroy {
  private didLaunchIdentityFlow: boolean = false;

  constructor(
    public bsModalRef: BsModalRef,
    private globalVars: GlobalVarsService,
    private tracking: TrackingService
  ) {}

  ngAfterViewInit() {
    this.tracking.log("onboarding-modal : open");
  }

  ngOnDestroy() {
    if (!this.didLaunchIdentityFlow) {
      this.tracking.log("onboarding-modal : dismiss");
    }
  }

  login() {
    this.tracking.log("onboarding-modal-identity-button : click");
    this.didLaunchIdentityFlow = true;
    this.bsModalRef.hide();
    this.globalVars
      .launchLoginFlow()
      .pipe(first())
      .subscribe((res) => {
        if (res.signedUp || res.phoneNumberSuccess) {
          this.tracking.log(`onboarding : signup${res.phoneNumberSuccess ? " : phoneSuccess" : ""}`);
        } else {
          this.tracking.log(`onboarding : login${res.phoneNumberSuccess ? " : phoneSuccess" : ""}`);
        }
      });
  }
}
