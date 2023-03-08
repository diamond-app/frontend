import { Component, Input } from "@angular/core";
import { DecryptedMessageEntryResponse } from "deso-protocol";
import { GlobalVarsService } from "../../global-vars.service";

@Component({
  selector: "messages-thread",
  templateUrl: "./messages-thread.component.html",
  styleUrls: ["./messages-thread.component.scss"],
})
export class MessagesThreadComponent {
  @Input() threadPreview: DecryptedMessageEntryResponse;
  @Input() isSelected: boolean;
  isHovered = false;

  get hasUnreadMessages() {
    // TODO: we don't have a great way to do this at the moment. We can do something with the off-chain db.
    return false;
  }

  get previewPublicKeyBase58Check() {
    return this.threadPreview.SenderInfo?.OwnerPublicKeyBase58Check;
  }

  get previewProfileEntry() {
    return this.globalVars.messagesPublicKeyToProfileMap[this.previewPublicKeyBase58Check];
  }

  constructor(public globalVars: GlobalVarsService) {}
}
