import { Component, EventEmitter, Input, Output } from "@angular/core";
import { DraftBlogPostParsed } from "../manage-drafts-modal/manage-drafts-modal.component";
import { GlobalVarsService } from "../../app/global-vars.service";

@Component({
  selector: "drafts-table",
  templateUrl: "./drafts-table.component.html",
  styleUrls: ["./drafts-table.component.scss"],
})
export class DraftsTableComponent {
  @Input() draftsList: Array<DraftBlogPostParsed> = [];
  @Input() title: string = "";
  @Input() activeDraftId: string = "";

  @Output() viewDraft = new EventEmitter();
  @Output() deleteDraft = new EventEmitter();

  readonly MISSING_TITLE_DRAFT_NAME: string = "Untitled";

  constructor(public globalVars: GlobalVarsService) {}
}
