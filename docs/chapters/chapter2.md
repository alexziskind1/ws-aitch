## Networking


<div class="nsw"></div>

#### Overview of topics covered

* Simple interceptor with just headers
* Custom timeouts
* Handling API error codes
* Adding catchError handler with http response codes 
* Offline handling







<div class="nsw"></div>

### Lesson 2.1: Simple interceptor with just headers


#### What you're doing

We're adding a simple Angular interceptor that implements Angular's HttpInterceptor interface. The required function is the `intercept` function.

```typescript
intercept(req: HttpRequest<any>, next: HttpHandler):
    Observable<HttpEvent<any>> {
    return next.handle(req);
  }
```






<div class="nsw"></div>

### Exercise 2.2: Inject HTTP headers


Add an Angular HttpInterceptor that injects headers into the request

##### Requirements

These headers must be present in every HTTP request:

* 'Accept-Language' : 'en-US'
* 'X-App-Type' : 'mobile'
* 'X-App-Environment' : 'testing'

##### Tips

Create a separate function to add headers.

> Hint: You can use the `HttpRequest`'s `clone` method with the `setHeaders` option to set the request's headers. 

#### Review

<div class="solution-start"></div>

###### Step 1

Create an Angular service called HttpInterceptorService that implements HttpInterceptor

```typescript
// http.interceptor.ts
@Injectable()
export class HttpInterceptorService implements HttpInterceptor {
    intercept(
        req: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {
        // prepare for request modifications
        const headers: any = {};
        this._prepHeaders(headers);

        return next.handle(req);
    }
}
```

###### Step 2

Add headers to the request that the interceptor processes

```typescript
// http.interceptor.ts
    private _prepHeaders(headers: any) {
        if (headers) {
            // EXAMPLE: setting headers for all requests
            headers['Accept-Language'] = `en-US`;
            headers['X-App-Type'] = 'mobile';
            headers['X-App-Environment'] = 'testing';
        }
    }
```

###### Step 3

Don't forget to provide the interceptor

```typescript
{ provide: HTTP_INTERCEPTORS, useClass: HttpInterceptorService, multi: true }
```


<div class="solution-end"></div>










<div class="nsw"></div>

### Lesson 2.3: Handle HTTP error codes

#### What you're doing

Examine the HTTP status code and route errors to different handlers based on the status code

```typescript
// http.interceptor.ts

        intercept(
            req: HttpRequest<any>,
            next: HttpHandler
        ): Observable<HttpEvent<any>> {
            const headers: any = {};
            this._prepHeaders(headers);

            return next.handle(req).pipe(
                timeout(10000),
                catchError((err: any) => {
                    for (const key in err) {
                        if (
                            !["headers", "name", "ok"].includes(key) &&
                            typeof err[key] !== "function"
                        ) {
                            console.log("http error - " + key, err[key]);
                        }
                    }
                    /**
                    * fail safe network error handling
                    */
                    let status = 0;

                    if (err instanceof HttpErrorResponse) {
                        status = err.status;
                    }
                    switch (status) {
                        case 401:
                            // authorization error handling
                            return this._handle401Error(req, next, err);
                        case 0:
                            // status 0 is most likely an api timing out from not responding or user could be offline
                            // Implement offline handling
                            break;
                    }
                    return throwError(err);
                })
            );
        }
```

```typescript
    private _handle401Error(
        req: HttpRequest<any>,
        next: HttpHandler,
        err: HttpErrorResponse
    ): Observable<HttpEvent<any>> {
        if (err) {
            switch (err.error) {
                case "access_denied":
                    // try to refresh token
                    if (!this._isRefreshingToken && !this._refreshTokenError) {
                        return this._refreshToken(req, next);
                    } else {
                        return this._token$.pipe(
                            filter(token => !!token),
                            take(1),
                            switchMap(token => {
                                if (token === "error") {
                                    // ensure streams of pending calls continue and don't become broken
                                    return EMPTY;
                                } else {
                                    const options: any = {};
                                    const headers: any = {};
                                    this._prepHeaders(headers);
                                    req = this._addToken(
                                        token,
                                        req,
                                        options,
                                        headers
                                    );
                                    return next.handle(req);
                                }
                            })
                        );
                    }
            }
        }
        // otherwise just throw error normally
        return throwError(err);
    }
```








<div class="nsw"></div>

### Lesson 2.4: Auth token example

In your exercise files, find the http interceptor and review the refreshToken flow.


#### What you're doing

Take a look at the commented code in the interceptor. We're going to tie this code in with the existing interceptor flow. 








<div class="nsw"></div>

### Exercise 2.5: Going offline

In this exercise you will build on the previous lessons in this chapter to handle an offline scenario.

##### Requirements

Display an offline page if the device is offline.

##### Tips

* Create a network service that will abstract away the offline display. 
* Navigate to offline route if device is offline, otherwise show intermitten connectivity problem message

#### Review

<div class="solution-start"></div>

###### Step 1

Create a `NetworkService` and initialize the `connectivity` module to start monitoring.
On Android, you'll have to add the `ACCESS_NETWORK_STATE` permission in the `AndroidManifest.xml` file to use connectivity:

```xml
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
```

```typescript
// app/core/services/network.service.ts
@Injectable()
export class NetworkService {
  maintenanceMode = false;
  isOffline = false;

  constructor(
    private router: RouterExtensions,
    private ngRouter: Router
  ) {
    this._initOfflineHandler();
  }

  private _initOfflineHandler() {
    startMonitoring(networkType => {
      let isOffline = false;
      switch (networkType) {
        case connectionType.none:
          // no connection
          isOffline = true;
          break;
        case connectionType.wifi:
        case connectionType.mobile:
        case connectionType.ethernet:
        case connectionType.bluetooth:
          // wifi connected
          // cellular data
          // ethernet/wired
          // bluetooth - perhaps tethering connection
          isOffline = false;
          break;
        default:
          isOffline = true;
          break;
      }
    });
  }
}
```


###### Step 2

Add the offline route navigation to the app and expose it as a public method from the `NetworkService`

```typescript
  showOfflinePage() {
    /**
     * Very important to still check for actual offline status here
     */
    console.log('showOfflinePage this.isOffline:', this.isOffline);
    if (this.isOffline) {
      if (!this.maintenanceMode) {
        this.maintenanceMode = true;
        this.router.navigate(['/offline'], {
          clearHistory: true,
          animated: false
        });
        if (!this.ngRouter.navigated) {
          this.ngRouter.initialNavigation();
        }
      }
    }
  }
```

<div class="solution-end"></div>







<div class="nsw"></div>

### Lesson 2.6: Custom timeouts for HTTP requests

We can use a custom timeout if wanting to extend the network connection expiry time limit for response with your own api

#### What you're doing

Pipe the request that the interceptor is processing to a `timeout` RxJS operator with a custom time.

```typescript
// http.interceptor.ts
    @Injectable()
    export class HttpInterceptorService implements HttpInterceptor {
        intercept(
            req: HttpRequest<any>,
            next: HttpHandler
        ): Observable<HttpEvent<any>> {
            const headers: any = {};
            this._prepHeaders(headers);

            return next.handle(req).pipe(

                timeout(10000) // <- set custom network timeout if no response within this time limit

            );
        }
    }
```
