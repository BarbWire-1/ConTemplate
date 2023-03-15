/*
 *   Copyright (c) 2023 
 *   All rights reserved.
 */

// https://www.techighness.com/post/javascript-find-key-path-in-deeply-nested-object-or-array/
const findPath = (ob, key) => {
    const path = [];
    const keyExists = (obj) => {
        if (!obj || (typeof obj !== "object" && !Array.isArray(obj))) {
            return false;
        }
        else if (obj.hasOwnProperty(key)) {
            return true;
        }
        else if (Array.isArray(obj)) {
            let parentKey = path.length ? path.pop() : "";

            for (let i = 0; i < obj.length; i++) {
                path.push(`${parentKey}[${i}]`);
                const result = keyExists(obj[ i ], key);
                if (result) {
                    return result;
                }
                path.pop();
            }
        }
        else {
            for (const k in obj) {
                path.push(k);
                const result = keyExists(obj[ k ], key);
                if (result) {
                    return result;
                }
                path.pop();
            }
        }
        return false;
    };

    keyExists(ob);

    return path.join(".");
}
const deeplyNestedObj = {
    a: {
        b: {
            c: {
                d: {
                    e: "e",
                    f: "f",
                    g: {
                        G: undefined,
                        h: {
                            i: {},
                            j: {
                                k: {
                                    K: null,
                                    l: {
                                        abc: 123,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    e1: {},
    f2: {},
    P1: {
        q1: {
            r1: "r1"
        }
    }
}

console.log(findPath(deeplyNestedObj, "K")); // => a.b.c.d.g.h.j.k
console.log(findPath(deeplyNestedObj, "r1")); // => P1.q1
console.log(findPath(deeplyNestedObj, "gibberish")); // => ""
console.log(findPath(deeplyNestedObj, "helloWorld")); // => ""

console.log(!!findPath(nestedObj, key))