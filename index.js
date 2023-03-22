/*
 *   Copyright (c) 2023 BarbWire-1 aka Barbara Kälin
 *   All rights reserved.
     with MIT license
 */
console.clear()

// supports and reflects the array-methods "push", "pop", "shift", "unshift", "splice", "reverse" on the dataSource
console.time()
class DataObserver {
    constructor (dataSource, proto) {
       
        this.data = dataSource;
        this.proto = proto;
        this.observers = [];
        this.init()
        this.observeArray(dataSource)
    }

    //init with defining properties on all items of dataSource
    init() {
        this.data.forEach((item, index) => {
            this.defineProp(item, index);
        });
    }

    defineProp(currentObj, index, parentKey = null) {

        let self = this;
        //clone to keep values of a parentObj
        // for sync if single item changed
        const parentData = { ...currentObj }

        Object.keys(currentObj).forEach(key => {
            let value = currentObj[ key ];
            const dataKey = parentKey ? `${parentKey}.${key}` : key;// path for data-keys
            const isObject = typeof value === "object" && value !== null;
            
            // define array.length++ in proto
            if (Array.isArray(value)) {
                
                for (let i = 0; i < this.proto[ key ]?.length; i++) {
                    currentObj[ key ][ i ] = value[ i ] || this.proto[ key ][ i ];
                } 
               
            }
            // Recursively define properties
            if (isObject) {
                self.defineProp(value, index, key);
            }

            Object.defineProperty(currentObj, key, {

                enumerable: true,
                get() {
                    return value;
                },
                set(newValue) {
                    value = newValue;
                    self.notify(currentObj, dataKey, value, "update", index);

                    // update parent array if single item changed
                    if (parentKey) {
                        console.log(parentKey)
                        parentData[ key ] = value;
                        self.notify(parentKey, parentKey, parentData, "update", index);
                    }
                    // re-define and update keys if entire nested object changed
                    if (isObject && !self.data.includes(value)) {
                        console.log(currentObj )
                        self.defineProp(currentObj, index)
                        Object.keys(value).forEach(key => {
                            
                            let subKey = dataKey + `.${key}`
                            self.notify(currentObj, subKey, value[ key ], "update", index);
                        })
                        
                    }


                },
            });

        });

    }





