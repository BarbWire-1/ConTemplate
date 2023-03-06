/*
 *   Copyright (c) 2023 BarbWire-1 aka Barbara Kälin
 *   All rights reserved.
     with MIT license
 */

class DataHandler {
    constructor (dataSource) {
        this.dataSource = dataSource;
        this.observers = [];
        this.length = dataSource.length;
        this.observeDataSorce()
        this.makeReactive()

    }

    // init with defining properties on all items of dataSource
    makeReactive() {
        this.dataSource.map((obj, index) => {
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
                if (index !== -1) {
                    self.notify(obj, key, value, "update", index);
                }
            },
        });

        // Recursively define properties for nested objects or arrays
        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
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
    // It's kind of a "Luftnummer"
    // TODO currently slice, splice wrong
    observeDataSorce() {
        const self = this;
        const methods = [ "push", "pop", "shift", "unshift", "splice", "slice" ];

        methods.forEach((method) => {
            const originalMethod = Array.prototype[ method ];
            Object.defineProperty(this.dataSource, method, {
                value: function (...newObj) {
                    let result = originalMethod.apply(this, newObj);
                    let newLength = this.length;

                    switch (method) {
                        case "push": {
                            newObj.forEach((obj, i) => {
                                for (const key in obj) {
                                    self.defineProp(obj, key, newLength - 1);
                                }
                                self.notify(obj, null, null, "add", newLength - 1);
                            });
                            break;
                        }
                        case "unshift": {
                            newObj.forEach((obj, i) => {
                                for (const key in obj) {
                                    self.defineProp(obj, key, i);
                                }
                                self.notify(obj, null, null, "add", i);
                            });
                            break;
                        }
                        case "pop": {
                            self.notify(null, null, null, "delete", newLength);
                            break;
                        }
                        case "shift": {
                            self.notify(this[ 0 ], null, null, "delete", 0);
                            for (let i = 0; i < this.length - 1; i++) {
                                this[ i ] = this[ i + 1 ];
                            }
                            self.notify(this, null, null, "update", 0);
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

                            if (deleteCount !== itemsToAdd.length) {
                                const shiftCount = deleteCount - itemsToAdd.length;
                                for (let i = index + itemsToAdd.length; i < this.length; i++) {
                                    this[ i - shiftCount ] = this[ i ];
                                    self.notify(this[ i ], null, null, "update", i - shiftCount);
                                }
                                this.length -= shiftCount;
                            }

                            self.notify(obj, null, null, "update", index);
                            break;
                        }
                        case "slice": {
                            const start = newObj[ 0 ];
                            const end = newObj[ 1 ];

                            for (let i = start; i < end; i++) {
                                self.notify(this[ i ], null, null, "delete", i);
                            }
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

        return this.length;
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
    // TODO split this?
    /**
     * 
     * @param {*} item Data of the current item - only needed if operation is "add"
     * @param {*} property The single key when changed
     * @param {*} value The newValue of that key 
     * @param {*} operation the operation needed depending on applied array-method
     * @param {*} index The index of the item in outerArray/cards
     */
    notify(item, property, value, operation, index) {
        this.observers.forEach((observer) =>
            observer.update(item, property, value, operation, index)

        );
    }
}


class Contemplate {
    constructor (dataHandler, template, parent) {
        this.dataHandler = dataHandler;
        this.container = document.getElementById(parent);
        this.template = template;

        this.dataHandler.addObserver(this);
        this.init();
    }

    init() {
        this.container.innerHTML = "";
        this.dataHandler.dataSource.forEach((instance) => {
            const cardTemplate = this.createTemplate(instance);
            const card = cardTemplate.content.cloneNode(true);
            this.container.appendChild(card);
        });
    }
    //TODO check again this keyholder theory it actually didn't work as hoped
    createTemplate(data) {
        const template = document.createElement("template");
        const placeholders = Object.keys(data).map((key) => {
            return {
                key,
                placeholder: `$${key}$`,
            };
        });
        let templateString = this.template(data);
        placeholders.forEach(({ key, placeholder }) => {
            templateString = templateString.replace(placeholder, data[ key ]);
        });
        template.innerHTML = templateString;
        return template;
    }

    // todo split this into create/remove uptadte?
    // gets called from the dataHandler's notify and proceeds the approriate changes add/remove cards or update card (changed key only)
    update(item, property, value, operation, index) {

        if (operation === 'add') {
            // Create a new card element from the template
            const cardTemplate = this.createTemplate(item);
            const card = cardTemplate.content.cloneNode(true);
            const nextSibling = this.container.children[ index ];
            this.container.insertBefore(card, nextSibling);

        } else if (operation === 'delete') {
            // Remove the card element from container
            this.container.children[ index ].remove();

        } else {
            // Update the text content of elements per data-key
            const element = this.container.children[ index ];
            const key = property;
            const elementsToUpdate = Array.from(
                element.querySelectorAll((`[data-key="${key}"]`))
            );
            //TODO change this to replace - not possible??? as overwritten with value?
            elementsToUpdate.forEach((el) => {
                if (el.textContent !== value) {
                    el.textContent = value;
                }
            });
        }
    }


}


function cardTemplate(item) {

    return `
    
    <div class="template1">
        <div class="card">
            <h2>My Name is: <span data-key="title">${item.title}<span></h2>
            <p data-key="description">${item.description.a ?? item.description}</p><!--the "||"not working-->
            <p data-key="now"> ${item.now ?? ''}</p>
            <button data-key="delete">Delete</button>
        </div>
    </div>
  `;
}
function cardTemplate2(item) {
    return `
    <div class="template2">
        <div class="card">
            <h4>I am 
                <span data-key="title">${item.title}<span>
            </h4>
            <p data-key="description">${item.description.a ?? item.description}</p><!--the "||"not working-->
            <button data-key="delete">Delete</button>
        </div>
    </div>
  `;
}

const source = [
    { title: "Card 1", description: { a: "This is the first card." }, now: new Date().toLocaleTimeString() },
    { title: "Card 2", description: "This is the second card.", now: new Date().toLocaleTimeString() },
    { title: "Card 3", description: "This is the third card.", now: new Date().toLocaleTimeString() },
];

const model = new DataHandler(source);
const template = cardTemplate;

const cards1 = new Contemplate(model, template, 'container1');

const cards2 = new Contemplate(model, cardTemplate2, 'container2');

source[ 0 ].title = "renamed Card"; // will rerender
source.push({ title: "Card 4", description: "This is the fourth card.", now: new Date().toLocaleTimeString() })// not applied
source[ 1 ].title = "renamed me too";
source[ 3 ].title = `I'm the new one`;// YEAH!!!!!!!
source[ 0 ].title = "another Card"; // will rerender
//source.pop()// does remove the code, but not the card

source.push({ title: "Card 5", description: "This is the fifth card.", now: new Date().toLocaleTimeString() })
source.push({ title: "Card 6", description: "This is the sixth card.", now: new Date().toLocaleTimeString() })

source[ 5 ].title = "Sexiest Card"

source.unshift({ title: "Card 7", description: "This is the seventh card.", now: new Date().toLocaleTimeString() },
    { title: "Card 8", description: "This is the eighth card.", now: new Date().toLocaleTimeString() },)
source[ 0 ].title = 'test 7';
source[ 1 ].title = 'test 8'
//source[ 0 ].title = 'used to be at index 0'

// DIFFERENT TEMPLATE_FUNCTION BEING PASSED TO ConTemplate
// TODO ADD AN INDEX HERE TO DIFFERCIATE!!!

// to check updating of only changed on load
const updateNow = setInterval(tic, 1000);
const stop = setTimeout(stopIt, 10000)
function tic() {
    source[ 0 ].now = new Date().toLocaleTimeString();// TICKS
    source[ 1 ].now = new Date().toLocaleTimeString();//TICKS
    source[ 2 ].now = new Date().toLocaleTimeString();//WHAAAT??? TICKS NOT
}
function stopIt() {
    clearInterval(updateNow);
}


source.pop()
source.shift()
//source.slice(-2)// NOT working

//DIFFERENT TEMPLATE_FUNCTION BEING PASSED TO ConTemplate
// TODO ADD AN INDEX HERE TO DIFFERCIATE!!!
const template1 = (item) => {
    return `
   <div class="template1">
        <h2 style="text-align: center; text-transform: uppercase"><span data-key="name">${item.name}</span></h2>
        <p>Address: <span data-key="street">${item.address.street}</span>,
                        <span data-key="city">${item.address.city}</span>,
                        <span data-key="state">${item.address.state}</span></p>
        <p>Hobbies: <span data-key="hobbies">${item.hobbies.join(', ')}</span></p>
        <p style="text-align: center; margin-top: 10px"><span data-key="now">${item.now}</span></p>
     
        <div style="text-align: center; font-size: 30px">${item.emoji ?? ''}</div>
        <br>
        </div>
       
    `;

};

const template2 = (item) => {
    return `
   <div class="template2">
        <h3>Name: <span data-key="name">${item.name}</span></h3>
        <p>Address: <span data-key="street">${item.address.street}</span></p>
        <p>City: <span data-key="city">${item.address.city}</span></p>
        <p>State: <span data-key="state">${item.address.state}</span></p>
        <p>Hobbies: <span data-key="hobbies">${item.hobbies.join(', ')}</span></p>
        <p>Now: <span data-key="now">${item.now}</span></p>
        <br>
        </div>
    `;
};

// testData.address only
const template3 = (item) => {
    return `
    <div class="template3">
       <br>
        <p>Address: <span data-key="street">${item.address.street}</span></p>
        <p>City: <span data-key="city">${item.address.city}</span></p>
        <p>State: <span data-key="state">${item.address.state}</span></p>
       
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
        now: new Date().toLocaleTimeString(),
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
        now: new Date().toLocaleTimeString(),
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
        now: new Date().toLocaleTimeString(),
        emoji: '👻'
    }
];


// model watching all obj
const dataObject = new DataHandler(testData);
// model watching subkey of obj


const firstInstance = new Contemplate(dataObject, template1, 'container4');
//console.log(firstInstance)
const secondInstance = new Contemplate(dataObject, template2, 'container5');// this seems to be problematic (???)

const thirdInstance = new Contemplate(dataObject, template3, 'container6');




//TODO THIS IS NOT WORKING YET NEED TO ADD OR REMOVE CARDS
testData[ 0 ].name = 'Judihui'

// to check updating of only changed on load
const updateNow2 = setInterval(tic2, 1000);
const stop2 = setTimeout(stopIt2, 10000)
function tic2() {
    testData[ 2 ].now = new Date().toLocaleTimeString();
}

// WHY DOES THIS KEEP RUNNING???
function stopIt2() {
    clearInterval(updateNow2);
}







testData.push({
    name: 'No. 4',
    address: {
        street: '123 Sidewalk',
        city: 'Anytown',
        state: 'CA',
    },
    hobbies: [ 'reading', 'traveling' ],
    now: new Date().toLocaleTimeString()
},
    {
        name: 'No. 5',
        address: {
            street: '456 Sidewalk',
            city: 'Anytown',
            state: 'CA',
        },
        hobbies: [ 'reading', 'traveling' ],
        now: new Date().toLocaleTimeString()
    })

testData[ 0 ].name = 'Jennifer Toe'


// WHY ARE THESE NOT WORKING??????
testData[ 0 ].address.street = `123 Test Way`
testData[ 4 ].address.street = `123 Test Way`
// as using join in template need entire array here (?)
testData[ 2 ].hobbies = 'debugging 🤬 '




