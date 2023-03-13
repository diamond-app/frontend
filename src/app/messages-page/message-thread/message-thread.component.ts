import { Component, Input, OnChanges, OnDestroy } from "@angular/core";
import {
  AccessGroupEntryResponse,
  ChatType,
  DecryptedMessageEntryResponse,
  getPaginatedDMThread,
  getPaginatedGroupChatThread,
  identity,
  PublicKeyToProfileEntryResponseMap,
} from "deso-protocol";
import { GlobalVarsService } from "src/app/global-vars.service";

const THREAD_PAGE_SIZE = 100;

@Component({
  selector: "message-thread",
  templateUrl: "./message-thread.component.html",
  styleUrls: ["./message-thread.component.scss"],
})
export class MessageThreadComponent implements OnChanges, OnDestroy {
  @Input() threadHead: DecryptedMessageEntryResponse;
  @Input() publicKeyToProfileMap: PublicKeyToProfileEntryResponseMap = {};
  @Input() accessGroups: AccessGroupEntryResponse[] = [];

  isDestroyed = false;
  threadMessages: DecryptedMessageEntryResponse[] = [];

  #appendNewMessagesToThread = (messages: DecryptedMessageEntryResponse[]) => {
    if (this.isDestroyed) return;
    this.threadMessages = [...messages.reverse(), ...this.threadMessages, this.threadHead];
  };

  constructor(public globalVars: GlobalVarsService) {}

  ngOnChanges(changes): void {
    if (this.threadHead && changes.threadHead && changes.threadHead !== this.threadHead) {
      this.threadMessages = [];
      this.loadMessages();
    }
  }

  loadMessages() {
    switch (this.threadHead.ChatType) {
      case ChatType.DM:
        getPaginatedDMThread({
          UserGroupOwnerPublicKeyBase58Check: this.globalVars.loggedInUser.PublicKeyBase58Check,
          UserGroupKeyName: "default-key",
          PartyGroupKeyName: "default-key",
          PartyGroupOwnerPublicKeyBase58Check: this.threadHead.IsSender
            ? this.threadHead.RecipientInfo.OwnerPublicKeyBase58Check
            : this.threadHead.SenderInfo.OwnerPublicKeyBase58Check,
          StartTimeStampString: this.threadHead.MessageInfo.TimestampNanosString,
          MaxMessagesToFetch: THREAD_PAGE_SIZE,
        })
          .then((thread) => {
            return Promise.all(thread.ThreadMessages.map((message) => identity.decryptMessage(message, []))).then(
              this.#appendNewMessagesToThread
            );
          })
          .catch((err) => {
            this.globalVars._alertError(err.error.error);
          });
        break;
      case ChatType.GROUPCHAT:
        getPaginatedGroupChatThread({
          UserPublicKeyBase58Check: this.threadHead.RecipientInfo.OwnerPublicKeyBase58Check,
          AccessGroupKeyName: this.threadHead.RecipientInfo.AccessGroupKeyName,
          StartTimeStampString: this.threadHead.MessageInfo.TimestampNanosString,
          MaxMessagesToFetch: THREAD_PAGE_SIZE,
        })
          .then((thread) => {
            this.publicKeyToProfileMap = { ...this.publicKeyToProfileMap, ...thread.PublicKeyToProfileEntryResponse };
            return Promise.all(
              thread.GroupChatMessages.map((message) => identity.decryptMessage(message, this.accessGroups))
            ).then(this.#appendNewMessagesToThread);
          })
          .catch((err) => {
            this.globalVars._alertError(err.error.error);
          });
        break;
      default:
        throw new Error("Unknown chat type");
    }
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
  }
}
