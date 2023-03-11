/*
 *   Copyright (c) 2023 
 *   All rights reserved.
 */
class ObservableArray extends Array {
    constructor (...args) {
        super(...args);
        this.observers = new Set();
    }

    push(...args) {
        const result = super.push(...args);
        this.notify({ method: "push", args });
        return result;
    }

    pop() {
        const result = super.pop();
        this.notify({ method: "pop", args: [ result ] });
        return result;
    }

    shift() {
        const result = super.shift();
        this.notify({ method: "shift", args: [ result ] });
        return result;
    }

    unshift(...args) {
        const result = super.unshift(...args);
        this.notify({ method: "unshift", args });
        return result;
    }

    splice(...args) {
        const result = super.splice(...args);
        this.notify({ method: "splice", args });
        return result;
    }

    notify(update) {
        this.observers.forEach((observer) => observer(update));
    }

    observe(observer) {
        this.observers.add(observer);
    }

    unobserve(observer) {
        this.observers.delete(observer);
    }
}
