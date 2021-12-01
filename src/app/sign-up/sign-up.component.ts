import { Component } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { GlobalVarsService } from "../global-vars.service";
import { BackendApiService, ProfileEntryResponse, TutorialStatus, User } from "../backend-api.service";
import { shuffle, isNil } from "lodash";
import { AppComponent } from "../app.component";
import Swal from "sweetalert2";
import { IdentityService } from "../identity.service";
import { RouteNames } from "../app-routing.module";
import { environment } from "../../environments/environment";
import Timer = NodeJS.Timer;

@Component({
  selector: "sign-up",
  templateUrl: "./sign-up.component.html",
  styleUrls: ["./sign-up.component.scss"],
})
export class SignUpComponent {
  stepNum: number;
  loading: boolean = false;
  followCreatorsToDisplay = 100;
  creatorsToFollow = [];
  followCreatorThreshold = 5;
  creatorsFollowedCount = 0;
  creatorsFollowed: string[] = [];
  followTransactionIndex: number = 0;
  hoveredSection = 0;
  processingTransactions = false;
  verifiedInterval: Timer = null;

  constructor(
    public globalVars: GlobalVarsService,
    private appComponent: AppComponent,
    private router: Router,
    private route: ActivatedRoute,
    private backendApi: BackendApiService,
    private identityService: IdentityService
  ) {
    this.globalVars.isLeftBarMobileOpen = false;
    this.globalVars.initializeOnboardingSettings();
    this.setStep();
    if (this.stepNum === 2) {
      this.setupFollowsPage();
    }
    this.creatorsFollowed = Object.keys(this.globalVars.onboardingCreatorsToFollow);
    this.creatorsFollowedCount = Object.keys(this.globalVars.onboardingCreatorsToFollow).length;
  }

