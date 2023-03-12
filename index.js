/*
 *   Copyright (c) 2023 BarbWire-1 aka Barbara Kälin
 *   All rights reserved.
     with MIT license
 */
// TODO currently update ALL cards on shift/unshift/splice/slice to prevent the indices mess
// TODO nestedObj.item not re-rendered;
// while setting nestedOb = {key: value } works and overwrites

// TODO crashed unshift again 😭


class ObserveEncapsulatedData {
    constructor (dataSource) {
        this.data = dataSource;
        this.observers = [];
        this.makeReactive()
    }

    // init with defining properties on all items of dataSource
    makeReactive() {
        // create prototype object with all getters/setters
        const prototype = Object.create(null);
        this.defineProp(this.data[ 0 ], prototype, 0);

        // create a copy of the prototype for item 0
        const item0 = Object.create(prototype);
        Object.assign(item0, this.data[ 0 ]);

        // set prototype for item 0
        Object.setPrototypeOf(this.data[ 0 ], prototype);

        // set prototype for all other items in the data source
        this.data.slice(1).forEach((item, index) => {
            Object.setPrototypeOf(item, prototype);
            this.defineProp(item, prototype, index + 1, '');
        });
    }

    defineProp(obj, prototype, index, parentKey = null) {
        let self = this;
        Object.keys(obj).forEach(key => {
            let value = obj[ key ];
            console.log(key)

            const dataKey = parentKey ? `${parentKey}.${key}` : key;
            console.log(dataKey)
            // Recursively define properties for nested objects or arrays
            if (typeof value === "object" && value !== null) {
                self.defineProp(value, prototype, index, dataKey);
                console.log(key)
                console.log(value)
                // Check if the nested object is already defined
                if (!Object.getOwnPropertyDescriptor(obj, key)) {
                    // Define the nested object with an empty object
                    obj[ key ] = {};
                }

                // Define properties for the nested object, passing the parentObj reference
                self.defineProp(obj[ key ], prototype, index, key);
            } else {
                // Define getter and setter for the property
                Object.defineProperty(obj, key, {
                    enumerable: true,
                    get() {
                        console.log(`Getting ${JSON.stringify(value)} for ${key} in object`, JSON.stringify([ key ]));
                        return value;
                    },
                    set(newValue) {
                        console.log(`Setting ${newValue} for ${key} in object`, obj);
                        value = newValue;
                        self.notify(obj, parentKey, value, "update", index);
                        self.notify(obj, dataKey, value, "update", index);
                        // Update the parent object
                        // if (parentKey) {
                        //     obj[ parentKey ][ key ] = value;
                        // }
                    },
                });
            }
        });
    }














    //TODO this is UGLY LIKE HELL... change when logic once should run
    // TODO currently slice, splice wrong
    observeDataSource() {
        const self = this;
        const methods = [ "push", "pop", "shift", "unshift", "splice", "slice" ];
        //console.log(self.array.length)
        methods.forEach((method) => {
            const originalMethod = Array.prototype[ method ];
            Object.defineProperty(this.data, method, {
                value: function (...newObj) {
                    let result = originalMethod.apply(this, newObj);
                    let newLength = self.data.length

                    // redefine props at the correct item's index
                    const updateIndices = () => {
                        for (let i = 0; i < newLength; i++) {

                            for (const key in this[ i ]) {
                                self.defineProp(this[ i ], key, i);
                            }
                            self.notify(this[ i ], null, null, "update", i);
                        }
                    }

                    switch (method) {
                        case "push": {
                            // add a card for the pushed obj at the end
                            newObj.forEach((obj) => {
                                for (const key in obj) {
                                    self.defineProp(obj, key, newLength - 1);
                                }
                                self.notify(obj, null, null, "add", newLength - 1);


                            });
                            break;
                        }
                        case "unshift": {
                            const numNewItems = newObj.length;
                            // add a new card for all obj in shift args
                            newObj.forEach((obj, index) => {
                                for (const key in obj) {
                                    self.defineProp(obj, key, index);
                                }

                                self.notify(obj, null, null, "add", index);
                            });
                            // update all to sync indices
                            updateIndices();
                            break;
                        }

                        case "pop": {
                            // remove the last card
                            self.notify(null, null, null, "delete", newLength);
                            // console.log(self.data.length)
                            break;
                        }
                        case "shift": {
                            // remove the first card
                            self.notify(null, null, null, "delete", 0);
                            // update all to sync indindices
                            updateIndices();
                            break;
                        }

                        case "splice": {
                            const index = newObj[ 0 ];
                            const deleteCount = newObj[ 1 ];
                            const itemsToAdd = newObj.slice(2);

                            if (itemsToAdd.length > 0) {
                                itemsToAdd.forEach((obj, i) => {
                                    for (const key in obj) {
                                        self.defineProp(obj, key);
                                    }
                                    self.notify(obj, null, null, "add", index + i);
                                });
                            }

                            if (deleteCount > 0) {
                                const deletedItems = this.slice(index, index + deleteCount);
                                deletedItems.forEach((_, i) => {
                                    self.notify(null, null, null, "delete", index + i);
                                });
                            }
                            updateIndices();

                            break;
                        }

                        case "slice": {
                            const start = newObj[ 0 ];
                            const end = newObj[ 1 ];

                            for (let i = start; i < end; i++) {
                                self.notify(null, null, null, "delete", i - start);
                            }
                            updateIndices();
                            break;
                        }

                        default:
                            break;
                    }
                    return result;
                },
                writable: true,
                enumerable: false,
                configurable: true,
            });


        });


    }

