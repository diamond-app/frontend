// @ts-strict
import { Component, Input } from "@angular/core";
import { ChatType, DecryptedMessageEntryResponse, PublicKeyToProfileEntryResponseMap } from "deso-protocol";
import { GlobalVarsService } from "src/app/global-vars.service";

@Component({
  selector: "thread-list-item",
  templateUrl: "./thread-list-item.component.html",
  styleUrls: ["./thread-list-item.component.scss"],
})
export class ThreadListItemComponent {
  @Input() listItem?: DecryptedMessageEntryResponse;
  @Input() publicKeyToProfileMap: PublicKeyToProfileEntryResponseMap = {};
  @Input() isSelected: boolean = false;
  @Input() onItemClick: (threadListItem: DecryptedMessageEntryResponse) => void = () => {};

  readonly chatImageSize: number = 40;

  get isGroupChat() {
    return this.listItem?.ChatType === ChatType.GROUPCHAT;
  }

  get previewPublicKey() {
    return this.listItem?.SenderInfo.OwnerPublicKeyBase58Check === this.globalVars.loggedInUser?.PublicKeyBase58Check
      ? this.listItem?.RecipientInfo.OwnerPublicKeyBase58Check
      : this.listItem?.SenderInfo.OwnerPublicKeyBase58Check;
  }

  get profile() {
    const key = this.previewPublicKey;
    return key ? this.publicKeyToProfileMap[key] : null;
  }

  get chatName() {
    return this.isGroupChat
      ? this.listItem?.RecipientInfo.AccessGroupKeyName
      : this.profile?.Username || this.previewPublicKey;
  }

  get initials() {
    // Generate initials instead of passing the real names for the chats for security reasons
    return (this.chatName || "")
      .split(" ")
      .map((e) => e.replace(/[^\w\s]|_/g, "").slice(0, 3))
      .join(" ");
  }

  constructor(public globalVars: GlobalVarsService) {}
}
