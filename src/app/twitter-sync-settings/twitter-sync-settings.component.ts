//@ts-strict
import { Component, OnDestroy } from "@angular/core";
import { forkJoin } from "rxjs";
import { first } from "rxjs/operators";
import { GlobalVarsService } from "src/app/global-vars.service";
import { GetCurrentSubscriptionsResponse, GetDerivedKeyStatusResponse, SetuService } from "src/app/setu.service";

interface TwitterUserData {
  twitter_user_id: string;
  twitter_user_profile_image: string;
  twitter_username: string;
}

const TWITTER_USER_DATA_LOCAL_STORAGE_KEY = "twitterUserData";

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

  constructor(private setu: SetuService, private globalVars: GlobalVarsService) {
    this.updateTwitterUserData();
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

  ngOnDestroy() {
    this.isDestroyed = true;
    if (this.boundPostMessageListener) {
      window.removeEventListener("message", this.boundPostMessageListener);
    }
  }

  private updateTwitterUserData() {
    if (this.globalVars.loggedInUser) {
      this.twitterUserData = this.getStoredTwitterUser();
      if (this.twitterUserData) {
        forkJoin([
          this.setu.getCurrentSubscription({
            public_key: this.globalVars.loggedInUser.PublicKeyBase58Check,
            twitter_user_id: this.twitterUserData.twitter_user_id,
          }),
          this.setu.getDerivedKeyStatus(this.globalVars.loggedInUser.PublicKeyBase58Check),
        ])
          .pipe(first())
          .subscribe(
            ([subscription, derivedKeyStatus]) => {
              this.setuSubscriptions = subscription;
              this.derivedKeyStatus = derivedKeyStatus;
            },
            (err) => {
              // TODO: error handling
            }
          );
      }
    }
  }

  private postMessageListener(event: MessageEvent) {
    if (event.origin !== "https://web3setu.com") return;
    if (!event.data.twitter_user_id) {
      throw new Error("twitter user data missing");
    }

    this.setStoredTwitterUser(event.data);
    this.twitterUserData = event.data as TwitterUserData;
    this.updateTwitterUserData();
  }

  private getStoredTwitterUser(): TwitterUserData | undefined {
    if (!this.globalVars.loggedInUser) {
      throw new Error("Cannot get twitter data without a logged in user.");
    }

    const storedTwitterUserData = window.localStorage.getItem(
      `twitterUserData_${this.globalVars.loggedInUser.PublicKeyBase58Check}`
    );

    if (storedTwitterUserData) {
      return JSON.parse(storedTwitterUserData);
    }

    return undefined;
  }

  private setStoredTwitterUser(data: TwitterUserData) {
    if (!this.globalVars.loggedInUser) {
      throw new Error("Cannot set twitter data without a logged in user.");
    }

    // NOTE: we key this on the logged in user's public key in case the user
    // links their twitter account with one user, then switches accounts. We
    // also ensure that only 1 deso user can be linked to a given twitter
    // account.
    window.localStorage.setItem(
      `${TWITTER_USER_DATA_LOCAL_STORAGE_KEY}_${this.globalVars.loggedInUser.PublicKeyBase58Check}`,
      JSON.stringify(data)
    );
  }
}
