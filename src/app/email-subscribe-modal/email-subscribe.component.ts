// @ts-strict
import { Component, Input } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { BsModalService } from "ngx-bootstrap/modal";
import {
  ApiInternalService,
  AppUser,
  SUBSCRIBED_EMAIL_APP_USER_DEFAULTS,
  SUBSCRIBED_PUSH_APP_USER_DEFAULTS,
} from "../api-internal.service";
import { getUTCOffset, localHourToUtcHour } from "../../lib/helpers/date-helpers";
import { BackendApiService } from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";

@Component({
  selector: "email-subscribe",
  templateUrl: "./email-subscribe.component.html",
  styleUrls: ["./email-subscribe.component.scss"],
})
export class EmailSubscribeComponent {
  showEmailPrompt: boolean = false;
  isProcessing: boolean = false;

  @Input() missingField: string = "";

  @Input() currentAppUser: AppUser | null = null;

  constructor(
    private bsModalService: BsModalService,
    private titleService: Title,
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private apiInternal: ApiInternalService
  ) {}

  closeModal() {
    this.bsModalService.hide();
    this.backendApi.SetStorage(this.backendApi.PushNotificationsDismissalKey, new Date().toISOString());
  }

  subscribeToPushNotifications() {
    this.isProcessing = true;
    const utcOffset = getUTCOffset();

    if (this.missingField === "user") {
      this.apiInternal
        .createAppUser(
          this.globalVars.loggedInUser?.PublicKeyBase58Check,
          this.globalVars.loggedInUser?.ProfileEntryResponse?.Username ?? "",
          this.globalVars.lastSeenNotificationIdx,
          utcOffset,
          localHourToUtcHour(20),
          SUBSCRIBED_PUSH_APP_USER_DEFAULTS
        )
        .subscribe(async () => {
          await this.globalVars.createWebPushEndpointAndSubscribe();
          this.isProcessing = false;
          this.bsModalService.hide();
        });
    } else {
      if (!this.currentAppUser) return;
      let newAppUser: AppUser;
      newAppUser = {
        ...this.currentAppUser,
        ...SUBSCRIBED_PUSH_APP_USER_DEFAULTS,
      };
      this.apiInternal.updateAppUser(newAppUser).subscribe(async () => {
        await this.globalVars.createWebPushEndpointAndSubscribe();
        this.isProcessing = false;
        this.bsModalService.hide();
      });
    }
  }

  addUserToEmailDigest() {
    this.isProcessing = true;
    const utcOffset = getUTCOffset();
    this.apiInternal
      .createAppUser(
        this.globalVars.loggedInUser?.PublicKeyBase58Check,
        this.globalVars.loggedInUser?.ProfileEntryResponse?.Username ?? "",
        this.globalVars.lastSeenNotificationIdx,
        utcOffset,
        localHourToUtcHour(20),
        SUBSCRIBED_EMAIL_APP_USER_DEFAULTS
      )
      .subscribe(() => {
        this.isProcessing = false;
        this.bsModalService.hide();
      });
  }
}
