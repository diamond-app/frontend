import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { ActivatedRoute, Router } from "@angular/router";
import { BackendApiService, TutorialStatus } from "../../backend-api.service";
import { SwalHelper } from "../../../lib/helpers/swal-helper";
import { RouteNames } from "../../app-routing.module";
import { Title } from "@angular/platform-browser";
import { ThemeService } from "../../theme/theme.service";
import * as introJs from "intro.js/intro.js";
import { isNil } from "lodash";
import { BsModalService } from "ngx-bootstrap/modal";
import { TradeCreatorModalComponent } from "../../trade-creator-page/trade-creator-modal/trade-creator-modal.component";
import { environment } from "src/environments/environment";
import { Observable } from "rxjs";

export type ProfileUpdates = {
  usernameUpdate: string;
  descriptionUpdate: string;
  profilePicUpdate: string;
};

export type ProfileUpdateErrors = {
  usernameError: boolean;
  descriptionError: boolean;
  profilePicError: boolean;
  founderRewardError: boolean;
};

@Component({
  selector: "update-profile",
  templateUrl: "./update-profile.component.html",
  styleUrls: ["./update-profile.component.scss"],
})
export class UpdateProfileComponent implements OnInit, OnChanges {
  @Input() loggedInUser: any;
  @Input() inTutorial: boolean = false;
  @Output() profileSaved = new EventEmitter();
  environment = environment;

  introJS = introJs();
  skipTutorialExitPrompt = false;
  showTutorialInstructions: boolean = false;
  updateProfileBeingCalled: boolean = false;
  usernameInput: string;
  descriptionInput: string;
  profilePicInput: string;
  founderRewardInput: number = 100;
  loggedInUserPublicKey = "";
  profileUpdates: ProfileUpdates = {
    usernameUpdate: "",
    descriptionUpdate: "",
    profilePicUpdate: "",
  };
  profileUpdateErrors: ProfileUpdateErrors = {
    usernameError: false,
    descriptionError: false,
    profilePicError: false,
    founderRewardError: false,
  };
  profileUpdated = false;
  emailAddress: string = "";
  initialEmailAddress = "";
  invalidEmailEntered = false;
  usernameValidationError: string = null;

  constructor(
    public globalVars: GlobalVarsService,
    private route: ActivatedRoute,
    private backendApi: BackendApiService,
    private router: Router,
    private titleService: Title,
    public themeService: ThemeService,
    private modalService: BsModalService
  ) {}

  ngOnInit() {
    this._updateFormBasedOnLoggedInUser();
    this.titleService.setTitle(`Update Profile - ${environment.node.name}`);
    if (this.inTutorial) {
      this.globalVars.preventBackButton();
      // Set default profile pic in tutorial if user doesn't already have one.
      if (!this.profilePicInput) {
        this.profilePicInput =
          "data:image/png;base64,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";
      }
    }
  }

  // This is used to handle any changes to the loggedInUser elegantly.
  ngOnChanges(changes: any) {
    if (changes.loggedInUser) {
      // If there is no previousValue, we have just gotten the user so do an update.
      if (!changes.loggedInUser.previousValue) {
        this._updateFormBasedOnLoggedInUser();
      }
      // If there is a previousValue and it was a different user, update the form.
      else if (
        changes.loggedInUser.previousValue.PublicKeyBase58Check !=
        changes.loggedInUser.currentValue.PublicKeyBase58Check
      ) {
        this._updateFormBasedOnLoggedInUser();
      }
    }
  }

  founderRewardTooltip() {
    return (
      "When someone purchases your coin, a percentage of that " +
      "gets allocated to you as a founder reward.\n\n" +
      "A value of 0% means you get no money when someone buys, " +
      "whereas a value of 100% means that nobody other than you can ever get coins because 100% of " +
      "every purchase will just go to you.\n\n" +
      "Setting this value too high will deter buyers from ever " +
      "purchasing your coin. It's a balance, so be careful or just stick " +
      "with the default."
    );
  }

