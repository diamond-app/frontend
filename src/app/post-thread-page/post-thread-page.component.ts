import { Component } from "@angular/core";
import { PageLayoutService } from "../../page-layout.service";

@Component({
  selector: "post-thread-page",
  templateUrl: "./post-thread-page.component.html",
  styleUrls: ["./post-thread-page.component.scss"],
})
export class PostThreadPageComponent {
  isLeftBarMobileOpen: boolean = false;
  title: string = null;

  constructor(private pageLayoutService: PageLayoutService) {
    this.pageLayoutService.updateConfig({
      simpleTopBar: true,
      title: this.title,
    });
  }
}
