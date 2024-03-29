import { Component, EventEmitter, Input, Output } from "@angular/core";
import { identity } from "deso-protocol";
import { from } from "rxjs";
import { BackendApiService } from "../../backend-api.service";
import { GlobalVarsService } from "../../global-vars.service";

@Component({
  selector: "sign-up-get-starter-deso",
  templateUrl: "./sign-up-get-starter-deso.component.html",
  styleUrls: ["./sign-up-get-starter-deso.component.scss"],
})
export class SignUpGetStarterDeSoComponent {
  static CREATE_PHONE_NUMBER_VERIFICATION_SCREEN = "create_phone_number_verification_screen";
  static COMPLETED_PHONE_NUMBER_VERIFICATION_SCREEN = "completed_phone_number_verification_screen";

  @Input() displayForSignupFlow = false;
  @Output() backToPreviousSignupStepClicked = new EventEmitter();
  @Output() phoneNumberVerified = new EventEmitter();
  @Output() skipButtonClicked = new EventEmitter();

  screenToShow = null;
  SignUpGetStarterDeSoComponent = SignUpGetStarterDeSoComponent;

  constructor(public globalVars: GlobalVarsService, private backendApi: BackendApiService) {}

  ngOnInit(): void {}

  _setScreenToShow() {
    // TODO: refactor silly setInterval
    let interval = setInterval(() => {
      if (this.globalVars.loggedInUser.HasPhoneNumber == null) {
        // Wait until we've loaded the HasPhoneNumber boolean from the server
        return;
      }

      if (this.globalVars.loggedInUser.HasPhoneNumber) {
        this.screenToShow = SignUpGetStarterDeSoComponent.COMPLETED_PHONE_NUMBER_VERIFICATION_SCREEN;
      } else {
        this.screenToShow = SignUpGetStarterDeSoComponent.CREATE_PHONE_NUMBER_VERIFICATION_SCREEN;
      }

      clearInterval(interval);
    }, 50);
  }

  onSkipButtonClicked() {
    this.skipButtonClicked.emit();
  }

  openIdentityPhoneNumberVerification(): void {
    from(identity.verifyPhoneNumber()).subscribe((res: any) => {
      if (res.phoneNumberSuccess) {
        this.globalVars.updateEverything().add(() => {
          this.screenToShow = SignUpGetStarterDeSoComponent.COMPLETED_PHONE_NUMBER_VERIFICATION_SCREEN;
        });
      }
    });
  }
}
