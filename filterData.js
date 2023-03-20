/*
 *   Copyright (c) 2023 
 *   All rights reserved.
 */
// Define a class called DataObserver1
class DataObserver1 {

    // Define a constructor function that takes three arguments: dataSource, proto, and exclude
    constructor (dataSource, proto, exclude = []) {

        // Map over the dataSource array to create a new array of filtered objects
        this.data = dataSource.map((obj) =>

            // Call the filterObj method defined below on each object in dataSource
            // filterObj takes three arguments: the current object, an array of properties to exclude, and a prototype object
            this.filterObj(obj, exclude, Object.getPrototypeOf({}))
        );

        // Set the 'proto' and 'observers' properties on the new DataObserver1 instance
        this.proto = proto;
        this.observers = [];
    }

    // Define a helper method called filterObj that takes three arguments: obj, excludeProperties, and prototype
    filterObj(obj, excludeProperties, prototype) {

        // Define an empty object called 'filteredObj'
        const filteredObj = {};

        // Loop over each property in obj
        for (const key in obj) {

            // Get the value of the current property
            const value = obj[ key ];

            // Check if the current property should be excluded based on the excludeProperties array
            if (!excludeProperties.includes(key)) {

                // If the value of the current property is an object (and not null), recursively call filterObj on it
                if (typeof value === "object" && value !== null) {
                    const nestedFilteredObj = this.filterObj(
                        value,
                        excludeProperties.map((prop) =>
                            prop.startsWith(key + ".") ? prop.slice(key.length + 1) : prop
                        ),
                        prototype
                    );
                    Object.assign(filteredObj, { [ key ]: nestedFilteredObj });

                    // If the value of the current property is an array, loop over each item in the array
                } else if (Array.isArray(value)) {
                    const arr = [];
                    for (let i = 0; i < value.length; i++) {
                        const item = value[ i ];

                        // If the item is an object (and not a string), recursively call filterObj on it
                        if (typeof item !== "string") {
                            const filteredItem = this.filterObj(
                                item,
                                excludeProperties,
                                prototype
                            );
                            arr.push(filteredItem);

                            // If the item is a string, add it to the new array without modification
                        } else {
                            arr.push(item);
                        }
                    }
                    Object.assign(filteredObj, { [ key ]: arr });

                    // If the value of the current property is neither an object nor an array, add it to filteredObj as is
                } else {
                    filteredObj[ key ] = value;
                }
            }
        }

        // Create a new object with 'filteredObj' as its prototype and add a '__

        // Create a new object with 'filteredObj' as its prototype
        // with a reference to the initial Object
        const objWithProto = Object.create(prototype, {
            ...Object.getOwnPropertyDescriptors(filteredObj),
            __originalObj: { value: obj },
        });
        return objWithProto;
    }
}


// Usage
const data = [
    { name: 'John', address: { street: '123 Main St', city: 'Anywhere' }, hobbies: [ { name: 'Fishing', category: 'Outdoor' } ], age: 30 },
    { name: 'Jane', address: '456 Elm St', hobbies: [ { name: 'Reading', category: 'Indoor' } ], age: 25 },
    { name: 'Bob', address: '789 Oak St', hobbies: [ { name: 'Running', category: 'Outdoor' }, 'another Hobby' ], age: 40 },
];

const doNotNeed = [ 'address', 'hobbies.0' ];
const observer = new DataObserver1(
    dataSource = data,
    proto = {},
    exclude = doNotNeed);

console.log(observer.data[ 0 ].name === data[ 0 ].name);// true
data[ 0 ].name = 'TWEET'
console.log(observer.data[ 0 ].name)// as no getters yet => John
console.log(observer.data[ 0 ].name === data[ 0 ].name);// false

console.log(observer.data)


class DataObserver2 {
    constructor (dataSource, proto) {
        this.proto = proto;
        this.observers = [];
        this.data = dataSource.map(obj => this.createProxy(obj));
        console.log(this.data)
    }

    createProxy(obj) {
        const protoKeys = Object.keys(this.proto);
        const filteredObj = {};
        protoKeys.forEach(key => {
            if (key in obj) {
                Object.defineProperty(filteredObj, key, {
                    get() {
                        return obj[ key ];
                    },
                    set(value) {
                        obj[ key ] = value;
                    },
                    enumerable: true
                });
            } else {
                Object.defineProperty(filteredObj, key, {
                    get() {
                        return this.proto[ key ];
                    },
                    enumerable: true
                });
            }
        });
        return filteredObj;
    }

}

const testProto = {
    name: 'name',
    address: {},
    //age: 0,
    sealed: true,
    hobbies: []
};

const data2 = [
    { name: 'John', address: { street: '123 Main St', city: 'Anywhere' }, hobbies: [ { name: 'Fishing', category: 'Outdoor' } ], age: 30 },
    { name: 'Jane', address: '456 Elm St', hobbies: [ { name: 'Reading', category: 'Indoor' } ], age: 25 },
    { name: 'Bob', address: '789 Oak St', hobbies: [ { name: 'Running', category: 'Outdoor' }, 'another Hobby' ], age: 40 },
];

const observer2 = new DataObserver2(testData, testProto);

console.log(observer2.data[ 0 ]); // { name: 'John', address: { street: '123 Main St', city: 'Anywhere' }, hobbies: [ { name: 'Fishing', category: 'Outdoor' } ], age: 30 }
console.log(observer2.data[ 0 ].name); // 'John'

// Modify the original data
// data2[ 0 ].name = 'Jim';
// data2[ 0 ].address.city = 'Somewhere';
// 
// testData[0].name = 'Test Name'
// console.log(observer2.data[ 0 ].name); // 'Jim'
// console.log(observer2.data[ 0 ].address); // 'Somewhere'
// console.log(JSON.stringify(observer2.data[ 0 ].hobbies[ 0 ] = 'testing'))
// console.log(JSON.stringify(observer2.data[ 0 ].hobbies = 'testing'))
