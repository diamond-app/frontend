import { Component, OnDestroy, OnInit } from "@angular/core";
import {
  AccessGroupEntryResponse,
  ChatType,
  checkPartyAccessGroups,
  DecryptedMessageEntryResponse,
  getAllAccessGroups,
  getAllMessageThreads,
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
  accessGroups: AccessGroupEntryResponse[] = [];

  selectThread = (threadListItem: DecryptedMessageEntryResponse) => {
    this.selectedThread = threadListItem;
  };

  /**
   * After a search item is selected, we first search to see if it maps to an
   * existing thread. If it does, we select that thread. Otherwise, we create a
   * new thread manually client side and select it. The newly created thread is
   * a transient object that will not be persisted to the server until the user
   * sends a message.
   *
   * The item passed here could be a ProfileEntryResponse or an AccessGroupEntryResponse.
   */
  onSearchItemSelected = async (item: any) => {
    let existingThread: DecryptedMessageEntryResponse;

    if (item.PublicKeyBase58Check) {
      // this is single profile, so we search for a DM where this user is the counterpart.
      existingThread = this.threadPreviewList.find((thread) => {
        return (
          thread.ChatType === ChatType.DM &&
          (thread.SenderInfo.OwnerPublicKeyBase58Check === item.PublicKeyBase58Check ||
            thread.RecipientInfo.OwnerPublicKeyBase58Check === item.PublicKeyBase58Check)
        );
      });
    } else if (item.AccessGroupPublicKeyBase58Check) {
      // this is a group, so we search for a group chat where this group is the recipient.
      existingThread = this.threadPreviewList.find((thread) => {
        return (
          thread.ChatType === ChatType.GROUPCHAT &&
          thread.RecipientInfo.AccessGroupPublicKeyBase58Check === item.AccessGroupPublicKeyBase58Check
        );
      });

      // We only search existing group chats so if we don't find it something is wrong...
      if (!existingThread) {
        this.globalVars._alertError("Could not find group chat.");
        return;
      }
    }

    if (existingThread) {
      this.selectThread(existingThread);
      return;
    }

    // If we didn't find an existing thread, we create a new one, prepend it to
    // the thread preview list, and select it. NOTE: this only works for DM
    // chats. Group chats are more complicated and require a different UI flow
    // to create them.
    const { currentUser } = identity.snapshot();
    if (!currentUser) {
      this.globalVars._alertError("You must be logged in to create a new thread.");
      return;
    }

    try {
      const {
        RecipientAccessGroupPublicKeyBase58Check,
        SenderAccessGroupPublicKeyBase58Check,
        SenderPublicKeyBase58Check,
        RecipientPublicKeyBase58Check,
        SenderAccessGroupKeyName,
        RecipientAccessGroupKeyName,
      } = await checkPartyAccessGroups({
        SenderAccessGroupKeyName: "default-key",
        SenderPublicKeyBase58Check: currentUser?.publicKey,
        RecipientAccessGroupKeyName: "default-key",
        // NOTE: we'll need a more sophisticated way to determine the recipient's public key
        // once we start dealing with group chats.
        RecipientPublicKeyBase58Check: item.PublicKeyBase58Check,
      });

      // If we've gotten here we know we're dealing with an individual profile.
      // Update the public key to profile map with the selected profile.
      this.publicKeyToProfileMap[item.PublicKeyBase58Check] = item;

      // NOTE: This is a transient object that we create client side. It will be overwritten once we
      // actually send a message.
      const TimestampNanos = Date.now() * 1e6;
      const threadListItem: DecryptedMessageEntryResponse = {
        ChatType: ChatType.DM,
        SenderInfo: {
          OwnerPublicKeyBase58Check: SenderPublicKeyBase58Check,
          AccessGroupKeyName: SenderAccessGroupKeyName,
          AccessGroupPublicKeyBase58Check: SenderAccessGroupPublicKeyBase58Check,
        },
        RecipientInfo: {
          OwnerPublicKeyBase58Check: RecipientPublicKeyBase58Check,
          AccessGroupKeyName: RecipientAccessGroupKeyName,
          AccessGroupPublicKeyBase58Check: RecipientAccessGroupPublicKeyBase58Check,
        },
        MessageInfo: {
          EncryptedText: "",
          TimestampNanos,
          TimestampNanosString: TimestampNanos.toString(),
          ExtraData: {},
        },
        DecryptedMessage: "",
        IsSender: true,
        error: "",
      };
      this.threadPreviewList.unshift(threadListItem);
      this.selectThread(threadListItem);
    } catch (e) {
      this.globalVars._alertError(e?.error?.error ?? e?.message);
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
          this.accessGroups = [...(groups.AccessGroupsMember ?? []), ...(groups.AccessGroupsOwned ?? [])];
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
          this.globalVars._alertError(err?.error?.error ?? err?.message);
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
