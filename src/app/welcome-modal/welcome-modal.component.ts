//@ts-strict
import { AfterViewInit, Component, Input, OnDestroy } from "@angular/core";
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

  @Input() triggerAction: string = "";

  constructor(
    public bsModalRef: BsModalRef,
    private globalVars: GlobalVarsService,
    private tracking: TrackingService
  ) {}

  ngAfterViewInit() {
    this.tracking.log("onboarding-modal : open", { triggerAction: this.triggerAction });
  }

  ngOnDestroy() {
    if (!this.didLaunchIdentityFlow) {
      // this can happen if the user clicks outside the modal, clicks the close
      // button, or presses the escape key
      this.tracking.log("onboarding-modal : dismiss");
    }
  }

  login() {
    this.didLaunchIdentityFlow = true;

    this.globalVars
      .launchLoginFlow("onboarding-modal-identity-button")
      .pipe(first())
      .subscribe((res) => {
        this.tracking.log(`onboarding : ${res.signedUp ? "signup" : "login"}`, {
          phoneNumberSuccess: res.phoneNumberSuccess,
        });
      });

    this.bsModalRef.hide();
  }
}
