//@ts-strict
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { map, switchMap } from "rxjs/operators";
import { GlobalVarsService } from "src/app/global-vars.service";
import { IdentityService } from "src/app/identity.service";
import { environment } from "src/environments/environment";

const buildURL = (endpoint: string) => `${environment.setuAPI}/${endpoint}`;

type SubscriptionType = "all_tweets" | "include_hashtags" | "exclude_hashtags";

interface SubscriptionParams {
  public_key: string; // deso public key
  twitter_user_id: string;
  subscription_type: SubscriptionType;
  hashtags: string; // comma delimited string: "#web3,#deso,#setu"
  include_retweets: boolean;
  include_quote_tweets: boolean;
}

export type GetCurrentSubscriptionsResponse = {
  status: string;
} & Omit<SubscriptionParams, "public_key">;

export interface GetDerivedKeyStatusResponse {
  is_expired: false;
  status: string;
}

@Injectable({
  providedIn: "root",
})
export class SetuService {
  constructor(private http: HttpClient, private identity: IdentityService, private globalVars: GlobalVarsService) {}

  getDerivedKeyStatus(parentPublicKey: string): Observable<GetDerivedKeyStatusResponse> {
    return this.http.post<GetDerivedKeyStatusResponse>(buildURL("real-time-sync/get-derived-key-status"), {
      public_key: parentPublicKey,
    });
  }

  updateDerivedKey(params: {
    publicKey: string;
    derivedSeedHex: string;
    derivedPublicKey: string;
    btcDepositAddress: string;
    ethDepositAddress: string;
    expirationBlock: number;
    network: string;
    accessSignature: string;
  }): Observable<{ status: string }> {
    return this.getJwt().pipe(
      switchMap((jwt) => {
        return this.http.post<{ status: string }>(buildURL("real-time-sync/derived-cred-callback"), {
          ...params,
          jwt,
        });
      })
    );
  }

  // Q: when would we ever set this to anything other than 1?
  changeSignedStatus(params: { public_key: string; is_signed: 1 | 0 }): Observable<{ status: string }> {
    return this.getJwt().pipe(
      switchMap((jwt) => {
        return this.http.post<{ status: string }>(buildURL("real-time-sync/change-sign-status"), {
          ...params,
          jwt,
        });
      })
    );
  }

  getCurrentSubscription(
    params: Pick<SubscriptionParams, "public_key" | "twitter_user_id">
  ): Observable<GetCurrentSubscriptionsResponse> {
    return this.http.post<GetCurrentSubscriptionsResponse>(
      buildURL("real-time-sync/get-current-subscriptions"),
      params
    );
  }

  createSubscription(
    params: SubscriptionParams & { username_deso: string; twitter_username: string }
  ): Observable<GetCurrentSubscriptionsResponse> {
    return this.getJwt().pipe(
      switchMap((jwt) => {
        return this.http.post<GetCurrentSubscriptionsResponse>(buildURL("real-time-sync/create-subscription"), {
          ...params,
          jwt,
        });
      })
    );
  }

  changeSubscription(params: SubscriptionParams): Observable<GetCurrentSubscriptionsResponse> {
    return this.getJwt().pipe(
      switchMap((jwt) => {
        return this.http.post<GetCurrentSubscriptionsResponse>(buildURL("real-time-sync/change-subscription-type"), {
          ...params,
          jwt,
        });
      })
    );
  }

  unsubscribe(params: Pick<SubscriptionParams, "public_key" | "twitter_user_id">): Observable<{ status: string }> {
    return this.getJwt().pipe(
      switchMap((jwt) => {
        return this.http.post<{ status: string }>(buildURL("real-time-sync/unsubscribe"), {
          ...params,
          jwt,
        });
      })
    );
  }

  private getJwt(): Observable<string> {
    if (!this.globalVars.loggedInUser) {
      throw new Error("Cannot get jwt without a logged in user");
    }

    return this.identity
      .jwt({
        ...this.identity.identityServiceParamsForKey(this.globalVars.loggedInUser.PublicKeyBase58Check),
      })
      .pipe(map(({ jwt }) => jwt));
  }
}
