import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatSelectModule } from "@angular/material/select";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { HttpClientModule } from "@angular/common/http";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { TextFieldModule } from "@angular/cdk/text-field";
import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { BackendApiService } from "./backend-api.service";
import { DirectToNativeBrowserModalComponent } from "./direct-to-native-browser/direct-to-native-browser-modal.component";
import { GlobalVarsService } from "./global-vars.service";
import { IdentityService } from "./identity.service";
import { TermsOfServiceComponent } from "./terms-of-service/terms-of-service.component";
import { ManageFollowsComponent } from "./manage-follows-page/manage-follows/manage-follows.component";
import { ManageFollowsPageComponent } from "./manage-follows-page/manage-follows-page.component";
import { FollowButtonComponent } from "./follow-button/follow-button.component";
import { NotFoundPageComponent } from "./not-found-page/not-found-page.component";
import { BrowsePageComponent } from "./browse-page/browse-page.component";
import { FeedComponent } from "./feed/feed.component";
import { LeftBarComponent } from "./left-bar/left-bar.component";
import { RightBarCreatorsComponent } from "./right-bar-creators/right-bar-creators.component";
import { FeedCreatePostComponent } from "./feed/feed-create-post/feed-create-post.component";
import { FeedPostComponent } from "./feed/feed-post/feed-post.component";
import { FeedPostDropdownComponent } from "./feed/feed-post-dropdown/feed-post-dropdown.component";
import { FeedPostIconRowComponent } from "./feed/feed-post-icon-row/feed-post-icon-row.component";
import { CreatorsLeaderboardPageComponent } from "./creators-leaderboard/creators-leaderboard-page/creators-leaderboard-page.component";
import { CreatorsLeaderboardComponent } from "./creators-leaderboard/creators-leaderboard/creators-leaderboard.component";
import { CreatorsLeaderboardModalComponent } from "./creators-leaderboard/creators-leaderboard-modal/creators-leaderboard-modal.component";
import { CreatorsLeaderboardAppPageComponent } from "./creators-leaderboard/creators-leaderboard-app-page/creators-leaderboard-app-page.component";
import { BuyDeSoPageComponent } from "./buy-deso-page/buy-deso-page.component";
import { BuyDesoModalComponent } from "./buy-deso-page/buy-deso-modal/buy-deso-modal.component";
import { MessagesPageComponent } from "./messages-page/messages-page.component";
import { SettingsPageComponent } from "./settings-page/settings-page.component";
import { CreatorProfilePageComponent } from "./creator-profile-page/creator-profile-page.component";
import { CreatorProfileDetailsComponent } from "./creator-profile-page/creator-profile-details/creator-profile-details.component";
import { CreatorProfileHodlersComponent } from "./creator-profile-page/creator-profile-hodlers/creator-profile-hodlers.component";
import { CreatorProfilePostsComponent } from "./creator-profile-page/creator-profile-posts/creator-profile-posts.component";
import { TabSelectorComponent } from "./tab-selector/tab-selector.component";
import { CreatorProfileTopCardComponent } from "./creator-profile-page/creator-profile-top-card/creator-profile-top-card.component";
import { LeftBarButtonComponent } from "./left-bar/left-bar-button/left-bar-button.component";
import { TradeCreatorPageComponent } from "./trade-creator-page/trade-creator-page.component";
import { TradeCreatorComponent } from "./trade-creator-page/trade-creator/trade-creator.component";
import { TradeCreatorModalComponent } from "./trade-creator-page/trade-creator-modal/trade-creator-modal.component";
import { BuyDeSoComponent } from "./buy-deso-page/buy-deso/buy-deso.component";
import { BuyDeSoUSDComponent } from "./buy-deso-page/buy-deso-usd/buy-deso-usd.component";
import { TradeCreatorFormComponent } from "./trade-creator-page/trade-creator-form/trade-creator-form.component";
import { TradeCreatorPreviewComponent } from "./trade-creator-page/trade-creator-preview/trade-creator-preview.component";
import { TradeCreatorCompleteComponent } from "./trade-creator-page/trade-creator-complete/trade-creator-complete.component";
import { UpdateProfilePageComponent } from "./update-profile-page/update-profile-page.component";
import { UpdateProfileModalComponent } from "./update-profile-page/update-profile-modal/update-profile-modal.component";
import { NotificationsPageComponent } from "./notifications-page/notifications-page.component";
import { NotificationsFilterMenuComponent } from "./notifications-page/notifications-filter-menu/notifications-filter-menu.component";
import { SearchBarComponent } from "./search-bar/search-bar.component";
import { SimpleCenterLoaderComponent } from "./simple-center-loader/simple-center-loader.component";
import { ChangeAccountSelectorComponent } from "./change-account-selector/change-account-selector.component";
import { RightBarSignupComponent } from "./right-bar-signup/right-bar-signup.component";
import { TradeCreatorTableComponent } from "./trade-creator-page/trade-creator-table/trade-creator-table.component";
import { PostThreadPageComponent } from "./post-thread-page/post-thread-page.component";
import { PostThreadComponent } from "./post-thread-page/post-thread/post-thread.component";
import { UpdateProfileComponent } from "./update-profile-page/update-profile/update-profile.component";
import { RightBarCreatorsLeaderboardComponent } from "./right-bar-creators/right-bar-creators-leaderboard/right-bar-creators-leaderboard.component";
import { BottomBarMobileComponent } from "./bottom-bar-mobile/bottom-bar-mobile.component";
import { LeftBarMobileComponent } from "./left-bar-mobile/left-bar-mobile.component";
import { TransferDeSoPageComponent } from "./transfer-deso-page/transfer-deso-page.component";
import { TransferDeSoComponent } from "./transfer-deso/transfer-deso.component";
import { TransferDesoModalComponent } from "./transfer-deso/transfer-deso-modal/transfer-deso-modal.component";
import { BuyDeSoLoggedOutComponent } from "./buy-deso-page/buy-deso-logged-out/buy-deso-logged-out.component";
import { BuyDeSoCompleteComponent } from "./buy-deso-page/buy-deso-complete/buy-deso-complete.component";
import { MessagesInboxComponent } from "./messages-page/messages-inbox/messages-inbox.component";
import { MessagesThreadComponent } from "./messages-page/messages-thread/messages-thread.component";
import { MessageComponent } from "./messages-page/message/message.component";
import { MessagesThreadViewComponent } from "./messages-page/messages-thread-view/messages-thread-view.component";
import { TopBarMobileNavigationControlComponent } from "./top-bar-mobile/top-bar-mobile-navigation-control/top-bar-mobile-navigation-control.component";
import { TopBarMobileHeaderComponent } from "./top-bar-mobile/top-bar-mobile-header/top-bar-mobile-header.component";
import { BottomBarMobileTabComponent } from "./bottom-bar-mobile/bottom-bar-mobile-tab/bottom-bar-mobile-tab.component";
import { NotFoundComponent } from "./not-found-page/not-found/not-found.component";
import { CreatePostPageComponent } from "./create-post-page/create-post-page.component";
import { CreatePostFormComponent } from "./create-post-page/create-post-form/create-post-form.component";
import { TopBarMobileLogInOrSignUpComponent } from "./top-bar-mobile/top-bar-mobile-log-in-or-sign-up/top-bar-mobile-log-in-or-sign-up.component";
import { TopBarMobileHamburgerMenuComponent } from "./top-bar-mobile/top-bar-mobile-hamburger-menu/top-bar-mobile-hamburger-menu.component";
import { TradeCreatorLoggedOutComponent } from "./trade-creator-page/trade-creator-logged-out/trade-creator-logged-out.component";
import { TosPageComponent } from "./tos-page/tos-page.component";
import { MatTooltipModule } from "@angular/material/tooltip";
import { AdminPageComponent } from "./admin-page/admin-page.component";
import { AdminComponent } from "./admin/admin.component";
import { AdminWyreComponent } from "./admin/admin-wyre/admin-wyre.component";
import { NetworkInfoComponent } from "./network-info/network-info.component";
import { SanitizeAndAutoLinkPipe } from "../lib/pipes/sanitize-and-auto-link-pipe";
import { SanitizeEmbedPipe } from "../lib/pipes/sanitize-embed-pipe";
import { SettingsComponent } from "./settings/settings.component";
import { NotificationsListComponent } from "./notifications-page/notifications-list/notifications-list.component";
import { UiScrollModule } from "ngx-ui-scroll";
import { PageComponent } from "./page/page.component";
import { BsModalService } from "ngx-bootstrap/modal";
import { BsDropdownModule } from "ngx-bootstrap/dropdown";
import { PopoverModule } from "ngx-bootstrap/popover";
import { RatingModule } from "ngx-bootstrap/rating";
import { BsDatepickerModule } from "ngx-bootstrap/datepicker";
import { TimepickerModule } from "ngx-bootstrap/timepicker";
import { CollapseModule } from "ngx-bootstrap/collapse";
import { LandingPageComponent } from "./landing-page/landing-page.component";
import { AnimateOnScrollModule } from "ng2-animate-on-scroll";
import { SignUpGetStarterDeSoComponent } from "./sign-up/sign-up-get-starter-deso/sign-up-get-starter-deso.component";
import { UpdateProfileGetStarterDeSoComponent } from "./update-profile-page/update-profile-get-starter-deso/update-profile-get-starter-deso.component";
import { GetStarterDeSoPageComponent } from "./get-starter-deso-page/get-starter-deso-page.component";
import { GetStarterDeSoComponent } from "./get-starter-deso-page/get-starter-deso/get-starter-deso.component";
import { CommentModalComponent } from "./comment-modal/comment-modal.component";
import { WalletComponent } from "./wallet/wallet.component";
import { WalletWidgetComponent } from "./wallet/wallet-widget/wallet-widget.component";
import { Toast, ToastrModule } from "ngx-toastr";
import { SignUpComponent } from "./sign-up/sign-up.component";
import { WalletActionsDropdownComponent } from "./wallet/wallet-actions-dropdown/wallet-actions-dropdown.component";
import { PickACoinPageComponent } from "./pick-a-coin-page/pick-a-coin-page.component";
import { DiamondsDetailsComponent } from "./diamonds-details/diamonds-details.component";
import { DiamondsPageComponent } from "./diamonds-details/diamonds-page/diamonds-page.component";
import { RepostsDetailsComponent } from "./reposts-details/reposts-details.component";
import { RepostsPageComponent } from "./reposts-details/reposts-page/reposts-page.component";
import { RepostsModalComponent } from "./reposts-details/reposts-modal/reposts-modal.component";
import { QuoteRepostsDetailsComponent } from "./quote-reposts-details/quote-reposts-details.component";
import { QuoteRepostsModalComponent } from "./quote-reposts-details/quote-reposts-modal/quote-reposts-modal.component";
import { QuoteRepostsPageComponent } from "./quote-reposts-details/quote-reposts-page/quote-reposts-page.component";
import { LikesDetailsComponent } from "./likes-details/likes-details.component";
import { LikesPageComponent } from "./likes-details/likes-page/likes-page.component";
import { LikesModalComponent } from "./likes-details/likes-modal/likes-modal.component";
import { SimpleProfileCardComponent } from "./simple-profile-card/simple-profile-card.component";
import { CreatorDiamondsComponent } from "./creator-profile-page/creator-diamonds/creator-diamonds.component";
import { DiamondPostsPageComponent } from "./diamond-posts-page/diamond-posts-page.component";
import { DiamondPostsComponent } from "./diamond-posts-page/diamond-posts/diamond-posts.component";
import { DiamondsModalComponent } from "./diamonds-details/diamonds-modal/diamonds-modal.component";
import { MessagesFilterMenuComponent } from "./messages-page/messages-inbox/messages-filter-menu/messages-filter-menu.component";
import { CountdownTimerComponent } from "./countdown-timer/countdown-timer.component";
import { AvatarDirective } from "./avatar/avatar.directive";
import { TrendsPageComponent } from "./trends-page/trends-page.component";
import { TrendsComponent } from "./trends-page/trends/trends.component";
import { UploadDirective } from "./directives/upload.directive";
import { SanitizeQRCodePipe } from "../lib/pipes/sanitize-qrcode-pipe";
import { MintNftComponent } from "./mint-nft/mint-nft.component";
import { NftSelectSerialNumberComponent } from "./nft-select-serial-number/nft-select-serial-number.component";
import { MintNftPageComponent } from "./mint-nft/mint-nft-page/mint-nft-page.component";
import { CreateNftAuctionModalComponent } from "./create-nft-auction-modal/create-nft-auction-modal.component";
import { BidPlacedModalComponent } from "./bid-placed-modal/bid-placed-modal.component";
import { PlaceBidComponent } from "./place-bid/place-bid.component";
import { PlaceBidModalComponent } from "./place-bid/place-bid-modal/place-bid-modal.component";
import { PlaceBidPageComponent } from "./place-bid/place-bid-page/place-bid-page.component";
import { NftSoldModalComponent } from "./nft-sold-modal/nft-sold-modal.component";
import { NftModalHeaderComponent } from "./nft-modal-header/nft-modal-header.component";
import { CloseNftAuctionModalComponent } from "./close-nft-auction-modal/close-nft-auction-modal.component";
import { SellNftComponent } from "./sell-nft/sell-nft.component";
import { SellNftPageComponent } from "./sell-nft/sell-nft-page/sell-nft-page.component";
import { AddUnlockableModalComponent } from "./add-unlockable-modal/add-unlockable-modal.component";
import { NftPostPageComponent } from "./nft-post-page/nft-post-page.component";
import { NftPostComponent } from "./nft-post-page/nft-post/nft-post.component";
import { CreatorProfileNftsComponent } from "./creator-profile-page/creator-profile-nfts/creator-profile-nfts.component";
import { NftDropMgrComponent } from "./nft-drop-mgr/nft-drop-mgr.component";
import { NftShowcaseComponent } from "./nft-showcase/nft-showcase.component";
import { VerifyEmailComponent } from "./verify-email/verify-email.component";
import { AdminJumioComponent } from "./admin/admin-jumio/admin-jumio.component";
import { JumioStatusComponent } from "./jumio-status/jumio-status.component";
import { AdminTutorialComponent } from "./admin/admin-tutorial/admin-tutorial.component";
import { CreateProfileTutorialPageComponent } from "./tutorial/create-profile-tutorial-page/create-profile-tutorial-page.component";
import { BuyCreatorCoinsTutorialComponent } from "./tutorial/buy-creator-coins-tutorial-page/buy-creator-coins-tutorial/buy-creator-coins-tutorial.component";
import { BuyCreatorCoinsTutorialPageComponent } from "./tutorial/buy-creator-coins-tutorial-page/buy-creator-coins-tutorial-page.component";
import { BuyCreatorCoinsConfirmTutorialComponent } from "./tutorial/buy-creator-coins-tutorial-page/buy-creator-coins-confirm-tutorial/buy-creator-coins-confirm-tutorial.component";
import { WalletPageComponent } from "./wallet/wallet-page/wallet-page.component";
import { WalletTutorialPageComponent } from "./tutorial/wallet-tutorial-page/wallet-tutorial-page.component";
import { SellCreatorCoinsTutorialComponent } from "./tutorial/sell-creator-coins-tutorial-page/sell-creator-coins-tutorial/sell-creator-coins-tutorial.component";
import { DiamondTutorialPageComponent } from "./tutorial/diamond-tutorial-page/diamond-tutorial-page.component";
import { DiamondTutorialComponent } from "./tutorial/diamond-tutorial-page/diamond-tutorial/diamond-tutorial.component";
import { BuyDesoTutorialComponent } from "./tutorial/buy-deso-tutorial-page/buy-deso-tutorial/buy-deso-tutorial.component";
import { BuyDesoTutorialPageComponent } from "./tutorial/buy-deso-tutorial-page/buy-deso-tutorial-page.component";
import { CreatePostTutorialPageComponent } from "./tutorial/create-post-tutorial-page/create-post-tutorial-page.component";
import { MessageRecipientModalComponent } from "./messages-page/message-recipient-modal/message-recipient-modal.component";
import { FeedCreatePostModalComponent } from "./feed/feed-create-post-modal/feed-create-post-modal.component";
import { IconsModule } from "./icons/icons.module";
import { LottieModule } from "ngx-lottie";
import player from "lottie-web";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { ReferralProgramMgrComponent } from "./referral-program-mgr/referral-program-mgr.component";
import { ReferralsComponent } from "./referrals/referrals.component";
import { BuyDeSoEthComponent } from "./buy-deso-page/buy-deso-eth/buy-deso-eth.component";
import { SanitizeVideoUrlPipe } from "../lib/pipes/sanitize-video-url-pipe";
import { TransferNftModalComponent } from "./transfer-nft/transfer-nft-modal/transfer-nft-modal.component";
import { TransferNftPageComponent } from "./transfer-nft/transfer-nft-page/transfer-nft-page.component";
import { TransferNftComponent } from "./transfer-nft/transfer-nft.component";

