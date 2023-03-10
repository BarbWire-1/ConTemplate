/*
 *   Copyright (c) 2023 BarbWire-1 aka Barbara Kälin
 *   All rights reserved.
     with MIT license
 */
// TODO currently update ALL cards on shift/unshift/splice/slice to prevent the indices mess
// TODO inner arrays not updated per index!!!!!
// TODO add class in Constructor of Contemplate
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
        let value = JSON.parse(JSON.stringify(obj[ key ]));


        Object.defineProperty(obj, key, {
            enumerable: true,
            configurable: true,
            get: function () {
                return value;
            },
            set: function (newValue) {
                value = JSON.parse(JSON.stringify(newValue));
                if (index !== undefined) {
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
            const card = this.createCard(instance);
            this.container.appendChild(card);
        });
    }

    createCard(item) {
        const template = this.template(item);
        const parser = new DOMParser();
        const docFrag = parser.parseFromString(template, "text/html").body;
        const elements = Array.from(docFrag.childNodes);

        elements.forEach(element => {
            const placeholders = element.querySelectorAll("[data-key]");

            placeholders.forEach(placeholder => {
                const key = placeholder.dataset.key;
                const value = item[ key ];
                const modifier = placeholder.dataset.modifier;

                if (modifier && this.modifiers[ modifier ]) {
                    const modifiedValue = this.modifiers[ modifier ](value);
                    placeholder.textContent = modifiedValue;
                } else {
                    placeholder.textContent = value;
                }
            });
        });

        return docFrag;
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
            //let newValue = value;

            placeholders.forEach((placeholder) => {
                const key = placeholder.dataset.key;
                let value = item[ key ];
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
                    placeholder.textContent = value;
                }
            });

        }
    }







}

const modifiers = {
    uppercase: (value) => value.toUpperCase(),
    lowercase: (value) => value.toLowerCase(),
    reverse: (value) => value.split("").reverse().join(""),
    localeTime: (value) => value.toLocaleTimeString()
    // ...
};



const templateTest = (item) => {
    
    return `
    <h2 style="text-align: center">
      <span data-key="name" data-modifier="uppercase"></span>
      <span data-key="name" ></span>
    </h2>
    <p>
      Address:
      <span data-key="street">${item.address.street}</span>,
      <span data-key="city">${item.address.city}</span>,
      <span data-key="state">${item.address.state}</span>
    </p>
    <p>
      Hobbies:
      <span data-key="hobbies" data-modifier="hobbies">${item.hobbies}</span>
    </p>
    <p style="text-align: center; margin-top: 10px">
      <span data-key="now" data-modifier=localeTime></span>
    </p>
    <div style="text-align: center; font-size: 30px">${item.emoji ?? ""}</div>
    <br>
  `;
};





// function cardTemplate(item) {
//     const { title, description, now } = item;
//     return `
//    
//             <h2>index in data: <span data-key="title">${title}<span></h2>
//             <p data-key="description">${description}</p><!--the "||"not working-->
//             <p data-key="now"> ${now ?? ''}</p>
//             <button data-key="delete">Delete</button>
//     
//   `;
// }
// function cardTemplate2(item) {
//     return `
//             <h4>I am 
//                 <span data-key="title">${item.title}<span>
//             </h4>
//             <p data-key="description">${item.description.a ?? item.description}</p><!--the "||"not working-->
//             <button data-key="delete">Delete</button>
//   `;
// }
// 
// const source = [
//     { title: "Card 1", description: "This is the first card.", now: new Date().toLocaleTimeString() },
//     { title: "Card 2", description: "This is the second card.", now: new Date().toLocaleTimeString() },
//     { title: "Card 3", description: "This is the third card.", now: new Date().toLocaleTimeString() },
// ];
// 
// const model = new DataHandler(source);
// //const template = cardTemplate;
// const template = templateTest
// 
// const cards1 = new Contemplate(model, template, 'container1', 'template1');

//const cards2 = new Contemplate(model, cardTemplate2,'container2', 'template2', );

