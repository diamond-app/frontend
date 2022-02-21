import RouteNamesService from "../app/route-names.service";
import { SwalHelper } from "./helpers/swal-helper";
import { GlobalVarsService } from "../app/global-vars.service";
import { Router } from "@angular/router";
import { isNil } from "lodash";

const RouteNames = RouteNamesService;
export class SharedDialogs {
  static showCreateAccountToPostDialog(globalVars: GlobalVarsService) {
    return SwalHelper.fire({
      target: globalVars.getTargetComponentSelector(),
      icon: "info",
      title: `Create an account to post`,
      html: `It's totally anonymous and takes under a minute.`,
      showCancelButton: true,
      showConfirmButton: true,
      focusConfirm: true,
      customClass: {
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
      confirmButtonText: "Create an account",
      cancelButtonText: "Nevermind",
      reverseButtons: true,
    }).then((res: any) => {
      if (res.isConfirmed) {
        globalVars.launchSignupFlow();
      }
    });
  }

  static showCreateProfileToPostDialog(router: Router) {
    SwalHelper.fire({
      target: GlobalVarsService.getTargetComponentSelectorFromRouter(router),
      icon: "info",
      title: `Complete your profile to post`,
      html: `You can be whoever you want to be.`,
      showCancelButton: true,
      showConfirmButton: true,
      focusConfirm: true,
      customClass: {
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
      confirmButtonText: "Complete Your Profile",
      cancelButtonText: "Nevermind",
      reverseButtons: true,
    }).then((res: any) => {
      if (res.isConfirmed) {
        router.navigate(["/" + RouteNames.UPDATE_PROFILE], { queryParamsHandling: "merge" });
      }
    });
  }

  static showCreateProfileToPerformActionDialog(router: Router, action: string, globalVarsService: GlobalVarsService) {
    const hasUser = !isNil(globalVarsService.loggedInUser);
    const title = hasUser ? `Complete your profile to ${action}` : `Create a wallet to ${action}`;
    const html = hasUser ? `You can be whoever you want to be.` : "";
    const confirmButtonText = hasUser ? "Complete Your Profile" : "Create Your Wallet";
    SwalHelper.fire({
      target: GlobalVarsService.getTargetComponentSelectorFromRouter(router),
      icon: "info",
      title,
      html,
      showCancelButton: true,
      showConfirmButton: true,
      focusConfirm: true,
      customClass: {
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
      confirmButtonText,
      cancelButtonText: "Nevermind",
      reverseButtons: true,
    }).then((res: any) => {
      if (res.isConfirmed) {
        if (hasUser) {
          router.navigate(["/" + RouteNames.UPDATE_PROFILE], { queryParamsHandling: "merge" });
        } else {
          globalVarsService.launchSignupFlow();
        }
      }
    });
  }
}
