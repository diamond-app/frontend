import {
  provideTransloco,
  TranslocoModule
} from '@jsverse/transloco';
import { Injectable, isDevMode, NgModule } from '@angular/core';
import { provideTranslocoPersistLang } from '@jsverse/transloco-persist-lang';

import { TranslocoHttpLoader } from './transloco-loader';

@NgModule({
  exports: [ TranslocoModule ],
  providers: [
      provideTransloco({
          config: {
              availableLangs: ['en', 'es'],
              defaultLang: 'en',
              // Remove this option if your application doesn't support changing language in runtime.
              reRenderOnLangChange: true,
              prodMode: !isDevMode(),
          },
          loader: TranslocoHttpLoader
      }),
      provideTranslocoPersistLang({
        storage: {
          useValue: localStorage,
        },
      }),
  ],
})
export class TranslocoRootModule {}