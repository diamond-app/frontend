import { Pipe, PipeTransform } from "@angular/core";
import { RouteNames } from "../../app/app-routing.module";
import { AppComponent } from "../../app/app.component";
import Autolinker from "autolinker";
import escape from "lodash/escape";
import replace from "lodash/replace";
import filter from "lodash/filter";

@Pipe({
  name: "sanitizeAndAutoLink",
})
export class SanitizeAndAutoLinkPipe implements PipeTransform {
  transform(unsafeText: string, args?: any): any {
    // FIXME: TODO: someone should audit this function for XSS issues
    // Escape to remove any HTML tags that may have been added by users
    let text = escape(unsafeText);

    // limit of two newlines in a row
    text = replace(text, /\n\n+/g, "\n\n");

    // display newlines
    text = replace(text, /\n/g, "<br>");

    // This expands @-mentions and $-cashtags into links to profiles.
    // This is going to expand anything that's prefixed with @/$ into links, not just usernames.
    // Maybe we should have more code to validate whether an @-mention is a legit username (e.g.
    // the server could return something) and only link if so
    //
    // We don't use the npm library because we need to customize the regexes for usernames and cashtags
    const twitter = require("../../vendor/twitter-text-3.1.0.js");
    let entities = twitter.extractEntitiesWithIndices(text, {
      extractUrlsWithoutProtocol: false,
    });

    // Only link usernames and cashtags for now (not hashtags etc)
    entities = filter(entities, (entity) => entity.screenName || entity.cashtag || entity.hashtag);

    const textWithMentionLinks = twitter.autoLinkEntities(text, entities, {
      usernameUrlBase: `/${RouteNames.USER_PREFIX}/`,
      usernameClass: AppComponent.DYNAMICALLY_ADDED_ROUTER_LINK_CLASS,
      usernameIncludeSymbol: true,
      cashtagUrlBase: `/${RouteNames.USER_PREFIX}/`,
      cashtagClass: AppComponent.DYNAMICALLY_ADDED_ROUTER_LINK_CLASS,
      hashtagUrlBase: `/${RouteNames.BROWSE}/${RouteNames.TAG}/`,
      hashtagClass: AppComponent.DYNAMICALLY_ADDED_ROUTER_LINK_CLASS,
    });

    return Autolinker.link(textWithMentionLinks);
  }
}
