import { Component, OnDestroy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { identity } from "deso-protocol";
import isNil from "lodash/isNil";
import { BsModalService } from "ngx-bootstrap/modal";
import { from } from "rxjs";
import { ApiInternalService } from "src/app/api-internal.service";
import { TrackingService } from "src/app/tracking.service";
import { AppComponent } from "../app.component";
import { BackendApiService, TutorialStatus } from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";
import { SignUpTransferDesoComponent } from "./sign-up-transfer-deso-module/sign-up-transfer-deso.component";

@Component({
  selector: "sign-up",
  templateUrl: "./sign-up.component.html",
  styleUrls: ["./sign-up.component.scss"],
})
export class SignUpComponent implements OnDestroy {
  stepNum: number;
  loading: boolean = false;
  verifiedInterval: number = null;

  constructor(
    public globalVars: GlobalVarsService,
    private appComponent: AppComponent,
    private router: Router,
    private route: ActivatedRoute,
    private backendApi: BackendApiService,
    private modalService: BsModalService,
    private apiInternal: ApiInternalService,
    private tracking: TrackingService
  ) {
    this.globalVars.isLeftBarMobileOpen = false;
    this.globalVars.userSigningUp = true;
    this.setStep();
  }

  // If the user isn't validated yet, keep polling until they have money in their account
  pollForUserValidated() {
    if (this.verifiedInterval) {
      clearInterval(this.verifiedInterval);
    }
    if (this.globalVars.loggedInUser.BalanceNanos > 0) {
      this.setStep();
      return;
    }
    let attempts = 0;
    let numTries = 500;
    let timeoutMillis = 500;
    this.verifiedInterval = window.setInterval(() => {
      if (attempts >= numTries) {
        clearInterval(this.verifiedInterval);
        return;
      }
      this.globalVars
        .updateEverything()
        .add(() => {
          if (this.globalVars.loggedInUser.BalanceNanos > 0) {
            clearInterval(this.verifiedInterval);
            this.setStep();
            return;
          }
        })
        .add(() => attempts++);
    }, timeoutMillis);
  }

  setStep() {
    // If user has completed onboarding, redirect to follow feed
    if (!isNil(this.globalVars.loggedInUser?.ProfileEntryResponse?.Username)) {
      const signUpRedirect = this.backendApi.GetStorage("signUpRedirect");
      const redirectPath = isNil(signUpRedirect) ? `/${this.globalVars.RouteNames.BROWSE}` : signUpRedirect;
      this.router.navigate([redirectPath], {
        queryParams: { feedTab: "Following" },
        queryParamsHandling: "merge",
      });
    } else if (this.globalVars?.loggedInUser?.BalanceNanos === 0) {
      this.stepNum = 0;
      this.pollForUserValidated();
    } else {
      this.stepNum = 1;
    }
  }

  launchSMSVerification(): void {
    from(identity.verifyPhoneNumber()).subscribe((res: any) => {
      if (res.phoneNumberSuccess) {
        this.globalVars.updateEverything().add(() => {
          this.stepNum = 1;
        });
      }
    });
  }

  launchTransferDesoModal() {
    const modalDetails = this.modalService.show(SignUpTransferDesoComponent, {
      class: "modal-dialog-centered modal-wide",
    });
    const onHideEvent = modalDetails.onHide;
    onHideEvent.subscribe(() => {
      this.refreshBalance();
    });
  }

  refreshBalance() {
    this.globalVars.updateEverything().add(() => {
      this.setStep();
    });
  }

  updateProfileTransaction() {
    this.finishOnboarding();
  }

  finishOnboarding() {
    // sends a welcome email.
    this.apiInternal.onboardingEmailSubscribe(this.globalVars.loggedInUser?.PublicKeyBase58Check).subscribe(() => {
      // TODO: use email response to show a "check your email" UI toast? not sure
      // what we want to do with it, if anything.
    });

    this.backendApi
      .UpdateTutorialStatus(
        this.globalVars.localNode,
        this.globalVars.loggedInUser?.PublicKeyBase58Check,
        TutorialStatus.COMPLETE,
        this.globalVars.loggedInUser?.PublicKeyBase58Check,
        true
      )
      .subscribe(() => {
        this.globalVars.updateEverything().add(() => {
          const signUpRedirect = this.backendApi.GetStorage("signUpRedirect");
          const twitterSyncPath = `/${this.globalVars.RouteNames.TWITTER_SYNC}`;
          const redirectPath = isNil(signUpRedirect) ? twitterSyncPath : signUpRedirect;
          this.router.navigate([redirectPath], {
            queryParamsHandling: "merge",
            state: { fromSignUp: true },
          });
        });
      });
  }

  ngOnDestroy() {
    this.globalVars.userSigningUp = false;
  }
}
