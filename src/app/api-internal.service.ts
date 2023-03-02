//@ts-strict
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { map, switchMap } from "rxjs/operators";
import { BackendApiService } from "src/app/backend-api.service";
import { IdentityService } from "src/app/identity.service";
import { environment } from "src/environments/environment";
import { OpenProsperAPIResult, OpenProsperEarningsDetail } from "../lib/services/openProsper/openprosper-service";

const ENDPOINTS = Object.freeze({
  appUser: "app-user",
  pushNotifSubscription: "push-notification-subscriptions",
  onboardingEmailSubscription: "onboarding-email-subscription",
});

const buildUrl = (endpoint: string) => `${environment.apiInternalHostname}/api-internal/v0/${endpoint}`;

export interface AppUser {
  PublicKeyBase58check: string;
  Username: string;
  ActivityDigestFrequency: number;
  EarningsDigestFrequency: number;
  ReceiveCoinPurchaseNotif: boolean;
  ReceiveFollowNotif: boolean;
  ReceiveBasicTransferNotif: boolean;
  ReceiveDmNotif: boolean;
  ReceiveLikeNotif: boolean;
  ReceiveCommentNotif: boolean;
  ReceiveDiamondNotif: boolean;
  ReceiveRepostNotif: boolean;
  ReceiveQuoteRepostNotif: boolean;
  ReceiveMentionNotif: boolean;
  ReceiveNftBidNotif: boolean;
  ReceiveNftPurchaseNotif: boolean;
  ReceiveNftBidAcceptedNotif: boolean;
  ReceiveNftRoyaltyNotif: boolean;
  LastNotificationScannedIndex: number;
  DigestSendAtHourLocalTime: number;
  UserTimezoneUtcOffset: number;
  DeviceId: string;
}

export const NEW_APP_USER_DEFAULTS = {
  ActivityDigestFrequency: 0,
  EarningsDigestFrequency: 0,
  ReceiveLikeNotif: false,
  ReceiveCoinPurchaseNotif: false,
  ReceiveFollowNotif: false,
  ReceiveBasicTransferNotif: false,
  ReceiveDmNotif: false,
  ReceiveCommentNotif: false,
  ReceiveDiamondNotif: false,
  ReceiveRepostNotif: false,
  ReceiveQuoteRepostNotif: false,
  ReceiveMentionNotif: false,
  ReceiveNftBidNotif: false,
  ReceiveNftPurchaseNotif: false,
  ReceiveNftBidAcceptedNotif: false,
  ReceiveNftRoyaltyNotif: false,
};

export const SUBSCRIBED_APP_USER_DEFAULTS = {
  ActivityDigestFrequency: 1,
  EarningsDigestFrequency: 1,
  ReceiveLikeNotif: false,
  ReceiveCoinPurchaseNotif: true,
  ReceiveFollowNotif: false,
  ReceiveBasicTransferNotif: true,
  ReceiveDmNotif: true,
  ReceiveCommentNotif: true,
  ReceiveDiamondNotif: true,
  ReceiveRepostNotif: false,
  ReceiveQuoteRepostNotif: false,
  ReceiveMentionNotif: true,
  ReceiveNftBidNotif: true,
  ReceiveNftPurchaseNotif: true,
  ReceiveNftBidAcceptedNotif: true,
  ReceiveNftRoyaltyNotif: true,
};

@Injectable({
  providedIn: "root",
})
export class ApiInternalService {
  appUser: any;

  /**
   * Map of public key to creator earnings
   */
  private creatorEarningsCache: Record<string, OpenProsperEarningsDetail> = {};

  constructor(
    private httpClient: HttpClient,
    private identity: IdentityService,
    private backendAPI: BackendApiService
  ) {}

  getAppUser(publicKey: string, emailJwt: string = ""): Observable<any> {
    const queryParams = emailJwt === "" ? "" : "?emailJwt=true";
    return this.getAuthHeaders(emailJwt, publicKey).pipe(
      switchMap((headers) =>
        this.httpClient.get<any>(buildUrl(`${ENDPOINTS.appUser}/${publicKey}${queryParams}`), { headers })
      )
    );
  }

  createAppUser(
    PublicKeyBase58check: string,
    Username: string,
    LastNotificationScannedIndex: number,
    UserTimezoneUtcOffset: number,
    DigestSendAtHourLocalTime: number,
    notificationSettings: {} = NEW_APP_USER_DEFAULTS
  ) {
    const payload = {
      ...notificationSettings,
      PublicKeyBase58check,
      Username,
      LastNotificationScannedIndex,
      DigestSendAtHourLocalTime,
      UserTimezoneUtcOffset,
    };
    return this.getAuthHeaders().pipe(
      switchMap((headers) => this.httpClient.post<any>(buildUrl(ENDPOINTS.appUser), payload, { headers }))
    );
  }

  updateAppUser(payload: AppUser, emailJwt: string = "") {
    const queryParams = emailJwt === "" ? "" : "?emailJwt=true";
    return this.getAuthHeaders(emailJwt, payload.PublicKeyBase58check).pipe(
      switchMap((headers) =>
        this.httpClient.put<any>(
          buildUrl(`${ENDPOINTS.appUser}/${payload.PublicKeyBase58check}${queryParams}`),
          payload,
          { headers }
        )
      )
    );
  }

  onboardingEmailSubscribe(PublicKeyBase58Check: string): Observable<any> {
    return this.getAuthHeaders().pipe(
      switchMap((headers) =>
        this.httpClient.post<any>(buildUrl("onboarding-email-subscription"), { PublicKeyBase58Check }, { headers })
      )
    );
  }

  createPushNotificationSubscription(
    UserPublicKeyBase58check: string,
    Endpoint: string,
    AuthKey: string,
    P256dhKey: string
  ) {
    const payload = {
      UserPublicKeyBase58check,
      Endpoint,
      AuthKey,
      P256dhKey,
    };
    return this.getAuthHeaders().pipe(
      switchMap((headers) => this.httpClient.post<any>(buildUrl(ENDPOINTS.pushNotifSubscription), payload, { headers }))
    );
  }

  private getAuthHeaders(
    emailJwt: string = "",
    publicKey: string = ""
  ): Observable<{ Authorization: string; "Diamond-Public-Key-Base58-Check": string }> {
    if (emailJwt !== "") {
      return new Observable((observer) => {
        observer.next({
          Authorization: `Bearer ${emailJwt}`,
          "Diamond-Public-Key-Base58-Check": publicKey,
        });
        observer.complete();
      });
    }

    const loggedInUserKey = this.backendAPI.GetStorage(this.backendAPI.LastLoggedInUserKey);
    return this.identity
      .jwt({
        ...this.identity.identityServiceParamsForKey(loggedInUserKey),
      })
      .pipe(
        map(({ jwt }) => ({
          Authorization: `Bearer ${jwt}`,
          "Diamond-Public-Key-Base58-Check": loggedInUserKey,
        }))
      );
  }

  /**
   * NOTE: this api call is *slow*, so we cache it so there aren't lots of long
   * loading states when fetching the same profile for a given session.
   */
  getEarningsDetail(PublicKeyBase58: string): Observable<OpenProsperEarningsDetail> {
    if (this.creatorEarningsCache[PublicKeyBase58]) {
      return of(this.creatorEarningsCache[PublicKeyBase58]);
    }

    return this.httpClient
      .get<OpenProsperAPIResult<OpenProsperEarningsDetail>>(buildUrl(`creator-earnings/${PublicKeyBase58}`))
      .pipe(
        map((r) => {
          this.creatorEarningsCache[PublicKeyBase58] = r.value;
          return r.value;
        })
      );
  }
}
