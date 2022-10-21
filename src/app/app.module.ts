import { DragDropModule } from "@angular/cdk/drag-drop";
import { ScrollingModule } from "@angular/cdk/scrolling";
import { TextFieldModule } from "@angular/cdk/text-field";
import { HttpClientModule } from "@angular/common/http";
import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatSelectModule } from "@angular/material/select";
import { MatTooltipModule } from "@angular/material/tooltip";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import player from "lottie-web";
import { AnimateOnScrollModule } from "ng2-animate-on-scroll";
import { CollapseModule } from "ngx-bootstrap/collapse";
import { BsDatepickerModule } from "ngx-bootstrap/datepicker";
import { BsDropdownModule } from "ngx-bootstrap/dropdown";
import { BsModalService } from "ngx-bootstrap/modal";
import { PopoverModule } from "ngx-bootstrap/popover";
import { RatingModule } from "ngx-bootstrap/rating";
import { TimepickerModule } from "ngx-bootstrap/timepicker";
import { LottieModule } from "ngx-lottie";
import { QuillModule } from "ngx-quill";
import { ToastrModule } from "ngx-toastr";
import { UiScrollModule } from "ngx-ui-scroll";
import { SanitizeAndAutoLinkPipe } from "../lib/pipes/sanitize-and-auto-link-pipe";
import { SanitizeEmbedPipe } from "../lib/pipes/sanitize-embed-pipe";
import { SanitizeQRCodePipe } from "../lib/pipes/sanitize-qrcode-pipe";
import { SanitizeVideoUrlPipe } from "../lib/pipes/sanitize-video-url-pipe";
import { AddUnlockableModalComponent } from "./add-unlockable-modal/add-unlockable-modal.component";
import { AdminPageComponent } from "./admin-page/admin-page.component";
import { AdminJumioComponent } from "./admin/admin-jumio/admin-jumio.component";
import { AdminTutorialComponent } from "./admin/admin-tutorial/admin-tutorial.component";
import { AdminWyreComponent } from "./admin/admin-wyre/admin-wyre.component";
import { AdminComponent } from "./admin/admin.component";
import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { AvatarDirective } from "./avatar/avatar.directive";
import { BackendApiService } from "./backend-api.service";
import { BidPlacedModalComponent } from "./bid-placed-modal/bid-placed-modal.component";
import { BlogDetailComponent } from "./blog-page/blog-detail/blog-detail.component";
import { BlogPageComponent } from "./blog-page/blog-page.component";
import { BottomBarMobileTabComponent } from "./bottom-bar-mobile/bottom-bar-mobile-tab/bottom-bar-mobile-tab.component";
import { BottomBarMobileComponent } from "./bottom-bar-mobile/bottom-bar-mobile.component";
import { BrowsePageComponent } from "./browse-page/browse-page.component";
import { BuyDeSoCompleteComponent } from "./buy-deso-page/buy-deso-complete/buy-deso-complete.component";
import { BuyDeSoEthComponent } from "./buy-deso-page/buy-deso-eth/buy-deso-eth.component";
import { BuyDeSoLoggedOutComponent } from "./buy-deso-page/buy-deso-logged-out/buy-deso-logged-out.component";
import { BuyDesoModalComponent } from "./buy-deso-page/buy-deso-modal/buy-deso-modal.component";
import { BuyDeSoPageComponent } from "./buy-deso-page/buy-deso-page.component";
import { BuyDeSoUSDComponent } from "./buy-deso-page/buy-deso-usd/buy-deso-usd.component";
import { BuyDeSoComponent } from "./buy-deso-page/buy-deso/buy-deso.component";
import { ChangeAccountSelectorComponent } from "./change-account-selector/change-account-selector.component";
import { CloseNftAuctionModalComponent } from "./close-nft-auction-modal/close-nft-auction-modal.component";
import { CommentModalComponent } from "./comment-modal/comment-modal.component";
import { CountdownTimerComponent } from "./countdown-timer/countdown-timer.component";
import { CreateLongPostPageComponent } from "./create-long-post-page/create-long-post-page.component";
import { CreateLongPostComponent } from "./create-long-post-page/create-long-post/create-long-post.component";
import { CreateNftAuctionModalComponent } from "./create-nft-auction-modal/create-nft-auction-modal.component";
import { CreatePostFormComponent } from "./create-post-page/create-post-form/create-post-form.component";
import { CreatePostPageComponent } from "./create-post-page/create-post-page.component";
import { CreatorDiamondsComponent } from "./creator-profile-page/creator-diamonds/creator-diamonds.component";
import { CreatorProfileBlogPostsComponent } from "./creator-profile-page/creator-profile-blog-posts/creator-profile-blog-posts.component";
import { CreatorProfileDetailsComponent } from "./creator-profile-page/creator-profile-details/creator-profile-details.component";
import { CreatorProfileHodlersComponent } from "./creator-profile-page/creator-profile-hodlers/creator-profile-hodlers.component";
import { CreatorProfileNftsComponent } from "./creator-profile-page/creator-profile-nfts/creator-profile-nfts.component";
import { CreatorProfilePageComponent } from "./creator-profile-page/creator-profile-page.component";
import { CreatorProfilePostsComponent } from "./creator-profile-page/creator-profile-posts/creator-profile-posts.component";
import { CreatorProfileTopCardComponent } from "./creator-profile-page/creator-profile-top-card/creator-profile-top-card.component";
import { CreatorsLeaderboardAppPageComponent } from "./creators-leaderboard/creators-leaderboard-app-page/creators-leaderboard-app-page.component";
import { CreatorsLeaderboardModalComponent } from "./creators-leaderboard/creators-leaderboard-modal/creators-leaderboard-modal.component";
import { CreatorsLeaderboardPageComponent } from "./creators-leaderboard/creators-leaderboard-page/creators-leaderboard-page.component";
import { CreatorsLeaderboardComponent } from "./creators-leaderboard/creators-leaderboard/creators-leaderboard.component";
import { DiamondPostsPageComponent } from "./diamond-posts-page/diamond-posts-page.component";
import { DiamondPostsComponent } from "./diamond-posts-page/diamond-posts/diamond-posts.component";
import { DiamondsDetailsComponent } from "./diamonds-details/diamonds-details.component";
import { DiamondsModalComponent } from "./diamonds-details/diamonds-modal/diamonds-modal.component";
import { DiamondsPageComponent } from "./diamonds-details/diamonds-page/diamonds-page.component";
import { DirectToNativeBrowserModalComponent } from "./direct-to-native-browser/direct-to-native-browser-modal.component";
import { UploadDirective } from "./directives/upload.directive";
import { FeedCreatePostModalComponent } from "./feed/feed-create-post-modal/feed-create-post-modal.component";
import { FeedCreatePostComponent } from "./feed/feed-create-post/feed-create-post.component";
import { FeedPostDropdownComponent } from "./feed/feed-post-dropdown/feed-post-dropdown.component";
import { PostMultiplierComponent } from "./feed/feed-post-dropdown/post-multiplier/post-multiplier.component";
import { FeedPostIconRowComponent } from "./feed/feed-post-icon-row/feed-post-icon-row.component";
import { FeedPostComponent } from "./feed/feed-post/feed-post.component";
import { FeedComponent } from "./feed/feed.component";
import { FollowButtonComponent } from "./follow-button/follow-button.component";
import { FreeDesoMessageComponent } from "./free-deso-message/free-deso-message.component";
import { GetStarterDeSoPageComponent } from "./get-starter-deso-page/get-starter-deso-page.component";
import { GetStarterDeSoComponent } from "./get-starter-deso-page/get-starter-deso/get-starter-deso.component";
import { GlobalVarsService } from "./global-vars.service";
import { IconsModule } from "./icons/icons.module";
import { IdentityService } from "./identity.service";
import { JumioStatusComponent } from "./jumio-status/jumio-status.component";
import { LandingPageComponent } from "./landing-page/landing-page.component";
import { LeftBarMobileComponent } from "./left-bar-mobile/left-bar-mobile.component";
import { LeftBarButtonComponent } from "./left-bar/left-bar-button/left-bar-button.component";
import { LeftBarMoreComponent } from "./left-bar/left-bar-more/left-bar-more.component";
import { LeftBarComponent } from "./left-bar/left-bar.component";
import { LikesDetailsComponent } from "./likes-details/likes-details.component";
import { LikesModalComponent } from "./likes-details/likes-modal/likes-modal.component";
import { LikesPageComponent } from "./likes-details/likes-page/likes-page.component";
import { ManageFollowsPageComponent } from "./manage-follows-page/manage-follows-page.component";
import { ManageFollowsComponent } from "./manage-follows-page/manage-follows/manage-follows.component";
import { MessageRecipientModalComponent } from "./messages-page/message-recipient-modal/message-recipient-modal.component";
import { MessageComponent } from "./messages-page/message/message.component";
import { MessagesFilterMenuComponent } from "./messages-page/messages-inbox/messages-filter-menu/messages-filter-menu.component";
import { MessagesInboxComponent } from "./messages-page/messages-inbox/messages-inbox.component";
import { MessagesPageComponent } from "./messages-page/messages-page.component";
import { MessagesThreadViewComponent } from "./messages-page/messages-thread-view/messages-thread-view.component";
import { MessagesThreadComponent } from "./messages-page/messages-thread/messages-thread.component";
import { MintNftPageComponent } from "./mint-nft/mint-nft-page/mint-nft-page.component";
import { MintNftComponent } from "./mint-nft/mint-nft.component";
import { NetworkInfoComponent } from "./network-info/network-info.component";
import { NftBurnModalComponent } from "./nft-burn/nft-burn-modal/nft-burn-modal.component";
import { NftBurnPageComponent } from "./nft-burn/nft-burn-page/nft-burn-page.component";
import { NftBurnComponent } from "./nft-burn/nft-burn.component";
import { NftDropMgrComponent } from "./nft-drop-mgr/nft-drop-mgr.component";
import { NftModalHeaderComponent } from "./nft-modal-header/nft-modal-header.component";
import { NftPostPageComponent } from "./nft-post-page/nft-post-page.component";
import { NftPostComponent } from "./nft-post-page/nft-post/nft-post.component";
import { NftSelectSerialNumberComponent } from "./nft-select-serial-number/nft-select-serial-number.component";
import { NftShowcaseComponent } from "./nft-showcase/nft-showcase.component";
import { NftSoldModalComponent } from "./nft-sold-modal/nft-sold-modal.component";
import { NotFoundPageComponent } from "./not-found-page/not-found-page.component";
import { NotFoundComponent } from "./not-found-page/not-found/not-found.component";
import { NotificationsFilterMenuComponent } from "./notifications-page/notifications-filter-menu/notifications-filter-menu.component";
import { NotificationsListComponent } from "./notifications-page/notifications-list/notifications-list.component";
import { NotificationsPageComponent } from "./notifications-page/notifications-page.component";
import { PageComponent } from "./page/page.component";
import { PickACoinPageComponent } from "./pick-a-coin-page/pick-a-coin-page.component";
import { BuyNowConfirmationComponent } from "./place-bid/buy-now-confirmation/buy-now-confirmation.component";
import { PlaceBidModalComponent } from "./place-bid/place-bid-modal/place-bid-modal.component";
import { PlaceBidPageComponent } from "./place-bid/place-bid-page/place-bid-page.component";
import { PlaceBidComponent } from "./place-bid/place-bid.component";
import { PostThreadPageComponent } from "./post-thread-page/post-thread-page.component";
import { PostThreadComponent } from "./post-thread-page/post-thread/post-thread.component";
import { QuoteRepostsDetailsComponent } from "./quote-reposts-details/quote-reposts-details.component";
import { QuoteRepostsModalComponent } from "./quote-reposts-details/quote-reposts-modal/quote-reposts-modal.component";
import { QuoteRepostsPageComponent } from "./quote-reposts-details/quote-reposts-page/quote-reposts-page.component";
import { ReferralProgramMgrComponent } from "./referral-program-mgr/referral-program-mgr.component";
import { ReferralsComponent } from "./referrals/referrals.component";
import { RepostsDetailsComponent } from "./reposts-details/reposts-details.component";
import { RepostsModalComponent } from "./reposts-details/reposts-modal/reposts-modal.component";
import { RepostsPageComponent } from "./reposts-details/reposts-page/reposts-page.component";
import { RightBarCreatorsLeaderboardComponent } from "./right-bar-creators/right-bar-creators-leaderboard/right-bar-creators-leaderboard.component";
import { RightBarCreatorsComponent } from "./right-bar-creators/right-bar-creators.component";
import { RightBarSignupComponent } from "./right-bar-signup/right-bar-signup.component";
import { SearchBarComponent } from "./search-bar/search-bar.component";
import { SellNftPageComponent } from "./sell-nft/sell-nft-page/sell-nft-page.component";
import { SellNftComponent } from "./sell-nft/sell-nft.component";
import { SettingsPageComponent } from "./settings-page/settings-page.component";
import { SettingsComponent } from "./settings/settings.component";
import { SignUpGetStarterDeSoComponent } from "./sign-up/sign-up-get-starter-deso/sign-up-get-starter-deso.component";
import { SignUpTransferDesoComponent } from "./sign-up/sign-up-transfer-deso-module/sign-up-transfer-deso.component";
import { SignUpComponent } from "./sign-up/sign-up.component";
import { SimpleCenterLoaderComponent } from "./simple-center-loader/simple-center-loader.component";
import { SimpleProfileCardComponent } from "./simple-profile-card/simple-profile-card.component";
import { TabSelectorComponent } from "./tab-selector/tab-selector.component";
import { TermsOfServiceComponent } from "./terms-of-service/terms-of-service.component";
import { Theme } from "./theme/symbols";
// Modular Themes for DeSo by Carsen Klock @carsenk
import { ThemeModule } from "./theme/theme.module";
import { TopBarMobileHamburgerMenuComponent } from "./top-bar-mobile/top-bar-mobile-hamburger-menu/top-bar-mobile-hamburger-menu.component";
import { TopBarMobileHeaderComponent } from "./top-bar-mobile/top-bar-mobile-header/top-bar-mobile-header.component";
import { TopBarMobileLogInOrSignUpComponent } from "./top-bar-mobile/top-bar-mobile-log-in-or-sign-up/top-bar-mobile-log-in-or-sign-up.component";
import { TopBarMobileNavigationControlComponent } from "./top-bar-mobile/top-bar-mobile-navigation-control/top-bar-mobile-navigation-control.component";
import { TosPageComponent } from "./tos-page/tos-page.component";
import { TradeCreatorCompleteComponent } from "./trade-creator-page/trade-creator-complete/trade-creator-complete.component";
import { TradeCreatorFormComponent } from "./trade-creator-page/trade-creator-form/trade-creator-form.component";
import { TradeCreatorLoggedOutComponent } from "./trade-creator-page/trade-creator-logged-out/trade-creator-logged-out.component";
import { TradeCreatorModalComponent } from "./trade-creator-page/trade-creator-modal/trade-creator-modal.component";
import { TradeCreatorPageComponent } from "./trade-creator-page/trade-creator-page.component";
import { TradeCreatorPreviewComponent } from "./trade-creator-page/trade-creator-preview/trade-creator-preview.component";
import { TradeCreatorTableComponent } from "./trade-creator-page/trade-creator-table/trade-creator-table.component";
import { TradeCreatorComponent } from "./trade-creator-page/trade-creator/trade-creator.component";
import { TransferDeSoPageComponent } from "./transfer-deso-page/transfer-deso-page.component";
import { TransferDesoModalComponent } from "./transfer-deso/transfer-deso-modal/transfer-deso-modal.component";
import { TransferDeSoComponent } from "./transfer-deso/transfer-deso.component";
import { TransferNftAcceptModalComponent } from "./transfer-nft-accept/transfer-nft-accept-modal/transfer-nft-accept-modal.component";
import { TransferNftAcceptPageComponent } from "./transfer-nft-accept/transfer-nft-accept-page/transfer-nft-accept-page.component";
import { TransferNftAcceptComponent } from "./transfer-nft-accept/transfer-nft-accept.component";
import { TransferNftModalComponent } from "./transfer-nft/transfer-nft-modal/transfer-nft-modal.component";
import { TransferNftPageComponent } from "./transfer-nft/transfer-nft-page/transfer-nft-page.component";
import { TransferNftComponent } from "./transfer-nft/transfer-nft.component";
import { TranslocoRootModule } from "./transloco-root.module";
import { TrendsPageComponent } from "./trends-page/trends-page.component";
import { TrendsComponent } from "./trends-page/trends/trends.component";
import { BuyCreatorCoinsConfirmTutorialComponent } from "./tutorial/buy-creator-coins-tutorial-page/buy-creator-coins-confirm-tutorial/buy-creator-coins-confirm-tutorial.component";
import { BuyCreatorCoinsTutorialPageComponent } from "./tutorial/buy-creator-coins-tutorial-page/buy-creator-coins-tutorial-page.component";
import { BuyCreatorCoinsTutorialComponent } from "./tutorial/buy-creator-coins-tutorial-page/buy-creator-coins-tutorial/buy-creator-coins-tutorial.component";
import { BuyDesoTutorialPageComponent } from "./tutorial/buy-deso-tutorial-page/buy-deso-tutorial-page.component";
import { BuyDesoTutorialComponent } from "./tutorial/buy-deso-tutorial-page/buy-deso-tutorial/buy-deso-tutorial.component";
import { CreatePostTutorialPageComponent } from "./tutorial/create-post-tutorial-page/create-post-tutorial-page.component";
import { CreateProfileTutorialPageComponent } from "./tutorial/create-profile-tutorial-page/create-profile-tutorial-page.component";
import { DiamondTutorialPageComponent } from "./tutorial/diamond-tutorial-page/diamond-tutorial-page.component";
import { DiamondTutorialComponent } from "./tutorial/diamond-tutorial-page/diamond-tutorial/diamond-tutorial.component";
import { SellCreatorCoinsTutorialComponent } from "./tutorial/sell-creator-coins-tutorial-page/sell-creator-coins-tutorial/sell-creator-coins-tutorial.component";
import { WalletTutorialPageComponent } from "./tutorial/wallet-tutorial-page/wallet-tutorial-page.component";
import { UpdateProfileGetStarterDeSoComponent } from "./update-profile-page/update-profile-get-starter-deso/update-profile-get-starter-deso.component";
import { UpdateProfileModalComponent } from "./update-profile-page/update-profile-modal/update-profile-modal.component";
import { UpdateProfilePageComponent } from "./update-profile-page/update-profile-page.component";
import { UpdateProfileComponent } from "./update-profile-page/update-profile/update-profile.component";
import { VerifyEmailComponent } from "./verify-email/verify-email.component";
import { WalletActionsDropdownComponent } from "./wallet/wallet-actions-dropdown/wallet-actions-dropdown.component";
import { WalletPageComponent } from "./wallet/wallet-page/wallet-page.component";
import { WalletWidgetComponent } from "./wallet/wallet-widget/wallet-widget.component";
import { WalletComponent } from "./wallet/wallet.component";
import { PostInteractionDetailsComponent } from './post-interaction-details/post-interaction-details.component';
import { BuyDeSoMegaSwapComponent } from "./buy-deso-page/buy-deso-megaswap/buy-deso-megaswap.component";

