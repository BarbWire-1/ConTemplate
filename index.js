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



class ObserveEncapsulatedData {
    constructor (dataSource) {
        this.data = dataSource;
        this.observers = [];
        this.makeReactive()
    }
    
    // init with defining properties on all items of dataSource
    makeReactive() {
        this.data.forEach((obj, index) => {
            Object.keys(obj).forEach((key) => {
                const descriptor = Object.getOwnPropertyDescriptor(obj, key);
                if (!descriptor || !descriptor.set || !descriptor.get) {
                    this.defineProp(obj, key, index);
                }
            });
        });
    }


    // Define properties per item in dataSource
    defineProp(obj, key, index) {
        let self = this;
        let value = obj[ key ];

        Object.defineProperty(obj, key, {
            enumerable: true,
            configurable: false,
            get() {
                console.log(value)
                return value;
            },
            set(newValue) {
                value = newValue;
                console.log(value)// set on address-street is NOT HERE!!!
                self.notify(obj, key, value, "update", index);

                // recursively define properties on nested objects or arrays
                if (typeof value === "object" && value !== null) {
                    Object.keys(value).forEach((nestedKey) => {
                        console.log(value, nestedKey)//['debugging 🤬'], '0'

                        if (typeof value[ nestedKey ] === "object" && value[ nestedKey ] !== null) {
                            self.defineProp(value, nestedKey);

                        }
                    });
                }
            },
        });
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
                    
                    // define props at the correct item's index
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

    notify(item, property, value, operation, index) {
        this.observers.forEach((observer) =>
            observer.update(item, property, value, operation, index)
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
            
            const card = this.createCard(instance);
            this.container.appendChild(card);
        });
    }

    createCard(item) {
        const card = document.createElement("div");
        card.className = this.className;
        const template = this.template(item);
        card.innerHTML = template;
        // get all tags including a data-key
        const tags = card.querySelectorAll("[data-key]");

        tags.forEach((tag) => {
            
            const key = tag.dataset.key;
            console.log ({ key })
            //let value = item[key]
             let value = this.getValue(item, key);
            //console.log(JSON.stringify(value))// string or object
            const modifiers = tag.dataset.modifier?.split(' ') ?? [];

            if (modifiers.length) {
                modifiers.forEach((modifier) => {
                    const modifierFn = this.modifiers[ modifier ];
                    if (modifierFn) {
                        value = modifierFn(value);
                    }
                });
                tag.textContent = value;
            } else {
                if (Array.isArray(value)) {
                    const arrayValues = value.map((arrayItem) => {
                        return this.getValue(arrayItem, key.split('.').slice(1).join('.'));
                    });
                    tag.textContent = arrayValues.join(', ');
                } else if (typeof value === 'object') {
                    const objectValues = Object.values(value).join(', ');
                    tag.textContent = objectValues;
                } else {
                    tag.textContent = value;
                }
            }
        });

        return card;
    }


    getValue(obj, key) {
        let value = obj;
        //console.log(JSON.stringify(value))
        const keys = key.split('.');
        console.log(keys)

        for (let i = 0; i < keys.length; i++) {
            const k = keys[ i ];
            value = value ? value[ keys [ i ]] : value;
            
        }
        console.log(value)// keys set on array[index] or on obj.item are NOT HERE

        return value;
    }




    // todo split this into create/remove uptadte?
    // gets called from the dataHandler's notify and proceeds the approriate changes add/remove cards or update card (changed key only)
    update(item, property, value, operation, index) {
        
        console.log({property,value,operation, index})
        console.log(typeof property)
        
        

        if (operation === "add") {
            const card = this.createCard(item);
            const nextSibling = this.container.children[ index ];
            this.container.insertBefore(card, nextSibling);
            
        } else if (operation === "delete") {
            this.container.children[ index ].remove();
            
        } else {
            
            const element = this.container.children[ index ];
            const tags = element.querySelectorAll("[data-key]");
             const key = property;
             console.log(key)// here is ONLY forstLevel key!!!!
            let value = this.getValue(item, key);
            const elementsToUpdate = Array.from(
                element.querySelectorAll(`[data-key="${key}"]`)
                
                
            );
            // TODO try a replace here for ${key} ONLY
            elementsToUpdate.forEach((el) => {
               // if (el.textContent !== value) {
                    el.textContent = value;
                //}
            });
           

            tags.forEach((tag) => {

                const key = tag.dataset.key;
                console.log({ key })
                //let value = item[key]
                value = this.getValue(item, key) ?? value;
                console.log(JSON.stringify(value))// string or object
                const modifiers = tag.dataset.modifier?.split(' ') ?? [];

                if (modifiers.length) {
                    modifiers.forEach((modifier) => {
                        const modifierFn = this.modifiers[ modifier ];
                        if (modifierFn) {
                            value = modifierFn(value);
                        }
                    });
                    tag.textContent = value;
                } else {
                    if (Array.isArray(value)) {
                        const arrayValues = value.map((arrayItem) => {
                            return this.getValue(arrayItem, key.split('.').slice(1).join('.'));
                        });
                        tag.textContent = arrayValues.join(', ');
                    } else if (typeof value === 'object') {
                        const objectValues = Object.values(value).join(', ');
                        tag.textContent = objectValues;
                    } else {
                        tag.textContent = value;
                    }
                }
            });
           
            
            //let newValue = value;
            console.log(value)// values on array[index] or obj.item are NOT HERE!!!
            elementsToUpdate.forEach((tag) => {
                console.log(tag)
                //let key = tag.dataset.key;
               
                //let value = item[ key ];// this does not work for setting address.street eg
                let value = this.getValue(item, property);
                //console.log(typeof (key))// aaaaah....all string!!!
                console.log(value)// undefined for nested set per .??? 🥵
                const modifiers = tag.dataset.modifier?.split(' ') ?? [];
                //console.log(modifiers)
                if (modifiers.length) {
                    modifiers.forEach((modifier) => {
                        const modifierFn = this.modifiers[ modifier ];
                        if (modifierFn) {
                            value = modifierFn(value);
                        }
                    });
                    tag.textContent = value;
                } else {
                    tag.textContent = value;
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


const templateTest = () => {
    
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

testData[ 2 ].hobbies[ 0 ] = 'debugging 🤬'
testData[ 2 ].hobbies = ['debugging 🤬'] 
testData[ 2 ].hobbies[1] = 'motocycling'


testData[ 2 ].hobbies[ 2 ] = 'dreaming';
testData[ 0 ].hobbies[ 0 ] = 'dreaming'// NOT applied as array not overwritten prev

testData[ 0 ].address.street = 'Bedwards'// TODO NOT applied
console.log(testData[ 0 ].address.street)// getter is ok.
// to check updating of only changed on load
// const updateNow = setInterval(tic, 1000);
// const stop = setTimeout(stopIt, 10000)
// function tic() {
//     testData[ 2 ].now = new Date().toLocaleTimeString();
// }
// 
// function stopIt() {
//     clearInterval(updateNow);
// }
testData[ 2 ].name = 'tired girl'

testData.push({
    name: 'BarbWire',
    address: {
        street: '007 Oneway',
        city: 'Anothertown',
        state: 'Spheres',
    },
    hobbies: [ 'coding', 'playing cello', `playing devil's advocat` ],
    now: new Date(),
    emoji: '👻'
})

