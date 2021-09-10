require('dotenv').config();
const { driver, api } = require('@rocket.chat/sdk');
const HOST = process.env.ROCKETCHAT_URL;
const USER = process.env.ROCKETCHAT_USER;
const PASS = process.env.ROCKETCHAT_PASSWORD;
const BOTNAME = process.env.BOTNAME;
const SSL = false;  // server uses https ?
const ROOMS = ['gulag', 'general'];

let myuserid;
let gulagRoomId;

const gulagbot = async () => {
    await driver.connect( { host: HOST, useSsl: SSL})
    myuserid = await driver.login({username: USER, password: PASS});
    // join rooms, subscribe to them and setup callback function
    await driver.joinRooms(ROOMS);
    await driver.subscribeToMessages();
    await driver.reactToMessages(processMessages);
    gulagRoomId = await driver.getRoomId(ROOMS[0]);
    await api.login();
}

// callback for incoming messages filter and processing
const processMessages = async(err, message, messageOptions) => {
    if (!err) {
        // filter our own message
        if (message.u._id === myuserid) return;

        const roomId = message._id;
        // can filter further based on message.rid
        const roomName = messageOptions.roomName;
        const messageContent = message.msg;
        const userId = message.u._id;
        if (messageContent.startsWith("!gulag")) {


            // could possibly cache this, but for right now this'll do
            const adminIds = await getAdmins();
            const admins = adminIds['admins'];
            const ids = adminIds['ids'];
            //
            if (!ids.includes(userId)) {
                await driver.sendToRoom('You cannot send someone to the Gulag. You are not an Admin!', roomName);
                return;
            }

            let mentions = message.mentions;
            if (mentions.length === 0) {
                let response = 'You need to mention someone to send them to the Gulag.'
                await driver.sendToRoom(response, roomName);
            } else {

                let response = "Sending ";
                let userNames = [];
                mentions.forEach(function(mention) {
                    let name = mention.username;
                    response += name + ", "
                    userNames.push(name);
                });
                response += "to the Gulag.";
                await addUsersToTheGulag(gulagRoomId, userNames);

            }

        }

    }
}

// Gets the Admins of the server
// because only an Admin can add people to the Gulag
async function getAdmins()  {
    let messagePayload = {
        "msg": "method",
        "method": "getUserRoles",
        "params": []
    }
    let data = {
        message: JSON.stringify(messagePayload)
    }
    const response = await api.post('method.call/getUserRoles', data);
    const responseMessage = JSON.parse(response.message);
    let users = responseMessage.result;
    let admins = [];
    let userIds = []

    users.forEach(function(user) {
       console.log(user);
       let roles = user.roles;
       roles.forEach(function(role) {
           // this user is an admin
           if (role.toLowerCase().trim() === 'admin') {
               admins.push(user.username);
               userIds.push(user._id);
           }
       });
    });

    console.log('admins', admins);
    return {'admins': admins, 'ids': userIds};
}

// adds users to a room
async function addUsersToTheGulag(roomId, users) {


    let data = {
        "msg": "method",
        "method": "addUsersToRoom",
        params: [
            {
                rid: roomId,
                users: users
            }
        ]
    }

    let request = {
        'message': JSON.stringify(data)
    }

    return await api.post('method.call/addUsersToRoom', request);
}

gulagbot();
