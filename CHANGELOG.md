## 3.0.0
* **BREAKING CHANGE** dependency on angular was removed as well as In, Out decorators. That approach does not work anymore in the modern versions of angular since they actively utilize own version of typescript to prepare components is design time instead of adding metadata in runtime (which is controversial).
* support of observables and subjects
* **Actions**
  * **StateActionBase** - base class for an "Action"
  * **WithAction(TAction)** - decorator for action modifier
  * **WithActionAsync(TAction)** - async decorator for action modifier
  * **StateDiff** - new type for modifier results (includes actions)
* **@WithSharedAsSource(...)** - new decorator 
* **@WithSharedAsTarget(...)** - new decorator
* **...OnConcurrentLaunchThrowError()** - new option for async modifiers 
* **...PreSet(...)** - new option for async modifiers
* **...CallOnInit()** - new option for sync modifiers
* **...If(...).IfNotEqualNull()** - new options for sync modifiers
* **onError** - handler for (async) errors (can be set in options)

## 2.0.1
* **BUG FIX**: Properties bound to a shared state now takes initial value from a bounded property.
* **BUG FIX**: Call of **onStateApplied** is extracted out of a cascade of state modifications (if **onStateApplied** leads to new modifications).

## 2.0.0
* **StateTracking**: The state can be tracked directly in component without an external class.
* **Shared State Tracker**: State trackers can be shared between components.
* **BUG FIX (BREAKING CHANGE?)**: Transition Functions now can rollback modifications without changing other fields (see "Rollback Modification" unit test)".
* **BUG FIX**: @Emitter() works for Debounce().
* **BUG FIX**: NuN === NuN in state comparison.


## 1.2.0
* **BUG FIX**: @Emitter() works for input properties.

## 1.1.4 
* **@Emitter()**: new decorator for state fields. If this decorator is specified for some state filed that means that all side effects will happen (@With, @WithAsync, @Out) even if a new value equals to the previous one during analyzing a new state difference.

## 1.1.3
* **@WithAsync(keyof T).If(predicate: (t:T)=>boolean)**: new decorator extension that can prevent an async transition function calling
* **@WithAsync(keyof T).Finally(finalState: ()=>Partial&lt;T&gt;)**: new decorator extension that can apply some state difference after an async transition function calling regardless its result

## 1.1.1
* **BUG FIX**: Compatibility with Angular 9.0.7

## 1.1.0
* **Debounce(..ms..)**: a new modifier option that delays calling the modifier if dependencies keep changing.

## 1.0.2
* **BUG FIX**: Compatibility with IVY renderer


## 1.0.1
* **BUG FIX**: "Object doesn't support property or method 'includes'" in IE11

## 1.0.0
* Asynchronous state mutators: @WithAsync(...), @AsyncInit()
* **BREAKING CHANGE**: All components that use @WithState decorator have to change result type of "modifyStateDiff" and "modifyState" methods from __void__ to __boolean__

## 0.2.1
* **modifyState** - returns **true** if state change has been detected otherwise it returns **false**.
* **modifyStateDiff** - returns **true** if state change has been detected otherwise it returns **false**.
* **WithStateBase constructor** - the second and the third parameters are now optional.

## 0.2.0
* **@Calc** - new decorator which allows re-calculation of a single state property.  

## 0.1.2
* **BUG FIX**: "During a serie of recursive updates some modifiers could be omit if a corresponding filed was changed in the middle of the serie"

## 0.1.1
* **BUG FIX**: "Recursive update should not start if some key exists in a 'difference' object (returned by a modifier) but state property value has not changed"

## 0.1.0
* **modifyStateDiff** - a new API method that allows modification of several state members at once;
* **onAfterStateApplied** - can receive a previous state as an argument;
* **BREAKING CHANGE**: All components that use @WithState decorator have to implement the new method "modifyStateDiff"
## 0.0.2
* Update documentation
* **"module":"commonjs"** - now the library can be used with system.js
## 0.0.1
* Update documentation
## 0.0.0
* First Release