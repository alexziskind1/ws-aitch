## View Binding Gotchas

<div class="nsw"></div>

#### Overview of topics covered

- Binding to methods
- Tighly scope ngOnChanges
- getViewById

<div class="nsw"></div>

### Lesson 5.1: Binding to methods

It is a good idea to avoid binding to methods because you're not in control of when the methods will be executed by the binding infrastructure. You might end up invoking a method many times to the detriment of your app's performance. The same goes for property getters. That said, there are still times when you need to bind to a dynamic evaluation instead of a static value property, so how do you go about this in a performant way?

There are two possible solutions to accomplishing this goal that fit different scenarios; using pre-computed values, and using components as reusable rows. First, we'll use pre-computed values.

#### What you're doing

This is what binding to a method looks like.

```xml
    <!-- items.component.html - bad -->
    <Label [nsRouterLink]="['/item', item.id]" [text]="computedId(item)" class="list-group-item"></Label>
```

Here is an example of a computationally expensive operation being triggered for every row in the `ListView`

```typescript
    // items.component.ts - bad
    computedId(item: Item) {
        console.time("computedId");
        let result = 0;
        for (var i = Math.pow(item.id, 5); i >= 0; i--) {
            result += Math.atan(i) * Math.tan(i);
        }
        console.timeEnd("computedId");
        return result;
    }
```

This is how you would bind to a pre-computed value instead of using method bindings

```xml
    <!-- items.component.html -->
    <Label [nsRouterLink]="['/item', item.id]" [text]="item.preComputedId" class="list-group-item"></Label>
```

```typescript
    // items.component.ts
    ngOnInit(): void {
        this.items = this.itemService.getItems();

        this.items = this.itemService.getItems().map(i => {
           return {
             ...i,
             preComputedId: this.computedId(i)
           }
         });

    }
```

<div class="nsw"></div>

### Independent Exercise 5.2: Offload the pre-compute to a Worker

Workers can be used to handle long calculations and the results returned to the main thread, while the UI thread isn't blocked. We can use this to pre-compute the display values.

##### Requirements

Precompute bindings and other data for view bindings via Worker to not block UI thread

<div class="nsw"></div>

### Lesson 5.3: Using a component as a reusable row

The other more performant alternative to binding to methods is using a component as a reusable row. BUT, this has it's own set of hurdles to overcome, and you must be careful.

#### What you're doing

Create a custom component called `ItemLabelComponent` using the `ns-item-label` selector, and use the component in each row of the `ListView` instead of the `Label` directly.

```xml
    <!-- items.component.html -->
    <ns-item-label [item]="item"></ns-item-label>
```

Here is the row component itself.

```xml
    <!-- item-label.component.html -->
    <Label [nsRouterLink]="['/item', item.id]" [text]="item.preComputedId" class="list-group-item" [class.c-bg-blue]="showBlue"></Label>
```

Notice how we're using `ngOnChanges` here. This is an example of bad practice, while having good intentions.

```typescript
// item-label.component.ts
@Component()
export class ItemLabelComponent {
  @Input() item: Item;
  showBlue = false;

  constructor(private itemService: ItemService) {
    this.itemService.itemLabelCmpCnt++;
  }

  ngOnChanges() {
    if (this.item.role === "Defender") {
      this.showBlue = true;
    }
  }
}
```

<div class="nsw"></div>

### Lesson 5.4: Tightly scope ngOnChanges

In the previous lesson, we created a component to abstract away the logic of displaing text so we can avoid binding to a method. BUT, while we had good intentions, we introduced another problem. We're using local component state wrapped inside conditionals within `ngOnChanges`, which is bad practice.

#### What you're doing

To see this in action, add a `console.log` statement to the `ngOnChanges` hook in the `ItemLabelComponent`.

```typescript
// item-label.component.ts
ngOnChanges() {
    if (this.item.role === "Defender") {
        this.showBlue = true;
    }
    console.log("ItemLabelComponent ngOnChanges:", this.item.id);
}
```

Instead of having local component state wrapped inside conditionals within `ngOnChanges`, do this

