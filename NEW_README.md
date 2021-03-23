## The idea
There is an immutable object that represent all field values of some component.
Each time when some field value (or several field values) of the angular component is changed, then a new immutable object will be created. It will contain all the old unchanged values and the new values.

By comparing the two objects, it can be determine what exact fields have values changed and if there are logical dependencies of these fields then the corresponding values evaluation should be performed. After the evaluation is done 3-rd object will be created which will contain the original values and the newly evaluated ones.

Kartinka

Now we have the new object which also can be compared with the previous one and a new dependency evaluations might be required. This scenario can be repeated many times until we have a fully consistent object. After that angular will render its data. Profit!

## Get Started
### Installation
```sh
npm install ng-set-state
```
## Simple Greeting Form
Let's create a simple greeting form:

**simple-greeting-form.component.ts**
```ts
@Component({
  selector: 'app-simple-greeting-form',
  templateUrl: './simple-greeting-form.component.html'
})
export class SimpleGreetingFormComponent {
  userName: string;

  greeting:  string;
}
```
**simple-greeting-form.component.html**
```html
<div class="form-root">  
  <h1>Greeting Form</h1>
  <label for="ni">Name</label><br />
  <input [(ngModel)]="userName" id="ni" />
  <h1>{{greeting}}</h1>
</div>
```
Obviously, "greeting" depends on "userName" and there are several ways to express the dependency: 
 1. Converting "greeting" to a property with setter, but in this case its value will be calculated on each change detection.
 2. Creating an event handler on "(ngModelChange)" but it will make the markup more complex; 
 
 In any case, if something depends on "greeting" none of these ways helps, so a different approach is proposing:
```ts
@Component(...)
@StateTracking()
export class SimpleGreetingFormComponent {
  userName: string;

  greeting:  string;

  @With("userName")
  public static greet(state: ComponentState<SimpleGreetingFormComponent>)
    : ComponentStateDiff<SimpleGreetingFormComponent>
  {
    const userName = state.userName === "" 
      ? "'Anonymous'" 
      : state.userName;

    return {
      greeting: `Hello, ${userName}!`
    }
  }
}
```
First, the component should be decorated with @StateTracking decorator, or alternatively **initializeStateTracking** should be called in the constructor (custom component decorators do not properly works in some Angular versions):
```ts
@Component(...)
export class SimpleGreetingFormComponent {
  constructor(){
    initializeStateTracking(this);
  }

```
**@StateTracking** decorator (or **initializeStateTracking** functions) finds all the component fields which other fields might depend on and replaces them with properties with getter and setter, so that the library can keep track of changes.

Further, some transition functions should be defined. For example:
```ts
  @With("userName")
  public static greet(state: ComponentState<SimpleGreetingFormComponent>)
    : ComponentStateDiff<SimpleGreetingFormComponent>
  {
      ...
  }
```
Each transition function receives an object that represent a current component state and should returns an object which contains only updated fields. That object will be merged into a copy of the current state object and then the new updated copy will become a new component state. 

Optionally, you can add a second argument with which will receive a previous state object. 

*The transition function has been triggered since the library detected that some values of the fields declared in the decorator are different in the current state object in comparison with the previous one.*

Also, if you define a third parameter which receive  a difference object between the current and previous states:
```ts
@With("userName")
public static greet(
  state: ComponentState<SimpleGreetingFormComponent>,
  previous: ComponentState<SimpleGreetingFormComponent>,
  diff: ComponentStateDiff<SimpleGreetingFormComponent>
)
: ComponentStateDiff<SimpleGreetingFormComponent>
{
  ...
}
```
**ComponentState<T>** and **ComponentStateDiff<T>** are typescript mapped types which filter out methods and event emitters also **ComponentState<T>** marks all fields as **readonly** (state is immutable) and **ComponentStateDiff<T>** marks all fields as optional, since transition function can return any subset of the original state. 

For simplicity let's define the type aliases:
```ts
type State = ComponentState<SimpleGreetingFormComponent>;
type NewState = ComponentStateDiff<SimpleGreetingFormComponent>;
...
@With("userName")
public static greet(state: State): NewState
{
    ...
}
```
Decorator **@With** receives a list of field names whose value changes will trigger the decorated static (!) method. Typescript will check that the class has the declared fields and that the method is static (transitions should "pure")
### Tracking log
Now the form displays a corresponding greeting when user types a name. Let's see how the component state changes:
```ts
@Component(...)
@StateTracking<SimpleGreetingFormComponent>({
  onStateApplied: (c,s,p)=> c.onStateApplied(s,p)
})
export class SimpleGreetingFormComponent {
  userName: string;

  greeting:  string;

  private onStateApplied(current: State, previous: State){
    console.log("Transition:")
    console.log(`${JSON.stringify(previous)} =>`)
    console.log(`${JSON.stringify(current)}`)
  }

  @With("userName")
  public static greet(state: State): NewState
  {
      ...
  }  
}
```

