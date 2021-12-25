import { AfterViewInit, Component, Input } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { Router } from "@angular/router";
import { FeedComponent } from "../../feed/feed.component";
import { TutorialStatus } from "../../backend-api.service";
import * as introJs from "intro.js/intro";
import { SwalHelper } from "../../../lib/helpers/swal-helper";

@Component({
  selector: "create-post-form",
  templateUrl: "./create-post-form.component.html",
  styleUrls: ["./create-post-form.component.scss"],
})
export class CreatePostFormComponent implements AfterViewInit {
  @Input() inTutorial: boolean = false;
  introJS = introJs();
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
        this.initiateIntro();
      }
    }
  }

  initiateIntro() {
    setTimeout(() => this.postIntro(), 50);
  }

  postIntro() {
    this.introJS = introJs();
    const userCanExit = !this.globalVars.loggedInUser?.MustCompleteTutorial || this.globalVars.loggedInUser?.IsAdmin;
    const tooltipClass = userCanExit ? "tutorial-tooltip" : "tutorial-tooltip tutorial-header-hide";
    const title = 'Create a Post <span class="ml-5px tutorial-header-step">Step 4/4</span>';
    this.introJS.setOptions({
      tooltipClass,
      hideNext: true,
      exitOnEsc: false,
      exitOnOverlayClick: false,
      overlayOpacity: 0.8,
      steps: [
        {
          title,
          intro: `Last step! Create your first post so that other users can find you and invest in you. When you're done, <b>click the post button</b>`,
          element: document.querySelector("#tutorial-post-container"),
        },
      ],
    });
    this.introJS.onexit(() => {
      if (!this.skipTutorialExitPrompt) {
        this.globalVars.skipTutorial(this);
      }
    });
    this.introJS.start();
  }

  skipPostStep() {
    this.exitTutorial();
    this.globalVars.skipToNextTutorialStep(TutorialStatus.COMPLETE, "tutorial : post : create : skip", true, true);
  }

  tutorialCleanUp() {}

  exitTutorial() {
    this.skipTutorialExitPrompt = true;
    this.introJS.exit(true);
    this.skipTutorialExitPrompt = false;
  }
}
