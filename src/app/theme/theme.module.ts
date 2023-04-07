import { ModuleWithProviders, NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { ThemeService } from "./theme.service";
import { ACTIVE_THEME, ThemeOptions, THEMES } from "./symbols";

@NgModule({
  imports: [CommonModule],
  providers: [ThemeService],
})
export class ThemeModule {
  static forRoot(options: ThemeOptions): ModuleWithProviders<ThemeModule> {
    return {
      ngModule: ThemeModule,
      providers: [
        {
          provide: THEMES,
          useValue: options.themes,
        },
        {
          provide: ACTIVE_THEME,
          useValue: options.active,
        },
      ],
    };
  }
}
