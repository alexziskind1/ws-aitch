## UX Timing

<div class="nsw"></div>

#### Overview of topics covered

- Timeouts gone bad!
- Dealing with event bussing app wide
- Subscription clean up

> NOTE: You will need to add packaging of `.wav` files into Webpack configuration so the audio files get deployed with the app and bundled with webpack. Open `webpack.config.js` and locate the `plugins` configuration section, specifically the `CopyWebpackPlugin` setup. Add a glob pattern to copy `.wav` files to destination: `{ from: { glob: "**/*.wav" } },`

<div class="nsw"></div>

### Lesson 3.1: Timeouts gone bad!

While setTimouts are a necessary good in NativeScript apps, when not used properly and not controlled, they could cause some problems in your apps. This is immediately evident when the user interacts with the app while a timeout is happening.

The best (worst) offending example is kicking off a timeout while on one page, and having the user navigate to another page while the timeout callback hasn't been called yet. This is clearly visible if showing a message or alert on the screen, and it's especially noticeable if triggering audio. Here is an example of a pretty bad user experience.

```typescript
// home.component.ts
ngOnInit(): void {
    this.items = this._itemService.getItems();
    setTimeout(() => {
      alert('This is where you can find all your home items.');
      setTimeout(() => {
        this._audio.play('~/assets/sparkle.wav');
          // overlapping alert calls can cause problems
        alert('Shiny things!');
      }, 2500);
    }, 2500);
}
```

#### What you're doing

##### Naïve solution

Track timeout id then cancel it when navigating. This is a simple solution that will work for one timeout, but when there are cascading timers, then this problem will get out of hand quickly. It's also hard to manage all the timers accross the application this way.

```typescript
// home.component.ts

private timerId: number = -1;

ngOnInit(): void {
    this.items = this._itemService.getItems();
    this.timerId = setTimeout(() => {
      alert('This is where you can find all your home items.');
      setTimeout(() => {
        this._audio.play('~/assets/sparkle.wav');
        alert('Shiny things!');
      }, 2500);
    }, 2500);
}
```

Later, when navigating, perhaps

```typescript
clearTimeout(this.timerId);
```

##### Better solution

Use a timer service to manage these timeouts. Assigns GUIDs to components and keep track of them in the service, giving the ability to cancel all associated timeouts at the same time. Also allows single component to have multiple flows.

```typescript
// home.component.ts - using with TimerService
this._timer.start(2500, this._welcomeFlowTimer).done.then(() => {
  alert("This is where you can find all your home items.");
  this._timer.start(2500, this._welcomeFlowTimer).done.then(() => {
    this._audio.play("~/assets/sparkle.wav");

    alert("Shiny things!");
  });
});
```

<div class="nsw"></div>

### Lesson 3.2: Dealing with event bussing app wide

How do you know when the user changed the tab in your application? Well, that's an easy one - just handle the `selectedIndexChange` event. Right?
Yes, but that's not all. Since the tab view spans your application, the rest of the app needs to know when the change happens.

#### What you're doing

You might have guessed by now that we'll be using a service to keep track of the selected tab of the tab view. This is a pattern we've seen before.

```typescript
// tab.service.ts
@Injectable()
export class TabService {
  indexChanged$: Subject<number> = new Subject();

  /**
   * Tab navigation needs some extra helpers to manage UX timing well
   */
  onIndexChanged(args) {
    const tabView = <BottomNavigation>args.object;
    this.indexChanged$.next(tabView.selectedIndex);
  }
}
```

The `tabs.component` that hosts the tab view can use the `TabService` to bind the `selectedIndexChange` event directly to the handler in the `TabService`.

```typescript
// tabs.component.ts
@Component()
export class TabsComponent implements OnInit {
  constructor(public tabService: TabService) {}
}
```

```xml
<!-- tabs.component.html -->
<BottomNavigation (selectedIndexChange)="tabService.onIndexChanged($event)"></BottomNavigation>
```

Any component that needs to know about the tab selection can subscribe to the observable that provides that data.

<div class="nsw"></div>

### Exercise 3.3 Terminate the home flow

##### Requirements

Implement the `TabService` to manage tab switching, then terminate the flow initiated on the `HomeComponent` when tabs are switched.

#### Review

<div class="solution-start"></div>

###### Step 1

Add the `TabService` implementation for the tab change event.

```typescript
// tab.service.ts
export class TabService {
  indexChanged$: Subject<number> = new Subject();
  public onIndexChanged(args) {
    const tabView = <BottomNavigation>args.object;
    this.indexChanged$.next(tabView.selectedIndex);
  }
}
```

###### Step 2

Bind the `selectedIndexChange` event in the `BottomNavigation` component to the new `TabService` handler. Make sure to inject the `TabService` into the `TabsComponent`.

```typescript
// tabs.component.html
<BottomNavigation (selectedIndexChange)="tabService.onIndexChanged($event)" selectedIndex="0">
```

<div class="solution-end"></div>

<div class="nsw"></div>

### Exercise 3.4 Control overlapping framework dialogs

##### Requirements

Take control of overlapping alerts by centrally managing them. Allow only one system `alert` dialog to be displayed at a time.

##### Tips

