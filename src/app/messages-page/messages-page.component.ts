import { Component, OnDestroy, OnInit } from "@angular/core";
import {
  AccessGroupEntryResponse,
  ChatType,
  DecryptedMessageEntryResponse,
  getAllAccessGroups,
  getAllMessageThreads,
  getPaginatedDMThread,
  getPaginatedGroupChatThread,
  identity,
  PublicKeyToProfileEntryResponseMap,
} from "deso-protocol";
import { GlobalVarsService } from "src/app/global-vars.service";

@Component({
  selector: "app-messages-page",
  templateUrl: "./messages-page.component.html",
  styleUrls: ["./messages-page.component.scss"],
})
export class MessagesPageComponent implements OnInit, OnDestroy {
  isLoadingThreadList: boolean = false;
  threadPreviewList: DecryptedMessageEntryResponse[] = [];
  publicKeyToProfileMap: PublicKeyToProfileEntryResponseMap = {};
  isDestroyed = false;
  selectedThread: DecryptedMessageEntryResponse | null = null;
  threadMessages: DecryptedMessageEntryResponse[] = [];
  accessGroups: AccessGroupEntryResponse[] = [];

  selectThread = (threadListItem: DecryptedMessageEntryResponse) => {
    this.selectedThread = threadListItem;

    switch (this.selectedThread.ChatType) {
      case ChatType.DM:
        getPaginatedDMThread({
          UserGroupOwnerPublicKeyBase58Check: this.globalVars.loggedInUser.PublicKeyBase58Check,
          UserGroupKeyName: "default-key",
          PartyGroupKeyName: "default-key",
          PartyGroupOwnerPublicKeyBase58Check: this.selectedThread.IsSender
            ? this.selectedThread.RecipientInfo.OwnerPublicKeyBase58Check
            : this.selectedThread.SenderInfo.OwnerPublicKeyBase58Check,
          StartTimeStampString: this.selectedThread.MessageInfo.TimestampNanosString,
          MaxMessagesToFetch: 3,
        })
          .then((thread) => {
            return Promise.all(thread.ThreadMessages.map((message) => identity.decryptMessage(message, []))).then(
              (decryptedMessages) => {
                if (this.isDestroyed) return;
                this.threadMessages = [...decryptedMessages.reverse(), this.selectedThread];
              }
            );
          })
          .catch((err) => {
            this.globalVars._alertError(err.error.error);
          });
        break;
      case ChatType.GROUPCHAT:
        getPaginatedGroupChatThread({
          UserPublicKeyBase58Check: this.selectedThread.RecipientInfo.OwnerPublicKeyBase58Check,
          AccessGroupKeyName: this.selectedThread.RecipientInfo.AccessGroupKeyName,
          StartTimeStampString: this.selectedThread.MessageInfo.TimestampNanosString,
          MaxMessagesToFetch: 3,
        })
          .then((thread) => {
            Object.assign(this.publicKeyToProfileMap, thread.PublicKeyToProfileEntryResponse);
            return Promise.all(
              thread.GroupChatMessages.map((message) => identity.decryptMessage(message, this.accessGroups))
            ).then((decryptedMessages) => {
              if (this.isDestroyed) return;
              this.threadMessages = [...decryptedMessages.reverse(), this.selectedThread];
            });
          })
          .catch((err) => {
            this.globalVars._alertError(err.error.error);
          });
        break;
      default:
        throw new Error("Unknown chat type");
    }
  };

  constructor(public globalVars: GlobalVarsService) {}

  ngOnInit() {
    if (this.globalVars.loggedInUser) {
      this.isLoadingThreadList = true;
      Promise.all([
        getAllMessageThreads({
          UserPublicKeyBase58Check: this.globalVars.loggedInUser.PublicKeyBase58Check,
        }),
        getAllAccessGroups({
          PublicKeyBase58Check: this.globalVars.loggedInUser.PublicKeyBase58Check,
        }),
      ])
        .then(([threads, groups]) => {
          this.accessGroups = [...groups.AccessGroupsMember, ...groups.AccessGroupsOwned];
          return Promise.all(
            threads.MessageThreads.map((message) => identity.decryptMessage(message, this.accessGroups))
          ).then((decryptedMessages) => {
            if (this.isDestroyed) return;
            this.threadPreviewList = decryptedMessages;
            this.publicKeyToProfileMap = threads.PublicKeyToProfileEntryResponse;
            // Select the first thread by default. Maybe we should do something smarter here.
            this.selectThread(decryptedMessages[0]);
          });
        })
        .catch((err) => {
          this.globalVars._alertError(err.error.error);
        })
        .finally(() => {
          if (this.isDestroyed) return;
          this.isLoadingThreadList = false;
        });
    }
  }

  ngOnDestroy() {
    this.isDestroyed = true;
  }
}
