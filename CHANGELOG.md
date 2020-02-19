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