1. Create a new service (call it `WindowService`) that will manage `alert` dialogs.
1. The service should have an `alert` method and a `reset` method.
1. Use the `dialogs` module that comes with NativeScript Core modules: `import * as nsDialogs from "tns-core-modules/ui/dialogs";`

#### Review

<div class="solution-start"></div>

###### Step 1

Create a new service called `WindowService` that handles alerts

```typescript
// window.service.ts
@Injectable()
export class WindowService {
  private _isAlertOpen = false;

  alert(options: string | nsDialogs.AlertOptions) {
    return new Promise((resolve) => {
      if (!this._isAlertOpen) {
        this._isAlertOpen = true;
        let opt = <nsDialogs.AlertOptions>options;
        if (typeof options === "string") {
          opt = {
            title: "Alert",
            message: options,
            okButtonText: "Ok",
          };
        }
        nsDialogs.alert(opt).then(
          () => {
            this.reset(1);
            resolve();
          },
          () => {
            this.reset(1);
            resolve();
          }
        );
      }
    });
  }

  reset(type: number) {
    switch (type) {
      case 1:
        this._isAlertOpen = false;
        break;
      default:
        this._isAlertOpen = false;
        break;
    }
  }
}
```

###### Step 2

Use the new `WindowService` instead of plain old `alert` dialog calls in your `HomeComponent`.

```typescript
// home.component.ts
        this._timer.start(2500, this._welcomeFlowTimer).done.then(() => {
          this._win.alert('This is where you can find all your home items.');

          this._timer.start(2500, this._welcomeFlowTimer).done.then(() => {
            this._audio.play('~/assets/sparkle.wav');
              this._win.alert('Shiny things!');
          });
```

<div class="solution-end"></div>

<div class="nsw"></div>

### Bonus Exercise 3.5: Extend the WindowService to support confirm dialogs

##### Requirements

Demonstrate how to control overlapping confirm dialogs. Allow only one system `confirm` dialog to be displayed at a time.

##### Tips

Extend the `WindowService` to manage `confirm` dialogs.

#### Review

<div class="solution-start"></div>

###### Step 1

```typescript
// window.service.ts

    private _isConfirmOpen = false;

    confirm(options: string | nsDialogs.ConfirmOptions) {
        return new Promise((resolve, reject) => {
            if (!this._isConfirmOpen) {
                this._isConfirmOpen = true;
                let opt = <nsDialogs.ConfirmOptions>options;
                if (typeof options === 'string') {
                  opt = {
                    title: 'Confirm',
                    message: options,
                    okButtonText: 'Ok',
                    cancelButtonText: 'Cancel'
                  };
                }
                nsDialogs.confirm(opt).then(
                  (ok) => {
                      this.reset(2);
                      if (ok) {
                        resolve();
                      } else {
                        reject();
                      }
                  },
                  () => {
                      this.reset(2);
                      reject();
                  }
              );
            }
        });
    }

    reset(type: number) {
        switch (type) {
            case 1:
                this._isAlertOpen = false;
                break;
            case 2:
                this._isConfirmOpen = false;
                break;
            default:
                this._isAlertOpen = false;
                this._isConfirmOpen = false;
                break;
        }
    }
```

<div class="solution-end"></div>

#### Discussion

In your group, discuss how you could expand the solution to support queued alerts/confirms so if a few were triggered at same time, they would be queued and not all show up at the same time. A user could handle these dialogs one at a time.

<div class="nsw"></div>

### Lesson 3.6: Subscription clean up

There is an inherent problem with the `TabService` subscriptions in the previous lesson. The subs need to be unsubscribed. This is a common issue with RxJS oservables that needs to be addressed. What's the best way to unsubscribe?

#### Discussion

In your group discuss different strategies to unsubscribe. Share examples of techniques you've used in the past and ideas about how you would do it now.

#### The Solution

Use a `BaseComponent` abstract class to help with RxJS subs clean up.

```typescript
/// base.component.ts

export abstract class BaseComponent implements OnDestroy {
  private _destroy$: Subject<any>;

  get destroy$() {
    if (!this._destroy$) {
      // Perf optimization:
      // since this is likely used as base component everywhere
      // only construct a Subject instance if actually used
      this._destroy$ = new Subject();
    }
    return this._destroy$;
  }

  ngOnDestroy() {
    if (this._destroy$) {
      this._destroy$.next(true);
      this._destroy$.complete();
    }
  }
}
```

Components that need to subscribe can extend `BaseComponent` and have subscriptions automatically unsubscribed for them.

```typescript
// home.component.ts

export class HomeComponent extends BaseComponent implements OnInit {
  constructor(private _tabService: TabService) {
    super();

    this._tabService.indexChanged$
      .pipe(
        takeUntil(this.destroy$),
        // this fires right when app loads so you could control that situation using skip(1) depending on the type of data flow and ux sequencing you desire
        skip(1)
      )
      .subscribe((index) => {
        if (index === 0) {
          // do tab 0 stuff here
        } else {
          // something else
        }
      });
  }
}
```

> NOTE: For teams using CI builds, if you want to ensure everyone is following this practice, linting could be used to ensure `takeUntil` is used with every subscribe

<div class="nsw"></div>

### Independent Exercise 3.7: Pause and Resume

Discuss with your team how your could extend the timer service to support pause and resume.

##### Requirements

Extend timer service to support pause and resume.
