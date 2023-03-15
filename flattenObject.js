/*
 *   Copyright (c) 2023 
 *   All rights reserved.
 */
//#Source https://bit.ly/2neWfJ2 
const flattenObject = (obj, prefix = '') =>
    Object.keys(obj).reduce((acc, key) => {
        const parentKey = prefix.length ? prefix + '.' : '';
        if (typeof obj[ key ] === 'object') Object.assign(acc, flattenObject(obj[ key ], parentKey + key));
        else acc[ parentKey + key ] = obj[ key ];
        return acc;
    }, {});
console.log(flattenObject({ a: { b: { c: 1 } }, d: 2 }));
/**
 {
 "a.b.c": 1,
 "d": 2
 }
 */