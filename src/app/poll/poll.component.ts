import { ChangeDetectorRef, Component, Input, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AssociationType, BackendApiService, PostAssociation, User } from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";
import { finalize, map, mergeMap, tap } from "rxjs/operators";
import { BsModalService } from "ngx-bootstrap/modal";
import { PollModalComponent } from "./poll-modal/poll-modal.component";
import { forkJoin } from "rxjs";
import { groupBy, keyBy, mapValues, sum, uniq } from "lodash";
import { PollWeightType } from "../feed/feed-create-post/feed-create-post.component";
import { environment } from "../../environments/environment";

interface PollVoteWeights {
  Weights: { [option: string]: number };
  Total: number;
}

@Component({
  selector: "poll",
  templateUrl: "./poll.component.html",
  styleUrls: ["./poll.component.scss"],
})
export class PollComponent implements OnInit {
  @Input() post: any;

  environment = environment;
  loading = false;
  pollOptions: Array<string> = [];
  pollVoteWeights: PollVoteWeights = { Weights: {}, Total: 0 };
  pollWeightTokenProfile: User | null = null;
  myVotes: Array<PostAssociation> = [];
  processedVote: string = "";
  isUserHoldingPollToken: boolean = false;

  readonly POLL_WEIGHT_TYPE = PollWeightType;

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
      this.fetchPollCounts(),
    ])
      .pipe(
        finalize(() => {
          this.loading = false;
          this.ref.detectChanges();
        })
      )
      .subscribe(([{ Associations }, weights]) => {
        this.myVotes = Associations;
        this.pollVoteWeights = weights;
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

  private fetchPollCounts() {
    const pollType = this.post.PostExtraData.PollWeightType;

    if (pollType === PollWeightType.desoBalance) {
      return this.backendApi
        .GetAllPostAssociations(
          this.globalVars.localNode,
          this.post.PostHashHex,
          AssociationType.pollResponse,
          undefined,
          this.pollOptions
        )
        .pipe(
          mergeMap((associations) => {
            const uniqUserKeys = uniq(associations.map((e) => e.TransactorPublicKeyBase58Check));

            return this.backendApi.GetUsersStateless(this.globalVars.localNode, uniqUserKeys).pipe(
              map((res) => {
                const userBalanceByKey = res.UserList.reduce(
                  (acc, curr) => ({ ...acc, [curr.PublicKeyBase58Check]: curr.BalanceNanos }),
                  {}
                );

                const totalBalance = sum(Object.values(userBalanceByKey));
                const associationsGroupedByValue = groupBy(associations, "AssociationValue");

                return {
                  Weights: {
                    ...this.pollOptions.reduce((acc, curr) => ({ ...acc, [curr]: 0 }), {}),
                    ...mapValues(associationsGroupedByValue, (v) => {
                      const totalBalanceNanosForPollOption = sum(
                        v.map((association) => userBalanceByKey[association.TransactorPublicKeyBase58Check])
                      );
                      return totalBalanceNanosForPollOption / totalBalance;
                    }),
                  },
                  Total: associations.length,
                };
              })
            );
          })
        );
    } else if (pollType === PollWeightType.desoTokenBalance) {
      const tokenKey = this.post.PostExtraData.PollWeightTokenPublicKey;

      return forkJoin([
        this.backendApi.GetAllPostAssociations(
          this.globalVars.localNode,
          this.post.PostHashHex,
          AssociationType.pollResponse,
          undefined,
          this.pollOptions
        ),
        this.backendApi.GetHodlersForPublicKey(this.globalVars.localNode, tokenKey, "", "", 100000, false, true, true),
        this.backendApi.GetUsersStateless(this.globalVars.localNode, [tokenKey], true),
      ]).pipe(
        tap((results) => {
          const [_, { Hodlers }, { UserList }] = results;

          this.isUserHoldingPollToken = Hodlers.some(
            (e) => e.HODLerPublicKeyBase58Check === this.globalVars.loggedInUser?.PublicKeyBase58Check
          );

          if (UserList.length > 0) {
            this.pollWeightTokenProfile = UserList[0];
          }
        }),
        map(([associations, { Hodlers }]) => {
          const hodlerBalanceByKey = mapValues(keyBy(Hodlers, "HODLerPublicKeyBase58Check"), (e) =>
            this.globalVars.hexNanosToStandardUnit(e.BalanceNanosUint256)
          );
          const votedUserKeys = associations.map((e) => e.TransactorPublicKeyBase58Check);

          const totalBalance = Object.keys(hodlerBalanceByKey).reduce((acc, curr) => {
            if (!votedUserKeys.includes(curr)) {
              return acc;
            }

            return acc + hodlerBalanceByKey[curr];
          }, 0);

          const associationsGroupedByValue = groupBy(associations, "AssociationValue");

          return {
            Weights: {
              ...this.pollOptions.reduce((acc, curr) => ({ ...acc, [curr]: 0 }), {}),
              ...mapValues(associationsGroupedByValue, (v) => {
                const totalBalanceNanosForPollOption = sum(
                  v.map((association) => hodlerBalanceByKey[association.TransactorPublicKeyBase58Check] || 0)
                );
                return totalBalanceNanosForPollOption / totalBalance;
              }),
            },
            Total: associations.length,
          };
        })
      );
    }

    return this.backendApi
      .GetPostAssociationsCounts(
        this.globalVars.localNode,
        this.post,
        AssociationType.pollResponse,
        this.pollOptions,
        true
      )
      .pipe(
        map((e) => {
          return {
            Weights: mapValues(e.Counts, (v) => {
              return (v || 0) / e.Total;
            }),
            Total: e.Total,
          };
        })
      );
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
