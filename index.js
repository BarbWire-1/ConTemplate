/*
 *   Copyright (c) 2023 BarbWire-1 aka Barbara Kälin
 *   All rights reserved.
     with MIT license
 */
//TODO change makeReactive to take an item as param, then init with forEach in this.data, THEN call for new items in arrayObserver
// in order to get the prototype-thingy working!

// TODO still not deleting items from nested objects when entire object overwritten
// TODO differentiate in arrayObserver as different actions needed for outer/inner array
class DataObserver {
    constructor (dataSource, proto) {
        this.data = dataSource;
        this.proto = proto ?? this.data[ 0 ]
        this.observers = [];
        this.makeReactive()
        this.observeArray(this.data)
    }

    
    // init with defining properties on all items of dataSource
    makeReactive() {
        // create prototype object with all getters/setters
        const prototype = Object.create(null);
        this.defineProp(this.proto, prototype, 0);
        //console.log(prototype)// {}

        // set prototype for all other items in the data source
        this.data.forEach((item, index) => {
            Object.setPrototypeOf(item, prototype);
            this.defineProp(item, prototype, index);
        });
    }
    
    
    // THIS IS CURRENTLY NOT WORKING
    // init with defining properties on all items of dataSource
//     makeReactive() {
//         // create prototype object with all getters/setters
//         const prototype = Object.create(this.proto);
//         Object.getOwnPropertyNames(this.proto).forEach((key) => {
//             this.defineProp(this.proto, prototype, key, this);
//         });
// 
//         // set prototype for all other items in the data source
//         this.data.forEach((item, index) => {
//             Object.setPrototypeOf(item, prototype);
//             Object.getOwnPropertyNames(prototype).forEach((key) => {
//                 this.defineProp(item, prototype, key, this);
//             });
//         });
//     }

   
    // TODO add arrayObserver for nested arrays?
    // TODO test level of nested possible
    defineProp(currentObj, prototype, index, parentKey = null) {
        let self = this;
        //clone to keep values of a parentObj
        const parentData = JSON.parse(JSON.stringify(currentObj));

        Object.keys(currentObj).forEach(key => {
            let value = currentObj[ key ];
            
            // dataKey is used to notify and update tags with corresponding data-key
            let dataKey = parentKey ? `${parentKey}.${key}` : key;
            // recursively notify and update nested arrays
            if (Array.isArray(value)) {
                //console.log(value)
                //self.notify(value, dataKey, value, "update", index);
                self.observeArray(self);
            }
            // Recursively define properties for nested objects or arrays
            // and pass current key as parentKey
            if (typeof value === "object" && value !== null) {
                self.defineProp(value, prototype, index, key);
            }

            Object.defineProperty(currentObj, key, {

                enumerable: true,
                get() {
                    //console.log(value)
                    return value;
                },
                set(newValue) {
                   
                    value = newValue;
                    self.notify(currentObj, dataKey, value, "update", index);
                    
                    // update all items when parentobj has changed
                    //TODO hmmm. need to remove single subs with now no value!
                    if (typeof value === "object" && value !== null) {

                        Object.keys(value).forEach(key => {
                            let subKey = dataKey + `.${key}`
                            self.notify(key, subKey, value[ key ], "update", index);
                        })
                    }
                    // update parent object if single item changed
                    if (parentKey) {
                        // write the new value to the clone obj
                        // then trigger the notify of parentObj with the value of the clone
                        parentData[ key ] = value;
                        self.notify(parentKey, parentKey, parentData, "update", index);
                        
                    }
                },
            });
        });
    }


       
    
   
    //TODO this is UGLY LIKE HELL... change when logic once should run
    // TODO currently slice, splice wrong
    observeArray(array) {
        const self = this;
        const methods = [ "push", "pop", "shift", "unshift", "splice", "slice" ];
        function updateIndices() {
            for (let i = 0; i < self.data.length; i++) {
                for (const key in self.data[ i ]) {
                    self.defineProp(self.data[ i ], key, i);
                }
                self.notify(self.data[ i ], null, null, "update", i);
            }
        }

        function addCard(obj, index) {
            for (const key in obj) {
                // TODO makeReactive her => as kind of prototype
                // Object.setPrototypeOf(item, prototype);
                // this.defineProp(item, prototype, index);        
                self.defineProp(obj, key, index);
            }
            self.notify(obj, null, null, "add", index);
        }

        function removeCard(index) {
            self.notify(null, null, null, "delete", index);
        }
        methods.forEach((method) => {
            const originalMethod = Array.prototype[ method ];
            
            Object.defineProperty(array, method, {
                value: function (...newObj) {
                    let result = originalMethod.apply(this, newObj);
                    let newLength = result
                    switch (method) {
                        case "push":
                            newObj.forEach((obj, index) => {
                                addCard(obj, newLength - newObj.length + index);
                            });
                            break;

                        case "unshift":
                            newObj.forEach((obj, index) => {
                                addCard(obj, index);
                            });
                            updateIndices();
                            break;

                        case "pop":
                            removeCard(newLength);
                            break;

                        case "shift":
                            removeCard(0);
                            updateIndices();
                            break;

                        case "splice":
                            const index = newObj[ 0 ];
                            const deleteCount = newObj[ 1 ];
                            const itemsToAdd = newObj.slice(2);

                            if (itemsToAdd.length > 0) {
                                itemsToAdd.forEach((obj, i) => {
                                    addCard(obj, index + i);
                                });
                            }

                            if (deleteCount > 0) {
                                for (let i = 0; i < deleteCount; i++) {
                                    removeCard(index);
                                }
                            }
                            updateIndices();
                            break;

                        case "slice":
                            // handle slice case
                            break;
                    }
                    return result;
                },
                writable: true,
                enumerable: true,
                configurable: true,
            })
        })
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
        this.observers.forEach((observer) =>
            observer.update(...args)
        );
    }
    
}


