import { Component, Input, OnInit } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { TranslocoService } from "@ngneat/transloco";
import { isNil, range } from "lodash";
import { BsModalService } from "ngx-bootstrap/modal";
import { forkJoin, of } from "rxjs";
import { catchError, switchMap } from "rxjs/operators";
import {
  ApiInternalService,
  AppUser,
  SUBSCRIBED_EMAIL_APP_USER_DEFAULTS,
  SUBSCRIBED_PUSH_APP_USER_DEFAULTS,
} from "src/app/api-internal.service";
import { environment } from "src/environments/environment";
import { getUTCOffset, localHourToUtcHour } from "../../lib/helpers/date-helpers";
import { BackendApiService } from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";
import { ThemeService } from "../theme/theme.service";

@Component({
  selector: "settings",
  templateUrl: "./settings.component.html",
  styleUrls: ["./settings.component.scss"],
})
export class SettingsComponent implements OnInit {
  notificationCategories = this.globalVars.notificationCategories;

  notificationDetailsExpanded = false;

  getSortedNotificationCategories() {
    return Object.keys(this.notificationCategories).sort((a, b) => {
      return this.notificationCategories[a].order - this.notificationCategories[b].order;
    });
  }

  categorySelected(category: string, notificationChannel: string): boolean {
    if (isNil(this.appUser)) {
      return false;
    }
    return this.notificationCategories[category].notificationTypes.every((notificationType) => {
      return this.appUser[`${notificationType.appUserField}${notificationChannel}Notif`];
    });
  }

  categoryPartiallySelected(category: string, notificationChannel: string): boolean {
    if (isNil(this.appUser)) {
      return false;
    }
    if (this.categorySelected(category, notificationChannel)) {
      return false;
    }
    return this.notificationCategories[category].notificationTypes.some((notificationType) => {
      return this.appUser[`${notificationType.appUserField}${notificationChannel}Notif`];
    });
  }

  // Define a function to toggle whether a category is shown.
  toggleCategoryHidden(category: string): void {
    this.notificationCategories[category].isHidden = !this.notificationCategories[category].isHidden;
  }

  // Define a function to toggle the user's subscription to all notifications in a category
  toggleCategory(category: string, notificationChannel: string): void {
    if (this.appUser === null) {
      return;
    }
    const currentCategoryStatus = this.categorySelected(category, notificationChannel);
    // Create copy of appUser to revert to if the API call fails.
    const originalAppUser = { ...this.appUser };

    for (let notificationType of this.notificationCategories[category].notificationTypes) {
      this.appUser[`${notificationType.appUserField}${notificationChannel}Notif`] = !currentCategoryStatus;
    }

    // If the user is subscribing, subscribe them to push notifications.
    if (!currentCategoryStatus && notificationChannel === "Push") {
      this.globalVars.createWebPushEndpointAndSubscribe();
    }

    this.apiInternal.updateAppUser(this.appUser, this.emailJwt).subscribe(
      () => {},
      () => {
        if (!this.appUser) return;
        this.appUser = originalAppUser;
      }
    );
  }

  // Define a function to toggle the user's subscription to a specific notification type
  toggleNotificationType(notificationType: string, notificationChannel: string): void {
    if (this.appUser === null) {
      return;
    }

    this.appUser[`${notificationType}${notificationChannel}Notif`] = !this.appUser[
      `${notificationType}${notificationChannel}Notif`
    ];

    // If the user is subscribing, subscribe them to push notifications.
    if (this.appUser[`${notificationType}${notificationChannel}Notif`] && notificationChannel === "Push") {
      this.globalVars.createWebPushEndpointAndSubscribe();
    }

    this.apiInternal.updateAppUser(this.appUser, this.emailJwt).subscribe(
      () => {},
      () => {
        if (!this.appUser) return;
        this.appUser[`${notificationType}${notificationChannel}Notif`] = !this.appUser[
          `${notificationType}${notificationChannel}Notif`
        ];
      }
    );
  }

  // Define a function to toggle the user's subscription to a specific notification type.
  notificationChecked(notificationType: string, notificationChannel: string): boolean {
    if (this.appUser === null) {
      return false;
    }
    return this.appUser[`${notificationType}${notificationChannel}Notif`];
  }

  toggleNotificationDigest(digestType: string, notificationChannel: string) {
    if (this.appUser === null) {
      return;
    }

    this.appUser[`Receive${notificationChannel}${digestType}Digest`] = !this.appUser[
      `Receive${notificationChannel}${digestType}Digest`
    ];

    // If the user is subscribing, subscribe them to push notifications.
    if (this.appUser[`Receive${notificationChannel}${digestType}Digest`] && notificationChannel === "Push") {
      this.globalVars.createWebPushEndpointAndSubscribe();
    }

    this.apiInternal.updateAppUser(this.appUser, this.emailJwt).subscribe(
      () => {},
      () => {
        if (!this.appUser) return;
        this.appUser[`Receive${notificationChannel}${digestType}Digest`] = !this.appUser[
          `Receive${notificationChannel}${digestType}Digest`
        ];
      }
    );
  }

