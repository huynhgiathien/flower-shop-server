const { Server } = require('socket.io')
const MessageServices = require('./services/message.service')
const io = new Server()
const authorize = require('./middlewares/authorize.js')
const User = require('./models/user.model.js')

const events = {    
}

const attachServer = (server)=>{
    io.attach(server,  {
        cors: {
          origin: '*',
        }
      })
}

const createExpressMiddleware = ()=>(req, res, next)=>{
    req.events = events
    next()
}

const messageDisplay = (message)=>{
    if(!message) return {}
    return {
        id: message.id, 
        customer_id: message.customer,
        sender: message.sender,
        content: message.content,
        wasRead: message.wasRead,
        picture: message.picture,
        sent_time: message.sent_time
    }
}


//Middleware
io.use((socket, next)=>{
    const token = socket.handshake.auth.token

    if(!token){
        return next(new Error('Require token'))
    }

    const payload = authorize.verifyAccessToken(token)
    if(!payload){
        return next(new Error('Token invalid'))
    }
    socket.user = payload
    next()
})



io.on('connection', async socket =>{
    
    if(socket.user.type === 0 ){
        socket.join(socket.user.id)
    }else{
        const onlineCustomerIdList = (await User.find({type:0})).map(user => user.id)
        socket.join(onlineCustomerIdList)
    }

    socket.use((event, next)=>{
        console.log(event)
        next()
    })

    //Define event for each socket
    socket.on('sendMessageToCustomer', async (content, customerId)=>{
        const {id: workerId} = socket.user
        const message = await MessageServices.sendMessage(customerId, workerId, content)
        io.to(customerId).emit('receiveMessageFormStore',messageDisplay(message))
    })

    socket.on('sendMessageToStore', async (content)=>{
        const {id:customerId} = socket.user
        const message = await MessageServices.sendMessage(customerId, customerId, content)
        io.to(customerId).emit('receiveMessageFormCustomer',messageDisplay(message))
    })

    socket.on('readMessages', async (customerId)=>{
        const {id:readerId} = socket.user
        await MessageServices.readMessages(customerId, readerId)
    })
})

module.exports = {
    attachServer,
    createExpressMiddleware
}