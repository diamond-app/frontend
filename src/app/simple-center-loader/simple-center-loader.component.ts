import { Component, Input, OnInit } from "@angular/core";
import { environment } from "../../environments/environment";

@Component({
  selector: "simple-center-loader",
  templateUrl: "./simple-center-loader.component.html",
  styleUrls: ["./simple-center-loader.component.scss"],
})
export class SimpleCenterLoaderComponent implements OnInit {
  @Input() titleLoadingText: string;
  @Input() size: "l" | "m" | "s" = "l";
  @Input() hideLoadingText: boolean = false;
  @Input() diamondHeight: number;
  environment = environment;

  isDark: boolean = false;

  constructor() {}

  ngOnInit() {
    this.isDark = localStorage.getItem("theme") === "dark";
  }

  reload() {
    window.location.reload();
  }

  doesFileExist(urlToFile) {
    const xhr = new XMLHttpRequest();
    try {
      xhr.open("HEAD", urlToFile, false);
      xhr.send();
    } catch (e) {
      console.error(e);
    }

    if (xhr.status === 404) {
      return false;
    } else {
      return true;
    }
  }

  getHeight() {
    switch (this.size) {
      case "s":
        return 150;
      case "m":
        return 200;
      case "l":
      default:
        return 400;
    }
  }

  getLoaderHeight() {
    return this.getHeight() / 4;
  }

  getFontSize() {
    switch (this.size) {
      case "s":
        return 16;
      case "m":
        return 20;
      case "l":
      default:
        return 24;
    }
  }
}
