// @ts-strict
import { Component, Input, OnInit } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { TranslocoService } from "@ngneat/transloco";
import { BsModalService } from "ngx-bootstrap/modal";
import { forkJoin, of } from "rxjs";
import { catchError, switchMap } from "rxjs/operators";
import { ApiInternalService, AppUser } from "src/app/api-internal.service";
import { environment } from "src/environments/environment";
import { getUTCOffset, localHourToUtcHour } from "../../lib/helpers/date-helpers";
import { BackendApiService } from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";
import { ThemeService } from "../theme/theme.service";
import { range } from "lodash";
import { userInfo } from "os";

@Component({
  selector: "settings",
  templateUrl: "./settings.component.html",
  styleUrls: ["./settings.component.scss"],
})
export class SettingsComponent implements OnInit {
  emailAddress = "";
  showEmailPrompt: boolean = false;
  environment = environment;
  selectedLanguage?: string;
  appUser?: AppUser | null;
  isSelectEmailsDropdownOpen: boolean = false;
  isValidEmail: boolean = true;
  isSavingEmail: boolean = false;
  onlyShowEmailSettings: boolean = false;
  emailJwt: string = "";
  userPublicKeyBase58Check: string = "";
  digestFrequencies = [
    { duration: 1, text: "Daily" },
    { duration: 7, text: "Weekly" },
    { duration: 30, text: "Monthly" },
    { duration: 0, text: "Never" },
  ];
  digestSendAtTime = range(0, 24).map((localHour) => ({
    value: localHour,
    text: `${localHour.toString().padStart(2, "0")}:00`,
  }));
  txEmailSettings = [
    { field: "ReceiveLikeNotif", text: "Like" },
    { field: "ReceiveCoinPurchaseNotif", text: "Creator coin purchase" },
    { field: "ReceiveFollowNotif", text: "Follow" },
    { field: "ReceiveBasicTransferNotif", text: "Received DESO" },
    { field: "ReceiveCommentNotif", text: "Post comment" },
    { field: "ReceiveDmNotif", text: "Received message" },
    { field: "ReceiveDiamondNotif", text: "Received diamonds" },
    { field: "ReceiveRepostNotif", text: "Repost" },
    { field: "ReceiveQuoteRepostNotif", text: "Quote repost" },
    { field: "ReceiveMentionNotif", text: "@Mentioned" },
    { field: "ReceiveNftBidNotif", text: "NFT bid" },
    { field: "ReceiveNftPurchaseNotif", text: "NFT purchased" },
    { field: "ReceiveNftBidAcceptedNotif", text: "NFT bid accepted" },
    { field: "ReceiveNftRoyaltyNotif", text: "Received NFT royalty" },
  ];

  get allTxSettingsSelected() {
    return !!this.appUser && !this.txEmailSettings.find(({ field }) => !this.appUser[field]);
  }

  get allTxSettingsUnselected() {
    return !this.appUser || !this.txEmailSettings.find(({ field }) => this.appUser[field]);
  }

