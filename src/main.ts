import { bootstrapApplication } from "@angular/platform-browser";
import { provideServiceWorker } from "@angular/service-worker";
import { isDevMode } from "@angular/core";
import { AppComponent } from "./app";
import { loadAppConfig } from "./config";
loadAppConfig()
  .then(() =>
    bootstrapApplication(AppComponent, {
      providers: [
        provideServiceWorker("ngsw-worker.js", {
          enabled: !isDevMode(),
          registrationStrategy: "registerWhenStable:30000",
        }),
      ],
    }),
  )
  .catch(console.error);
