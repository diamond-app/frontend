//@ts-strict
import { Component, OnDestroy } from "@angular/core";
import { Router } from "@angular/router";
import { identity, IdentityDerivePayload } from "deso-protocol";
import { forkJoin, from, Observable, of, throwError } from "rxjs";
import { catchError, finalize, first, switchMap, takeWhile } from "rxjs/operators";
import { GlobalVarsService } from "src/app/global-vars.service";
import {
  GetCurrentSubscriptionsResponse,
  GetDerivedKeyStatusResponse,
  SetuService,
  SubscriptionType,
} from "src/app/setu.service";
import { TrackingService } from "src/app/tracking.service";
import { SwalHelper } from "src/lib/helpers/swal-helper";

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
  isFetchingSubscriptionStatus: boolean = false;
  isOnboarding: boolean = false;

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
    private router: Router,
    private tracking: TrackingService
  ) {
    this.isOnboarding = !!this.router.getCurrentNavigation()?.extras.state?.fromSignUp;
    if (this.globalVars.loggedInUser) {
      const storedTwitterUserData = window.localStorage.getItem(
        buildLocalStorageKey(this.globalVars.loggedInUser?.PublicKeyBase58Check)
      );

      if (storedTwitterUserData) {
        this.twitterUserData = JSON.parse(storedTwitterUserData);
        this.isFetchingSubscriptionStatus = true;
        this.getSubscriptionStatus().subscribe(
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

  desoLogin() {
    this.globalVars.launchLoginFlow("twitter-sync-deso-login-button");
  }

  loginWithTwitter() {
    this.tracking.log("twitter-sync-twitter-login-button : click", { isOnboarding: this.isOnboarding });

    if (!this.boundPostMessageListener) {
      this.boundPostMessageListener = this.postMessageListener.bind(this);
      window.addEventListener("message", this.boundPostMessageListener);
    }

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
    const publicKey = this.globalVars.loggedInUser?.PublicKeyBase58Check;
    let derivedKey: string;
    return from(
      identity.derive(
        {
          GlobalDESOLimit: 1e9,
          TransactionCountLimitMap: {
            SUBMIT_POST: 1e6,
            AUTHORIZE_DERIVED_KEY: 1,
          },
        },
        {
          ownerPublicKey: publicKey,
          expirationDays: 365 * 10,
        }
      )
    ).pipe(
      switchMap((derivedKeyPayload) => {
        const payload = derivedKeyPayload as IdentityDerivePayload;
        // derivedKey = payload.derivedPublicKeyBase58Check;
        return this.setu.updateDerivedKey({
          derivedSeedHex: payload.derivedSeedHex as string,
          derivedPublicKey: payload.derivedPublicKeyBase58Check,
          publicKeyBase58Check: payload.publicKeyBase58Check,
          expirationBlock: payload.expirationBlock,
          accessSignature: payload.accessSignature,
          jwt: payload.jwt,
          derivedJwt: payload.derivedJwt,
          transactionSpendingLimitHex: payload.transactionSpendingLimitHex,
        });
      }),
      switchMap(({ TransactionHex }) => {
        return from(identity.signTx(TransactionHex));
      }),
      switchMap((signedTransactionHex) => {
        return this.setu.submitTx(signedTransactionHex);
      }),
      switchMap(() => {
        const { currentUser } = identity.snapshot();
        if (!currentUser) throw new Error("no current user found in identity");
        const derivedPublicKey = currentUser.primaryDerivedKey.derivedPublicKeyBase58Check;
        return this.setu.changeSignedStatus({
          public_key: publicKey,
          derived_public_key: derivedPublicKey,
        });
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

    const { currentUser } = identity.snapshot();

    const params = {
      username_deso: this.globalVars.loggedInUser.ProfileEntryResponse?.Username,
      public_key: this.globalVars.loggedInUser?.PublicKeyBase58Check,
      derived_public_key: currentUser?.primaryDerivedKey.derivedPublicKeyBase58Check,
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
          this.tracking.log("twitter-sync : update-derived-key", { isOnboarding: this.isOnboarding });
          return this.setuSubscriptions ? this.setu.changeSubscription(params) : this.setu.createSubscription(params);
        })
      );
    } else {
      obs$ = this.setuSubscriptions ? this.setu.changeSubscription(params) : this.setu.createSubscription(params);
    }

    obs$.pipe(finalize(() => (this.isProcessingSubscription = false))).subscribe(
      (res) => {
        this.tracking.log("twitter-sync : create-subscription", { isOnboarding: this.isOnboarding });
        this.setuSubscriptions = res;
        this.globalVars._alertSuccess(
          "Great, you're all set up! Tweets posted on Twitter will sync to the DeSo blockchain.",
          undefined,
          () => {
            this.router.navigate(["/browse"], {
              queryParamsHandling: "merge",
            });
          }
        );
      },
      (err) => {
        this.tracking.log("twitter-sync : create-subscription", {
          error: err.error?.error,
          isOnboarding: this.isOnboarding,
        });
        this.globalVars._alertError(err.error?.error ?? "Something went wrong! Please try again.");
      }
    );
  }

  unsubscribe() {
    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      icon: "warning",
      title: "Warning",
      html: this.setuSubscriptions
        ? "Are you sure you want to stop syncing your tweets to the DeSo blockchain?"
        : "Are you sure you want to disconnect your Twitter account?",
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

      if (!this.setuSubscriptions) {
        this.twitterUserData = undefined;
        window.localStorage.removeItem(buildLocalStorageKey(this.globalVars.loggedInUser?.PublicKeyBase58Check));
        return;
      }

      this.isProcessingSubscription = true;
      const { currentUser } = identity.snapshot();

      if (!currentUser) throw new Error("no current user found in identity");

      this.setu
        .unsubscribe({
          twitter_user_id: this.twitterUserData.twitter_user_id,
          public_key: this.globalVars.loggedInUser?.PublicKeyBase58Check,
          derived_public_key: currentUser.primaryDerivedKey.derivedPublicKeyBase58Check,
        })
        .pipe(finalize(() => (this.isProcessingSubscription = false)))
        .subscribe(
          (res) => {
            if (!this.twitterUserData) throw new Error("twitterUserData is undefined");

            if (res.status === "success") {
              this.tracking.log("twitter-sync : unsubscribe", {
                isOnboarding: this.isOnboarding,
                twitterHandle: this.twitterUserData.twitter_username,
              });
              this.setuSubscriptions = undefined;
              this.twitterUserData = undefined;
              window.localStorage.removeItem(buildLocalStorageKey(this.globalVars.loggedInUser?.PublicKeyBase58Check));
            }
          },
          (err) => {
            if (!this.twitterUserData) throw new Error("twitterUserData is undefined");
            this.tracking.log("twitter-sync : unsubscribe", {
              error: err.error?.error,
              isOnboarding: this.isOnboarding,
              twitterHandle: this.twitterUserData.twitter_username,
            });
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
    this.getSubscriptionStatus().subscribe(
      ([subscription, derivedKeyStatus]) => {
        this.setuSubscriptions = subscription;
        this.derivedKeyStatus = derivedKeyStatus;
        if (!this.hasActiveSubscription) {
          SwalHelper.fire({
            target: this.globalVars.getTargetComponentSelector(),
            icon: "info",
            title: "Sync your Tweets",
            html: "Are you ready to start syncing your tweets to the DeSo blockchain?",
            showConfirmButton: true,
            showCancelButton: true,
            focusConfirm: true,
            customClass: {
              confirmButton: "btn btn-light",
              cancelButton: "btn btn-light no",
            },
          }).then(({ isConfirmed }) => {
            if (isConfirmed) {
              this.tracking.log("twitter-sync : connect", {
                isOnboarding: this.isOnboarding,
                hasActiveSubscription: this.hasActiveSubscription,
                setuSubscription: this.setuSubscriptions,
                isDerivedKeyValid: !this.derivedKeyStatus?.is_expired && this.derivedKeyStatus?.status === "success",
                twitterHandle: twitterUserData.twitter_username,
              });
              this.syncAllTweets();
            } else {
              this.tracking.log("twitter-sync : cancel", {
                isOnboarding: this.isOnboarding,
                twitterHandle: twitterUserData.twitter_username,
              });
            }
          });
        } else {
          if (!this.derivedKeyStatus) throw new Error("derivedKeyStatus is missing");
          this.tracking.log("twitter-sync : connect", {
            isOnboarding: this.isOnboarding,
            hasActiveSubscription: this.hasActiveSubscription,
            setuSubscription: this.setuSubscriptions,
            isDerivedKeyValid: !this.derivedKeyStatus?.is_expired && this.derivedKeyStatus.status === "success",
            twitterHandle: twitterUserData.twitter_username,
          });
        }
      },
      (err) => {
        this.tracking.log("twitter-sync : get-subscription-error", { error: err.error?.error });
        this.globalVars._alertError(err.error?.error ?? "Something went wrong! Try reloading the page.");
        this.setuSubscriptions = undefined;
        this.derivedKeyStatus = undefined;
      }
    );
  }

  private getSubscriptionStatus(): Observable<
    [GetCurrentSubscriptionsResponse | undefined, GetDerivedKeyStatusResponse | undefined]
  > {
    if (this.globalVars.loggedInUser && this.twitterUserData) {
      window.localStorage.setItem(
        buildLocalStorageKey(this.globalVars.loggedInUser?.PublicKeyBase58Check),
        JSON.stringify(this.twitterUserData)
      );

      this.isFetchingSubscriptionStatus;
      // setu uses a 400 status code to indicate that the user has no
      // subscription and/or has no derived key. It should be 404 but it's
      // not...
      const handleError = (err: any) => (err?.status === 400 ? of(undefined) : throwError(err));
      return forkJoin([
        this.setu
          .getCurrentSubscription({
            public_key: this.globalVars.loggedInUser?.PublicKeyBase58Check,
            twitter_user_id: this.twitterUserData.twitter_user_id,
          })
          .pipe(catchError(handleError)),
        this.setu.getDerivedKeyStatus(this.globalVars.loggedInUser?.PublicKeyBase58Check).pipe(catchError(handleError)),
      ]).pipe(
        first(),
        finalize(() => (this.isFetchingSubscriptionStatus = false))
      );
    } else {
      return of([undefined, undefined]);
    }
  }
}
