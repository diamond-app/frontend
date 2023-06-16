import { Component, OnInit } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { Router } from "@angular/router";
import { TrackingService } from "../../../tracking.service";
import { environment } from "../../../../environments/environment";
import { RouteNames } from "../../../app-routing.module";
import { BackendApiService, TutorialStatus } from "../../../backend-api.service";
import { GlobalVarsService } from "../../../global-vars.service";
import { PostEntryResponse } from "deso-protocol";

@Component({
  selector: "diamond-tutorial",
  templateUrl: "./diamond-tutorial.component.html",
  styleUrls: ["./diamond-tutorial.component.scss"],
})
export class DiamondTutorialComponent implements OnInit {
  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private titleService: Title,
    private router: Router,
    private tracking: TrackingService
  ) {}

  skipTutorialExitPrompt = false;
  post: PostEntryResponse;
  // Use this posthash in testnet.
  // postHashHex = "3e42215a120a6e9d4848117f5829a2c4d9f692360fd14b78daea483a72d142dc";
  postHashHex = "75f16239b57de0531f9579f3817beb0a67515e4999947f293c112fb0260178e4";
  loading: boolean = true;

  ngOnInit() {
    this.globalVars.preventBackButton();
    this.titleService.setTitle(`Diamond Tutorial - ${environment.node.name}`);
    this.backendApi
      .GetSinglePost(this.postHashHex, this.globalVars.loggedInUser?.PublicKeyBase58Check, false, 0, 0, false)
      .subscribe((res) => {
        this.post = res.PostFound;
        this.initiateIntro();
      })
      .add(() => (this.loading = false));
  }

  onDiamondSent(): void {
    this.exitTutorial();
    setTimeout(() => {
      this.globalVars.loggedInUser.TutorialStatus = TutorialStatus.DIAMOND;
      this.globalVars.loggedInUser.MustCompleteTutorial = false;
      this.tracking.log("diamond : send : next");
      this.router.navigate([RouteNames.TUTORIAL + "/" + RouteNames.CREATE_POST]);
    }, 6000);
  }

  initiateIntro() {}

  skipDiamondsStep() {
    this.exitTutorial();
    this.globalVars.skipToNextTutorialStep(TutorialStatus.DIAMOND, "tutorial : diamond : send : skip");
  }

  tutorialCleanUp() {}

  exitTutorial() {
    this.skipTutorialExitPrompt = true;
    this.skipTutorialExitPrompt = false;
  }
}