    addObserver(observer) {
        this.observers.push(observer);
    }

    removeObserver(observer) {
        const index = this.observers.indexOf(observer);
        if (index !== -1) {
            this.observers.splice(index, 1);
        }
    }

    notify(item, key, value, operation, index) {
        this.observers.forEach((observer) =>
            observer.update(item, key, value, operation, index)
        );
    }
}


class DataHandler {
    constructor (dataSource) {
        this.data = new ObserveEncapsulatedData(dataSource);
        this.observers = [];
        this.data.observeDataSource();

    }

    addObserver(observer) {
        this.observers.push(observer);
    }

    removeObserver(observer) {
        const index = this.observers.indexOf(observer);
        if (index !== -1) {
            this.observers.splice(index, 1);
        }
    }
}


class Contemplate {
    constructor (dataHandler, template, containerID, className, modifiers = [], show = false) {
        this.data = dataHandler.data;
        this.container = document.getElementById(containerID);
        this.containerID = containerID;
        this.className = className
        this.template = template;
        this.modifiers = modifiers;
        this.show = show;
        this.data.addObserver(this);
        this.init();
    }

    init() {

        // do the rest of the initialization
        this.container.innerHTML = "";
        this.data.data.forEach((instance) => {

            const card = this.createCard(instance);
            this.container.appendChild(card);
        });
    }


    createCard = (item) => {
        const card = document.createElement("div");
        card.className = this.className;
        const template = this.template(item);
        card.innerHTML = template;

        // recursively call write2Card for nested objects
        const write2CardRecursive = (item, prefix, parent) => {
            for (const key in item) {
                const value = item[ key ];
                this.write2Card(item, key, value, card)
                const fullKey = prefix ? `${prefix}.${key}` : key;
                if (typeof value === "object") {
                    console.log(value)
                    write2CardRecursive(value, fullKey, card);
                } else {
                    this.write2Card(item, fullKey, value, card);
                }
             }
        };
        write2CardRecursive(item, '', card);
        

        return card;
    };


    write2Card(item, key, value, card) {
        const tags2Update = card.querySelectorAll(`[data-key="${key}"]`);

        tags2Update.forEach((tag) => {
            const modifiers = tag.dataset.modifier?.split(" ") ?? [];

            if (modifiers.length) {
                modifiers.forEach((modifier) => {
                    const modifierFn = this.modifiers[ modifier ];
                    if (modifierFn) {
                        value = modifierFn(value);
                    }
                });
            }
            console.log(value)
            if (typeof value === "object" && value !== null) {
                // recursively call write2Card for objects
                for (const objKey in value) {
                    const objValue = value[ objKey ];
                    const objDataKey = `${key}.${objKey}`;
                    this.write2Card(item, objDataKey, objValue, card);
                }
            } else {
                tag.textContent = value;
            }
        });
    }