const lightTheme: Theme = { key: "light", name: "Light Theme" };
const darkTheme: Theme = { key: "dark", name: "Dark Theme" };
const icydarkTheme: Theme = { key: "icydark", name: "Icy Dark Theme" };

export function playerFactory() {
  return player;
}

@NgModule({
  declarations: [
    AppComponent,
    UploadDirective,
    TermsOfServiceComponent,
    ManageFollowsComponent,
    ManageFollowsPageComponent,
    FollowButtonComponent,
    NotFoundPageComponent,
    BrowsePageComponent,
    FeedComponent,
    LeftBarComponent,
    LeftBarMoreComponent,
    RightBarCreatorsComponent,
    FeedCreatePostComponent,
    FeedPostComponent,
    FeedPostDropdownComponent,
    FeedPostIconRowComponent,
    CreatorsLeaderboardPageComponent,
    CreatorsLeaderboardComponent,
    CreatorsLeaderboardModalComponent,
    CreatorsLeaderboardAppPageComponent,
    BuyDeSoPageComponent,
    BuyDesoModalComponent,
    BuyDeSoMegaSwapComponent,
    DirectToNativeBrowserModalComponent,
    WalletComponent,
    WalletWidgetComponent,
    MessagesPageComponent,
    SettingsPageComponent,
    CreatorProfilePageComponent,
    CreatorProfileDetailsComponent,
    CreatorProfileHodlersComponent,
    CreatorProfilePostsComponent,
    TabSelectorComponent,
    CreatorProfileTopCardComponent,
    LeftBarButtonComponent,
    TradeCreatorPageComponent,
    TradeCreatorComponent,
    TradeCreatorModalComponent,
    BuyDeSoComponent,
    BuyDeSoUSDComponent,
    TradeCreatorFormComponent,
    TradeCreatorPreviewComponent,
    TradeCreatorCompleteComponent,
    UpdateProfilePageComponent,
    UpdateProfileModalComponent,
    NotificationsPageComponent,
    NotificationsFilterMenuComponent,
    SearchBarComponent,
    SimpleCenterLoaderComponent,
    ChangeAccountSelectorComponent,
    RightBarSignupComponent,
    TradeCreatorTableComponent,
    PostThreadPageComponent,
    PostThreadComponent,
    UpdateProfileComponent,
    RightBarCreatorsLeaderboardComponent,
    BottomBarMobileComponent,
    LeftBarMobileComponent,
    TransferDeSoPageComponent,
    TransferDeSoComponent,
    TransferDesoModalComponent,
    BuyDeSoLoggedOutComponent,
    BuyDeSoCompleteComponent,
    MessagesInboxComponent,
    MessagesThreadComponent,
    MessageComponent,
    MessagesThreadViewComponent,
    MessageRecipientModalComponent,
    FeedCreatePostModalComponent,
    TopBarMobileNavigationControlComponent,
    TopBarMobileHeaderComponent,
    BottomBarMobileTabComponent,
    NotFoundComponent,
    CreatePostPageComponent,
    CreatePostFormComponent,
    TopBarMobileLogInOrSignUpComponent,
    TopBarMobileHamburgerMenuComponent,
    TradeCreatorLoggedOutComponent,
    TosPageComponent,
    AdminPageComponent,
    AdminComponent,
    AdminWyreComponent,
    NetworkInfoComponent,
    SanitizeAndAutoLinkPipe,
    SanitizeEmbedPipe,
    SettingsComponent,
    NotificationsListComponent,
    PageComponent,
    LandingPageComponent,
    SignUpComponent,
    SignUpTransferDesoComponent,
    SignUpGetStarterDeSoComponent,
    UpdateProfileGetStarterDeSoComponent,
    GetStarterDeSoPageComponent,
    GetStarterDeSoComponent,
    CommentModalComponent,
    WalletActionsDropdownComponent,
    PickACoinPageComponent,
    CreatorDiamondsComponent,
    DiamondsDetailsComponent,
    DiamondsPageComponent,
    DiamondsModalComponent,
    RepostsDetailsComponent,
    RepostsPageComponent,
    RepostsModalComponent,
    QuoteRepostsDetailsComponent,
    QuoteRepostsModalComponent,
    QuoteRepostsPageComponent,
    LikesDetailsComponent,
    LikesPageComponent,
    LikesModalComponent,
    SimpleProfileCardComponent,
    MessagesFilterMenuComponent,
    DiamondPostsPageComponent,
    DiamondPostsComponent,
    CountdownTimerComponent,
    AvatarDirective,
    TrendsPageComponent,
    TrendsComponent,
    SanitizeQRCodePipe,
    MintNftComponent,
    NftSelectSerialNumberComponent,
    TransferNftAcceptComponent,
    TransferNftAcceptModalComponent,
    TransferNftAcceptPageComponent,
    NftBurnPageComponent,
    NftBurnComponent,
    NftBurnModalComponent,
    MintNftPageComponent,
    CreateNftAuctionModalComponent,
    BidPlacedModalComponent,
    PlaceBidComponent,
    PlaceBidModalComponent,
    PlaceBidPageComponent,
    BuyNowConfirmationComponent,
    NftSoldModalComponent,
    NftModalHeaderComponent,
    CloseNftAuctionModalComponent,
    SellNftComponent,
    SellNftPageComponent,
    AddUnlockableModalComponent,
    NftPostPageComponent,
    NftPostComponent,
    NftDropMgrComponent,
    CreatorProfileNftsComponent,
    NftShowcaseComponent,
    VerifyEmailComponent,
    AdminJumioComponent,
    JumioStatusComponent,
    ReferralProgramMgrComponent,
    ReferralsComponent,
    AdminTutorialComponent,
    CreateProfileTutorialPageComponent,
    BuyCreatorCoinsTutorialComponent,
    BuyCreatorCoinsConfirmTutorialComponent,
    BuyCreatorCoinsTutorialPageComponent,
    BuyDesoTutorialPageComponent,
    BuyDesoTutorialComponent,
    WalletPageComponent,
    WalletTutorialPageComponent,
    SellCreatorCoinsTutorialComponent,
    DiamondTutorialPageComponent,
    DiamondTutorialComponent,
    CreatePostTutorialPageComponent,
    BuyDeSoEthComponent,
    SanitizeVideoUrlPipe,
    PostMultiplierComponent,
    TransferNftModalComponent,
    TransferNftPageComponent,
    TransferNftComponent,
    FreeDesoMessageComponent,
    CreateLongPostComponent,
    CreateLongPostPageComponent,
    BlogPageComponent,
    BlogDetailComponent,
    CreatorProfileBlogPostsComponent,
    PostInteractionDetailsComponent,
  ],
  imports: [
    BrowserModule,
    DragDropModule,
    AppRoutingModule,
    FormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressBarModule,
    HttpClientModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatTooltipModule,
    TextFieldModule,
    UiScrollModule,
    AnimateOnScrollModule.forRoot(),
    ToastrModule.forRoot(),
    BsDropdownModule.forRoot(),
    PopoverModule.forRoot(),
    RatingModule.forRoot(),
    BsDatepickerModule.forRoot(),
    TimepickerModule.forRoot(),
    CollapseModule.forRoot(),
    QuillModule.forRoot({
      format: "text",
    }),
    ThemeModule.forRoot({
      themes: [lightTheme, darkTheme, icydarkTheme],
      active:
        localStorage.getItem("theme") ||
        (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"),
    }),
    IconsModule,
    LottieModule,
    LottieModule.forRoot({ player: playerFactory }),
    ScrollingModule,
    TranslocoRootModule,
  ],
  providers: [BackendApiService, GlobalVarsService, BsModalService, IdentityService],
  bootstrap: [AppComponent],
})
export class AppModule {}