  _updateFormBasedOnLoggedInUser() {
    if (this.globalVars.loggedInUser) {
      this._getUserMetadata();
      const profileEntryResponse = this.globalVars.loggedInUser.ProfileEntryResponse;
      this.usernameInput = profileEntryResponse?.Username || "";
      this.descriptionInput = profileEntryResponse?.Description || "";
      if (profileEntryResponse) {
        this.backendApi
          .GetSingleProfilePicture(
            this.globalVars.localNode,
            profileEntryResponse?.PublicKeyBase58Check,
            this.globalVars.profileUpdateTimestamp ? `?${this.globalVars.profileUpdateTimestamp}` : ""
          )
          .subscribe((res) => {
            this._readImageFileToProfilePicInput(res);
          });
      }

      // If they don't have CreatorBasisPoints set, use the default.
      if (this.globalVars.loggedInUser.ProfileEntryResponse?.CoinEntry?.CreatorBasisPoints != null) {
        this.founderRewardInput = this.globalVars.loggedInUser.ProfileEntryResponse.CoinEntry.CreatorBasisPoints / 100;
      }
    }
  }

  _getUserMetadata() {
    this.backendApi
      .GetUserGlobalMetadata(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check /*UpdaterPublicKeyBase58Check*/
      )
      .subscribe(
        (res) => {
          this.emailAddress = res.Email;
          this.initialEmailAddress = this.emailAddress;
        },
        (err) => {
          console.log(err);
        }
      );
  }

  _validateEmail(email) {
    if (email === "" || this.globalVars.emailRegExp.test(email)) {
      this.invalidEmailEntered = false;
    } else {
      this.invalidEmailEntered = true;
    }
  }

  _updateEmail() {
    this.backendApi
      .UpdateUserGlobalMetadata(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check /*UpdaterPublicKeyBase58Check*/,
        this.emailAddress /*EmailAddress*/,
        null /*MessageReadStateUpdatesByContact*/
      )
      .subscribe(
        (res) => {},
        (err) => {
          console.log(err);
          this.globalVars.logEvent("profile : update : error", { err });
        }
      )
  }

  _setProfileUpdates() {
    const profileEntryResponse = this.globalVars.loggedInUser.ProfileEntryResponse;
    this.profileUpdates.usernameUpdate =
      profileEntryResponse?.Username !== this.usernameInput ? this.usernameInput : "";
    this.profileUpdates.descriptionUpdate =
      profileEntryResponse?.Description !== this.descriptionInput ? this.descriptionInput : "";
    this.profileUpdates.profilePicUpdate =
      profileEntryResponse?.ProfilePic !== this.profilePicInput ? this.profilePicInput : "";
  }

  _setProfileErrors(): boolean {
    let hasErrors = false;
    if (this.usernameInput.length == 0) {
      this.profileUpdateErrors.usernameError = true;
      hasErrors = true;
    } else {
      this.profileUpdateErrors.usernameError = false;
    }

    if (this.descriptionInput.length > 180) {
      this.profileUpdateErrors.descriptionError = true;
      hasErrors = true;
    } else {
      this.profileUpdateErrors.descriptionError = false;
    }

    if (
      this.profilePicInput == null ||
      this.profilePicInput.length == 0 ||
      this.profilePicInput.length > 5 * 1024 * 1024 //
    ) {
      this.profileUpdateErrors.profilePicError = true;
      hasErrors = true;
    } else {
      this.profileUpdateErrors.profilePicError = false;
    }

    if (typeof this.founderRewardInput != "number" || this.founderRewardInput < 0 || this.founderRewardInput > 100) {
      this.profileUpdateErrors.founderRewardError = true;
      hasErrors = true;
    } else {
      this.profileUpdateErrors.founderRewardError = false;
    }

    return hasErrors;
  }

