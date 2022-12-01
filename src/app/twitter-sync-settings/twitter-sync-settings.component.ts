//@ts-strict
import { Component, OnDestroy } from "@angular/core";
import { Router } from "@angular/router";
import { forkJoin, Observable, of } from "rxjs";
import { catchError, finalize, first, switchMap, takeWhile } from "rxjs/operators";
import { GlobalVarsService } from "src/app/global-vars.service";
import { IdentityService, TransactionSpendingLimitResponse } from "src/app/identity.service";
import {
  GetCurrentSubscriptionsResponse,
  GetDerivedKeyStatusResponse,
  SetuService,
  SubscriptionType,
} from "src/app/setu.service";
import { SwalHelper } from "../../lib/helpers/swal-helper";

interface TwitterUserData {
  twitter_user_id: string;
  twitter_user_profile_image: string;
  twitter_username: string;
}

const buildLocalStorageKey = (publicKey: string) => `connectedTwitterAccount_${publicKey}`;

@Component({
  selector: "app-twitter-sync-settings",
  templateUrl: "./twitter-sync-settings.component.html",
  styleUrls: ["./twitter-sync-settings.component.scss"],
})
export class TwitterSyncSettingsComponent implements OnDestroy {
  isDestroyed: boolean = false;
  twitterUserData?: TwitterUserData;
  boundPostMessageListener?: (event: MessageEvent) => void;
  setuSubscriptions?: GetCurrentSubscriptionsResponse;
  derivedKeyStatus?: GetDerivedKeyStatusResponse;
  isProcessingSubscription: boolean = false;
  isUpdatingSubscriptionStatus: boolean = false;

  get hasActiveSubscription() {
    return (
      !!this.twitterUserData &&
      !this.derivedKeyStatus?.is_expired &&
      this.derivedKeyStatus?.status === "success" &&
      !!this.setuSubscriptions
    );
  }

  constructor(
    public globalVars: GlobalVarsService,
    private setu: SetuService,
    private identity: IdentityService,
    private router: Router
  ) {
    if (this.globalVars.loggedInUser) {
      const storedTwitterUserData = window.localStorage.getItem(
        buildLocalStorageKey(this.globalVars.loggedInUser.PublicKeyBase58Check)
      );

      if (storedTwitterUserData) {
        this.twitterUserData = JSON.parse(storedTwitterUserData);
        this.isUpdatingSubscriptionStatus = true;
        this.updateSubscriptionStatus();
      }
    }
  }

  loginWithTwitter() {
    this.boundPostMessageListener = this.postMessageListener.bind(this);
    window.addEventListener("message", this.boundPostMessageListener);

    const h = 1000;
    const w = 800;
    const y = window.outerHeight / 2 + window.screenY - h / 2;
    const x = window.outerWidth / 2 + window.screenX - w / 2;

    window.open(
      "https://web3setu.com/login_twitter_diamond",
      "SetuTwitterLoginWindow",
      `toolbar=no, width=${w}, height=${h}, top=${y}, left=${x}`
    );
  }

  updateDerivedKey() {
    if (!this.globalVars.loggedInUser) {
      throw new Error("cannot generate a derived key without a logged in user");
    }
    const publicKey = this.globalVars.loggedInUser.PublicKeyBase58Check;
    return this.identity
      .launchDerive(
        publicKey,
        {
          GlobalDESOLimit: 1e9,
          TransactionCountLimitMap: {
            SUBMIT_POST: 1e6,
            AUTHORIZE_DERIVED_KEY: 1,
          },
        } as TransactionSpendingLimitResponse,
        365 * 10
      )
      .pipe(
        switchMap((derivedKeyPayload) => {
          return this.setu.updateDerivedKey({
            derivedSeedHex: derivedKeyPayload.derivedSeedHex,
            derivedPublicKey: derivedKeyPayload.derivedPublicKeyBase58Check,
            publicKeyBase58Check: derivedKeyPayload.publicKeyBase58Check,
            expirationBlock: derivedKeyPayload.expirationBlock,
            accessSignature: derivedKeyPayload.accessSignature,
            jwt: derivedKeyPayload.jwt,
            derivedJwt: derivedKeyPayload.derivedJwt,
            transactionSpendingLimitHex: derivedKeyPayload.transactionSpendingLimitHex,
          });
        }),
        switchMap(({ TransactionHex }) => {
          return this.identity.sign({
            transactionHex: TransactionHex,
            ...this.identity.identityServiceParamsForKey(publicKey),
          });
        }),
        switchMap(({ signedTransactionHex }) => {
          return this.setu.submitTx(signedTransactionHex);
        }),
        switchMap(() => {
          return this.setu.changeSignedStatus({ public_key: publicKey });
        }),
        takeWhile(() => !this.isDestroyed),
        first()
      );
  }

