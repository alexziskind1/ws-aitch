## App Bootstrapping

<div class="nsw"></div>

#### Overview of topics covered

* Review of async app_initializer - doesn't work with NativeScript
* Delay initialNavigation
* Prepare data before navigating to first view
* Provide a very fast/efficient initial first app launch experience
* Show how to cover initial actionbar when using delayed initialNavigation
* Show example of doing the boot cover as it's own component with the state handled internally
* Handle intro and/or registration input to feed into data services prior to even navigating







<div class="nsw"></div>

### Lesson 1.1: Initial Navigation Switch

Many apps need to perform some initial loading on statup. You can trigger the data load, and display a loading indicator while doing so. But, we also need to follow the initial route defined in the route module; the default route. Navigating while an overlapping animation is running can be expensive and cause animation jitters.
 

#### What you're doing

In this lesson, we'll take manual control of navigation, after an initial timeout in the `AppModule` constructor.

We're going to start with delaying initial navigation.
To accomplish this initial navigation delay, make sure that auto-navigation is turned off at boot with the `initialNavigation: false` flag.

>NOTE: Don't type this in, yet. Just read the code and get familiar with it, for now.

```typescript
// app-routing.module.ts
@NgModule({
    imports: [NativeScriptRouterModule.forRoot(routes,
      {
        initialNavigation: false
      }
    )
  ],
    exports: [NativeScriptRouterModule]
})
export class AppRoutingModule { }
```

Then after an initial load and timeout in the constructor of the root App Module of the application, manually navigate using the injected router.

```typescript
// app.module.ts
@NgModule({
    ...
})
export class AppModule {
  constructor(
    private router: Router
  ) {
    setTimeout(() => {
        this.router.initialNavigation();
    }, 5000);
  }
}

```







<div class="nsw"></div>

### Exercise 1.2: Implement the initial navigation switch

##### Requirements

Each member of your team has to do the exercise on their own machine. 
The task is to delay the initial routing by 5 seconds using the technique described in this lesson.

##### Tips

1. In the root routing module, cancel initial navigation
1. In the app module constructor, delay navigation and then manually navigate to the intial preconfigured route.
1. We're going to be doing a lot of reloading, and we need to see how the bootstrap process works, so use the `--no-hmr` flag when running the app.

#### Review

<div class="solution-start"></div>

###### Step 1

```typescript
@NgModule({
    imports: [NativeScriptRouterModule.forRoot(routes,
      {
        initialNavigation: false
      }
    )
  ],
    exports: [NativeScriptRouterModule]
})
export class AppRoutingModule { }
```

###### Step 2

```typescript
@NgModule({
    ...
})
export class AppModule {
  constructor(
    private router: Router
  ) {
    setTimeout(() => {
        this.router.initialNavigation();
    }, 5000);
  }
}

```

<div class="solution-end"></div>







<div class="nsw"></div>

### Lesson 1.3: Boot Guard

Intead of delaying initial navigation, another option is to use Angular's own router and add a route guard, in this case called "Boot Guard", to delay the navigation in the guard itself. This achieves the same effect that we had in the previous lesson.


#### What you're doing

We're going to delay initial navigation using a different technique. Here we'll use a "Boot Guard" to delay initial navigation.

Set up an Angular route guard that implements `CanActivate` and `CanLoad` Angular Router interfaces

```typescript
// app/core/services/boot.guard.ts
@Injectable()
export class BootGuard implements CanActivate, CanLoad {
  public constructor(private router: Router) { }
  public canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 5000);
    });
  }
  public canLoad(route: Route): Promise<boolean> {
    return this.canActivate(null, null);
  }
}
```

Use the "Boot Guard" in the routing module. 

>NOTE: you will need to reset the `initialNavigation` to `true` in order to try this.

```typescript
// app-routing.module.ts
const routes: Routes = [
  { path: "", redirectTo: "/items", pathMatch: "full" },
  {
    path: "items",
    component: ItemsComponent,
    canActivate: [BootGuard]
  },
  { path: "item/:id", component: ItemDetailComponent },
  { path: "register", component: RegisterComponent }
];

@NgModule({
  imports: [NativeScriptRouterModule.forRoot(routes, { initialNavigation: true })],
  exports: [NativeScriptRouterModule]
})
export class AppRoutingModule { }
```







<div class="nsw"></div>

### Lesson 1.4: Manual delayed navigation

You may want to navigate in a delayed fashion, but to a different route based on some conditions.

#### What you're doing

We're going to demonstrate how a completely different route could be navigated based on async conditions.
In the `BootGuard` that you created in the previous lesson, use the router to navigate to the `register` route instead of just returning `true` to navigate to the configured route.

```typescript
// app/core/services/boot.guard.ts
@Injectable()
export class BootGuard implements CanActivate, CanLoad {
  public constructor(private router: Router) { }
  public canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // resolve(true);
        this.router.navigate(['/register']);
        resolve(false);
      }, 5000);
    });
  }
  public canLoad(route: Route): Promise<boolean> {
    return this.canActivate(null, null);
  }
}
```

Alternatively, we can manually navigate to the `register` route from the app module constructor instead of the initial configured route.

>NOTE: Use this method *instead* of the previous one, not both at the same time.


