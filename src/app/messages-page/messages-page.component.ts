import { Component, OnDestroy, OnInit } from "@angular/core";
import {
  AccessGroupEntryResponse,
  ChatType,
  checkPartyAccessGroups,
  DecryptedMessageEntryResponse,
  getAllAccessGroups,
  getAllMessageThreads,
  identity,
  ProfileEntryResponse,
  PublicKeyToProfileEntryResponseMap,
} from "deso-protocol";
import { BsModalService } from "ngx-bootstrap/modal";
import { GlobalVarsService } from "src/app/global-vars.service";
import { CreateAccessGroupComponent } from "src/app/messages-page/create-access-group/create-access-group.component";

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
  accessGroupsOwned: AccessGroupEntryResponse[] = [];
  mobileTopBarTitle = "";

  selectThread = (threadListItem: DecryptedMessageEntryResponse) => {
    if (this.globalVars.isMobile()) {
      this.mobileTopBarTitle = "Back";
    }
    this.selectedThread = threadListItem;
  };

  /**
   * After a search item is selected, we first search to see if it maps to an
   * existing thread. If it does, we select that thread. Otherwise, we create a
   * new thread manually client side and select it. The newly created thread is
   * a transient object that will not be persisted to the server until the user
   * sends a message. NOTE: this only works for DM chats. Group chats are more
   * complicated and require a different UI flow to create them.
   */
  onSearchItemSelected = async (item: ProfileEntryResponse) => {
    const existingThread = this.threadPreviewList.find((thread) => {
      return (
        thread.ChatType === ChatType.DM &&
        (thread.SenderInfo.OwnerPublicKeyBase58Check === item.PublicKeyBase58Check ||
          thread.RecipientInfo.OwnerPublicKeyBase58Check === item.PublicKeyBase58Check)
      );
    });

    if (existingThread) {
      this.selectThread(existingThread);
      return;
    }

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
        RecipientPublicKeyBase58Check: item.PublicKeyBase58Check,
      });

      this.publicKeyToProfileMap[item.PublicKeyBase58Check] = item;

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

  constructor(public globalVars: GlobalVarsService, private modalService: BsModalService) {}

  ngOnInit() {
    if (this.globalVars.loggedInUser) {
      this.updateThreadList();
    }
  }

  private updateThreadList() {
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
        this.accessGroupsOwned = groups.AccessGroupsOwned ?? [];
        this.accessGroups = [...(groups.AccessGroupsMember ?? []), ...(groups.AccessGroupsOwned ?? [])];
        return Promise.all(
          threads.MessageThreads.map((message) => identity.decryptMessage(message, this.accessGroups))
        ).then((decryptedMessages) => {
          if (this.isDestroyed) return;
          const groupsOwnedWithMessages = decryptedMessages.filter(
            (message) => message.ChatType === ChatType.GROUPCHAT
          );
          // We want to show groups that have no messages but are owned by the user,
          // so we add dummy messages to each of these groups.
          const identityState = identity.snapshot();
          const TimestampNanos = Date.now() * 1e6;
          const groupsOwnedWithoutMessages: DecryptedMessageEntryResponse[] = this.accessGroupsOwned
            .filter(
              (group) =>
                group.AccessGroupOwnerPublicKeyBase58Check === this.globalVars.loggedInUser.PublicKeyBase58Check &&
                group.AccessGroupKeyName !== "default-key" &&
                group.AccessGroupKeyName !== "" &&
                !groupsOwnedWithMessages.find(
                  (g) => g.RecipientInfo.AccessGroupPublicKeyBase58Check === group.AccessGroupPublicKeyBase58Check
                )
            )
            .map((group) => ({
              ChatType: ChatType.GROUPCHAT,
              SenderInfo: {
                OwnerPublicKeyBase58Check: this.globalVars.loggedInUser.PublicKeyBase58Check,
                AccessGroupKeyName: "default-key",
                AccessGroupPublicKeyBase58Check:
                  identityState.currentUser?.primaryDerivedKey.messagingPublicKeyBase58Check,
              },
              RecipientInfo: {
                OwnerPublicKeyBase58Check: group.AccessGroupOwnerPublicKeyBase58Check,
                AccessGroupKeyName: group.AccessGroupKeyName,
                AccessGroupPublicKeyBase58Check: group.AccessGroupPublicKeyBase58Check,
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
            }));

          this.threadPreviewList = [...decryptedMessages, ...groupsOwnedWithoutMessages];
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

  ngOnDestroy() {
    this.isDestroyed = true;
  }

  openCreateAccessGroupModal() {
    this.modalService.show(CreateAccessGroupComponent, {
      class: "modal-dialog-centered modal-lg",
      initialState: {
        afterAccessGroupCreated: (mockMessage: DecryptedMessageEntryResponse) => {
          this.threadPreviewList.unshift(mockMessage);
          this.selectThread(mockMessage);
        },
      },
    });
  }
}