  notificationDigestChecked(digestType: string, notificationChannel: string): boolean {
    if (this.appUser === null) {
      return false;
    }

    return this.appUser[`Receive${notificationChannel}${digestType}Digest`];
  }

  notificationDigestDisabled(digestType: string): boolean {
    if (this.appUser === null) {
      return false;
    }

    if (digestType === "Earnings") {
      return this.appUser.EarningsDigestFrequency === 0;
    } else {
      return this.appUser.ActivityDigestFrequency === 0;
    }
  }

  showNotificationAdvancedSettings(): boolean {
    if (!this.appUser) {
      return false;
    }
    return (
      this.globalVars.userHasSubscribedToNotificationChannel("Email", this.appUser) ||
      this.globalVars.userHasSubscribedToNotificationChannel("Push", this.appUser)
    );
  }

  emailAddress = "";
  showEmailPrompt: boolean = false;
  environment = environment;
  selectedLanguage?: string;
  appUser?: AppUser | null;
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
        const getUserMetadataObs = this.backendApi.GetUserGlobalMetadata(userPublicKey).pipe(
          catchError((err) => {
            return of(null);
          })
        );
        forkJoin([getAppUserObs, getUserMetadataObs])
          .pipe(
            switchMap(([appUser, userMetadata]) => {
              this.emailAddress = userMetadata.Email;
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
    console.log("In settings");
    this.titleService.setTitle(`Settings - ${environment.node.name}`);
    this.selectedLanguage = this.translocoService.getActiveLang();
    this.globalVars.updateEverything().add(() => {
      this.initializeAppUser(0, 5);
    });
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

  updateDigestFrequency(ev: Event) {
    if (!this.appUser || !ev?.target) return;
    const inputEl = ev.target as HTMLInputElement;
    const digestSetting = inputEl.name as "ActivityDigestFrequency" | "EarningsDigestFrequency";
    const originalValue = this.appUser[digestSetting];

    if (typeof originalValue === "undefined") {
      throw new Error(`invalid digest setting: ${digestSetting}`);
    }

    this.appUser = { ...this.appUser, [digestSetting]: Number(inputEl.value) };

    // If the user has set digest frequency to 0, we disable that digest across all channels.
    if (Number(inputEl.value) === 0) {
      if (digestSetting === "ActivityDigestFrequency") {
        this.appUser.ReceivePushActivityDigest = false;
        this.appUser.ReceiveEmailActivityDigest = false;
      } else {
        this.appUser.ReceivePushEarningsDigest = false;
        this.appUser.ReceiveEmailEarningsDigest = false;
      }
    }

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

  isDigestSendAtTimeSelected(localHour: number) {
    return (
      localHourToUtcHour(this.appUser.DigestSendAtHourLocalTime, this.appUser.UserTimezoneUtcOffset * 60) ===
      localHourToUtcHour(localHour)
    );
  }

  onEmailChange() {
    this.isValidEmail = true;
  }

  subscribeToPushNotifications() {
    const utcOffset = getUTCOffset();
    if (!this.appUser) {
      this.apiInternal
        .createAppUser(
          this.globalVars.loggedInUser?.PublicKeyBase58Check,
          this.globalVars.loggedInUser.ProfileEntryResponse.Username,
          this.globalVars.lastSeenNotificationIdx,
          utcOffset,
          localHourToUtcHour(20),
          SUBSCRIBED_PUSH_APP_USER_DEFAULTS
        )
        .subscribe((appUser) => {
          this.appUser = appUser;
          this.globalVars.createWebPushEndpointAndSubscribe();
        });
    } else {
      console.log("Updating");
      this.apiInternal
        .updateAppUser(
          {
            ...this.appUser,
            ...SUBSCRIBED_PUSH_APP_USER_DEFAULTS,
            UserTimezoneUtcOffset: utcOffset,
            DigestSendAtHourLocalTime: localHourToUtcHour(20),
          },
          this.emailJwt
        )
        .subscribe((appUser) => {
          console.log("Here is the app user: ", appUser);
          this.appUser = appUser;
          this.globalVars.createWebPushEndpointAndSubscribe();
        });
    }
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
        this.globalVars.loggedInUser?.PublicKeyBase58Check /*UpdaterPublicKeyBase58Check*/,
        this.emailAddress /*EmailAddress*/,
        null /*MessageReadStateUpdatesByContact*/
      )
      .pipe(
        switchMap(() => {
          if (!this.appUser) {
            return this.apiInternal.createAppUser(
              this.globalVars.loggedInUser?.PublicKeyBase58Check,
              this.globalVars.loggedInUser.ProfileEntryResponse.Username,
              this.globalVars.lastSeenNotificationIdx,
              utcOffset,
              localHourToUtcHour(20),
              SUBSCRIBED_EMAIL_APP_USER_DEFAULTS
            );
          } else {
            return this.apiInternal.updateAppUser(
              {
                ...this.appUser,
                ...SUBSCRIBED_EMAIL_APP_USER_DEFAULTS,
                UserTimezoneUtcOffset: utcOffset,
                DigestSendAtHourLocalTime: localHourToUtcHour(20),
              },
              this.emailJwt
            );
          }
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
