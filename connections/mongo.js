const mongoose = require('mongoose');
if (process.env.NODE_ENV !== 'production') require('dotenv').config()
function newConnection(uri){
    const conn = mongoose.createConnection(uri, { 
        useNewUrlParser:true,
        useUnifiedTopology:true,
    });

    conn.on('connected', function (){
        console.log(`Mongodb::: connected::: ${this.name}`);
    })
    
    conn.on('disconnected', function (){
        console.log(`Mongodb::: disconnected::: ${this.name}`);
    })
    
    conn.on('error', function (){
        console.log(`Mongodb::: error:::${JSON.stringify(err)}`);
    })

    return conn;
}

const mongo = newConnection(process.env.URI_MONGODB_CONNECTION)

module.exports = {
    mongo
}