  @Input() isModal: boolean = true;

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private titleService: Title,
    private bsModalService: BsModalService,
    public themeService: ThemeService,
    private translocoService: TranslocoService,
    private apiInternal: ApiInternalService,
    private route: ActivatedRoute
  ) {
    this.route.queryParams.subscribe((queryParams) => {
      if (queryParams?.emailSettings && queryParams?.emailSettings === "true") {
        this.onlyShowEmailSettings = true;
      }
      if (queryParams?.jwt) {
        this.emailJwt = queryParams.jwt;
      }
      if (queryParams?.publicKey) {
        this.userPublicKeyBase58Check = queryParams.publicKey;
      }
    });
  }

  initializeAppUser(retryCount: number, maxRetries: number) {
    const loggedInUser = this.globalVars.loggedInUser;
    const userPublicKey =
      this.userPublicKeyBase58Check !== "" ? this.userPublicKeyBase58Check : loggedInUser?.PublicKeyBase58Check;

    if (userPublicKey) {
      const getAppUserObs = this.apiInternal.getAppUser(userPublicKey, this.emailJwt).pipe(
        catchError((err) => {
          if (err.status === 404) {
            return of(null);
          }
          throw err;
        })
      );
      const utcOffset = getUTCOffset();
      if (!!loggedInUser?.ProfileEntryResponse) {
        const getUserMetadataObs = this.backendApi.GetUserGlobalMetadata(this.globalVars.localNode, userPublicKey).pipe(
          catchError((err) => {
            return of(null);
          })
        );
        forkJoin([getAppUserObs, getUserMetadataObs])
          .pipe(
            switchMap(([appUser, userMetadata]) => {
              if (appUser === null && loggedInUser?.ProfileEntryResponse) {
                if (userMetadata.Email.length > 0) {
                  // This case should only happen if there was an error when creating
                  // the app user during a profile update, but if we don't have a
                  // corresponding app user record for the currently logged in user,
                  // but somehow we *DO* have their email address, we create an app
                  // user record with default email settings.
                  return this.apiInternal.createAppUser(
                    this.globalVars.loggedInUser?.PublicKeyBase58Check,
                    this.globalVars.loggedInUser.ProfileEntryResponse.Username,
                    this.globalVars.lastSeenNotificationIdx,
                    utcOffset,
                    localHourToUtcHour(20)
                  );
                }

                // If the user has a profile and we *DO NOT* have their email
                // address, we prompt them for it. This can happen if the user
                // created their profile on a different app.
                this.showEmailPrompt = true;
              }

              return of(appUser);
            })
          )
          .subscribe(
            (appUser) => {
              this.appUser = appUser;
            },
            (err) => {
              console.log("GOT AN ERROR: ", err);
              // Sometimes the identity iframe hasn't initialized by the time these functions are called.
              // In this case, the best we can do is retry until it works - there's no great way to await
              // the identity iframe initialization currently.
              if (retryCount < maxRetries) {
                this.initializeAppUser(retryCount + 1, maxRetries);
              }
            }
          );
      } else {
        getAppUserObs.subscribe((appUser) => {
          this.appUser = appUser;
        });
      }
    }
  }

  ngOnInit() {
    this.titleService.setTitle(`Settings - ${environment.node.name}`);
    this.selectedLanguage = this.translocoService.getActiveLang();
    this.globalVars.updateEverything().add(() => {
      this.initializeAppUser(0, 5);
    });
  }

  async subscribeToPushNotifications() {
    // @ts-ignore
    window.safari.pushNotification.requestPermission(
      "https://diamondapp.com/api-internal",
      "web.run.deso.z",
      {
        publicKeyBase58Check: this.globalVars.loggedInUser?.PublicKeyBase58Check,
      },
      // @ts-ignore
      (callbackInfo: { deviceToken: string; permission: string }) => {
        if (!this.appUser) return;
        if (callbackInfo.permission === "granted") {
          this.appUser = { ...this.appUser, DeviceId: callbackInfo.deviceToken };
          this.apiInternal.updateAppUser(this.appUser, this.emailJwt).subscribe(
            () => {},
            () => {
              if (!this.appUser) return;
              this.appUser = {
                ...this.appUser,
                DeviceId: "",
              };
            }
          );
          console.log(callbackInfo);
        }
      }
    );
  }

  closeModal() {
    this.bsModalService.hide();
  }

  selectLanguage(event: any) {
    const languageCode = event.target.value;
    this.translocoService.setActiveLang(languageCode);
  }

  selectChangeHandler(event: any) {
    const newTheme = event.target.value;
    this.themeService.setTheme(newTheme);
  }

  updateShowPriceInFeed() {
    this.globalVars.setShowPriceOnFeed(!this.globalVars.showPriceOnFeed);
    this.globalVars.updateEverything();
  }

  toggleEmailDropdown() {
    this.isSelectEmailsDropdownOpen = !this.isSelectEmailsDropdownOpen;
  }

  updateDigestFrequency(ev: Event) {
    if (!this.appUser || !ev?.target) return;
    const inputEl = ev.target as HTMLInputElement;
    const digestSetting = inputEl.name as "ActivityDigestFrequency" | "EarningsDigestFrequency";
    const originalValue = this.appUser[digestSetting];

    if (typeof originalValue === "undefined") {
      throw new Error(`invalid digest setting: ${digestSetting}`);
    }

    this.appUser = { ...this.appUser, [digestSetting]: Number(inputEl.value) };

    this.apiInternal.updateAppUser(this.appUser, this.emailJwt).subscribe(
      () => {},
      () => {
        if (!this.appUser) return;
        this.appUser = {
          ...this.appUser,
          ActivityDigestFrequency: originalValue,
        };
      }
    );
  }

  updateDigestSendAtTime(ev: Event) {
    if (!this.appUser || !ev?.target) return;
    const inputEl = ev.target as HTMLInputElement;
    const digestSetting = inputEl.name as "DigestSendAtHourLocalTime";
    const originalValue = this.appUser.DigestSendAtHourLocalTime;

    if (typeof originalValue === "undefined") {
      throw new Error(`invalid digest send at time setting: ${digestSetting}`);
    }

    this.appUser = {
      ...this.appUser,
      DigestSendAtHourLocalTime: Number(inputEl.value),
      UserTimezoneUtcOffset: getUTCOffset(),
    };

    this.apiInternal.updateAppUser(this.appUser, this.emailJwt).subscribe(
      () => {},
      () => {
        if (!this.appUser) return;
        this.appUser = {
          ...this.appUser,
          DigestSendAtHourLocalTime: originalValue,
        };
      }
    );
  }

  updateTxEmailSetting(ev: Event) {
    if (!this.appUser || !ev?.target) return;
    const inputEl = ev.target as HTMLInputElement;
    const fieldName = inputEl.name as keyof AppUser;
    const originalValue = this.appUser[fieldName];

    if (typeof originalValue === "undefined") {
      throw new Error(`invalid email setting: ${fieldName}`);
    }

    this.appUser = { ...this.appUser, [fieldName]: inputEl.checked };
    this.apiInternal.updateAppUser(this.appUser, this.emailJwt).subscribe(
      () => {},
      () => {
        if (!this.appUser) return;
        this.appUser = {
          ...this.appUser,
          [fieldName]: originalValue,
        };
      }
    );
  }

  toggleSelectAllTxEmailSettings(select: boolean) {
    if (!this.appUser) return;
    const originalAppUser = { ...this.appUser };
    const settings = this.txEmailSettings.reduce((res, { field }) => {
      res[field] = select;
      return res;
    }, {} as Record<string, boolean>);

    this.appUser = { ...this.appUser, ...settings };

    this.apiInternal.updateAppUser(this.appUser, this.emailJwt).subscribe(
      () => {},
      () => {
        if (!this.appUser) return;
        this.appUser = originalAppUser;
      }
    );
  }

  isDigestSendAtTimeSelected(localHour: number) {
    return (
      localHourToUtcHour(this.appUser.DigestSendAtHourLocalTime, this.appUser.UserTimezoneUtcOffset * 60) ===
      localHourToUtcHour(localHour)
    );
  }

  onEmailChange() {
    this.isValidEmail = true;
  }

  onEmailSubmit(ev: Event) {
    ev.preventDefault();
    if (this.isSavingEmail) {
      return;
    }

    if (!this.globalVars.emailRegExp.test(this.emailAddress)) {
      this.isValidEmail = false;
      return;
    }

    this.isSavingEmail = true;
    const utcOffset = getUTCOffset();
    this.backendApi
      .UpdateUserGlobalMetadata(
        this.globalVars.localNode,
        this.globalVars.loggedInUser?.PublicKeyBase58Check /*UpdaterPublicKeyBase58Check*/,
        this.emailAddress /*EmailAddress*/,
        null /*MessageReadStateUpdatesByContact*/
      )
      .pipe(
        switchMap(() => {
          return this.apiInternal.createAppUser(
            this.globalVars.loggedInUser?.PublicKeyBase58Check,
            this.globalVars.loggedInUser.ProfileEntryResponse.Username,
            this.globalVars.lastSeenNotificationIdx,
            utcOffset,
            localHourToUtcHour(20)
          );
        })
      )
      .subscribe(
        (appUser) => {
          this.showEmailPrompt = false;
          this.appUser = appUser;
          this.isSavingEmail = false;
        },
        (err) => {
          this.isSavingEmail = false;
        }
      );
  }
}
