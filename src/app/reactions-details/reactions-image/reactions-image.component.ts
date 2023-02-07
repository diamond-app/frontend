import { Component, Input, OnInit } from "@angular/core";
import { AssociationReactionValue } from "../../backend-api.service";

@Component({
  selector: "reactions-image",
  templateUrl: "./reactions-image.component.html",
  styleUrls: ["./reactions-image.component.scss"],
})
export class ReactionsImageComponent implements OnInit {
  @Input() reaction: AssociationReactionValue;
  @Input() size: number = 30;

  imageUrl: string = "";

  ngOnInit() {
    this.imageUrl = `/assets/reactions/${this.reaction.toLowerCase()}.png`;
  }
}
