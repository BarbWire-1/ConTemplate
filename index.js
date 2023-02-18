/*
 *   Copyright (c) 2023 BarbWire-1 aka Barbara Kälin
 *   All rights reserved.
     with MIT license
 */

     
// TODO not reacting on structural changes in the dataSource JSON object
// TODO possible to convert the FirstClass into a customComponent???
// TODO handle undefined?
// TODO add selctor for container per instance
// then change style rules according to new circumstances
console.clear()
window.onload = () => {
    //.  ❗️❗️❗️ WORK IN PROGRESS ❗️❗️❗️

    // MODEL TO TAKE DATA-OBJECT AND RENDER SUBSCRIBERS PER CHANGED PROP
    // TODO loging the instance the model DOES HAVE all items buT why can't get length here? why not passing to instance????
    // TODO restructure and add array methods to be able to listen to pop and push at least? maybe sort???
    // or a custom listener??? how??
    // First observe array => pass to observeObject


    // For now ONLY observes the array's length to update source if length changed
    class ArrayLengthObserver {
        constructor (array, callback) {
            this.array = array;
            this.callback = callback;
            this.length = array.length;
            this.observe();
        }

        observe() {
            const methodsToObserve = [ "push", "pop", "shift", "unshift", "splice" ];

            methodsToObserve.forEach((methodName) => {
                const originalMethod = this.array[ methodName ].bind(this.array);
                this.array[ methodName ] = (...args) => {
                    const result = originalMethod(...args);
                    this.callback(this.array);
                    this.length = this.array.length;
                    return result;
                };
            });
        }
    }



    class DataHandler {
        constructor (dataSource) {
            this.dataSource = dataSource;
            this.obj = this.observeObject(this.dataSource)
            this.observers = [];
           
        }


        // ONLY observes if the length of the datasource has changed
        // to be able to add or remove cards accordingly
        observeDataSource() {
            const observer = new ArrayLengthObserver(this.dataSource, (updatedArray) => {
                this.dataSource = updatedArray;
                this.update();
            });
        }
        
       // TODO THIS DOES NOT WORK
        observeObject(obj) {
            console.log(obj)
            if (typeof obj !== 'object') {
                return obj;
            }

            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    obj[ key ] = this.observeObject(obj[ key ]);

                    let temp = obj[ key ];

                    Object.defineProperty(obj, key, {
                        get: () => temp,
                        set: (value) => {
                            temp = value;
                            console.log(value)
                            const index = this.dataSource.indexOf(obj);
                            this.notify(index, key, value);
                            console.log(index, key, value)// this only shows the updated index instead of the new
                        },
                    });
                }
            }

            return obj;
        }

        subscribe(observer) {
            this.observers.push(observer);
        }

        unsubscribe(observer) {
            this.observers = this.observers.filter((obs) => obs !== observer);
        }

        notify(index, key, value) {
            this.observers.forEach((observer) => observer.render(index, key, value));
        }
    }

    
    //TESTING TODO UPDATING FOR CARD LENGTH BUT MISSING REACTIVE
    class ConTemplate {
        constructor (model, template, parent) {
            this.model = model;
            this.model.subscribe(this);
            this.cards = [];
            this.container = document.getElementById(parent);
            this.template = template;
            this.arrayObserver = new ArrayLengthObserver(this.model.dataSource, (newDataSource) => {
                this.updateCards(newDataSource);
            });

            this.model.dataSource.forEach((item, index) => {
                this.cards[ index ] = this.createCard(item, this.template);
                this.container.appendChild(this.cards[ index ]);
            });
        }

        createCard(item, chosenTemplate) {
            const template = chosenTemplate(item);
            return template;
        }

        updateCards(newDataSource) {
            // Function to update the cards based on the new data source
            console.log(newDataSource)
            const currentLength = this.cards.length;
            const newLength = newDataSource.length;
            const diff = newLength - currentLength;

            if (diff > 0) {
                // Add new cards for the new items
                for (let i = 0; i < diff; i++) {
                    const index = currentLength + i;
                    const item = newDataSource[ index ];
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
            console.log(index, key, value)
            const card = this.cards[ index ];
            const property = card.querySelector(`[data-property=${key}]`);

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
        <h2 style="text-align: center"><span data-property="name">${item.name}</span></h2>
        <p>Address: <span data-property="street">${item.address.street}</span>,
                        <span data-property="city">${item.address.city}</span>,
                        <span data-property="state">${item.address.state}</span></p>
        <p>Hobbies: <span data-property="hobbies">${item.hobbies.join(', ')}</span></p>
        <p style="text-align: center; margin-top: 10px"><span data-property="now">${item.now}</span></p>
     
        <div style="text-align: center; font-size: 30px">${item.emoji ?? ''}</div>
        <br>
       
    `;
        return template;
    };

    const template2 = (item) => {
        const template = document.createElement('div');
        template.setAttribute('class', 'template2');
        template.innerHTML = `
        <h3>Name: <span data-property="name">${item.name}</span></h3>
        <p>Address: <span data-property="street">${item.address.street}</span></p>
        <p>City: <span data-property="city">${item.address.city}</span></p>
        <p>State: <span data-property="state">${item.address.state}</span></p>
        <p>Hobbies: <span data-property="hobbies">${item.hobbies.join(', ')}</span></p>
        <p>Now: <span data-property="now">${item.now}</span></p>
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
        <p>Address: <span data-property="street">${item.street}</span></p>
        <p>City: <span data-property="city">${item.city}</span></p>
        <p>State: <span data-property="state">${item.state}</span></p>
       
    `;
        return template;
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
    const dataObject2 = new DataHandler(testData.map(item => item.address));


    const firstInstance = new ConTemplate(dataObject, template1, 'container1');
    console.log(firstInstance)
    const secondInstance = new ConTemplate(dataObject, template2, 'container2');// this seems to be problematic (???)

    const thirdInstance = new ConTemplate(dataObject2, template3, 'container3');




    //TODO THIS IS NOT WORKING YET NEED TO ADD OR REMOVE CARDS
    testData[ 0 ].name = 'Judihui'
    
    // to check updating of only changed on load
    const updateNow = setInterval(tic, 1000);
    const stop = setTimeout(stopIt, 10000)
    function tic() {
        testData[ 2 ].now = new Date().toLocaleTimeString();
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
    testData[ 0 ].name = 'Jennifer Toe'
    testData[ 1 ].hobbies = [ 'mountainbiking', 'motorcycling' ]
    //TODO: fascinating: the new added dataItems don't have getters/setters
    address = testData.map(dataSet => dataSet.address)
    testData[ 4 ].hobbies = ['mountainbiking', 'motorcycling']// WHY IS THIS NOT APPLIED???
    address = testData.map(dataSet => dataSet.address)


    console.log(dataObject)
    console.log(firstInstance)// new data are here!!!!!
    
    
    
}



