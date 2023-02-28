import { ChangeDetectorRef, Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  AssociationType,
  BackendApiService,
  PostAssociation,
  PostAssociationCountsResponse,
} from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";
import { finalize, map, mergeMap } from "rxjs/operators";
import { of } from "rxjs";

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
    private ref: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchData();
  }

  private fetchData() {
    this.pollOptions = JSON.parse(this.post.PostExtraData.PollOptions);

    this.loading = true;
    this.myVotes = [];

    this.backendApi
      .GetPostAssociations(
        this.globalVars.localNode,
        this.post.PostHashHex,
        AssociationType.pollResponse,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        this.pollOptions
      )
      .pipe(
        mergeMap((e) => {
          if (e.Associations.length > 0) {
            this.myVotes = e.Associations;

            return this.backendApi.GetPostAssociationsCounts(
              this.globalVars.localNode,
              this.post,
              AssociationType.pollResponse,
              this.pollOptions,
              true
            );
          } else {
            return of({ Counts: {}, Total: 0 });
          }
        }),
        finalize(() => {
          this.loading = false;
          this.ref.detectChanges();
        })
      )
      .subscribe((e) => {
        this.pollCounts = e;
        console.log(this.pollCounts, "this.pollCounts");
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
      .pipe(finalize(() => (this.processedVote = "")))
      .subscribe((e) => {
        this.fetchData();
      });
  }
}
