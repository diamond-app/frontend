import { Component, Input } from "@angular/core";
import {
  addAccessGroupMembers,
  createAccessGroup,
  encrypt,
  getBulkAccessGroups,
  identity,
  ProfileEntryResponse,
} from "deso-protocol";
import { BsModalRef } from "ngx-bootstrap/modal";
import { GlobalVarsService } from "../../global-vars.service";

@Component({
  selector: "create-access-group",
  templateUrl: "./create-access-group.component.html",
})
export class CreateAccessGroupComponent {
  @Input() afterAccessGroupCreated: () => void;

  groupMembers: ProfileEntryResponse[] = [];
  groupName = "";
  isCreatingGroup = false;

  onSearchItemSelected = async (item: ProfileEntryResponse) => {
    // First make sure this member has set up their default messaging access group.
    // If not, we cannot add them to a new access group.
    const { PairsNotFound } = await getBulkAccessGroups({
      GroupOwnerAndGroupKeyNamePairs: [
        {
          GroupOwnerPublicKeyBase58Check: item.PublicKeyBase58Check,
          GroupKeyName: "default-key",
        },
      ],
    });

    if (PairsNotFound?.length) {
      this.globalVars._alertError(
        "This user hasn't registered a messaging key on chain yet. You can send them a direct message, but you can't add them to a group chat yet."
      );
    } else {
      this.groupMembers.push(item);
    }
  };

  removeGroupMember(publicKey: string) {
    this.groupMembers = this.groupMembers.filter((item) => item.PublicKeyBase58Check !== publicKey);
  }

  createGroupChat = async (event: Event) => {
    event.preventDefault();
    const groupName = this.groupName.trim();

    if (!this.globalVars.loggedInUser) {
      this.globalVars._alertError("You must be logged in to create an access group.");
      return;
    }

    if (!groupName) {
      this.globalVars._alertError("Please enter a group name.");
      return;
    }

    if (this.groupMembers.length === 0) {
      this.globalVars._alertError("Please add at least one member.");
      return;
    }

    this.isCreatingGroup = true;
    try {
      const loggedInUserPublicKey = this.globalVars.loggedInUser.PublicKeyBase58Check;
      const accessGroupKeyPair = await identity.accessGroupStandardDerivation(groupName);

      await createAccessGroup({
        AccessGroupKeyName: groupName,
        AccessGroupOwnerPublicKeyBase58Check: loggedInUserPublicKey,
        AccessGroupPublicKeyBase58Check: accessGroupKeyPair.AccessGroupPublicKeyBase58Check,
      });

      const groupMemberKeys = [loggedInUserPublicKey].concat(
        this.groupMembers.map((item) => item.PublicKeyBase58Check)
      );
      const { AccessGroupEntries, PairsNotFound } = await getBulkAccessGroups({
        GroupOwnerAndGroupKeyNamePairs: groupMemberKeys.map((key) => ({
          GroupOwnerPublicKeyBase58Check: key,
          GroupKeyName: "default-key",
        })),
      });

      if (PairsNotFound?.length) {
        // NOTE: this should never happen since we also check this when group
        // members are individually added, but we check it again here just in
        // case.
        this.globalVars._alertError("Could not find access group for one or more members.");
        return;
      }

      const groupMemberList = await Promise.all(
        AccessGroupEntries.map(async (accessGroupEntry) => {
          return {
            AccessGroupMemberPublicKeyBase58Check: accessGroupEntry.AccessGroupOwnerPublicKeyBase58Check,
            AccessGroupMemberKeyName: accessGroupEntry.AccessGroupKeyName,
            EncryptedKey: await encrypt(
              accessGroupEntry.AccessGroupPublicKeyBase58Check,
              accessGroupKeyPair.AccessGroupPrivateKeyHex
            ),
          };
        })
      );

      await addAccessGroupMembers({
        AccessGroupOwnerPublicKeyBase58Check: loggedInUserPublicKey,
        AccessGroupKeyName: groupName,
        AccessGroupMemberList: groupMemberList,
        MinFeeRateNanosPerKB: 1000,
      });

      this.afterAccessGroupCreated?.();
      this.bsModalRef.hide();
    } catch (e) {
      this.globalVars._alertError(e?.error?.error ?? e?.message);
      return;
    }

    this.isCreatingGroup = false;
  };
  constructor(public globalVars: GlobalVarsService, public bsModalRef: BsModalRef) {}
}
