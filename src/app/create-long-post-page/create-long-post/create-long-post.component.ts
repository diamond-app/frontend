import { Component } from "@angular/core";

@Component({
  selector: "create-long-post",
  templateUrl: "./create-long-post.component.html",
  styleUrls: ["./create-long-post.component.scss"],
})
export class CreateLongPostComponent {
  constructor() {}

  handleContentChange($event) {
    console.log("Content changed: ", $event);
  }
}
