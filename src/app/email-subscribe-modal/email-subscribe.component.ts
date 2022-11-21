// @ts-strict
import { Component, Input, OnInit } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { TranslocoService } from "@ngneat/transloco";
import { BsModalService } from "ngx-bootstrap/modal";
import { forkJoin, of } from "rxjs";
import { catchError, switchMap } from "rxjs/operators";
import { ApiInternalService, AppUser, SUBSCRIBED_APP_USER_DEFAULTS } from "src/app/api-internal.service";
import { environment } from "src/environments/environment";
import { BackendApiService } from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";
import { ThemeService } from "../theme/theme.service";
import { ActivatedRoute, Router } from "@angular/router";

@Component({
  selector: "email-subscribe",
  templateUrl: "./email-subscribe.component.html",
  styleUrls: ["./email-subscribe.component.scss"],
})
export class EmailSubscribeComponent implements OnInit {
  emailAddress = "";
  showEmailPrompt: boolean = false;
  appUser?: AppUser | null;
  isValidEmail: boolean = true;
  isProcessing: boolean = false;
  onlyShowEmailSettings: boolean = false;

  @Input() missingField: string = "";

  constructor(
    private bsModalService: BsModalService,
    private titleService: Title,
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private apiInternal: ApiInternalService
  ) {}

  ngOnInit() {
    if (this.missingField === "email") {
      this.showEmailPrompt = true;
    }
  }

  closeModal() {
    this.bsModalService.hide();
    this.backendApi.SetStorage(this.backendApi.EmailNotificationsDismissalKey, new Date().toISOString());
  }

  onEmailChange() {
    this.isValidEmail = true;
  }

  onEmailSubmit(ev: Event) {
    ev.preventDefault();
    if (this.isProcessing) {
      return;
    }

    if (!this.globalVars.emailRegExp.test(this.emailAddress)) {
      this.isValidEmail = false;
      return;
    }

    this.isProcessing = true;
    this.backendApi
      .UpdateUserGlobalMetadata(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check /*UpdaterPublicKeyBase58Check*/,
        this.emailAddress /*EmailAddress*/,
        null /*MessageReadStateUpdatesByContact*/
      )
      .pipe(
        switchMap((res) => {
          return this.apiInternal.createAppUser(
            this.globalVars.loggedInUser.PublicKeyBase58Check,
            this.globalVars.loggedInUser.ProfileEntryResponse.Username,
            this.globalVars.lastSeenNotificationIdx,
            SUBSCRIBED_APP_USER_DEFAULTS
          );
        })
      )
      .subscribe(
        (appUser) => {
          this.showEmailPrompt = false;
          this.appUser = appUser;
          this.isProcessing = false;
          this.bsModalService.hide();
        },
        (err) => {
          this.isProcessing = false;
          this.bsModalService.hide();
        }
      );
  }

  addUserToEmailDigest() {
    this.isProcessing = true;
    this.apiInternal
      .createAppUser(
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        this.globalVars.loggedInUser.ProfileEntryResponse.Username,
        this.globalVars.lastSeenNotificationIdx,
        SUBSCRIBED_APP_USER_DEFAULTS
      )
      .subscribe(() => {
        this.isProcessing = false;
        this.bsModalService.hide();
      });
  }
}