// Modular Themes for DeSo by Carsen Klock @carsenk
import { ThemeModule } from "./theme/theme.module";
import { Theme } from "./theme/symbols";
import { ScrollingModule } from "@angular/cdk/scrolling";
import { PostMultiplierComponent } from "./feed/feed-post-dropdown/post-multiplier/post-multiplier.component";
import { TransferNftAcceptComponent } from "./transfer-nft-accept/transfer-nft-accept.component";
import { TransferNftAcceptModalComponent } from "./transfer-nft-accept/transfer-nft-accept-modal/transfer-nft-accept-modal.component";
import { TransferNftAcceptPageComponent } from "./transfer-nft-accept/transfer-nft-accept-page/transfer-nft-accept-page.component";
import { NftBurnPageComponent } from "./nft-burn/nft-burn-page/nft-burn-page.component";
import { NftBurnComponent } from "./nft-burn/nft-burn.component";
import { NftBurnModalComponent } from "./nft-burn/nft-burn-modal/nft-burn-modal.component";
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
    ThemeModule.forRoot({
      themes: [lightTheme, darkTheme, icydarkTheme],
      active:
        localStorage.getItem("theme") ||
        (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "light"),
    }),
    IconsModule,
    LottieModule,
    LottieModule.forRoot({ player: playerFactory }),
    ScrollingModule,
  ],
  providers: [BackendApiService, GlobalVarsService, BsModalService, IdentityService],
  bootstrap: [AppComponent],
})
export class AppModule {}