// source[ 0 ].title = "renamed Card"; // will rerender
// source.push({ title: "Card 4", description: "This is the pushed fourth card.", now: new Date().toLocaleTimeString() })
// source[ 1 ].title = "renamed me too";
// source[ 3 ].title = `I'm the new one`;// YEAH!!!!!!!
// 
// 
// source.push({ title: "Card 5", description: "This is the pushed fifth card.", now: new Date().toLocaleTimeString() })
// source.push({ title: "Card 6", description: "This is the pushed sixth card.", now: new Date().toLocaleTimeString() })
// 
// 
// // UP TO HERE INDICES ARE OK
// source[ 5 ].title = "Sexiest Card"
// 
// 
// // UNSHIFT MESSES WITH INDICES: 2,3,4,5,6,7,5,undefined
// source.unshift({ title: "Card 7", description: "This is the unshifted seventh card.", now: new Date().toLocaleTimeString() },
//     { title: "Card 8", description: "This is the unshifted eighth card.", now: new Date().toLocaleTimeString() },)
// 
// // DIFFERENT TEMPLATE_FUNCTION BEING PASSED TO ConTemplate
// // TODO ADD AN INDEX HERE TO DIFFERCIATE!!!
// 
// // to check updating of only changed on load
// const updateNow = setInterval(tic, 1000);
// const stop = setTimeout(stopIt, 10000)
// function tic() {
//     source[ 0 ].now = new Date().toLocaleTimeString();// TICKS
//     source[ 1 ].now = new Date().toLocaleTimeString();//TICKS
//     source[ 2 ].now = new Date().toLocaleTimeString();//WHAAAT??? TICKS NOT
// }
// function stopIt() {
//     clearInterval(updateNow);
// }
// 
// 
// source.pop()// ALSO OK
// //cards places are fine, but overwrites everything with the initial data!!!
// // TODO looks ok, but leaves shifted el as null???
// //source.shift()
// //source.splice(-1)
// console.log(JSON.stringify(source))
// //source.slice(2)// NOT working
// source.map((el, index) => el.title = index)
// console.log(JSON.stringify(source))
// //source.slice() Not working yet
// 
// 
// 
// 
// 
// 
// 
// 
// 
// 
// 
// 
// 
// 
// 
// //DIFFERENT TEMPLATE_FUNCTION BEING PASSED TO ConTemplate
// // TODO ADD AN INDEX HERE TO DIFFERCIATE!!!
// const template1 = (item) => {
//     
//     const name = item.name.toUpperCase()
//     return `
//         <h2 style="text-align: center; text-transform: uppercase"><span data-key="name">${name}</span></h2>
//         <p>Address: <span data-key="street">${item.address.street}</span>,
//                         <span data-key="city">${item.address.city}</span>,
//                         <span data-key="state">${item.address.state}</span></p>
//         <p>Hobbies: <span data-key="hobbies">${item.hobbies.join(', ')}</span></p>
//         <p style="text-align: center; margin-top: 10px"><span data-key="now">${item.now}</span></p>
//      
//         <div style="text-align: center; font-size: 30px">${item.emoji ?? ''}</div>
//         <br>
//        
//     `;
// 
// };
// 
// const template2 = (item) => {
//     return `
//         <h3>Name: <span data-key="name">${item.name}</span></h3>
//         <p>Address: <span data-key="street">${item.address.street}</span></p>
//         <p>City: <span data-key="city">${item.address.city}</span></p>
//         <p>State: <span data-key="state">${item.address.state}</span></p>
//         <p>Hobbies: <span data-key="hobbies">${item.hobbies.join(', ')}</span></p>
//         <p>Now: <span data-key="now">${item.now}</span></p>
//         <br>
//      
//     `;
// };
// 
// // testData.address only
// const template3 = (item) => {
//     return `
//     
//        <br>
//         <p>Address: <span data-key="street">${item.address.street}</span></p>
//         <p>City: <span data-key="city">${item.address.city}</span></p>
//         <p>State: <span data-key="state">${item.address.state}</span></p>
//        
//     `;
// 
// };
// 
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
        emoji: null
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
        emoji: null
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
const testModifier = new Contemplate(dataObject, templateTest, 'container4', 'template1', modifiers);
testData[0].name = 'Lemme see'
// 
// const firstInstance = new Contemplate(dataObject, template1, 'container4', 'template1');
// //console.log(firstInstance)
// const secondInstance = new Contemplate(dataObject, template2, 'container5', 'template2');// this seems to be problematic (???)
// 
// const thirdInstance = new Contemplate(dataObject, template3, 'container6', 'template3');
// 
// 
// 
// 
// //TODO THIS IS NOT WORKING YET NEED TO ADD OR REMOVE CARDS
// testData[ 0 ].name = 'Judihui'
// 
// // to check updating of only changed on load
// const updateNow2 = setInterval(tic2, 1000);
// const stop2 = setTimeout(stopIt2, 10000)
// function tic2() {
//     testData[ 2 ].now = new Date().toLocaleTimeString();
// }
// 
// function stopIt2() {
//     clearInterval(updateNow2);
// }
// 
// 
// 
// 
// 
// 
// 
// testData.push({
//     name: 'No. 4',
//     address: {
//         street: '123 Sidewalk',
//         city: 'Anytown',
//         state: 'CA',
//     },
//     hobbies: [ 'reading', 'traveling' ],
//     now: new Date().toLocaleTimeString()
// },
//     {
//         name: 'No. 5',
//         address: {
//             street: '456 Sidewalk',
//             city: 'Anytown',
//             state: 'CA',
//         },
//         hobbies: [ 'reading', 'traveling' ],
//         now: new Date().toLocaleTimeString()
//     })
// 
// testData[ 0 ].name = 'Jennifer Toe'
// 
// 
// // WHY ARE THESE NOT WORKING??????
// testData[ 0 ].address.street = `123 Test Way`
// testData[ 4 ].address.street = `123 Test Way`
// // as using join in template need entire array here (?)
// testData[ 2 ].hobbies = 'debugging 🤬 '
// 
// 
// 
// 
// class ArrayObserver {
//     constructor (array, callback) {
//         this.array = array;
//         this.callback = callback;
//         this.observe();
//     }
// 
//     observe() {
//         const arrayMethods = [ "push", "pop", "shift", "unshift", "splice", "sort", "reverse" ];
//         const self = this;
//         arrayMethods.forEach(function (method) {
//             const originalMethod = Array.prototype[ method ];
//             Object.defineProperty(self.array, method, {
//                 value: function (...args) {
//                     const result = originalMethod.apply(this, args);
//                     self.callback({
//                         method,
//                         args,
//                         array: this
//                     });
//                     return result;
//                 },
//                 writable: true,
//                 enumerable: false,
//                 configurable: true
//             });
//         });
//     }
// 
//     disconnect() {
//         const arrayMethods = [ "push", "pop", "shift", "unshift", "splice", "sort", "reverse" ];
//         const self = this;
//         arrayMethods.forEach(function (method) {
//             self.array[ method ] = Array.prototype[ method ];
//         });
//     }
// 
// }
// const myArray = [ 1, 2, 3 ];
// const observer = new ArrayObserver(myArray, function (change) {
//     console.log("Array changed:", change);
// });
// myArray.push(4); // logs: "Array changed: { method: 'push', args: [ 4 ], array: [ 1, 2, 3, 4 ] }"
// 
// myArray[ 1 ] = 'changed'
// myArray.slice(-2)
// //observer.disconnect();
// 
// 
// 