**onStateApplied** hook function is called each time when the component state becomes consistent all transition functions have been called and no more changes detected:
```
Transition:
{} =>
{"userName":"B","greeting":"Hello, B!"}

Transition:
{"userName":"B","greeting":"Hello, B!"} =>
{"userName":"Bo","greeting":"Hello, Bo!"}

Transition:
{"userName":"Bo","greeting":"Hello, Bo!"} =>
{"userName":"Bob","greeting":"Hello, Bob!"}
```
As we see the component goes to a new state each time user types a next character and the greeting field is updated immediately. If it needs to prevent the greeting updating on each name change it can be easily achieved by adding **Debounce** extension to the **@With** decorator:
```ts
@With("userName").Debounce(3000/*ms*/)
public static greet(state: State): NewState
{
    ...
}
```
Now the library waits 3 second after a last name change and only then executes the transition:
```
Transition:
{} =>
{"userName":"B"}

Transition:
{"userName":"B"} =>
{"userName":"Bo"}

Transition:
{"userName":"Bo"} =>
{"userName":"Bob"}

Transition:
{"userName":"Bob"} =>
{"userName":"Bob","greeting":"Hello, Bob!"}
```
Let's add an indication that the library is waiting:

```ts
...
export class SimpleGreetingFormComponent {
  userName: string;

  greeting:  string;

  isThinking:  boolean = false;

    ...

  @With("userName")
  public static onNameChanged(state: State): NewState{
    return{
      isThinking: true
    }
  }

 
  @With("userName").Debounce(3000/*ms*/)
  public static greet(state: State): NewState
  {
    const userName = state.userName === "" 
      ? "'Anonymous'" 
      : state.userName;

    return {
      greeting: `Hello, ${userName}!`,
      isThinking: false
    }
  }
}
```
```html
...
<h1 *ngIf="!isThinking">{{greeting}}</h1>
<h1 *ngIf="isThinking">Thinking...</h1>
...
```
It seems working but an issue appears - if a user started typing and then decided to return the original name during the given 3 seconds, then from "greet" transition perspective nothing has changed and the function will never called and the form will keep "thinking" forever unit you type a different name. It can be solved by adding **@Emitter()** decorator for **userName** field:
```ts
  @Emitter()
  userName: string;
```
which says to the library, that any assignment of a value to this field will be considered a change, regardless of whether the new value is the same as the previous one.

However, there is another solution - when the form stops thinking, it can set **userName** to **null** and the user will have to start typing a new name:
```ts
...
@With("userName")
public static onNameChanged(state: State): NewState{
  if(state.userName == null){
    return null;
  }

  return{
    isThinking: true
  }
}


@With("userName").Debounce(3000/*ms*/)
public static greet(state: State): NewState
{
  if(state.userName == null){
    return null;
  }
  
  const userName = state.userName === "" 
    ? "'Anonymous'" 
    : state.userName;

  return {
    greeting: `Hello, ${userName}!`,
    isThinking: false,
    userName: null
  }
}
...
```
Now let's think about a situation when a user is impatient and wants to get the result immediately. Well, let's let him press **Enter** (```(keydown.enter)="onEnter()"```) to get the immediate result:
```ts
...
userName: string | null;

immediateUserName: string | null;

onEnter(){
  this.immediateUserName = this.userName;
}
...
@With("userName")
public static onNameChanged(state: State): NewState{
  ...
}


@With("userName").Debounce(3000/*ms*/)
public static greet(state: State): NewState {
  ...
}

@With("immediateUserName")
public static onImmediateUserName(state: State): NewState{
  if(state.immediateUserName == null){
    return null;
  }

  const userName = state.immediateUserName === "" 
    ? "'Anonymous'" 
    : state.immediateUserName;

  return {
    greeting: `Hello, ${userName}!!!`,
    isThinking: false,
    userName: null,
    immediateUserName: null
  }
}
...
```
Now it would be nice to know how much time to wait if user does not press **Enter** - some kind of countdown counter would be very useful:
```html
<h1 *ngIf="isThinking">Thinking ({{conuntdown}} sec)...</h1>
```
```ts
...
conuntdown: number = 0;
...
@With("userName")
public static onNameChanged(state: State): NewState{
  if(state.userName == null){
    return null;
  }

  return{
    isThinking: true,
    conuntdown: 3
  }
}
...
@With("conuntdown").Debounce(1000/*ms*/)
public static countdownTick(state: State): NewState{
  if(state.conuntdown <= 0) {
    return null
  }

  return {conuntdown: state.conuntdown-1};
}
```
and it is how it looks like:

Screenshot

### Change Detection
Obviously, the countdown woks asynchronously and it does not cause issues with the Angular change detection as long as the component detection strategy is “Default”. However, if the strategy is “OnPush”, then nothing can tell the component that its state is changing while the countdown is in progress.

Fortunately, we've already defined a callback function which is called each time when the component state has just changed, so the thing which is required is adding an explicit change detection there:

```ts
constructor(readonly changeDetector: ChangeDetectorRef){
}
...
private onStateApplied(current: State, previous: State){
  this.changeDetector.detectChanges();
  ...
```
Now it works as expected even with "OnPush" detection strategy.
## Shared State