    //TODO check the notify for needed params after changes made here
    update(item, key, value, operation, index) {
        console.log(key)
        console.log(index)
        console.log(value)

        //console.log({property,value,operation, index})
        // console.log(typeof property)
        // console.log(index)
        console.count()


        if (operation === "add") {
            const card = this.createCard(item);
            const nextSibling = this.container.children[ index ];
            this.container.insertBefore(card, nextSibling);

        } else if (operation === "delete") {
            this.container.children[ index ].remove();

        } else if (operation === "update") {
            console.log(index)
            const card = this.container.children[ index ];
            this.write2Card(item, key, value, card)

        }
    }

}


// INSTANTIATE
const modifiers = {
    // v is the raw value
    uppercase: (v) => v.toUpperCase(),
    lowercase: (v) => v.toLowerCase(),
    reverse: (v) => v.split("").reverse().join(""),
    localeTime: () => new Date().toLocaleTimeString(),
    // prevent splitting strings into chars
    join: (v) => typeof v !== 'string' ? Object.values(v).join(', ') : v,

};


const templateTest = () => {

    return `
    <h2 style="text-align: center">
      <span data-key="name" data-modifier="uppercase"></span>
      <span data-key="name" data-modifier="lowercase reverse"></span>
    </h2>
    <p>
      Address:
      <span data-key="address" data-modifier="join"></span><br>
      
      <!-- on nested NOT applied in update method-->
      <span data-key="address.street" data-modifier="uppercase"></span>,
      <span data-key="address.city"></span>,
      <span data-key="address.state"></span>
    </p>
    <p>
      Hobbies:
      <span data-key="hobbies"data-modifier="join"></span><br>
     
      <span data-key="hobbies.0" data-modifier="uppercase" ></span><br>
        <span data-key="hobbies.1" data-modifier="lowercase" ></span>
      </p>
    <p style="text-align: center; margin-top: 10px">
      <span data-key="now" data-modifier="localeTime"></span>
    </p>
    <div style="text-align: center; font-size: 30px" data-key="emoji"></div>
    <br>
  `;
};

// TEST-DATASOURCE
const testData = [
    {
        name: 'John Doe',
        address: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
        },
        hobbies: [ 'reading', 'traveling' ],
        now: new Date(),
        emoji: 'emoji'
    },
    {
        name: 'Jane Doe',
        address: {
            street: '456 Main St',
            city: 'Anytown',
            state: 'CA',
        },
        hobbies: [ 'running', 'painting' ],
        now: new Date(),
        emoji: 'emoji'
    },
    {
        name: 'BarbWire',
        address: {
            street: '007 Oneway',
            city: 'Anothertown',
            state: 'Spheres',
        },
        hobbies: [ 'coding', 'playing cello', `playing devil's advocat` ],
        now: new Date(),
        emoji: '👻'
    }
];


// model watching all obj
const dataObject = new DataHandler(testData);
// model watching subkey of obj
const testModifier = new Contemplate(dataObject, templateTest, 'container4', 'template1', modifiers);
testData[ 0 ].name = 'Lemme see'

testData[ 2 ].hobbies[ 0 ] = 'debugging 🤬';
testData[ 2 ].hobbies[ 1 ] = 'motocycling';

testData[ 0 ].hobbies[ 3 ] = 'dreaming';


testData[ 0 ].address.street = 'Home'// TODO NOT applied
//console.log(testData[ 0 ].address.street)// getter is ok.
//testData[ 0 ].address = { street: 'Home', city: 'MyTown' }
testData[ 0 ].address.street = 'Everywhere'
// to check updating of only changed on load
//const updateNow = setInterval(tic, 1000);
// const stop = setTimeout(stopIt, 10000)
// function tic() {
//     testData[ 2 ].now = new Date().toLocaleTimeString();
// }
// 
// function stopIt() {
//     clearInterval(updateNow);
// }
//testData[ 2 ].name = 'Tired Girl'


testData.push({
    name: 'Pushed Card',
    address: {
        street: '007 Oneway',
        city: 'Anothertown',
        state: 'Spheres',
    },
    hobbies: [ 'coding', 'playing cello', `playing devil's advocat` ],
    now: new Date(),
    emoji: '👻'
})
testData[ 2 ].name = 'Stupid Girl'
//testData.shift()// TODO remove listeners for removed cards

//testData.pop()