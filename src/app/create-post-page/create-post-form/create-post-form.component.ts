import { AfterViewInit, Component, Input } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { Router } from "@angular/router";
import { FeedComponent } from "../../feed/feed.component";
import { TutorialStatus } from "../../backend-api.service";

@Component({
  selector: "create-post-form",
  templateUrl: "./create-post-form.component.html",
  styleUrls: ["./create-post-form.component.scss"],
})
export class CreatePostFormComponent implements AfterViewInit {
  @Input() inTutorial: boolean = false;
  skipTutorialExitPrompt = false;
  constructor(public globalVars: GlobalVarsService, public router: Router) {}

  onPostCreated(postEntryResponse) {
    if (this.inTutorial) {
      this.globalVars.updateEverything().add(() => {
        this.exitTutorial();
        this.router.navigate(["/" + this.globalVars.RouteNames.BROWSE], {
          queryParams: { feedTab: FeedComponent.FOLLOWING_TAB },
        });
        window.location.reload();
        return;
      });
    } else {
      // Twitter takes you to the main feed with your post at the top. That's more work so I'm just
      // taking the user to his profile for now. Hopefully the new post appears near the top.
      // TODO: Twitter's behavior is prob better, do that instead
      this.router.navigate(
        ["/" + this.globalVars.RouteNames.USER_PREFIX, postEntryResponse.ProfileEntryResponse.Username],
        { queryParamsHandling: "merge" }
      );
    }
  }

  ngAfterViewInit() {
    if (this.inTutorial) {
      // Prevent users from getting trapped at the post step
      if (this.globalVars.loggedInUser.TutorialStatus === TutorialStatus.COMPLETE) {
        this.router.navigate(["/" + this.globalVars.RouteNames.BROWSE], {
          queryParams: { feedTab: FeedComponent.HOT_TAB },
        });
      } else {
        this.globalVars.preventBackButton();
      }
    }
  }

  skipPostStep() {
    this.exitTutorial();
    this.globalVars.skipToNextTutorialStep(TutorialStatus.COMPLETE, "tutorial : post : create : skip", true, true);
  }

  tutorialCleanUp() {}

  exitTutorial() {
    this.skipTutorialExitPrompt = true;
    this.skipTutorialExitPrompt = false;
  }
}