    //TODO this is UGLY LIKE HELL... change when logic once should run
    // TODO currently slice, splice wrong
    observeArray(array) {
        const self = this;
        const methods = [ "push", "pop", "shift", "unshift", "splice", "reverse" ];

        function addCard(obj, index) {
 
            self.notify(obj, null, null, "add", index);
            updateIndices()
        }

        function removeCard(index) {
            self.notify(null, null, null, "delete", index);
        }
       
        function updateIndices() {
            // redefine on the new index if sequence has changed
            // probably expensive but necessary for array-methods
            for (let i = 0; i < self.data.length; i++) {
                
                self.defineProp(self.data[ i ], i);
                for (const key in self.data[ i ]) {
                    // nesteds
                    if(typeof key === 'object')
                        self.defineProp(key, i, self.data[ i ]);
                        self.notify(self.data[i], null, self.data[ i ][ key ], "update", i);
                    
                }
                
            }
            
        }

        methods.forEach((method) => {
            const originalMethod = Array.prototype[ method ];

            Object.defineProperty(array, method, {
                value: function (...newObj) {
                    // get the args of the originalMethod
                    let result = originalMethod.apply(this, newObj);
                    let newLength = array.length;
                    
                    switch (method) {
                        case "push":
                            addCard(newObj[0], newLength);
                            break;

                        case "unshift":
                            
                            newObj.forEach((obj, index) => {
                                updateIndices();// this is a bit ugly to call for each, but seems necessary
                                addCard(obj, index)
                                return index;
                            });
                            break;

                        case "pop":
                            removeCard(newLength);
                            break;

                        case "shift":
                            removeCard(0);
                            updateIndices();
                            break;
                        
                        // TODO NOT tested yet in new formation
                        case "splice":
                            const index = newObj[ 0 ];
                            const deleteCount = newObj[ 1 ];
                            const itemsToAdd = newObj.slice(2);

                            if (itemsToAdd.length > 0) {
                                for (let i = 0; i < itemsToAdd.length; i++) {
                                    addCard(itemsToAdd[ i ], index + i);
                                    
                                }
                                
                            }

                            if (deleteCount > 0) {
                                for (let i = 0; i < deleteCount; i++) {
                                    removeCard(index + 1);
                                    //TODO index +1 to update?
                                    // why array is correct, while all others are not?

                                }
                                
                            }
                            updateIndices();
                            break;

                        case "reverse":
                           
                            self.data.forEach((item, index) => {
                                addCard(item, index);
                                removeCard(self.data.length)
                            });
                            

                            break;

                        default:
                            
                            break;
                    }

                    return result;
                },
                writable: true,
                enumerable: true,
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


    createCard(item){
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
            const card = this.container.children[ index ];
            
            if(card)// throws if card got removed. WHY so? It shouldn't call an update
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
    join: (v) => (typeof v !== 'string') ? Object.values(v).filter(Boolean).join(', ') : v,

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
      <span data-key="address.state"></span>,
      <span data-key="address.planet"></span>
    </p>
    <p>
      Hobbies:
      <span data-key="hobbies"data-modifier="join"></span><br>
     
      <span data-key="hobbies.0" data-modifier="uppercase" ></span><br>
        <span data-key="hobbies.1" data-modifier="lowercase" ></span>
         <span data-key="hobbies.2" data-modifier="lowercase" ></span>
         <span data-key="hobbies.3" data-modifier="lowercase" ></span>
         <span data-key="hobbies.4" data-modifier="lowercase" ></span>
      </p>
    <p style="text-align: center; margin-top: 10px">
      <span data-key="now" data-modifier="localeTime"></span>
    </p>
    <div style="text-align: center; font-size: 30px" data-key="emoji"></div>
    <br>
  `;
};

// TEST-DATASOURCE
const testData = [ {
    name: '0 init',
    address: {
        street: '0 St',
        city: '0 Town',
        state: '0 State',
    },
    hobbies: [ '0 hobbies.0', '0 hobbies.1' ],
    now: new Date(),
    emoji: undefined
    },
    {
        name: '1 init',
        address: {
            street: '1 St',
            city: '1 Town',
            state: '1 State',
        },
        hobbies: [ '1 hobbies.0', '1 hobbies.1' ],
        now: new Date(),
        emoji: undefined
    },
    {
        name: '2 init',
        address: {
            street: '2 St',
            city: '2 Town',
            state: '2 State',
        },
        hobbies: [ '2 hobbies.0', '2 hobbies.1' ],
        now: new Date(),
        emoji: '👻'
    }
];


const filter = {
    // name: "name",
    // address: {
    //     street: "street",
    //     city: "city",
    //     state: "state",
    // },
    hobbies: Array.from({ length: 5 }, () => ''),
    //now: new Date(),
    //emoji: 'emoji',
};








// model watching all obj
const dataObject = new DataHandler(testData, filter);
// model watching subkey of obj
const testModifier = new Contemplate(dataObject, templateTest, 'container4', 'template1', modifiers);

// to check updating of only changed on load
// THIS OF COUSE ALWAYS TICS THE ACTUAL 2
// HMMMMM
const updateNow = setInterval(tic, 1000);
const stop = setTimeout(stopIt, 10000)
function tic() {
    testData[ 2 ].now = new Date().toLocaleTimeString();
}

function stopIt() {
    clearInterval(updateNow);
}

/*********************************************************** TESTING REACTIVITY  ***/
// testData[ 0 ].name = 'Test';
//  testData[ 0 ].address = { street: 'test', city: 'city', state: 'state', planet: 'venus' }
//   testData[ 0 ].address.street = 'STREET TEST';
//   testData[ 0 ].hobbies = ['testing array'];// ok here
// // testData[ 0 ].hobbies[ 0 ] = 'testing';
//  testData[ 0 ].hobbies[ 3 ] = 'testing 3';

/*********************************************************** TESTING ARRAY METHODS  ***/
//testData.pop();
/******************************************************************** End Pop  ***/
testData.push({
    name: '3 push',
    address: {
        street: '3 St',
        city: '3 Town',
        state: '3 State',
    },
    hobbies: [ '3 hobbies.0', '3 hobbies.1' ],
    now: new Date(),
    emoji: undefined
})
// testData[ 3 ].name = 'Test';
// testData[ 3 ].address = { street: 'test', city: 'city', state: 'state' }
//  testData[ 3 ].address.street = 'STREET TEST';
// // TODO how to remove the items NOT in new array? - working for init 
// testData[ 2 ].hobbies = [ 'testing array' ];// NOT OK FROM HERE so have a look at addCard
// console.log(testData[0].hobbies.length)// 5
// testData[ 2 ].hobbies[2] = 'testing';
//  testData[ 3 ].hobbies[ 4 ] = 'testing 3';
/******************************************************************** End Push  ***/
 //testData.shift()
// 
//  testData[ 0 ].name = 'Test';
// testData[ 0 ].address = { street: 'test', city: 'city', state: 'state' }
// testData[ 0 ].address.street = 'STREET TEST';
// testData[ 0 ].hobbies = ['testing']; // not deleting other items
// testData[ 0 ].hobbies[ 1 ] = 'testing';
// testData[ 0 ].hobbies[ 3 ] = 'testing 3';
/******************************************************************** End shift  ***/
 testData.unshift(
    {
        name: '4 unshift',
        address: {
            street: '4 St',
            city: '4 Town',
            state: '4 State',
        },
        hobbies: [ '4 hobbies.0', '4 hobbies.1' ],
        now: new Date(),
        emoji: undefined
    },
    {
        name: '5 unshift',
        address: {
            street: '5 St',
            city: '5 Town',
            state: '5 State',
        },
        hobbies: [ '5 hobbies.0', '5 hobbies.1' ],
        now: new Date(),
        emoji: undefined
    }
);
// testData[ 0].name = 'Test';
//  testData[ 5 ].address = { street: 'test', city: 'city', state: 'state' }
//  testData[ 5 ].address.street = 'STREET TEST';
// testData[ 5].hobbies = ['testing array'];//TODO  NOT DELETING OTHER IN SINGLE ITEMS
//  testData[ 5 ].hobbies[ 1 ] = 'testing';
//  testData[ 4 ].hobbies[ 3 ] = 'testing 3';

/******************************************************************** End unshift  ***/
// testData.reverse();
// testData[ 5 ].name = 'Test';
// testData[ 0 ].address = { street: 'test', city: 'city', state: 'state' }
// testData[ 0 ].address.street = 'STREET TEST';
// testData[ 1 ].hobbies = [ 'testing array' ];
// testData[ 1 ].hobbies[ 1 ] = 'testing';
// testData[ 4 ].hobbies[ 3 ] = 'testing 3';
/******************************************************************** End reverse  ***/
testData.splice(4,1,
    {
        name: '6 spliced',
        address: {
            street: '6 St',
            city: '6 Town',
            state: '6 State',
        },
        hobbies: [ '6 hobbies.0', '6 hobbies.1' ],
        now: new Date(),
        emoji: undefined
    },
    {
        name: '7 spliced',
        address: {
            street: '7 St',
            city: '7 Town',
            state: '7 State',
        },
        hobbies: [ '7 hobbies.0', '7 hobbies.1' ],
        now: new Date(),
        emoji: undefined
    }
);
//testData[ 2 ].name = 'Test';//TODO splice delete doesn't work correct
testData[ 1 ].address = { street: 'test', city: 'city', state: 'state' }
testData[ 1 ].address.street = 'STREET TEST';
 testData[ 2 ].hobbies = [ 'testing array' ];
// testData[ 4 ].hobbies[ 1 ] = 'testing';
// testData[ 4 ].hobbies[ 3 ] = 'testing 3';
console.timeEnd()

function multiplier(factor) {
    return number => number * factor;
}
usd2eur = multiplier(1.08)
usd2eur(400); // 432