// @ts-strict
import { Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from "@angular/core";
import {
  AccessGroupEntryResponse,
  ChatType,
  checkPartyAccessGroups,
  CheckPartyAccessGroupsResponse,
  DecryptedMessageEntryResponse,
  getPaginatedDMThread,
  getPaginatedGroupChatThread,
  identity,
  PublicKeyToProfileEntryResponseMap,
  sendMessage,
} from "deso-protocol";
import { GlobalVarsService } from "src/app/global-vars.service";
import debounce from "lodash/debounce";

const THREAD_PAGE_SIZE = 10;
const SCROLL_DEBOUNCE_MS = 150;
const SCROLL_BUFFER_PX = 40;

@Component({
  selector: "message-thread",
  templateUrl: "./message-thread.component.html",
  styleUrls: ["./message-thread.component.scss"],
})
export class MessageThreadComponent implements OnChanges, OnDestroy {
  /**
   * @required
   * The most recent message of a chat thread. If not provided, the thread will
   * be empty and we will be starting a new chat. NOTE: we use the ! operator
   * here because we expect this to be passed and there should be runtime errors
   * thrown if this is not provided.
   */
  @Input() threadHead!: DecryptedMessageEntryResponse;

  /**
   * @optional
   * The map of public keys to profiles for the users in the thread. Only needed if an existing threadHead is provided.
   */
  @Input() publicKeyToProfileMap: PublicKeyToProfileEntryResponseMap = {};

  /**
   * @optional
   * The access groups that the current user is either a member or owner of. We use this to decrypt group chat messages.
   */
  @Input() accessGroups: AccessGroupEntryResponse[] = [];

  @ViewChild("scrollContainer") scrollContainer?: ElementRef<HTMLDivElement>;

  messageText = "";
  isDestroyed = false;
  threadMessages: DecryptedMessageEntryResponse[] = [];
  threadPartyAccessInfo?: CheckPartyAccessGroupsResponse;
  isSendingMessage = false;
  loading = false;
  loadingMore = false;
  lastPage = false;
  debouncedOnScroll = debounce((e) => this.onScroll(e), SCROLL_DEBOUNCE_MS, {});

  #prependPreviousMessages = (olderMessages: DecryptedMessageEntryResponse[]) => {
    if (olderMessages.length < THREAD_PAGE_SIZE) {
      this.lastPage = true;
    }
    if (this.isDestroyed || !this.threadHead) return;
    this.threadMessages = [...this.threadMessages, ...olderMessages];
  };

  constructor(public globalVars: GlobalVarsService) {}

  ngOnChanges(changes: any): void {
    if (changes.threadHead && changes.threadHead !== this.threadHead) {
      this.threadMessages = [];
      this.lastPage = false;

      // If an existing thread is not provided it means we're starting a new
      // chat and we don't need to load any messages NOTE: In the case of an
      // empty DecryptedMessage and error we assume we are dealing with a newly
      // created transient thread, so there is no need to load anything.
      if (this.threadHead && !(this.threadHead.DecryptedMessage === "" && this.threadHead.error === "")) {
        this.threadMessages.push(this.threadHead);

        this.loading = true;

        Promise.all([
          checkPartyAccessGroups({
            SenderAccessGroupKeyName: this.threadHead.SenderInfo.AccessGroupKeyName,
            SenderPublicKeyBase58Check: this.threadHead.SenderInfo.OwnerPublicKeyBase58Check,
            RecipientAccessGroupKeyName: this.threadHead.RecipientInfo.AccessGroupKeyName,
            RecipientPublicKeyBase58Check: this.threadHead.RecipientInfo.OwnerPublicKeyBase58Check,
          }),
          this.loadMessages(),
        ])
          .then(([threadPartyAccessInfo, messages]) => {
            if (this.isDestroyed) return;
            this.threadPartyAccessInfo = threadPartyAccessInfo;
            this.#prependPreviousMessages(messages);
            setTimeout(() => this.scrollToMostRecentMessage(), 0);
          })
          .catch((e) => {
            console.error(e);
            this.globalVars._alertError(e.toString());
          })
          .finally(() => {
            this.loading = false;
          });
      }
    }
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
  }

  loadMessages() {
    if (!this.threadHead) {
      throw new Error("Cannot load messages without an existing thread.");
    }

    const startTimestampNanosString =
      this.threadMessages[this.threadMessages.length - 1]?.MessageInfo?.TimestampNanosString;

    switch (this.threadHead.ChatType) {
      case ChatType.DM:
        return getPaginatedDMThread({
          UserGroupOwnerPublicKeyBase58Check: this.globalVars.loggedInUser.PublicKeyBase58Check,
          UserGroupKeyName: "default-key",
          PartyGroupKeyName: "default-key",
          PartyGroupOwnerPublicKeyBase58Check: this.threadHead.IsSender
            ? this.threadHead.RecipientInfo.OwnerPublicKeyBase58Check
            : this.threadHead.SenderInfo.OwnerPublicKeyBase58Check,
          StartTimeStampString: startTimestampNanosString,
          MaxMessagesToFetch: THREAD_PAGE_SIZE,
        })
          .then((thread) => {
            return Promise.all(thread.ThreadMessages.map((message) => identity.decryptMessage(message, [])));
          })
          .catch((e) => {
            console.error(e);
            this.globalVars._alertError(e.toString());
            return [];
          });
      case ChatType.GROUPCHAT:
        return getPaginatedGroupChatThread({
          UserPublicKeyBase58Check: this.threadHead.RecipientInfo.OwnerPublicKeyBase58Check,
          AccessGroupKeyName: this.threadHead.RecipientInfo.AccessGroupKeyName,
          StartTimeStampString: startTimestampNanosString,
          MaxMessagesToFetch: THREAD_PAGE_SIZE,
        })
          .then((thread) => {
            this.publicKeyToProfileMap = { ...this.publicKeyToProfileMap, ...thread.PublicKeyToProfileEntryResponse };
            return Promise.all(
              thread.GroupChatMessages.map((message) => identity.decryptMessage(message, this.accessGroups))
            );
          })
          .catch((e) => {
            console.error(e);
            this.globalVars._alertError(e.toString());
            return [];
          });
      default:
        throw new Error("Unknown chat type");
    }
  }

  onTextAreaKeyPress(event: KeyboardEvent) {
    // When the shift key is pressed ignore the signal.
    if (event.shiftKey) {
      return;
    }
    if (event.key === "Enter") {
      this.submitMessage();
    }
  }

  async submitMessage() {
    if (this.isSendingMessage) return;

    if (!this.threadHead) {
      this.globalVars._alertError("Cannot send a message without a selected recipient.");
      return;
    }

    const Message = this.messageText.trim();

    if (!Message) {
      this.globalVars._alertError("Please enter a message to send.");
      return;
    }

    this.isSendingMessage = true;

    // We optimistically append a manually constructed message object to the chat UI.
    // This will get overwritten when the data is reloaded from the server.
    const senderInfo = this.threadHead.IsSender ? this.threadHead.SenderInfo : this.threadHead.RecipientInfo;
    const TimestampNanos = Date.now() * 1e6;
    this.threadMessages.unshift({
      ChatType: this.threadHead.ChatType,
      SenderInfo: this.threadHead.IsSender ? this.threadHead.SenderInfo : this.threadHead.RecipientInfo,
      RecipientInfo: this.threadHead.IsSender ? this.threadHead.RecipientInfo : this.threadHead.SenderInfo,
      MessageInfo: {
        EncryptedText: "",
        TimestampNanos,
        TimestampNanosString: TimestampNanos.toString(),
        ExtraData: {},
      },
      DecryptedMessage: Message,
      IsSender: true,
      error: "",
    });

    // clear the text input and scroll to the bottom of the chat
    this.resetMessageText();

    try {
      await sendMessage({
        SenderPublicKeyBase58Check: this.globalVars.loggedInUser.PublicKeyBase58Check,
        RecipientPublicKeyBase58Check:
          this.threadHead.ChatType === ChatType.GROUPCHAT
            ? this.threadHead.RecipientInfo.OwnerPublicKeyBase58Check
            : this.threadHead.IsSender
            ? this.threadHead.RecipientInfo.OwnerPublicKeyBase58Check
            : this.threadHead.SenderInfo.OwnerPublicKeyBase58Check,
        Message,
        AccessGroup: this.threadHead.RecipientInfo.AccessGroupKeyName,
      });
    } catch (e: any) {
      console.error(e);
      this.globalVars._alertError("Problem sending message: " + e.toString());
      // If we failed, remove the manually added message from the UI.
      this.threadMessages.pop();
    }

    this.isSendingMessage = false;
  }

  onScroll($event) {
    if (this.loading || this.loadingMore || this.lastPage) {
      return;
    }

    const threadHeadMessageTimestamp = this.threadHead.MessageInfo.TimestampNanosString;

    if (
      Math.abs($event.target.scrollTop) + SCROLL_BUFFER_PX >
      this.scrollContainer.nativeElement.scrollHeight - this.scrollContainer.nativeElement.offsetHeight
    ) {
      this.loadingMore = true;

      this.loadMessages()
        .then((messages) => {
          if (this.threadHead.MessageInfo.TimestampNanosString !== threadHeadMessageTimestamp) {
            // Here we check if the last message stayed the same when the new items are loaded.
            // It allows us to catch corner cases like switching threads or sending a new message.
            // In such cases we simply ignore updating the thread
            return;
          }

          this.#prependPreviousMessages(messages);
        })
        .finally(() => {
          this.loadingMore = false;
        });
    }
  }

  private scrollToMostRecentMessage() {
    if (this.scrollContainer?.nativeElement) {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    }
  }

  private resetMessageText() {
    setTimeout(() => {
      this.messageText = "";
      this.scrollToMostRecentMessage();
    }, 0);
  }
}
