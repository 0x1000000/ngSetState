## The idea
There is an immutable object that represent all field values of some component.
Each time when some field value (or several field values) of the angular component is changed, then a new immutable object will be created. It will contain all the old unchanged values and the new values.

By comparing the two objects, it can be determine what exact fields have values changed and if there are logical dependencies of these fields then the corresponding values evaluation should be performed. After the evaluation is done 3-rd object will be created which will contain the original values and the newly evaluated ones.

Kartinka

Now we have the new object which also can be compared with the previous one and a new dependency evaluations might be required. This scenario can be repeated many times until we have a fully consistent object. After that angular will render its data. Profit!

## Get Started
### Installation
TODO
### Simple Greeting Form
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
This decorator (or this function) finds all the fields which other fields fields might depend on and  replaces them with properties with getter and setter, so that the library can keep track of changes.

Further, transition functions should be defined: 
```ts
  @With("userName")
  public static greet(state: ComponentState<SimpleGreetingFormComponent>)
    : ComponentStateDiff<SimpleGreetingFormComponent>
  {
      ...
  }
```
Each transition function receives a current state object and returns an object which contains only updated fields. Optionally, you can add a second argument with previous state and a third with a difference between the current and previous states:
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
**ComponentState<T>** and **ComponentStateDiff<T>** are typescript mapped types which filter outs methods and event emitters also **ComponentState<T>** marks all fields as **readonly** (state is immutable) and **ComponentStateDiff<T>** marks all fields as optional, since transition function can return any subset of the original state. For simplicity let's define the type aliases:
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

**onStateApplied** applied hook is called each time when component state becomes consistent:
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
If it needs to prevent the greeting generation on each name change it can be easily achieved by adding "Debounce" extension to the **@With** decorator:
```ts
@With("userName").Debounce(3000/*ms*/)
public static greet(state: State): NewState
{
    ...
}
```
Now the library waits 3 second after a last name change and then executes the transition:
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
Let's add some indication of that the library is waiting:

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
It seems working but an issue appears - if user stated typing and then decided to return the original name during the 3 seconds then from "greet" 