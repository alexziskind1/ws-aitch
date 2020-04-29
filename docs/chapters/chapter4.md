## Layer Cake

<div class="nsw"></div>

#### Overview of topics covered

- The Layers
- Popup isolation

<div class="nsw"></div>

### Lesson 4.1: The layers

The idea behind this approach is to layer UI elements in front of the normal application navigation flow to have app-wide access to a centrally managed popup dialogs that are dynamically populated by content. There's quite a bit to unpack there, so we're going to take it one step at a time. Let's start with the layers themselves.

> Layering is not a novel idea but hints at doing layering have been mentioned in several NativeScript forums, notably from Shiva Prasad. You can take a look at it here: [https://discourse.nativescript.org/t/how-to-layer-items-in-nativescript/3298](https://discourse.nativescript.org/t/how-to-layer-items-in-nativescript/3298)

#### What you're doing

Due to the way we'll architect the layers, we'll achieve simple layer reuse and won't incur any cost of creating a lingering component that lives the lifetime of the application.

Let's set up the layers.

Wrap the root `page-router-outlet` in a `GridLayout`.

```xml
<!-- app.component.html -->
<GridLayout>
  <page-router-outlet></page-router-outlet>

</GridLayout>
```

Add the future popup component to the `GridLayout`. Notice we are not specifying a row or column because this component will live "on top of" the `page-router-outlet`. We'll get back to the popup.

```xml
<!-- app.component.html -->
<GridLayout>
  <page-router-outlet></page-router-outlet>
  <ns-popup-view></ns-popup-view>
</GridLayout>
```

Remember that `ViewService` that we started in Chapter 2? Since by now, you already know our pattern for centralizing control and component communication, we're not implementing a new service to manage the popup. Instead we're going to reuse the `ViewService` here to control our popup toggle.

We also need an object to pass popup parameters and popup results back and forth between the triggering component and the popup itself, so we'll add an interface called `IViewLayer`. Normally we'd add this as a separate module, but for this demo let's just keep in the `view.service.ts` file.

```typescript
// view.service.ts
interface IViewLayer {
  open: boolean;
  cmpType?: any;
  cmpProps?: any;
  /**
   * allow results to be passed back to the caller
   */
  result?: any;
  /**
   * allow custom height to be passed in
   */
  height?: number;
}
```

Add the `togglePopup$` observable to the `ViewService`

```typescript
// view.service.ts
@Injectable()
export class ViewService {
  ...
  togglePopup$: Subject<IViewLayer> = new Subject();
  ...
}
```

Now create the popup component itself

```xml
<!-- popup-view.component.html -->
<GridLayout class="w-full h-full v-bottom" rows="*, auto" (loaded)="loadedContainer($event)" visibility="collapse" opacity="0">
    <GridLayout
      row="1"
      rows="25,*"
    >
      <StackLayout row="1">
        <!-- Add some UI here -->
      </StackLayout>
    </GridLayout>
  </GridLayout>
```

```typescript
export class PopupViewComponent extends BaseComponent {
  @ViewChild("content", {
    read: ViewContainerRef,
    static: false,
  })
  vcRef: ViewContainerRef;

  popupHeight: number;
  private _component: ComponentRef<any>;
  private _popupViewContainer: GridLayout;
  private _defaultHeight = screen.mainScreen.heightDIPs - 125;

  constructor(
    private _resolver: ComponentFactoryResolver,
    private _viewService: ViewService
  ) {
    super();
    this.popupHeight = this._defaultHeight;
  }

  ngOnInit() {
    this._viewService.togglePopup$
      .pipe(takeUntil(this.destroy$))
      .subscribe((options) => {
        if (options.open) {
          this.popupHeight = options.height || this._defaultHeight;
          if (options.cmpType) {
            const compFactory = this._resolver.resolveComponentFactory(
              options.cmpType
            );
            this._component = this.vcRef.createComponent(compFactory);
          }
          if (options.cmpProps) {
            for (const key in options.cmpProps) {
              this._component.instance[key] = options.cmpProps[key];
            }
          }
          this._toggleDisplay(true);
        } // if (this._component) - check for existence of component after loading it
        else {
          this._toggleDisplay(false);
        }
      });
  }

  loadedContainer(args) {
    this._popupViewContainer = args.object;
  }

  private _toggleDisplay(show: boolean, ignoreReset?: boolean) {
    if (show) {
      if (!ignoreReset) {
        this._popupViewContainer.visibility = "visible";
      }
      this._popupViewContainer.opacity = 1;
    } else {
      this._popupViewContainer.visibility = "collapse";
    }
  }
}
```

<div class="nsw"></div>

### Exercise 4.2: Implement opening and closing the popup

##### Requirements

Open the popup from `ItemsComponent`.

##### Tips

1. When opening the popup, implement the `HelloViewComponent` and pass that in as a `cmpType` option to `togglePopup$` so the popup has something to display.
1. Add a UI View that will trigger the `close` method in the popup component.

#### Review

<div class="solution-start"></div>

###### Step 1

Add a clickable area to the popup component that will trigger the popup closing

```xml
<!-- popup-view.component.html -->
<GridLayout (tap)="close()"></GridLayout>
```

###### Step 2

Add a close function

```typescript
// popup-view.component.ts
    close() {
        this._viewService.togglePopup$.next({ open: false });
    }
```

<div class="solution-end"></div>

<div class="nsw"></div>

### Lesson 4.3: Using the popup

#### What you're doing

Let's take a look at how our new layered popup works by triggering it and injecting content.

We need to create some content for the popup to display dynamically. So we'll create a simple view component called `hello-view`;

```xml
<!-- hello-view.component.html -->
<StackLayout>
    <Label [text]="title" class="t-30 c-black text-center"></Label>
    <Button text="Close with results" (tap)="closeWithResult()" class="btn btn-primary m-t-20"></Button>
</StackLayout>
```

```typescript
// hello-view.component.ts
@Component()
export class HelloViewComponent extends BaseComponent {
  title = "Hello!";
  constructor(private viewService: ViewService) {
    super();
  }

  ngOnInit() {
    console.log("HelloViewComponent ngOnInit");
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    console.log("HelloViewComponent ngOnDestroy");
  }

  closeWithResult() {
    this.viewService.togglePopup$.next({
      open: false,
      result: true,
    });
  }
}
```

Open the popup from the `items.component.html` and pass in the popup options (which is of the type `IViewLayer` that we created earlier)

```xml
<!-- items.component.html -->
<Button text="Open popup" (tap)="openPopup()" class="btn btn-primary m-b-20"></Button>
```

```typescript
@Component()
export class ItemsComponent implements OnInit {
  constructor(private viewService: ViewService) {}

  openPopup() {
    this.viewService.togglePopup$.next({
      open: true,
      height: screen.mainScreen.heightDIPs / 2,
      cmpType: HelloViewComponent,
      cmpProps: {
        title: "Hello Workshop!",
      },
    });
  }
}
```

In order for the new component to be injected into the popup, add a `<ng-container>` as the placeholder for the injected component to the template of the popup.

```html
<!--popup-view.component.html-->
...
<ng-container #content></ng-container>
...
```

<div class="nsw"></div>

### Exercise 4.4: Add an overlay cover layer

##### Requirements

Add an overlay layer that covers the `page-router-outlet` and lives just under the popup component layer.

##### Tips

Create a new component and call it `ShadeCoverComponent`. You can use the selector `ns-shade-cover`. Or call these whatever you want, but that's what we'll call ours!

#### Review

<div class="solution-start"></div>

###### Step 1

Create the overlay component

```xml
<GridLayout *ngIf="show" class="w-full h-full v-bottom gradient-black-to-top" opacity="0" (loaded)="loaded($event)">
  <StackLayout class="w-full c-bg-white v-bottom" height="50"></StackLayout>
</GridLayout>
```

Notice how this setup can be used to cover the gap at bottom which may show through if pan pulls up high enough

```typescript
@Component()
export class ShadeCoverComponent extends BaseComponent {
  show = false;
  private _cover: StackLayout;

  constructor(private _viewService: ViewService) {
    super();
  }

  ngOnInit() {
    this._viewService.togglePopup$
      .pipe(takeUntil(this.destroy$))
      .subscribe((options) => {
        if (options.open) {
          this.show = true;
        } else if (this._cover) {
          this.show = false;
        }
      });
  }

  loaded(args) {
    this._cover = <StackLayout>args.object;
  }
}
```

###### Step 2

Add the component to the root `app.component.html`

```xml
<!-- app.component.html -->
<GridLayout>
  <page-router-outlet></page-router-outlet>

  <ns-shade-cover></ns-shade-cover>
  <ns-popup-view></ns-popup-view>
</GridLayout>

```

<div class="solution-end"></div>

<div class="nsw"></div>

### Exercise 4.5: Add opening and closing asynchronous animations

##### Requirements

Extend the `ViewService` to include showing and hiding animations for the popup and the overlay cover. Then use those animations when opening and closing the popup.

##### Tips

Keep track of animations in the `ViewService` using a private list.

```typescript
private _animations: { [key: string]: Animation } = {};
```

Keep these things in mind when doing the exercise:

1. Best practice is to wrap resolve with NgZone for safety
1. Omitting an error handler on animations can lead to app destabilization; always use a catch on animations in case of unexpected race conditions which could lead to app destabilization
1. Not logging inside animation error handler could hide an app problem making bug finding harder

#### Review

<div class="solution-start"></div>

###### Step 1

Add animation handling in the `ViewService`

```typescript
// view.service.ts

@Injectable()
export class ViewService {
    togglePopup$: Subject<IViewLayer> = new Subject();
    private _animations: { [key: string]: Animation } = {};

    constructor(private _ngZone: NgZone) {}

    startAnimation(options: {
        definitions: Array<AnimationDefinition>;
        resetOnFinish?: boolean;
        id?: string;
    }) {
        return {
            id: options.id || guid(),
            done: new Promise(resolve => {
                let animation: Animation;
                if (options.id) {
                    animation = this._animations[options.id];
                } else {
                    animation = new Animation(options.definitions);
                }
                animation.play(options.resetOnFinish).then(
                    () => {
                        this._ngZone.run(() => {
                          resolve();
                        });
                    },
                    (err) => {
                      console.log('animation cancelled: ', err);
                    }
                );
                .catch(() => {});
            })
        };
    }

    stopAnimations(id: string, clear?: boolean) {
        if (id && this._animations[id]) {
            if (this._animations[id] && this._animations[id].isPlaying) {
                this._animations[id].cancel();
            }
            if (clear) {
                delete this._animations[id];
            }
        }
    }
}

```

###### Step 2

Trigger animations in the popup component

```typescript
// popup-view.component.ts
    private _toggleDisplay(
        show: boolean,
        duration: number = 300,
        ignoreReset?: boolean
    ) {
        this._viewService.stopAnimations(this._animationId);

        let view = this.popupView.nativeElement;

        if (show) {
            if (!ignoreReset) {
                this._popupViewContainer.visibility = "visible";
                view.translateY = screen.mainScreen.heightDIPs - 100;
            }
            this._popupViewContainer.opacity = 1;
            const animation = this._viewService.startAnimation({
                definitions: [
                    {
                        target: view,
                        translate: { x: 0, y: 0 },
                        curve: AnimationCurve.cubicBezier(
                            0.17,
                            0.89,
                            0.24,
                            1.11
                        ),
                        duration
                    }
                ]
            });
            this._animationId = animation.id;
        } else {
            this._viewService
                .startAnimation({
                    definitions: [
                        {
                            target: view,
                            translate: {
                                x: 0,
                                y: screen.mainScreen.heightDIPs - 100
                            },
                            curve: AnimationCurve.cubicBezier(
                                0.17,
                                0.89,
                                0.24,
                                1.11
                            ),
                            duration
                        }
                    ]
                })
                .done.then(() => {
                    this._popupViewContainer.visibility = "collapse";
                    view.translateY = 0;
                    // clear out for good housekeeping cause we are done using this view
                    this._viewService.stopAnimations(this._animationId, true);
                    if (this._component) {
                        this.vcRef.remove();
                        this._component.destroy();
                    }
                });
        }
    }
```

<div class="solution-end"></div>

<div class="nsw"></div>

### Bonus Exercise 4.6: Add dragging synchronous animation to the popup

##### Requirements

Extend the `ViewService` to include handling of dragging. Add drag handling to the popup.

##### Tips

Use the `pan` gesture on the root `GridLayout` of the popup component.

#### Review

<div class="solution-start"></div>

###### Step 1

Add a `draggingView` flag to the `ViewService`

```typescript
// view.service.ts
@Injectable()
export class ViewService {
  draggingView = false;
}
```

###### Step 2

Implement `pan` gesture handling and use the `ViewService`'s `draggingView` flag.

```typescript
// popup-view.component.ts
export class PopupViewComponent extends BaseComponent {
  ...
    private _animationId: string;
    private _currentPanY = 0;
    private _prevDeltaY = 0;

  ...

    private _toggleDisplay(
        show: boolean,
        duration: number = 300,
        ignoreReset?: boolean
    ) {
        this._viewService.stopAnimations(this._animationId);

        let view = this.popupView.nativeElement;

        if (show) {
            if (!ignoreReset) {
                this._popupViewContainer.visibility = "visible";
                view.translateY = screen.mainScreen.heightDIPs - 100;
            }
            this._popupViewContainer.opacity = 1;
            const animation = this._viewService.startAnimation({
                definitions: [
                    {
                        target: view,
                        translate: { x: 0, y: 0 },
                        curve: AnimationCurve.cubicBezier(
                            0.17,
                            0.89,
                            0.24,
                            1.11
                        ),
                        duration
                    }
                ]
            });
            this._animationId = animation.id;
            animation.done.then(() => {
                this._viewService.draggingView = false;
            });
        } else {
            this._viewService
                .startAnimation({
                    definitions: [
                        {
                            target: view,
                            translate: {
                                x: 0,
                                y: screen.mainScreen.heightDIPs - 100
                            },
                            curve: AnimationCurve.cubicBezier(
                                0.17,
                                0.89,
                                0.24,
                                1.11
                            ),
                            duration
                        }
                    ]
                })
                .done.then(() => {
                    this._popupViewContainer.visibility = "collapse";
                    view.translateY = 0;
                    // clear out for good housekeeping cause we are done using this view
                    this._viewService.stopAnimations(this._animationId, true);
                    if (this._component) {
                        this.vcRef.remove();
                        this._component.destroy();
                    }
                });
        }
    }

    ...

    pan(args: PanGestureEventData) {
        // console.log("Pan deltaX:" + args.deltaX + "; deltaY:" + args.deltaY + ";");
        this._viewService.stopAnimations(this._animationId);

        let view = this.popupView.nativeElement;

        if (args.state === 1) {
            // down
            this._prevDeltaY = 0;
            this._viewService.draggingView = true;
        } else if (args.state === 2) {
            // panning
            const y = this._currentPanY + (args.deltaY - this._prevDeltaY);
            this._currentPanY = y;
            this._prevDeltaY = args.deltaY;
            if (args.deltaY > 0) {
                view.translateY = args.deltaY;
            } else {
                view.translateY = args.deltaY * 0.1;
            }
        } else if (args.state === 3) {
            // up
            this._prevDeltaY = 0;
            if (this._viewService.draggingView) {
                if (args.deltaY < 150) {
                    // animate back up
                    this._toggleDisplay(true, 200, true);
                } else {
                    this.close();
                }
            }
        }
    }

    close() {
        this._viewService.draggingView = false;
        this._viewService.togglePopup$.next({ open: false });
    }
}
```

<div class="solution-end"></div>
