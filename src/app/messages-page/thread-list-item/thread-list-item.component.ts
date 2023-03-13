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

  get senderProfile() {
    const key = this.listItem?.SenderInfo.OwnerPublicKeyBase58Check;
    return key ? this.publicKeyToProfileMap[key] : null;
  }

  get chatName() {
    return this.isGroupChat
      ? this.listItem?.RecipientInfo.AccessGroupKeyName
      : this.senderProfile?.Username || this.listItem?.SenderInfo.OwnerPublicKeyBase58Check;
  }

  constructor(public globalVars: GlobalVarsService) {}
}
