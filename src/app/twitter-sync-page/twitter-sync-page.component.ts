import { Component } from "@angular/core";
import { GlobalVarsService } from "src/app/global-vars.service";

@Component({
  selector: "app-twitter-sync-page",
  templateUrl: "./twitter-sync-page.component.html",
  styleUrls: ["./twitter-sync-page.component.scss"],
})
export class TwitterSyncPageComponent {
  constructor(public globalVars: GlobalVarsService) {}
}