  // TODO: Kill NewStakeMultipleBasisPoints as an input to this endpoint in the backend.
  // TODO: Kill password as an input to this endpoint in the backend.
  //
  // This is a standalone function in case we decide we want to confirm fees before doing a real transaction.
  _callBackendUpdateProfile() {
    return this.backendApi.UpdateProfile(
      environment.verificationEndpointHostname,
      this.globalVars.localNode,
      this.globalVars.loggedInUser.PublicKeyBase58Check /*UpdaterPublicKeyBase58Check*/,
      "" /*ProfilePublicKeyBase58Check*/,
      // Start params
      this.profileUpdates.usernameUpdate /*NewUsername*/,
      this.profileUpdates.descriptionUpdate /*NewDescription*/,
      this.profileUpdates.profilePicUpdate /*NewProfilePic*/,
      this.founderRewardInput * 100 /*NewCreatorBasisPoints*/,
      1.25 * 100 * 100 /*NewStakeMultipleBasisPoints*/,
      false /*IsHidden*/,
      // End params
      this.globalVars.feeRateDeSoPerKB * 1e9 /*MinFeeRateNanosPerKB*/
    );
  }

  _updateProfile() {
    if (!this.inTutorial) {
      this._saveProfileUpdates();
    } else {
      this._cacheProfileUpdates();
    }
  }

  _cacheProfileUpdates() {
    // Trim the username input in case the user added a space at the end. Some mobile
    // browsers may do this.
    this.usernameInput = this.usernameInput.trim();
    if (this.emailAddress === "") {
      this.invalidEmailEntered = true;
    } else {
      this._validateEmail(this.emailAddress);
    }
    const hasErrors = this._setProfileErrors();
    if (hasErrors || this.invalidEmailEntered) {
      this.globalVars.logEvent("profile : update : has-errors", this.profileUpdateErrors);
      return;
    }
    this.globalVars.newProfile = {
      username: this.usernameInput,
      profileEmail: this.emailAddress,
      profileDescription: this.descriptionInput,
      profilePicInput: this.profilePicInput
    };
    this.profileSaved.emit();
  }

  _saveProfileUpdates() {
    // Trim the username input in case the user added a space at the end. Some mobile
    // browsers may do this.
    this.usernameInput = this.usernameInput.trim();

    // TODO: Add errors for emails
    const hasErrors = this._setProfileErrors();
    if (hasErrors) {
      this.globalVars.logEvent("profile : update : has-errors", this.profileUpdateErrors);
      return;
    }

    this.updateProfileBeingCalled = true;
    if (this.initialEmailAddress != this.emailAddress) {
      this._updateEmail();
    }
    this._setProfileUpdates();
    this._callBackendUpdateProfile().subscribe(
      (res) => {
        this.globalVars.profileUpdateTimestamp = Date.now();
        this.globalVars.logEvent("profile : update");
        // This updates things like the username that shows up in the dropdown.
        this.globalVars.updateEverything(res.TxnHashHex, this._updateProfileSuccess, this._updateProfileFailure, this);
      },
      (err) => {
        const parsedError = this.backendApi.parseProfileError(err);
        const lowBalance = parsedError.indexOf("insufficient");
        this.globalVars.logEvent("profile : update : error", { parsedError, lowBalance });
        this.updateProfileBeingCalled = false;
        SwalHelper.fire({
          target: this.globalVars.getTargetComponentSelector(),
          icon: "error",
          title: `An Error Occurred`,
          html: parsedError,
          showConfirmButton: !this.inTutorial,
          focusConfirm: true,
          customClass: {
            confirmButton: "btn btn-light",
            cancelButton: "btn btn-light no",
          },
          confirmButtonText: lowBalance ? "Buy $DESO" : null,
          cancelButtonText: lowBalance ? "Later" : null,
          showCancelButton: !!lowBalance,
        }).then((res) => {
          if (lowBalance && res.isConfirmed) {
            this.router.navigate([RouteNames.BUY_DESO], { queryParamsHandling: "merge" });
          }
        });
      }
    );
  }

