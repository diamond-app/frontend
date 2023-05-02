import { Component, Input, OnInit } from "@angular/core";
import { BsModalRef } from "ngx-bootstrap/modal";
import { ApiInternalService, DraftBlogPostResponse } from "../../api-internal.service";
import { GlobalVarsService } from "../../global-vars.service";
import { orderBy } from "lodash";
import { finalize } from "rxjs/operators";

export interface DraftBlogPostParsed extends DraftBlogPostResponse {
  formattedDate: string;
}

@Component({
  selector: "manage-drafts-modal",
  templateUrl: "./manage-drafts-modal.component.html",
  styleUrls: ["./manage-drafts-modal.component.scss"],
})
export class ManageDraftsModalComponent implements OnInit {
  @Input() onViewDraft: (draft: DraftBlogPostResponse) => void;
  @Input() formatDate: (date: string) => string;
  @Input() activeDraftId: string;

  unsavedDrafts: Array<DraftBlogPostParsed> = [];
  userDrafts: Array<DraftBlogPostParsed> = [];
  loading: boolean = false;

  constructor(
    public bsModalRef: BsModalRef,
    private apiInternal: ApiInternalService,
    public globalVars: GlobalVarsService
  ) {}

  ngOnInit() {
    this.loading = true;

    this.apiInternal
      .getSavedDraftBlogPosts(this.globalVars.loggedInUser?.PublicKeyBase58Check)
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe((res) => {
        const allDrafts = orderBy(res, ["IsDefault", "LastUpdatedAt"], ["desc", "desc"]).map((e) => ({
          ...e,
          formattedDate: this.formatDate(e.LastUpdatedAt),
        }));

        if (allDrafts.length > 0) {
          const [defaultDraft, ...userDrafts] = allDrafts;

          this.unsavedDrafts = [defaultDraft];
          this.userDrafts = userDrafts;
        }
      });
  }

  deleteDraft(draftId: string) {
    this.apiInternal.deleteDraftBlogPost(draftId, this.globalVars.loggedInUser.PublicKeyBase58Check).subscribe((e) => {
      const draftIndex = this.userDrafts.findIndex((e) => e.Id !== draftId);
      this.userDrafts.splice(draftIndex, 1);
    });
  }

  viewDraft(draft: DraftBlogPostParsed) {
    this.onViewDraft(draft);
    this.bsModalRef.hide();
  }
}
