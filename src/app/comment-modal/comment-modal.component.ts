import { AfterViewInit, Component, Input } from "@angular/core";
import { BsModalRef } from "ngx-bootstrap/modal";
import { SwalHelper } from "../../lib/helpers/swal-helper";
import { GlobalVarsService } from "../global-vars.service";

@Component({
  selector: "comment-modal",
  templateUrl: "./comment-modal.component.html",
  styleUrls: ["./comment-modal.component.scss"],
})
export class CommentModalComponent implements AfterViewInit {
  @Input() parentPost;
  @Input() afterCommentCreatedCallback: any = null;
  @Input() isQuote = false;

  warnBeforeClose: boolean = false;
  constructor(public bsModalRef: BsModalRef, private globalVars: GlobalVarsService) {}

  ngAfterViewInit() {
    setTimeout(() => {
      const searchElement = document.querySelector("comment-modal .feed-create-comment__textarea");
      // @ts-ignore
      searchElement.focus();
    }, 0);
  }

  postUpdated(postNotEmpty: boolean) {
    console.log(postNotEmpty);
    this.warnBeforeClose = postNotEmpty;
  }

  closeModal() {
    if (this.warnBeforeClose) {
      SwalHelper.fire({
        target: this.globalVars.getTargetComponentSelector(),
        title: `Discard Changes?`,
        html: `Are you sure you want to discard changes to your post and exit?`,
        showCancelButton: true,
        showConfirmButton: true,
        focusConfirm: true,
        customClass: {
          confirmButton: "btn btn-light",
          cancelButton: "btn btn-light no",
        },
        confirmButtonText: "Yes",
        cancelButtonText: "No",
        reverseButtons: true,
      }).then((res: any) => {
        if (res.isConfirmed) {
          this.bsModalRef.hide();
        }
      });
    } else {
      this.bsModalRef.hide();
    }
  }
}
