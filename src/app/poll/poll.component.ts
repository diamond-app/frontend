import { ChangeDetectorRef, Component, Input, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import {
  AssociationType,
  BackendApiService,
  PostAssociation,
  PostAssociationCountsResponse,
} from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";
import { finalize } from "rxjs/operators";
import { BsModalService } from "ngx-bootstrap/modal";
import { PollModalComponent } from "./poll-modal/poll-modal.component";
import { forkJoin } from "rxjs";

@Component({
  selector: "poll",
  templateUrl: "./poll.component.html",
  styleUrls: ["./poll.component.scss"],
})
export class PollComponent implements OnInit {
  @Input() post: any;

  loading = false;
  pollOptions: Array<string> = [];
  pollCounts: PostAssociationCountsResponse = { Counts: {}, Total: 0 };
  myVotes: Array<PostAssociation> = [];
  processedVote: string = "";

  constructor(
    private backendApi: BackendApiService,
    public globalVars: GlobalVarsService,
    private ref: ChangeDetectorRef,
    private router: Router,
    private modalService: BsModalService
  ) {}

  ngOnInit(): void {
    this.fetchData();
  }

  private fetchData() {
    this.pollOptions = JSON.parse(this.post.PostExtraData.PollOptions);

    this.loading = true;
    this.myVotes = [];

    forkJoin([
      this.backendApi.GetPostAssociations(
        this.globalVars.localNode,
        this.post.PostHashHex,
        AssociationType.pollResponse,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        this.pollOptions
      ),
      this.backendApi.GetPostAssociationsCounts(
        this.globalVars.localNode,
        this.post,
        AssociationType.pollResponse,
        this.pollOptions,
        true
      ),
    ])
      .pipe(
        finalize(() => {
          this.loading = false;
          this.ref.detectChanges();
        })
      )
      .subscribe(([{ Associations }, counts]) => {
        this.myVotes = Associations;
        this.pollCounts = counts;
      });
  }

  vote(value: string, e: Event) {
    e.stopPropagation();

    this.processedVote = value;
    this.ref.detectChanges();

    this.backendApi
      .CreatePostAssociation(
        this.globalVars.localNode,
        this.globalVars.loggedInUser?.PublicKeyBase58Check,
        this.post.PostHashHex,
        AssociationType.pollResponse,
        value
      )
      .pipe(
        finalize(() => {
          this.processedVote = "";
          this.ref.detectChanges();
        })
      )
      .subscribe((e) => {
        this.fetchData();
      });
  }

  openPollDetails(event) {
    event.stopPropagation();
    this.openInteractionPage(event, this.globalVars.RouteNames.POLL, PollModalComponent);
  }

  private openInteractionPage(event, pageName: string, component): void {
    event.stopPropagation();
    if (this.globalVars.isMobile()) {
      this.router.navigate(["/" + this.globalVars.RouteNames.POSTS, this.post.PostHashHex, pageName], {
        queryParamsHandling: "merge",
      });
    } else {
      this.modalService.show(component, {
        class: "modal-dialog-centered",
        initialState: { postHashHex: this.post.PostHashHex },
      });
    }
  }
}
