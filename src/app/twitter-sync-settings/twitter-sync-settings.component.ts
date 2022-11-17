//@ts-strict
import { Component, OnDestroy } from "@angular/core";
import { first } from "rxjs/operators";
import { SetuService } from "src/app/setu.service";

@Component({
  selector: "app-twitter-sync-settings",
  templateUrl: "./twitter-sync-settings.component.html",
  styleUrls: ["./twitter-sync-settings.component.scss"],
})
export class TwitterSyncSettingsComponent implements OnDestroy {
  settings: any;

  private messageListener = (event: MessageEvent) => {
    console.log(event);
    if (event.origin !== "https://web3setu.com") return;
    console.log("setu event!", event);
  };

  constructor(private setu: SetuService) {
    window.addEventListener("message", this.messageListener);
    this.setu
      .getSettings()
      .pipe(first())
      .subscribe((res) => {
        console.log(res);
      });
  }

  loginWithTwitter() {
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
    window.removeEventListener("message", this.messageListener);
  }
}
