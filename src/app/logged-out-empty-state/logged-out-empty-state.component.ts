//@ts-strict
import { Component, Input } from "@angular/core";
import { GlobalVarsService } from "src/app/global-vars.service";

@Component({
  selector: "app-logged-out-empty-state",
  templateUrl: "./logged-out-empty-state.component.html",
  styleUrls: ["./logged-out-empty-state.component.scss"],
})
export class LoggedOutEmptyStateComponent {
  @Input() buttonText?: string;
  @Input() headingText?: string;
  @Input() subheadingText?: string;
  @Input() imgSrc?: string;

  constructor(private globalVars: GlobalVarsService) {}

  login() {
    this.globalVars.launchLoginFlow();
  }
}