class DataHandler {
    constructor (dataSource, proto = null) {
        this.proto = proto || dataSource[ 0 ]
        this.data = new DataObserver(dataSource, this.proto);
        
        this.observers = [];
        this.data.observeArray(this.data);

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
        const write2CardRecursive = (item, prefix) => {
            for (const key in item) {
                const value = item[ key ];
                this.write2Card(item, key, value, card)
                const fullKey = prefix ? `${prefix}.${key}` : key;
                if (typeof value === "object") {
                    //console.log(value)
                    write2CardRecursive(value, fullKey, card);
                } else {
                    this.write2Card(item, fullKey, value, card);
                }
             }
        };
        write2CardRecursive(item, '', card);
        

        return card;
    };

    // TODO check here for how to update parent[item] if parent
    // instead of oberwriting it!
    write2Card(_, key, value, card) {
    
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
            
                tag.textContent = value;
          
        });
    }

    //TODO check the notify for needed params after changes made here
    update(item, key, value, operation, index) {
       
        if (operation === "add") {
            const card = this.createCard(item);
            const nextSibling = this.container.children[ index ];
            this.container.insertBefore(card, nextSibling);

        } else if (operation === "delete") {
            this.container.children[ index ].remove();

        } else if (operation === "update") {
            // console.log(index)
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
      Address obj :
      <span data-key="address" data-modifier="join"></span><br>
      
      <!-- on nested NOT applied in update method-->
      Address keys :
      <span data-key="address.street" data-modifier="uppercase"></span>,
      <span data-key="address.city"></span>,
      <span data-key="address.state"></span>
    </p>
    <p>
      Hobbies:
      <span data-key="hobbies"data-modifier="join"></span><br>
     
      <span data-key="hobbies.0" data-modifier="uppercase" ></span><br>
        <span data-key="hobbies.1" data-modifier="lowercase" ></span>
         <span data-key="hobbies.2" data-modifier="lowercase" ></span>
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

const prototype = {
    name: "",
    address: {
        street: "",
        city: "",
        state: "",
    },
    hobbies: Array.from({ length: 5 }, () => 'test'),
    now: null,
    emoji: null,
};

// model watching all obj
const dataObject = new DataHandler(testData, prototype);
// model watching subkey of obj
const testModifier = new Contemplate(dataObject, templateTest, 'container4', 'template1', modifiers);
testData[ 0 ].name = 'Lemme see'

testData[ 2 ].hobbies[ 0 ] = 'debugging 🤬';
testData[ 2 ].hobbies[ 1 ] = 'motocycling';

testData[ 2 ].hobbies[ 2 ] = 'dreaming';


testData[ 0 ].address.street = 'Home'// TODO NOT applied
//console.log(testData[ 0 ].address.street)// getter is ok.
//testData[ 0 ].address = { street: 'Another Home', city: 'MyTown' }
testData[ 0 ].address.street = 'Everywhere'
// to check updating of only changed on load
const updateNow = setInterval(tic, 1000);
const stop = setTimeout(stopIt, 10000)
function tic() {
    testData[ 2 ].now = new Date().toLocaleTimeString();
}

function stopIt() {
    clearInterval(updateNow);
}
testData[ 1 ].name = 'Tired Girl'


testData.push({
    name: 'Pushed Card',
    address: {
        street: '007 Oneway',
        city: 'Anothertown',
        state: 'Spheres',
    },
    hobbies: [ 'coding', 'playing cello', `playing devil's advocat` ],
    now: new Date(),
    emoji: undefined
})
testData[ 2 ].name = 'Stupid Girl'
//testData.shift()// TODO remove listeners for removed cards

//testData.pop()


