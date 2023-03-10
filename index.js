/*
 *   Copyright (c) 2023 BarbWire-1 aka Barbara Kälin
 *   All rights reserved.
     with MIT license
 */
// TODO currently update ALL cards on shift/unshift/splice/slice to prevent the indices mess
// TODO inner arrays not updated per index!!!!!
// TODO add class in Constructor of Contemplate

//TODO if(!value)=> `{{key}}`
// TODO diff create/update in handling keys and values!!!!


class ObserveEncapsulatedData {
    constructor (dataSource) {
        this.data = dataSource;
        this.observers = [];
        this.makeReactive()
    }
    
    // init with defining properties on all items of dataSource
    makeReactive() {
        this.data.map((obj, index) => {
            for (const key in obj) {
                this.defineProp(obj, key, index);
            }
        });
    }

    // Define properties per item in dataSource
    defineProp(obj, key, index) {
        let self = this;
        let value = obj[ key ];


        Object.defineProperty(obj, key, {
            enumerable: true,
            configurable: true,
            get: function () {
                return value;
            },
            set: function (newValue) {
                value = newValue;
                if (index !== undefined) {
                    console.log(JSON.stringify(obj))
                    //console.log(JSON.stringify([obj][0]))
                    self.notify(obj, key, value, "update", index);
                }
            },
        });

        // Recursively define properties for nested objects or arrays
        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                console.log(value)
                value.forEach((_, i) => {
                    self.defineProp(value, i, index);
                });
            } else {
                Object.keys(value).forEach((nestedKey) => {
                    self.defineProp(value, nestedKey, index);
                });
            }
        }
    }


    // Apply getters array-methods applied to the outer dataSource
    // and define operations to compute for each method.
    // NOTE that this does NOT actually change the this.dataSource,
    // It's kind of a "Luftnummer", the new length and data is only here
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
                    // This acttually should only update the index
                    // and define props at the correct item
                    // content is correct when cards get (un-)shifted
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
                            // add getters/setters to new obj keys
                            // add a card for the pushed obj at the end
                            newObj.forEach((obj) => {
                                for (const key in obj) {
                                    self.defineProp(obj, key, newLength - 1);

                                }
                                self.notify(obj, null, null, "add", newLength - 1);
                                //self.array.push(obj);
                                console.log(self.data.length)

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
                                console.log(index)
                                self.notify(obj, null, null, "add", index);
                            });
                            // update all to sync indices
                            updateIndices();
                            break;
                        }

                        case "pop": {
                            // remove the last card
                            self.notify(null, null, null, "delete", newLength);
                            console.log(self.data.length)
                            break;
                        }
                        case "shift": {
                            // remove the first card
                            self.notify(null, null, null, "delete", 0);
                            // update all to sync indindices
                            updateIndices();
                            break;
                        }
                        //TODO NOT working
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
                        //TODO  NOT WORKING
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

    notify(...args) {
        console.log(JSON.args)
        this.observers.forEach((observer) =>
            observer.update(...args)
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
    constructor (dataHandler, template, containerID, className, modifiers) {
        this.dataHandler = dataHandler.data;
        this.container = document.getElementById(containerID);
        this.containerID = containerID;
        this.className = className
        this.template = template;
        this.modifiers = modifiers; // make modifiers accessible in this instance
        this.dataHandler.addObserver(this);
        this.init();
    }

    init() {
        this.container.innerHTML = "";
        this.dataHandler.data.forEach((instance) => {
            console.log(instance)
            const card = this.createCard(instance);
            this.container.appendChild(card);
        });
    }

    createCard(item) {
        const card = document.createElement("div");
        card.className = this.className;
        const template = this.template(item);
        card.innerHTML = template;
        const placeholders = card.querySelectorAll("[data-key]");

        placeholders.forEach((placeholder) => {
            const key = placeholder.dataset.key;
            let value = this.getValue(item, key);
            console.log(JSON.stringify(value))// string or object
            const modifiers = placeholder.dataset.modifier?.split(' ') ?? [];

            if (modifiers.length) {
                modifiers.forEach((modifier) => {
                    const modifierFn = this.modifiers[ modifier ];
                    if (modifierFn) {
                        value = modifierFn(value);
                    }
                });
                placeholder.textContent = value;
            } else {
                if (Array.isArray(value)) {
                    const arrayValues = value.map((arrayItem) => {
                        return this.getValue(arrayItem, key.split('.').slice(1).join('.'));
                    });
                    placeholder.textContent = arrayValues.join(', ');
                } else if (typeof value === 'object') {
                    const objectValues = Object.values(value).join(', ');
                    placeholder.textContent = objectValues;
                } else {
                    placeholder.textContent = value;
                }
            }
        });

        return card;
    }


    getValue(obj, key) {
        let value = obj;
        const keys = key.split('.');

        for (let i = 0; i < keys.length; i++) {
            const k = keys[ i ];
            const arrIndexMatch = k.match(/\[(\d+)\]/);
            console.log(Array.isArray(value))
            if (arrIndexMatch) {
                const arrIndex = parseInt(arrIndexMatch[ 1 ]);
                value = Array.isArray(value) ? value[ arrIndex ] : '';
            } else {
                value = value ? value[ keys[ i ] ] : '';
            }

            // If the current value is undefined, break out of the loop and return an empty string
            if (value === undefined) {
                value = '';
                break;
            }
        }

        return value;
    }




    // todo split this into create/remove uptadte?
    // gets called from the dataHandler's notify and proceeds the approriate changes add/remove cards or update card (changed key only)
    update(item, property, value, operation, index) {
        const element = this.container.children[ index ];
        const placeholders = element.querySelectorAll("[data-key]");

        if (operation === "add") {
            const card = this.createCard(item);
            const nextSibling = this.container.children[ index ];
            this.container.insertBefore(card, nextSibling);
        } else if (operation === "delete") {
            this.container.children[ index ].remove();
        } else {
            const key = property;
            let newValue = value;

            placeholders.forEach((placeholder) => {
                const key = placeholder.dataset.key;
                console.log(key)
                let value = this.getValue(item, key) || item[key];// this does not work for setting address.street eg
                console.log(typeof (key))// aaaaah....all string!!!
                console.log(value)// undefined for nested set per .??? 🥵
                const modifiers = placeholder.dataset.modifier?.split(' ') ?? [];
                console.log(modifiers)
                if (modifiers.length) {
                    modifiers.forEach((modifier) => {
                        const modifierFn = this.modifiers[ modifier ];
                        if (modifierFn) {
                            value = modifierFn(value);
                        }
                    });
                    placeholder.textContent = value;
                } else {
                    placeholder.textContent = value;
                }
            });

        }
    }

}


// INSTANTIATE
const modifiers = {
    uppercase: (value) => value.toUpperCase(),
    lowercase: (value) => value.toLowerCase(),
    reverse: (value) => value.split("").reverse().join(""),
    localeTime: () => new Date().toLocaleTimeString(),
    // TODO messes array if only one string inside returns chars
    join: (v) => Object.values(v).join(', '),
    
};


const templateTest = (item) => {
    
    return `
    <h2 style="text-align: center">
      <span data-key="name" data-modifier="uppercase"></span>
      <span data-key="name" data-modifier="lowercase"></span>
    </h2>
    <p>
      Address:
      <span data-key="address" data-modifier="join"></span>
      
      <!-- on nested NOT applied in update method-->
      <span data-key="address.street" data-modifier="uppercase"></span>
      <span data-key="address.city"></span>
      <span data-key="address.state"></span>
    </p>
    <p>
      Hobbies:
      <span data-key="hobbies"data-modifier="join"></span><br>
        <span data-key="hobbies.0" ></span>
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
        emoji: undefined
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
        emoji: undefined
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

testData[ 2 ].hobbies = [ 'debugging 🤬' ] 
testData[ 2 ].hobbies[2] = 'playing cello' // not applied
testData[ 0 ].address.street = 'Bedwards'// throws Cannot read property 'toUpperCase' of undefined