```typescript
// item-label.component.ts
ngOnChanges() {
    this.showBlue = this.item.role === "Defender";
    console.log("ItemLabelComponent ngOnChanges:", this.item.id);
}
```

We can go a step further in what is called tight scoping `ngOnChanges`. This will result in very few calls to update the `showBlue` property.

```typescript
// item-label.component.ts
ngOnChanges(changes: SimpleChanges) {
    const currentItem = <Item>changes.item.currentValue;
    const previousItem = <Item>changes.item.previousValue;
    if ((!previousItem && currentItem) || (currentItem && previousItem && currentItem.role !== previousItem.role)) {
        console.log("ItemLabelComponent ngOnChanges:", this.item.id);
        this.showBlue = this.item.role === "Defender";
    }
}
```

> NOTE: `ngOnChanges` will still be called just as many times, but the inner component property won't be updated unless there actually is a change to the input's property.

<div class="nsw"></div>

### Lesson 5.5: Misusing getViewById

In NativeScript it is very common to get to a view using the `Page`'s `getViewById` method. This presents a challenge when used on combination with Angular's `ngIf` structural directive. `ngIf` is great because it prevents a view from being rendered alltogether potentially saving on rendering entire trees of views. Bonus performance tip, by the way; use `ngIf`!

#### What you're doing

We're going to animate a view in code using the NativeScript animation API by getting a reference to it using `Page`'s `getViewById` method.

```xml
<!-- items.component.html -->
    <GridLayout row="0" class="p-20" height="50">
        <StackLayout id="ball" borderRadius="25" class="c-bg-blue" width="50" height="50" horizontalAlignment="left"></StackLayout>
    </GridLayout>
```

```typescript
//items.component.ts
@Component()
export class ItemsComponent implements OnInit {
  ball: StackLayout;
  showBall = false;

  ngOnInit(): void {
    this.ball = this.page.getViewById("ball");
    setTimeout(() => {
      this.animateBall();
    }, 2000);
  }

  animateBall() {
    this.ball
      .animate({
        translate: { x: 300, y: 0 },
        duration: 1000,
        curve: AnimationCurve.easeIn,
      })
      .then(
        () => {},
        () => {}
      );
  }
}
```

This pattern is dangeroud because `ngIf` bindings can adversely affect access to the view.
So if we add the `*ngIf` directive to the `GridLayout` that wraps the element we get with `getViewById`, and set the bound property to false, we'll have a problem.

```xml
<!-- items.component.html -->
    <GridLayout row="0" class="p-20" height="50" *ngIf="showBall">
        <StackLayout id="ball" borderRadius="25" class="c-bg-blue" width="50" height="50" horizontalAlignment="left"></StackLayout>
    </GridLayout>
```

```typescript
//items.component.ts
showBall = false;
```

#### The fix

If combining NativeScript's access of a view with Angular, use the view's `loaded` event to get a reference to the view instead of `getViewById`.

```xml
<!-- items.component.html -->
    <GridLayout row="0" class="p-20" height="50" *ngIf="showBall">
        <StackLayout (loaded)="loadedBall($event)" borderRadius="25" class="c-bg-blue" width="50" height="50" horizontalAlignment="left"></StackLayout>
    </GridLayout>
```

```typescript
//items.component.ts
@Component()
export class ItemsComponent implements OnInit {
  ball: StackLayout;
  showBall = false;

  ngOnInit(): void {
    setTimeout(() => {
      this.animateBall();
    }, 2000);
  }

  loadedBall(args: EventData) {
    this.ball = <StackLayout>args.object;
    this.animateBall();
  }

  animateBall() {
    this.ball
      .animate({
        translate: { x: 300, y: 0 },
        duration: 1000,
        curve: AnimationCurve.easeIn,
      })
      .then(
        () => {},
        () => {}
      );
  }
}
```

> NOTE: `loaded` WILL retrigger on app suspend/resume

<div class="nsw"></div>

### Independent Exercise 5.6: Handle re-trigger of loaded event

##### Requirements

The `loaded` event of a view will be retriggered whenever your app suspends and resumes. So if you want to prevent the animation to be triggered multiple times, you have to handle it. Ensure that the animation isn't triggered mutiple times.
