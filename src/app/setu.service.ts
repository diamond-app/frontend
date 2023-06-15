//@ts-strict
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { identity } from "deso-protocol";
import { from, Observable } from "rxjs";
import { switchMap } from "rxjs/operators";
import { GlobalVarsService } from "./global-vars.service";
import { environment } from "../environments/environment";

const buildURL = (endpoint: string) => `${environment.setuAPI}/${endpoint}`;

export type SubscriptionType = "all_tweets" | "include_hashtags" | "exclude_hashtags";

interface SubscriptionParams {
  public_key: string; // deso public key
  derived_public_key?: string; // derived public key (only needed for metamask users),
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
  is_expired: boolean;
  status: string;
}

@Injectable({
  providedIn: "root",
})
export class SetuService {
  constructor(private http: HttpClient, private globalVars: GlobalVarsService) {}

  getDerivedKeyStatus(parentPublicKey: string): Observable<GetDerivedKeyStatusResponse> {
    return this.http.post<GetDerivedKeyStatusResponse>(buildURL("real-time-sync/get-derived-key-status"), {
      public_key: parentPublicKey,
    });
  }

  updateDerivedKey(params: {
    derivedSeedHex: string;
    derivedPublicKey: string;
    publicKeyBase58Check: string;
    expirationBlock: number;
    accessSignature: string;
    jwt: string;
    derivedJwt: string;
    transactionSpendingLimitHex: string;
  }): Observable<{ TransactionHex: string }> {
    return this.http.post<{ TransactionHex: string }>(buildURL("real-time-sync/derived-cred-callback"), params);
  }

  // Q: when would we ever set this to anything other than 1?
  changeSignedStatus(params: {
    public_key: string;
    derived_public_key?: string;
    is_signed?: 1 | 0;
  }): Observable<{ status: string }> {
    return this.getJwt().pipe(
      switchMap((jwt) => {
        return this.http.post<{ status: string }>(buildURL("real-time-sync/change-sign-status"), {
          ...params,
          is_signed: typeof params.is_signed === "undefined" ? 1 : params.is_signed,
          jwt,
        });
      })
    );
  }

  submitTx(signed_transaction_hex: string): Observable<GetDerivedKeyStatusResponse> {
    return this.http.post<GetDerivedKeyStatusResponse>(buildURL("tweets/submit-transaction"), {
      signed_transaction_hex,
    });
  }

  getCurrentSubscription(
    params: Pick<SubscriptionParams, "public_key" | "twitter_user_id">
  ): Observable<GetCurrentSubscriptionsResponse> {
    return this.http.post<GetCurrentSubscriptionsResponse>(
      buildURL("real-time-sync/get-current-subscriptions"),
      params
    );
  }

  // NOTE: this should only get called if no subscription exists.
  // setu allows creating up to 3 subscriptions per twitter account.
  // maybe we limit it to 1.
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

  unsubscribe(
    params: Pick<SubscriptionParams, "public_key" | "derived_public_key" | "twitter_user_id">
  ): Observable<{ status: string }> {
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

    return from(identity.jwt());
  }
}