```typescript
// app.module.ts
@NgModule({
    ...
})
export class AppModule {
  constructor(
    private router: Router
  ) {
    setTimeout(() => {
        // this.router.initialNavigation();
        this.router.navigate(['/register']);
    }, 2000);
  }
}
```








<div class="nsw"></div>

### Lesson 1.5: Third-party loading indicator

In this lesson, we'll demonstrate a loading screen. Pay attention as this will be in the exercise!

A third party loading component can be a dangerous memory thief, if not used properly, as we'll see in an example when a singleton service is not used.


#### What you're doing

We're implementing a basic loading indicator usign a plugin called `@nstudio/nativescript-loading-indicator`.

>NOTE: Here we're demonstrating using the initial delay in the `AppModule` instead of the `BootGuard`.

```typescript
// app.module.ts
export class AppModule {
  loading: LoadingIndicator;

  constructor(
    private router: Router
  ) {

    this.loading = new LoadingIndicator();
    this.loading.show({
      message: 'Booting app...'
    });

    setTimeout(() => {
      this.router.initialNavigation();
      this.loading.hide();
    }, 5000);
  }
}
```






<div class="nsw"></div>

### Exercise 1.6: Loading indicator

Implement the animated loading screen following best practices and using the techniques you've learned in this chapter.

##### Requirements

* Delay navigation using a method of your choice.
* Implement the `@nstudio/nativescript-loading-indicator` plugin in your app.


##### Tips

1. Use a singleton! Abstract the loading indicator away from the App module into a service, call it `ProgressService`.

#### Review

<div class="solution-start"></div>

###### Step 1

Implement the `ProgressService` class and register it with the `NgModule`

```typescript
// app/core/services/progress.service.ts
import { Injectable } from '@angular/core';
import { LoadingIndicator, OptionsCommon } from '@nstudio/nativescript-loading-indicator';

@Injectable()
export class ProgressService {
  loading: LoadingIndicator;

  constructor() {
    console.log('ProgressService constructed.');
    this.loading = new LoadingIndicator();
  }

  show(options: OptionsCommon) {
    this.loading.show(options);
  }

  hide() {
    this.loading.hide();
  }
}
```

###### Step 2

In the root app module, inject the `ProgressService` and use it to show and hide the loading screen.

```typescript
// app.module.ts
export class AppModule {
  constructor(
    private router: Router,
    private progress: ProgressService
  ) {
    // Use singleton service
    this.progress.show({
      message: 'Booting app...'
    });
    setTimeout(() => {
      this.progress.hide();
    }, 8000);
  }
}
```

<div class="solution-end"></div>










<div class="nsw"></div>

### Lesson 1.7 App ready service

In this lesson we are creating a service that abstracts away the state of the application being ready. 

#### What you're doing

Use a RxJS `Subject` to keep track of the application ready state. This will happen only once per application and that's why we use `Subject`. 


```typescript
// app/core/services/app.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable()
export class AppService {
  appReady$: Subject<boolean> = new Subject();
}
```

Subscribe to the app ready `Subject` in the root app component to be notified when the app is ready.

```typescript
// app.component.ts
@Component({})
export class AppComponent { 
  appReady: boolean;

  ngOnInit() {
    this.appService.appReady$.pipe(
      take(1)
    ).subscribe(() => {
      this.appReady = true;
    });
  }
}
```

When the app is ready, as determined by your loading logic from previous lessons (app module delay or Boot Guard delay), then stream a boolean `true` value to the app service to let the rest of the application know that everything is ready to go, but more importantly, the root app component will know since it's already subscribed to these updates.

```typescript
// app.module.ts
@NgModule({})
export class AppModule {
  constructor(
    private router: Router
  ) {
    setTimeout(() => {
        this.appService.appReady$.next(true);
    }, 2000);
  }
}
```

OR (if you're using the boot guard method)

```typescript
// /app/core/services/boot.guard.ts
  public canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.appService.appReady$.next(true);
        // Demonstrate how a completely different route could be navigated based on async conditions
        // this.router.navigate(['/register']);
        // resolve(false);
        resolve(true);
      }, 5000);
    });
  }
```












<div class="nsw"></div>

### Lesson 1.8: Cancel animation

In this lesson we'll discuss the pros and cons of canceling a lottie animation before animating it out of view.


```xml
  <!-- app.component.html-->
  <GridLayout
    *ngIf="!appReady"
    rows="*,auto,*"
    columns="*,auto,*"
    class="c-bg-white"
    (loaded)="loadedIntro($event)"
  >
    <LottieView
      row="1"
      colSpan="3"
      autoPlay="true"
      loop="true"
      src="animations/loading.json"
      class="w-full h-full"
      (loaded)="loadedLottie($event)"
    ></LottieView>
  </GridLayout>
```


```typescript
// app.component.ts
  intro: View;
  lottie: LottieView;

  ngOnInit() {
    this.appService.appReady$.pipe(
      take(1)
    ).subscribe(() => {
      if (this.lottie) {
        this.lottie.cancelAnimation();
        this.intro.animate({
          opacity: 0,
          duration: 1000,
          curve: AnimationCurve.easeOut
        }).then(() => {
          this.appReady = true;
        }); 
      } else {
        this.appReady = true;
      }
    })
  }

  loadedIntro(args) {
    this.intro = args.object;
  }

  loadedLottie(args) {
    this.lottie = args.object;
  }
```
