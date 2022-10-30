import { Component } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { isNil } from "lodash";
import { BsModalService } from "ngx-bootstrap/modal";
import { ApiInternalService } from "src/app/api-internal.service";
import { SwalHelper } from "../../lib/helpers/swal-helper";
import { RouteNames } from "../app-routing.module";
import { AppComponent } from "../app.component";
import { BackendApiService, TutorialStatus } from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";
import { IdentityService } from "../identity.service";
import { SignUpTransferDesoComponent } from "./sign-up-transfer-deso-module/sign-up-transfer-deso.component";
import Timer = NodeJS.Timer;

@Component({
  selector: "sign-up",
  templateUrl: "./sign-up.component.html",
  styleUrls: ["./sign-up.component.scss"],
})
export class SignUpComponent {
  stepNum: number;
  loading: boolean = false;
  verifiedInterval: Timer = null;

  constructor(
    public globalVars: GlobalVarsService,
    private appComponent: AppComponent,
    private router: Router,
    private route: ActivatedRoute,
    private backendApi: BackendApiService,
    private identityService: IdentityService,
    private modalService: BsModalService,
    private apiInternal: ApiInternalService
  ) {
    this.globalVars.isLeftBarMobileOpen = false;
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
    this.verifiedInterval = setInterval(() => {
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
    } else if (
      this.globalVars?.loggedInUser?.BalanceNanos === 0 &&
      this.identityService.identityServiceUsers[this.globalVars.loggedInUser?.PublicKeyBase58Check] !== "METAMASK"
    ) {
      this.stepNum = 0;
      this.pollForUserValidated();
    } else {
      this.stepNum = 1;
    }
  }

  launchJumioVerification() {
    this.globalVars.logEvent("identity : jumio : launch");
    this.identityService
      .launch("/get-free-deso", {
        public_key: this.globalVars.loggedInUser?.PublicKeyBase58Check,
        referralCode: this.globalVars.referralCode(),
      })
      .subscribe(() => {
        this.globalVars.logEvent("identity : jumio : success");
        this.globalVars.updateEverything().add(() => {
          this.stepNum = 1;
        });
      });
  }

  launchSMSVerification(): void {
    this.identityService
      .launchPhoneNumberVerification(this.globalVars?.loggedInUser?.PublicKeyBase58Check)
      .subscribe((res) => {
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
    this.apiInternal.onboardingEmailSubscribe(this.globalVars.loggedInUser.PublicKeyBase58Check).subscribe(() => {
      // TODO: use email response to show a "check your email" UI toast? not sure
      // what we want to do with it, if anything.
    });

    this.backendApi
      .UpdateTutorialStatus(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        TutorialStatus.COMPLETE,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        true
      )
      .subscribe(() => {
        this.globalVars.updateEverything().add(() => {
          const signUpRedirect = this.backendApi.GetStorage("signUpRedirect");
          const redirectPath = isNil(signUpRedirect) ? `/${this.globalVars.RouteNames.BROWSE}` : signUpRedirect;
          this.router
            .navigate([redirectPath], {
              queryParams: { feedTab: "Hot" },
              queryParamsHandling: "merge",
            })
            .then(() => {
              this.launchTutorial();
            });
        });
      });
  }

  launchTutorial() {
    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      title: "Introduction to Diamond",
      html: `Learn how to buy $DESO, the social currency that powers Diamond and how to use it for investing in your favorite creators.`,
      showConfirmButton: true,
      // Only show skip option to admins and users who do not need to complete tutorial
      showCancelButton: !!this.globalVars.loggedInUser?.IsAdmin || !this.globalVars.loggedInUser?.MustCompleteTutorial,
      customClass: {
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
      reverseButtons: true,
      confirmButtonText: "Take the tutorial",
      cancelButtonText: "Cancel",
    }).then((res) => {
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
          } else {
            this.backendApi.RemoveStorage("signUpRedirect");
          }
        });
    });
  }
}
