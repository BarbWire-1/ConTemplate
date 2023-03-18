/*
 *   Copyright (c) 2023 
 *   All rights reserved.
 */
class DataObserver1 {
    constructor (dataSource, proto, excludeProperties = []) {
        this.data = dataSource.map(obj => this.filterObj(obj, excludeProperties));
        this.proto = proto;
        this.observers = [];
    }

    filterObj(obj, excludeProperties) {
        const filteredObj = {};
        for (const key in obj) {

            const value = obj[ key ];

            if (Array.isArray(value)) {
                //console.log(value)
                filteredObj[ key ] = value.map((item) =>
                    this.filterObj(item, excludeProperties)
                );
            }
            if (!excludeProperties.includes(key)) {
                //const value = obj[ key ];
                // console.log([ key ])
                // console.log(Array.isArray(value))// always false

                //} else if (typeof value === "object" && value !== null) {
                if (typeof value === "object" && value !== null) {
                    const nestedFilteredObj = this.filterObj(
                        value,
                        excludeProperties.map((prop) =>
                            prop.startsWith(key + ".") ? prop.slice(key.length + 1) : prop
                        )
                    );
                    Object.assign(filteredObj, { [ key ]: nestedFilteredObj });
                } else {
                    filteredObj[ key ] = value;
                }
            }

        }
        return filteredObj;
    }




}

// Example usage
const dataSource = [
    { name: 'John', address: { street: '123 Main St', city: 'Anywhere' }, hobbies: [ { name: 'Fishing', category: 'Outdoor' } ], age: 30 },
    { name: 'Jane', address: '456 Elm St', hobbies: [ { name: 'Reading', category: 'Indoor' } ], age: 25 },
    { name: 'Bob', address: '789 Oak St', hobbies: [ { name: 'Running', category: 'Outdoor' }, 'another Hobby' ], age: 40 },
];
// exclude works for nested objects, but not for arrays
const exclude = [ 'address.street', 'hobbies.0' ];
const observer = new DataObserver1(dataSource, {}, exclude);
//console.log(observer.data);

dataSource[ 0 ].name = 'Happy'

//console.log(observer.data);