  /**
   * First we create a derived key that the setu twitter bot can use to make posts on the users behalf.
   * We send this key to setu and then update the users setu subscription with a reasonable default:
   * sync all tweets except reposts and quote reposts.
   *
   */
  syncAllTweets() {
    if (!(this.globalVars.loggedInUser?.ProfileEntryResponse && this.twitterUserData)) {
      throw new Error("cannot sync tweets without a profile");
    }

    const params = {
      username_deso: this.globalVars.loggedInUser.ProfileEntryResponse?.Username,
      public_key: this.globalVars.loggedInUser.PublicKeyBase58Check,
      twitter_username: this.twitterUserData.twitter_username,
      twitter_user_id: this.twitterUserData.twitter_user_id,
      subscription_type: "all_tweets" as SubscriptionType,
      include_retweets: false,
      include_quote_tweets: false,
      hashtags: "",
    };
    this.isProcessingSubscription = true;

    let obs$: Observable<GetCurrentSubscriptionsResponse>;
    if (!this.derivedKeyStatus || this.derivedKeyStatus?.is_expired || this.derivedKeyStatus.status !== "success") {
      obs$ = this.updateDerivedKey().pipe(
        switchMap(() => {
          return this.setuSubscriptions ? this.setu.changeSubscription(params) : this.setu.createSubscription(params);
        })
      );
    } else {
      obs$ = this.setuSubscriptions ? this.setu.changeSubscription(params) : this.setu.createSubscription(params);
    }

    obs$.pipe(finalize(() => (this.isProcessingSubscription = false))).subscribe(
      (res) => {
        this.setuSubscriptions = res;
        this.globalVars._alertSuccess(
          "Great, you're all set up! Tweets posted on twitter.com will sync to the Deso blockchain.",
          undefined,
          () => {
            this.router.navigate(["/browse"], {
              queryParamsHandling: "merge",
            });
          }
        );
      },
      (err) => {
        this.globalVars._alertError(err.error?.error ?? "Something went wrong! Please try again.");
      }
    );
  }

  unsubscribe() {
    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      icon: "warning",
      title: "Warning",
      html: "Are you sure you want to stop syncing your tweets to the DeSo blockchain?",
      showConfirmButton: true,
      showCancelButton: true,
      focusConfirm: true,
      customClass: {
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
    }).then(({ isConfirmed }) => {
      if (!isConfirmed) return;

      if (!(this.twitterUserData && this.globalVars.loggedInUser)) {
        this.globalVars._alertError("Something went wrong! Please try reloading the page.");
        return;
      }
      this.isProcessingSubscription = true;
      this.setu
        .unsubscribe({
          twitter_user_id: this.twitterUserData.twitter_user_id,
          public_key: this.globalVars.loggedInUser.PublicKeyBase58Check,
        })
        .pipe(finalize(() => (this.isProcessingSubscription = false)))
        .subscribe(
          (res) => {
            if (res.status === "success") {
              this.setuSubscriptions = undefined;
              this.twitterUserData = undefined;
              window.localStorage.removeItem(buildLocalStorageKey(this.globalVars.loggedInUser.PublicKeyBase58Check));
            }
          },
          (err) => {
            this.globalVars._alertError(err.error?.error ?? "Something went wrong! Please try again.");
          }
        );
    });
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    if (this.boundPostMessageListener) {
      window.removeEventListener("message", this.boundPostMessageListener);
    }
  }

  private postMessageListener(event: MessageEvent) {
    if (event.origin !== "https://web3setu.com") return;
    if (!event.data.twitter_user_id) {
      throw new Error("twitter user data missing");
    }

    const twitterUserData = event.data as TwitterUserData;
    this.twitterUserData = twitterUserData;
    this.updateSubscriptionStatus();
  }

  private updateSubscriptionStatus() {
    if (this.globalVars.loggedInUser && this.twitterUserData) {
      window.localStorage.setItem(
        buildLocalStorageKey(this.globalVars.loggedInUser.PublicKeyBase58Check),
        JSON.stringify(this.twitterUserData)
      );

      this.isUpdatingSubscriptionStatus;
      forkJoin([
        this.setu
          .getCurrentSubscription({
            public_key: this.globalVars.loggedInUser.PublicKeyBase58Check,
            twitter_user_id: this.twitterUserData.twitter_user_id,
          })
          .pipe(catchError((err: any) => of(undefined))),
        this.setu.getDerivedKeyStatus(this.globalVars.loggedInUser.PublicKeyBase58Check),
      ])
        .pipe(
          first(),
          finalize(() => (this.isUpdatingSubscriptionStatus = false))
        )
        .subscribe(
          ([subscription, derivedKeyStatus]) => {
            this.setuSubscriptions = subscription;
            this.derivedKeyStatus = derivedKeyStatus;
          },
          (err) => {
            this.setuSubscriptions = undefined;
            this.derivedKeyStatus = undefined;
          }
        );
    }
  }
}
