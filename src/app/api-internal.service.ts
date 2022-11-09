//@ts-strict
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { map, switchMap } from "rxjs/operators";
import { BackendApiService } from "src/app/backend-api.service";
import { IdentityService } from "src/app/identity.service";
import { environment } from "src/environments/environment";

const ENDPOINTS = Object.freeze({
  appUser: "app-user",
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
}

export const NEW_APP_USER_DEFAULTS = {
  ActivityDigestFrequency: 0,
  EarningsDigestFrequency: 0,
  ReceiveLikeNotif: false,
  ReceiveCoinPurchaseNotif: false,
  ReceiveFollowNotif: false,
  ReceiveBasicTransferNotif: false,
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

@Injectable({
  providedIn: "root",
})
export class ApiInternalService {
  appUser: any;

  constructor(
    private httpClient: HttpClient,
    private identity: IdentityService,
    private backendAPI: BackendApiService
  ) {}

  getAppUser(publickey: string): Observable<any> {
    return this.getAuthHeaders().pipe(
      switchMap((headers) => this.httpClient.get<any>(buildUrl(`${ENDPOINTS.appUser}/${publickey}`), { headers }))
    );
  }

  createAppUser(PublicKeyBase58check: string, Username: string, LastNotificationScannedIndex: number) {
    const payload = {
      ...NEW_APP_USER_DEFAULTS,
      PublicKeyBase58check,
      Username,
      LastNotificationScannedIndex,
    };
    return this.getAuthHeaders().pipe(
      switchMap((headers) => this.httpClient.post<any>(buildUrl(ENDPOINTS.appUser), payload, { headers }))
    );
  }

  updateAppUser(payload: AppUser) {
    return this.getAuthHeaders().pipe(
      switchMap((headers) =>
        this.httpClient.put<any>(buildUrl(`${ENDPOINTS.appUser}/${payload.PublicKeyBase58check}`), payload, { headers })
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

  private getAuthHeaders(): Observable<{ Authorization: string; "Diamond-Public-Key-Base58-Check": string }> {
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
}
