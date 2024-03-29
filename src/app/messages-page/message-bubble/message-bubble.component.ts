// @ts-strict
import { Component, Input } from "@angular/core";
import { DecryptedMessageEntryResponse, ProfileEntryResponse, PublicKeyToProfileEntryResponseMap } from "deso-protocol";
import { GlobalVarsService } from "../../global-vars.service";

@Component({
  selector: "message-bubble",
  templateUrl: "./message-bubble.component.html",
  styleUrls: ["./message-bubble.component.scss"],
})
export class MessageBubbleComponent {
  @Input() message!: DecryptedMessageEntryResponse;
  @Input() nextMessage!: DecryptedMessageEntryResponse;
  @Input() profile?: ProfileEntryResponse;
  @Input() publicKeyToProfileMap: PublicKeyToProfileEntryResponseMap = {};

  get hasError() {
    return !!this.message.error;
  }

  get messageText() {
    return this.message.error ? this.message.error : this.message.DecryptedMessage;
  }

  constructor(public globalVars: GlobalVarsService) {}
}
