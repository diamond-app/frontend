//@ts-strict
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { identity } from "deso-protocol";
import { from, Observable, of } from "rxjs";
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
  ReceivePushActivityDigest: boolean;
  ReceivePushEarningsDigest: boolean;
  ReceiveEmailActivityDigest: boolean;
  ReceiveEmailEarningsDigest: boolean;
  ReceiveCoinPurchaseEmailNotif: boolean;
  ReceiveFollowEmailNotif: boolean;
  ReceiveBasicTransferEmailNotif: boolean;
  ReceiveDmEmailNotif: boolean;
  ReceiveLikeEmailNotif: boolean;
  ReceiveCommentEmailNotif: boolean;
  ReceiveDiamondEmailNotif: boolean;
  ReceiveRepostEmailNotif: boolean;
  ReceiveQuoteRepostEmailNotif: boolean;
  ReceiveMentionEmailNotif: boolean;
  ReceiveNftBidEmailNotif: boolean;
  ReceiveNftPurchaseEmailNotif: boolean;
  ReceiveNftBidAcceptedEmailNotif: boolean;
  ReceiveNftRoyaltyEmailNotif: boolean;
  ReceiveCoinPurchasePushNotif: boolean;
  ReceiveFollowPushNotif: boolean;
  ReceiveBasicTransferPushNotif: boolean;
  ReceiveDmPushNotif: boolean;
  ReceiveLikePushNotif: boolean;
  ReceiveCommentPushNotif: boolean;
  ReceiveDiamondPushNotif: boolean;
  ReceiveRepostPushNotif: boolean;
  ReceiveQuoteRepostPushNotif: boolean;
  ReceiveMentionPushNotif: boolean;
  ReceiveNftBidPushNotif: boolean;
  ReceiveNftPurchasePushNotif: boolean;
  ReceiveNftBidAcceptedPushNotif: boolean;
  ReceiveNftRoyaltyPushNotif: boolean;
  LastNotificationScannedIndex: number;
  DigestSendAtHourLocalTime: number;
  UserTimezoneUtcOffset: number;
  DeviceId: string;
}

export const NEW_APP_USER_DEFAULTS = {
  ActivityDigestFrequency: 0,
  EarningsDigestFrequency: 0,
  ReceiveLikeEmailNotif: false,
  ReceiveCoinPurchaseEmailNotif: false,
  ReceiveFollowEmailNotif: false,
  ReceiveBasicTransferEmailNotif: false,
  ReceiveDmEmailNotif: false,
  ReceiveCommentEmailNotif: false,
  ReceiveDiamondEmailNotif: false,
  ReceiveRepostEmailNotif: false,
  ReceiveQuoteRepostEmailNotif: false,
  ReceiveMentionEmailNotif: false,
  ReceiveNftBidEmailNotif: false,
  ReceiveNftPurchaseEmailNotif: false,
  ReceiveNftBidAcceptedEmailNotif: false,
  ReceiveNftRoyaltyEmailNotif: false,
  ReceiveLikePushNotif: false,
  ReceiveCoinPurchasePushNotif: false,
  ReceiveFollowPushNotif: false,
  ReceiveBasicTransferPushNotif: false,
  ReceiveDmPushNotif: false,
  ReceiveCommentPushNotif: false,
  ReceiveDiamondPushNotif: false,
  ReceiveRepostPushNotif: false,
  ReceiveQuoteRepostPushNotif: false,
  ReceiveMentionPushNotif: false,
  ReceiveNftBidPushNotif: false,
  ReceiveNftPurchasePushNotif: false,
  ReceiveNftBidAcceptedPushNotif: false,
  ReceiveNftRoyaltyPushNotif: false,
  ReceivePushActivityDigest: false,
  ReceivePushEarningsDigest: false,
  ReceiveEmailActivityDigest: false,
  ReceiveEmailEarningsDigest: false,
};

export const SUBSCRIBED_EMAIL_APP_USER_DEFAULTS = {
  ActivityDigestFrequency: 1,
  EarningsDigestFrequency: 1,
  ReceiveEmailActivityDigest: true,
  ReceiveEmailEarningsDigest: true,
  ReceiveLikeEmailNotif: false,
  ReceiveCoinPurchaseEmailNotif: true,
  ReceiveFollowEmailNotif: false,
  ReceiveBasicTransferEmailNotif: true,
  ReceiveDmEmailNotif: true,
  ReceiveCommentEmailNotif: true,
  ReceiveDiamondEmailNotif: true,
  ReceiveRepostEmailNotif: false,
  ReceiveQuoteRepostEmailNotif: false,
  ReceiveMentionEmailNotif: true,
  ReceiveNftBidEmailNotif: true,
  ReceiveNftPurchaseEmailNotif: true,
  ReceiveNftBidAcceptedEmailNotif: true,
  ReceiveNftRoyaltyEmailNotif: true,
};

export const SUBSCRIBED_PUSH_APP_USER_DEFAULTS = {
  ActivityDigestFrequency: 1,
  EarningsDigestFrequency: 1,
  ReceivePushActivityDigest: true,
  ReceivePushEarningsDigest: true,
  ReceiveLikePushNotif: true,
  ReceiveCoinPurchasePushNotif: true,
  ReceiveFollowPushNotif: true,
  ReceiveBasicTransferPushNotif: true,
  ReceiveDmPushNotif: true,
  ReceiveCommentPushNotif: true,
  ReceiveDiamondPushNotif: true,
  ReceiveRepostPushNotif: true,
  ReceiveQuoteRepostPushNotif: true,
  ReceiveMentionPushNotif: true,
  ReceiveNftBidPushNotif: true,
  ReceiveNftPurchasePushNotif: true,
  ReceiveNftBidAcceptedPushNotif: true,
  ReceiveNftRoyaltyPushNotif: true,
};

export const SUBSCRIBED_FULL_APP_USER_DEFAULTS = {
  ...SUBSCRIBED_EMAIL_APP_USER_DEFAULTS,
  ...SUBSCRIBED_PUSH_APP_USER_DEFAULTS,
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
    return this.getAuthHeaders(publicKey, { emailJwt }).pipe(
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
    return this.getAuthHeaders(PublicKeyBase58check).pipe(
      switchMap((headers) => this.httpClient.post<any>(buildUrl(ENDPOINTS.appUser), payload, { headers }))
    );
  }

  updateAppUser(payload: AppUser, emailJwt: string = "") {
    const queryParams = emailJwt === "" ? "" : "?emailJwt=true";
    return this.getAuthHeaders(payload.PublicKeyBase58check, { emailJwt }).pipe(
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
    return this.getAuthHeaders(PublicKeyBase58Check).pipe(
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
    return this.getAuthHeaders(UserPublicKeyBase58check).pipe(
      switchMap((headers) => this.httpClient.post<any>(buildUrl(ENDPOINTS.pushNotifSubscription), payload, { headers }))
    );
  }

  private getAuthHeaders(
    publicKey: string,
    { emailJwt }: { emailJwt?: string } = {}
  ): Observable<{ Authorization: string; "Diamond-Public-Key-Base58-Check": string }> {
    if (emailJwt) {
      return new Observable((observer) => {
        observer.next({
          Authorization: `Bearer ${emailJwt}`,
          "Diamond-Public-Key-Base58-Check": publicKey,
        });
        observer.complete();
      });
    }

    return from(identity.jwt()).pipe(
      map((jwt) => ({ Authorization: `Bearer ${jwt}`, "Diamond-Public-Key-Base58-Check": publicKey }))
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
