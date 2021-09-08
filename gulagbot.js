require('dotenv').config();
const { driver } = require('@rocket.chat/sdk');
// customize the following with your server and BOT account information
const HOST = process.env.HOST;
const USER = process.env.ROCKETUSER;
const PASS = process.env.ROCKETPASS;
const BOTNAME = process.env.BOTNAME;
const SSL = false;  // server uses https ?
const ROOMS = ['Gulag', 'general'];

let myuserid;
let gulagRoomId;
// this simple bot does not handle errors, different message types, server resets
// and other production situations

const runbot = async () => {
    await driver.connect( { host: HOST, useSsl: SSL})
    myuserid = await driver.login({username: USER, password: PASS});
    await driver.joinRooms(ROOMS);
    // set up subscriptions - rooms we are interested in listening to
    await driver.subscribeToMessages();
    console.log('Subscribed');
    // connect the processMessages callback
    await driver.reactToMessages( processMessages );
    // greets from the first room in ROOMS
    await driver.sendToRoom(BOTNAME + ' is listening ...', ROOMS[0]);
    gulagRoomId = await driver.getRoomId(ROOMS[0])
    console.log('Greeting message sent');
}

// callback for incoming messages filter and processing
const processMessages = async(err, message, messageOptions) => {
    console.log(message);
    if (!err) {
        // filter our own message
        if (message.u._id === myuserid) return;
        const roomName = messageOptions.roomName;
        // can filter further based on message.rid
        const roomname = await driver.getRoomName(message.rid);

        const messageContent = message.msg;
        const userId = message.u._id;
        if (messageContent.startsWith("!gulag")) {
            let mentions = message.mentions;
            if (mentions.length === 0) {
                let response = 'You need to mention someone to send them to the Gulag.'
                await driver.sendToRoom(response, roomname);
            } else {
                let userIds = []
                for (let mention in mentions) {
                    userIds.push(mention._id)
                }


            }

        }

    }
}

runbot();