  // If the user isn't validated yet, keep polling until they have money in their account
  pollForUserValidated() {
    if (this.verifiedInterval) {
      clearInterval(this.verifiedInterval);
    }
    if (this.globalVars.loggedInUser.BalanceNanos > 0) {
      return;
    }
    let attempts = 0;
    let numTries = 120;
    let timeoutMillis = 5000;
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
            return;
          }
        })
        .add(() => attempts++);
    }, timeoutMillis);
  }

  setStep() {
    // If user has completed onboarding, redirect to follow feed
    if (!isNil(this.globalVars.loggedInUser?.ProfileEntryResponse?.Username)) {
      this.router.navigate(["/" + this.globalVars.RouteNames.BROWSE], {
        queryParams: { feedTab: "Following" },
        queryParamsHandling: "merge",
      });
    } else if (
      // If user hasn't started Jumio or completed sms verification yet
      this.globalVars?.loggedInUser?.BalanceNanos === 0 &&
      !(this.globalVars.loggedInUser.JumioFinishedTime && !this.globalVars.loggedInUser.JumioReturned)
    ) {
      this.stepNum = 0;
    } else if (isNil(this.globalVars.newProfile)) {
      this.stepNum = 1;
    } else if (this.globalVars.onboardingCreatorsToFollow === {}) {
      this.stepNum = 2;
    } else {
      this.stepNum = 3;
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

  completeUpdateProfile() {
    this.stepNum = 2;
    this.globalVars.setOnboardingProfile(this.globalVars.newProfile);
    this.globalVars.logEvent("onboarding : profile : update");
    this.setupFollowsPage();
  }

  completeFollowCreators() {
    this.globalVars.logEvent("onboarding : creators : follow");
    this.globalVars.setOnboardingCreatorsToFollow(this.globalVars.onboardingCreatorsToFollow);
    this.stepNum = 3;
    this.pollForUserValidated();
  }

  processTransactions() {
    if (!this.processingTransactions) {
      this.processingTransactions = true;
      this.globalVars.logEvent("onboarding : complete");
      this.updateProfileTransaction();
    }
  }

  updateProfileTransaction() {
    this.backendApi
      .UpdateProfile(
        environment.verificationEndpointHostname,
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check /*UpdaterPublicKeyBase58Check*/,
        "" /*ProfilePublicKeyBase58Check*/,
        // Start params
        this.globalVars.newProfile.username /*NewUsername*/,
        this.globalVars.newProfile.profileDescription /*NewDescription*/,
        this.globalVars.newProfile.profilePicInput /*NewProfilePic*/,
        100 * 100 /*NewCreatorBasisPoints*/,
        1.25 * 100 * 100 /*NewStakeMultipleBasisPoints*/,
        false /*IsHidden*/,
        // End params
        this.globalVars.feeRateDeSoPerKB * 1e9 /*MinFeeRateNanosPerKB*/
      )
      .subscribe(
        (res) => {
          this.globalVars.waitForTransaction(
            res.TxnHashHex,
            this.updateProfileSuccess,
            this.updateProfileFailure,
            this
          );
        },
        (error) => {
          console.log("error");
          console.log(error);
          this.updateProfileFailure(this, error?.error?.error);
        });
  }

  followCreatorTransaction() {
    const followedPubKeyBase58Check = this.creatorsFollowed[this.followTransactionIndex];
    this.backendApi
      .CreateFollowTxn(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        followedPubKeyBase58Check,
        false /*isUnfollow*/,
        this.globalVars.feeRateDeSoPerKB * 1e9
      )
      .subscribe(
        (res) => {
          this.globalVars.waitForTransaction(res.TxnHashHex, this.followCreatorNext, this.followCreatorNext, this);
        },
        (error) => {
          // If the follow transaction fails, rather than disrupting the flow and making the user do something else, just ignore it and move on
          this.followCreatorNext(this);
        }
      );
  }

  followCreatorNext(comp) {
    // If there are still creators that haven't been followed yet, follow them
    if (comp.followTransactionIndex + 1 < comp.creatorsFollowed.length) {
      comp.followTransactionIndex += 1;
      // Skip users the profile already follows
      if (
        !isNil(comp.globalVars.loggedInUser) &&
        !comp.globalVars.loggedInUser?.PublicKeysBase58CheckFollowedByUser.includes(
          comp.creatorsFollowed[comp.followTransactionIndex]
        )
      ) {
        comp.followCreatorTransaction();
      } else {
        comp.followCreatorNext(comp);
      }
    } else {
      comp.finishOnboarding();
    }
  }

  updateProfileSuccess(comp) {
    if (comp.creatorsFollowed.length > 0) {
      comp.followTransactionIndex = 0;
      comp.followCreatorTransaction();
    }
  }

  updateProfileFailure(comp, error: string = null) {
    this.globalVars.logEvent("onboarding : profile : failure");
    let message =
      "Uh oh! We encountered an error saving your profile. Please input your information again and continue.";
    if (!isNil(error)) {
      message = message + " Error details: " + error;
    }
    comp.backendApi.RemoveStorage("newOnboardingProfile");
    comp.globalVars.newProfile = null;
    this.processingTransactions = false;
    comp.stepNum = 1;
    Swal.fire({
      target: comp.globalVars.getTargetComponentSelector(),
      title: "Profile Update Failed",
      html: message,
      showConfirmButton: true,
      showCancelButton: false,
      customClass: {
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
      reverseButtons: true,
      confirmButtonText: "Ok",
      cancelButtonText: "Skip",
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
  }

  finishOnboarding() {
    this.backendApi
      .UpdateTutorialStatus(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        TutorialStatus.COMPLETE,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        true
      )
      .subscribe(() => {
        this.processingTransactions = false;
        this.globalVars.removeOnboardingSettings();
        this.globalVars.updateEverything().add(() => {
          this.router.navigate(["/" + this.globalVars.RouteNames.BROWSE], {
            queryParams: { feedTab: "Following" },
            queryParamsHandling: "merge",
          });
        });
      })
  }

  setupFollowsPage() {
    this.loading = true;
    this.getCreatorsToFollow();
  }

  getCreatorsToFollow() {
    this.backendApi
      .GetTutorialCreators(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        this.followCreatorsToDisplay
      )
      .subscribe(
        (res: {
          WellKnownProfileEntryResponses: ProfileEntryResponse[];
          UpAndComingProfileEntryResponses: ProfileEntryResponse[];
        }) => {
          // Do not let users select themselves in the "Invest In Others" step.
          if (res.WellKnownProfileEntryResponses?.length || res.WellKnownProfileEntryResponses?.length) {
            this.creatorsToFollow = shuffle(
              res.WellKnownProfileEntryResponses.concat(res.UpAndComingProfileEntryResponses).filter(
                (profile) =>
                  !isNil(profile) && profile.PublicKeyBase58Check !== this.globalVars.loggedInUser?.PublicKeyBase58Check
              )
            );
          }
          this.loading = false;
        },
        (err) => {
          console.error(err);
        }
      );
  }

  followCreator(isFollow: boolean, publicKeyBase58Check: string) {
    if (isFollow && !(publicKeyBase58Check in this.globalVars.onboardingCreatorsToFollow)) {
      this.globalVars.onboardingCreatorsToFollow[publicKeyBase58Check] = true;
      this.creatorsFollowedCount += 1;
    } else {
      delete this.globalVars.onboardingCreatorsToFollow[publicKeyBase58Check];
      this.creatorsFollowedCount -= 1;
    }
  }
}
