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
//.  ❗️❗️❗️ WORK IN PROGRESS ❗️❗️❗️

// MODEL TO TAKE DATA-OBJECT AND RENDER SUBSCRIBERS PER CHANGED PROP
// TODO loging the instance the model DOES HAVE all items buT why can't get length here? why not passing to instance????
// TODO restructure and add array methods to be able to listen to pop and push at least? maybe sort???
// or a custom listener??? how??
// First observe array => pass to observeObject
class DataHandler {
    constructor (dataSource) {
        this.raw = dataSource;
        console.log(this.raw.length)// stays 3 :(
        this.dataSource = this.observeObject(this.raw);
        this.observers = [];
        //this.length = this.dataSource.length;
        //this.updatedLength = 0;
    }
    // here add array-methods for (if 'object' && dataSource or add an int array?)
    observeObject(obj) {
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
                        const index = this.dataSource.indexOf(obj);
                        this.notify(index, key, value);
                        //console.log(index, key, value)// this only shows the updated index instead of the new
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


// CLASS TO SUBSCRIBE TO A MODEL AND CALL FUNCTION TO CREATE CARDS
class ConTemplate {
    constructor (model, template, parent) {
        this.model = model;
        console.log((this.model))
        this.model.subscribe(this);
        this.cards = [];
        //console.log(this.cards)
        // TODO id and class for container or pass container's selector???
        this.container = document.getElementById(parent);
        this.template = template;
        this.model.dataSource.forEach((item, index) => {
            //console.log(index)//TODO1.1.1.1.1.1.1.1.1// 0,1,2 but WHY??? the new added log at 4,5
            this.cards[ index ] = this.createCard(item, this.template);
            //TODO add class to items???
            this.container.appendChild(this.cards[ index ]);
        });
    }

    render(index, key, value) {
        // const item = this.model.dataSource[ index ];
        //console.log(item)
        const card = this.cards[ index ];
        const property = card.querySelector(`[data-property=${key}]`) ?? '';
        if (property) {
            property.textContent = value;
        }
    }

    createCard(item, chosenTemplate) {
        const template = chosenTemplate(item);
        return template;
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
        hobbies: [ 'coding', 'playing cello', 'philosphy' ],
        now: new Date().toLocaleTimeString(),
        emoji: '👻'
    }
];


// model watching all obj
const dataObject = new DataHandler(testData);
// model watching subkey of obj
const dataObject2 = new DataHandler(testData.map(item => item.address));


const firstInstance = new ConTemplate(dataObject, template1, 'container1');
const secondInstance = new ConTemplate(dataObject, template2, 'container2');// this seems to be problematic (???)

const thirdInstance = new ConTemplate(dataObject2, template3, 'container3');




//TODO THIS IS NOT WORKING YET NEED TO ADD OR REMOVE CARDS
testData[ 0 ].name = 'Judihui'
const updateNow = setInterval(tic, 1000);
function tic() {
    testData[ 2 ].now = new Date().toLocaleTimeString();
}



testData.push({
    name: 'John Doe',
    address: {
        street: '789 Sidewalk',
        city: 'Anytown',
        state: 'CA',
    },
    hobbies: [ 'reading', 'traveling' ],
    now: new Date().toLocaleTimeString()
})

testData[ 0 ].name = 'Jennifer Toe'
address = testData.map(dataSet => dataSet.address)
testData[ 4 ] = { address: { street: `123 Test Way` } }
address = testData.map(dataSet => dataSet.address)



