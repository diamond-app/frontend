import { Component, OnDestroy } from "@angular/core";
import { GlobalVarsService } from "src/app/global-vars.service";

@Component({
  selector: "app-twitter-sync-page",
  templateUrl: "./twitter-sync-page.component.html",
  styleUrls: ["./twitter-sync-page.component.scss"],
})
export class TwitterSyncPageComponent implements OnDestroy {
  constructor(public globalVars: GlobalVarsService) {}

  ngOnDestroy(): void {
    // NOTE: we exclude prompting the user to create a default messaging key on
    // the twitter sync page because it is part of the onboarding flow and we
    // don't want to interrupt them. However, if they've completed the flow and
    // do not have a messaging key, we prompt them now since twitter sync is the
    // last step in the onboarding flow.
    this.globalVars.getLoggedInUserDefaultKey();
  }
}
