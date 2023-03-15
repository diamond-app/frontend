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
  @Input() onItemClick: (threadListItem: DecryptedMessageEntryResponse) => void = () => {};

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

  constructor(public globalVars: GlobalVarsService) {}
}
