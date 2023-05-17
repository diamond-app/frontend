import { HttpClient } from "@angular/common/http";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import {
    AccessGroupEntryResponse,
    ChatType,
    checkPartyAccessGroups,
    DecryptedMessageEntryResponse,
    getAllAccessGroups,
    getAllMessageThreads,
    identity,
    ProfileEntryResponse,
    PublicKeyToProfileEntryResponseMap
} from "deso-protocol";
import { BsModalService } from "ngx-bootstrap/modal";
import { GlobalVarsService } from "src/app/global-vars.service";
import { CreateAccessGroupComponent } from "src/app/messages-page/create-access-group/create-access-group.component";
import { environment } from "src/environments/environment";
import { BackendApiService } from "../backend-api.service";
import { PageLayoutService } from "../../page-layout.service";

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
  hasLegacyMessages: boolean = false;

  selectThread = (threadListItem: DecryptedMessageEntryResponse) => {
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
      console.error(e);
      this.globalVars._alertError(e.toString());
    }
  };

  constructor(
    public globalVars: GlobalVarsService,
    private modalService: BsModalService,
    private route: ActivatedRoute,
    private router: Router,
    private backendApi: BackendApiService,
    private httpClient: HttpClient,
    private pageLayoutService: PageLayoutService
  ) {
    // TODO: not sure if this will work
    if (this.globalVars.loggedInUser) {
      this.pageLayoutService.updateConfig({
        hideSidebar: true,
      });
    } else {
      this.pageLayoutService.updateConfig();
    }
  }

  ngOnInit() {
    if (this.globalVars.loggedInUser) {
      this.updateThreadList().then(() => {
        this.route.queryParams.subscribe((queryParams) => {
          const firstThread = this.threadPreviewList?.[0];

          if (queryParams.username) {
            this.backendApi.GetSingleProfile("", queryParams.username).subscribe((res) => {
              const selectProfileAttempt = res.Profile ? this.onSearchItemSelected(res.Profile) : Promise.resolve();
              selectProfileAttempt.then(() => {
                this.router.navigate([], {
                  queryParams: { username: null },
                  queryParamsHandling: "merge",
                  replaceUrl: true,
                });
              });
            });
          } else {
            if (!this.globalVars.isMobile() && firstThread) {
              // Select the first thread by default if not a mobile. Maybe we should do something smarter here.
              this.selectThread(firstThread);
            }
          }
        });
      });

      // Check if the user has legacy messages. If so, show a banner explaining
      // why we no longer support them and how to access them.
      if (!window.localStorage.getItem("dismissedLegacyMessagesBanner")) {
        this.httpClient
          .post<any>(`${environment.verificationEndpointHostname}/api/v0/get-messages-stateless`, {
            PublicKeyBase58Check: this.globalVars.loggedInUser.PublicKeyBase58Check,
            FetchAfterPublicKeyBase58Check: "",
            NumToFetch: 1,
            HoldersOnly: false,
            HoldingsOnly: false,
            FollowersOnly: false,
            FollowingOnly: false,
            SortAlgorithm: "time",
            MinFeeRateNanosPerKB: this.globalVars.feeRateDeSoPerKB,
          })
          .subscribe((res) => {
            this.hasLegacyMessages = res.OrderedContactsWithMessages.length > 0;
          });
      }
    }
  }

  get chatNameFromThread() {
    if (!this.selectedThread) {
      return "";
    }

    if (this.selectedThread.ChatType === ChatType.DM) {
      // User name
      const profile = this.publicKeyToProfileMap[this.selectedThread.RecipientInfo.OwnerPublicKeyBase58Check];
      return profile.Username || this.selectedThread.RecipientInfo.OwnerPublicKeyBase58Check || "";
    }

    // Group name
    return this.selectedThread.RecipientInfo.AccessGroupKeyName;
  }

  get previewPublicKey() {
    return this.selectedThread?.SenderInfo.OwnerPublicKeyBase58Check ===
      this.globalVars.loggedInUser?.PublicKeyBase58Check
      ? this.selectedThread?.RecipientInfo.OwnerPublicKeyBase58Check
      : this.selectedThread?.SenderInfo.OwnerPublicKeyBase58Check;
  }

  private updateThreadList() {
    this.isLoadingThreadList = true;

    return Promise.all([
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
          threads.MessageThreads?.map((message) => identity.decryptMessage(message, this.accessGroups)) ?? []
        ).then((decryptedMessages) => {
          if (this.isDestroyed) return;
          const groupsOwnedWithMessages = decryptedMessages.filter(
            (message) => message.ChatType === ChatType.GROUPCHAT
          );
          // NOTE: I'm not sure the best way to deal with "orphaned" group chats
          // (group chats that never got a message sent to them). I guess we
          // want to show groups that have no messages but are owned by the
          // user, so we add empty messages to each of these groups so they at
          // least show up. This is not a great UX, but to deal with it properly
          // would take more thought and time which is unfortunately not
          // available atm.
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

          return this.threadPreviewList;
        });
      })
      .catch((e) => {
        console.error(e);
        this.globalVars._alertError(e.toString());
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

  dismissLegacyMessagesBanner() {
    this.hasLegacyMessages = false;
    window.localStorage.setItem("dismissedLegacyMessagesBanner", "true");
  }
}
