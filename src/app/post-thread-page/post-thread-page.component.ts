import { Component } from "@angular/core";

@Component({
  selector: "post-thread-page",
  templateUrl: "./post-thread-page.component.html",
  styleUrls: ["./post-thread-page.component.scss"],
})
export class PostThreadPageComponent {
  isLeftBarMobileOpen: boolean = false;
  title: string = null;

  constructor() {}
}
