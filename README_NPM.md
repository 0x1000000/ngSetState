# ngSetState

## About

A library that helps developing UI (e.g. Angular or React) components in a more functional style where UI logic is representing as a series of immutable state transitions.

* [Tutorial](https://itnext.io/angular-components-state-tracking-with-ng-set-state-e2b988540407?source=friends_link&sk=9a3596275dc73f72882fe2ec519b4528)
* [React Demo (stackblitz.com)](https://stackblitz.com/edit/react-ts-yz6kuo?file=AppStateTrack.ts)
* [Angular Demo (stackblitz.com)](https://stackblitz.com/edit/set-state-greet)
* **Demo Application** - you can find a realistic usage of the library in this ASP.Net demo application - [SqGoods](https://github.com/0x1000000/SqGoods)
* [CHANGELOG](https://github.com/0x1000000/ngSetState/blob/master/CHANGELOG.md)

## Advantages of using the library

1. __Performance__ – the angular change detection will check only already evaluated properties 
2. __Independence__ – the library does not actually depend on angular, so if you decided to move to another framework (e.g. Vue) you will be able to reuse your state logic
3. __Quality of reusable components__ – Angular allows having several input parameters which can be changed independently and maintaining all possible combinations is usually not very simple (ngOnInit, ngOnChange, property setters), so often developers take into consideration just common scenarios, which is not great when you develop reusable components. The library naturally simplifies handling different combinations of input parameters, since it implicitly creates a dependency graph over all state properties.

## [_You can find all the documentation on github.com..._](https://github.com/0x1000000/ngSetState/blob/master/README.md)