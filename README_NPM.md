# ngSetState

## About

A library that helps developing angular components in a more functional style where UI logic is representing as a series of immutable state transitions.

* [Demo Site](https://0x1000000.github.io/ngSetState/)
* [Demo Code](https://github.com/0x1000000/ngSetState/tree/master/demo/src/app)
* [CHANGELOG](https://github.com/0x1000000/ngSetState/blob/master/CHANGELOG.md)

## Advantages of using the library

1. __Performance__ – the angular change detection will check only already evaluated properties 
2. __Independence__ – the library does not actually depend on angular, so if you decided to move to another framework (e.g. Vue) you will be able to reuse your state logic
3. __Quality of reusable components__ – Angular allows having several input parameters which can be changed independently and maintaining all possible combinations is usually not very simple (ngOnInit, ngOnChange, property setters), so often developers take into consideration just common scenarios, which is not great when you develop reusable components. The library naturally simplifies handling different combinations of input parameters, since it implicitly creates a dependency graph over all state properties.

## [_You can find all the documentation on github.com..._](https://github.com/0x1000000/ngSetState/blob/master/README.md)