  _updateProfileSuccess(comp: UpdateProfileComponent) {
    comp.globalVars.celebrate();
    comp.updateProfileBeingCalled = false;
    comp.profileUpdated = true;
    if (comp.inTutorial) {
      comp.router.navigate([RouteNames.TUTORIAL, RouteNames.INVEST, RouteNames.FOLLOW_CREATOR], {
        queryParamsHandling: "merge",
      });
      return;
    }
    if (comp.globalVars.loggedInUser.UsersWhoHODLYouCount === 0) {
      SwalHelper.fire({
        target: comp.globalVars.getTargetComponentSelector(),
        icon: "success",
        title: "Buy your creator coin",
        showConfirmButton: true,
        focusConfirm: true,
        customClass: {
          confirmButton: "btn btn-light",
        },
        confirmButtonText: "Buy Your Coin",
      }).then((res) => {
        if (res.isConfirmed) {
          comp.openBuyCreatorCoinModal();
        }
      });
    }
  }

  openBuyCreatorCoinModal() {
    const initialState = {
      username: this.globalVars.loggedInUser.ProfileEntryResponse.Username,
      tradeType: this.globalVars.RouteNames.BUY_CREATOR,
    };
    this.modalService.show(TradeCreatorModalComponent, {
      class: "modal-dialog-centered buy-deso-modal",
      initialState,
    });
  }

  _updateProfileFailure(comp: UpdateProfileComponent) {
    comp.globalVars._alertError("Transaction broadcast successfully but read node timeout exceeded. Please refresh.");
    comp.updateProfileBeingCalled = false;
  }

  _validateUsername(username) {
    if (username === "") {
      return
    }
    this.usernameValidationError = null;
    // Make sure username matches acceptable pattern
    const regex = new RegExp("^[a-zA-Z0-9_]*$", "g");
    if (!regex.test(username)) {
      this.usernameValidationError = "Username must only use letters, numbers, or underscores";
      return;
    }
    if (username !== this.globalVars.loggedInUser?.ProfileEntryResponse?.Username) {
      this.backendApi.GetSingleProfile(this.globalVars.localNode, "", username, true).subscribe(
        (res) => {
          if (!isNil(res)) {
            this.usernameValidationError = `${username} is already in use`;
          }
        },
        (err) => {
          console.log(err);
        }
      );
    }
  }

  updateShowPriceInFeed() {
    this.globalVars.setShowPriceOnFeed(!this.globalVars.showPriceOnFeed);
    this.globalVars.updateEverything();
  }

  private handleError() {
    return (err: any) => {
      return Observable;
    };
  }
  _handleFileInput(files: FileList) {
    let fileToUpload = files.item(0);
    if (!fileToUpload.type || !fileToUpload.type.startsWith("image/")) {
      this.globalVars._alertError("File selected does not have an image file type.");
      return;
    }
    if (fileToUpload.size > 5 * 1024 * 1024) {
      this.globalVars._alertError("Please upload an image that is smaller than 5MB.");
      return;
    }
    this._readImageFileToProfilePicInput(fileToUpload);
  }

  _readImageFileToProfilePicInput(file: Blob | File) {
    const reader = new FileReader();
    reader.readAsBinaryString(file);
    reader.onload = (event: any) => {
      const base64Image = btoa(event.target.result);
      this.profilePicInput = `data:${file.type};base64,${base64Image}`;
      if (this.inTutorial) {
        setTimeout(() => {
          this.introJS.refresh();
        }, 5);
      }
    };
  }

  _resetImage() {
    this.profilePicInput = "";
  }

  selectChangeHandler(event: any) {
    const newTheme = event.target.value;
    this.themeService.setTheme(newTheme);
  }
}
