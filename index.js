/*
 *   Copyright (c) 2023 BarbWire-1 aka Barbara Kälin
 *   All rights reserved.
     with MIT license
 */

// TODO now only adding cards for the first subscriber
// TODO all observe logic in ArrayObserver, now conflicting and unnessesary?
// TODO need a notif for changed length, otherwise only once applied from here
// What happened?
//  ❗️❗️❗️ WORK IN PROGRESS ❗️❗️❗️





console.clear()
window.onload = () => {
    const t0 = performance.now();
   
    // INIT??? OR NOTIFY???
    // MODEL TO TAKE DATA-OBJECT AND RENDER SUBSCRIBERS PER CHANGED PROP
    // For now ONLY observes the array's length to update source if length changed
//     class ArrayObserver {
//         constructor (array, callback) {
//             this.array = array;
//             this.callback = callback;
//             this.length = array.length;
//             this.observe();
//         }
// 
//         observe() {
//             const methodsToObserve = [ "push", "pop", "shift", "unshift", "splice" ];
// 
//             methodsToObserve.forEach((methodName) => {
//                 
//                 // method applied to this.array
//                 const originalMethod = this.array[ methodName ].bind(this.array);
//                 this.array[ methodName ] = (...args) => {
//                    
//                     // Add getters/setters to new items involving above methods before adding them to the array
//                     args = args.map((item) => {
//                         console.log(this.array.length)
//                         
//                         if (typeof item === "object") {
//                             // TODO change this to Object.entries(item) - throws (???)
//                             for (const key in item) {
//                                 if (item.hasOwnProperty(key)) {
//                                     let value = item[ key ];
//                                     Object.defineProperty(item, key, {
//                                         get: () => value,
//                                         set: (newValue) => {
//                                             value = newValue;
//                                             const index = this.array.indexOf(item);
//                                             this.callback(this.array, index, key, newValue);
//                                         },
//                                     });
//                                 }
//                             }
// 
//                             // // Add getters/setters to the entire item
//                             // Object.defineProperty(item, "_data", {
//                             //     value: {},
//                             //     writable: true,
//                             // });
// 
//                             
//                         }
//                         return item;
//                     });
//                     // get the changes
//                     const result = originalMethod(...args);
//                     this.length = this.array.length;
//                     
//                     return result;
//                 };
//             });
//         }
// 
//     }

    
    /** TODO add getters/setters to new items before adding to array
     * arrayObserver: 
        ArrayLengthObserver { array: 
           [ [Getter/Setter],
             [Getter/Setter],
             [Getter/Setter],
             { name: 'No. 4',
               address: [Object],
               hobbies: [Object],
               now: '5:27:22 PM' },
             { name: 'No. 5',
               address: [Object],
               hobbies: [Object],
               now: '5:27:22 PM' },
             push: [λ],
             pop: [λ],
             shift: [λ],
             unshift: [λ],
             splice: [λ] ],
          callback: [λ],
          length: 5 } },
     */


    // 
    class DataHandler {
        constructor (dataSource) {
            this.dataSource = dataSource;
            
            this.obj = this.observeObject(this.dataSource)
            this.observers = [];
            // this.length = this.dataSource.length
            // console.log(this.length)// this stays 3
          
        }

        
        // TODO only works for firstLevel and arrays
        observeObject(obj) {
            
            // new ITEMS are NOT ITEMS OF THE ARRAY. but single objectes here
            console.log(obj)
          
            if (typeof obj !== 'object' ) {
                //console.log(obj)
                return obj;
            }
            //if (!Array.isArray(obj)) {
            for (const key in obj) {
                    
                
                    //console.log(obj)
                    console.log(key)// index and props
                    //console.log(obj[2])
                    if (Object.getOwnPropertyDescriptor(obj, key)) {
                        console.log(obj)
                        obj[ key ] = this.observeObject(obj[ key ]);

                        let temp = obj[ key ];

                        Object.defineProperty(obj, key, {
                            get: () => temp,
                            set: (value) => {
                                temp = value
                              
                                console.log(value)
                                const index = this.dataSource.indexOf(obj);
                                console.log(index)
                                this.notify(index, key, value);
                                
                            
                            },
                           
                            enumerable: true,
                            configurable: true
                        });
                    }
                }
            //}
           
            return obj;
        }

        subscribe(observer) {
            this.observers.push(observer);
        }

        unsubscribe(observer) {
            this.observers = this.observers.filter((obs) => obs !== observer);
        }

        
        //TODO seperate Method to update length, only index of item?
        notify(index, key, value) {
            this.observers.forEach((observer) => {
                
                
                //TODO this updates length, but takes wrong dataSource
                // no getters/setters on new cards, so get the newData HERE!!!!
                observer.updateCards(this.dataSource)
                console.log(this.dataSource)
                this.length = this.dataSource.length
                //console.log(this.length)// 5
                
                observer.render(index, key, value);
        })
        }
    }

    //TODO need to have new(old length here?)
    //TESTING TODO UPDATING FOR CARD LENGTH BUT MISSING REACTIVE
    class ConTemplate {
        constructor (model, template, parent) {
            this.model = model;
            this.model.subscribe(this);
            this.cards = [];
            //this.newDataSource = this.model.dataSource
            // container ti create manually in html or JS to be able to place it where needed
            this.container = document.getElementById(parent);
            this.template = template;
            // get new Data and length from the ArrayObserver Instance inside DataHandler call method to reflect new length;
            // this.arrayObserver = new ArrayObserver(this.model.dataSource, (newDataSource) => {
            //     this.updateCards(newDataSource);
            // });

            this.model.dataSource.forEach((item, index) => {
                this.cards[ index ] = this.createCard(item, this.template);
                this.container.appendChild(this.cards[ index ]);
            });
        }

        createCard(item, chosenTemplate) {
            const template = chosenTemplate(item);
            return template;
        }
        // TODO check the length for different observers!!!
        // do this in the dataHandler and notify for diff? update => render?
        updateCards(newDataSource) {
    
            console.log(this.model.dataSource.length)
            console.log(JSON.stringify(this.model.dataSource))
            // Function to update the cards based on the new data source
            console.log(newDataSource.length)
            const currentLength = this.cards.length;
            const newLength = newDataSource.length;
            const diff = newLength - currentLength;
            console.log(diff)// 2

            if (diff > 0) {
                // Add new cards for the new items
                for (let i = 0; i < diff; i++) {
                    const index = currentLength + i;
                    const item = newDataSource[ index ];
                    //console.log(item)
                    this.cards[ index ] = this.createCard(item, this.template);
                    this.container.appendChild(this.cards[ index ]);
                    
                }
            } else if (diff < 0) {
                // Remove excess cards for the removed items
                for (let i = 0; i < Math.abs(diff); i++) {
                    const index = currentLength - i - 1;
                    const card = this.cards[ index ];
                    this.container.removeChild(card);
                    this.cards.splice(index, 1);
                }
            }
           
            
        }

        render(index, key, value) {
            // TODO when card length changed looses track of changes on single keys? WHY SO???
            //console.log(index, key, value)
            const card = this.cards[ index ];
            //console.log(index)
            const property = card.querySelector(`.${key}`);

            // Only update the card if the new value is different from the current value displayed in the card
            if (property && property.textContent !== value) {
                property.textContent = value;
            }
        }
    }


    // DIFFERENT TEMPLATE_FUNCTION BEING PASSED TO ConTemplate
    // TODO ADD AN INDEX HERE TO DIFFERCIATE!!!
    const template1 = (item) => {
        const template = document.createElement('div');
        template.setAttribute('class', 'template1');
        template.innerHTML = `
        <h2 style="text-align: center"><span class="name">${item.name}</span></h2>
        <p>Address: <span class="street">${item.address.street}</span>,
                        <span class="city">${item.address.city}</span>,
                        <span class="state">${item.address.state}</span></p>
        <p>Hobbies: <span class="hobbies">${item.hobbies.join(', ')}</span></p>
        <p style="text-align: center; margin-top: 10px"><span class="now">${item.now}</span></p>
     
        <div style="text-align: center; font-size: 30px">${item.emoji ?? ''}</div>
        <br>
       
    `;
        return template;
    };

    const template2 = (item) => {
        const template = document.createElement('div');
        template.setAttribute('class', 'template2');
        template.innerHTML = `
        <h3>Name: <span class="name">${item.name}</span></h3>
        <p>Address:
            <span class="address">${item.address.street}, ${item.address.city}, ${item.address.state}</span>
        </p> 
        <p>Hobbies: <span class="hobbies">${item.hobbies.join(', ')}</span></p>
        <p>Now: <span class="now">${item.now}</span></p>
        <br>
    `;
        return template;
    };

    // testData.address only
    const template3 = (item) => {
        const template = document.createElement('div');
        template.setAttribute('class', 'template3');
        template.innerHTML = `
       <br>
        <p>Address: <span class="street">${item.address.street}</span></p>
        <p>City: <span class="city">${item.address.city}</span></p>
        <p>State: <span class="state">${item.address.state}</span></p>
       
    `;
        return template;
    };
    
    class TestData {
        constructor (name, address, hobbies, now, emoji) {
            this.name = name;
            this.address = address;
            this.hobbies = hobbies;
            this.now = now;
            this.emoji = emoji
        }
       
    }
    
    

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
    
   let array = []
    testData.forEach(item => {
       array.push(new TestData(item))
    })
    console.log(array)// undefined

    // model watching all obj
 
    const dataObject = new DataHandler(testData);
    //const dataObject1 = new DataHandler(testData);// bad idea as interferring
    // model watching subkey of obj
    
    const dataObject2 = new DataHandler(testData.map(item => item.address));
    //console.log(dataObject2) // no reference to initoal object? but should be updated each time, not?

   
    // TODO number of cards ok if subscribed to same dataHandler!!!
    
    const firstInstance = new ConTemplate(dataObject, template1, 'container1');
    //console.log(firstInstance)
    const secondInstance = new ConTemplate(dataObject, template2, 'container2');// this seems to be problematic (???) number of cards not updated
// 
    const thirdInstance = new ConTemplate(dataObject, template3, 'container3');




    //TODO THIS IS NOT WORKING YET NEED TO ADD OR REMOVE CARDS
    testData[ 0 ].name = 'Judihui'
    
    // to check updating of only changed on load
    const updateNow = setInterval(tic, 1000);
    const stop = setTimeout(stopIt, 12000)
    function tic() {
        testData[4].now = testData[ 2 ].now = new Date().toLocaleTimeString();
    }
    function stopIt() {
        clearInterval(updateNow);
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
    
    
    // ok, changes on primitives do work, Not on objects or arrays per dot.notation
    testData[ 0 ].name = 'Anoybody Toe'
    testData[ 0 ].address.street = 'Test Street'// NOT WORKING
    testData[ 0 ].address = 'Test Street, Another Town, nowhere' // this is sooooo weird
    // also not working 
    // testData[ 0 ].address = {
    //     street: '456 Sidewalk',
    //     city: 'Anytown',
    //     state: 'CA',
    // }// aaaand also NOT
    testData[0].now = 'never'// applied
    testData[ 1 ].hobbies = [ 'rollerblading', 'motor-cycling' ]
    //TODO: fascinating: the new added dataItems don't have getters/setters
    address = testData.map(dataSet => dataSet.address)
    testData[ 4 ].hobbies = [ 'mountain-biking', 'motor-cycling' ];
    console.log(testData[4])
    testData[ 4 ].hobbies = ['another hobby', 'no hobby']// WHAAAAAAT? NOT APPLIED
    
    //address = testData.map(dataSet => dataSet.address)


    //console.log(dataObject)
    //console.log(firstInstance)// new data are here!!!!!
    
    const t1 = performance.now();
    console.log(`Call to init and update cards took ${t1 - t0} milliseconds.`);
    //testData.pop()// works
    console.log(testData[ 4 ])
    testData.shift()
    console.log(JSON.stringify(testData[0]))
}

// /*
//  *   Copyright (c) 2023 BarbWire-1 aka Barbara Kälin
//  *   All rights reserved.
//      with MIT license
//  */
// 
// // TODO now only adding cards for the first subscriber
// // TODO all observe logic in ArrayObserver, now conflicting and unnessesary?
// // TODO need a notif for changed length, otherwise only once applied from here
// // What happened?
// //  ❗️❗️❗️ WORK IN PROGRESS ❗️❗️❗️
// 
// 
// 
// 
// 
// console.clear()
// window.onload = () => {
//     const t0 = performance.now();
// 
//     // INIT??? OR NOTIFY???
//     // MODEL TO TAKE DATA-OBJECT AND RENDER SUBSCRIBERS PER CHANGED PROP
//     // For now ONLY observes the array's length to update source if length changed
//     class ArrayHandler {
//         constructor (arrayHandler) {
//             this.arrayHandler = arrayHandler;
//             this.dataSource = arrayHandler.getArray();//TODO throws: not a function
//             this.observedData = arrayHandler.getObservedData();
//             this.observe();
//         }
// 
//         observe() {
//             const self = this;
//             this.dataSource = new Proxy(this.dataSource, {
//                 get(target, property) {
//                     if (property === "push") {
//                         return function (...args) {
//                             const result = target.push(...args);
//                             self.arrayHandler.addItem(args);
//                             return result;
//                         };
//                     }
//                     return target[ property ];
//                 },
//                 set(target, property, value) {
//                     target[ property ] = value;
//                     self.arrayHandler.updateItem(property, value);
//                     return true;
//                 },
//             });
//         }
// 
//         createInnerObject(item, observedData) {
//             return new Proxy(item, {
//                 set(target, property, value) {
//                     target[ property ] = value;
//                     observedData[ property ] = value;
//                     return true;
//                 },
//             });
//         }
//     }
// 
// 
//     // INIT BY ARRAY OBSERVER INSTEAD???
//     class DataHandler {
//         constructor (dataSource) {
//             this.dataSource = dataSource;
//             this.innerObj = this.createInnerObj(this.dataSource);
//             this.obj = this.observeObject(this.innerObj);
//             this.observers = [];
//             this.arrayHandler = new ArrayHandler(this.dataSource);
// 
//             this.arrayHandler.addObserver({
//                 insert: (index, item) => {
//                     this.innerObj[ index ] = this.observeObject(item);
//                     this.notify();
//                 },
//                 delete: (index) => {
//                     delete this.innerObj[ index ];
//                     this.notify();
//                 },
//                 update: (index, item) => {
//                     this.innerObj[ index ] = this.observeObject(item);
//                     this.notify();
//                 },
//             });
//         }
// 
//         createInnerObj(obj) {
//             console.log(obj)
//             // Create a new object with the same properties as obj, but with empty values
//             const innerObj = {};
//             for (const key in obj) {
//                 if (obj.hasOwnProperty(key)) {
//                     innerObj[ key ] = null;
//                 }
//             }
//             return innerObj;
//         }
// 
// 
//         observeObject(obj) {
//             //console.log(obj)
//             if (typeof obj !== 'object') {
//                 //console.log(obj)
//                 return obj;
//             }
// 
//             for (const key in obj) {
//                 if (obj.hasOwnProperty(key)) {
//                     obj[ key ] = this.observeObject(obj[ key ]);
// 
//                     let temp = obj[ key ];
// 
//                     Object.defineProperty(obj, key, {
//                         get: () => temp,
//                         set: (value) => {
//                             temp = value;
//                             //console.log(value)
//                             const index = this.dataSource.indexOf(obj);
//                             this.notify(index, key, value);
// 
//                         },
//                     });
//                 }
//             }
// 
//             return obj;
//         }
// 
//         subscribe(observer) {
//             this.observers.push(observer);
//         }
// 
//         unsubscribe(observer) {
//             this.observers = this.observers.filter((obs) => obs !== observer);
//         }
// 
//         notify() {
//             this.arrayHandler.updateObservedData(this.innerObj);
// 
//             this.observers.forEach((observer) => {
//                 observer.updateCards(this.innerObj);
//             });
//         }
// 
// 
//     }
// 
//     //TODO need to have new(old length here?)
//     //TESTING TODO UPDATING FOR CARD LENGTH BUT MISSING REACTIVE
//     class ConTemplate {
//         constructor (model, template, parent) {
//             this.model = model;
//             this.model.subscribe(this);
//             this.cards = [];
//             this.container = document.getElementById(parent);
//             this.template = template;
// 
//             const innerObj = this.model.innerObj;
//             for (const key in innerObj) {
//                 if (innerObj.hasOwnProperty(key)) {
//                     const item = innerObj[ key ];
//                     const card = this.createCard(item, key);
//                     this.cards.push(card);
//                     this.container.appendChild(card);
//                 }
//             }
//         }
// 
//         createCard(item, index) {
//             const template = this.template(item);
//             const card = document.createElement("div");
//             card.innerHTML = template;
//             card.setAttribute("data-id", index);
//             return card;
//         }
// 
//         // Function to update the cards based on the new data source
//         updateCards(newDataSource) {
//             console.log(newDataSource);
// 
//             const currentLength = this.cards.length;
//             const newLength = newDataSource.length;
//             const diff = newLength - currentLength;
//             console.log(diff); // 2
// 
//             if (diff > 0) {
//                 // Add new cards for the new items
//                 for (let i = 0; i < diff; i++) {
//                     const index = currentLength + i;
//                     const item = newDataSource[ index ];
//                     const newCard = this.createCard(item, this.template);
//                     this.cards.push(newCard);
//                     this.container.appendChild(newCard);
//                 }
//             } else if (diff < 0) {
//                 // Remove cards for the deleted items
//                 const cardsToRemove = this.cards.splice(newLength, Math.abs(diff));
//                 cardsToRemove.forEach((card) => {
//                     card.remove();
//                 });
//             }
//         }
// 
//         update() {
//             this.cards.forEach((card) => {
//                 card.remove();
//             });
// 
//             this.cards = [];
//             const innerObj = this.model.innerObj;
//             for (const key in innerObj) {
//                 if (innerObj.hasOwnProperty(key)) {
//                     const item = innerObj[ key ];
//                     const card = this.createCard(item, key);
//                     this.cards.push(card);
//                     this.container.appendChild(card);
//                 }
//             }
//         }
// 
//         render() {
//             // Clear the container
//             this.container.innerHTML = '';
// 
//             // Create new cards for changed data in the innerObj
//             for (const key in this.model.changedData) {
//                 if (this.model.changedData.hasOwnProperty(key)) {
//                     const item = this.model.innerObj[ key ];
//                     const card = this.createCard(item, this.template);
//                     this.cards.push(card);
//                     this.container.appendChild(card);
//                 }
//             }
// 
//             // Clear the changed data
//             this.model.changedData = {};
//         }
//     }
// 
// 
// 
//     // DIFFERENT TEMPLATE_FUNCTION BEING PASSED TO ConTemplate
//     // TODO ADD AN INDEX HERE TO DIFFERCIATE!!!
//     const template1 = (item) => {
//         const template = document.createElement('div');
//         template.setAttribute('class', 'template1');
//         template.innerHTML = `
//         <h2 style="text-align: center"><span class="name">${item.name}</span></h2>
//         <p>Address: <span class="street">${item.address.street}</span>,
//                         <span class="city">${item.address.city}</span>,
//                         <span class="state">${item.address.state}</span></p>
//         <p>Hobbies: <span class="hobbies">${item.hobbies.join(', ')}</span></p>
//         <p style="text-align: center; margin-top: 10px"><span class="now">${item.now}</span></p>
//      
//         <div style="text-align: center; font-size: 30px">${item.emoji ?? ''}</div>
//         <br>
//        
//     `;
//         return template;
//     };
// 
//     const template2 = (item) => {
//         const template = document.createElement('div');
//         template.setAttribute('class', 'template2');
//         template.innerHTML = `
//         <h3>Name: <span class="name">${item.name}</span></h3>
//         <p>Address:
//             <span class="address">${item.address.street}, ${item.address.city}, ${item.address.state}</span>
//         </p> 
//         <p>Hobbies: <span class="hobbies">${item.hobbies.join(', ')}</span></p>
//         <p>Now: <span class="now">${item.now}</span></p>
//         <br>
//     `;
//         return template;
//     };
// 
//     // testData.address only
//     const template3 = (item) => {
//         const template = document.createElement('div');
//         template.setAttribute('class', 'template3');
//         template.innerHTML = `
//        <br>
//         <p>Address: <span class="street">${item.street}</span></p>
//         <p>City: <span class="city">${item.city}</span></p>
//         <p>State: <span class="state">${item.state}</span></p>
//        
//     `;
//         return template;
//     };
// 
//     // TEST-DATASOURCE
//     const testData = [
//         {
//             name: 'John Doe',
//             address: {
//                 street: '123 Main St',
//                 city: 'Anytown',
//                 state: 'CA',
//             },
//             hobbies: [ 'reading', 'traveling' ],
//             now: new Date().toLocaleTimeString(),
//             emoji: undefined
//         },
//         {
//             name: 'Jane Doe',
//             address: {
//                 street: '456 Main St',
//                 city: 'Anytown',
//                 state: 'CA',
//             },
//             hobbies: [ 'running', 'painting' ],
//             now: new Date().toLocaleTimeString(),
//             emoji: undefined
//         },
//         {
//             name: 'BarbWire',
//             address: {
//                 street: '007 Oneway',
//                 city: 'Anothertown',
//                 state: 'Spheres',
//             },
//             hobbies: [ 'coding', 'playing cello', `playing devil's advocat` ],
//             now: new Date().toLocaleTimeString(),
//             emoji: '👻'
//         }
//     ];
// 
// 
//     // model watching all obj
//     const dataObject = new DataHandler(testData);
//     //const dataObject1 = new DataHandler(testData);// bad idea as interferring
//     // model watching subkey of obj
// 
//     const dataObject2 = new DataHandler(testData.map(item => item.address));
//     //console.log(dataObject2) // no reference to initoal object? but should be updated each time, not?
// 
// 
// 
//     const firstInstance = new ConTemplate(dataObject, template1, 'container1');
//     //console.log(firstInstance)
//     const secondInstance = new ConTemplate(dataObject, template2, 'container2');// this seems to be problematic (???) number of cards not updated
// 
//     const thirdInstance = new ConTemplate(dataObject2, template3, 'container3');
// 
// 
// 
// 
//     //TODO THIS IS NOT WORKING YET NEED TO ADD OR REMOVE CARDS
//     testData[ 0 ].name = 'Judihui'
// 
//     // to check updating of only changed on load
//     const updateNow = setInterval(tic, 1000);
//     const stop = setTimeout(stopIt, 120000)
//     function tic() {
//         testData[ 2 ].now = new Date().toLocaleTimeString();
//     }
//     function stopIt() {
//         clearInterval(updateNow);
//     }
// 
// 
//     testData.push({
//         name: 'No. 4',
//         address: {
//             street: '123 Sidewalk',
//             city: 'Anytown',
//             state: 'CA',
//         },
//         hobbies: [ 'reading', 'traveling' ],
//         now: new Date().toLocaleTimeString()
//     },
//         {
//             name: 'No. 5',
//             address: {
//                 street: '456 Sidewalk',
//                 city: 'Anytown',
//                 state: 'CA',
//             },
//             hobbies: [ 'reading', 'traveling' ],
//             now: new Date().toLocaleTimeString()
//         })
// 
// 
//     // ok, changes on primitives do work, Not on objects or arrays per dot.notation
//     testData[ 0 ].name = 'Jennifer Toe'
//     testData[ 1 ].hobbies = [ 'rollerblading', 'motor-cycling' ]
//     //TODO: fascinating: the new added dataItems don't have getters/setters
//     address = testData.map(dataSet => dataSet.address)
//     testData[ 4 ].hobbies = [ 'mountain-biking', 'motor-cycling' ];
//     testData[ 4 ].hobbies = [ 'another hobby', 'no hobby' ]// WHAAAAAAT? NOT APPLIED
// 
//     address = testData.map(dataSet => dataSet.address)
// 
// 
//     //console.log(dataObject)
//     //console.log(firstInstance)// new data are here!!!!!
// 
//     const t1 = performance.now();
//     console.log(`Call to init and update cards took ${t1 - t0} milliseconds.`);
// 
// }
// 
// 
// // evtl this way?
// // const dataHandler = new DataHandler(testData);
// // 
// // const filteredData = testData.filter(item => item.someProperty === someValue);
// // const firstInstance = new ConTemplate(dataHandler, template1, 'container1', filteredData);
// // 
// // const remainingData = testData.filter(item => item.someProperty !== someValue);
// // const secondInstance = new ConTemplate(dataHandler, template2, 'container2', remainingData);
// 
// // class Observer {
// //     constructor (name) {
// //         this.name = name;
// //     }
// // 
// //     neDataSource(index, updatedInstance) {
// //         console.log(
// //             `${this.name} received an update for instance at index ${index}: ${JSON.stringify(updatedInstance)}`
// //         );
// //     }
// // }
// // 
// // class Observable {
// //     constructor () {
// //         this.instances = [];
// //         this.subscribers = [];
// //     }
// // 
// //     addInstance(instance) {
// //         this.instances.push(instance);
// //         this.notify(instance);
// //     }
// // 
// //     removeInstance(instance) {
// //         const index = this.instances.indexOf(instance);
// //         if (index !== -1) {
// //             this.instances.splice(index, 1);
// //             this.notify(instance);
// //         }
// //     }
// // 
// //     notify(updatedInstance) {
// //         const index = this.instances.indexOf(updatedInstance);
// //         this.subscribers.forEach((subscriber) => {
// //             subscriber.neDataSource(index, updatedInstance);
// //         });
// //     }
// // 
// //     subscribe(observer) {
// //         this.subscribers.push(observer);
// //     }
// // 
// //     unsubscribe(observer) {
// //         const index = this.subscribers.indexOf(observer);
// //         if (index !== -1) {
// //             this.subscribers.splice(index, 1);
// //         }
// //     }
// // }
// // 
// // const observable = new Observable();
// // const observer1 = new Observer('Observer 1');
// // const observer2 = new Observer('Observer 2');
// // 
// // observable.subscribe(observer1);
// // observable.subscribe(observer2);
// // 
// // observable.addInstance({ name: 'Instance 1' });
// // observable.addInstance({ name: 'Instance 2' });
// // observable.addInstance({ name: 'Instance 3' });
// // 
// // observable.removeInstance({ name: 'Instance 2' });
// // 
// // observable.unsubscribe(observer2);
// // 
// // observable.addInstance({ name: 'Instance 4' });


// class ArrayHandler {
//     constructor (data, dataHandler) {
//         this.dataHandler = dataHandler;
//         this.data = data;
//         this.innerObj = this.createInnerObject(data);
//     }
// 
//     createInnerObject(data) {
//         const self = this;
// 
//         const innerObj = new Proxy(data, {
//             get(target, property) {
//                 if (property === "push") {
//                     return function (...args) {
//                         const result = target.push(...args);
//                         self.dataHandler.notify();
//                         return result;
//                     };
//                 }
//                 return target[ property ];
//             },
//             set(target, property, value) {
//                 target[ property ] = value;
//                 self.dataHandler.notify();
//                 return true;
//             },
//         });
// 
//         return innerObj;
//     }
// 
//     addItem(args) {
//         // not used in this example, but can be implemented to handle item addition
//     }
// 
//     updateItem(property, value) {
//         // not used in this example, but can be implemented to handle item updates
//     }
// 
//     getArray() {
//         return this.data;
//     }
// 
//     getObservedData() {
//         return this.innerObj;
//     }
// }
// 
// class DataHandler {
//     constructor (data) {
//         this.innerObj = this.createInnerObject(data);
//         this.data = Object.getPrototypeOf(this.innerObj)
//         console.log(this.data)
//         console.log(this.innerObj)
//         this.subscribers = new Set();
//     }
// 
//     createInnerObject(data) {
//         const self = this;
// 
//         const innerObj = new Proxy(data, {
//             set(target, property, value) {
//                 target[ property ] = value;
//                 self.notify();
//                 return true;
//             },
//         });
// 
//         return innerObj;
//     }
// 
//     subscribe(callback) {
//         this.subscribers.add(callback);
//     }
// 
//     unsubscribe(callback) {
//         this.subscribers.delete(callback);
//     }
// 
//     notify() {
//         this.subscribers.forEach((callback) => callback(this.innerObj));
//     }
// }
// 
// class Subscriber {
//     constructor (name) {
//         this.name = name;
//     }
// 
//     update(data) {
//         console.log(`Subscriber ${this.name} received updated data: `, data);
//     }
// }
// 
// // Example usage
// const data = [ { name: "any Name", age: 100 } ];
// 
// const dataHandler = new DataHandler(data);
// dataHandler.subscribe((updatedData) =>
//     console.log("Data updated:", updatedData)
// );
// 
// const arrayHandler = new ArrayHandler(data, dataHandler);
// data.push({ name: "new item", age: 200 });
// 
// //console.log("Data after push:", data);
// 
// const subscriber1 = new Subscriber("Subscriber 1");
// const subscriber2 = new Subscriber("Subscriber 2");
// 
// dataHandler.subscribe(subscriber1.update.bind(subscriber1));
// dataHandler.subscribe(subscriber2.update.bind(subscriber2));
// 
// // Update the data
// data.push({ name: "Charlie", age: 50 });
// 
// 
// data[ 0 ].name = "another Name";
// 
// console.log(arrayHandler.data)// THIS INCLUDES ALL
// console.log(arrayHandler.innerObj)// THIS ALSO
// 
// //TODO evtl extend the arrayHandler????
